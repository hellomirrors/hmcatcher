import { create } from "zustand";
import type { DialogResponse } from "@/domain/dialog/dialog-engine";
import { handleDialogMessage } from "@/domain/dialog/dialog-engine";
import type { DialogDefinition } from "@/domain/dialog/dialog-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulatorMessage {
  id: string;
  response?: DialogResponse;
  sender: "bot" | "user" | "system";
  stepId?: string;
  text: string;
}

interface SessionState {
  currentStepId: string;
  score: number;
  state: "active" | "completed";
  variables: Record<string, string>;
}

interface Snapshot {
  messagesLength: number;
  session: SessionState | null;
  status: SimulatorStatus;
}

type SimulatorStatus = "idle" | "running" | "completed";

export interface SimulatorState {
  messages: SimulatorMessage[];
  reset: () => void;
  sendMessage: (definition: DialogDefinition, text: string) => void;
  session: SessionState | null;
  snapshots: Snapshot[];

  start: (definition: DialogDefinition) => void;
  status: SimulatorStatus;
  stepBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let msgCounter = 0;
const nextId = () => `sim-${++msgCounter}`;

// Unique simulator session id per `start()` — so QR payloads carry a new id
// every run and downstream consumers (e.g. hmslots) don't treat subsequent
// scans as duplicates of a hard-coded fallback like "sim-session".
const newSessionId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `sim-${crypto.randomUUID()}`;
  }
  return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

function responsesToMessages(
  responses: DialogResponse[],
  currentStepId: string
): SimulatorMessage[] {
  return responses.map((r) => ({
    id: nextId(),
    sender: "bot" as const,
    stepId: currentStepId,
    response: r,
    text: r.text,
  }));
}

/** Steps that produce output but don't require user input. */
function isOutputOnlyStep(type: string): boolean {
  return type === "text" || type === "qr" || type === "video";
}

/**
 * Steps that should auto-advance in the simulator. QR and video are
 * excluded because their visual content needs to be inspectable —
 * the user clicks "Weiter" to advance past them.
 */
function shouldAutoAdvance(type: string): boolean {
  return type === "text";
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSimulatorStore = create<SimulatorState>()((set, get) => ({
  messages: [],
  session: null,
  status: "idle",
  snapshots: [],

  start: (definition) => {
    msgCounter = 0;
    const keyword = definition.triggerKeywords[0] ?? "start";
    const result = handleDialogMessage(definition, null, keyword);

    const session: SessionState = {
      ...result.session,
      variables: { ...result.session.variables, _sessionId: newSessionId() },
    };
    const msgs = responsesToMessages(
      result.responses,
      result.session.currentStepId
    );

    if (msgs.length === 0) {
      set({
        messages: [
          {
            id: nextId(),
            sender: "system",
            text: "Dieser Dialog hat keine Schritte.",
          },
        ],
        session: null,
        status: "completed",
        snapshots: [],
      });
      return;
    }

    set({
      messages: msgs,
      session,
      status: session.state === "completed" ? "completed" : "running",
      snapshots: [],
    });

    // Auto-advance text-only steps (QR/video need manual "Weiter")
    const step = definition.steps.find((s) => s.id === session.currentStepId);
    if (step && shouldAutoAdvance(step.type) && session.state === "active") {
      setTimeout(() => get().sendMessage(definition, ""), 600);
    }
  },

  sendMessage: (definition, text) => {
    const { messages, session, status, snapshots } = get();
    if (!session || status !== "running") {
      return;
    }

    // Snapshot before action
    const snapshot: Snapshot = {
      session: { ...session, variables: { ...session.variables } },
      messagesLength: messages.length,
      status,
    };

    const newMessages = [...messages];

    // Add user bubble (unless auto-advancing output-only)
    const currentStep = definition.steps.find(
      (s) => s.id === session.currentStepId
    );
    const isAutoAdvance =
      currentStep && isOutputOnlyStep(currentStep.type) && text === "";
    if (!isAutoAdvance) {
      newMessages.push({
        id: nextId(),
        sender: "user",
        text,
      });
    }

    const result = handleDialogMessage(definition, session, text || "weiter");

    const botMsgs = responsesToMessages(
      result.responses,
      result.session.currentStepId
    );
    newMessages.push(...botMsgs);

    // Preserve the simulator-only _sessionId across turns — the dialog engine
    // works with a stripped variables map and may not carry custom underscore
    // keys through. Reattach from the previous session.
    const preservedSessionId = session.variables._sessionId;
    const newSession: SessionState = {
      ...result.session,
      variables: preservedSessionId
        ? { ...result.session.variables, _sessionId: preservedSessionId }
        : result.session.variables,
    };

    set({
      messages: newMessages,
      session: newSession,
      status: newSession.state === "completed" ? "completed" : "running",
      snapshots: [...snapshots, snapshot],
    });

    // Completed → system message
    if (newSession.state === "completed") {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: nextId(),
            sender: "system" as const,
            text: "Dialog abgeschlossen.",
          },
        ],
      }));
      return;
    }

    // Auto-advance text-only steps (QR/video need manual "Weiter")
    const nextStep = definition.steps.find(
      (s) => s.id === newSession.currentStepId
    );
    if (nextStep && shouldAutoAdvance(nextStep.type)) {
      setTimeout(() => get().sendMessage(definition, ""), 600);
    }
  },

  stepBack: () => {
    const { snapshots } = get();
    if (snapshots.length === 0) {
      return;
    }

    const snapshot = snapshots.at(-1);
    if (!snapshot) {
      return;
    }
    set((s) => ({
      messages: s.messages.slice(0, snapshot.messagesLength),
      session: snapshot.session,
      status: snapshot.status,
      snapshots: s.snapshots.slice(0, -1),
    }));
  },

  reset: () => {
    msgCounter = 0;
    set({
      messages: [],
      session: null,
      status: "idle",
      snapshots: [],
    });
  },
}));
