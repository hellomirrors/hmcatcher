import { promises as fs } from "node:fs";
import path from "node:path";
import { upsertLeadFromSession } from "@/domain/leads/lead-repository";
import { logMessage } from "@/domain/messaging/message-log";
import { refreshMqttSubscriptions } from "@/domain/messaging/mqtt-service";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import type { MessagingProvider } from "@/domain/types";
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
import type { DialogDefinition } from "./dialog-schema";
import { resolveBucket } from "./score-buckets";

function shouldRecordLead(
  definition: DialogDefinition,
  variables: Record<string, string>
): boolean {
  const trigger = definition.leadConsentTrigger;
  if (!trigger) {
    // No trigger configured → record once any variable is captured.
    return Object.keys(variables).length > 0;
  }
  return variables[trigger.variable] === trigger.value;
}

const log = createLogger("dialog-handler");

const LEADING_SLASHES = /^\/+/;

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

  // New sessions: create early so QR payloads and leads have a stable id.
  // Existing sessions: DO NOT advance yet — we only persist the new state
  // after every outgoing response has actually been accepted by its
  // provider, so a GoWa/WhatsApp failure mid-chain leaves the user on the
  // previous step and a retry can replay the same flow.
  let sessionId: string;
  let sessionDbId: number;
  if (existingSession) {
    sessionId = existingSession.sessionId;
    sessionDbId = existingSession.id;
  } else {
    const created = createSession({
      dialogId: dialog.id,
      provider,
      contact: userId,
      currentStepId: result.session.currentStepId,
    });
    sessionId = created.sessionId;
    sessionDbId = created.id;
  }

  // Send responses. Resolve the messaging provider per response so that
  // steps with `forceProvider` (e.g. PDF must go via GoWa) can override
  // the session's default provider. Errors are collected so we can decide
  // whether to persist the session advance.
  const providerCache = new Map<string, MessagingProvider>();

  async function resolveProvider(name: string): Promise<MessagingProvider> {
    let cached = providerCache.get(name);
    if (!cached) {
      cached = await createMessagingProvider(name);
      providerCache.set(name, cached);
    }
    return cached;
  }

  const sendErrors: Array<{
    type: string;
    provider: string;
    error: string;
  }> = [];

  for (const response of result.responses) {
    const effectiveProvider = response.forceProvider ?? provider;
    log.info("Delivering dialog response", {
      type: response.type,
      provider: effectiveProvider,
      forceProvider: response.forceProvider,
      buttonCount: response.buttons?.length,
      listSections: response.list?.sections.length,
      bodyLen: response.text?.length,
      sessionId,
      fromStep: existingSession?.currentStepId,
      toStep: result.session.currentStepId,
    });
    try {
      const messagingProvider = await resolveProvider(effectiveProvider);
      await sendResponse(
        messagingProvider,
        userId,
        response,
        effectiveProvider,
        { ...result.session, sessionId },
        dialog.definition.scoreBuckets
      );
    } catch (error) {
      const msg = (error as Error).message;
      log.error("Failed to send dialog response", error, {
        provider: effectiveProvider,
        forceProvider: response.forceProvider,
        userId,
        sessionId,
        currentStepId: existingSession?.currentStepId,
        targetStepId: result.session.currentStepId,
        type: response.type,
      });
      sendErrors.push({
        type: response.type,
        provider: effectiveProvider,
        error: msg,
      });
    }
  }

  // If anything failed, freeze the session at its previous state so the
  // user can retry (e.g. stale gowaDeviceId, expired token, provider
  // outage). The engine is pure, so replaying the same inbound message
  // re-runs the chain once the config is fixed.
  if (sendErrors.length > 0) {
    log.error("Dialog advance cancelled — send failures, session frozen", {
      sessionId,
      sessionDbId,
      fromStep: existingSession?.currentStepId,
      targetStep: result.session.currentStepId,
      failures: sendErrors.length,
      total: result.responses.length,
      errors: sendErrors,
    });
    return;
  }

  // All sends accepted — persist the advance.
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
  }

  // If the user just landed on an mqtt-wait step, make sure the broker
  // client is alive and subscribed — without this an idle worker can sit
  // disconnected and miss the slot-result reflow.
  const newStep = dialog.definition.steps.find(
    (s) => s.id === result.session.currentStepId
  );
  if (newStep?.type === "mqtt") {
    refreshMqttSubscriptions();
  }

  // Lead capture: once consent is given (per dialog config), upsert a lead
  // row that mirrors the session — variables, score and bucket grow as the
  // user progresses, including the bucket reflowed via MQTT slot result.
  if (shouldRecordLead(dialog.definition, result.session.variables)) {
    upsertLeadFromSession({
      sessionDbId,
      dialogDbId: dialog.id,
      provider,
      contact: userId,
      variables: result.session.variables,
      score: result.session.score,
      state: result.session.state,
      definition: dialog.definition,
    });
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
    case "document": {
      if (!response.document) {
        log.warn("Document step missing document config", {
          stepId: session.sessionId,
        });
        break;
      }
      const publicDir = path.join(process.cwd(), "public");
      const relPath = response.document.path.replace(LEADING_SLASHES, "");
      const absPath = path.join(publicDir, relPath);
      const buffer = await fs.readFile(absPath);
      const sent = await messagingProvider.sendDocument({
        to: userId,
        documentBuffer: buffer,
        mimeType: response.document.mimeType,
        filename: response.document.filename,
        caption: response.text,
      });
      logMessage({
        provider,
        direction: "out",
        contact: userId,
        kind: "image",
        body: response.document.filename,
        caption: response.text,
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
