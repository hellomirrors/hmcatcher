import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import { logMessage } from "@/domain/messaging/message-log";
import { telegramUpdateSchema } from "@/domain/schema";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = telegramUpdateSchema.safeParse(body);

  if (!result.success) {
    console.error("Telegram webhook: invalid payload", result.error);
    return Response.json({ ok: true }, { status: 200 });
  }

  const msg = result.data.message;
  if (msg?.text) {
    const chatId = String(msg.chat.id);
    console.log(
      JSON.stringify({
        event: "telegram_inbound",
        from: msg.from.id,
        username: msg.from.username,
        chatId: msg.chat.id,
        text: msg.text,
        date: msg.date,
      })
    );

    logMessage({
      provider: "telegram",
      direction: "in",
      contact: chatId,
      kind: "text",
      body: msg.text,
    });

    try {
      await handleConversationMessage("telegram", chatId, msg.text);
    } catch (error) {
      console.error("Telegram conversation error:", error);
    }
  }

  const cb = result.data.callback_query;
  if (cb?.data) {
    const chatId = String(cb.message.chat.id);
    console.log(
      JSON.stringify({
        event: "telegram_callback",
        from: cb.from.id,
        chatId: cb.message.chat.id,
        data: cb.data,
      })
    );

    logMessage({
      provider: "telegram",
      direction: "in",
      contact: chatId,
      kind: "text",
      body: cb.data,
    });

    try {
      await handleConversationMessage("telegram", chatId, cb.data);
    } catch (error) {
      console.error("Telegram callback error:", error);
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
