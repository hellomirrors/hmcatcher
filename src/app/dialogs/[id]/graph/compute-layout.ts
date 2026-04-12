import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { DialogStep } from "@/domain/dialog/dialog-schema";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export interface StepNodeData {
  isFirst: boolean;
  step: DialogStep;
}

export interface TransitionEdgeData {
  conditions?: { field: string; operator: string; value: unknown }[];
  isFallback: boolean;
}

export function computeLayout(steps: DialogStep[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const stepIds = new Set(steps.map((s) => s.id));

  for (const step of steps) {
    g.setNode(step.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edges: Edge[] = [];

  for (const step of steps) {
    const transitionCount = step.transitions.length;
    for (let i = 0; i < transitionCount; i++) {
      const t = step.transitions[i];
      if (!stepIds.has(t.targetStepId)) {
        continue;
      }

      g.setEdge(step.id, t.targetStepId);

      const hasConditions = t.conditions && t.conditions.length > 0;
      const isLastWithoutConditions =
        i === transitionCount - 1 && !hasConditions;

      edges.push({
        id: `${step.id}->${t.targetStepId}:${i}`,
        source: step.id,
        target: t.targetStepId,
        type: "transition",
        data: {
          conditions: t.conditions,
          isFallback: isLastWithoutConditions,
        } satisfies TransitionEdgeData,
      });
    }
  }

  dagre.layout(g);

  const nodes: Node[] = steps.map((step, index) => {
    const pos = g.node(step.id);
    return {
      id: step.id,
      type: "step",
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: { step, isFirst: index === 0 } satisfies StepNodeData,
    };
  });

  return { nodes, edges };
}
