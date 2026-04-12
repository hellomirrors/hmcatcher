import { buildContactLink } from "@/domain/conversation/conversation-handler";
import { logMessage } from "@/domain/messaging/message-log";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";
import type { DialogResponse } from "./dialog-engine";
import { handleDialogMessage } from "./dialog-engine";
import {
  completeSession,
  createSession,
  getActiveDialog,
  getSession,
  insertAnswer,
  updateSession,
} from "./dialog-repository";

const log = createLogger("dialog-handler");

export async function handleDialogConversation(
  provider: string,
  userId: string,
  text: string
): Promise<void> {
  const dialog = getActiveDialog();
  if (!dialog) {
    log.warn("No active dialog configured");
    return;
  }

  const existingSession = getSession(provider, userId);

  const sessionInput = existingSession
    ? {
        currentStepId: existingSession.currentStepId,
        variables: existingSession.variables,
        score: existingSession.score,
      }
    : null;

  const result = handleDialogMessage(dialog.definition, sessionInput, text);

  if (!result) {
    log.info("No dialog trigger matched", { provider, userId, text });
    return;
  }

  // Persist session state
  if (existingSession) {
    if (result.answer) {
      insertAnswer({
        sessionId: existingSession.id,
        stepId: result.answer.stepId,
        answerValue: result.answer.answerValue,
        answerLabel: result.answer.answerLabel,
        scoreAdded: result.answer.scoreAdded,
      });
    }

    if (result.session.state === "completed") {
      completeSession(existingSession.id);
    } else {
      updateSession(existingSession.id, {
        currentStepId: result.session.currentStepId,
        variables: result.session.variables,
        score: result.session.score,
      });
    }
  } else {
    createSession({
      dialogId: dialog.id,
      provider,
      contact: userId,
      currentStepId: result.session.currentStepId,
    });
  }

  // Send responses
  const messagingProvider = await createMessagingProvider(provider);

  for (const response of result.responses) {
    try {
      await sendResponse(messagingProvider, userId, response, provider);
    } catch (error) {
      log.error("Failed to send dialog response", error, {
        provider,
        userId,
        type: response.type,
      });
    }
  }
}

async function sendResponse(
  messagingProvider: Awaited<ReturnType<typeof createMessagingProvider>>,
  userId: string,
  response: DialogResponse,
  provider: string
): Promise<void> {
  switch (response.type) {
    case "buttons": {
      if (response.buttons && response.buttons.length > 0) {
        const sent = await messagingProvider.sendButtons({
          to: userId,
          body: response.text,
          buttons: response.buttons,
          header: response.header,
          footer: response.footer,
        });
        logMessage({
          provider,
          direction: "out",
          contact: userId,
          kind: "text",
          body: response.text,
          externalId: sent.messageId,
        });
      }
      break;
    }
    case "list": {
      if (response.list) {
        const sent = await messagingProvider.sendList({
          to: userId,
          title: response.list.title,
          body: response.list.body,
          buttonText: response.list.buttonText,
          footer: response.list.footer,
          sections: response.list.sections,
        });
        logMessage({
          provider,
          direction: "out",
          contact: userId,
          kind: "text",
          body: response.text,
          externalId: sent.messageId,
        });
      }
      break;
    }
    case "qr": {
      // Send text first, then QR image
      const textSent = await messagingProvider.sendText({
        to: userId,
        body: response.text,
      });
      logMessage({
        provider,
        direction: "out",
        contact: userId,
        kind: "text",
        body: response.text,
        externalId: textSent.messageId,
      });

      // When qrTemplate is empty the engine returns an empty content
      // string. Fall back to generating a unique contact-link URL so
      // dialog authors don't need to hard-code the pattern.
      const qrContent =
        response.qr?.content || (await buildContactLink(provider, userId));
      const qrCaption = response.qr?.caption || "";

      const qrBuffer = await generateQrPng(qrContent);
      const qrSent = await messagingProvider.sendImage({
        to: userId,
        imageBuffer: qrBuffer,
        mimeType: "image/png",
        caption: qrCaption,
      });
      logMessage({
        provider,
        direction: "out",
        contact: userId,
        kind: "image",
        body: qrContent,
        caption: qrCaption,
        externalId: qrSent.messageId,
      });
      break;
    }
    case "video": {
      const videoText = response.videoUrl
        ? `${response.text}\n\n${response.videoUrl}`
        : response.text;
      const sent = await messagingProvider.sendText({
        to: userId,
        body: videoText,
      });
      logMessage({
        provider,
        direction: "out",
        contact: userId,
        kind: "text",
        body: videoText,
        externalId: sent.messageId,
      });
      break;
    }
    default: {
      const sent = await messagingProvider.sendText({
        to: userId,
        body: response.text,
      });
      logMessage({
        provider,
        direction: "out",
        contact: userId,
        kind: "text",
        body: response.text,
        externalId: sent.messageId,
      });
      break;
    }
  }
}
