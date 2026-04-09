import { readConfigurationSync } from "@/domain/configuration/configuration-service";
import { logMessage } from "@/domain/messaging/message-log";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { readSettings } from "@/domain/settings/settings-service";
import { handleInboundMessage } from "./conversation-engine";
import { createContactToken } from "./token-store";

const TRAILING_SLASHES = /\/+$/;

function buildContactLink(provider: string, userId: string): string {
  const baseUrl = (process.env.APP_BASE_URL ?? "").replace(
    TRAILING_SLASHES,
    ""
  );
  const token = createContactToken(provider, userId);
  return `${baseUrl}/c/${token}`;
}

async function handleWebformMessage(
  provider: string,
  userId: string
): Promise<void> {
  const config = readConfigurationSync();
  const messagingProvider = createMessagingProvider(provider);
  const link = buildContactLink(provider, userId);
  const text = config.messages.welcome_webform.replace("{link}", link);

  const sent = await messagingProvider.sendText({ to: userId, body: text });
  logMessage({
    provider,
    direction: "out",
    contact: userId,
    kind: "text",
    body: text,
    externalId: sent.messageId,
  });
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

  let sent: Awaited<ReturnType<typeof messagingProvider.sendText>>;
  if (response.list) {
    sent = await messagingProvider.sendList({
      to: userId,
      title: response.list.title,
      body: response.list.body,
      buttonText: response.list.buttonText,
      sections: response.list.sections,
    });
  } else if (response.buttons) {
    sent = await messagingProvider.sendButtons({
      to: userId,
      body: response.text,
      buttons: response.buttons,
    });
  } else {
    sent = await messagingProvider.sendText({
      to: userId,
      body: response.text,
    });
  }
  logMessage({
    provider,
    direction: "out",
    contact: userId,
    kind: "text",
    body: response.text,
    externalId: sent.messageId,
  });

  if (response.sendQr) {
    const qrBuffer = await generateQrPng(response.sendQr.content);
    const qrSent = await messagingProvider.sendImage({
      to: userId,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption: response.sendQr.caption,
    });
    logMessage({
      provider,
      direction: "out",
      contact: userId,
      kind: "image",
      body: response.sendQr.content,
      caption: response.sendQr.caption,
      externalId: qrSent.messageId,
    });
  }
}
