import { create } from "zustand";

export interface FocusState {
  hoveredEntityId: string | null;
  setHoveredEntityId: (id: string | null) => void;
  hoveredTokenId: string | null;
  setHoveredTokenId: (id: string | null) => void;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  filterEdgeType: string | null;
  setFilterEdgeType: (type: string | null) => void;
  layoutMode: "layered" | "radial";
  setLayoutMode: (mode: "layered" | "radial") => void;
  activeEvidenceHash: string | null;
  setActiveEvidenceHash: (hash: string | null) => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  hoveredEntityId: null,
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  hoveredTokenId: null,
  setHoveredTokenId: (id) => set({ hoveredTokenId: id }),
  hoveredNodeId: null,
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  selectedNodeId: "NODE-KP",
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  filterEdgeType: null,
  setFilterEdgeType: (type) => set({ filterEdgeType: type }),
  layoutMode: "layered",
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  activeEvidenceHash: null,
  setActiveEvidenceHash: (hash) => set({ activeEvidenceHash: hash }),
}));
