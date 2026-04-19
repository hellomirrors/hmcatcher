"use client";

import { ExternalLink, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  DialogAnswerOption,
  DialogStep,
  DialogStepType,
  DialogTransition,
  DialogValidationType,
  MqttMatchMode,
  UnmatchedInputMode,
} from "@/domain/dialog/dialog-schema";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import { ConditionBuilder } from "./condition-builder";

interface StepFormProps {
  allStepIds: string[];
  allVariableNames: string[];
  onChange: (updated: DialogStep) => void;
  step: DialogStep;
}

const STEP_TYPE_LABELS: Record<DialogStepType, string> = {
  text: "Text",
  buttons: "Buttons",
  list: "Liste",
  free_text: "Freitext",
  qr: "QR-Code",
  video: "Video",
  mqtt: "MQTT-Trigger",
};

const STEP_TYPES = Object.keys(STEP_TYPE_LABELS) as DialogStepType[];

const VALIDATION_LABELS: Record<string, string> = {
  none: "Keine",
  email: "E-Mail",
  phone: "Telefon",
  plz: "PLZ",
  nonempty: "Nicht leer",
  number: "Zahl",
};

const VALIDATION_OPTIONS = Object.keys(VALIDATION_LABELS);

const UNMATCHED_MODE_LABELS: Record<UnmatchedInputMode, string> = {
  error: "Fehlermeldung",
  as_other: "Als Sonstiges speichern",
  accept: "Akzeptieren",
};

const UNMATCHED_MODES = Object.keys(
  UNMATCHED_MODE_LABELS
) as UnmatchedInputMode[];

const LIST_MAX_OPTIONS = 10;

const StepTypeConfig = ({
  step,
  update,
}: {
  step: DialogStep;
  update: (patch: Partial<DialogStep>) => void;
}) => {
  if (step.type === "buttons" || step.type === "list") {
    return <ChoiceStepConfig step={step} update={update} />;
  }

  if (step.type === "free_text") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validierung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="step-validation">Validierungstyp</Label>
            <Select
              onValueChange={(val) =>
                update({
                  validation:
                    val === "none" ? undefined : (val as DialogValidationType),
                })
              }
              value={step.validation ?? "none"}
            >
              <SelectTrigger id="step-validation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALIDATION_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {VALIDATION_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {step.validation && (
            <div className="grid gap-1.5">
              <Label htmlFor="step-validation-msg">
                Fehlermeldung bei ungültiger Eingabe
              </Label>
              <Input
                id="step-validation-msg"
                onChange={(e) =>
                  update({ validationMessage: e.target.value || undefined })
                }
                placeholder="Bitte gib eine gültige Eingabe ein."
                value={step.validationMessage ?? ""}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step.type === "qr") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR-Code</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="step-qr-mode">QR-Modus</Label>
            <Select
              onValueChange={(val) =>
                update({
                  qrMode: val as "template" | "session-data" | "messe",
                })
              }
              value={step.qrMode ?? "template"}
            >
              <SelectTrigger id="step-qr-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">
                  Template (eigener Inhalt)
                </SelectItem>
                <SelectItem value="session-data">
                  Session-Daten (Variablen + Score als JSON)
                </SelectItem>
                <SelectItem value="messe">
                  Messe (Vorname + Bucket-Code)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(step.qrMode ?? "template") === "template" && (
            <div className="grid gap-1.5">
              <Label htmlFor="step-qr-template">QR-Template</Label>
              <Textarea
                id="step-qr-template"
                onChange={(e) =>
                  update({ qrTemplate: e.target.value || undefined })
                }
                placeholder="https://example.com/{{id}}"
                rows={3}
                value={step.qrTemplate ?? ""}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="step-qr-caption">Bildunterschrift (optional)</Label>
            <Input
              id="step-qr-caption"
              onChange={(e) =>
                update({ qrCaption: e.target.value || undefined })
              }
              value={step.qrCaption ?? ""}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step.type === "video") {
    return <VideoStepConfig step={step} update={update} />;
  }

  if (step.type === "mqtt") {
    return <MqttStepConfig step={step} update={update} />;
  }

  return null;
};

const ChoiceStepConfig = ({
  step,
  update,
}: {
  step: DialogStep;
  update: (patch: Partial<DialogStep>) => void;
}) => {
  const optionsCount = (step.options ?? []).length;
  const isListAtLimit =
    step.type === "list" && optionsCount >= LIST_MAX_OPTIONS;

  const updateOption = (index: number, patch: Partial<DialogAnswerOption>) => {
    const options = [...(step.options ?? [])];
    options[index] = { ...options[index], ...patch };
    update({ options });
  };

  const removeOption = (index: number) => {
    update({
      options: (step.options ?? []).filter((_, i) => i !== index),
    });
  };

  const addOption = () => {
    const options = step.options ?? [];
    if (step.type === "list" && options.length >= LIST_MAX_OPTIONS) {
      return;
    }
    update({
      options: [...options, { id: `opt_${Date.now()}`, label: "" }],
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Antwortoptionen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {step.type === "list" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="list-button-text">Button-Text der Liste</Label>
                <Input
                  id="list-button-text"
                  onChange={(e) =>
                    update({ listButtonText: e.target.value || undefined })
                  }
                  placeholder="Optionen anzeigen"
                  value={step.listButtonText ?? ""}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                WhatsApp erlaubt maximal {LIST_MAX_OPTIONS} Einträge pro Liste.
                Aktuell: {optionsCount}/{LIST_MAX_OPTIONS}.
              </p>
            </>
          )}
          {(step.options ?? []).map((option, index) => (
            <div
              className="flex items-start gap-2 rounded-md border p-2"
              key={option.id}
            >
              <div className="grid flex-1 gap-1.5">
                <Input
                  onChange={(e) => updateOption(index, { id: e.target.value })}
                  placeholder="ID (auto)"
                  value={option.id}
                />
                <Input
                  onChange={(e) =>
                    updateOption(index, { label: e.target.value })
                  }
                  placeholder="Label"
                  value={option.label}
                />
                {step.type === "list" && (
                  <Input
                    onChange={(e) =>
                      updateOption(index, {
                        description: e.target.value || undefined,
                      })
                    }
                    placeholder="Beschreibung (optional)"
                    value={option.description ?? ""}
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Input
                  className="w-20"
                  onChange={(e) =>
                    updateOption(index, {
                      score: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Score"
                  type="number"
                  value={option.score ?? ""}
                />
              </div>
              <Button
                onClick={() => removeOption(index)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            disabled={isListAtLimit}
            onClick={addOption}
            size="sm"
            type="button"
            variant="outline"
          >
            Option hinzufügen
          </Button>
          {isListAtLimit && (
            <p className="text-destructive text-xs">
              Maximum von {LIST_MAX_OPTIONS} Listen-Optionen erreicht.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Unerwartete Eingabe</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="step-unmatched">Verhalten</Label>
            <Select
              onValueChange={(val) =>
                update({ unmatchedInputMode: val as UnmatchedInputMode })
              }
              value={step.unmatchedInputMode ?? "error"}
            >
              <SelectTrigger id="step-unmatched">
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
          {step.unmatchedInputMode === "as_other" && (
            <div className="grid gap-1.5">
              <Label htmlFor="step-unmatched-value">Wert für Sonstiges</Label>
              <Input
                id="step-unmatched-value"
                onChange={(e) =>
                  update({ unmatchedInputValue: e.target.value || undefined })
                }
                placeholder="sonstiges"
                value={step.unmatchedInputValue ?? ""}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

const VideoStepConfig = ({
  step,
  update,
}: {
  step: DialogStep;
  update: (patch: Partial<DialogStep>) => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Video</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="step-video-url">Video-URL</Label>
        <Input
          id="step-video-url"
          onChange={(e) => update({ videoUrl: e.target.value || undefined })}
          placeholder="https://example.com/video.mp4"
          value={step.videoUrl ?? ""}
        />
      </div>
    </CardContent>
  </Card>
);

const MqttStepConfig = ({
  step,
  update,
}: {
  step: DialogStep;
  update: (patch: Partial<DialogStep>) => void;
}) => {
  const matchMode = step.mqttMatchMode ?? "text";
  return (
    <Card>
      <CardHeader>
        <CardTitle>MQTT-Trigger</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="step-mqtt-topic">Topic</Label>
          <Input
            id="step-mqtt-topic"
            onChange={(e) => update({ mqttTopic: e.target.value || undefined })}
            placeholder="z.B. hmslots/winner"
            value={step.mqttTopic ?? ""}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="step-mqtt-mode">Payload-Format</Label>
          <Select
            onValueChange={(val) =>
              update({ mqttMatchMode: val as MqttMatchMode })
            }
            value={matchMode}
          >
            <SelectTrigger id="step-mqtt-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="session">Session (sessionId match)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {matchMode === "json" && (
          <div className="grid gap-1.5">
            <Label htmlFor="step-mqtt-json-key">JSON-Key (Ebene 1)</Label>
            <Input
              id="step-mqtt-json-key"
              onChange={(e) =>
                update({ mqttJsonKey: e.target.value || undefined })
              }
              placeholder="z.B. event"
              value={step.mqttJsonKey ?? ""}
            />
          </div>
        )}
        {matchMode === "session" && (
          <div className="grid gap-1.5">
            <Label htmlFor="step-mqtt-sid-key">SessionId-Key im Payload</Label>
            <Input
              id="step-mqtt-sid-key"
              onChange={(e) =>
                update({ mqttSessionIdKey: e.target.value || undefined })
              }
              placeholder="sessionId"
              value={step.mqttSessionIdKey ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              JSON-payload muss sessionId-key mit session.sessionId enthalten.
              Andere top-level Felder werden in Variablen übernommen.
            </p>
          </div>
        )}
        {matchMode !== "session" && (
          <div className="grid gap-1.5">
            <Label htmlFor="step-mqtt-match">Match-String</Label>
            <Input
              id="step-mqtt-match"
              onChange={(e) =>
                update({ mqttMatchString: e.target.value || undefined })
              }
              placeholder={matchMode === "json" ? "Wert bei key" : "Text exakt"}
              value={step.mqttMatchString ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              Bei Übereinstimmung wird der Schritt fortgesetzt.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const StepForm = ({
  step,
  allStepIds,
  allVariableNames,
  onChange,
}: StepFormProps) => {
  const update = (patch: Partial<DialogStep>) => {
    onChange({ ...step, ...patch });
  };

  const showHeaderFooter = step.type === "buttons" || step.type === "list";

  const updateTransition = (
    index: number,
    patch: Partial<DialogTransition>
  ) => {
    const transitions = [...step.transitions];
    transitions[index] = { ...transitions[index], ...patch };
    update({ transitions });
  };

  const removeTransition = (index: number) => {
    update({
      transitions: step.transitions.filter((_, i) => i !== index),
    });
  };

  const addTransition = () => {
    update({
      transitions: [...step.transitions, { targetStepId: allStepIds[0] ?? "" }],
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Schritt bearbeiten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="step-id">ID</Label>
            <Input id="step-id" readOnly value={step.id} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="step-type">Typ</Label>
            <Select
              onValueChange={(val) => update({ type: val as DialogStepType })}
              value={step.type}
            >
              <SelectTrigger id="step-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {STEP_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="step-phase">Phase (optional)</Label>
            <Input
              id="step-phase"
              onChange={(e) => update({ phase: e.target.value || undefined })}
              placeholder="z.B. begruessung, daten, abschluss"
              value={step.phase ?? ""}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="step-message">Nachricht</Label>
            <Textarea
              id="step-message"
              onChange={(e) => update({ message: e.target.value })}
              rows={4}
              value={step.message}
            />
            <p className="text-muted-foreground text-xs">
              Variablen mit {"{{variable}}"} einfügen, z.B. {"{{vorname}}"}
            </p>
          </div>

          {showHeaderFooter && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="step-header">Header (optional)</Label>
                <Input
                  id="step-header"
                  onChange={(e) =>
                    update({ header: e.target.value || undefined })
                  }
                  value={step.header ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="step-footer">Footer (optional)</Label>
                <Input
                  id="step-footer"
                  onChange={(e) =>
                    update({ footer: e.target.value || undefined })
                  }
                  value={step.footer ?? ""}
                />
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="step-variable">
              Variable speichern als (optional)
            </Label>
            <Input
              id="step-variable"
              onChange={(e) =>
                update({
                  variableName: e.target.value || undefined,
                })
              }
              placeholder="z.B. vorname, email, position"
              value={step.variableName ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <StepTypeConfig step={step} update={update} />

      <Card>
        <CardHeader>
          <CardTitle>Übergänge</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step.transitions.map((transition, index) => (
            <div className="grid gap-3 rounded-md border p-3" key={index}>
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-1.5">
                  <Label>Zielschritt</Label>
                  <Select
                    onValueChange={(val) =>
                      updateTransition(index, {
                        targetStepId: val as string,
                      })
                    }
                    value={transition.targetStepId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Schritt wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStepIds.map((sid) => (
                        <SelectItem key={sid} value={sid}>
                          {sid}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {transition.targetStepId && (
                  <Button
                    className="mt-5"
                    onClick={() =>
                      useDialogEditorStore
                        .getState()
                        .focusStepsStep(transition.targetStepId)
                    }
                    size="icon-sm"
                    title="Zum Zielschritt springen"
                    type="button"
                    variant="ghost"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
                <Button
                  className="mt-5"
                  onClick={() => removeTransition(index)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              <ConditionBuilder
                conditions={transition.conditions ?? []}
                onChange={(conditions) =>
                  updateTransition(index, {
                    conditions: conditions.length > 0 ? conditions : undefined,
                  })
                }
                variableNames={allVariableNames}
              />
              {index === step.transitions.length - 1 &&
                !transition.conditions?.length && (
                  <p className="text-muted-foreground text-xs">
                    Letzter Übergang ohne Bedingungen = Fallback
                  </p>
                )}
            </div>
          ))}
          <Separator />
          <Button
            onClick={addTransition}
            size="sm"
            type="button"
            variant="outline"
          >
            Transition hinzufügen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
