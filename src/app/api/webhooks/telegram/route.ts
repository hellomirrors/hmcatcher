import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import { logMessage } from "@/domain/messaging/message-log";
import { telegramUpdateSchema } from "@/domain/schema";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:telegram");

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = telegramUpdateSchema.safeParse(body);

  if (!result.success) {
    log.error("Invalid payload", result.error, {
      body: JSON.stringify(body).slice(0, 500),
    });
    return Response.json({ ok: true }, { status: 200 });
  }

  const msg = result.data.message;
  if (msg?.text) {
    const chatId = String(msg.chat.id);
    log.info("Inbound message", {
      from: msg.from.id,
      username: msg.from.username,
      chatId: msg.chat.id,
      text: msg.text,
      date: msg.date,
    });

    logMessage({
      provider: "telegram",
      direction: "in",
      contact: chatId,
      kind: "text",
      body: msg.text,
    });

    try {
      await handleConversationMessage("telegram", chatId, msg.text);
      log.info("Conversation handled", { chatId });
    } catch (error) {
      log.error("Conversation failed", error, { chatId, text: msg.text });
    }
  }

  const cb = result.data.callback_query;
  if (cb?.data) {
    const chatId = String(cb.message.chat.id);
    log.info("Callback query", {
      from: cb.from.id,
      chatId: cb.message.chat.id,
      data: cb.data,
    });

    logMessage({
      provider: "telegram",
      direction: "in",
      contact: chatId,
      kind: "text",
      body: cb.data,
    });

    try {
      await handleConversationMessage("telegram", chatId, cb.data);
      log.info("Callback handled", { chatId });
    } catch (error) {
      log.error("Callback failed", error, { chatId, data: cb.data });
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
