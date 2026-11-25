import type { CaseWorkspace } from "../context/TarkaGlobalContext";
import { findCase } from "../fixtures/cases";
import { selectAccountFlows, selectFinancialSummary, TYPOLOGY_LABELS } from "./caseSelectors";
import { selectCaseActionFinancials } from "./actionSelectors";

export interface DashboardFinancialMetrics {
  totalCases: number;
  goldenHourActiveCount: number;
  totalReportedLossInr: number;
  totalRecoverableInr: number;
  totalFrozenInr: number;
  recoveryPercentage: number;
  totalSuspectAccounts: number;
  totalCrossFirLinks: number;
}

export interface ActNowQueueItem {
  caseId: string;
  firNumber: string;
  complainantName: string;
  policeStation: string;
  urgentActionTitle: string;
  recoverableInr: number;
  slaMinsRemaining: number;
  priority: string;
  status: string;
  targetRoute: "report" | "intake" | "network";
}

export interface IndiaMuleArc {
  id: string;
  caseId: string;
  firNumber: string;
  originState: string;
  originCoords: [number, number]; // [lat, lng]
  originCity: string;
  targetState: string;
  targetCoords: [number, number];
  targetCity: string;
  amountInr: number;
  muleName: string;
  bankName: string;
  isGoldenHour: boolean;
}

export interface TypologyCount {
  typology: string;
  count: number;
  lossInr: number;
  color: string;
}

export interface BankMuleCount {
  bankName: string;
  muleAccountCount: number;
  totalTraffickedInr: number;
  frozenRatio: number; // 0 to 1
}

/**
 * Pure Dashboard KPI Selector: Computes sums across cases strictly from per-case selectors.
 */
export function selectDashboardFinancials(cases: CaseWorkspace[]): DashboardFinancialMetrics {
  if (!cases || cases.length === 0) {
    return {
      totalCases: 0,
      goldenHourActiveCount: 0,
      totalReportedLossInr: 0,
      totalRecoverableInr: 0,
      totalFrozenInr: 0,
      recoveryPercentage: 0,
      totalSuspectAccounts: 0,
      totalCrossFirLinks: 0,
    };
  }

  let totalReportedLossInr = 0;
  let totalRecoverableInr = 0;
  let totalFrozenInr = 0;
  let goldenHourActiveCount = 0;
  let totalSuspectAccounts = 0;
  let totalCrossFirLinks = 0;

  cases.forEach((c) => {
    const isCanonical = !!findCase(c.caseId);
    const fin = isCanonical ? selectCaseActionFinancials(c.caseId) : null;
    const booked = fin ? fin.bookedLossInr : c.bookedLossInr || 0;
    const recoverable = fin ? fin.recoverableLibrInr : c.recoverableInr || 0;
    const frozen = fin ? fin.frozenAmountInr : (c as any).frozenAmountInr || 0;
    const remainingMins = fin ? fin.goldenHourRemainingMins : c.goldenHourRemainingMins || 0;

    totalReportedLossInr += booked;
    totalRecoverableInr += recoverable;
    totalFrozenInr += frozen;

    if (remainingMins > 0 && c.status !== "CLOSED" && c.status !== "ARCHIVED") {
      goldenHourActiveCount += 1;
    }

    // Suspect accounts from canonical fixture if available
    const canonical = findCase(c.caseId);
    if (canonical) {
      totalSuspectAccounts += canonical.accounts.filter(
        (a) => a.holderType === "LAYER_1_MULE" || a.holderType === "LAYER_2_CONDUIT" || a.holderType === "UNRESOLVED_SUBSCRIBER"
      ).length;
    } else {
      totalSuspectAccounts += (c as any).accountsCount || 0;
    }

    totalCrossFirLinks += c.syndicateLinks?.length || 0;
  });

  const recoveryPercentage =
    totalReportedLossInr > 0 ? Math.round((totalRecoverableInr / totalReportedLossInr) * 100) : 0;

  return {
    totalCases: cases.length,
    goldenHourActiveCount,
    totalReportedLossInr,
    totalRecoverableInr,
    totalFrozenInr,
    recoveryPercentage,
    totalSuspectAccounts,
    totalCrossFirLinks,
  };
}

/** Open cases the Act-now queue leaves out because they hold no amounts yet (see selectActNowQueue). */
export function selectNeedsDataCases(cases: CaseWorkspace[]): CaseWorkspace[] {
  const queued = new Set(selectActNowQueue(cases).map((i) => i.caseId));
  return cases.filter((c) => c.status !== "CLOSED" && c.status !== "ARCHIVED" && !queued.has(c.caseId));
}

/**
 * Derives the priority "Act Now" queue sorted by urgency (remaining SLA and recoverable value).
 */
export function selectActNowQueue(cases: CaseWorkspace[]): ActNowQueueItem[] {
  const items: ActNowQueueItem[] = [];

  cases.forEach((c) => {
    if (c.status === "CLOSED" || c.status === "ARCHIVED") return;

    const canonical = findCase(c.caseId);
    const fin = canonical
      ? selectCaseActionFinancials(c.caseId)
      : ({ goldenHourRemainingMins: c.goldenHourRemainingMins || 0, pendingFreezeInr: 0, recoverableLibrInr: c.recoverableInr || 0, isFullyFrozen: false } as ReturnType<typeof selectCaseActionFinancials>);
    const victimName = canonical ? canonical.complainant.name : c.complainantName || "Complainant";

    const sla = fin.goldenHourRemainingMins;
    const recoverable = fin.pendingFreezeInr > 0 ? fin.pendingFreezeInr : fin.recoverableLibrInr;

    let urgentTitle = "Issue Statutory §106/§107 BNSS Freeze Directives";
    if (c.status === "DRAFT" || c.status === "INTAKE") {
      urgentTitle = "Ingest Bank CBS Statement & NPCI XML Switch Logs";
    } else if (fin.isFullyFrozen) {
      urgentTitle = "Generate Certified BSA §63 Electronic Evidence Report";
    }

    // Nothing to act on yet (no money, no clock): listed under "Needs data" instead of the queue.
    if (recoverable <= 0 && sla <= 0) return;

    items.push({
      caseId: c.caseId,
      firNumber: c.firNumber,
      complainantName: victimName,
      policeStation: c.policeStation,
      urgentActionTitle: urgentTitle,
      recoverableInr: recoverable,
      slaMinsRemaining: sla,
      priority: c.priority,
      status: c.status || "INVESTIGATING",
      targetRoute: fin.isFullyFrozen ? "report" : c.status === "INTAKE" ? "intake" : "report",
    });
  });

  // Sort: active golden hour first, then by shortest SLA remaining, then by recoverable loss
  return items.sort((a, b) => {
    if (a.slaMinsRemaining > 0 && b.slaMinsRemaining <= 0) return -1;
    if (a.slaMinsRemaining <= 0 && b.slaMinsRemaining > 0) return 1;
    if (a.slaMinsRemaining > 0 && b.slaMinsRemaining > 0) {
      return a.slaMinsRemaining - b.slaMinsRemaining;
    }
    return b.recoverableInr - a.recoverableInr;
  });
}

/**
 * Builds geographical origin-to-destination flow arcs across Indian states for ECharts or SVG map.
 */
export function selectIndiaMuleFlows(cases: CaseWorkspace[]): IndiaMuleArc[] {
  // Geography is case metadata; every amount, mule and bank below comes from the case bundle.
  const GEO: Record<string, Pick<IndiaMuleArc, "originState" | "originCity" | "originCoords" | "targetState" | "targetCity" | "targetCoords">> = {
    "CASE-2026-001": { originState: "Uttar Pradesh", originCity: "Noida / Delhi-NCR", originCoords: [28.5355, 77.391], targetState: "Haryana / Rajasthan", targetCity: "Mewat Syndicate Hub", targetCoords: [27.9944, 76.9635] },
    "CASE-2026-002": { originState: "Telangana", originCity: "Hyderabad Cyberabad", originCoords: [17.385, 78.4867], targetState: "Karnataka", targetCity: "Bangalore Outer Ring", targetCoords: [12.9716, 77.5946] },
    "CASE-2026-003": { originState: "Maharashtra", originCity: "Mumbai BKC", originCoords: [19.0657, 72.8687], targetState: "Gujarat", targetCity: "Surat Diamond Bourse", targetCoords: [21.1702, 72.8311] },
    "CASE-2026-004": { originState: "Karnataka", originCity: "Bengaluru South", originCoords: [12.925, 77.5938], targetState: "Delhi NCT", targetCity: "Janakpuri Foreign Exchange", targetCoords: [28.6219, 77.0878] },
  };
  const arcs: IndiaMuleArc[] = [];
  cases.forEach((w, i) => {
    const c = findCase(w.caseId);
    const geo = GEO[w.caseId];
    if (!c || !geo) return;
    const fin = selectCaseActionFinancials(w.caseId);
    const lead = selectAccountFlows(c).find((a) => a.role === "MULE") ?? selectAccountFlows(c).find((a) => a.role === "CONDUIT");
    arcs.push({
      id: `arc-${String(i + 1).padStart(3, "0")}`,
      caseId: c.caseId,
      firNumber: c.firNumber,
      ...geo,
      amountInr: fin.bookedLossInr,
      muleName: lead ? `${lead.holderName} (${lead.bank} ${lead.accountMasked})` : "Unidentified",
      bankName: lead?.bank ?? "Unknown",
      isGoldenHour: fin.goldenHourRemainingMins > 0,
    });
  });
  return arcs;
}

/**
 * Derives case distribution by typology.
 */
export function selectTypologyDistribution(cases: CaseWorkspace[]): TypologyCount[] {
  const map: Record<string, { count: number; lossInr: number; color: string }> = {
    DIGITAL_ARREST: { count: 0, lossInr: 0, color: "#EF4444" },
    APK_SIM_SWAP: { count: 0, lossInr: 0, color: "#0EA5E9" },
    CORPORATE_BEC: { count: 0, lossInr: 0, color: "#10B981" },
    TASK_FRAUD: { count: 0, lossInr: 0, color: "#F59E0B" },
    INVESTMENT_SCAM: { count: 0, lossInr: 0, color: "#8B5CF6" },
    LOAN_APP_EXTORTION: { count: 0, lossInr: 0, color: "#06B6D4" },
    OTHER: { count: 0, lossInr: 0, color: "#64748B" },
  };

  cases.forEach((c) => {
    const canonical = findCase(c.caseId);
    const typ = canonical?.typology || (c as any).crimeType || (c as any).crime_type || c.typology || "OTHER";
    const loss = canonical ? selectFinancialSummary(canonical).bookedLossInr : c.bookedLossInr || 0;
    if (map[typ]) {
      map[typ].count += 1;
      map[typ].lossInr += loss;
    } else {
      map.OTHER.count += 1;
      map.OTHER.lossInr += loss;
    }
  });

  return Object.entries(map)
    .filter(([_, v]) => v.count > 0)
    .map(([k, v]) => ({
      typology: (TYPOLOGY_LABELS as Record<string, string>)[k] ?? k.replace(/_/g, " "),
      count: v.count,
      lossInr: v.lossInr,
      color: v.color,
    }));
}

/**
 * Aggregates top banks handling mule accounts.
 */
export function selectTopBanksByMules(cases: CaseWorkspace[]): BankMuleCount[] {
  const norm = (bank: string) =>
    bank.includes("Axis") ? "Axis Bank"
    : bank.includes("HDFC") ? "HDFC Bank"
    : bank.includes("ICICI") ? "ICICI Bank"
    : bank.includes("State Bank") || bank.includes("SBI") ? "State Bank of India"
    : bank.includes("Punjab") || bank.includes("PNB") ? "Punjab National Bank"
    : bank.replace(/ (Corporate|Escrow)$/, "");
  const acc: Record<string, { mules: number; inflow: number; frozen: number }> = {};
  cases.forEach((w) => {
    const c = findCase(w.caseId);
    if (!c) return;
    selectAccountFlows(c)
      .filter((a) => a.role === "MULE" || a.role === "CONDUIT" || a.role === "UNRESOLVED")
      .forEach((a) => {
        const k = norm(a.bank);
        const e = (acc[k] ||= { mules: 0, inflow: 0, frozen: 0 });
        e.mules += 1;
        e.inflow += a.inflowInr;
        e.frozen += a.frozenInr;
      });
  });
  return Object.entries(acc)
    .map(([bankName, e]) => ({
      bankName,
      muleAccountCount: e.mules,
      totalTraffickedInr: e.inflow,
      frozenRatio: e.inflow > 0 ? Math.min(1, e.frozen / e.inflow) : 0,
    }))
    .sort((a, b) => b.totalTraffickedInr - a.totalTraffickedInr);
}
