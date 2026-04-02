import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import { gowaWebhookPayloadSchema } from "@/domain/schema";

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = gowaWebhookPayloadSchema.safeParse(body);

  if (!result.success) {
    console.error("GoWA webhook: invalid payload", result.error);
    return Response.json({ ok: true }, { status: 200 });
  }

  const { event, device_id, payload } = result.data;

  if (event !== "message" || payload.is_from_me || !payload.body) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const from = payload.from.replace("@s.whatsapp.net", "");

  console.log(
    JSON.stringify({
      event: "gowa_inbound",
      from,
      fromName: payload.from_name,
      chatId: payload.chat_id,
      text: payload.body,
      timestamp: payload.timestamp,
    })
  );

  try {
    await handleConversationMessage("gowa", from, payload.body, {
      deviceId: device_id,
    });
  } catch (error) {
    console.error("GoWA conversation error:", error);
  }

  return Response.json({ ok: true }, { status: 200 });
}
