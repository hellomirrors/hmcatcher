"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DialogAnswerOption } from "@/domain/dialog/dialog-schema";
import { type SlotFormResult, submitSlotmachineAction } from "./action";
import { evaluateTransitions } from "./transitions";
import type { FormStepData, SlotFormDefinition } from "./types";
import {
  isValidGermanMobile,
  normalizeGermanMobile,
  runValidation,
} from "./validation-helpers";

interface AnswerEntry {
  label?: string;
  score: number;
  value: string;
}

interface SlotFormProps {
  definition: SlotFormDefinition;
}

const SESSION_STORAGE_KEY = "hm-slotmachine-session-id";

function stepTitle(message: string): string {
  return message.split("\n")[0] ?? message;
}

function stepBody(message: string): string | undefined {
  const parts = message.split("\n");
  if (parts.length <= 1) {
    return;
  }
  return parts.slice(1).join("\n").trim() || undefined;
}

function optionById(
  options: DialogAnswerOption[] | undefined,
  id: string
): DialogAnswerOption | undefined {
  return options?.find((o) => o.id === id);
}

function buildStepMap(steps: FormStepData[]): Map<string, FormStepData> {
  const m = new Map<string, FormStepData>();
  for (const step of steps) {
    m.set(step.id, step);
  }
  return m;
}

interface ChainResult {
  chain: string[];
  reachedEnd: boolean;
}

function computeChain(
  definition: SlotFormDefinition,
  answers: Record<string, AnswerEntry>
): ChainResult {
  const steps = buildStepMap(definition.steps);
  const chain: string[] = [];
  const variables: Record<string, string> = {};
  let totalScore = 0;
  let currentId: string | undefined = definition.entryStepId;
  let safety = 0;

  while (currentId && safety < 40) {
    safety += 1;
    const step = steps.get(currentId);
    if (!step) {
      return { chain, reachedEnd: false };
    }
    if (step.type === "qr" || step.type === "mqtt") {
      return { chain, reachedEnd: true };
    }
    if (
      step.type === "text" ||
      step.type === "video" ||
      step.type === "document"
    ) {
      currentId = evaluateTransitions(step.transitions, {
        ...variables,
        _score: String(totalScore),
      });
      continue;
    }

    chain.push(step.id);

    const answer = answers[step.id];
    if (!answer) {
      return { chain, reachedEnd: false };
    }
    if (!runValidation(answer.value, step.validation)) {
      return { chain, reachedEnd: false };
    }

    if (step.variableName) {
      variables[step.variableName] = answer.value;
      if (answer.label) {
        variables[`${step.variableName}_label`] = answer.label;
      }
    }
    totalScore += answer.score;
    variables._score = String(totalScore);

    currentId = evaluateTransitions(step.transitions, variables);
  }

  return { chain, reachedEnd: !currentId };
}

/**
 * Commits one answer. Anything after this step in the previously-rendered
 * chain is dropped, because a different answer may change the branch.
 */
function commitAnswerReducer(
  definition: SlotFormDefinition,
  prev: Record<string, AnswerEntry>,
  stepId: string,
  entry: AnswerEntry
): Record<string, AnswerEntry> {
  const { chain } = computeChain(definition, prev);
  const idx = chain.indexOf(stepId);
  const kept = idx === -1 ? chain : chain.slice(0, idx);
  const next: Record<string, AnswerEntry> = {};
  for (const id of kept) {
    const existing = prev[id];
    if (existing) {
      next[id] = existing;
    }
  }
  next[stepId] = entry;
  return next;
}

export function SlotForm({ definition }: SlotFormProps) {
  const [sessionId, setSessionId] = useState("");
  const [mobile, setMobile] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      return;
    }
    const fresh = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    setSessionId(fresh);
  }, []);

  const { chain, reachedEnd } = useMemo(
    () => computeChain(definition, answers),
    [answers, definition]
  );
  const stepMap = useMemo(() => buildStepMap(definition.steps), [definition]);

  const commitAnswer = (stepId: string, entry: AnswerEntry) => {
    setAnswers((prev) => commitAnswerReducer(definition, prev, stepId, entry));
  };

  const mobileValid = isValidGermanMobile(mobile);
  const canSubmit =
    reachedEnd && mobileValid && !submitting && sessionId !== "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const answerList = chain.map((stepId) => {
      const entry = answers[stepId];
      return {
        stepId,
        value: entry.value,
        label: entry.label,
        scoreAdded: entry.score,
      };
    });
    try {
      const result: SlotFormResult = await submitSlotmachineAction({
        sessionId,
        mobile: normalizeGermanMobile(mobile),
        consent: true,
        answers: answerList,
      });
      if (result.success) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setDone(true);
      } else {
        setSubmitError(result.error ?? "Unbekannter Fehler beim Senden.");
      }
    } catch (error) {
      setSubmitError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Fertig!</CardTitle>
          <CardDescription>
            Dein persönlicher QR-Code wurde dir per WhatsApp geschickt. Halte
            ihn am Stand an den Scanner — das Glücksrad dreht sich gleich auf
            dem großen Screen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form className="w-full max-w-lg" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Felix Jackpot</CardTitle>
          <CardDescription>
            Fülle das Formular aus — du bekommst deinen QR-Code per WhatsApp
            zugeschickt.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {chain.map((stepId) => {
            const step = stepMap.get(stepId);
            if (!step) {
              return null;
            }
            return (
              <StepField
                answer={answers[stepId]}
                commitAnswer={commitAnswer}
                key={stepId}
                step={step}
              />
            );
          })}

          {reachedEnd && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="slot-mobile">
                  Deine Mobilnummer (WhatsApp)
                </Label>
                <Input
                  aria-invalid={mobile !== "" && !mobileValid}
                  id="slot-mobile"
                  inputMode="tel"
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+491701234567"
                  type="tel"
                  value={mobile}
                />
                {mobile !== "" && !mobileValid && (
                  <p className="text-destructive text-xs">
                    Bitte eine deutsche Mobilnummer mit +49 eingeben.
                  </p>
                )}
              </div>

              {submitError && (
                <p className="rounded-md bg-destructive/10 p-2 text-destructive text-sm">
                  {submitError}
                </p>
              )}

              <p className="text-center text-muted-foreground text-xs">
                Mit dem Anfordern des QR-Codes stimmst du den{" "}
                <a
                  className="underline"
                  href={definition.termsUrl ?? "https://hellomirrors.com"}
                  rel="noopener"
                  target="_blank"
                >
                  Teilnahmebedingungen &amp; Datenschutzhinweisen
                </a>{" "}
                zu.
              </p>

              <Button
                className="w-full"
                disabled={!canSubmit}
                size="lg"
                type="submit"
              >
                {submitting ? "Wird gesendet…" : "Code senden"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </form>
  );
}

interface StepFieldProps {
  answer: AnswerEntry | undefined;
  commitAnswer: (stepId: string, entry: AnswerEntry) => void;
  step: FormStepData;
}

function StepField({ step, answer, commitAnswer }: StepFieldProps) {
  if (step.type === "free_text") {
    return (
      <FreeTextField answer={answer} commitAnswer={commitAnswer} step={step} />
    );
  }
  if (step.type === "buttons" && step.variableName === "alreadyCustomer") {
    return (
      <RadioField answer={answer} commitAnswer={commitAnswer} step={step} />
    );
  }
  if (step.type === "buttons" || step.type === "list") {
    return (
      <SelectField answer={answer} commitAnswer={commitAnswer} step={step} />
    );
  }
  return null;
}

function FreeTextField({ step, answer, commitAnswer }: StepFieldProps) {
  const [draft, setDraft] = useState(answer?.value ?? "");
  useEffect(() => {
    setDraft(answer?.value ?? "");
  }, [answer?.value]);

  const inputId = `slot-step-${step.id}`;
  const trimmed = draft.trim();
  const valid = runValidation(trimmed, step.validation);
  const showInvalid = draft !== "" && !valid;
  const dirty = trimmed !== (answer?.value ?? "");
  const showConfirm = !answer || dirty;

  const commit = () => {
    if (!valid) {
      return;
    }
    commitAnswer(step.id, { value: trimmed, score: 0 });
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{stepTitle(step.message)}</Label>
      {stepBody(step.message) && (
        <p className="text-muted-foreground text-xs">
          {stepBody(step.message)}
        </p>
      )}
      <Input
        aria-invalid={showInvalid}
        id={inputId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        value={draft}
      />
      {showInvalid && (
        <p className="text-destructive text-xs">
          {step.validationMessage ?? "Ungültige Eingabe."}
        </p>
      )}
      {showConfirm && (
        <div className="flex justify-end">
          <Button
            disabled={!valid}
            onClick={commit}
            size="sm"
            type="button"
            variant={answer ? "outline" : "default"}
          >
            {answer ? "Übernehmen" : "Weiter"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectField({ step, answer, commitAnswer }: StepFieldProps) {
  const options = step.options ?? [];
  const [draft, setDraft] = useState(answer?.value ?? "");
  useEffect(() => {
    setDraft(answer?.value ?? "");
  }, [answer?.value]);

  const inputId = `slot-step-${step.id}`;
  const dirty = draft !== (answer?.value ?? "");
  const showConfirm = !answer || dirty;
  const selectable = draft !== "";

  const commit = () => {
    if (!selectable) {
      return;
    }
    const opt = optionById(options, draft);
    if (!opt) {
      return;
    }
    commitAnswer(step.id, {
      value: opt.id,
      label: opt.label,
      score: opt.score ?? 0,
    });
  };

  const groupedSections = step.listSections;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{stepTitle(step.message)}</Label>
      {stepBody(step.message) && (
        <p className="text-muted-foreground text-xs">
          {stepBody(step.message)}
        </p>
      )}
      <Select onValueChange={(v) => setDraft(v ?? "")} value={draft}>
        <SelectTrigger id={inputId}>
          <SelectValue placeholder="Bitte auswählen…" />
        </SelectTrigger>
        <SelectContent>
          {groupedSections && groupedSections.length > 0
            ? groupedSections.map((section) => (
                <SelectGroup key={section.title}>
                  <SelectLabel>{section.title}</SelectLabel>
                  {section.optionIds.map((oid) => {
                    const opt = optionById(options, oid);
                    if (!opt) {
                      return null;
                    }
                    return (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              ))
            : options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
      {showConfirm && (
        <div className="flex justify-end">
          <Button
            disabled={!selectable}
            onClick={commit}
            size="sm"
            type="button"
            variant={answer ? "outline" : "default"}
          >
            {answer ? "Übernehmen" : "Weiter"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RadioField({ step, answer, commitAnswer }: StepFieldProps) {
  const options = step.options ?? [];
  const defaultValue = answer?.value ?? options[0]?.id ?? "";
  const [draft, setDraft] = useState(defaultValue);
  useEffect(() => {
    setDraft(answer?.value ?? options[0]?.id ?? "");
  }, [answer?.value, options]);

  const inputId = `slot-step-${step.id}`;
  const dirty = draft !== (answer?.value ?? "");
  // Radio always has a default selected, so the "Weiter" button stays
  // visible even if the user doesn't change anything — per user request.
  const showConfirm = !answer || dirty;

  const commit = () => {
    const opt = optionById(options, draft);
    if (!opt) {
      return;
    }
    commitAnswer(step.id, {
      value: opt.id,
      label: opt.label,
      score: opt.score ?? 0,
    });
  };

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={inputId}>{stepTitle(step.message)}</Label>
      {stepBody(step.message) && (
        <p className="text-muted-foreground text-xs">
          {stepBody(step.message)}
        </p>
      )}
      <RadioGroup onValueChange={(v) => setDraft(v ?? "")} value={draft}>
        {options.map((opt) => {
          const optionId = `${inputId}-${opt.id}`;
          return (
            <Label
              className="flex cursor-pointer items-center gap-2 text-sm"
              htmlFor={optionId}
              key={opt.id}
            >
              <RadioGroupItem id={optionId} value={opt.id} />
              <span>{opt.label}</span>
            </Label>
          );
        })}
      </RadioGroup>
      {showConfirm && (
        <div className="flex justify-end">
          <Button
            onClick={commit}
            size="sm"
            type="button"
            variant={answer ? "outline" : "default"}
          >
            {answer ? "Übernehmen" : "Weiter"}
          </Button>
        </div>
      )}
    </div>
  );
}
