import { handleDialogConversation } from "@/domain/dialog/dialog-handler";
import { logMessage } from "@/domain/messaging/message-log";
import {
  type WhatsappWebhookPayload,
  whatsappVerifyQuerySchema,
  whatsappWebhookPayloadSchema,
} from "@/domain/schema";
import { resolveSettings } from "@/domain/settings/settings-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:whatsapp");

type WhatsappMessage = NonNullable<
  WhatsappWebhookPayload["entry"][number]["changes"][number]["value"]["messages"]
>[number];

/**
 * Extract the effective inbound text from a WhatsApp message regardless
 * of whether the user typed it or tapped a reply button / list row.
 *
 * For interactive replies we forward the button/row *title* (not the id)
 * so that downstream label-based matching stays consistent with Telegram
 * and GoWA, where the user's visible choice is what reaches the engine.
 * The engine still accepts ids as a fallback.
 */
function extractInboundText(msg: WhatsappMessage): string | undefined {
  if (msg.type === "text" && msg.text?.body) {
    return msg.text.body;
  }
  if (msg.type === "interactive" && msg.interactive) {
    return (
      msg.interactive.button_reply?.title ?? msg.interactive.list_reply?.title
    );
  }
  return undefined;
}

async function processInboundMessage(msg: WhatsappMessage): Promise<void> {
  const text = extractInboundText(msg);
  if (!text) {
    return;
  }

  logMessage({
    provider: "whatsapp",
    direction: "in",
    contact: msg.from,
    kind: "text",
    body: text,
    externalId: msg.id,
  });

  try {
    await handleDialogConversation("whatsapp", msg.from, text);
    log.info("Dialog handled", { from: msg.from });
  } catch (error) {
    log.error("Dialog failed", error, { from: msg.from, text });
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  const result = whatsappVerifyQuerySchema.safeParse(params);
  if (!result.success) {
    log.warn("Verify: invalid request", { params });
    return new Response("Invalid request", { status: 400 });
  }

  const cfg = await resolveSettings();
  if (result.data["hub.verify_token"] !== cfg.whatsappWebhookVerifyToken) {
    log.warn("Verify: token mismatch");
    return new Response("Forbidden", { status: 403 });
  }

  log.info("Verify: success");
  return new Response(result.data["hub.challenge"], { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = whatsappWebhookPayloadSchema.safeParse(body);

  if (!result.success) {
    log.error("Invalid payload", result.error, {
      body: JSON.stringify(body).slice(0, 500),
    });
    return Response.json({ status: "ok" }, { status: 200 });
  }

  const cfg = await resolveSettings();
  if (cfg.whatsappProvider !== "whatsapp") {
    log.info("Ignored inbound: active WhatsApp provider is not whatsapp", {
      active: cfg.whatsappProvider,
    });
    return Response.json({ status: "ok" }, { status: 200 });
  }

  for (const entry of result.data.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages ?? [];
      for (const msg of messages) {
        log.info("Inbound message", {
          from: msg.from,
          type: msg.type,
          text: msg.text?.body,
          interactiveType: msg.interactive?.type,
          timestamp: msg.timestamp,
          phoneNumberId: change.value.metadata.phone_number_id,
        });
        await processInboundMessage(msg);
      }
    }
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
