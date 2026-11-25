import { create } from "zustand";
import type { CanonicalCaseFixture } from "../fixtures/cases";

/**
 * Cases built from the backend bundle (uploaded data), keyed by case id.
 * Filled only by selectors/bundleAdapter.ts; read through findCase() in fixtures/cases.
 */
interface BundleCaseState {
  cases: Record<string, CanonicalCaseFixture>;
  put: (fixture: CanonicalCaseFixture) => void;
}

export const useBundleCaseStore = create<BundleCaseState>((set) => ({
  cases: {},
  put: (fixture) => set((s) => ({ cases: { ...s.cases, [fixture.caseId]: fixture } })),
}));
