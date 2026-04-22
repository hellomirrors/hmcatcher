import { promises as fs } from "node:fs";
import path from "node:path";
import { logMessage } from "@/domain/messaging/message-log";
import type { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";
import type { DialogResponse } from "./dialog-engine";
import { resolveBucket } from "./score-buckets";

const log = createLogger("dialog-response-sender");

const LEADING_SLASHES = /^\/+/;
const MESSE_QR_SEPARATOR = "1a2b3c4d5e6f7g8h9i";

/**
 * Pauses the outgoing response loop for the configured delay if the response
 * is a timer step. Returns true when the response was consumed (caller should
 * `continue`), false otherwise.
 */
export async function maybeWaitOnTimer(
  response: DialogResponse,
  logContext: Record<string, unknown>
): Promise<boolean> {
  if (response.type !== "timer") {
    return false;
  }
  const delayMs = response.delayMs ?? 0;
  log.info("Dialog timer pause", { delayMs, ...logContext });
  if (delayMs > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
  return true;
}

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

/**
 * Renders and delivers a single DialogResponse via the given messaging
 * provider, and writes the corresponding message-log entry. Shared by
 * the webhook-driven handler and the MQTT-event dispatcher so both paths
 * honour interactive types (buttons, list, qr, document) identically.
 *
 * `sessionProvider` is the channel the user is actually on (used for
 * message-log grouping). The messagingProvider passed in may differ when
 * a step sets `forceProvider` — the caller is responsible for resolving
 * the effective transport.
 */
export async function sendResponse(
  messagingProvider: Awaited<ReturnType<typeof createMessagingProvider>>,
  userId: string,
  response: DialogResponse,
  sessionProvider: string,
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
          provider: sessionProvider,
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
          provider: sessionProvider,
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
      const textSent = await messagingProvider.sendText({
        to: userId,
        body: response.text,
      });
      logMessage({
        provider: sessionProvider,
        direction: "out",
        contact: userId,
        kind: "text",
        body: response.text,
        externalId: textSent.messageId,
      });

      const qrContent = buildQrContent(response, session, scoreBuckets);
      const qrCaption = response.qr?.caption || "";

      const qrBuffer = await generateQrPng(qrContent);
      const qrSent = await messagingProvider.sendImage({
        to: userId,
        imageBuffer: qrBuffer,
        mimeType: "image/png",
        caption: qrCaption,
      });
      logMessage({
        provider: sessionProvider,
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
        provider: sessionProvider,
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
        provider: sessionProvider,
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
        provider: sessionProvider,
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
