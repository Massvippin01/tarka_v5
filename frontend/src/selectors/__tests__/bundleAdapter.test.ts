import { beforeEach, describe, expect, it, vi } from "vitest";
import { bundleToCaseFixture, loadBundleCase, withBundleFigures, withSummaryFigures, type StationSummary, type BackendBundle, type BackendNetworks } from "../bundleAdapter";
import { selectAccountFlows, selectFinancialSummary, resolveCase } from "../caseSelectors";
import { CANONICAL_CASES, findCase, getCanonicalCase } from "../../fixtures/cases";
import { useBundleCaseStore } from "../../store/useBundleCaseStore";
import apiClient from "../../api/client";
import { selectDashboardFinancials } from "../dashboardSelectors";
import { INITIAL_CASE_WORKSPACES } from "../../context/TarkaGlobalContext";
import { uploadOnlyWorkspace } from "../../services/caseSyncBridge";

const EMPTY: BackendBundle = { caseId: "CASE-2026-LIVE-001", bookedLossInr: 0, nodes: [], edges: [] };

const DERIVED: BackendBundle = {
  caseId: "C201",
  nodes: [
    { id: "N1", label: "victim1@okaxis" },
    { id: "N2", label: "mule1@ybl" },
    { id: "N3", label: "cashout9@ibl" },
  ],
  edges: [
    { id: "E1", source: "N1", target: "N2", amountInr: 50000, txnCount: 2, firstSeenEpoch: 1790000000 },
    { id: "E2", source: "N2", target: "N3", amountInr: 49000, txnCount: 1, firstSeenEpoch: 1790001000 },
  ],
};

const NETWORKS: BackendNetworks = {
  networks: [
    {
      members: [
        { id: "victim1@okaxis", label: "victim1@okaxis", role: "VICTIM" },
        { id: "mule1@ybl", label: "mule1@ybl", role: "MULE" },
        { id: "cashout9@ibl", label: "cashout9@ibl", role: "CASH_OUT" },
      ],
    },
  ],
};

function reconciles(id: string) {
  const s = selectFinancialSummary(resolveCase(id)!);
  expect(s.recoverableInr + s.unrecoverableCashoutInr + s.unaccountedInr).toBe(s.bookedLossInr);
}

beforeEach(() => useBundleCaseStore.setState({ cases: {} }));

describe("bundleToCaseFixture", () => {
  it("maps an empty bundle to a case with no accounts and zero money", () => {
    const f = bundleToCaseFixture(EMPTY);
    expect(f.caseId).toBe("CASE-2026-LIVE-001");
    expect(f.accounts).toEqual([]);
    expect(f.transactions).toEqual([]);
    expect(Object.values(f.financials).every((v) => v === 0)).toBe(true);
    expect(f.complainant.name).toBe("");
  });

  it("maps a derived bundle: parties, roles, flows and booked loss from victim outflow", () => {
    const f = bundleToCaseFixture(DERIVED, NETWORKS);
    expect(f.accounts.map((a) => [a.holderName, a.holderType])).toEqual([
      ["victim1@okaxis", "VICTIM"],
      ["mule1@ybl", "LAYER_1_MULE"],
      ["cashout9@ibl", "LAYER_3_SINK"],
    ]);
    expect(f.accounts.every((a) => a.evidenceStatus !== "VERIFIED_ACCUSED")).toBe(true);
    expect(f.transactions.map((t) => [t.fromName, t.toName, t.amount, t.category])).toEqual([
      ["victim1@okaxis", "mule1@ybl", 50000, "VICTIM_DRAIN"],
      ["mule1@ybl", "cashout9@ibl", 49000, "ATM_CASHOUT"],
    ]);
    expect(f.financials.bookedLossInr).toBe(50000);
    expect(f.financials.unrecoverableCashoutInr).toBe(49000);
    expect(f.complainant.name).toBe("victim1@okaxis");

    useBundleCaseStore.getState().put(f);
    const flows = selectAccountFlows(resolveCase("C201")!);
    expect(flows.find((a) => a.holderName === "mule1@ybl")).toMatchObject({ inflowInr: 50000, outflowInr: 49000 });
    reconciles("C201");
  });

  it("without roles, booked loss falls back to the case record, never another case", () => {
    const f = bundleToCaseFixture({ ...DERIVED, bookedLossInr: 12345 });
    expect(f.accounts.every((a) => a.holderType === "UNRESOLVED_SUBSCRIBER")).toBe(true);
    expect(f.financials.bookedLossInr).toBe(12345);
  });
});

describe("fixture passthrough and lookup", () => {
  it("returns demo fixtures untouched and never fetches them", () => {
    const get = vi.spyOn(apiClient, "get");
    useBundleCaseStore.getState().put(bundleToCaseFixture({ ...DERIVED, caseId: "CASE-2026-001" }, NETWORKS));
    expect(findCase("CASE-2026-001")).toBe(CANONICAL_CASES["CASE-2026-001"]);
    expect(get).not.toHaveBeenCalled();
    get.mockRestore();
  });

  it("unknown case resolves to null (no fallback); loaded bundle case resolves to itself", async () => {
    expect(resolveCase("C201")).toBeNull();
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/bundle")) return { data: DERIVED };
      return { data: NETWORKS };
    });
    await loadBundleCase("C201");
    expect(resolveCase("C201")!.caseId).toBe("C201");
    expect(getCanonicalCase("C201").accounts).toHaveLength(3);
    get.mockRestore();
  });
});

describe("case isolation", () => {
  it("switching between the demo case and an uploaded case changes every number", () => {
    useBundleCaseStore.getState().put(bundleToCaseFixture(DERIVED, NETWORKS));
    const demo = selectFinancialSummary(resolveCase("CASE-2026-001")!) as unknown as Record<string, unknown>;
    const uploaded = selectFinancialSummary(resolveCase("C201")!) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(demo)) {
      if (typeof v === "number" && v !== 0) expect(uploaded[k], k).not.toBe(v);
    }
    const demoParties = new Set(resolveCase("CASE-2026-001")!.accounts.map((a) => a.holderName));
    expect(resolveCase("C201")!.accounts.some((a) => demoParties.has(a.holderName))).toBe(false);
    reconciles("CASE-2026-001");
  });
});

describe("Command Center headline", () => {
  it("adds an uploaded case's own loss and cash-out to the portfolio totals", () => {
    const before = selectDashboardFinancials(INITIAL_CASE_WORKSPACES);
    useBundleCaseStore.getState().put(bundleToCaseFixture(DERIVED, NETWORKS));
    const rows = withBundleFigures([...INITIAL_CASE_WORKSPACES, uploadOnlyWorkspace("C201")], useBundleCaseStore.getState().cases);
    const after = selectDashboardFinancials(rows);
    expect(after.totalCases).toBe(before.totalCases + 1);
    expect(after.totalReportedLossInr).toBe(before.totalReportedLossInr + 50000);
    expect(after.totalRecoverableInr).toBe(before.totalRecoverableInr);
    expect(rows.at(-1)).toMatchObject({ caseId: "C201", bookedLossInr: 50000, complainantName: "victim1@okaxis" });
  });
});

describe("Station summary", () => {
  const summary: StationSummary = {
    totals: {},
    cases: [{
      caseId: "C201", complainantName: "victim1@okaxis", claimedLossInr: 0, bookedLossInr: 50000, recoverableInr: 20000, cashedOutInr: 30000,
      frozenInr: 5000, mules: 3, networks: 1, crossCaseHits: 0, analysis: "ready", goldenHour: { active: true, remainingMins: 42, expired: false },
    }],
  };

  it("feeds the portfolio totals and act-now figures of uploaded cases from one response, leaving demo cases alone", () => {
    const base = [...INITIAL_CASE_WORKSPACES, uploadOnlyWorkspace("C201")];
    const rows = withSummaryFigures(base, summary);
    expect(rows.slice(0, -1)).toEqual(INITIAL_CASE_WORKSPACES);
    expect(rows.at(-1)).toMatchObject({ bookedLossInr: 50000, recoverableInr: 20000, frozenAmountInr: 5000, goldenHourRemainingMins: 42, accountsCount: 3 });
    const before = selectDashboardFinancials(INITIAL_CASE_WORKSPACES);
    const after = selectDashboardFinancials(rows);
    expect(after.totalReportedLossInr).toBe(before.totalReportedLossInr + 50000);
    expect(after.totalFrozenInr).toBe(before.totalFrozenInr + 5000);
    expect(after.goldenHourActiveCount).toBe(before.goldenHourActiveCount + 1);
    expect(withSummaryFigures(base, undefined)).toBe(base);
  });
});

describe("uploaded-data bundles (dataSource UPLOADED)", () => {
  it("writes times in the fixture format the screens parse", async () => {
    const { toIst } = await import("../bundleAdapter");
    expect(toIst(1790000000)).toEqual({ utc: "2026-09-21T14:13:20Z", ist: "2026-09-21 19:43:20 IST" });
    expect(toIst(null)).toEqual({ utc: "", ist: "" });
  });

  it("uses the backend's reconciled split and matches roles ignoring case/spaces", () => {
    const f = bundleToCaseFixture(
      { ...DERIVED, dataSource: "UPLOADED", bookedLossInr: 50000, cashedOutInr: 49000, recoverableLibrInr: 1000, unaccountedInr: 0,
        nodes: DERIVED.nodes.map((n) => (n.id === "N2" ? { ...n, label: " MULE1@ybl " } : n)) },
      NETWORKS,
    );
    expect(f.financials.bookedLossInr).toBe(50000);
    expect(f.financials.unrecoverableCashoutInr + f.financials.recoverableLibrInr).toBe(50000);
    expect(f.accounts.find((a) => a.nodeId === "N2")?.holderType).toBe("LAYER_1_MULE");
  });
});
