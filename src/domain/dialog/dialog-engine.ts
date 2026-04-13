import type { ButtonOption, ListSection } from "@/domain/types";
import { createLogger } from "@/lib/logger";
import type {
  DialogCondition,
  DialogDefinition,
  DialogStep,
  DialogTransition,
} from "./dialog-schema";
import { renderTemplate } from "./template-engine";
import { validateAnswer } from "./validation";

const log = createLogger("dialog-engine");

// --- Result types ---

export interface DialogResponse {
  buttons?: ButtonOption[];
  footer?: string;
  header?: string;
  list?: {
    title: string;
    body: string;
    buttonText: string;
    footer?: string;
    sections: ListSection[];
  };
  qr?: { content: string; caption: string; mode: "template" | "session-data" };
  text: string;
  type: "text" | "buttons" | "list" | "qr" | "video";
  videoUrl?: string;
}

export interface DialogEngineResult {
  answer?: {
    stepId: string;
    answerValue: string;
    answerLabel?: string;
    scoreAdded: number;
  };
  responses: DialogResponse[];
  session: {
    currentStepId: string;
    variables: Record<string, string>;
    score: number;
    state: "active" | "completed";
  };
}

// --- Public API ---

export function handleDialogMessage(
  definition: DialogDefinition,
  session: {
    currentStepId: string;
    variables: Record<string, string>;
    score: number;
  } | null,
  text: string
): DialogEngineResult {
  if (!session) {
    const normalized = text.trim().toLowerCase();
    const triggered = definition.triggerKeywords.some(
      (kw) => kw.toLowerCase() === normalized
    );

    if (!triggered) {
      log.info("No trigger keyword matched", { text });
      return {
        responses: [],
        session: {
          currentStepId: "",
          variables: {},
          score: 0,
          state: "active",
        },
      };
    }

    const firstStep = definition.steps[0];
    if (!firstStep) {
      log.warn("Dialog definition has no steps");
      return {
        responses: [],
        session: {
          currentStepId: "",
          variables: {},
          score: 0,
          state: "completed",
        },
      };
    }

    const variables: Record<string, string> = {};
    const response = renderStep(firstStep, variables);

    log.info("Dialog triggered, rendering first step", {
      stepId: firstStep.id,
    });

    return {
      responses: [response],
      session: {
        currentStepId: firstStep.id,
        variables,
        score: 0,
        state: "active",
      },
    };
  }

  const currentStep = findStep(definition, session.currentStepId);
  if (!currentStep) {
    log.warn("Current step not found", { stepId: session.currentStepId });
    return {
      responses: [],
      session: {
        currentStepId: session.currentStepId,
        variables: session.variables,
        score: session.score,
        state: "completed",
      },
    };
  }

  return processAnswer(
    definition,
    currentStep,
    text,
    session.variables,
    session.score
  );
}

// --- Input matching helpers ---

interface MatchResult {
  answerLabel?: string;
  answerValue: string;
  earlyReturn?: DialogEngineResult;
  scoreAdded: number;
}

function matchChoiceInput(
  definition: DialogDefinition,
  currentStep: DialogStep,
  trimmed: string,
  variables: Record<string, string>,
  score: number
): MatchResult {
  const options = currentStep.options ?? [];
  const needle = trimmed.toLowerCase();
  // Match against the label (WhatsApp button tap, GoWA typed text) OR
  // the option id (Telegram callback_query.data). This keeps all three
  // providers consistent without each webhook having to normalise.
  const matched = options.find(
    (opt) =>
      opt.label.toLowerCase() === needle || opt.id.toLowerCase() === needle
  );

  if (matched) {
    return {
      answerValue: matched.id,
      answerLabel: matched.label,
      scoreAdded: matched.score ?? 0,
    };
  }

  const mode = currentStep.unmatchedInputMode ?? definition.unmatchedInputMode;

  if (mode === "error") {
    log.info("Unmatched input in error mode, re-rendering step", {
      stepId: currentStep.id,
      input: trimmed,
    });
    const rerender = renderStep(currentStep, variables);
    return {
      answerValue: trimmed,
      scoreAdded: 0,
      earlyReturn: {
        responses: [{ type: "text", text: definition.errorMessage }, rerender],
        session: {
          currentStepId: currentStep.id,
          variables,
          score,
          state: "active",
        },
      },
    };
  }

  if (mode === "as_other") {
    return {
      answerValue:
        currentStep.unmatchedInputValue ??
        definition.unmatchedInputValue ??
        "other",
      answerLabel: trimmed,
      scoreAdded: 0,
    };
  }

  // "accept" mode
  return { answerValue: trimmed, answerLabel: trimmed, scoreAdded: 0 };
}

function matchFreeTextInput(
  definition: DialogDefinition,
  currentStep: DialogStep,
  trimmed: string,
  variables: Record<string, string>,
  score: number
): MatchResult {
  if (currentStep.validation) {
    const valid = validateAnswer(trimmed, currentStep.validation);
    if (!valid) {
      log.info("Validation failed, re-rendering step", {
        stepId: currentStep.id,
        validation: currentStep.validation,
      });
      const validationMsg =
        currentStep.validationMessage ?? definition.errorMessage;
      const rerender = renderStep(currentStep, variables);
      return {
        answerValue: trimmed,
        scoreAdded: 0,
        earlyReturn: {
          responses: [{ type: "text", text: validationMsg }, rerender],
          session: {
            currentStepId: currentStep.id,
            variables,
            score,
            state: "active",
          },
        },
      };
    }
  }
  return { answerValue: trimmed, scoreAdded: 0 };
}

// --- Answer processing ---

export function processAnswer(
  definition: DialogDefinition,
  currentStep: DialogStep,
  text: string,
  variables: Record<string, string>,
  score: number
): DialogEngineResult {
  const trimmed = text.trim();
  const updatedVariables = { ...variables };

  let match: MatchResult;

  if (currentStep.type === "buttons" || currentStep.type === "list") {
    match = matchChoiceInput(
      definition,
      currentStep,
      trimmed,
      updatedVariables,
      score
    );
  } else if (currentStep.type === "free_text") {
    match = matchFreeTextInput(
      definition,
      currentStep,
      trimmed,
      updatedVariables,
      score
    );
  } else {
    // text, qr, video — output-only steps, any input advances
    match = { answerValue: trimmed, scoreAdded: 0 };
  }

  if (match.earlyReturn) {
    return match.earlyReturn;
  }

  const { answerValue, answerLabel, scoreAdded } = match;

  // Store answer in variables. For choice steps, answerValue is the
  // option id (stable identifier for conditions) and answerLabel is the
  // human-readable label — exposed as `<name>_label` so that message
  // templates can render it naturally, e.g. `{{wettbewerber_label}}`.
  if (currentStep.variableName) {
    updatedVariables[currentStep.variableName] = answerValue;
    if (answerLabel) {
      updatedVariables[`${currentStep.variableName}_label`] = answerLabel;
    }
  }

  const newScore = score + scoreAdded;

  // Store score in variables for condition evaluation
  updatedVariables._score = String(newScore);

  // Evaluate transitions
  const nextStepId = evaluateTransitions(
    currentStep.transitions,
    updatedVariables
  );

  if (!nextStepId) {
    log.info("No transition matched, dialog completed", {
      stepId: currentStep.id,
    });
    return {
      responses: [],
      session: {
        currentStepId: currentStep.id,
        variables: updatedVariables,
        score: newScore,
        state: "completed",
      },
      answer: {
        stepId: currentStep.id,
        answerValue,
        answerLabel,
        scoreAdded,
      },
    };
  }

  const actualNextStep = findStep(definition, nextStepId);

  if (!actualNextStep) {
    log.warn("Next step not found, dialog completed", {
      currentStepId: currentStep.id,
      targetStepId: nextStepId,
    });
    return {
      responses: [],
      session: {
        currentStepId: currentStep.id,
        variables: updatedVariables,
        score: newScore,
        state: "completed",
      },
      answer: {
        stepId: currentStep.id,
        answerValue,
        answerLabel,
        scoreAdded,
      },
    };
  }

  const response = renderStep(actualNextStep, updatedVariables);

  log.info("Advancing to next step", {
    from: currentStep.id,
    to: actualNextStep.id,
  });

  return {
    responses: [response],
    session: {
      currentStepId: actualNextStep.id,
      variables: updatedVariables,
      score: newScore,
      state: "active",
    },
    answer: {
      stepId: currentStep.id,
      answerValue,
      answerLabel,
      scoreAdded,
    },
  };
}

// --- Transition evaluation ---

export function evaluateTransitions(
  transitions: DialogTransition[],
  variables: Record<string, string>
): string | undefined {
  for (const transition of transitions) {
    if (!transition.conditions || transition.conditions.length === 0) {
      return transition.targetStepId;
    }

    const allMatch = transition.conditions.every((condition) =>
      evaluateCondition(condition, variables)
    );

    if (allMatch) {
      return transition.targetStepId;
    }
  }

  return undefined;
}

// --- Condition evaluation ---

export function evaluateCondition(
  condition: DialogCondition,
  variables: Record<string, string>
): boolean {
  const fieldValue = variables[condition.field];
  const { operator, value } = condition;

  switch (operator) {
    case "eq":
      return fieldValue === String(value);
    case "neq":
      return fieldValue !== String(value);
    case "in":
      return Array.isArray(value) && value.includes(fieldValue);
    case "contains":
      return String(fieldValue ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase());
    case "gt":
      return Number(fieldValue) > Number(value);
    case "lt":
      return Number(fieldValue) < Number(value);
    default:
      return false;
  }
}

// --- Step rendering ---

export function renderStep(
  step: DialogStep,
  variables: Record<string, string>
): DialogResponse {
  const text = renderTemplate(step.message, variables);
  const header = step.header
    ? renderTemplate(step.header, variables)
    : undefined;
  const footer = step.footer
    ? renderTemplate(step.footer, variables)
    : undefined;

  switch (step.type) {
    case "text": {
      return { type: "text", text, header, footer };
    }

    case "buttons": {
      const buttons: ButtonOption[] = (step.options ?? []).map((opt) => ({
        id: opt.id,
        title: opt.label,
      }));
      return { type: "buttons", text, header, footer, buttons };
    }

    case "list": {
      const options = step.options ?? [];
      let sections: ListSection[];

      if (step.listSections && step.listSections.length > 0) {
        sections = step.listSections.map((section) => {
          const rows: ListSection["rows"] = [];
          for (const optId of section.optionIds) {
            const opt = options.find((o) => o.id === optId);
            if (opt) {
              rows.push({
                id: opt.id,
                title: opt.label,
                description: opt.description,
              });
            }
          }
          return { title: section.title, rows };
        });
      } else {
        sections = [
          {
            title: header ?? "Optionen",
            rows: options.map((opt) => ({
              id: opt.id,
              title: opt.label,
              description: opt.description,
            })),
          },
        ];
      }

      return {
        type: "list",
        text,
        header,
        footer,
        list: {
          title: header ?? "",
          body: text,
          buttonText: step.listButtonText ?? "Auswählen",
          footer,
          sections,
        },
      };
    }

    case "free_text": {
      return { type: "text", text, header, footer };
    }

    case "qr": {
      const qrMode = step.qrMode ?? "template";
      const qrContent =
        qrMode === "template" && step.qrTemplate
          ? renderTemplate(step.qrTemplate, variables)
          : "";
      const qrCaption = step.qrCaption
        ? renderTemplate(step.qrCaption, variables)
        : "";
      return {
        type: "qr",
        text,
        header,
        footer,
        qr: { content: qrContent, caption: qrCaption, mode: qrMode },
      };
    }

    case "video": {
      const videoUrl = step.videoUrl
        ? renderTemplate(step.videoUrl, variables)
        : undefined;
      return { type: "video", text, header, footer, videoUrl };
    }

    default: {
      return { type: "text", text, header, footer };
    }
  }
}

// --- Step lookup ---

export function findStep(
  definition: DialogDefinition,
  stepId: string
): DialogStep | undefined {
  return definition.steps.find((s) => s.id === stepId);
}
