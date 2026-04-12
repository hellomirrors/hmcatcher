import { create } from "zustand";

interface DialogEditorState {
  activeTab: string;
  clearGraphFocus: () => void;
  clearStepsFocus: () => void;
  focusGraphNode: (stepId: string) => void;
  focusStepsStep: (stepId: string) => void;

  /** One-shot: tells the graph to center on this node, then clear. */
  graphFocusNodeId: string | null;
  selectedStepId: string | null;
  setActiveTab: (tab: string) => void;
  setSelectedStepId: (id: string | null) => void;

  /** One-shot: tells the step list to scroll to this step, then clear. */
  stepsFocusStepId: string | null;
}

export const useDialogEditorStore = create<DialogEditorState>()((set) => ({
  selectedStepId: null,
  setSelectedStepId: (id) => set({ selectedStepId: id }),

  activeTab: "steps",
  setActiveTab: (tab) => set({ activeTab: tab }),

  graphFocusNodeId: null,
  focusGraphNode: (stepId) =>
    set({
      graphFocusNodeId: stepId,
      activeTab: "graph",
      selectedStepId: stepId,
    }),
  clearGraphFocus: () => set({ graphFocusNodeId: null }),

  stepsFocusStepId: null,
  focusStepsStep: (stepId) =>
    set({
      stepsFocusStepId: stepId,
      activeTab: "steps",
      selectedStepId: stepId,
    }),
  clearStepsFocus: () => set({ stepsFocusStepId: null }),
}));
