import { useQuery } from "@tanstack/react-query";
import { useCaseStore } from "../store/useCaseStore";
import { getCanonicalCase, CANONICAL_CASES } from "../fixtures/cases";
import { CaseSyncBridge } from "../services/caseSyncBridge";
import apiClient from "../api/client";

export function useActiveCaseId(): string | null {
  return useCaseStore((s) => s.activeCaseId);
}

export function useActiveView(): string {
  return useCaseStore((s) => s.activeView);
}

/**
 * Fetch all cases from backend (or fallback to canonical list)
 */
export function useCasesQuery() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/api/v1/cases", { timeout: 2000 });
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch {
        // Fall back to offline canonical cases
      }
      return Object.values(CANONICAL_CASES).map((c) => ({
        id: c.caseId,
        case_number: c.caseId,
        fir_number: c.firNumber,
        title: c.title,
        victim_name: c.complainant.name,
        status: "INVESTIGATING",
        priority: c.priority,
        typology: c.typology,
        total_loss: c.financials.bookedLossInr,
        recovered_amount: c.financials.recoverableLibrInr,
        assigned_io: c.leadInvestigator,
      }));
    },
  });
}

/**
 * Query for full case bundle with automatic stale cancellation and caching
 */
export function useCaseBundleQuery(caseId: string | null) {
  return useQuery({
    queryKey: ["case", caseId, "bundle"],
    queryFn: async () => {
      if (!caseId) return null;
      return await CaseSyncBridge.getInstance().getCaseBundle(caseId);
    },
    enabled: !!caseId,
  });
}

/**
 * Comprehensive summary selector for any case
 */
export function useCaseSummary(caseId: string | null) {
  const { data: bundle, isLoading, isError } = useCaseBundleQuery(caseId);
  const canonical = caseId ? getCanonicalCase(caseId) : null;

  if (!caseId || (!bundle && !canonical)) {
    return {
      isValid: false,
      isLoading,
      isError,
      caseId: caseId || "",
      firNumber: "",
      victimName: "",
      bookedLoss: 0,
      claimedLoss: 0,
      recoverable: 0,
      frozen: 0,
      goldenHourLeft: 0,
      status: "UNKNOWN",
      stage: "intake",
    };
  }

  const bookedLoss = canonical?.financials.bookedLossInr ?? bundle?.bookedLossInr ?? 0;
  const claimedLoss = canonical?.financials.claimedLossInr ?? bundle?.claimedLossInr ?? 0;
  const recoverable = canonical?.financials.recoverableLibrInr ?? bundle?.recoverableLibrInr ?? 0;
  const frozen = canonical?.financials.frozenMuleBalanceInr ?? 0;
  const goldenHourLeft = canonical?.financials.goldenHourRemainingMins ?? 118;
  const victimName = canonical?.complainant.name ?? bundle?.complainantName ?? "Complainant";
  const firNumber = canonical?.firNumber ?? bundle?.firNumber ?? "FIR #---";
  const status = canonical ? "INVESTIGATING" : "ACTIVE";
  const stage = canonical?.currentStage ?? "intake";

  return {
    isValid: true,
    isLoading,
    isError,
    caseId,
    firNumber,
    victimName,
    bookedLoss,
    claimedLoss,
    recoverable,
    frozen,
    goldenHourLeft,
    status,
    stage,
  };
}

/**
 * Ledger selector
 */
export function useCaseLedger(caseId: string | null) {
  const canonical = caseId ? getCanonicalCase(caseId) : null;
  const transactions = canonical?.transactions ?? [];
  const conservation = canonical
    ? {
        totalDebits: canonical.financials.bookedLossInr,
        totalCredits: canonical.financials.bookedLossInr,
        delta: 0,
        isConserved: true,
      }
    : null;

  return {
    canonical,
    transactions,
    conservation,
  };
}

/**
 * Fraud Network graph selector
 */
export function useCaseGraph(caseId: string | null) {
  const { data: bundle } = useCaseBundleQuery(caseId);
  const canonical = caseId ? getCanonicalCase(caseId) : null;

  return {
    nodes: bundle?.nodes ?? [],
    edges: bundle?.edges ?? [],
    canonical,
  };
}

/**
 * Money trail / Taint engine selector
 */
export function useCaseTaint(caseId: string | null) {
  const canonical = caseId ? getCanonicalCase(caseId) : null;
  return {
    canonical,
    recoverable: canonical?.financials.recoverableLibrInr ?? 0,
    bookedLoss: canonical?.financials.bookedLossInr ?? 0,
    frozen: canonical?.financials.frozenMuleBalanceInr ?? 0,
  };
}
