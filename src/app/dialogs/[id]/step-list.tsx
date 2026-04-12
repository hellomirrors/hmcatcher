"use client";

import { ArrowDown, ArrowUp, GitBranch, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DialogStep } from "@/domain/dialog/dialog-schema";
import { TYPE_COLORS, TYPE_LABELS } from "@/domain/dialog/step-type-display";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";

interface StepListProps {
  onAddStep: () => void;
  onDeleteStep: (stepId: string) => void;
  onMoveStep: (stepId: string, direction: "up" | "down") => void;
  onSelectStep: (stepId: string) => void;
  selectedStepId: string | null;
  steps: DialogStep[];
}

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

  const focusGraphNode = useDialogEditorStore((s) => s.focusGraphNode);
  const stepsFocusStepId = useDialogEditorStore((s) => s.stepsFocusStepId);
  const clearStepsFocus = useDialogEditorStore((s) => s.clearStepsFocus);

  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll the requested step into view when navigating from the graph tab
  useEffect(() => {
    if (!(stepsFocusStepId && containerRef.current)) {
      return;
    }
    const el = containerRef.current.querySelector(
      `[data-step-id="${stepsFocusStepId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    clearStepsFocus();
  }, [stepsFocusStepId, clearStepsFocus]);

  return (
    <div className="grid gap-2" ref={containerRef}>
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
                  <div
                    className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    data-step-id={step.id}
                    key={step.id}
                  >
                    <button
                      className="flex flex-1 cursor-pointer items-center gap-2 text-left"
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
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        onClick={() => focusGraphNode(step.id)}
                        size="icon-xs"
                        title="Im Graph anzeigen"
                        type="button"
                        variant="ghost"
                      >
                        <GitBranch className="size-3" />
                      </Button>
                      {!isFirst && (
                        <Button
                          onClick={() => onMoveStep(step.id, "up")}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                      )}
                      {!isLast && (
                        <Button
                          onClick={() => onMoveStep(step.id, "down")}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      )}
                      <Button
                        onClick={() => onDeleteStep(step.id)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
