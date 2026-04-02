import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { handleInboundMessage } from "./conversation-engine";

interface ConversationOptions {
  deviceId?: string;
}

export async function handleConversationMessage(
  provider: string,
  userId: string,
  text: string,
  options?: ConversationOptions
): Promise<void> {
  const response = handleInboundMessage(provider, userId, text);
  const messagingProvider = createMessagingProvider(provider, {
    deviceId: options?.deviceId,
  });

  if (response.list) {
    await messagingProvider.sendList({
      to: userId,
      title: response.list.title,
      body: response.list.body,
      buttonText: response.list.buttonText,
      sections: response.list.sections,
    });
  } else if (response.buttons) {
    await messagingProvider.sendButtons({
      to: userId,
      body: response.text,
      buttons: response.buttons,
    });
  } else {
    await messagingProvider.sendText({
      to: userId,
      body: response.text,
    });
  }

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
