import { create } from "zustand";
import type { DiscoveredFraudCluster } from "../utils/publicDatasetAdapters";
import type { ReconstructedEdge, ReconstructedInvestigation } from "../utils/investigationReconstructor";

export type TopLevelPage = "workspaces" | "workbench" | "benchmark";
export type DockTab = "rrn" | "pdf" | "privacy" | "proof" | "entities";
export type UiDensity = "comfortable" | "compact";

export interface TarkaUiState {
  // Top-Level Application Page Routing
  activePage: TopLevelPage;
  setActivePage: (page: TopLevelPage) => void;

  // Discovered Cluster active in 6-screen workbench
  activeDiscoveredCluster: DiscoveredFraudCluster | null;
  setActiveDiscoveredCluster: (cluster: DiscoveredFraudCluster | null) => void;

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

  // Plain-English Explain Simply mode
  explainSimply: boolean;
  setExplainSimply: (val: boolean) => void;
  toggleExplainSimply: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Benchmark Lab Drawer
  benchmarkLabOpen: boolean;
  setBenchmarkLabOpen: (open: boolean) => void;
  toggleBenchmarkLab: () => void;

  // Public Dataset Benchmark Modal
  publicDatasetModalOpen: boolean;
  setPublicDatasetModalOpen: (open: boolean) => void;
  togglePublicDatasetModal: () => void;

  // 5-File Reconstructed Investigation & Evidence Sheet
  reconstructedInvestigation: ReconstructedInvestigation | null;
  setReconstructedInvestigation: (inv: ReconstructedInvestigation | null) => void;
  selectedEvidenceEdge: ReconstructedEdge | null;
  setSelectedEvidenceEdge: (edge: ReconstructedEdge | null) => void;
  relationshipSheetOpen: boolean;
  setRelationshipSheetOpen: (open: boolean) => void;
  intelligenceBriefOpen: boolean;
  setIntelligenceBriefOpen: (open: boolean) => void;
  transformationAuditModalOpen: boolean;
  setTransformationAuditModalOpen: (open: boolean) => void;
}

export const useTarkaUiStore = create<TarkaUiState>((set) => {
  const getInitialActivePage = (): TopLevelPage => {
    if (typeof window === "undefined") return "workspaces";
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page") || params.get("mode");
    if (page === "benchmark" || page === "lab" || params.get("benchmark") === "true") return "benchmark";
    const view = params.get("view");
    if (view && view !== "workspace") return "workbench";
    if (page === "workbench" || page === "case" || params.get("stage")) return "workbench";
    if (page === "workspaces" || page === "workspace") return "workspaces";
    return "workspaces";
  };

  const initialCollapsed = typeof window !== "undefined"
    ? localStorage.getItem("tarka_sidebar_collapsed") === "true" || true
    : true;

  const initialDensity = typeof window !== "undefined" && window.innerHeight < 780
    ? "compact"
    : "comfortable";

  return {
    activePage: getInitialActivePage(),
    setActivePage: (page) => set({ activePage: page }),

    activeDiscoveredCluster: null,
    setActiveDiscoveredCluster: (cluster) => set({ activeDiscoveredCluster: cluster }),

    sidebarCollapsed: initialCollapsed,
    setSidebarCollapsed: (collapsed) => {
      localStorage.setItem("tarka_sidebar_collapsed", String(collapsed));
      set({ sidebarCollapsed: collapsed });
    },
    toggleSidebar: () =>
      set((state) => {
        const next = !state.sidebarCollapsed;
        localStorage.setItem("tarka_sidebar_collapsed", String(next));
        return { sidebarCollapsed: next };
      }),

    activeDockTab: "rrn",
    setActiveDockTab: (tab) => set({ activeDockTab: tab }),
    dockOpenMobile: false,
    setDockOpenMobile: (open) => set({ dockOpenMobile: open }),
    proofStepIndex: 0,
    setProofStepIndex: (idx) => set({ proofStepIndex: idx }),

    hoveredEvidenceId: null,
    setHoveredEvidenceId: (id) => set({ hoveredEvidenceId: id }),
    selectedRowSeq: null,
    setSelectedRowSeq: (seq) => set({ selectedRowSeq: seq }),

    density: initialDensity,
    setDensity: (d) => set({ density: d }),
    toggleDensity: () =>
      set((state) => ({ density: state.density === "compact" ? "comfortable" : "compact" })),

    presentationMode: false,
    setPresentationMode: (mode) => set({ presentationMode: mode }),
    togglePresentationMode: () => set((state) => ({ presentationMode: !state.presentationMode })),

    explainSimply: false,
    setExplainSimply: (val) => set({ explainSimply: val }),
    toggleExplainSimply: () => set((state) => ({ explainSimply: !state.explainSimply })),

    commandPaletteOpen: false,
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

    benchmarkLabOpen: false,
    setBenchmarkLabOpen: (open) => set({ benchmarkLabOpen: open }),
    toggleBenchmarkLab: () => set((state) => ({ benchmarkLabOpen: !state.benchmarkLabOpen })),

    publicDatasetModalOpen: false,
    setPublicDatasetModalOpen: (open) => set({ publicDatasetModalOpen: open }),
    togglePublicDatasetModal: () => set((state) => ({ publicDatasetModalOpen: !state.publicDatasetModalOpen })),

    reconstructedInvestigation: null,
    setReconstructedInvestigation: (inv) => set({ reconstructedInvestigation: inv }),
    selectedEvidenceEdge: null,
    setSelectedEvidenceEdge: (edge) => set({ selectedEvidenceEdge: edge, relationshipSheetOpen: !!edge }),
    relationshipSheetOpen: false,
    setRelationshipSheetOpen: (open) => set({ relationshipSheetOpen: open }),
    intelligenceBriefOpen: false,
    setIntelligenceBriefOpen: (open) => set({ intelligenceBriefOpen: open }),
    transformationAuditModalOpen: false,
    setTransformationAuditModalOpen: (open) => set({ transformationAuditModalOpen: open }),
  };
});
