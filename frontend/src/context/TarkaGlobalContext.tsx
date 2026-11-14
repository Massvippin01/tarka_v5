import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { computePhoneticReadout, type ChainOfCustodyRecord } from "../utils/forensicCrypto";
import { sha256HexSync } from "../utils/sha256";
import { CaseSyncBridge } from "../services/caseSyncBridge";
import { useTarkaUiStore } from "../store/useTarkaUiStore";
import { useCaseStore } from "../store/useCaseStore";

export type ActiveRoute =
  | "workspace"
  | "intake"
  | "entities"
  | "attribution"
  | "network"
  | "taint-engine"
  | "court-proof"
  | "privacy-crypto"
  | "report";

export type TarkaRoute = ActiveRoute | "workstation" | "workflow" | "benchmarks" | "actions" | "settings" | "health";

export type ArtifactVectorType =
  | "CBS_LEDGER"
  | "TELCO_CGNAT"
  | "NPCI_XML"
  | "PDF_RECEIPT"
  | "WHATSAPP_APK";

export interface IngestedArtifact {
  id: string;
  filename: string;
  vectorType: ArtifactVectorType;
  tier: "TIER_1_CERTIFIED" | "TIER_2_CORROBORATIVE" | "TIER_3_QUARANTINED";
  byteSize: number;
  sha256: string;
  bip39Words: string[]; // 6-word preview or full seal
  phoneticReadout?: string; // Courtroom Phonetic Readout Aid (PGP Word List)
  ingestedAtIst: string;
  custodianNode: string; // e.g., "SBI Core Banking Nodal", "Airtel DoT Gateway", "Complainant Handset"
  gateStatus: "PASS" | "QUARANTINED_EOF_TAMPER" | "QUARANTINED_BALANCE_DEFICIT";
  gateDetail: string; // e.g., "2 %%EOF markers detected (+14.2 KB incremental append)"
  piiBlindedStats?: { blinded: number; total: number };
  cocRecord?: ChainOfCustodyRecord;
}

export interface CaseWorkspace {
  caseId: string;               // e.g., "CASE-2026-001"
  firNumber: string;            // e.g., "FIR #149/2026"
  policeStation: string;        // e.g., "Noida Cyber Crime PS, UP"
  ncrpAckNo: string;            // e.g., "1930-ACK-2311098412"
  title: string;                // e.g., "CBI/TRAI Fake Digital Arrest Extortion"
  typology: "DIGITAL_ARREST" | "APK_SIM_SWAP" | "TELEGRAM_INVESTMENT" | "CORPORATE_BEC" | "TASK_FRAUD";
  complainantName: string;
  leadInvestigator: string;     // e.g., "Insp. R. K. Sharma (IO-409)"
  claimedLossInr: number;
  bookedLossInr: number;
  recoverableInr: number;
  commercialShieldedInr: number;
  frozenAmountInr?: number;
  goldenHourRemainingMins: number; // 0 if expired/escalated, 1-180 if active
  priority: "CRITICAL_GOLDEN_HOUR" | "HIGH_SYNDICATE" | "COURT_FILING_READY";
  status?: string;
  incidentDate?: string;
  created_at?: string;
  currentStage: Exclude<ActiveRoute, "workspace">;
  gatesPassed: number;          // out of 5
  gatesHalted: boolean;
  syndicateLinks: {
    linkedCaseId: string;
    sharedAnchorType: "JA4_TLS" | "IMEI_TAC" | "WIFI_BSSID" | "MULE_ACCOUNT";
    sharedAnchorValue: string;
  }[];
  artifacts: IngestedArtifact[];
}

export interface ActiveMutations {
  // 6 Core Forensic Mutations
  alterBankRow14: boolean;            // 1. CBS Ledger balance jump (+₹1,00,000 fraud / conservation failure @ row 14)
  forgeRrnTimestamp: boolean;         // 2. UPI RRN timestamp drift (+15m mismatch with bank CBS clock)
  dropCgnatSourcePort: boolean;       // 3. Drop CGNAT source port, exploding subscriber candidate pool (1 -> 6 -> 41 -> 340)
  triggerHotspotCollision: boolean;   // 4. Wi-Fi hotspot tethering TTL decrement (64 -> 63) & BSSID MAC collision
  injectMerchantCleanDeposit: boolean;// 5. Inject ₹2,50,000 clean commercial deposit to test LIBR vs FIFO divergence
  flipCustodyByte: boolean;           // 6. Flip 1 bit in digital custody ledger, breaking Merkle verification @ seq #4

  // Backward-compatible aliases
  balanceJumpFraud?: boolean;
  cgnatPortCollision?: boolean;
  clockSkewTamper?: boolean;
  ledgerBitFlip?: boolean;
}

export interface StatutoryPeriodInfo {
  code: "GOLDEN_HOUR" | "INTER_BANK_TAINT" | "MAGISTRATE_ATTACHMENT";
  label: string;
  badgeClass: string;
  statutoryRef: string;
  description: string;
  hoursRemaining: number;
}

export interface IntakeGateInvariant {
  id: "I1" | "I2" | "I3" | "I4" | "I5";
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  expectedVsObserved: string;
  executionTimeMs: number;
}

export interface IntakeGateState {
  isHalted: boolean;
  haltedAt?: string;
  invariants: IntakeGateInvariant[];
  totalMs: number;
}

interface TarkaGlobalContextType {
  activeRoute: TarkaRoute;
  setActiveRoute: (route: TarkaRoute) => void;
  activeCaseId: string;
  setActiveCaseId: (caseId: string) => void;
  activeCase: CaseWorkspace;
  caseWorkspaces: CaseWorkspace[];
  setCaseWorkspaces: React.Dispatch<React.SetStateAction<CaseWorkspace[]>>;
  selectCaseWorkspace: (caseId: string, navigateToStage?: ActiveRoute) => void;
  createNewCaseWorkspace: (payload: Omit<CaseWorkspace, "caseId" | "artifacts" | "gatesPassed" | "gatesHalted">) => string;
  registerDiscoveredCase: (workspace: CaseWorkspace) => void;
  ingestArtifactToCase: (caseId: string, artifact: IngestedArtifact) => void;
  removeQuarantinedArtifact: (caseId: string, artifactId: string) => void;
  isEvidenceModalOpen: boolean;
  setIsEvidenceModalOpen: (open: boolean) => void;
  evidenceModalTargetCaseId: string;
  setEvidenceModalTargetCaseId: (caseId: string) => void;
  isNewCaseModalOpen: boolean;
  setIsNewCaseModalOpen: (open: boolean) => void;
  openNewCaseModal: () => void;
  closeNewCaseModal: () => void;
  openEvidenceModal: (caseId?: string) => void;
  closeEvidenceModal: () => void;
  timeOffsetHours: number;
  setTimeOffsetHours: (hours: number | ((prev: number) => number)) => void;
  clockMinutes: number;
  setClockMinutes: (minutes: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  simulatedDateTimeStr: string;
  statutoryPeriod: StatutoryPeriodInfo;
  mutations: ActiveMutations;
  toggleMutation: (key: keyof ActiveMutations) => void;
  resetAllMutations: () => void;
  activeMutationsCount: number;
  intakeGate: IntakeGateState;
  setIntakeGate: (gate: IntakeGateState | ((prev: IntakeGateState) => IntakeGateState)) => void;
}

const DEFAULT_INTAKE_GATE: IntakeGateState = {
  isHalted: false,
  invariants: [
    { id: "I1", name: "Balance conservation", status: "PASS", expectedVsObserved: "Exact 0.00 error across 6 rows", executionTimeMs: 1.2 },
    { id: "I2", name: "RRN grammar & clock", status: "PASS", expectedVsObserved: "Julian day 265 · Drift +14.0s (±180s)", executionTimeMs: 0.8 },
    { id: "I3", name: "Cross-source agreement", status: "PASS", expectedVsObserved: "Receipt ₹15k vs True CBS ₹2.15L flagged", executionTimeMs: 0.9 },
    { id: "I4", name: "PDF XRef integrity", status: "PASS", expectedVsObserved: "2 %%EOF markers detected (Canva layer)", executionTimeMs: 1.4 },
    { id: "I5", name: "Merkle inclusion & privacy", status: "PASS", expectedVsObserved: "9,996 citizens masked · Root 0xb189...", executionTimeMs: 1.1 },
  ],
  totalMs: 5.4,
};

const DEFAULT_MUTATIONS: ActiveMutations = {
  alterBankRow14: false,
  forgeRrnTimestamp: false,
  dropCgnatSourcePort: false,
  triggerHotspotCollision: false,
  injectMerchantCleanDeposit: false,
  flipCustodyByte: false,
  balanceJumpFraud: false,
  cgnatPortCollision: false,
  clockSkewTamper: false,
  ledgerBitFlip: false,
};

const BASE_INCIDENT_TIMESTAMP = new Date("2026-09-22T09:30:00+05:30").getTime();

function createIngestedArtifact(
  id: string,
  filename: string,
  vectorType: ArtifactVectorType,
  tier: "TIER_1_CERTIFIED" | "TIER_2_CORROBORATIVE" | "TIER_3_QUARANTINED",
  byteSize: number,
  bip39Words: string[],
  ingestedAtIst: string,
  custodianNode: string,
  gateStatus: "PASS" | "QUARANTINED_EOF_TAMPER" | "QUARANTINED_BALANCE_DEFICIT",
  gateDetail: string,
  piiBlindedStats?: { blinded: number; total: number }
): IngestedArtifact {
  const sha256 = sha256HexSync(`TARKA_ARTIFACT:${id}:${filename}:${byteSize}`);
  return {
    id,
    filename,
    vectorType,
    tier,
    byteSize,
    sha256,
    bip39Words,
    phoneticReadout: computePhoneticReadout(sha256),
    ingestedAtIst,
    custodianNode,
    gateStatus,
    gateDetail,
    piiBlindedStats,
  };
}

// 4 Pre-Populated Forensic Case Workspaces
export const INITIAL_CASE_WORKSPACES: CaseWorkspace[] = [
  {
    caseId: "CASE-2026-001",
    firNumber: "FIR #149/2026",
    policeStation: "Noida Cyber Crime PS, UP",
    ncrpAckNo: "1930-ACK-2311098412",
    title: "CBI / TRAI Fake Digital Arrest Extortion",
    typology: "DIGITAL_ARREST",
    complainantName: "Sunil Kumar",
    leadInvestigator: "Insp. R. K. Sharma (IO-409)",
    claimedLossInr: 500000,
    bookedLossInr: 500000,
    recoverableInr: 345000,
    commercialShieldedInr: 155000,
    goldenHourRemainingMins: 42,
    priority: "CRITICAL_GOLDEN_HOUR",
    currentStage: "intake",
    gatesPassed: 6,
    gatesHalted: false,
    syndicateLinks: [
      {
        linkedCaseId: "CASE-2026-002",
        sharedAnchorType: "IMEI_TAC",
        sharedAnchorValue: "86749206",
      },
      {
        linkedCaseId: "CASE-2026-003",
        sharedAnchorType: "JA4_TLS",
        sharedAnchorValue: "t13d1516h2_8daaf6",
      },
      {
        linkedCaseId: "CASE-2026-003",
        sharedAnchorType: "WIFI_BSSID",
        sharedAnchorValue: "74:DA:38:A2:11:BC",
      },
    ],
    artifacts: [
      createIngestedArtifact(
        "art-01-cbs",
        "SBI_Finacle_CBS_8821.csv",
        "CBS_LEDGER",
        "TIER_1_CERTIFIED",
        1420,
        ["ANCHOR", "COBALT", "DELTA", "GRANITE", "KILO", "VECTOR"],
        "2026-09-22 10:05:14 IST",
        "State Bank of India (Global IT Centre Nodal)",
        "PASS",
        "All running balances satisfy Bal[k] = Bal[k-1] + Cr[k] - Dr[k] with 0.00 residual error."
      ),
      createIngestedArtifact(
        "art-02-cgnat",
        "Airtel_CGNAT_IPDR_Oct26.csv",
        "TELCO_CGNAT",
        "TIER_1_CERTIFIED",
        482000,
        ["BRAVO", "ECHO", "FOXTROT", "SIERRA", "TANGO", "ZULU"],
        "2026-09-22 10:12:00 IST",
        "Bharti Airtel DoT Intercept Enclave",
        "PASS",
        "Auto-blinded 9,996 / 10,000 civilian subscriber records under RFC-6962 Merkle tree prior to memory hydration.",
        { blinded: 9996, total: 10000 }
      ),
      createIngestedArtifact(
        "art-03-xml",
        "NPCI_UPI2_Switch_149921.xml",
        "NPCI_XML",
        "TIER_1_CERTIFIED",
        3840,
        ["ALPHA", "CANYON", "EMBER", "HARBOR", "LUNAR", "OASIS"],
        "2026-09-22 10:15:30 IST",
        "NPCI Central Switch Operations Lead",
        "PASS",
        "NPCI UPI 2.0 XML schema valid. Extracted BSSID: 74:DA:38:A2:11:BC · JA4: t13d1516h2_8daaf6."
      ),
      createIngestedArtifact(
        "art-04-pdf",
        "Victim_Receipt_Canva_Edit.pdf",
        "PDF_RECEIPT",
        "TIER_3_QUARANTINED",
        248000,
        ["CRIMSON", "FLAME", "HAZARD", "SHADOW", "STORM", "VORTEX"],
        "2026-09-22 10:20:00 IST",
        "Complainant Cellular Handset (Disputed)",
        "QUARANTINED_EOF_TAMPER",
        "2 %%EOF markers detected (+14.2 KB incremental append). Indicates post-issuance Canva modification."
      ),
      createIngestedArtifact(
        "art-05-apk",
        "WhatsApp_Warrant_Lure.apk",
        "WHATSAPP_APK",
        "TIER_2_CORROBORATIVE",
        1250000,
        ["CIPHER", "MATRIX", "NEXUS", "ORBIT", "PULSE", "RADAR"],
        "2026-09-22 10:25:00 IST",
        "Complainant Handset WhatsApp Cache",
        "PASS",
        "Secondary corroborative mobile artifact. Certified under BSA §63(4) Schedule A."
      ),
    ],
  },
  {
    caseId: "CASE-2026-002",
    firNumber: "FIR #88/2026",
    policeStation: "Cyberabad Cyber Crime PS, Telangana",
    ncrpAckNo: "1930-ACK-992104812",
    title: "Malicious Wedding Card APK & Dual-SIM Swap",
    typology: "APK_SIM_SWAP",
    complainantName: "Dr. Meera Nair",
    leadInvestigator: "SI K. V. Reddy (IO-112)",
    claimedLossInr: 340000,
    bookedLossInr: 340000,
    recoverableInr: 210000,
    commercialShieldedInr: 0,
    goldenHourRemainingMins: 38,
    priority: "CRITICAL_GOLDEN_HOUR",
    currentStage: "attribution",
    gatesPassed: 5,
    gatesHalted: false,
    syndicateLinks: [
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "IMEI_TAC",
        sharedAnchorValue: "86749206",
      },
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "WIFI_BSSID",
        sharedAnchorValue: "74:DA:38:A2:11:BC",
      },
    ],
    artifacts: [
      createIngestedArtifact(
        "art-02-apk",
        "Wedding_Invite_Cards.apk",
        "WHATSAPP_APK",
        "TIER_2_CORROBORATIVE",
        890000,
        ["BADGE", "CROWN", "EAGLE", "FALCON", "LION", "TIGER"],
        "2026-09-22 10:22:15 IST",
        "Victim Handset Storage",
        "PASS",
        "READ_SMS permission payload identified. Precursor to OTP interception."
      ),
      createIngestedArtifact(
        "art-02-cdr",
        "Jio_SIM_Swap_CDR_152.csv",
        "TELCO_CGNAT",
        "TIER_1_CERTIFIED",
        18500,
        ["RIVER", "SUMMIT", "VALLEY", "ZEPHYR", "AURORA", "BEACON"],
        "2026-09-22 10:28:00 IST",
        "Reliance Jio Infocomm Lawful Intercept",
        "PASS",
        "Precursor IMSI swap recorded at 09:44:12 IST. Shared TAC 86749206 confirmed."
      ),
    ],
  },
  {
    caseId: "CASE-2026-003",
    firNumber: "FIR #312/2026",
    policeStation: "BKC Cyber Police Station, Mumbai",
    ncrpAckNo: "1930-ACK-551029411",
    title: "Grey Market IPO Syndicate & Cloud API Laundering",
    typology: "CORPORATE_BEC",
    complainantName: "Ramesh Singhal",
    leadInvestigator: "ACP Anita Deshmukh (IO-102)",
    claimedLossInr: 1250000,
    bookedLossInr: 1250000,
    recoverableInr: 920000,
    commercialShieldedInr: 600000,
    goldenHourRemainingMins: 0,
    priority: "COURT_FILING_READY",
    currentStage: "network",
    gatesPassed: 5,
    gatesHalted: false,
    syndicateLinks: [
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "JA4_TLS",
        sharedAnchorValue: "t13d1516h2_8daaf6",
      },
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "WIFI_BSSID",
        sharedAnchorValue: "74:DA:38:A2:11:BC",
      },
    ],
    artifacts: [
      createIngestedArtifact(
        "art-03-cbs-multi",
        "HDFC_Corporate_Bank_Stmt.csv",
        "CBS_LEDGER",
        "TIER_1_CERTIFIED",
        142000,
        ["GLACIER", "HORIZON", "ISLAND", "JUNGLE", "MOUNTAIN", "OCEAN"],
        "2026-09-20 14:15:00 IST",
        "HDFC Corporate Banking Nodal",
        "PASS",
        "Corporate RTGS reconciliation verified with valid IFSC and UTR stamp."
      ),
      createIngestedArtifact(
        "art-03-mesh",
        "I4C_Pratibimb_InterState_Mesh.json",
        "NPCI_XML",
        "TIER_1_CERTIFIED",
        64000,
        ["COSMOS", "GALAXY", "NEBULA", "PLANET", "STELLAR", "ZENITH"],
        "2026-09-20 14:40:00 IST",
        "MHA I4C Central Samanvaya Node",
        "PASS",
        "Inter-state HMAC blind-index cross-match across syndicate endpoints."
      ),
    ],
  },
  {
    caseId: "CASE-2026-004",
    firNumber: "FIR #405/2026",
    policeStation: "Bangalore Cyber Crime PS, Karnataka",
    ncrpAckNo: "1930-ACK-338192041",
    title: "Telegram Work-from-Home Task Fraud & Crypto Siphon",
    typology: "TASK_FRAUD",
    complainantName: "Pooja Hegde",
    leadInvestigator: "Insp. Manjunath Gowda (IO-314)",
    claimedLossInr: 180000,
    bookedLossInr: 180000,
    recoverableInr: 110000,
    commercialShieldedInr: 50000,
    goldenHourRemainingMins: 85,
    priority: "CRITICAL_GOLDEN_HOUR",
    currentStage: "intake",
    gatesPassed: 4,
    gatesHalted: false,
    syndicateLinks: [
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "IMEI_TAC",
        sharedAnchorValue: "86749206",
      },
      {
        linkedCaseId: "CASE-2026-001",
        sharedAnchorType: "WIFI_BSSID",
        sharedAnchorValue: "74:DA:38:A2:11:BC",
      },
    ],
    artifacts: [
      createIngestedArtifact(
        "art-04-cbs",
        "Axis_Finacle_Stmt_1182.csv",
        "CBS_LEDGER",
        "TIER_1_CERTIFIED",
        1820,
        ["ALPHA", "DELTA", "ECHO", "LUNAR", "OASIS", "SOLAR"],
        "2026-09-22 11:20:00 IST",
        "Axis Bank Central Nodal",
        "PASS",
        "Finacle CBS transaction audit verified."
      ),
      createIngestedArtifact(
        "art-04-crypto",
        "CoinSwitch_USDT_Escrow_Receipt.pdf",
        "PDF_RECEIPT",
        "TIER_2_CORROBORATIVE",
        42000,
        ["CIPHER", "CRYPTO", "ESCROW", "GATEWAY", "LEDGER", "TOKEN"],
        "2026-09-22 11:28:00 IST",
        "CoinSwitch FIU Compliance",
        "PASS",
        "Bona-fide commercial crypto escrow lien verified."
      ),
    ],
  },
];

const TarkaGlobalContext = createContext<TarkaGlobalContextType | undefined>(undefined);

export function syncTarkaUrl(caseId: string, view: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const legacyParams = ["nav", "lens", "entity", "rel", "loc", "mode", "tab", "level", "screen", "page", "stage", "benchmark"];
  legacyParams.forEach((k) => url.searchParams.delete(k));
  url.searchParams.set("case", caseId);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url.toString());
}

export const TarkaGlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialRoute = (): TarkaRoute => {
    let initialR: TarkaRoute = "workspace";
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") || params.get("screen");
      if (view === "settings" || path.includes("settings")) initialR = "settings";
      else if (view === "health" || path.includes("health")) initialR = "health";
      else if (view === "benchmark" || view === "benchmarks") initialR = "benchmarks";
      else if (view === "workspace" || view === "workspaces" || view === "cases" || view === "dashboard" || path.includes("workspace")) initialR = "workspace";
      else if (view === "attribution" || view === "device" || path.includes("attribution")) initialR = "attribution";
      else if (view === "entities" || view === "entity" || view === "people" || path.includes("entities")) initialR = "entities";
      else if (view === "network" || view === "fraud-network" || path.includes("network")) initialR = "network";
      else if (view === "taint-engine" || view === "taint" || view === "money" || path.includes("taint")) initialR = "taint-engine";
      else if (view === "court-proof" || view === "court" || view === "lab" || path.includes("court")) initialR = "court-proof";
      else if (view === "privacy-crypto" || view === "privacy" || path.includes("privacy")) initialR = "privacy-crypto";
      else if (view === "workstation" || view === "tarka" || path.includes("workstation")) initialR = "workstation";
      else if (view === "workflow" || path.includes("workflow")) initialR = "workflow";
      else if (view === "report" || view === "actions" || path.includes("report")) initialR = "report";
      else if (view === "intake" || view === "evidence" || path.includes("intake")) initialR = "intake";

      if (initialR === "workspace") useTarkaUiStore.getState().setActivePage("workspaces");
      else if (initialR === "benchmarks") useTarkaUiStore.getState().setActivePage("benchmark");
      else useTarkaUiStore.getState().setActivePage("workbench");
    }
    return initialR;
  };

  const getInitialCaseId = (): string => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const caseParam = params.get("case");
      if (caseParam) return caseParam;
    }
    return "CASE-2026-001";
  };

  const [activeRoute, setActiveRouteState] = useState<TarkaRoute>(getInitialRoute);
  const [activeCaseId, setActiveCaseIdState] = useState<string>(getInitialCaseId);
  const [caseWorkspaces, setCaseWorkspaces] = useState<CaseWorkspace[]>(INITIAL_CASE_WORKSPACES);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [evidenceModalTargetCaseId, setEvidenceModalTargetCaseId] = useState<string>(getInitialCaseId);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);

  // Sync state on browser URL navigation (popstate)
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const c = params.get("case");
      if (c && c !== activeCaseId) {
        setActiveCaseIdState(c);
      }
      const v = params.get("view") || params.get("screen");
      if (v) {
        if (v === "benchmark" || v === "benchmarks") {
          setActiveRouteState("benchmarks");
          useTarkaUiStore.getState().setActivePage("benchmark");
        } else if (v === "workspace" || v === "workspaces" || v === "cases" || v === "dashboard") {
          setActiveRouteState("workspace");
          useTarkaUiStore.getState().setActivePage("workspaces");
        } else {
          useTarkaUiStore.getState().setActivePage("workbench");
          if (v === "network" || v === "fraud-network") setActiveRouteState("network");
          else if (v === "intake" || v === "evidence") setActiveRouteState("intake");
          else if (v === "attribution" || v === "device") setActiveRouteState("attribution");
          else if (v === "entities" || v === "entity" || v === "people") setActiveRouteState("entities");
          else if (v === "taint-engine" || v === "taint" || v === "money") setActiveRouteState("taint-engine");
          else if (v === "court-proof" || v === "court" || v === "lab") setActiveRouteState("court-proof");
          else if (v === "privacy-crypto" || v === "privacy") setActiveRouteState("privacy-crypto");
          else if (v === "workstation") setActiveRouteState("workstation");
          else if (v === "report" || v === "actions") setActiveRouteState("report");
          else if (v === "settings") setActiveRouteState("settings");
          else if (v === "health") setActiveRouteState("health");
          else setActiveRouteState(v as any);
        }
      }
    };

    // Clean legacy URL parameters on initial load
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const legacyParams = ["nav", "lens", "entity", "rel", "loc", "mode", "tab", "level", "screen", "page", "stage", "benchmark"];
      let hasLegacy = false;
      for (const p of legacyParams) {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          hasLegacy = true;
        }
      }
      if (!url.searchParams.has("case")) {
        url.searchParams.set("case", activeCaseId);
        hasLegacy = true;
      }
      if (!url.searchParams.has("view")) {
        const initialPage = useTarkaUiStore.getState().activePage;
        url.searchParams.set("view", initialPage === "benchmark" ? "benchmarks" : activeRoute);
        hasLegacy = true;
      }
      if (hasLegacy) {
        window.history.replaceState({}, "", url.toString());
      }
    }

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [activeCaseId, activeRoute]);

  // Initial Sync from Backend Database
  useEffect(() => {
    let mounted = true;
    CaseSyncBridge.getInstance().listCasesFromBackend().then((backendCases) => {
      if (mounted && backendCases && backendCases.length > 0) {
        setCaseWorkspaces(backendCases);
      }
    });

    // Hydrate initial active case bundle
    CaseSyncBridge.getInstance().getCaseBundle(activeCaseId).then((bundle) => {
      if (mounted && bundle) {
        useTarkaUiStore.getState().setReconstructedInvestigation(bundle);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Sync investigation bundle whenever activeCaseId changes
  useEffect(() => {
    let mounted = true;
    const targetCase = caseWorkspaces.find((c) => c.caseId === activeCaseId);
    CaseSyncBridge.getInstance().getCaseBundle(activeCaseId, targetCase).then((bundle) => {
      if (mounted && bundle) {
        useTarkaUiStore.getState().setReconstructedInvestigation(bundle);
      }
    });

    return () => {
      mounted = false;
    };
  }, [activeCaseId, caseWorkspaces]);

  const openNewCaseModal = () => setIsNewCaseModalOpen(true);
  const closeNewCaseModal = () => setIsNewCaseModalOpen(false);
  const openEvidenceModal = (caseId?: string) => {
    if (caseId) {
      setEvidenceModalTargetCaseId(caseId);
    } else {
      setEvidenceModalTargetCaseId(activeCaseId || "CASE-2026-001");
    }
    setIsEvidenceModalOpen(true);
  };
  const closeEvidenceModal = () => setIsEvidenceModalOpen(false);

  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(2.5); // T+2.5h default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [mutations, setMutations] = useState<ActiveMutations>(DEFAULT_MUTATIONS);
  const [intakeGate, setIntakeGate] = useState<IntakeGateState>(DEFAULT_INTAKE_GATE);

  const activeCase = useMemo(() => {
    return caseWorkspaces.find((c) => c.caseId === activeCaseId) || caseWorkspaces[0];
  }, [caseWorkspaces, activeCaseId]);

  const clockMinutes = useMemo(() => Math.round(timeOffsetHours * 60), [timeOffsetHours]);

  const setClockMinutes = useCallback((minutes: number) => {
    setTimeOffsetHours(Math.max(0, Math.min(48, parseFloat((minutes / 60).toFixed(2)))));
  }, []);

  const setActiveRoute = useCallback((route: TarkaRoute) => {
    setActiveRouteState(route);
    if (route === "workspace") {
      useTarkaUiStore.getState().setActivePage("workspaces");
    } else {
      useTarkaUiStore.getState().setActivePage("workbench");
    }
    const currentCase = useCaseStore.getState().activeCaseId || activeCaseId;
    useCaseStore.getState().setActiveView(route);
    syncTarkaUrl(currentCase, route);
  }, [activeCaseId]);

  const setActiveCaseId = useCallback((caseId: string) => {
    setActiveCaseIdState(caseId);
    setEvidenceModalTargetCaseId(caseId);
    useCaseStore.getState().setActiveCaseId(caseId);
    const currentPage = useTarkaUiStore.getState().activePage;
    const view = currentPage === "benchmark" ? "benchmarks" : activeRoute;
    syncTarkaUrl(caseId, view);
  }, [activeRoute]);

  // Multi-Case Action: Select Workspace and Transition to Stage
  const selectCaseWorkspace = useCallback((caseId: string, navigateToStage?: ActiveRoute) => {
    setActiveCaseIdState(caseId);
    setEvidenceModalTargetCaseId(caseId);
    useCaseStore.getState().setActiveCaseId(caseId);
    const targetCase = caseWorkspaces.find((c) => c.caseId === caseId);
    const dest = navigateToStage || targetCase?.currentStage || "intake";
    setActiveRouteState(dest);
    useCaseStore.getState().setActiveView(dest);
    syncTarkaUrl(caseId, dest);
  }, [caseWorkspaces]);

  // Multi-Case Action: Create New Workspace
  const createNewCaseWorkspace = useCallback(
    (payload: Omit<CaseWorkspace, "caseId" | "artifacts" | "gatesPassed" | "gatesHalted">): string => {
      const newId = `CASE-2026-${String(caseWorkspaces.length + 1).padStart(3, "0")}`;
      const newWorkspace: CaseWorkspace = {
        ...payload,
        caseId: newId,
        artifacts: [],
        gatesPassed: 5,
        gatesHalted: false,
      };
      setCaseWorkspaces((prev) => [newWorkspace, ...prev]);
      setActiveCaseId(newId);
      // Persist to backend database
      CaseSyncBridge.getInstance().registerCaseWithBackend(newWorkspace).catch(() => {});
      return newId;
    },
    [caseWorkspaces.length, setActiveCaseId]
  );

  // Multi-Case Action: Register Discovered Case directly from Stream
  const registerDiscoveredCase = useCallback((workspace: CaseWorkspace) => {
    setCaseWorkspaces((prev) => {
      const filtered = prev.filter((c) => c.caseId !== workspace.caseId);
      return [workspace, ...filtered];
    });
    setActiveCaseId(workspace.caseId);
    setActiveRoute(workspace.currentStage || "intake");
    // Persist to backend database
    CaseSyncBridge.getInstance().registerCaseWithBackend(workspace).catch(() => {});
  }, [setActiveCaseId, setActiveRoute]);

  // Multi-Case Action: Ingest Artifact to Specific Case
  const ingestArtifactToCase = useCallback((caseId: string, artifact: IngestedArtifact) => {
    setCaseWorkspaces((prev) =>
      prev.map((cw) => {
        if (cw.caseId !== caseId) return cw;
        const exists = cw.artifacts.some((a) => a.id === artifact.id || a.sha256 === artifact.sha256);
        const updatedArtifacts = exists
          ? cw.artifacts.map((a) => (a.id === artifact.id || a.sha256 === artifact.sha256 ? artifact : a))
          : [artifact, ...cw.artifacts];
        return {
          ...cw,
          artifacts: updatedArtifacts,
        };
      })
    );
    // Persist exhibit to backend database
    CaseSyncBridge.getInstance().ingestArtifactWithBackend(caseId, artifact).catch(() => {});
  }, []);

  // Multi-Case Action: Remove Quarantined Artifact
  const removeQuarantinedArtifact = useCallback((caseId: string, artifactId: string) => {
    setCaseWorkspaces((prev) =>
      prev.map((cw) => {
        if (cw.caseId !== caseId) return cw;
        return {
          ...cw,
          artifacts: cw.artifacts.filter((a) => a.id !== artifactId),
        };
      })
    );
  }, []);

  // Playback timer (T+0 to T+48h)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeOffsetHours((prev) => {
        if (prev >= 48) {
          setIsPlaying(false);
          return 48;
        }
        return Math.min(48, parseFloat((prev + 0.25 * playbackSpeed).toFixed(2)));
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const toggleMutation = useCallback((key: keyof ActiveMutations) => {
    setMutations((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };

      // Sync backward-compatible aliases
      if (key === "alterBankRow14") updated.balanceJumpFraud = nextVal;
      if (key === "balanceJumpFraud") updated.alterBankRow14 = nextVal;
      if (key === "dropCgnatSourcePort") updated.cgnatPortCollision = nextVal;
      if (key === "cgnatPortCollision") updated.dropCgnatSourcePort = nextVal;
      if (key === "flipCustodyByte") updated.ledgerBitFlip = nextVal;
      if (key === "ledgerBitFlip") updated.flipCustodyByte = nextVal;

      return updated;
    });
  }, []);

  const resetAllMutations = useCallback(() => {
    setMutations(DEFAULT_MUTATIONS);
  }, []);

  const activeMutationsCount = useMemo(() => {
    const coreKeys: (keyof ActiveMutations)[] = [
      "alterBankRow14",
      "forgeRrnTimestamp",
      "dropCgnatSourcePort",
      "triggerHotspotCollision",
      "injectMerchantCleanDeposit",
      "flipCustodyByte",
    ];
    return coreKeys.filter((k) => mutations[k]).length;
  }, [mutations]);

  // Compute simulated timestamp: Base + Offset hours
  const simulatedDateTimeStr = useMemo(() => {
    const epochMs = BASE_INCIDENT_TIMESTAMP + timeOffsetHours * 3600 * 1000;
    const date = new Date(epochMs);
    return date.toISOString().replace("T", " ").substring(0, 19) + " IST";
  }, [timeOffsetHours]);

  // Statutory legal window calculation
  const statutoryPeriod: StatutoryPeriodInfo = useMemo(() => {
    if (timeOffsetHours <= 2.0) {
      return {
        code: "GOLDEN_HOUR",
        label: "CRITICAL GOLDEN HOUR",
        badgeClass: "bento-badge-coral",
        statutoryRef: "BNSS § 106 & MHA SOP",
        description: "Emergency administrative debit freeze mandatory across Layer-1 & Layer-2 mule accounts.",
        hoursRemaining: Math.max(0, parseFloat((2.0 - timeOffsetHours).toFixed(1))),
      };
    }
    if (timeOffsetHours <= 24.0) {
      return {
        code: "INTER_BANK_TAINT",
        label: "INTER-BANK REQUISITION WINDOW",
        badgeClass: "bento-badge-amber",
        statutoryRef: "Section 106 BNSS 24h Nodal Notice",
        description: "Tracing Layer 2 to Layer 4 mule cashout paths across NPCI Switch & RTGS gateways.",
        hoursRemaining: Math.max(0, parseFloat((24.0 - timeOffsetHours).toFixed(1))),
      };
    }
    return {
      code: "MAGISTRATE_ATTACHMENT",
      label: "STATUTORY COURT ATTACHMENT",
      badgeClass: "bento-badge-blue",
      statutoryRef: "BNSS § 107 Statutory Expiry (48h)",
      description: "Police report & application for formal attachment before Judicial Magistrate First Class.",
      hoursRemaining: Math.max(0, parseFloat((48.0 - timeOffsetHours).toFixed(1))),
    };
  }, [timeOffsetHours]);

  return (
    <TarkaGlobalContext.Provider
      value={{
        activeRoute,
        setActiveRoute,
        activeCaseId,
        setActiveCaseId,
        activeCase,
        caseWorkspaces,
        setCaseWorkspaces,
        selectCaseWorkspace,
        createNewCaseWorkspace,
        registerDiscoveredCase,
        ingestArtifactToCase,
        removeQuarantinedArtifact,
        isEvidenceModalOpen,
        setIsEvidenceModalOpen,
        evidenceModalTargetCaseId,
        setEvidenceModalTargetCaseId,
        isNewCaseModalOpen,
        setIsNewCaseModalOpen,
        openNewCaseModal,
        closeNewCaseModal,
        openEvidenceModal,
        closeEvidenceModal,
        timeOffsetHours,
        setTimeOffsetHours,
        clockMinutes,
        setClockMinutes,
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed,
        simulatedDateTimeStr,
        statutoryPeriod,
        mutations,
        toggleMutation,
        resetAllMutations,
        activeMutationsCount,
        intakeGate,
        setIntakeGate,
      }}
    >
      {children}
    </TarkaGlobalContext.Provider>
  );
};

export const useTarkaGlobal = (): TarkaGlobalContextType => {
  const context = useContext(TarkaGlobalContext);
  if (!context) {
    throw new Error("useTarkaGlobal must be used within a TarkaGlobalProvider");
  }
  return context;
};
