/**
 * TARKA Reactive Case Workbench Store
 *
 * Centralized Zustand store holding the hydrated, isolated forensic state for the active case.
 * Guarantees that when an investigator switches cases (e.g. from CASE-001 to CASE-002),
 * all workbench surfaces (01-Intake through 06-Court Proof) automatically re-render
 * with the selected case's verified nodes, edges, claims, and timeline.
 */

import { create } from "zustand";
import { CaseSyncBridge } from "../services/caseSyncBridge";
import type { ReconstructedInvestigation } from "../utils/investigationReconstructor";
import type { CaseWorkspace } from "../context/TarkaGlobalContext";

interface CaseWorkbenchState {
  activeCaseId: string;
  activeInvestigation: ReconstructedInvestigation | null;
  isLoading: boolean;
  error: string | null;
  activeTab: "overview" | "workbench" | "artifacts" | "syndicate" | "timeline";

  // Actions
  setActiveCaseId: (caseId: string, caseMetadata?: CaseWorkspace) => Promise<void>;
  setActiveTab: (tab: "overview" | "workbench" | "artifacts" | "syndicate" | "timeline") => void;
  refreshActiveCase: () => Promise<void>;
}

export const useCaseWorkbenchStore = create<CaseWorkbenchState>((set, get) => ({
  activeCaseId: "CASE-2026-001",
  activeInvestigation: null,
  isLoading: false,
  error: null,
  activeTab: "overview",

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveCaseId: async (caseId: string, caseMetadata?: CaseWorkspace) => {
    set({ activeCaseId: caseId, isLoading: true, error: null });
    try {
      const bridge = CaseSyncBridge.getInstance();
      const bundle = await bridge.getCaseBundle(caseId, caseMetadata);
      set({ activeInvestigation: bundle, isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load case bundle";
      set({ error: msg, isLoading: false });
    }
  },

  refreshActiveCase: async () => {
    const { activeCaseId } = get();
    await get().setActiveCaseId(activeCaseId);
  },
}));
