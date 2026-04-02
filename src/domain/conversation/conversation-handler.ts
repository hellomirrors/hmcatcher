import { readConfigurationSync } from "@/domain/configuration/configuration-service";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { readSettings } from "@/domain/settings/settings-service";
import { handleInboundMessage } from "./conversation-engine";

const TRAILING_SLASHES = /\/+$/;

function buildContactLink(provider: string, userId: string): string {
  const baseUrl = (process.env.APP_BASE_URL ?? "").replace(
    TRAILING_SLASHES,
    ""
  );
  return `${baseUrl}/contact?p=${encodeURIComponent(provider)}&u=${encodeURIComponent(userId)}`;
}

async function handleWebformMessage(
  provider: string,
  userId: string
): Promise<void> {
  const config = readConfigurationSync();
  const messagingProvider = createMessagingProvider(provider);
  const link = buildContactLink(provider, userId);
  const text = config.messages.welcome_webform.replace("{link}", link);

  await messagingProvider.sendText({ to: userId, body: text });
}

export async function handleConversationMessage(
  provider: string,
  userId: string,
  text: string
): Promise<void> {
  const settings = await readSettings();

  if (settings.conversationMode === "webform") {
    await handleWebformMessage(provider, userId);
    return;
  }

  const response = handleInboundMessage(provider, userId, text);
  const messagingProvider = createMessagingProvider(provider);

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
