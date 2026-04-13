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
import { resolveBucket } from "./score-buckets";

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

  // "reset" (case-insensitive) clears the active session so the user
  // can start over without waiting for the timeout.
  if (existingSession && text.trim().toLowerCase() === "reset") {
    completeSession(existingSession.id);
    log.info("Session reset by user", { provider, userId });
    const messagingProvider = await createMessagingProvider(provider);
    await messagingProvider.sendText({
      to: userId,
      body: "Deine Session wurde zurückgesetzt. Schreib 'start' um neu zu beginnen!",
    });
    return;
  }

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
      await sendResponse(
        messagingProvider,
        userId,
        response,
        provider,
        result.session,
        dialog.definition.scoreBuckets
      );
    } catch (error) {
      log.error("Failed to send dialog response", error, {
        provider,
        userId,
        type: response.type,
      });
    }
  }
}

function buildQrContent(
  response: DialogResponse,
  session: { variables: Record<string, string>; score: number },
  provider: string,
  userId: string,
  scoreBuckets?: { id: string; label: string; minScore: number }[]
): string {
  const qrMode = response.qr?.mode ?? "template";
  if (qrMode !== "session-data") {
    return response.qr?.content || "";
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(session.variables)) {
    if (!k.startsWith("_")) {
      data[k] = v;
    }
  }
  data.score = session.score;
  const bucket = resolveBucket(session.score, scoreBuckets);
  if (bucket) {
    data.bucket = bucket.id;
  }
  data.provider = provider;
  data.userId = userId;
  return JSON.stringify(data);
}

async function sendResponse(
  messagingProvider: Awaited<ReturnType<typeof createMessagingProvider>>,
  userId: string,
  response: DialogResponse,
  provider: string,
  session: { variables: Record<string, string>; score: number },
  scoreBuckets?: { id: string; label: string; minScore: number }[]
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

      const qrContent = buildQrContent(
        response,
        session,
        provider,
        userId,
        scoreBuckets
      );
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
