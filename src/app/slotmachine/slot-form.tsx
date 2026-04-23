"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScoreBucket } from "@/domain/dialog/dialog-schema";
import { type SlotFormResult, submitSlotmachineAction } from "./action";
import {
  type AnswerState,
  computeTotalScore,
  computeVariables,
  computeVisibleSteps,
  type SlotFormOption,
  type StaticFormStep,
} from "./form-steps";
import {
  isValidGermanMobile,
  normalizeGermanMobile,
  runValidation,
} from "./validation-helpers";

interface SlotFormProps {
  scoreBuckets: ScoreBucket[];
  termsUrl: string;
}

const SESSION_STORAGE_KEY = "hm-slotmachine-session-id";
const SUBMITTED_STORAGE_KEY = "hm-slotmachine-submitted-at";

export function SlotForm({ scoreBuckets, termsUrl }: SlotFormProps) {
  const [sessionId, setSessionId] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const lastTapRef = useRef(0);

  const handleResetTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 600) {
      lastTapRef.current = 0;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(SUBMITTED_STORAGE_KEY);
        window.location.reload();
      }
      return;
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.localStorage.getItem(SUBMITTED_STORAGE_KEY)) {
      setAlreadySubmitted(true);
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

  const { steps: visibleSteps, complete: formComplete } = useMemo(
    () => computeVisibleSteps(answers),
    [answers]
  );

  const commitAnswer = (stepId: string, entry: AnswerState) => {
    setAnswers((prev) => {
      // Rebuilding from the committed answers, truncating anything past the
      // edited step so the branch can recompute when the user backtracks.
      const visibleIds = computeVisibleSteps(prev).steps.map((s) => s.id);
      const idx = visibleIds.indexOf(stepId);
      const keep = idx === -1 ? visibleIds : visibleIds.slice(0, idx);
      const next: Record<string, AnswerState> = {};
      for (const id of keep) {
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
    formComplete && mobileValid && !submitting && sessionId !== "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result: SlotFormResult = await submitSlotmachineAction({
        sessionId,
        mobile: normalizeGermanMobile(mobile),
        consent: true,
        variables: computeVariables(answers),
        score: computeTotalScore(answers),
      });
      if (result.success) {
        window.localStorage.setItem(
          SUBMITTED_STORAGE_KEY,
          new Date().toISOString()
        );
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        setAlreadySubmitted(true);
      } else {
        setSubmitError(result.error ?? "Unbekannter Fehler beim Senden.");
      }
    } catch (error) {
      setSubmitError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetHotspot = (
    <button
      aria-label="Session zurücksetzen (zweimal tippen)"
      className="fixed top-0 right-0 z-50 h-14 w-14 cursor-default bg-transparent"
      onClick={handleResetTap}
      type="button"
    />
  );

  if (alreadySubmitted) {
    return (
      <>
        {resetHotspot}
        <p className="px-6 text-center text-lg text-muted-foreground">
          Du hast das Formular bereits abgesendet. Danke für deine Teilnahme!
        </p>
      </>
    );
  }

  return (
    <form className="w-full max-w-lg" onSubmit={handleSubmit}>
      {resetHotspot}
      <Card>
        <CardHeader>
          <CardTitle>Felix Jackpot</CardTitle>
          <CardDescription>
            Fülle das Formular aus — du bekommst deinen QR-Code per WhatsApp
            zugeschickt.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {visibleSteps.map((step) => (
            <StepField
              answer={answers[step.id]}
              commitAnswer={commitAnswer}
              key={step.id}
              step={step}
            />
          ))}

          {formComplete && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="slot-mobile">Mobilnummer (WhatsApp)</Label>
                <Input
                  aria-invalid={mobile !== "" && !mobileValid}
                  autoComplete="tel"
                  id="slot-mobile"
                  inputMode="tel"
                  onChange={(e) => setMobile(e.target.value)}
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
                  href={termsUrl}
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

          {formComplete
            ? null
            : scoreBuckets.length > 0 && (
                <p className="text-center text-muted-foreground text-xs">
                  {/* tiny hint keeps the card from looking empty while the user
                      is still filling out the visible step — intentionally
                      shows nothing numeric, no score leaks */}
                  Bitte Schritt für Schritt ausfüllen.
                </p>
              )}
        </CardContent>
      </Card>
    </form>
  );
}

interface StepFieldProps {
  answer: AnswerState | undefined;
  commitAnswer: (stepId: string, entry: AnswerState) => void;
  step: StaticFormStep;
}

function StepField({ step, answer, commitAnswer }: StepFieldProps) {
  if (step.kind === "free_text") {
    return (
      <FreeTextField answer={answer} commitAnswer={commitAnswer} step={step} />
    );
  }
  if (step.kind === "radio") {
    return (
      <RadioField answer={answer} commitAnswer={commitAnswer} step={step} />
    );
  }
  return (
    <SelectField answer={answer} commitAnswer={commitAnswer} step={step} />
  );
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
      <Label htmlFor={inputId}>{step.label}</Label>
      {step.message && (
        <p className="text-muted-foreground text-xs">{step.message}</p>
      )}
      <Input
        aria-invalid={showInvalid}
        autoComplete={step.autoComplete}
        id={inputId}
        inputMode={step.inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        type={step.inputMode === "email" ? "email" : "text"}
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

function optionById(
  options: SlotFormOption[] | undefined,
  id: string
): SlotFormOption | undefined {
  return options?.find((o) => o.id === id);
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

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{step.label}</Label>
      {step.message && (
        <p className="text-muted-foreground text-xs">{step.message}</p>
      )}
      <Select onValueChange={(v) => setDraft(v ?? "")} value={draft}>
        <SelectTrigger id={inputId}>
          <SelectValue placeholder="Bitte auswählen…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
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
      <Label htmlFor={inputId}>{step.label}</Label>
      {step.message && (
        <p className="text-muted-foreground text-xs">{step.message}</p>
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
