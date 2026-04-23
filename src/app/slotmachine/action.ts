"use server";

import {
  createSessionWithId,
  getActiveDialog,
  insertAnswer,
} from "@/domain/dialog/dialog-repository";
import { resolveBucket } from "@/domain/dialog/score-buckets";
import { upsertLeadFromSession } from "@/domain/leads/lead-repository";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";
import {
  isValidGermanMobile,
  normalizeGermanMobile,
} from "./validation-helpers";

const log = createLogger("action:slotmachine");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SlotFormInput {
  consent: boolean;
  mobile: string;
  score: number;
  sessionId: string;
  variables: Record<string, string>;
}

export interface SlotFormResult {
  error?: string;
  success: boolean;
}

function buildSessionQrPayload(
  sessionId: string,
  vorname: string,
  bucketId: string | undefined
): string {
  const payload = JSON.stringify({
    sessionId,
    vorname,
    bucket: bucketId ?? "",
  });
  return Buffer.from(payload, "utf8").toString("base64");
}

function validateInput(input: SlotFormInput): string | null {
  if (!UUID_RE.test(input.sessionId)) {
    return "Ungültige Session-ID.";
  }
  if (!input.consent) {
    return "Bitte die Teilnahmebedingungen akzeptieren.";
  }
  if (!isValidGermanMobile(input.mobile)) {
    return "Bitte eine gültige deutsche Mobilnummer angeben.";
  }
  const vorname = input.variables.vorname?.trim();
  const nachname = input.variables.nachname?.trim();
  const email = input.variables.email?.trim();
  if (!vorname) {
    return "Bitte deinen Vornamen angeben.";
  }
  if (!nachname) {
    return "Bitte deinen Nachnamen angeben.";
  }
  if (!(email && EMAIL_RE.test(email))) {
    return "Bitte eine gültige E-Mail-Adresse angeben.";
  }
  return null;
}

/**
 * Looks up the stop-on-mqtt step id from the active dialog so the new web
 * session is parked exactly where the MQTT reflow expects to pick it up
 * after the scanner fires. Falls back to the first mqtt step.
 */
function findMqttWaitStepId(definition: {
  steps: { id: string; type: string }[];
}): string | undefined {
  const direct = definition.steps.find((s) => s.id === "warte-slotmachine");
  if (direct) {
    return direct.id;
  }
  return definition.steps.find((s) => s.type === "mqtt")?.id;
}

export async function submitSlotmachineAction(
  input: SlotFormInput
): Promise<SlotFormResult> {
  try {
    const validationError = validateInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const dialog = getActiveDialog();
    if (!dialog) {
      return { success: false, error: "Kein aktiver Dialog konfiguriert." };
    }

    const mqttStepId = findMqttWaitStepId(dialog.definition);
    if (!mqttStepId) {
      return {
        success: false,
        error:
          "Der aktive Dialog hat keinen MQTT-Warte-Step — QR-Reflow geht sonst ins Leere.",
      };
    }

    const normalizedMobile = normalizeGermanMobile(input.mobile);
    const vorname = input.variables.vorname?.trim() ?? "";
    const bucket = resolveBucket(input.score, dialog.definition.scoreBuckets);

    const mergedVariables: Record<string, string> = {
      ...input.variables,
      vorname,
      nachname: input.variables.nachname?.trim() ?? "",
      email: input.variables.email?.trim() ?? "",
      _score: String(input.score),
    };

    const { id: sessionDbId } = createSessionWithId({
      sessionId: input.sessionId,
      dialogId: dialog.id,
      provider: "gowa",
      contact: normalizedMobile,
      currentStepId: mqttStepId,
      variables: mergedVariables,
      score: input.score,
      state: "active",
    });

    // Persist the form answers as dialog_answers rows so the lead-detail
    // timeline shows what the user filled in on the web form. Step IDs here
    // are the static form-step IDs from form-steps.ts; the active dialog
    // doesn't contain them, so the lead-detail renders them as raw ids,
    // which is fine for an audit trail.
    for (const [key, value] of Object.entries(input.variables)) {
      if (key.endsWith("_label")) {
        continue;
      }
      const label = input.variables[`${key}_label`];
      insertAnswer({
        sessionId: sessionDbId,
        stepId: key,
        answerValue: value,
        answerLabel: label,
        scoreAdded: 0,
      });
    }

    upsertLeadFromSession({
      sessionDbId,
      dialogDbId: dialog.id,
      provider: "gowa",
      contact: normalizedMobile,
      variables: mergedVariables,
      score: input.score,
      state: "active",
      definition: dialog.definition,
    });

    const qrContent = buildSessionQrPayload(
      input.sessionId,
      vorname,
      bucket?.id
    );
    const qrBuffer = await generateQrPng(qrContent);

    const provider = await createMessagingProvider("gowa");
    const caption = `Hallo ${vorname}, halte den QR-Code an den Scanner am Stand — das Glücksrad dreht gleich auf dem großen Screen!`;

    await provider.sendImage({
      to: normalizedMobile,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption,
    });

    log.info("Slotmachine submission processed", {
      sessionId: input.sessionId,
      sessionDbId,
      leadScore: input.score,
      bucket: bucket?.id,
    });

    return { success: true };
  } catch (error) {
    log.error("Slotmachine submission failed", error, {
      sessionId: input.sessionId,
    });
    return {
      success: false,
      error: (error as Error).message ?? "Unbekannter Fehler.",
    };
  }
}
