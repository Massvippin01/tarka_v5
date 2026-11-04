import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { computePhoneticReadout, type ChainOfCustodyRecord } from "../utils/forensicCrypto";

export type ActiveRoute =
  | "workspace"
  | "intake"
  | "entities"
  | "attribution"
  | "network"
  | "taint-engine"
  | "court-proof"
  | "privacy-crypto";

export type TarkaRoute = ActiveRoute | "workstation" | "workflow";

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
  typology: "DIGITAL_ARREST" | "APK_SIM_SWAP" | "TELEGRAM_INVESTMENT" | "CORPORATE_BEC";
  complainantName: string;
  leadInvestigator: string;     // e.g., "Insp. R. K. Sharma (IO-409)"
  claimedLossInr: number;
  bookedLossInr: number;
  recoverableInr: number;
  commercialShieldedInr: number;
  goldenHourRemainingMins: number; // 0 if expired/escalated, 1-180 if active
  priority: "CRITICAL_GOLDEN_HOUR" | "HIGH_SYNDICATE" | "COURT_FILING_READY";
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

// 3 Pre-Populated Forensic Case Workspaces
const INITIAL_CASE_WORKSPACES: CaseWorkspace[] = [
  {
    caseId: "CASE-2026-001",
    firNumber: "FIR #149/2026",
    policeStation: "Noida Cyber Crime PS, UP",
    ncrpAckNo: "1930-ACK-2311098412",
    title: "CBI/TRAI Fake Digital Arrest Extortion",
    typology: "DIGITAL_ARREST",
    complainantName: "Sunil Kumar",
    leadInvestigator: "Insp. R. K. Sharma (IO-409)",
    claimedLossInr: 15000,
    bookedLossInr: 500000,
    recoverableInr: 380000,
    commercialShieldedInr: 250000,
    goldenHourRemainingMins: 118,
    priority: "HIGH_SYNDICATE",
    currentStage: "intake",
    gatesPassed: 4,
    gatesHalted: false,
    syndicateLinks: [
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
      {
        id: "art-01-cbs",
        filename: "SBI_Finacle_CBS_8821.csv",
        vectorType: "CBS_LEDGER",
        tier: "TIER_1_CERTIFIED",
        byteSize: 1420,
        sha256: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
        bip39Words: ["ANCHOR", "COBALT", "DELTA", "GRANITE", "KILO", "VECTOR"],
        phoneticReadout: computePhoneticReadout("b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567"),
        ingestedAtIst: "2026-09-22 10:05:14 IST",
        custodianNode: "State Bank of India (Global IT Centre Nodal)",
        gateStatus: "PASS",
        gateDetail: "All running balances satisfy Bal[k] = Bal[k-1] + Cr[k] - Dr[k] with 0.00 residual error.",
      },
      {
        id: "art-02-cgnat",
        filename: "Airtel_CGNAT_IPDR_Oct26.csv",
        vectorType: "TELCO_CGNAT",
        tier: "TIER_1_CERTIFIED",
        byteSize: 482000,
        sha256: "4d71290481029481029481029481029481029481029481029481029481029481",
        bip39Words: ["BRAVO", "ECHO", "FOXTROT", "SIERRA", "TANGO", "ZULU"],
        phoneticReadout: computePhoneticReadout("4d71290481029481029481029481029481029481029481029481029481029481"),
        ingestedAtIst: "2026-09-22 10:12:00 IST",
        custodianNode: "Bharti Airtel DoT Intercept Enclave",
        gateStatus: "PASS",
        gateDetail: "Auto-blinded 9,996 / 10,000 civilian subscriber records under RFC-6962 Merkle tree prior to memory hydration.",
        piiBlindedStats: { blinded: 9996, total: 10000 },
      },
      {
        id: "art-03-xml",
        filename: "NPCI_UPI2_Switch_149921.xml",
        vectorType: "NPCI_XML",
        tier: "TIER_1_CERTIFIED",
        byteSize: 3840,
        sha256: "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
        bip39Words: ["ALPHA", "CANYON", "EMBER", "HARBOR", "LUNAR", "OASIS"],
        phoneticReadout: computePhoneticReadout("9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"),
        ingestedAtIst: "2026-09-22 10:15:30 IST",
        custodianNode: "NPCI Central Switch Operations Lead",
        gateStatus: "PASS",
        gateDetail: "NPCI UPI 2.0 XML schema valid. Extracted BSSID: 74:DA:38:A2:11:BC · JA4: t13d1516h2_8daaf6.",
      },
      {
        id: "art-04-pdf",
        filename: "Victim_Receipt_Canva_Edit.pdf",
        vectorType: "PDF_RECEIPT",
        tier: "TIER_3_QUARANTINED",
        byteSize: 248000,
        sha256: "c89148bc92019482019a84719284102948192841029481928410294819284102",
        bip39Words: ["CRIMSON", "FLAME", "HAZARD", "SHADOW", "STORM", "VORTEX"],
        phoneticReadout: computePhoneticReadout("c89148bc92019482019a84719284102948192841029481928410294819284102"),
        ingestedAtIst: "2026-09-22 10:20:00 IST",
        custodianNode: "Complainant Cellular Handset (Disputed)",
        gateStatus: "QUARANTINED_EOF_TAMPER",
        gateDetail: "2 %%EOF markers detected (+14.2 KB incremental append). Indicates post-issuance Canva modification.",
      },
      {
        id: "art-05-apk",
        filename: "WhatsApp_Warrant_Lure.apk",
        vectorType: "WHATSAPP_APK",
        tier: "TIER_2_CORROBORATIVE",
        byteSize: 1250000,
        sha256: "88ab102938475610293847561029384756102938475610293847561029384756",
        bip39Words: ["CIPHER", "MATRIX", "NEXUS", "ORBIT", "PULSE", "RADAR"],
        phoneticReadout: computePhoneticReadout("88ab102938475610293847561029384756102938475610293847561029384756"),
        ingestedAtIst: "2026-09-22 10:25:00 IST",
        custodianNode: "Complainant Handset WhatsApp Cache",
        gateStatus: "PASS",
        gateDetail: "Secondary corroborative mobile artifact. Certified under BSA §63(4) Schedule A.",
      },
    ],
  },
  {
    caseId: "CASE-2026-002",
    firNumber: "FIR #152/2026",
    policeStation: "Cyberabad PS, Telangana",
    ncrpAckNo: "1930-ACK-2609144810",
    title: "Malicious Wedding Card .apk SMS Forwarder & Dual-SIM Swap",
    typology: "APK_SIM_SWAP",
    complainantName: "Dr. Meera Nair",
    leadInvestigator: "SI K. V. Reddy (IO-112)",
    claimedLossInr: 840000,
    bookedLossInr: 840000,
    recoverableInr: 620000,
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
    ],
    artifacts: [
      {
        id: "art-02-apk",
        filename: "Wedding_Invite_Cards.apk",
        vectorType: "WHATSAPP_APK",
        tier: "TIER_2_CORROBORATIVE",
        byteSize: 890000,
        sha256: "a3f910481bc92014820194820194820194820194820194820194820194820194",
        bip39Words: ["BADGE", "CROWN", "EAGLE", "FALCON", "LION", "TIGER"],
        ingestedAtIst: "2026-09-22 10:22:15 IST",
        custodianNode: "Victim Handset Storage",
        gateStatus: "PASS",
        gateDetail: "READ_SMS permission payload identified. Precursor to OTP interception.",
      },
      {
        id: "art-02-cdr",
        filename: "Jio_SIM_Swap_CDR_152.csv",
        vectorType: "TELCO_CGNAT",
        tier: "TIER_1_CERTIFIED",
        byteSize: 18500,
        sha256: "7e92041928410294819284102948192841029481029481029481029481029481",
        bip39Words: ["RIVER", "SUMMIT", "VALLEY", "ZEPHYR", "AURORA", "BEACON"],
        ingestedAtIst: "2026-09-22 10:28:00 IST",
        custodianNode: "Reliance Jio Infocomm Lawful Intercept",
        gateStatus: "PASS",
        gateDetail: "Precursor IMSI swap recorded at 09:44:12 IST. Shared TAC 86749206 confirmed.",
      },
    ],
  },
  {
    caseId: "CASE-2026-003",
    firNumber: "RC-09/2026",
    policeStation: "I4C Samanvaya Multi-State Task Force",
    ncrpAckNo: "1930-ACK-2508119022",
    title: "Institutional QIB IPO Allotment Syndicate — 5 States",
    typology: "TELEGRAM_INVESTMENT",
    complainantName: "Rajeshwari Textiles Pvt Ltd",
    leadInvestigator: "DySP Arvind Swamy (CBI Cyber Crime)",
    claimedLossInr: 14200000,
    bookedLossInr: 14200000,
    recoverableInr: 8850000,
    commercialShieldedInr: 1200000,
    goldenHourRemainingMins: 0,
    priority: "COURT_FILING_READY",
    currentStage: "court-proof",
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
      {
        id: "art-03-cbs-multi",
        filename: "HDFC_Axis_ICICI_MultiBank_Consolidated.csv",
        vectorType: "CBS_LEDGER",
        tier: "TIER_1_CERTIFIED",
        byteSize: 142000,
        sha256: "f190248102948102948102948102948102948102948102948102948102948102",
        bip39Words: ["GLACIER", "HORIZON", "ISLAND", "JUNGLE", "MOUNTAIN", "OCEAN"],
        ingestedAtIst: "2026-09-22 08:30:00 IST",
        custodianNode: "Multi-Bank Nodal Consortium",
        gateStatus: "PASS",
        gateDetail: "Consolidated multi-bank commit stream. ₹10.42 Cr cluster exposure confirmed.",
      },
      {
        id: "art-03-mesh",
        filename: "I4C_Pratibimb_InterState_Mesh.json",
        vectorType: "NPCI_XML",
        tier: "TIER_1_CERTIFIED",
        byteSize: 64000,
        sha256: "e4b0192841029481029481029481029481029481029481029481029481029481",
        bip39Words: ["COSMOS", "GALAXY", "NEBULA", "PLANET", "STELLAR", "ZENITH"],
        ingestedAtIst: "2026-09-22 09:00:00 IST",
        custodianNode: "MHA I4C Central Samanvaya Node",
        gateStatus: "PASS",
        gateDetail: "Inter-state HMAC blind-index cross-match across 14 FIRs (UP, MH, KA, GJ, DL).",
      },
    ],
  },
];

const TarkaGlobalContext = createContext<TarkaGlobalContextType | undefined>(undefined);

export const TarkaGlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialRoute = (): TarkaRoute => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") || params.get("screen");
      if (view === "workspace" || path.includes("workspace")) return "workspace";
      if (view === "attribution" || path.includes("attribution")) return "attribution";
      if (view === "entities" || view === "entity" || path.includes("entities")) return "entities";
      if (view === "network" || view === "fraud-network" || path.includes("network")) return "network";
      if (view === "taint-engine" || view === "taint" || path.includes("taint")) return "taint-engine";
      if (view === "court-proof" || view === "court" || path.includes("court")) return "court-proof";
      if (view === "workstation" || view === "tarka" || path.includes("workstation")) return "workstation";
      if (view === "workflow" || path.includes("workflow")) return "workflow";
      if (view === "intake" || path.includes("intake")) return "intake";
    }
    return "workspace"; // Default to Screen 00 Workspace Hub
  };

  const [activeRoute, setActiveRouteState] = useState<TarkaRoute>(getInitialRoute);
  const [activeCaseId, setActiveCaseIdState] = useState<string>("CASE-2026-001");
  const [caseWorkspaces, setCaseWorkspaces] = useState<CaseWorkspace[]>(INITIAL_CASE_WORKSPACES);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [evidenceModalTargetCaseId, setEvidenceModalTargetCaseId] = useState<string>("CASE-2026-001");
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);

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
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", route);
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  const setActiveCaseId = useCallback((caseId: string) => {
    setActiveCaseIdState(caseId);
    setEvidenceModalTargetCaseId(caseId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("case", caseId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Multi-Case Action: Select Workspace and Transition to Stage
  const selectCaseWorkspace = useCallback((caseId: string, navigateToStage?: ActiveRoute) => {
    setActiveCaseId(caseId);
    const targetCase = caseWorkspaces.find((c) => c.caseId === caseId);
    const dest = navigateToStage || targetCase?.currentStage || "intake";
    setActiveRoute(dest);
  }, [caseWorkspaces, setActiveCaseId, setActiveRoute]);

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
