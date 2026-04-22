import type {
  DialogAnswerOption,
  DialogListSection,
  DialogStep,
  DialogTransition,
  DialogValidationType,
  ScoreBucket,
} from "@/domain/dialog/dialog-schema";

export interface FormStepData {
  header?: string;
  id: string;
  listSections?: DialogListSection[];
  message: string;
  options?: DialogAnswerOption[];
  transitions: DialogTransition[];
  type: DialogStep["type"];
  unmatchedInputMode?: "accept" | "as_other" | "error";
  unmatchedInputValue?: string;
  validation?: DialogValidationType;
  validationMessage?: string;
  variableName?: string;
}

export interface SlotFormDefinition {
  entryStepId: string;
  errorMessage: string;
  scoreBuckets?: ScoreBucket[];
  steps: FormStepData[];
  termsUrl?: string;
}
