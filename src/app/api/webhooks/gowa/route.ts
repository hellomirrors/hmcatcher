import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import { logMessage } from "@/domain/messaging/message-log";
import { gowaWebhookPayloadSchema } from "@/domain/schema";
import { resolveSettings } from "@/domain/settings/settings-service";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:gowa");

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = gowaWebhookPayloadSchema.safeParse(body);

  if (!result.success) {
    log.error("Invalid payload", result.error, {
      body: JSON.stringify(body).slice(0, 500),
    });
    return Response.json({ ok: true }, { status: 200 });
  }

  const { event, payload } = result.data;
  const cfg = await resolveSettings();

  if (cfg.whatsappProvider !== "gowa") {
    log.info("Ignored inbound: active WhatsApp provider is not gowa", {
      active: cfg.whatsappProvider,
    });
    return Response.json({ ok: true }, { status: 200 });
  }

  const from = payload.from.replace("@s.whatsapp.net", "");
  const ownPhone = cfg.gowaPhoneNumber;
  const isOwnMessage = payload.is_from_me || (ownPhone && from === ownPhone);

  if (event !== "message" || isOwnMessage || !payload.body) {
    log.info("Skipped message", {
      event,
      from,
      isOwnMessage,
      hasBody: !!payload.body,
    });
    return Response.json({ ok: true }, { status: 200 });
  }

  log.info("Inbound message", {
    from,
    fromName: payload.from_name,
    chatId: payload.chat_id,
    text: payload.body,
    timestamp: payload.timestamp,
  });

  logMessage({
    provider: "gowa",
    direction: "in",
    contact: from,
    kind: "text",
    body: payload.body,
  });

  try {
    await handleConversationMessage("gowa", from, payload.body);
    log.info("Conversation handled", { from });
  } catch (error) {
    log.error("Conversation failed", error, { from, text: payload.body });
  }

  return Response.json({ ok: true }, { status: 200 });
}
