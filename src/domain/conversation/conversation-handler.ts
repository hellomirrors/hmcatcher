import { readConfigurationSync } from "@/domain/configuration/configuration-service";
import { handleDialogConversation } from "@/domain/dialog/dialog-handler";
import { logMessage } from "@/domain/messaging/message-log";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { resolveSettings } from "@/domain/settings/settings-service";
import { createLogger } from "@/lib/logger";
import { handleInboundMessage } from "./conversation-engine";
import { createContactToken } from "./token-store";

const log = createLogger("conversation");

const TRAILING_SLASHES = /\/+$/;

async function buildContactLink(
  provider: string,
  userId: string
): Promise<string> {
  const cfg = await resolveSettings();
  const baseUrl = cfg.appBaseUrl.replace(TRAILING_SLASHES, "");
  const token = createContactToken(provider, userId);
  return `${baseUrl}/c/${token}`;
}

async function handleWebformMessage(
  provider: string,
  userId: string
): Promise<void> {
  const config = readConfigurationSync();
  const messagingProvider = await createMessagingProvider(provider);
  const link = await buildContactLink(provider, userId);
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
  log.info("Handling message", { provider, userId, text });
  const settings = await resolveSettings();

  if (settings.conversationMode === "dialog") {
    log.info("Dialog mode", { provider, userId });
    await handleDialogConversation(provider, userId, text);
    return;
  }

  if (settings.conversationMode === "webform") {
    log.info("Webform mode — sending link", { provider, userId });
    await handleWebformMessage(provider, userId);
    return;
  }

  const response = handleInboundMessage(provider, userId, text);
  log.info("Engine response", {
    provider,
    userId,
    responseText: response.text,
    hasButtons: !!response.buttons,
    hasList: !!response.list,
    hasQr: !!response.sendQr,
  });
  const messagingProvider = await createMessagingProvider(provider);

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
