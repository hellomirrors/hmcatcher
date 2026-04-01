import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { handleInboundMessage } from "./conversation-engine";

export async function handleConversationMessage(
  provider: string,
  userId: string,
  text: string
): Promise<void> {
  const response = handleInboundMessage(provider, userId, text);
  const messagingProvider = createMessagingProvider();

  await messagingProvider.sendText({
    to: userId,
    body: response.text,
  });

  if (response.sendQr) {
    const qrBuffer = await generateQrPng(response.sendQr.content);
    await messagingProvider.sendImage({
      to: userId,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption: response.sendQr.caption,
    });
  }
}
