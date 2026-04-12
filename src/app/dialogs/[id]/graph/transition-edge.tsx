"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import type { TransitionEdgeData } from "./compute-layout";

function formatConditions(
  conditions?: { field: string; operator: string; value: unknown }[]
): string {
  if (!conditions || conditions.length === 0) {
    return "Fallback";
  }
  return conditions
    .map((c) => `${c.field} ${c.operator} ${String(c.value)}`)
    .join(" & ");
}

export function TransitionEdge(props: EdgeProps) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    id,
    data,
  } = props;

  const { conditions, isFallback } = (data ??
    {}) as unknown as TransitionEdgeData;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const label = formatConditions(conditions);

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          stroke: isFallback
            ? "var(--color-muted-foreground)"
            : "var(--color-foreground)",
          strokeWidth: isFallback ? 1.5 : 2,
          strokeDasharray: isFallback ? "6 4" : "none",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`pointer-events-auto absolute max-w-[180px] cursor-pointer truncate rounded px-1.5 py-0.5 text-center text-[0.6rem] leading-tight ${
            isFallback
              ? "bg-muted text-muted-foreground"
              : "bg-background text-foreground shadow-sm ring-1 ring-border"
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          title={label}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
