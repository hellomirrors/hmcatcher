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
  let sessionId: string;
  if (existingSession) {
    sessionId = existingSession.sessionId;
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
    const created = createSession({
      dialogId: dialog.id,
      provider,
      contact: userId,
      currentStepId: result.session.currentStepId,
    });
    sessionId = created.sessionId;
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
        { ...result.session, sessionId },
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

const MESSE_QR_SEPARATOR = "1a2b3c4d5e6f7g8h9i";

function reverseString(value: string): string {
  return [...value].reverse().join("");
}

function buildMesseQrContent(
  session: { variables: Record<string, string>; score: number },
  scoreBuckets?: { id: string; label: string; minScore: number }[]
): string {
  const vorname = session.variables.vorname ?? "";
  const bucket = resolveBucket(session.score, scoreBuckets);
  const bucketReversed = bucket ? reverseString(bucket.id) : "";
  return `${vorname}${MESSE_QR_SEPARATOR}${bucketReversed}${MESSE_QR_SEPARATOR}`;
}

function buildQrContent(
  response: DialogResponse,
  session: {
    variables: Record<string, string>;
    score: number;
    sessionId: string;
  },
  _provider: string,
  _userId: string,
  scoreBuckets?: { id: string; label: string; minScore: number }[]
): string {
  const qrMode = response.qr?.mode ?? "template";
  if (qrMode === "template") {
    return response.qr?.content || "";
  }
  if (qrMode === "messe") {
    return buildMesseQrContent(session, scoreBuckets);
  }
  const bucket = resolveBucket(session.score, scoreBuckets);
  const data = {
    sessionId: session.sessionId,
    vorname: session.variables.vorname ?? "",
    bucket: bucket?.id ?? "",
  };
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64");
}

async function sendResponse(
  messagingProvider: Awaited<ReturnType<typeof createMessagingProvider>>,
  userId: string,
  response: DialogResponse,
  provider: string,
  session: {
    variables: Record<string, string>;
    score: number;
    sessionId: string;
  },
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
    case "mqtt": {
      // Silent wait: no message is sent to the user. The session stays on
      // this step until a matching MQTT event advances it.
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
