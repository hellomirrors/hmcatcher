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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

function renderFreeTextInvalid(
  step: FormStepData,
  value: string | undefined
): string | null {
  if (value === undefined || value === "") {
    return null;
  }
  if (runValidation(value, step.validation)) {
    return null;
  }
  return step.validationMessage ?? "Ungültige Eingabe.";
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
  totalScore: number;
  variables: Record<string, string>;
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
      return { chain, reachedEnd: false, variables, totalScore };
    }
    if (step.type === "qr" || step.type === "mqtt") {
      return { chain, reachedEnd: true, variables, totalScore };
    }
    if (
      step.type === "text" ||
      step.type === "video" ||
      step.type === "document"
    ) {
      const target = evaluateTransitions(step.transitions, {
        ...variables,
        _score: String(totalScore),
      });
      currentId = target;
      continue;
    }

    chain.push(step.id);

    const answer = answers[step.id];
    if (!answer) {
      return { chain, reachedEnd: false, variables, totalScore };
    }
    if (!runValidation(answer.value, step.validation)) {
      return { chain, reachedEnd: false, variables, totalScore };
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

  return { chain, reachedEnd: !currentId, variables, totalScore };
}

export function SlotForm({ definition }: SlotFormProps) {
  const [sessionId, setSessionId] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
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

  const { chain, reachedEnd, variables, totalScore } = useMemo(
    () => computeChain(definition, answers),
    [answers, definition]
  );

  const stepMap = useMemo(() => buildStepMap(definition.steps), [definition]);

  const commitAnswer = (stepId: string, entry: AnswerEntry) => {
    setAnswers((prev) => {
      const next: Record<string, AnswerEntry> = {};
      const chainBefore = computeChain(definition, prev).chain;
      const idx = chainBefore.indexOf(stepId);
      // Drop anything after this step — the branch may change.
      const kept = idx === -1 ? chainBefore : chainBefore.slice(0, idx);
      for (const id of kept) {
        const existing = prev[id];
        if (existing) {
          next[id] = existing;
        }
      }
      next[stepId] = entry;
      return next;
    });
  };

  const mobileValid = isValidGermanMobile(mobile);
  const canSubmit =
    reachedEnd && mobileValid && consent && !submitting && sessionId !== "";

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
        consent,
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

              <Label
                className="flex cursor-pointer items-start gap-3"
                htmlFor="slot-consent"
              >
                <Checkbox
                  checked={consent}
                  id="slot-consent"
                  onCheckedChange={(checked) => setConsent(checked === true)}
                />
                <span className="text-sm">
                  Ich akzeptiere die{" "}
                  <a
                    className="underline"
                    href={definition.termsUrl ?? "https://hellomirrors.com"}
                    rel="noopener"
                    target="_blank"
                  >
                    Teilnahmebedingungen & Datenschutzhinweise
                  </a>
                  .
                </span>
              </Label>
            </>
          )}

          {submitError && (
            <p className="rounded-md bg-destructive/10 p-2 text-destructive text-sm">
              {submitError}
            </p>
          )}

          <Button
            className="w-full"
            disabled={!canSubmit}
            size="lg"
            type="submit"
          >
            {submitting ? "Wird gesendet…" : "QR-Code an WhatsApp senden"}
          </Button>

          <p className="text-center text-muted-foreground text-xs">
            Punkte: {totalScore}
            {definition.scoreBuckets && variables._score
              ? ` / Bucket: ${bucketFromScore(totalScore, definition.scoreBuckets)}`
              : ""}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

function bucketFromScore(
  score: number,
  buckets: NonNullable<SlotFormDefinition["scoreBuckets"]>
): string {
  const sorted = [...buckets].sort((a, b) => b.minScore - a.minScore);
  const match = sorted.find((b) => score >= b.minScore);
  return match?.label ?? "—";
}

interface StepFieldProps {
  answer: AnswerEntry | undefined;
  commitAnswer: (stepId: string, entry: AnswerEntry) => void;
  step: FormStepData;
}

function StepField({ step, answer, commitAnswer }: StepFieldProps) {
  if (step.type === "free_text") {
    return <FreeTextField {...{ step, answer, commitAnswer }} />;
  }
  if (step.type === "buttons" && step.variableName === "alreadyCustomer") {
    return <SwitchField {...{ step, answer, commitAnswer }} />;
  }
  if (step.type === "buttons" || step.type === "list") {
    return <SelectField {...{ step, answer, commitAnswer }} />;
  }
  return null;
}

function FreeTextField({ step, answer, commitAnswer }: StepFieldProps) {
  const [draft, setDraft] = useState(answer?.value ?? "");
  useEffect(() => {
    setDraft(answer?.value ?? "");
  }, [answer?.value]);
  const inputId = `slot-step-${step.id}`;
  const invalidMessage = renderFreeTextInvalid(step, draft);
  const isCommitted = answer?.value === draft && draft !== "";

  const commit = () => {
    const trimmed = draft.trim();
    if (!runValidation(trimmed, step.validation)) {
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
        aria-invalid={invalidMessage !== null}
        id={inputId}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        value={draft}
      />
      {invalidMessage && (
        <p className="text-destructive text-xs">{invalidMessage}</p>
      )}
      {isCommitted && !invalidMessage && (
        <p className="text-muted-foreground text-xs">Übernommen.</p>
      )}
    </div>
  );
}

function SelectField({ step, answer, commitAnswer }: StepFieldProps) {
  const inputId = `slot-step-${step.id}`;
  const options = step.options ?? [];

  const onChange = (value: string | null) => {
    if (!value) {
      return;
    }
    const opt = optionById(options, value);
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
      <Select onValueChange={onChange} value={answer?.value ?? ""}>
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
    </div>
  );
}

function SwitchField({ step, answer, commitAnswer }: StepFieldProps) {
  const options = step.options ?? [];
  // Convention: option index 0 = "on", index 1 = "off".
  const onOption = options[0];
  const offOption = options[1];
  if (!(onOption && offOption)) {
    return null;
  }
  const current = answer?.value;
  const checked = current === onOption.id;
  const inputId = `slot-step-${step.id}`;

  const onChange = (next: boolean) => {
    const opt = next ? onOption : offOption;
    commitAnswer(step.id, {
      value: opt.id,
      label: opt.label,
      score: opt.score ?? 0,
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="grid gap-0.5">
        <Label className="cursor-pointer" htmlFor={inputId}>
          {stepTitle(step.message)}
        </Label>
        <p className="text-muted-foreground text-xs">
          {checked ? onOption.label : offOption.label}
        </p>
      </div>
      <Switch
        checked={checked}
        id={inputId}
        onCheckedChange={(value) => onChange(value === true)}
      />
    </div>
  );
}
