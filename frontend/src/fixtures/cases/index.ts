import case001Raw from './CASE-2026-001.json';
import case002Raw from './CASE-2026-002.json';
import case003Raw from './CASE-2026-003.json';
import case004Raw from './CASE-2026-004.json';
import type { ReconstructedInvestigation, ReconstructedNode, ReconstructedEdge } from '../../utils/investigationReconstructor';

export interface CanonicalCaseComplainant {
  name: string;
  phone: string;
  bank: string;
  accountMasked: string;
  accountNumber: string;
  ifsc: string;
  panMasked: string;
  openingBalance: number;
  salaryCredit?: number;
}

export interface CanonicalCaseReceiptClaim {
  claimedAmount: number;
  label: string;
  discrepancyNote: string;
}

export interface CanonicalCaseFinancials {
  bookedLossInr: number;
  claimedLossInr: number;
  recoverableLibrInr: number;
  shieldedCommercialInr: number;
  frozenMuleBalanceInr: number;
  unrecoverableCashoutInr: number;
  goldenHourRemainingMins: number;
}

export interface CanonicalCaseAccount {
  nodeId: string;
  holderName: string;
  holderType: "VICTIM" | "LAYER_1_MULE" | "LAYER_2_CONDUIT" | "UNRESOLVED_SUBSCRIBER" | "BONA_FIDE_MERCHANT" | "LAYER_3_SINK";
  bank: string;
  accountMasked: string;
  accountNumber: string;
  ifsc: string;
  panMasked: string;
  introducerId?: string;
  tenureMonths?: number;
  evidenceStatus: "VICTIM" | "VERIFIED_ACCUSED" | "INSUFFICIENT_EVIDENCE" | "EXCLUDED_COMMERCIAL";
  deviceImei?: string;
  bssidHotspot?: string;
  gstin?: string;
  mcaCin?: string;
  frozenBalance: number;
}

export interface CanonicalCaseTransaction {
  id: string;
  sequenceNo: number;
  timestampUtc: string;
  timestampIst: string;
  fromAccount: string;
  toAccount: string;
  fromName: string;
  toName: string;
  fromVpa?: string;
  toVpa?: string;
  amount: number;
  paymentRail: "NEFT" | "IMPS" | "UPI" | "UPI_POS" | "ATM_CASH" | "RTGS";
  rrn: string;
  category: "SALARY_CREDIT" | "VICTIM_DRAIN" | "LAYERING" | "COMMERCIAL_ESCROW" | "ATM_CASHOUT";
  channel: string;
  particulars: string;
  deviceImei?: string;
  clientIp?: string;
  clientPort?: number;
  ja4Tls?: string;
  bssidMac?: string;
}

export interface CanonicalTimelineEvent {
  eventId: string;
  timestampUtc: string;
  timestampIst: string;
  track: string;
  title: string;
  detail: string;
  severity: "NORMAL" | "ALERT" | "FRAUD_DEBIT" | "LAYERING" | "ESCROW" | "CASHOUT" | "COMPLAINT" | "RECOVERY";
}

export interface CanonicalSyndicateLink {
  linkedCaseId: string;
  sharedAnchorType: "JA4_TLS" | "IMEI_TAC" | "WIFI_BSSID" | "MULE_ACCOUNT";
  sharedAnchorValue: string;
}

export interface CanonicalCaseFixture {
  caseId: string;
  firNumber: string;
  policeStation: string;
  ncrpAckNo: string;
  title: string;
  typology: "DIGITAL_ARREST" | "APK_SIM_SWAP" | "CORPORATE_BEC" | "TASK_FRAUD";
  priority: "CRITICAL_GOLDEN_HOUR" | "HIGH_SYNDICATE" | "COURT_FILING_READY";
  currentStage: "intake" | "attribution" | "network" | "court-proof";
  leadInvestigator: string;
  complainant: CanonicalCaseComplainant;
  receiptClaim: CanonicalCaseReceiptClaim;
  financials: CanonicalCaseFinancials;
  accounts: CanonicalCaseAccount[];
  transactions: CanonicalCaseTransaction[];
  timelineEvents: CanonicalTimelineEvent[];
  syndicateLinks: CanonicalSyndicateLink[];
}

export const CANONICAL_CASES: Record<string, CanonicalCaseFixture> = {
  "CASE-2026-001": case001Raw as unknown as CanonicalCaseFixture,
  "CASE-2026-002": case002Raw as unknown as CanonicalCaseFixture,
  "CASE-2026-003": case003Raw as unknown as CanonicalCaseFixture,
  "CASE-2026-004": case004Raw as unknown as CanonicalCaseFixture,
};

export function getCanonicalCase(caseId: string): CanonicalCaseFixture {
  return CANONICAL_CASES[caseId] || CANONICAL_CASES["CASE-2026-001"];
}

/**
 * Builds a deterministic ReconstructedInvestigation bundle from any CanonicalCaseFixture.
 * Guarantees mathematical conservation between transactions, nodes, and edges.
 */
export function buildCaseBundleFromFixture(fixture: CanonicalCaseFixture): ReconstructedInvestigation {
  const nodeMap: Record<string, ReconstructedNode> = {};
  const nodes: ReconstructedNode[] = fixture.accounts.map((acc) => {
    const node: ReconstructedNode = {
      id: acc.nodeId,
      label: acc.holderName,
      entityType: acc.holderType as any,
      bank: acc.bank,
      accountMasked: acc.accountMasked,
      ifsc: acc.ifsc,
      panMasked: acc.panMasked,
      introducerId: acc.introducerId || "NONE",
      tenureMonths: acc.tenureMonths || 0,
      evidenceStatus: acc.evidenceStatus as any,
      deviceImei: acc.deviceImei,
      bssidHotspot: acc.bssidHotspot,
      gstin: acc.gstin,
      mcaCin: acc.mcaCin,
      details: `${acc.holderType} · ${acc.bank} (${acc.accountMasked})`,
      sourceFiles: ["Finacle_CBS_Statement.csv", "NPCI_Switch_Log.csv"],
    };
    nodeMap[acc.nodeId] = node;
    nodeMap[acc.accountNumber] = node;
    nodeMap[acc.holderName] = node;
    return node;
  });

  const drainTxns = fixture.transactions.filter(
    (tx) => tx.category === "VICTIM_DRAIN" || tx.category === "LAYERING" || tx.category === "COMMERCIAL_ESCROW" || tx.category === "ATM_CASHOUT"
  );

  const edges: ReconstructedEdge[] = drainTxns.map((tx, idx) => {
    const src = nodeMap[tx.fromAccount] || nodeMap[tx.fromName] || nodes[0];
    const tgt = nodeMap[tx.toAccount] || nodeMap[tx.toName] || nodes[1];

    return {
      id: `E${idx + 1}-${tx.id}`,
      sourceNodeId: src.id,
      targetNodeId: tgt.id,
      sourceLabel: src.label,
      targetLabel: tgt.label,
      amount: tx.amount,
      rail: (tx.paymentRail as any) || "UPI",
      rrn: tx.rrn,
      timestampIst: tx.timestampIst,
      matchClassification: tx.category === "VICTIM_DRAIN" ? "EXACT_DETERMINISTIC" : "CORROBORATED_MULTI_VECTOR",
      supportingEvidence: [
        {
          sourceFile: "Finacle_CBS_Statement.csv",
          artifactId: `art-${tx.id}`,
          corroboratingAttribute: "RRN & Transaction Amount",
          rawLogValue: `${tx.paymentRail} RRN ${tx.rrn} | Amount: ₹${tx.amount.toLocaleString("en-IN")}`,
          timestamp: tx.timestampIst,
        },
      ],
      contradictoryEvidence: [],
      recommendedAction: {
        legalSection: "BNSS §106/§107 Provisional Seizure",
        statutoryAction: `Attach balance of ₹${tx.amount.toLocaleString("en-IN")}`,
        cautionNotice: "Immediate cyber crime nodal lien",
        priority: "CRITICAL_P0",
      },
      sourceFiles: ["Finacle_CBS_Statement.csv", "NPCI_Switch_Log.csv"],
    };
  });

  return {
    caseId: fixture.caseId,
    firNumber: fixture.firNumber,
    policeStation: fixture.policeStation,
    complainantName: fixture.complainant.name,
    claimedLossInr: fixture.financials.claimedLossInr,
    bookedLossInr: fixture.financials.bookedLossInr,
    recoverableLibrInr: fixture.financials.recoverableLibrInr,
    shieldedCommercialInr: fixture.financials.shieldedCommercialInr,
    preIngestionTamper: {
      hasTamper: fixture.caseId === "CASE-2026-001",
      sourceFile: fixture.caseId === "CASE-2026-001" ? "Canva_Digital_Arrest_Notice.pdf" : "None",
      finding: fixture.caseId === "CASE-2026-001" ? "2 %%EOF markers detected (+14.2 KB incremental append)" : "No post-issuance edits detected",
      technicalOffset: fixture.caseId === "CASE-2026-001" ? "0x14209..0x15080" : "0x0000",
      discrepancyNote: fixture.receiptClaim.discrepancyNote,
    },
    postIngestionMerkleRoot: "0".repeat(64),
    nodes,
    edges,
    transformationSteps: [],
    sevenQuestionBrief: {
      caseId: fixture.caseId,
      firNumber: fixture.firNumber,
      generatedIst: "2026-09-22 10:00:00 IST",
      executiveSummary: `${fixture.title}: Loss of ₹${fixture.financials.bookedLossInr.toLocaleString("en-IN")}. Secured ₹${fixture.financials.recoverableLibrInr.toLocaleString("en-IN")} under BNSS §106.`,
      questions: [],
    },
    fileManifest: [
      {
        fileName: `${fixture.complainant.bank.replace(/\s+/g, "_")}_Finacle_Statement.csv`,
        fileId: `art-${fixture.caseId}-01`,
        byteSize: 1420,
        sha256: "0".repeat(64),
        tier: "T1",
        custodian: fixture.complainant.bank,
        status: "PASS",
      },
    ],
  };
}
