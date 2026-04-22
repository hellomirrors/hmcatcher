import { getActiveDialog } from "@/domain/dialog/dialog-repository";
import type {
  DialogDefinition,
  DialogStep,
} from "@/domain/dialog/dialog-schema";
import { SlotForm } from "./slot-form";
import type { FormStepData, SlotFormDefinition } from "./types";

export const dynamic = "force-dynamic";

const TERMS_URL = "https://hellomirrors.com/essen";

function toFormStep(step: DialogStep): FormStepData {
  return {
    id: step.id,
    type: step.type,
    message: step.message,
    header: step.header,
    options: step.options,
    listSections: step.listSections,
    variableName: step.variableName,
    validation: step.validation,
    validationMessage: step.validationMessage,
    transitions: step.transitions,
    unmatchedInputMode: step.unmatchedInputMode,
    unmatchedInputValue: step.unmatchedInputValue,
  };
}

function findEntryStepId(definition: DialogDefinition): string | undefined {
  const welcome = definition.steps.find((s) => s.id === "welcome");
  if (welcome) {
    // Take the first condition-less transition — the engine's "happy path"
    // after accepting the welcome prompt.
    for (const t of welcome.transitions) {
      if (!t.conditions || t.conditions.length === 0) {
        return t.targetStepId;
      }
    }
  }
  const firstInput = definition.steps.find((s) =>
    ["buttons", "free_text", "list"].includes(s.type)
  );
  return firstInput?.id;
}

export default function SlotmachinePage() {
  const dialog = getActiveDialog();
  if (!dialog) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">
          Kein aktiver Dialog konfiguriert. Bitte im Admin einen Dialog
          aktivieren.
        </p>
      </div>
    );
  }

  const entryStepId = findEntryStepId(dialog.definition);
  if (!entryStepId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">
          Der aktive Dialog enthält keinen passenden Einstiegsschritt.
        </p>
      </div>
    );
  }

  const definition: SlotFormDefinition = {
    entryStepId,
    errorMessage: dialog.definition.errorMessage,
    scoreBuckets: dialog.definition.scoreBuckets,
    steps: dialog.definition.steps.map(toFormStep),
    termsUrl: TERMS_URL,
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <SlotForm definition={definition} />
    </div>
  );
}
