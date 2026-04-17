"use client";

import { ArrowLeft, Check, Download, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DialogDefinition,
  DialogStep,
  UnmatchedInputMode,
} from "@/domain/dialog/dialog-schema";
import { dialogDefinitionSchema } from "@/domain/dialog/dialog-schema";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import { saveDialogAction } from "./action";
import { DialogFlowGraph } from "./graph/dialog-flow-graph";
import { DialogScoreTab } from "./score/dialog-score-tab";
import { DialogSimulator } from "./simulator/dialog-simulator";
import { StepForm } from "./step-form";
import { StepList } from "./step-list";
import { WhatsappPreview } from "./whatsapp-preview";

interface DialogEditorProps {
  dialog: {
    definition: DialogDefinition;
    description: string;
    id: number;
    name: string;
    slug: string;
  };
}

const UNMATCHED_MODE_LABELS: Record<UnmatchedInputMode, string> = {
  error: "Fehlermeldung senden",
  as_other: "Als Sonstiges speichern",
  accept: "Akzeptieren",
};

const UNMATCHED_MODES = Object.keys(
  UNMATCHED_MODE_LABELS
) as UnmatchedInputMode[];

export const DialogEditor = ({ dialog }: DialogEditorProps) => {
  const [name, setName] = useState(dialog.name);
  const [description, setDescription] = useState(dialog.description);
  const [definition, setDefinition] = useState<DialogDefinition>(
    dialog.definition
  );
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const selectedStepId = useDialogEditorStore((s) => s.selectedStepId);
  const setSelectedStepId = useDialogEditorStore((s) => s.setSelectedStepId);
  const activeTab = useDialogEditorStore((s) => s.activeTab);
  const setActiveTab = useDialogEditorStore((s) => s.setActiveTab);

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

  const markDirty = () => {
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
      const result = await saveDialogAction(dialog.id, {
        name,
        description,
        definitionJson: JSON.stringify(definition),
      });
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

  const handleExport = () => {
    const json = JSON.stringify(definition, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dialog.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        const validated = dialogDefinitionSchema.parse(parsed);
        setDefinition(validated);
        setDirty(true);
        setFeedback({ type: "success", message: "Definition importiert" });
      } catch (err) {
        setFeedback({
          type: "error",
          message: `Import fehlgeschlagen: ${(err as Error).message}`,
        });
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  };

  const isWideTab = activeTab === "graph" || activeTab === "simulator";

  return (
    <div className={isWideTab ? "p-4" : "mx-auto w-full max-w-7xl p-4"}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dialogs">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-xl">{name}</h1>
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
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>
          <Button
            onClick={() => importInputRef.current?.click()}
            size="sm"
            variant="outline"
          >
            <Upload className="mr-1.5 size-3.5" />
            Import
          </Button>
          <input
            accept=".json"
            className="hidden"
            onChange={handleImport}
            ref={importInputRef}
            type="file"
          />
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

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="general">Allgemein</TabsTrigger>
          <TabsTrigger value="steps">Schritte</TabsTrigger>
          <TabsTrigger value="graph">Graph</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Allgemein</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="dialog-name">Name</Label>
                  <Input
                    id="dialog-name"
                    onChange={(e) => {
                      setName(e.target.value);
                      markDirty();
                    }}
                    value={name}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dialog-slug">Slug</Label>
                  <Input id="dialog-slug" readOnly value={dialog.slug} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-description">Beschreibung</Label>
                <Textarea
                  id="dialog-description"
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  rows={2}
                  value={description}
                />
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
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-reminder-message">
                  Erinnerungsnachricht
                </Label>
                <Textarea
                  id="dialog-reminder-message"
                  onChange={(e) =>
                    updateDefinition({
                      reminderMessage: e.target.value || undefined,
                    })
                  }
                  rows={2}
                  value={definition.reminderMessage ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-timeout-message">
                  Timeout-Nachricht
                </Label>
                <Textarea
                  id="dialog-timeout-message"
                  onChange={(e) =>
                    updateDefinition({
                      timeoutMessage: e.target.value || undefined,
                    })
                  }
                  rows={2}
                  value={definition.timeoutMessage ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-error-message">Fehlermeldung</Label>
                <Textarea
                  id="dialog-error-message"
                  onChange={(e) =>
                    updateDefinition({ errorMessage: e.target.value })
                  }
                  rows={2}
                  value={definition.errorMessage}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="dialog-unmatched">
                    Verhalten bei unerwarteter Eingabe
                  </Label>
                  <Select
                    onValueChange={(val) =>
                      updateDefinition({
                        unmatchedInputMode: val as UnmatchedInputMode,
                      })
                    }
                    value={definition.unmatchedInputMode}
                  >
                    <SelectTrigger id="dialog-unmatched">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNMATCHED_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {UNMATCHED_MODE_LABELS[mode]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {definition.unmatchedInputMode === "as_other" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="dialog-unmatched-value">
                      Wert für Sonstiges
                    </Label>
                    <Input
                      id="dialog-unmatched-value"
                      onChange={(e) =>
                        updateDefinition({
                          unmatchedInputValue: e.target.value || undefined,
                        })
                      }
                      value={definition.unmatchedInputValue ?? ""}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <div className="flex gap-6">
            {/* Left column — Step list */}
            <div className="w-1/2">
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
            </div>

            {/* Right column — Preview + Step form */}
            <div className="flex w-1/2 flex-col gap-6">
              <WhatsappPreview step={selectedStep} />
              {selectedStep && (
                <StepForm
                  allStepIds={allStepIds}
                  allVariableNames={allVariableNames}
                  onChange={handleStepChange}
                  step={selectedStep}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graph">
          <DialogFlowGraph definition={definition} />
        </TabsContent>

        <TabsContent value="score">
          <DialogScoreTab
            definition={definition}
            onUpdateBuckets={(buckets) =>
              updateDefinition({ scoreBuckets: buckets })
            }
          />
        </TabsContent>

        <TabsContent value="simulator">
          <DialogSimulator definition={definition} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
