/**
 * The one place that turns a backend case bundle (GET /cases/{id}/bundle, built from uploaded
 * statements) into the CanonicalCaseFixture shape every selector already consumes.
 * Built-in demo fixtures pass through untouched, so screens never branch on where data came from.
 */
import { useQueries, useQuery } from "@tanstack/react-query";
import { fetchNetworks, fetchRawBundle } from "../api/caseQueries";
import { CANONICAL_CASES, type CanonicalCaseAccount, type CanonicalCaseFixture, type CanonicalCaseTransaction } from "../fixtures/cases";
import { useBundleCaseStore } from "../store/useBundleCaseStore";

export interface BackendBundleNode {
  id: string;
  label: string;
  entityType?: string;
}

export interface BackendBundleEdge {
  id: string;
  source: string;
  target: string;
  amountInr: number;
  txnCount?: number;
  firstSeenEpoch?: number | null;
}

export interface BackendBundle {
  caseId: string;
  firNumber?: string;
  policeStation?: string;
  complainantName?: string;
  claimedLossInr?: number;
  bookedLossInr?: number;
  recoverableLibrInr?: number;
  shieldedCommercialInr?: number;
  /** Uploaded-data cases: reconciled split of booked loss (cashed out + recoverable + unaccounted = booked). */
  cashedOutInr?: number;
  unaccountedInr?: number;
  title?: string;
  dataSource?: "UPLOADED";
  nodes: BackendBundleNode[];
  edges: BackendBundleEdge[];
}

export type NetworkRole = "VICTIM" | "MULE" | "CASH_OUT" | "UNKNOWN";

export interface BackendNetworks {
  networks: { members: { id: string; label: string; role: NetworkRole; hop?: number | null; held_inr?: number }[] }[];
}

const HOLDER_TYPE: Record<NetworkRole, CanonicalCaseAccount["holderType"]> = {
  VICTIM: "VICTIM",
  MULE: "LAYER_1_MULE",
  CASH_OUT: "LAYER_3_SINK",
  UNKNOWN: "UNRESOLVED_SUBSCRIBER",
};

/** Same formats as the demo fixtures: "2026-09-22T03:00:14Z" and "2026-09-22 08:30:14 IST". */
export function toIst(epochSec: number | null | undefined): { utc: string; ist: string } {
  if (!epochSec) return { utc: "", ist: "" };
  const utc = new Date(epochSec * 1000).toISOString().slice(0, 19) + "Z";
  const ist = new Date((epochSec + 5.5 * 3600) * 1000).toISOString().slice(0, 19).replace("T", " ");
  return { utc, ist: `${ist} IST` };
}

const partyKey = (label: string) => label.trim().toLowerCase(); // backend auto-merges on lower(trim())

/** Pure mapping: bundle (+ optional network roles) → fixture shape. Unknown figures stay 0 / empty. */
export function bundleToCaseFixture(bundle: BackendBundle, networks?: BackendNetworks | null): CanonicalCaseFixture {
  const memberByParty = new Map<string, { role: NetworkRole; hop?: number | null; held_inr?: number }>();
  networks?.networks.forEach((n) => n.members.forEach((m) => memberByParty.set(partyKey(m.label), m)));

  const accounts: CanonicalCaseAccount[] = bundle.nodes.map((n) => {
    const member = memberByParty.get(partyKey(n.label));
    const role = member?.role ?? "UNKNOWN";
    // Mules more than one hop from a victim are second-layer conduits.
    const holderType = role === "MULE" && (member?.hop ?? 1) > 1 ? "LAYER_2_CONDUIT" : HOLDER_TYPE[role];
    return {
      nodeId: n.id,
      holderName: n.label,
      holderType,
      bank: "",
      accountMasked: n.label,
      accountNumber: n.label,
      ifsc: "",
      panMasked: "",
      // Roles from the mule score are leads, not verified accusations.
      evidenceStatus: role === "VICTIM" ? "VICTIM" : "INSUFFICIENT_EVIDENCE",
      // Balance still in a suspected mule = what a §107 freeze can catch (nothing is frozen until a bank confirms).
      frozenBalance: member?.held_inr ?? 0,
    };
  });
  const byId = new Map(accounts.map((a) => [a.nodeId, a]));

  const transactions: CanonicalCaseTransaction[] = bundle.edges.map((e, i) => {
    const from = byId.get(e.source);
    const to = byId.get(e.target);
    const { utc, ist } = toIst(e.firstSeenEpoch);
    const fromName = from?.holderName ?? e.source;
    const toName = to?.holderName ?? e.target;
    return {
      id: e.id,
      sequenceNo: i + 1,
      timestampUtc: utc,
      timestampIst: ist,
      fromAccount: fromName,
      toAccount: toName,
      fromName,
      toName,
      amount: e.amountInr,
      // shortcut: rail is guessed from the identifier (VPA → UPI); use the statement's own column once the parser keeps it.
      paymentRail: fromName.includes("@") || toName.includes("@") ? "UPI" : "IMPS",
      rrn: "",
      category: from?.holderType === "VICTIM" ? "VICTIM_DRAIN" : to?.holderType === "LAYER_3_SINK" ? "ATM_CASHOUT" : "LAYERING",
      // (uploaded bundles only carry flows touching a suspected mule, so a victim's edge here is money into a mule)
      channel: "",
      particulars: `${e.txnCount ?? 1} statement row(s) combined`,
    };
  });

  // Booked loss = money that left victims, when roles are known; otherwise whatever the case record holds.
  const victimOutflow = transactions.filter((t) => t.category === "VICTIM_DRAIN").reduce((s, t) => s + t.amount, 0);
  const cashedOut = transactions.filter((t) => t.category === "ATM_CASHOUT").reduce((s, t) => s + t.amount, 0);
  // Uploaded-data bundles carry the backend's reconciled split; use it as-is so every screen agrees with Triage.
  const uploaded = bundle.dataSource === "UPLOADED";
  const bookedLossInr = uploaded ? bundle.bookedLossInr ?? 0 : victimOutflow || bundle.bookedLossInr || 0;
  const victim = accounts.find((a) => a.holderType === "VICTIM");

  return {
    caseId: bundle.caseId,
    firNumber: bundle.firNumber ?? "",
    policeStation: bundle.policeStation ?? "",
    ncrpAckNo: "",
    title: bundle.title ?? "",
    typology: "UNCLASSIFIED",
    priority: "HIGH_SYNDICATE",
    currentStage: "intake",
    leadInvestigator: "",
    complainant: {
      name: bundle.complainantName || victim?.holderName || "",
      phone: "",
      bank: "",
      accountMasked: victim?.accountMasked ?? "",
      accountNumber: victim?.accountNumber ?? "",
      ifsc: "",
      panMasked: "",
      openingBalance: 0,
    },
    receiptClaim: { claimedAmount: bundle.claimedLossInr ?? 0, label: "", discrepancyNote: "" },
    financials: {
      bookedLossInr,
      claimedLossInr: bundle.claimedLossInr ?? 0,
      recoverableLibrInr: bundle.recoverableLibrInr ?? 0,
      shieldedCommercialInr: bundle.shieldedCommercialInr ?? 0,
      frozenMuleBalanceInr: 0,
      // Capped so recoverable + cash-out + unaccounted always equals booked loss.
      unrecoverableCashoutInr: uploaded
        ? bundle.cashedOutInr ?? 0
        : Math.min(cashedOut, Math.max(0, bookedLossInr - (bundle.recoverableLibrInr ?? 0))),
      goldenHourRemainingMins: 0,
    },
    accounts,
    transactions,
    timelineEvents: [],
    syndicateLinks: [],
  };
}

/** Fetch bundle + network roles and register the mapped case so resolveCase()/findCase() see it. */
export async function loadBundleCase(caseId: string): Promise<CanonicalCaseFixture> {
  const [bundle, networks] = await Promise.all([
    fetchRawBundle<BackendBundle>(caseId),
    fetchNetworks<BackendNetworks>(caseId).catch(() => null), // roles are optional; the graph still renders without them
  ]);
  const fixture = bundleToCaseFixture({ ...bundle, caseId }, networks);
  useBundleCaseStore.getState().put(fixture);
  return fixture;
}

export function bundleCaseQueryKey(caseId: string | null | undefined) {
  return ["case", caseId, "bundle-fixture"] as const;
}

/** Active case data for any screen: demo fixture as-is, else the backend bundle via TanStack Query. */
export function useCaseFixture(caseId: string | null | undefined) {
  const seeded = caseId ? CANONICAL_CASES[caseId] : undefined;
  const q = useQuery({
    queryKey: bundleCaseQueryKey(caseId),
    queryFn: () => loadBundleCase(caseId!),
    enabled: !!caseId && !seeded,
    staleTime: 30_000,
    retry: false,
  });
  return { fixture: seeded ?? q.data ?? null, isLoading: !seeded && q.isLoading, error: seeded ? null : q.error };
}

/** Portfolio views: load every listed case that has no demo fixture, so its totals come from its own bundle. */
export function useBundleCases(caseIds: string[]): Record<string, CanonicalCaseFixture> {
  useQueries({
    queries: caseIds
      .filter((id) => !CANONICAL_CASES[id])
      .map((id) => ({ queryKey: bundleCaseQueryKey(id), queryFn: () => loadBundleCase(id), staleTime: 30_000, retry: false })),
  });
  return useBundleCaseStore((s) => s.cases);
}

/** Workspace rows for uploaded-data cases take their figures from the bundle (the record's own fields stay for demo cases). */
export function withBundleFigures<W extends { caseId: string; complainantName: string; bookedLossInr: number; claimedLossInr: number; recoverableInr: number }>(
  workspaces: W[],
  bundleCases: Record<string, CanonicalCaseFixture>
): W[] {
  return workspaces.map((w) => {
    const f = !CANONICAL_CASES[w.caseId] ? bundleCases[w.caseId] : undefined;
    if (!f) return w;
    return {
      ...w,
      complainantName: w.complainantName || f.complainant.name,
      bookedLossInr: f.financials.bookedLossInr,
      claimedLossInr: f.financials.claimedLossInr,
      recoverableInr: f.financials.recoverableLibrInr,
    };
  });
}
