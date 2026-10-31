import { create } from "zustand";

export type DockTab = "rrn" | "pdf" | "privacy" | "proof" | "entities";
export type UiDensity = "comfortable" | "compact";

export interface TarkaUiState {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Dock & Inspector state
  activeDockTab: DockTab;
  setActiveDockTab: (tab: DockTab) => void;
  dockOpenMobile: boolean;
  setDockOpenMobile: (open: boolean) => void;
  proofStepIndex: number;
  setProofStepIndex: (idx: number) => void;

  // Cross-component linked brushing (zero re-render storm)
  hoveredEvidenceId: string | null;
  setHoveredEvidenceId: (id: string | null) => void;
  selectedRowSeq: number | null;
  setSelectedRowSeq: (seq: number | null) => void;

  // Density & View modes
  density: UiDensity;
  setDensity: (d: UiDensity) => void;
  toggleDensity: () => void;
  presentationMode: boolean;
  setPresentationMode: (mode: boolean) => void;
  togglePresentationMode: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useTarkaUiStore = create<TarkaUiState>((set) => {
  const initialCollapsed = typeof window !== "undefined"
    ? localStorage.getItem("tarka_sidebar_collapsed") === "true" || true // Default collapsed to 56px icon rail
    : true;

  const initialDensity = typeof window !== "undefined" && window.innerHeight < 780
    ? "compact"
    : "comfortable";

  return {
    sidebarCollapsed: initialCollapsed,
    setSidebarCollapsed: (collapsed) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("tarka_sidebar_collapsed", String(collapsed));
      }
      set({ sidebarCollapsed: collapsed });
    },
    toggleSidebar: () =>
      set((state) => {
        const next = !state.sidebarCollapsed;
        if (typeof window !== "undefined") {
          localStorage.setItem("tarka_sidebar_collapsed", String(next));
        }
        return { sidebarCollapsed: next };
      }),

    activeDockTab: "rrn",
    setActiveDockTab: (tab) => set({ activeDockTab: tab }),

    dockOpenMobile: false,
    setDockOpenMobile: (open) => set({ dockOpenMobile: open }),

    proofStepIndex: 0,
    setProofStepIndex: (idx) => set({ proofStepIndex: idx, activeDockTab: "proof" }),

    hoveredEvidenceId: null,
    setHoveredEvidenceId: (id) => set({ hoveredEvidenceId: id }),

    selectedRowSeq: null,
    setSelectedRowSeq: (seq) => set({ selectedRowSeq: seq }),

    density: initialDensity,
    setDensity: (density) => set({ density }),
    toggleDensity: () =>
      set((state) => ({
        density: state.density === "comfortable" ? "compact" : "comfortable",
      })),

    presentationMode: false,
    setPresentationMode: (presentationMode) => set({ presentationMode }),
    togglePresentationMode: () =>
      set((state) => ({ presentationMode: !state.presentationMode })),

    commandPaletteOpen: false,
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  };
});

