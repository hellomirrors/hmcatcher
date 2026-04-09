"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  DialogDefinition,
  DialogStep,
} from "@/domain/dialog/dialog-schema";
import { saveDialogAction } from "./action";
import { StepForm } from "./step-form";
import { StepList } from "./step-list";
import { WhatsappPreview } from "./whatsapp-preview";

interface DialogEditorProps {
  dialog: {
    definition: DialogDefinition;
    id: number;
    name: string;
    slug: string;
  };
}

export const DialogEditor = ({ dialog }: DialogEditorProps) => {
  const [definition, setDefinition] = useState<DialogDefinition>(
    dialog.definition
  );
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const selectedStep =
    definition.steps.find((s) => s.id === selectedStepId) ?? null;

  const allStepIds = definition.steps.map((s) => s.id);
  const allVariableNames = definition.steps
    .map((s) => s.variableName)
    .filter((v): v is string => v !== undefined);

  const updateDefinition = (patch: Partial<DialogDefinition>) => {
    setDefinition((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setFeedback(null);
  };

  const handleAddStep = () => {
    const newStep: DialogStep = {
      id: `step_${Date.now()}`,
      type: "text",
      message: "",
      transitions: [],
    };
    updateDefinition({ steps: [...definition.steps, newStep] });
  };

  const handleDeleteStep = (stepId: string) => {
    updateDefinition({
      steps: definition.steps.filter((s) => s.id !== stepId),
    });
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
  };

  const handleMoveStep = (stepId: string, direction: "up" | "down") => {
    const index = definition.steps.findIndex((s) => s.id === stepId);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= definition.steps.length) {
      return;
    }

    const newSteps = [...definition.steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    updateDefinition({ steps: newSteps });
  };

  const handleStepChange = (updated: DialogStep) => {
    updateDefinition({
      steps: definition.steps.map((s) => (s.id === updated.id ? updated : s)),
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveDialogAction(
        dialog.id,
        JSON.stringify(definition)
      );
      if (result.success) {
        setDirty(false);
        setFeedback({ type: "success", message: "Gespeichert" });
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Fehler beim Speichern",
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dialogs">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-xl">{dialog.name}</h1>
          <Badge variant="outline">{dialog.slug}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {feedback && (
            <span
              className={
                feedback.type === "success"
                  ? "text-green-600 text-sm"
                  : "text-destructive text-sm"
              }
            >
              {feedback.message}
            </span>
          )}
          {dirty && (
            <Badge variant="secondary">Ungespeicherte Änderungen</Badge>
          )}
          <Button disabled={!dirty || isPending} onClick={handleSave}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left column */}
        <div className="flex w-1/2 flex-col gap-6">
          {/* General settings */}
          <Card>
            <CardHeader>
              <CardTitle>Allgemein</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-name">Name</Label>
                <Input id="dialog-name" readOnly value={dialog.name} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-keywords">
                  Trigger-Schlüsselwörter (kommagetrennt)
                </Label>
                <Input
                  id="dialog-keywords"
                  onChange={(e) =>
                    updateDefinition({
                      triggerKeywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  value={definition.triggerKeywords.join(", ")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="dialog-timeout">Timeout (Minuten)</Label>
                  <Input
                    id="dialog-timeout"
                    min={1}
                    onChange={(e) =>
                      updateDefinition({
                        timeoutMinutes: Number(e.target.value) || 60,
                      })
                    }
                    type="number"
                    value={definition.timeoutMinutes}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dialog-reminder">
                    Erinnerung nach (Minuten)
                  </Label>
                  <Input
                    id="dialog-reminder"
                    min={0}
                    onChange={(e) =>
                      updateDefinition({
                        reminderAfterMinutes: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    type="number"
                    value={definition.reminderAfterMinutes ?? ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step list */}
          <Card>
            <CardContent className="pt-6">
              <StepList
                onAddStep={handleAddStep}
                onDeleteStep={handleDeleteStep}
                onMoveStep={handleMoveStep}
                onSelectStep={setSelectedStepId}
                selectedStepId={selectedStepId}
                steps={definition.steps}
              />
            </CardContent>
          </Card>

          {/* Step form */}
          {selectedStep && (
            <StepForm
              allStepIds={allStepIds}
              allVariableNames={allVariableNames}
              onChange={handleStepChange}
              step={selectedStep}
            />
          )}
        </div>

        {/* Right column */}
        <div className="w-1/2">
          <div className="sticky top-4 grid gap-4">
            <WhatsappPreview step={selectedStep} />
          </div>
        </div>
      </div>
    </div>
  );
};
