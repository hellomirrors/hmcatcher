import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
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

    try {
      await handleConversationMessage("telegram", chatId, msg.text);
    } catch (error) {
      console.error("Telegram conversation error:", error);
    }
  }

  return Response.json({ ok: true }, { status: 200 });
}
