"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DialogStep, DialogStepType } from "@/domain/dialog/dialog-schema";

interface StepListProps {
  onAddStep: () => void;
  onDeleteStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: "up" | "down") => void;
  onSelectStep: (stepId: string) => void;
  selectedStepId: string | null;
  steps: DialogStep[];
}

const TYPE_COLORS: Record<DialogStepType, string> = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  buttons:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  list: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  free_text:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  qr: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  video: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

const TYPE_LABELS: Record<DialogStepType, string> = {
  text: "Text",
  buttons: "Buttons",
  list: "Liste",
  free_text: "Freitext",
  qr: "QR",
  video: "Video",
};

const groupByPhase = (steps: DialogStep[]) => {
  const groups: { phase: string | undefined; steps: DialogStep[] }[] = [];
  let currentPhase: string | undefined;
  let currentGroup: DialogStep[] = [];

  for (const step of steps) {
    if (step.phase === currentPhase) {
      currentGroup.push(step);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ phase: currentPhase, steps: currentGroup });
      }
      currentPhase = step.phase;
      currentGroup = [step];
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ phase: currentPhase, steps: currentGroup });
  }

  return groups;
};

export const StepList = ({
  steps,
  selectedStepId,
  onSelectStep,
  onAddStep,
  onDeleteStep,
  onMoveStep,
}: StepListProps) => {
  const groups = groupByPhase(steps);
  let globalIndex = 0;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-semibold text-sm">Schritte</h2>
        <Button onClick={onAddStep} size="sm" type="button" variant="outline">
          <Plus className="mr-1 size-3.5" />
          Schritt
        </Button>
      </div>
      <Separator />
      <div className="grid gap-1">
        {groups.map((group) => {
          const phaseKey = group.phase ?? "__none__";
          return (
            <div className="grid gap-1" key={phaseKey}>
              {group.phase && (
                <div className="px-1 pt-2 pb-1">
                  <Badge className="text-[0.6rem]" variant="outline">
                    {group.phase}
                  </Badge>
                </div>
              )}
              {group.steps.map((step) => {
                globalIndex += 1;
                const stepNumber = globalIndex;
                const isSelected = step.id === selectedStepId;
                const isFirst = stepNumber === 1;
                const isLast = stepNumber === steps.length;

                return (
                  <button
                    className={`group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    key={step.id}
                    onClick={() => onSelectStep(step.id)}
                    type="button"
                  >
                    <span className="w-5 shrink-0 text-right text-muted-foreground">
                      {stepNumber}.
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {step.id}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-[0.6rem] ${TYPE_COLORS[step.type]}`}
                    >
                      {TYPE_LABELS[step.type]}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {!isFirst && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveStep(step.id, "up");
                          }}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                      )}
                      {!isLast && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveStep(step.id, "down");
                          }}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      )}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteStep(step.id);
                        }}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
