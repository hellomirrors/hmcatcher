import { z } from "zod/v4";

// --- Condition for branching ---

export const dialogConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "in", "contains", "gt", "lt"]),
  value: z.union([z.string(), z.array(z.string()), z.number()]),
});

export type DialogCondition = z.infer<typeof dialogConditionSchema>;

// --- Transition ---

export const dialogTransitionSchema = z.object({
  conditions: z.array(dialogConditionSchema).optional(),
  targetStepId: z.string().min(1),
});

export type DialogTransition = z.infer<typeof dialogTransitionSchema>;

// --- Answer option (for buttons/list) ---

export const dialogAnswerOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  score: z.number().optional(),
});

export type DialogAnswerOption = z.infer<typeof dialogAnswerOptionSchema>;

// --- List section ---

export const dialogListSectionSchema = z.object({
  title: z.string().min(1),
  optionIds: z.array(z.string()),
});

export type DialogListSection = z.infer<typeof dialogListSectionSchema>;

// --- Validation type ---

export const dialogValidationSchema = z.enum([
  "email",
  "phone",
  "plz",
  "nonempty",
  "number",
]);

export type DialogValidationType = z.infer<typeof dialogValidationSchema>;

// --- Unmatched input mode ---

export const unmatchedInputModeSchema = z.enum(["error", "as_other", "accept"]);

export type UnmatchedInputMode = z.infer<typeof unmatchedInputModeSchema>;

// --- Step type ---

export const dialogStepTypeSchema = z.enum([
  "text",
  "buttons",
  "list",
  "free_text",
  "qr",
  "video",
  "mqtt",
  "document",
  "timer",
]);

export const messagingProviderSchema = z.enum(["whatsapp", "gowa", "telegram"]);
export type MessagingProviderName = z.infer<typeof messagingProviderSchema>;

export const mqttMatchModeSchema = z.enum(["text", "json", "session"]);
export type MqttMatchMode = z.infer<typeof mqttMatchModeSchema>;

export type DialogStepType = z.infer<typeof dialogStepTypeSchema>;

// --- Single step ---

export const dialogStepSchema = z
  .object({
    id: z.string().min(1),
    type: dialogStepTypeSchema,
    phase: z.string().optional(),
    message: z.string().min(1),
    header: z.string().optional(),
    footer: z.string().optional(),
    options: z.array(dialogAnswerOptionSchema).optional(),
    listButtonText: z.string().optional(),
    listSections: z.array(dialogListSectionSchema).optional(),
    variableName: z.string().optional(),
    validation: dialogValidationSchema.optional(),
    validationMessage: z.string().optional(),
    unmatchedInputMode: unmatchedInputModeSchema.optional(),
    unmatchedInputValue: z.string().optional(),
    qrMode: z.enum(["template", "session-data", "messe"]).optional(),
    qrTemplate: z.string().optional(),
    qrCaption: z.string().optional(),
    videoUrl: z.string().optional(),
    mqttTopic: z.string().optional(),
    mqttMatchMode: mqttMatchModeSchema.optional(),
    mqttMatchString: z.string().optional(),
    mqttJsonKey: z.string().optional(),
    mqttSessionIdKey: z.string().optional(),
    documentPath: z.string().optional(),
    documentFilename: z.string().optional(),
    documentMimeType: z.string().optional(),
    /** Delay in seconds applied before the next response is sent (timer step). */
    delaySeconds: z.number().positive().optional(),
    forceProvider: messagingProviderSchema.optional(),
    transitions: z.array(dialogTransitionSchema),
  })
  .refine(
    (step) => step.type !== "buttons" || (step.options?.length ?? 0) <= 3,
    {
      message:
        "Buttons-Schritte dürfen maximal 3 Optionen haben. Für mehr nutze Liste.",
      path: ["options"],
    }
  );

export type DialogStep = z.infer<typeof dialogStepSchema>;

// --- Score bucket ---

export const scoreBucketSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  minScore: z.number(),
});

export type ScoreBucket = z.infer<typeof scoreBucketSchema>;

// --- Top-level definition ---

export const dialogDefinitionSchema = z.object({
  version: z.number().default(1),
  triggerKeywords: z.array(z.string()).default(["start"]),
  timeoutMinutes: z.number().default(60),
  reminderAfterMinutes: z.number().optional(),
  reminderMessage: z.string().optional(),
  timeoutMessage: z.string().optional(),
  unmatchedInputMode: unmatchedInputModeSchema.default("error"),
  unmatchedInputValue: z.string().optional(),
  errorMessage: z
    .string()
    .default("Bitte wähle eine der angebotenen Optionen."),
  steps: z.array(dialogStepSchema),
  scoreBuckets: z.array(scoreBucketSchema).optional(),
  leadConsentTrigger: z
    .object({
      variable: z.string().min(1),
      value: z.string().min(1),
    })
    .optional(),
});

export type DialogDefinition = z.infer<typeof dialogDefinitionSchema>;
