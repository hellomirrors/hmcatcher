"use server";

import {
  createSessionWithId,
  getActiveDialog,
  insertAnswer,
} from "@/domain/dialog/dialog-repository";
import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { resolveBucket } from "@/domain/dialog/score-buckets";
import { upsertLeadFromSession } from "@/domain/leads/lead-repository";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import { generateQrPng } from "@/domain/messaging/qr-service";
import { createLogger } from "@/lib/logger";
import { evaluateTransitions } from "./transitions";
import {
  isValidGermanMobile,
  normalizeGermanMobile,
  runValidation,
} from "./validation-helpers";

const log = createLogger("action:slotmachine");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SlotFormAnswer {
  label?: string;
  scoreAdded: number;
  stepId: string;
  value: string;
}

export interface SlotFormInput {
  answers: SlotFormAnswer[];
  consent: boolean;
  mobile: string;
  sessionId: string;
}

export interface SlotFormResult {
  error?: string;
  success: boolean;
}

function findStep(steps: DialogStep[], id: string): DialogStep | undefined {
  return steps.find((s) => s.id === id);
}

interface ReplayState {
  currentId: string | undefined;
  score: number;
  variables: Record<string, string>;
}

type ReplayResult =
  | {
      currentStepId: string;
      score: number;
      variables: Record<string, string>;
    }
  | { error: string };

const INPUT_TYPES = new Set(["buttons", "list", "free_text"]);

/** Skip past output-only steps until we hit the next input step or an end. */
function advanceToInput(
  steps: DialogStep[],
  state: ReplayState
): { error: string } | undefined {
  let safety = 0;
  while (state.currentId && safety < 20) {
    safety += 1;
    const step = findStep(steps, state.currentId);
    if (!step) {
      return { error: `Unbekannter Schritt: ${state.currentId}` };
    }
    if (INPUT_TYPES.has(step.type)) {
      return;
    }
    if (step.type === "qr" || step.type === "mqtt") {
      return { error: "Formular schon vor der QR-Stufe abgeschlossen." };
    }
    state.currentId = evaluateTransitions(step.transitions, {
      ...state.variables,
      _score: String(state.score),
    });
  }
  return;
}

function applyChoiceAnswer(
  step: DialogStep,
  answer: SlotFormAnswer,
  state: ReplayState
): { error: string } | undefined {
  const opt = step.options?.find((o) => o.id === answer.value);
  if (!opt) {
    return { error: `Ungültige Option für ${step.id}.` };
  }
  state.score += opt.score ?? 0;
  if (step.variableName) {
    state.variables[step.variableName] = opt.id;
    state.variables[`${step.variableName}_label`] = opt.label;
  }
  return;
}

function applyFreeTextAnswer(
  step: DialogStep,
  answer: SlotFormAnswer,
  state: ReplayState
): { error: string } | undefined {
  const trimmed = answer.value.trim();
  if (!runValidation(trimmed, step.validation)) {
    return {
      error: step.validationMessage ?? `Ungültige Eingabe bei ${step.id}.`,
    };
  }
  if (step.variableName) {
    state.variables[step.variableName] = trimmed;
  }
  return;
}

function applyAnswer(
  steps: DialogStep[],
  answer: SlotFormAnswer,
  state: ReplayState
): { error: string } | undefined {
  const advance = advanceToInput(steps, state);
  if (advance) {
    return advance;
  }
  if (!state.currentId) {
    return { error: "Unerwartetes Ende des Dialogs." };
  }
  if (state.currentId !== answer.stepId) {
    return {
      error: `Schritt-Mismatch: erwartet ${state.currentId}, bekommen ${answer.stepId}.`,
    };
  }
  const step = findStep(steps, state.currentId);
  if (!step) {
    return { error: `Unbekannter Schritt: ${state.currentId}` };
  }

  const result =
    step.type === "buttons" || step.type === "list"
      ? applyChoiceAnswer(step, answer, state)
      : applyFreeTextAnswer(step, answer, state);
  if (result) {
    return result;
  }

  state.variables._score = String(state.score);
  const next = evaluateTransitions(step.transitions, state.variables);
  if (!next) {
    return { error: `Keine passende Weiterleitung nach ${step.id}.` };
  }
  state.currentId = next;
  return;
}

/** After all answers are applied, ensure we actually land on qr/mqtt. */
function finalizeReplay(steps: DialogStep[], state: ReplayState): ReplayResult {
  let safety = 0;
  while (state.currentId && safety < 10) {
    safety += 1;
    const step = findStep(steps, state.currentId);
    if (!step) {
      break;
    }
    if (step.type === "qr" || step.type === "mqtt") {
      return {
        variables: state.variables,
        score: state.score,
        currentStepId: state.currentId,
      };
    }
    if (INPUT_TYPES.has(step.type)) {
      return { error: `Es fehlt noch eine Antwort für Schritt ${step.id}.` };
    }
    state.currentId = evaluateTransitions(step.transitions, state.variables);
  }
  return { error: "Dialog-Ende erreicht, aber keine QR-Stufe." };
}

/**
 * Replays the answer chain against the active dialog. Rejects the submission
 * if any step diverges from what the engine would accept (unknown step,
 * invalid answer, wrong branching). Returns the final variables map, score
 * and the currentStepId the session should rest on.
 */
function replayAnswers(
  steps: DialogStep[],
  entryStepId: string,
  answers: SlotFormAnswer[]
): ReplayResult {
  const state: ReplayState = {
    currentId: entryStepId,
    score: 0,
    variables: {},
  };
  for (const answer of answers) {
    const err = applyAnswer(steps, answer, state);
    if (err) {
      return err;
    }
  }
  return finalizeReplay(steps, state);
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

export async function submitSlotmachineAction(
  input: SlotFormInput
): Promise<SlotFormResult> {
  try {
    if (!UUID_RE.test(input.sessionId)) {
      return { success: false, error: "Ungültige Session-ID." };
    }
    if (!input.consent) {
      return {
        success: false,
        error: "Bitte die Teilnahmebedingungen akzeptieren.",
      };
    }
    if (!isValidGermanMobile(input.mobile)) {
      return {
        success: false,
        error: "Bitte eine gültige deutsche Mobilnummer angeben.",
      };
    }
    if (input.answers.length === 0) {
      return { success: false, error: "Keine Antworten übermittelt." };
    }

    const dialog = getActiveDialog();
    if (!dialog) {
      return { success: false, error: "Kein aktiver Dialog konfiguriert." };
    }

    const welcome = dialog.definition.steps.find((s) => s.id === "welcome");
    const entryStepId =
      welcome?.transitions.find(
        (t) => !t.conditions || t.conditions.length === 0
      )?.targetStepId ??
      dialog.definition.steps.find((s) =>
        ["buttons", "free_text", "list"].includes(s.type)
      )?.id;
    if (!entryStepId) {
      return { success: false, error: "Einstiegsschritt nicht gefunden." };
    }

    const replay = replayAnswers(
      dialog.definition.steps,
      entryStepId,
      input.answers
    );
    if ("error" in replay) {
      log.warn("Slotmachine replay rejected submission", {
        error: replay.error,
        sessionId: input.sessionId,
      });
      return { success: false, error: replay.error };
    }

    const normalizedMobile = normalizeGermanMobile(input.mobile);
    const bucket = resolveBucket(replay.score, dialog.definition.scoreBuckets);

    const { id: sessionDbId } = createSessionWithId({
      sessionId: input.sessionId,
      dialogId: dialog.id,
      provider: "gowa",
      contact: normalizedMobile,
      currentStepId: replay.currentStepId,
      variables: replay.variables,
      score: replay.score,
      state: "active",
    });

    for (const answer of input.answers) {
      insertAnswer({
        sessionId: sessionDbId,
        stepId: answer.stepId,
        answerValue: answer.value,
        answerLabel: answer.label,
        scoreAdded: answer.scoreAdded,
      });
    }

    upsertLeadFromSession({
      sessionDbId,
      dialogDbId: dialog.id,
      provider: "gowa",
      contact: normalizedMobile,
      variables: replay.variables,
      score: replay.score,
      state: "active",
      definition: dialog.definition,
    });

    const qrContent = buildSessionQrPayload(
      input.sessionId,
      replay.variables.vorname ?? "",
      bucket?.id
    );
    const qrBuffer = await generateQrPng(qrContent);

    const provider = await createMessagingProvider("gowa");
    const vorname = replay.variables.vorname ?? "";
    const caption = vorname
      ? `Hallo ${vorname}, halte den QR-Code an den Scanner am Stand — das Glücksrad dreht gleich auf dem großen Screen!`
      : "Halte den QR-Code an den Scanner am Stand — das Glücksrad dreht gleich auf dem großen Screen!";

    await provider.sendImage({
      to: normalizedMobile,
      imageBuffer: qrBuffer,
      mimeType: "image/png",
      caption,
    });

    log.info("Slotmachine submission processed", {
      sessionId: input.sessionId,
      sessionDbId,
      leadScore: replay.score,
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
