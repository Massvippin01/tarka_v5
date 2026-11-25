import { create } from "zustand";

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
  return "CASE-2026-001";
}

export function getInitialViewFromUrl(): string {
  if (typeof window === "undefined") return "workspace";
  const params = new URLSearchParams(window.location.search);
  const v = params.get("view") || params.get("screen");
  if (v) return v;
  return "workspace";
}

export const useCaseStore = create<CaseStoreState>((set) => ({
  activeCaseId: getInitialCaseIdFromUrl(),
  activeView: getInitialViewFromUrl(),
  cases: [],
  setActiveCaseId: (caseId) => {
    set({ activeCaseId: caseId });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (caseId) {
        url.searchParams.set("case", caseId);
      } else {
        url.searchParams.delete("case");
      }
      window.history.replaceState({}, "", url.toString());
    }
  },
  setActiveView: (view) => {
    set({ activeView: view });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState({}, "", url.toString());
    }
  },
  setCases: (cases) => set({ cases })
}));

/**
 * Hook to synchronize browser URL changes (popstate, back/forward) with useCaseStore
 */
export function useUrlSync() {
  const { activeCaseId, activeView } = useCaseStore();

  const syncFromUrl = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get("case");
    const v = params.get("view") || params.get("screen") || "workspace";

    if (c !== activeCaseId) {
      useCaseStore.setState({ activeCaseId: c });
    }
    if (v !== activeView) {
      useCaseStore.setState({ activeView: v });
    }
  };

  return {
    activeCaseId,
    activeView,
    navigateCase: (newCaseId: string | null, newView?: string) => {
      const targetView = newView || useCaseStore.getState().activeView || "intake";
      useCaseStore.setState({ activeCaseId: newCaseId, activeView: targetView });
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (newCaseId) {
          url.searchParams.set("case", newCaseId);
        } else {
          url.searchParams.delete("case");
        }
        url.searchParams.set("view", targetView);
        window.history.pushState({}, "", url.toString());
      }
    },
    navigateView: (targetView: string) => {
      useCaseStore.setState({ activeView: targetView });
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("view", targetView);
        window.history.pushState({}, "", url.toString());
      }
    },
    syncFromUrl
  };
}
