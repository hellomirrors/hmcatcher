import { upsertLeadFromSession } from "@/domain/leads/lead-repository";
import { refreshMqttSubscriptions } from "@/domain/messaging/mqtt-service";
import { createMessagingProvider } from "@/domain/messaging/provider-factory";
import type { MessagingProvider } from "@/domain/types";
import { createLogger } from "@/lib/logger";
import { handleDialogMessage } from "./dialog-engine";
import {
  completeSession,
  createSession,
  getActiveDialog,
  getSession,
  insertAnswer,
  updateSession,
} from "./dialog-repository";
import { maybeWaitOnTimer, sendResponse } from "./dialog-response-sender";
import type { DialogDefinition } from "./dialog-schema";

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

interface SendError {
  error: string;
  provider: string;
  type: string;
}

interface DeliverResponsesInput {
  dialog: {
    definition: DialogDefinition;
  };
  fromStep: string | undefined;
  provider: string;
  responses: import("./dialog-engine").DialogResponse[];
  sessionData: {
    currentStepId: string;
    score: number;
    state: "active" | "completed";
    variables: Record<string, string>;
  };
  sessionId: string;
  toStep: string;
  userId: string;
}

async function deliverResponses(
  input: DeliverResponsesInput
): Promise<SendError[]> {
  const providerCache = new Map<string, MessagingProvider>();
  const resolveProvider = async (name: string): Promise<MessagingProvider> => {
    let cached = providerCache.get(name);
    if (!cached) {
      cached = await createMessagingProvider(name);
      providerCache.set(name, cached);
    }
    return cached;
  };

  const errors: SendError[] = [];
  for (const response of input.responses) {
    if (await maybeWaitOnTimer(response, { sessionId: input.sessionId })) {
      continue;
    }
    const effectiveProvider =
      response.forceProvider ??
      input.dialog.definition.defaultProvider ??
      input.provider;
    log.info("Delivering dialog response", {
      type: response.type,
      provider: effectiveProvider,
      forceProvider: response.forceProvider,
      buttonCount: response.buttons?.length,
      listSections: response.list?.sections.length,
      bodyLen: response.text?.length,
      sessionId: input.sessionId,
      fromStep: input.fromStep,
      toStep: input.toStep,
    });
    try {
      const messagingProvider = await resolveProvider(effectiveProvider);
      await sendResponse(
        messagingProvider,
        input.userId,
        response,
        input.provider,
        { ...input.sessionData, sessionId: input.sessionId },
        input.dialog.definition.scoreBuckets
      );
    } catch (error) {
      log.error("Failed to send dialog response", error, {
        provider: effectiveProvider,
        forceProvider: response.forceProvider,
        userId: input.userId,
        sessionId: input.sessionId,
        fromStep: input.fromStep,
        toStep: input.toStep,
        type: response.type,
      });
      errors.push({
        type: response.type,
        provider: effectiveProvider,
        error: (error as Error).message,
      });
    }
  }
  return errors;
}

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
    // A concurrent webhook (Telegram retries on 5xx, GoWa double-emits)
    // raced us and won the partial UNIQUE on (provider, contact, active).
    // The other request is already running the engine for this turn —
    // bail out so we don't deliver the same opening message twice.
    if (created.alreadyExisted) {
      log.info("Inbound message lost UNIQUE race — skipping duplicate open", {
        provider,
        userId,
        existingDbId: sessionDbId,
      });
      return;
    }
  }

  const sendErrors = await deliverResponses({
    responses: result.responses,
    provider,
    userId,
    sessionId,
    fromStep: existingSession?.currentStepId,
    toStep: result.session.currentStepId,
    sessionData: result.session,
    dialog,
  });

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
