import { create } from "zustand";
import { DEFAULT_VIEW, parseUrlState, pushUrlState } from "../lib/urlState";

export interface CaseListItem {
  id: string;
  case_number?: string;
  fir_number: string;
  title?: string;
  victim_name?: string;
  status: string;
  priority?: string;
  typology?: string;
  total_loss?: number;
  recovered_amount?: number;
  assigned_io?: string;
  created_at?: string;
}

interface CaseStoreState {
  activeCaseId: string | null;
  activeView: string;
  cases: CaseListItem[];
  setActiveCaseId: (caseId: string | null) => void;
  setActiveView: (view: string) => void;
  setCases: (cases: CaseListItem[]) => void;
}

export const KNOWN_VALID_CASES = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];

export function getInitialCaseIdFromUrl(): string | null {
  if (typeof window === "undefined") return "CASE-2026-001";
  const params = new URLSearchParams(window.location.search);
  const c = params.get("case");
  if (c) return c;
  return null;
}

export function getInitialViewFromUrl(): string {
  if (typeof window === "undefined") return "home";
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view") || params.get("screen");
  if (v) return v;
  return "home";
}

export const useCaseStore = create<CaseStoreState>((set) => ({
  activeCaseId: getInitialCaseIdFromUrl(),
  activeView: getInitialViewFromUrl(),
  cases: [],
  setActiveCaseId: (caseId) => {
    set({ activeCaseId: caseId });
    pushUrlState({ caseId });
  },
  setActiveView: (view) => {
    set({ activeView: view });
    pushUrlState({ view });
  },
  setCases: (cases) => set({ cases })
}));

/**
 * Hook to synchronize browser URL changes (popstate, back/forward) with useCaseStore
 */
export function useUrlSync() {
  const { activeCaseId, activeView } = useCaseStore();

  // Back/Forward: apply the URL to the store without writing history.
  const syncFromUrl = () => {
    if (typeof window === "undefined") return;
    const { view, caseId } = parseUrlState(window.location.search);
    const cur = useCaseStore.getState();
    const nextView = view || DEFAULT_VIEW;
    if (caseId !== cur.activeCaseId) useCaseStore.setState({ activeCaseId: caseId });
    if (nextView !== cur.activeView) useCaseStore.setState({ activeView: nextView });
  };

  return {
    activeCaseId,
    activeView,
    navigateCase: (newCaseId: string | null, newView?: string) => {
      const targetView = newView || useCaseStore.getState().activeView || "intake";
      useCaseStore.setState({ activeCaseId: newCaseId, activeView: targetView });
      pushUrlState({ caseId: newCaseId, view: targetView });
    },
    navigateView: (targetView: string) => {
      useCaseStore.setState({ activeView: targetView });
      pushUrlState({ view: targetView });
    },
    syncFromUrl
  };
}
