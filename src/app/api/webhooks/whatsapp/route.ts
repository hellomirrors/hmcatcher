import { handleConversationMessage } from "@/domain/conversation/conversation-handler";
import {
  whatsappVerifyQuerySchema,
  whatsappWebhookPayloadSchema,
} from "@/domain/schema";

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  const result = whatsappVerifyQuerySchema.safeParse(params);
  if (!result.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (result.data["hub.verify_token"] !== verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(result.data["hub.challenge"], { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const result = whatsappWebhookPayloadSchema.safeParse(body);

  if (!result.success) {
    console.error("WhatsApp webhook: invalid payload", result.error);
    return Response.json({ status: "ok" }, { status: 200 });
  }

  for (const entry of result.data.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages ?? [];
      for (const msg of messages) {
        console.log(
          JSON.stringify({
            event: "whatsapp_inbound",
            from: msg.from,
            type: msg.type,
            text: msg.text?.body,
            timestamp: msg.timestamp,
            phoneNumberId: change.value.metadata.phone_number_id,
          })
        );

        if (msg.type === "text" && msg.text?.body) {
          try {
            await handleConversationMessage(
              "whatsapp",
              msg.from,
              msg.text.body
            );
          } catch (error) {
            console.error("WhatsApp conversation error:", error);
          }
        }
      }
    }
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
