"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type EdgeMouseHandler,
  MarkerType,
  type NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  DialogDefinition,
  DialogStep,
} from "@/domain/dialog/dialog-schema";
import { useDialogEditorStore } from "@/lib/dialog-editor-store";
import { computeLayout, type TransitionEdgeData } from "./compute-layout";
import { EdgeDetailPanel } from "./edge-detail-panel";
import { NodeDetailPanel } from "./node-detail-panel";
import { StepNode } from "./step-node";
import { TransitionEdge } from "./transition-edge";

const nodeTypes = { step: StepNode };
const edgeTypes = { transition: TransitionEdge };

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

interface InnerProps {
  definition: DialogDefinition;
}

function DialogFlowGraphInner({ definition }: InnerProps) {
  const { fitView, setCenter } = useReactFlow();

  const initialLayout = useMemo(
    () => computeLayout(definition.steps),
    [definition.steps]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  // Re-layout when definition changes
  useEffect(() => {
    const layout = computeLayout(definition.steps);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    // Small delay so react-flow measures, then fit
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }));
  }, [definition.steps, setNodes, setEdges, fitView]);

  // Focus on a node when requested from another tab
  const graphFocusNodeId = useDialogEditorStore((s) => s.graphFocusNodeId);
  const clearGraphFocus = useDialogEditorStore((s) => s.clearGraphFocus);

  useEffect(() => {
    if (!graphFocusNodeId) {
      return;
    }
    // Wait for React Flow to finish rendering after a tab switch before
    // centering. Two rAF frames + a small timeout ensures the viewport
    // dimensions are settled so setCenter produces a correct result.
    const timer = setTimeout(() => {
      const node = nodes.find((n) => n.id === graphFocusNodeId);
      if (node) {
        setCenter(node.position.x + 100, node.position.y + 40, {
          zoom: 1.4,
          duration: 500,
        });
      }
      clearGraphFocus();
    }, 150);
    return () => clearTimeout(timer);
  }, [graphFocusNodeId, clearGraphFocus, nodes, setCenter]);

  // Node popup state
  const [popupStep, setPopupStep] = useState<DialogStep | null>(null);
  const setSelectedStepId = useDialogEditorStore((s) => s.setSelectedStepId);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const step = definition.steps.find((s) => s.id === node.id);
      if (step) {
        setPopupStep(step);
        setSelectedStepId(step.id);
      }
    },
    [definition.steps, setSelectedStepId]
  );

  // Edge popup state
  const [popupEdge, setPopupEdge] = useState<{
    sourceId: string;
    targetId: string;
    data: TransitionEdgeData | null;
  } | null>(null);

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setPopupEdge({
      sourceId: edge.source,
      targetId: edge.target,
      data: (edge.data as unknown as TransitionEdgeData) ?? null,
    });
  }, []);

  const handleAutoLayout = useCallback(() => {
    const layout = computeLayout(definition.steps);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 400 }));
  }, [definition.steps, setNodes, setEdges, fitView]);

  return (
    <div className="relative h-[calc(100vh-120px)] w-full">
      <ReactFlow
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        maxZoom={2}
        minZoom={0.1}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      <div className="absolute top-3 right-3 z-10">
        <Button onClick={handleAutoLayout} size="sm" variant="secondary">
          <LayoutGrid className="mr-1.5 size-3.5" />
          Automatisch anordnen
        </Button>
      </div>

      <NodeDetailPanel
        onClose={() => setPopupStep(null)}
        open={popupStep !== null}
        step={popupStep}
      />

      {popupEdge && (
        <EdgeDetailPanel
          data={popupEdge.data}
          onClose={() => setPopupEdge(null)}
          open
          sourceId={popupEdge.sourceId}
          targetId={popupEdge.targetId}
        />
      )}
    </div>
  );
}

export function DialogFlowGraph({
  definition,
}: {
  definition: DialogDefinition;
}) {
  return (
    <ReactFlowProvider>
      <DialogFlowGraphInner definition={definition} />
    </ReactFlowProvider>
  );
}
