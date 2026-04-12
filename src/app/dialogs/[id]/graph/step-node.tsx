"use client";

import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import {
  TYPE_BORDER_COLORS,
  TYPE_COLORS,
  TYPE_LABELS,
} from "@/domain/dialog/step-type-display";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import type { StepNodeData } from "./compute-layout";

export function StepNode({ data, id }: NodeProps) {
  const { step, isFirst } = data as unknown as StepNodeData;
  const selectedStepId = useDialogEditorStore((s) => s.selectedStepId);
  const isSelected = selectedStepId === id;

  return (
    <div
      className={`flex w-[200px] flex-col items-center gap-1 rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm transition-shadow dark:bg-zinc-900 ${
        isSelected
          ? `ring-2 ring-primary ring-offset-1 ${TYPE_BORDER_COLORS[step.type]}`
          : `${TYPE_BORDER_COLORS[step.type]} hover:shadow-md`
      }`}
    >
      <Handle
        className="!bg-muted-foreground !h-2 !w-2"
        position={Position.Top}
        type="target"
      />

      <div className="flex w-full items-center justify-between gap-1">
        <span className="truncate font-medium text-xs" title={step.id}>
          {isFirst && (
            <span className="mr-1 rounded bg-emerald-100 px-1 py-0.5 text-[0.55rem] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              Start
            </span>
          )}
          {step.id}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-[0.55rem] leading-tight ${TYPE_COLORS[step.type]}`}
        >
          {TYPE_LABELS[step.type]}
        </span>
      </div>

      {step.phase && (
        <span className="w-full truncate text-center text-[0.6rem] text-muted-foreground">
          {step.phase}
        </span>
      )}

      <Handle
        className="!bg-muted-foreground !h-2 !w-2"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
