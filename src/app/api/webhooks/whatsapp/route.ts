import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import { logMessage } from "@/domain/messaging/message-log";
import {
  whatsappVerifyQuerySchema,
  whatsappWebhookPayloadSchema,
} from "@/domain/schema";
import { resolveSettings } from "@/domain/settings/settings-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:whatsapp");

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
          timestamp: msg.timestamp,
          phoneNumberId: change.value.metadata.phone_number_id,
        });

        if (msg.type === "text" && msg.text?.body) {
          logMessage({
            provider: "whatsapp",
            direction: "in",
            contact: msg.from,
            kind: "text",
            body: msg.text.body,
            externalId: msg.id,
          });
          try {
            await handleConversationMessage(
              "whatsapp",
              msg.from,
              msg.text.body
            );
            log.info("Conversation handled", { from: msg.from });
          } catch (error) {
            log.error("Conversation failed", error, {
              from: msg.from,
              text: msg.text.body,
            });
          }
        }
      }
    }
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
