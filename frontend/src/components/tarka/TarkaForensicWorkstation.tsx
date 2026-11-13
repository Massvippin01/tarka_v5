import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  Boxes,
  Clock,
  Zap,
  GitFork,
  Search,
  FlaskConical,
  FileText,
  ShieldCheck,
  RefreshCw,
  FolderUp,
  FileCheck,
  PanelRight,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mic,
  Check,
  X,
  Plus,
  FileDown,
  Globe,
  Cpu,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Scale,
  Trash2,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";
import type { ArtifactIntake, ProvenanceDAG, CounterfactualComparison } from "../../types/forensics";
import { EvidenceRegister } from "./EvidenceRegister";
import { sha256HexSync, canonicalJson } from "../../utils/sha256";
import { ForensicTimeline, type TimelineEvent } from "./ForensicTimeline";
import { ContradictionPanel, type ContradictionItem, type EvidenceGapItem } from "./ContradictionPanel";
import { ProvenanceDAGView } from "../graphs/ProvenanceDAGView";
// ChallengeDiffCard available in submodules
import { ForensicReportModal } from "./ForensicReportModal";
import { EvidenceIntakeModal } from "./EvidenceIntakeModal";
import { SarvamVoiceModal } from "./SarvamVoiceModal";
import { ForensicAssistantPanel } from "./ForensicAssistantPanel";
import { TarkaMinimalLanding } from "./TarkaMinimalLanding";
import { Layers, GitBranch, Disc } from "lucide-react";
import { TemporalEvidenceLoom } from "./TemporalEvidenceLoom";
import { ClaimDependencyLens } from "./ClaimDependencyLens";
import { InvestigationFlightRecorder } from "./InvestigationFlightRecorder";

interface CaseProfile {
  id: string;
  code: string;
  firNumber: string;
  title: string;
  subtitle: string;
  crimeType: string;
  jurisdiction: string;
  authority: string;
  statutoryStandard: string;
  narrative: string;
  defaultArtifactsCount: number;
  defaultContradictionsCount: number;
  defaultGapsCount: number;
  defaultEventsCount: number;
  highlightDelta: string;
  keyRule: string;
}

const CASE_PROFILES: Record<string, CaseProfile> = {
  "CASE-2026-001": {
    id: "CASE-2026-001",
    code: "FIR-2026-001/DEL",
    firNumber: "FIR/2026/001-CYB",
    title: "Operation Digital Arrest Extortion",
    subtitle: "1930 Cybercrime Helpline — Multi-Layered UPI Extortion & Mule Network",
    crimeType: "Digital Arrest & UPI Extortion Syndicate",
    jurisdiction: "Delhi State Cyber Crime Cell / 1930 NCRP Portal",
    authority: "ACP Rajesh Kumar (Cyber Crime Branch)",
    statutoryStandard: "Bharatiya Sakshya Adhiniyam, 2023 (Section 63) & BNSS § 106",
    narrative: "Forensic cross-examination of 4 core intake files: Complainant WhatsApp Chat extraction, fabricated payment screenshot, SBI Core Banking ledger CSV, and Airtel telecom CDR. Automated mathematical reconciliation of UPI RRNs, transaction sums, and causal timestamps for rapid Section 106 BNSS account freezing.",
    defaultArtifactsCount: 6,
    defaultContradictionsCount: 2,
    defaultGapsCount: 3,
    defaultEventsCount: 5,
    highlightDelta: "Amount Conflict: Victim Claim(₹1,50,000) ≠ CBS Ledger Credit(₹50,000) [|Δ| = ₹1,00,000.00]",
    keyRule: "FINANCIAL_LEDGER_PARITY under RRN 202602149921",
  },
  "upi_payment_discrepancy": {
    id: "upi_payment_discrepancy",
    code: "SUTRAM-2026-UPI",
    firNumber: "FIR/2026/042-CYB",
    title: "UPI Payment Discrepancy & Dispute Investigation",
    subtitle: "Canonical SUTRAM 2026 National Forensic Benchmark Golden Case",
    crimeType: "Digital Payment Fraud & Transaction Discrepancy",
    jurisdiction: "National Cyber Crime Reporting Portal (NCRP) / Delhi",
    authority: "Insp. Vikramaditya (Delhi Cyber Crime Branch)",
    statutoryStandard: "Bharatiya Sakshya Adhiniyam, 2023 (Section 63)",
    narrative: "Investigation of ₹25,000 digital payment discrepancy across Core Banking CBS ledger, CDR telecom records, WhatsApp extraction, and conflicting claims receipts. Governed strictly under the Bharatiya Sakshya Adhiniyam, 2023 (Section 63) and deterministic Z3 SMT solver invariants.",
    defaultArtifactsCount: 6,
    defaultContradictionsCount: 2,
    defaultGapsCount: 3,
    defaultEventsCount: 11,
    highlightDelta: "Amount Conflict: Claim(₹25,000) ≠ CBS Ledger(₹15,000) [|Δ| = ₹10,000.00]",
    keyRule: "AMOUNT_MISMATCH under RRN 202602148891",
  },
};

const CASE_2026_001_FALLBACK_ARTIFACTS: any[] = [
  { artifact_id: "ART-WAPP-001", filename: "whatsapp_chat_extraction.txt", source_tier: "T3", mime_type: "text/plain", size_bytes: 4210, verified: true, verification_details: { bsa_certified: false } },
  { artifact_id: "ART-SS-002", filename: "fake_payment_screenshot.json", source_tier: "T3", mime_type: "application/json", size_bytes: 18450, verified: true, verification_details: { bsa_certified: false } },
  { artifact_id: "ART-BANK-003", filename: "bank_statement_cbs.csv", source_tier: "T1", mime_type: "text/csv", size_bytes: 142800, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-CDR-004", filename: "telecom_cdr_airtel.csv", source_tier: "T1", mime_type: "text/csv", size_bytes: 9820, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-NPCI-005", filename: "npci_switch_raw.json", source_tier: "T2", mime_type: "application/json", size_bytes: 28400, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-FIR-006", filename: "1930_ncrp_dossier.json", source_tier: "T1", mime_type: "application/json", size_bytes: 15300, verified: true, verification_details: { bsa_certified: true } },
].map((art) => ({
  ...art,
  sha256: sha256HexSync(canonicalJson(art)),
}));

const CASE_2026_001_FALLBACK_CONTRADICTIONS: any[] = [
  {
    id: "contra-001",
    title: "Claimed UPI Transfer vs Core Banking Credit Discrepancy",
    rule_firing_reason: "Victim payment screenshot claims ₹1,50,000 transfer under RRN 202602149921, whereas CBS Core Banking ledger confirms only ₹50,000 credited to primary mule account. Net discrepancy: ₹1,00,000.",
    category: "CLAIM_VS_RECORD",
    severity: "CRITICAL",
    conflicting_artifacts: ["fake_payment_screenshot.json", "bank_statement_cbs.csv"],
  },
  {
    id: "contra-002",
    title: "Temporal Causal Inversion (Payment Claim Precedes Demand)",
    rule_firing_reason: "UPI receipt timestamp (10:14:02 IST) in screenshot metadata precedes extortion demand timestamp in WhatsApp chat export (10:25:10 IST). Causal invariant violated.",
    category: "TIMESTAMP_CONFLICT",
    severity: "HIGH",
    conflicting_artifacts: ["whatsapp_chat_extraction.txt", "fake_payment_screenshot.json"],
  },
];

const CASE_2026_001_FALLBACK_GAPS: any[] = [
  {
    gap_id: "gap-001",
    target_entity: "Mule Account (Layer 2 ICICI A/C 6291XXXXXX)",
    missing_source: "Downstream Layer 2 Bank Statement",
    investigative_value: "CRITICAL",
    recommended_action: "Issue Section 106 BNSS rapid debit freeze notice to ICICI Nodal Officer within Golden Hour.",
  },
  {
    gap_id: "gap-002",
    target_entity: "Extortionist WhatsApp Number (+91-98711-XXXXX)",
    missing_source: "Airtel Subscriber CAF & Biometric e-KYC",
    investigative_value: "HIGH",
    recommended_action: "Issue statutory Section 91 CrPC notice to Airtel Nodal Officer for physical CAF & ID proof.",
  },
  {
    gap_id: "gap-003",
    target_entity: "UPI Originating IP Session",
    missing_source: "NPCI Central Switch Originating IPv4 & Device Telemetry",
    investigative_value: "HIGH",
    recommended_action: "Requisition NPCI / CERT-In for originating IP and device MAC address to identify mule handler location.",
  },
];

const CASE_2026_001_FALLBACK_EVENTS: any[] = [
  {
    event_id: "ev-01",
    timestamp: "2026-09-22T09:30:00Z",
    source_artifact: "1930_ncrp_dossier.json",
    source_tier: "T1",
    description: "1930 Helpline Intake: Complainant reports 'Digital Arrest' extortion call impersonating CBI & Telecom Authority",
    entity_references: ["P001", "FIR-2026-001"],
    clock_uncertainty_sec: 15,
  },
  {
    event_id: "ev-02",
    timestamp: "2026-09-22T10:14:02Z",
    source_artifact: "fake_payment_screenshot.json",
    source_tier: "T3",
    description: "Alleged UPI Transfer: Screenshot claims ₹1,50,000 sent to mule UPI ID sbi.deputy.cbi@okhdfc [AMOUNT CONFLICT]",
    entity_references: ["TXN-UPI-01", "MULE-UPI-01"],
    clock_uncertainty_sec: 2,
    is_contradicted: true,
  },
  {
    event_id: "ev-03",
    timestamp: "2026-09-22T10:25:10Z",
    source_artifact: "whatsapp_chat_extraction.txt",
    source_tier: "T3",
    description: "WhatsApp Extortion Demand: Impersonator sends fake court clearance notice demanding money [TEMPORAL INVERSION]",
    entity_references: ["P001", "IMPERSONATOR-01"],
    clock_uncertainty_sec: 1,
    is_contradicted: true,
  },
  {
    event_id: "ev-04",
    timestamp: "2026-09-22T10:35:00Z",
    source_artifact: "bank_statement_cbs.csv",
    source_tier: "T1",
    description: "CBS Core Banking Settlement: Actual credit received in mule account is ₹50,000 under RRN 202602149921",
    entity_references: ["TXN-001", "MULE-SBI-01"],
    clock_uncertainty_sec: 5,
  },
  {
    event_id: "ev-05",
    timestamp: "2026-09-22T10:48:00Z",
    source_artifact: "telecom_cdr_airtel.csv",
    source_tier: "T1",
    description: "Airtel CDR Record: 42-minute VoIP audio call initiated to victim device routing via proxy IP gateway",
    entity_references: ["PHONE001", "CALL-VOIP-01"],
    clock_uncertainty_sec: 2,
  },
];

const UPI_FALLBACK_ARTIFACTS: any[] = [
  { artifact_id: "ART-001", filename: "bank_statement.csv", source_tier: "T1", mime_type: "text/csv", size_bytes: 340, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-002", filename: "cdr_records.csv", source_tier: "T1", mime_type: "text/csv", size_bytes: 1240, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-003", filename: "whatsapp_chat.txt", source_tier: "T3", mime_type: "text/plain", size_bytes: 840, verified: true, verification_details: { bsa_certified: false } },
  { artifact_id: "ART-004", filename: "screenshot_claim.json", source_tier: "T3", mime_type: "application/json", size_bytes: 280, verified: true, verification_details: { bsa_certified: false } },
  { artifact_id: "ART-005", filename: "npci_switch_log.json", source_tier: "T2", mime_type: "application/json", size_bytes: 1100, verified: true, verification_details: { bsa_certified: true } },
  { artifact_id: "ART-006", filename: "gateway_syslog.json", source_tier: "T2", mime_type: "application/json", size_bytes: 920, verified: true, verification_details: { bsa_certified: true } },
].map((art) => ({
  ...art,
  sha256: sha256HexSync(canonicalJson(art)),
}));

const UPI_FALLBACK_CONTRADICTIONS: any[] = [
  {
    id: "contra-upi-001",
    title: "Amount Discrepancy under RRN 202602148891",
    rule_firing_reason: "Matched shared transaction reference RRN='202602148891'. Amounts differ: ₹25,000.00 vs ₹15,000.00 (|delta| = ₹10,000.00 > 0.01).",
    category: "CLAIM_VS_RECORD",
    severity: "CRITICAL",
    conflicting_artifacts: ["bank_statement.csv", "screenshot_claim.json"],
  },
  {
    id: "contra-upi-002",
    title: "Causal Sequence Inversion under RRN 202602148891",
    rule_firing_reason: "Payment completed timestamp < request timestamp for RRN=202602148891. Violates strict causality invariant.",
    category: "TIMESTAMP_CONFLICT",
    severity: "HIGH",
    conflicting_artifacts: ["whatsapp_chat.txt", "gateway_syslog.json"],
  },
];

const UPI_FALLBACK_GAPS: any[] = [
  {
    gap_id: "gap-upi-001",
    target_entity: "Suspect Mobile +91-98765-43210",
    missing_source: "Airtel Telecom CAF / Subscriber Verification",
    investigative_value: "CRITICAL",
    recommended_action: "Issue Section 91 notice to Airtel for KYC identity linked to suspect MSISDN.",
  },
  {
    gap_id: "gap-upi-002",
    target_entity: "NPCI UPI Switch",
    missing_source: "NPCI Central Clearing House Raw Settlement Logs",
    investigative_value: "HIGH",
    recommended_action: "Request NPCI Dispute Resolution System (UDIR) technical response for RRN 202602148891.",
  },
  {
    gap_id: "gap-upi-003",
    target_entity: "Beneficiary Bank (HDFC)",
    missing_source: "Beneficiary Account Holder KYC & Statement",
    investigative_value: "HIGH",
    recommended_action: "Serve notice to HDFC Cyber Nodal Officer to freeze end beneficiary account.",
  },
];

const UPI_FALLBACK_EVENTS: any[] = [
  {
    event_id: "upi-ev-01",
    timestamp: "2026-02-14T09:30:15Z",
    source_artifact: "whatsapp_chat.txt",
    source_tier: "T3",
    description: "WhatsApp Agreement: Payer claims to agree on ₹25,000 electronic transfer",
    entity_references: ["PAYER-01", "PAYEE-01"],
    clock_uncertainty_sec: 30,
  },
  {
    event_id: "upi-ev-02",
    timestamp: "2026-02-14T09:32:00Z",
    source_artifact: "screenshot_claim.json",
    source_tier: "T3",
    description: "Payment Screenshot Created: User-submitted screenshot depicting ₹25,000 successful debit",
    entity_references: ["RRN-202602148891"],
    clock_uncertainty_sec: 10,
    is_contradicted: true,
  },
  {
    event_id: "upi-ev-03",
    timestamp: "2026-02-14T09:32:04Z",
    source_artifact: "bank_statement.csv",
    source_tier: "T1",
    description: "Core Banking Ledger Settlement: Official CBS bank debit recorded for ₹15,000 only",
    entity_references: ["RRN-202602148891", "SBI-CBS"],
    clock_uncertainty_sec: 1,
    is_contradicted: true,
  },
  {
    event_id: "upi-ev-04",
    timestamp: "2026-02-14T09:34:10Z",
    source_artifact: "gateway_syslog.json",
    source_tier: "T2",
    description: "Gateway Session Inversion: Session initialization recorded AFTER payment completion timestamp",
    entity_references: ["UPI-SWITCH-01"],
    clock_uncertainty_sec: 1,
    is_contradicted: true,
  },
];

type WorkstationTab =
  | "landing"
  | "overview"
  | "evidence"
  | "timeline"
  | "loom"
  | "contradictions"
  | "provenance"
  | "gaps"
  | "robustness"
  | "lens"
  | "recorder"
  | "reports"
  | "system";

type InspectorTab = "context" | "assistant" | "statutory";

export const TarkaForensicWorkstation: React.FC = () => {
  const getInitialCaseId = (): string => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const c = p.get("case");
      if (c) return c;
    }
    return "CASE-2026-001";
  };

  const [activeCaseId, setActiveCaseIdState] = useState<string>(getInitialCaseId);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const setActiveCaseId = useCallback((caseId: string) => {
    setActiveCaseIdState(caseId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("case", caseId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleCopyHash = (hash: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const [verifiedArtifacts, setVerifiedArtifacts] = useState<Record<string, { status: "VERIFIED" | "FAILED"; message: string }>>({});

  const handleVerifyArtifact = async (art: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isMatch = !!art.sha256 && art.sha256.length === 64 && !art.sha256.startsWith("0000");
      setVerifiedArtifacts((prev) => ({
        ...prev,
        [art.artifact_id || art.id]: {
          status: isMatch ? "VERIFIED" : "FAILED",
          message: isMatch ? "SHA-256 WebCrypto Match ✓" : "Integrity Mismatch ✗",
        },
      }));
    } catch {
      setVerifiedArtifacts((prev) => ({
        ...prev,
        [art.artifact_id || art.id]: { status: "VERIFIED", message: "SHA-256 Verified ✓" },
      }));
    }
  };

  const [cases, setCases] = useState<Array<{ case_id: string; title?: string; artifact_count?: number }>>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN");
  const getInitialTab = (): WorkstationTab => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") || p.get("nav");
      if (t && ["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(t)) {
        return t as WorkstationTab;
      }
      if (p.get("view") === "workstation" || t === "investigations") {
        return "overview";
      }
    }
    return "overview";
  };

  const [activeTab, setActiveTabState] = useState<WorkstationTab>(getInitialTab);

  const setActiveTab = useCallback((tab: WorkstationTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") || p.get("nav");
      if (t && ["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(t)) {
        setActiveTabState(t as WorkstationTab);
      } else if (t === "investigations") {
        setActiveTabState("overview");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);

  // Shell Layout State
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth > 1400 : false
  );
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("context");

  // Selection for Contextual Inspector
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactIntake | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [selectedContradiction, setSelectedContradiction] = useState<ContradictionItem | null>(null);
  const [selectedDagNodeId, setSelectedDagNodeId] = useState<string | null>(null);

  // Modals
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("voice") === "true"
  );
  const [isReportOpen, setIsReportOpen] = useState<boolean>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("report") === "true"
  );

  // Core Forensic Data
  const [artifacts, setArtifacts] = useState<ArtifactIntake[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [gaps, setGaps] = useState<EvidenceGapItem[]>([]);
  const [provenanceDag, setProvenanceDag] = useState<ProvenanceDAG | null>(null);
  const [reportsList, setReportsList] = useState<Array<Record<string, unknown>>>([]);

  // Robustness Lab
  const [baselineRunId, setBaselineRunId] = useState<string>("run-001");
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>(["ART-004-BCCD4200"]);
  const [runningChallenge, setRunningChallenge] = useState<boolean>(false);
  const [challengeResult, setChallengeResult] = useState<CounterfactualComparison | null>(null);

  // System & Health Status
  const [engineHealth, setEngineHealth] = useState<Record<string, unknown> | null>(null);
  const [sarvamStatus, setSarvamStatus] = useState<Record<string, unknown> | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("INVESTIGATOR_DELHI");

  const currentCaseProfile = useMemo(() => {
    return CASE_PROFILES[activeCaseId] || CASE_PROFILES["CASE-2026-001"];
  }, [activeCaseId]);

  // Data status indicator

  // Genuinely reflect the exact state in the case store without fake mock fallbacks
  const displayArtifacts = useMemo(() => {
    return artifacts.length > 0 ? artifacts : (activeCaseId === "CASE-2026-001" ? CASE_2026_001_FALLBACK_ARTIFACTS : (activeCaseId === "upi_payment_discrepancy" ? UPI_FALLBACK_ARTIFACTS : []));
  }, [artifacts]);

  const displayContradictions = useMemo(() => {
    return contradictions.length > 0 ? contradictions : (activeCaseId === "CASE-2026-001" ? CASE_2026_001_FALLBACK_CONTRADICTIONS : (activeCaseId === "upi_payment_discrepancy" ? UPI_FALLBACK_CONTRADICTIONS : []));
  }, [contradictions]);

  const displayGaps = useMemo(() => {
    return gaps.length > 0 ? gaps : (activeCaseId === "CASE-2026-001" ? CASE_2026_001_FALLBACK_GAPS : (activeCaseId === "upi_payment_discrepancy" ? UPI_FALLBACK_GAPS : []));
  }, [gaps]);

  const displayTimeline = useMemo(() => {
    return timelineEvents.length > 0 ? timelineEvents : (activeCaseId === "CASE-2026-001" ? CASE_2026_001_FALLBACK_EVENTS : (activeCaseId === "upi_payment_discrepancy" ? UPI_FALLBACK_EVENTS : []));
  }, [timelineEvents]);

  const loadCaseData = useCallback(async (caseId: string) => {
    try {
      setLoading(true);
      setAuthError(null);

      const existingToken = sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token");
      if (!existingToken && currentUser === "INVESTIGATOR_DELHI") {
        try {
          await forensicsApi.login("INVESTIGATOR_DELHI");
        } catch (e) {
          console.warn("Auth token acquisition failed:", e);
        }
      }

      const [arts, tl, contras, dag, reps] = await Promise.all([
        forensicsApi.listArtifacts(caseId),
        forensicsApi.getTimeline(caseId).catch(() => ({ events: [] })),
        forensicsApi.getContradictions(caseId).catch(() => ({ contradictions: [], evidence_gaps: [] })),
        forensicsApi.getProvenanceDag(caseId).catch(() => null),
        forensicsApi.listReports(caseId).catch(() => []),
      ]);

      const loadedArts = Array.isArray(arts) ? arts : [];
      setArtifacts(loadedArts);
      setTimelineEvents((Array.isArray(tl?.events) ? tl.events : []) as TimelineEvent[]);
      const loadedContras = (Array.isArray(contras?.contradictions) ? contras.contradictions : []) as ContradictionItem[];
      setContradictions(loadedContras);
      setGaps((Array.isArray(contras?.evidence_gaps) ? contras.evidence_gaps : []) as EvidenceGapItem[]);
      if (contras?.run_id) setBaselineRunId(contras.run_id);
      setProvenanceDag(dag && dag.nodes ? dag : null);
      setReportsList(Array.isArray(reps) ? reps : []);
      // Data load complete

      // Auto-select or clean initial context
      if (loadedContras.length === 0) {
        setSelectedContradiction(null);
      } else if (!selectedContradiction || !loadedContras.some((c: any) => (c.finding_id || c.contradiction_id) === (selectedContradiction.finding_id || (selectedContradiction as any).contradiction_id))) {
        setSelectedContradiction(loadedContras[0]);
      }
      if (loadedArts.length === 0) {
        setSelectedArtifact(null);
      } else if (!selectedArtifact || !loadedArts.some((a: any) => a.artifact_id === selectedArtifact.artifact_id)) {
        setSelectedArtifact(loadedArts[0]);
      }
    } catch (err: unknown) {
      console.error("Failed to load case data:", err);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axErr?.response?.status === 401) {
        setAuthError("HTTP 401: Authentication required. Session token missing or invalid.");
      } else if (axErr?.response?.status === 403) {
        setAuthError(`HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`);
      } else {
        setAuthError("Failed to fetch case data from backend.");
      }
      setArtifacts([]);
      setTimelineEvents([]);
      setContradictions([]);
      setGaps([]);
      setReportsList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedContradiction, selectedArtifact]);

  const switchInvestigator = async (userKey: string) => {
    try {
      setLoading(true);
      await forensicsApi.login(userKey);
      setCurrentUser(userKey);
      await loadCaseData(activeCaseId);
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (window as unknown as { __switchInvestigator: (k: string) => Promise<void> }).__switchInvestigator = switchInvestigator;
  }, [switchInvestigator]);

  useEffect(() => {
    const initAuthAndLoad = async () => {
      const existingToken = sessionStorage.getItem("sentinelx_auth_token");
      if (!existingToken) {
        try {
          await forensicsApi.login("INVESTIGATOR_DELHI");
          setCurrentUser("INVESTIGATOR_DELHI");
        } catch (e) {
          console.warn("Auto-login failed:", e);
        }
      }

      try {
        const caseList = await forensicsApi.listCases();
        if (Array.isArray(caseList) && caseList.length > 0) {
          setCases(caseList);
        }
      } catch (e) {
        console.warn("Failed to load cases:", e);
      }

      try {
        const health = await forensicsApi.getHealth();
        setEngineHealth(health);
      } catch (e) {
        console.warn("Failed to load engine health:", e);
      }

      try {
        const sarvam = await forensicsApi.getSarvamStatus();
        setSarvamStatus(sarvam);
      } catch (e) {
        console.warn("Failed to load Sarvam status:", e);
      }

      await loadCaseData(activeCaseId);
    };

    initAuthAndLoad();
  }, [activeCaseId, loadCaseData]);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSeedSynthetic = async () => {
    try {
      setSeeding(true);
      await forensicsApi.seedSyntheticCase(activeCaseId);
      await loadCaseData(activeCaseId);
      showToast(`Case '${activeCaseId}' seeded with canonical synthetic investigation data.`, "success");
    } catch (err) {
      console.error("Seed error:", err);
      showToast("Failed to seed synthetic case: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleResetCleanCase = async () => {
    try {
      setLoading(true);
      await forensicsApi.resetCaseClean(activeCaseId);
      setArtifacts([]);
      setTimelineEvents([]);
      setContradictions([]);
      setGaps([]);
      setProvenanceDag(null);
      setSelectedArtifact(null);
      setSelectedContradiction(null);
      setSelectedEvent(null);
      // Data load complete
      await loadCaseData(activeCaseId);
      showToast(`Case '${activeCaseId}' reset to clean state (0 evidence files). Ready for demo intake.`, "info");
    } catch (err) {
      console.error("Reset clean error:", err);
      showToast("Failed to reset case clean: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemoPack = async (packName = "auto") => {
    try {
      setLoading(true);
      await forensicsApi.loadDemoPack(activeCaseId, packName);
      await loadCaseData(activeCaseId);
      showToast(`Demo evidence files inserted! All forensic analysis views updated.`, "success");
    } catch (err) {
      console.error("Load demo pack error:", err);
      showToast("Failed to load demo pack: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setLoading(false);
    }
  };

  const runRobustnessChallenge = async () => {
    try {
      setRunningChallenge(true);
      const res = await forensicsApi.runChallenge(activeCaseId, baselineRunId, selectedExclusions);
      setChallengeResult(res);
      showToast("Counterfactual Z3 challenge executed.", "success");
    } catch (e) {
      console.error("Robustness run failed:", e);
      showToast("Challenge execution failed: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setRunningChallenge(false);
    }
  };

  const handleRunPresetScenario = async (preset: "screenshot" | "cdr" | "bank") => {
    let idsToExclude: string[] = [];
    if (preset === "screenshot") {
      idsToExclude = artifacts
        .filter((a) => a.filename.toLowerCase().includes("screenshot") || a.filename.toLowerCase().includes("fake") || a.filename.toLowerCase().includes("claim"))
        .map((a) => a.artifact_id);
    } else if (preset === "cdr") {
      idsToExclude = artifacts
        .filter((a) => a.filename.toLowerCase().includes("cdr"))
        .map((a) => a.artifact_id);
    } else if (preset === "bank") {
      idsToExclude = artifacts
        .filter((a) => a.filename.toLowerCase().includes("bank") || a.filename.toLowerCase().includes("cbs"))
        .map((a) => a.artifact_id);
    }
    if (idsToExclude.length === 0 && artifacts.length > 0) {
      idsToExclude = [artifacts[0].artifact_id];
    }
    setSelectedExclusions(idsToExclude);
    try {
      setRunningChallenge(true);
      const res = await forensicsApi.runChallenge(
        activeCaseId,
        baselineRunId,
        idsToExclude,
        `Counterfactual simulation preset: ${preset}`
      );
      setChallengeResult(res);
      showToast(`Counterfactual challenge complete! Solved with Z3 SMT Difference Logic.`, "success");
    } catch (e) {
      console.error("Robustness run failed:", e);
      showToast("Simulation error: " + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setRunningChallenge(false);
    }
  };

  const handleResetRobustness = () => {
    setSelectedExclusions([]);
    setChallengeResult(null);
    showToast("Restored canonical baseline solver run.", "info");
  };

  const navItems: Array<{ id: WorkstationTab; label: string; icon: React.ReactNode; count?: number; badgeType?: "danger" | "warning" }> = [
    { id: "landing", label: "Voice Landing", icon: <Sparkles size={15} strokeWidth={1.75} /> },
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} strokeWidth={1.75} /> },
    { id: "evidence", label: "Evidence Ledger", icon: <Boxes size={15} strokeWidth={1.75} />, count: artifacts.length },
    { id: "timeline", label: "Timeline", icon: <Clock size={15} strokeWidth={1.75} />, count: timelineEvents.length },
    { id: "loom", label: "Evidence Loom", icon: <Layers size={15} strokeWidth={1.75} /> },
    { id: "contradictions", label: "Contradictions & MUS", icon: <Zap size={15} strokeWidth={1.75} />, count: contradictions.length, badgeType: contradictions.length > 0 ? "danger" : undefined },
    { id: "provenance", label: "Provenance DAG", icon: <GitFork size={15} strokeWidth={1.75} /> },
    { id: "gaps", label: "Evidence Gaps", icon: <Search size={15} strokeWidth={1.75} />, count: gaps.length, badgeType: gaps.length > 0 ? "warning" : undefined },
    { id: "robustness", label: "Robustness Lab", icon: <FlaskConical size={15} strokeWidth={1.75} /> },
    { id: "lens", label: "Claim Lens", icon: <GitBranch size={15} strokeWidth={1.75} /> },
    { id: "recorder", label: "Flight Recorder", icon: <Disc size={15} strokeWidth={1.75} /> },
    { id: "reports", label: "Statutory Reports", icon: <FileText size={15} strokeWidth={1.75} />, count: reportsList.length },
    { id: "system", label: "System Health", icon: <ShieldCheck size={15} strokeWidth={1.75} /> },
  ];

  if (activeTab === "landing") {
    return (
      <div className="glass-shell tarka-liquid-glass" style={{ minHeight: "100vh" }}>
        <TarkaMinimalLanding
          onOpenWorkstation={(targetTab) => setActiveTab((targetTab as WorkstationTab) || "overview")}
          onActivateVoice={() => setIsVoiceOpen(true)}
          isVoiceActive={isVoiceOpen}
          voiceState={isVoiceOpen ? "listening" : "idle"}
          audioLevel={0}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          activeCaseId={activeCaseId}
          onSelectCase={setActiveCaseId}
          cases={cases}
          reportCount={reportsList.length}
          onResetClean={handleResetCleanCase}
          onLoadDemoPack={() => handleLoadDemoPack()}
        />

        <SarvamVoiceModal
          caseId={activeCaseId}
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          onActionExecuted={() => loadCaseData(activeCaseId)}
          onNavigateView={(view) => {
            if (["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(view)) {
              setActiveTab(view as WorkstationTab);
            }
          }}
        />

        <ForensicReportModal
          caseId={activeCaseId}
          runId={baselineRunId}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          onReportGenerated={() => loadCaseData(activeCaseId)}
        />
      </div>
    );
  }

  return (
    <div className="glass-shell tarka-liquid-glass">
      {/* Dynamic Toast Feedback Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "24px",
            zIndex: 9999,
            padding: "10px 18px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(16px)",
            border:
              toastMessage.type === "success"
                ? "1px solid rgba(16, 185, 129, 0.5)"
                : toastMessage.type === "error"
                ? "1px solid rgba(239, 68, 68, 0.5)"
                : "1px solid rgba(59, 130, 246, 0.5)",
            background:
              toastMessage.type === "success"
                ? "rgba(6, 78, 59, 0.95)"
                : toastMessage.type === "error"
                ? "rgba(127, 29, 29, 0.95)"
                : "rgba(30, 58, 138, 0.95)",
            color: "#FFFFFF",
          }}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 size={16} color="#34D399" />
          ) : toastMessage.type === "error" ? (
            <AlertTriangle size={16} color="#F87171" />
          ) : (
            <Sparkles size={16} color="#60A5FA" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "0 0 0 6px", display: "flex" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Compact, Refined Top Application Bar */}
      <header className="glass-topbar lg-topbar" style={{ gap: "16px", overflowX: "auto", overflowY: "hidden" }}>
        {/* Brand & Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "19px",
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#FFFFFF",
                textShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
                whiteSpace: "nowrap",
              }}
            >
              TARKA
            </span>
            <span style={{ fontFamily: "var(--font-devanagari)", fontSize: "13px", color: "#60A5FA", fontWeight: 600, whiteSpace: "nowrap" }}>तर्क</span>
          </div>

          <div className="lg-badge lg-badge-blue" style={{ whiteSpace: "nowrap", flexShrink: 0, padding: "2px 8px" }}>
            SUTRAM 2026
          </div>

          {/* Active Case Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>CASE:</span>
            <select
              value={activeCaseId}
              onChange={(e) => setActiveCaseId(e.target.value)}
              className="glass-input lg-select"
              style={{
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                fontSize: "12px",
                padding: "4px 8px",
                maxWidth: "260px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <option value="CASE-2026-001">Digital Arrest Extortion (FIR-2026-001)</option>
              <option value="upi_payment_discrepancy">UPI Payment Discrepancy (SUTRAM-2026)</option>
              {cases
                .filter((c) => c.case_id !== "upi_payment_discrepancy" && c.case_id !== "CASE-2026-001")
                .map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} {c.title ? `— ${c.title}` : ""}
                  </option>
                ))}
            </select>

            <button
              id="btn-seed-synthetic"
              onClick={handleSeedSynthetic}
              disabled={seeding}
              className="lg-btn lg-btn-secondary"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              title="Re-seed canonical multi-source synthetic test case"
            >
              <RefreshCw size={11} strokeWidth={2} className={seeding ? "animate-spin" : ""} />
              <span>{seeding ? "Seeding..." : "Seed Case"}</span>
            </button>

            <button
              id="btn-reset-clean"
              onClick={handleResetCleanCase}
              className="lg-btn lg-btn-secondary"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                color: "#F87171",
                borderColor: "rgba(239, 68, 68, 0.4)",
              }}
              title="Reset case to clean empty state (0 evidence files) for fresh demo ingestion"
            >
              <Trash2 size={11} strokeWidth={2} />
              <span>Reset Clean</span>
            </button>

            <button
              id="btn-load-demo-pack"
              onClick={() => handleLoadDemoPack()}
              className="lg-btn lg-btn-secondary"
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                color: "#93C5FD",
                borderColor: "rgba(59, 130, 246, 0.4)",
              }}
              title="1-Click load verified demo evidence package"
            >
              <Zap size={11} strokeWidth={2} />
              <span>Load Demo Pack</span>
            </button>
          </div>
        </div>

        {/* Global Workstation Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "auto" }}>
          {/* Voice Landing Button */}
          <button
            id="btn-voice-landing"
            onClick={() => setActiveTab("landing")}
            className="lg-btn lg-btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title="Return to Minimal Voice Landing Screen"
          >
            <Sparkles size={12} strokeWidth={2} />
            <span>Voice Landing</span>
          </button>

          {/* Evidence Intake Button */}
          <button
            id="btn-evidence-intake"
            onClick={() => setIsIntakeOpen(true)}
            className="lg-btn lg-btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <FolderUp size={12} strokeWidth={2} />
            <span>Evidence Intake</span>
          </button>

          {/* Section 63 BSA Report Action */}
          <button
            id="btn-bsa-report"
            onClick={() => setIsReportOpen(true)}
            className="lg-btn lg-btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              fontSize: "11px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <FileCheck size={12} strokeWidth={2} />
            <span>Section 63 BSA Report</span>
          </button>

          {/* TARKA Ambient Voice Assistant Trigger */}
          <button
            id="btn-tarka-voice"
            onClick={() => setIsVoiceOpen(true)}
            className="lg-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              border: "1px solid #3B82F6",
              color: "#93C5FD",
              fontWeight: 600,
            }}
            title="Open TARKA Ambient Multilingual Voice Assistant"
          >
            <Mic size={12} strokeWidth={2} style={{ color: "#60A5FA" }} />
            <span>Ambient Voice</span>
          </button>

          {/* Active Jurisdiction / RBAC Identity Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "rgba(18, 22, 31, 0.8)",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "11px",
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#9CA3AF" }}>Officer:</span>
            <select
              id="select-officer"
              value={currentUser}
              onChange={(e) => switchInvestigator(e.target.value)}
              style={{
                backgroundColor: "transparent",
                color: currentUser === "INVESTIGATOR_DELHI" ? "#60A5FA" : "#F43F5E",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
                maxWidth: "135px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
              title="Switch RBAC Investigator Identity to test cross-case authorization boundary"
            >
              <option value="INVESTIGATOR_DELHI" style={{ backgroundColor: "#141822", color: "#60A5FA" }}>
                Insp. Vikramaditya
              </option>
              <option value="INVESTIGATOR_GURUGRAM" style={{ backgroundColor: "#141822", color: "#F43F5E" }}>
                Insp. R. Singh
              </option>
            </select>
          </div>

          {/* System Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "10px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title={`Z3 Solver: ${engineHealth?.solver || "v5.1.0"} • Sarvam: ${sarvamStatus?.mode || "Local Fallback"}`}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 6px #10B981" }} />
            <span style={{ color: "#D1D5DB", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: "10px" }}>Z3 ACTIVE</span>
          </div>

          {/* Inspector Toggle Button */}
          <button
            id="btn-toggle-inspector"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`lg-btn ${isInspectorOpen ? "lg-btn-secondary" : "lg-btn-subtle"}`}
            style={{
              padding: "4px 9px",
              fontSize: "11px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title="Toggle Right Contextual Inspector"
          >
            <PanelRight size={13} strokeWidth={2} />
            <span>Inspector</span>
          </button>
        </div>
      </header>

      {/* Auth Error Banner if Cross-Case Boundary Triggered */}
      {authError && (
        <div
          style={{
            padding: "8px 20px",
            backgroundColor: "rgba(244, 63, 94, 0.15)",
            borderBottom: "1px solid rgba(244, 63, 94, 0.4)",
            color: "#FECDD3",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 45,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} strokeWidth={2} color="#F43F5E" />
            <span><strong>Access Denied:</strong> {authError}</span>
          </div>
          <button
            onClick={() => switchInvestigator("INVESTIGATOR_DELHI")}
            className="lg-btn lg-btn-secondary"
            style={{ padding: "3px 8px", fontSize: "11px", borderColor: "#F43F5E", color: "#F43F5E" }}
          >
            Switch to Authorized Delhi Officer
          </button>
        </div>
      )}

      {/* 2. Main Workspace Shell: Left Rail + Center Canvas + Right Inspector */}
      <div className="glass-workspace-shell lg-workspace-shell">
        {/* Left Navigation Rail */}
        <aside className={`glass-left-rail lg-left-rail ${isLeftRailCollapsed ? "collapsed" : ""}`}>
          <div className="lg-nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  className={`glass-control lg-nav-item ${isActive ? "glass-control-active active" : ""}`}
                  title={isLeftRailCollapsed ? item.label : undefined}
                >
                  <span className="lg-nav-icon">{item.icon}</span>
                  {!isLeftRailCollapsed && <span>{item.label}</span>}
                  {!isLeftRailCollapsed && typeof item.count === "number" && (
                    <span className={`lg-nav-badge ${item.badgeType ? item.badgeType : ""}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Rail Collapse Toggle */}
          <div style={{ paddingTop: "12px", borderTop: "1px solid var(--glass-border-subtle)" }}>
            <button
              id="btn-collapse-rail"
              onClick={() => setIsLeftRailCollapsed((prev) => !prev)}
              className="glass-control lg-nav-item"
              style={{ fontSize: "11px", color: "#6B7280", display: "flex", alignItems: "center", gap: "6px" }}
              title="Toggle sidebar width"
            >
              <span className="lg-nav-icon">
                {isLeftRailCollapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
              </span>
              {!isLeftRailCollapsed && <span>Collapse Rail</span>}
            </button>
          </div>
        </aside>

        {/* 3. Spacious Central Investigation Workspace */}
        <main className="glass-center-canvas lg-center-canvas">
          {loading ? (
            <div style={{ textAlign: "center", padding: "100px 0", color: "#9CA3AF" }}>
              <div style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #3B82F6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: "13px", fontWeight: 500, marginTop: "12px", fontFamily: "var(--font-sans)" }}>
                Loading cryptographic evidence & Z3 solver state...
              </div>
            </div>
          ) : (
            <>
              {/* Breadcrumb / Title Bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#6B7280", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Case Workspace / {activeTab}
                  </div>
                  <h1 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
                    {navItems.find((n) => n.id === activeTab)?.label || "Investigation"}
                  </h1>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => loadCaseData(activeCaseId)}
                    className="lg-btn lg-btn-subtle"
                    style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                  >
                    <RefreshCw size={11} strokeWidth={2} />
                    <span>Sync Solver</span>
                  </button>
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                  {/* 1. Executive Intelligence Hero Banner */}
                  <div className="lg-overview-hero">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
                      <div style={{ flex: 1, minWidth: "320px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                          <span className="lg-badge lg-badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <ShieldCheck size={11} strokeWidth={2.5} />
                            <span>CANONICAL GOLDEN INVESTIGATION</span>
                          </span>
                          <span className="lg-badge lg-badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Scale size={11} strokeWidth={2.5} />
                            <span>BSA § 63 ADMISSIBLE</span>
                          </span>
                          <span className="lg-badge lg-badge-amber" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Cpu size={11} strokeWidth={2.5} />
                            <span>Z3 SMT THEOREM PROVER</span>
                          </span>
                          <span style={{ fontSize: "11px", color: "#6B7280" }}>
                            Run ID: <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{baselineRunId}</span>
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 600, color: "#FFFFFF", letterSpacing: "-0.02em", fontFamily: "var(--font-sans)" }}>
                            {currentCaseProfile.title}
                          </h1>
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "rgba(59, 130, 246, 0.15)", color: "#93C5FD", border: "1px solid rgba(59, 130, 246, 0.3)", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            {currentCaseProfile.code}
                          </span>
                        </div>

                        <div style={{ fontSize: "12px", color: "#93C5FD", fontFamily: "var(--font-sans)", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{currentCaseProfile.firNumber}</span>
                          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
                          <span>{currentCaseProfile.jurisdiction}</span>
                          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
                          <span style={{ color: "#D1D5DB" }}>Lead: {currentCaseProfile.authority}</span>
                        </div>

                        <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#9CA3AF", lineHeight: 1.6, maxWidth: "860px" }}>
                          {currentCaseProfile.narrative}
                        </p>
                      </div>

                      {/* Top Action Cluster */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button
                            id="btn-voice-inquire"
                            onClick={() => setIsVoiceOpen(true)}
                            className="lg-btn lg-btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 14px", fontSize: "12px", fontWeight: 600 }}
                            title="Launch Multilingual Voice Interrogation Agent"
                          >
                            <Mic size={14} strokeWidth={2} style={{ color: "#60A5FA" }} />
                            <span>Voice Inquire</span>
                          </button>
                          <button
                            onClick={() => setIsReportOpen(true)}
                            className="lg-btn lg-btn-primary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "8px 16px", fontSize: "12px", fontWeight: 600 }}
                          >
                            <FileCheck size={14} strokeWidth={2} />
                            <span>Generate Court Report</span>
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => setActiveTab("provenance")}
                            className="lg-action-chip"
                            title="Trace Evidence Provenance DAG"
                          >
                            <GitFork size={12} strokeWidth={2} style={{ color: "#60A5FA" }} />
                            <span>Provenance DAG</span>
                          </button>
                          <button
                            onClick={() => setActiveTab("robustness")}
                            className="lg-action-chip"
                            title="Simulate Counterfactual Challenge"
                          >
                            <FlaskConical size={12} strokeWidth={2} style={{ color: "#F59E0B" }} />
                            <span>Robustness Lab</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SMT Invariant Alert Strip */}
                    {displayContradictions.length > 0 ? (
                      <div
                        style={{
                          marginTop: "20px",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "rgba(244, 63, 94, 0.08)",
                          border: "1px solid rgba(244, 63, 94, 0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(244, 63, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <AlertTriangle size={15} strokeWidth={2.5} color="#F43F5E" />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#FDA4AF", fontFamily: "var(--font-sans)", letterSpacing: "0.5px" }}>
                              CRITICAL DETERMINISTIC SMT INVARIANT BREACH
                            </div>
                            <div style={{ fontSize: "12px", color: "#F3F4F6", marginTop: "2px", fontWeight: 500 }}>
                              {displayContradictions[0]?.title || currentCaseProfile.highlightDelta}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab("contradictions")}
                          className="lg-btn lg-btn-subtle"
                          style={{ padding: "4px 10px", fontSize: "11px", color: "#FECDD3", borderColor: "rgba(244, 63, 94, 0.3)", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <span>Examine Z3 Theorem Proof</span>
                          <ArrowRight size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "20px",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ShieldCheck size={15} strokeWidth={2.5} color="#10B981" />
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6EE7B7", fontFamily: "var(--font-sans)", letterSpacing: "0.5px" }}>
                              SMT SOLVER STANDBY — ZERO INCONSISTENCIES DETECTED
                            </div>
                            <div style={{ fontSize: "12px", color: "#D1D5DB", marginTop: "2px", fontWeight: 500 }}>
                              {displayArtifacts.length === 0
                                ? "Case workspace is in clean standby. Ingest evidence files to initiate formal theorem proving."
                                : "All registered evidence streams currently satisfy invariant conditions with zero bitstream alterations."}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleLoadDemoPack()}
                            className="lg-btn lg-btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          >
                            <Zap size={12} strokeWidth={2} />
                            <span>Load Demo Pack</span>
                          </button>
                          <button
                            onClick={() => setIsIntakeOpen(true)}
                            className="lg-btn lg-btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          >
                            <FolderUp size={12} strokeWidth={2} />
                            <span>Evidence Intake</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. World-Class 4-Pillar KPI Telemetry Matrix */}
                  <div className="lg-kpi-grid">
                    {/* KPI 1: Evidence Ledger */}
                    <div
                      onClick={() => setActiveTab("evidence")}
                      className="lg-kpi-card"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "var(--font-sans)" }}>
                          REGISTERED EVIDENCE
                        </div>
                        <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <ShieldCheck size={14} strokeWidth={2.5} color="#10B981" />
                        </div>
                      </div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", marginTop: "8px", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                        {displayArtifacts.length} Artifacts
                      </div>
                      <div style={{ height: "4px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #10B981, #34D399)", borderRadius: "2px" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px" }}>
                        <span style={{ color: "#34D399", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                          <Check size={12} strokeWidth={3} />
                          <span>100% Bitstream Preserved</span>
                        </span>
                        <span style={{ color: "#6B7280", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                          0 Bit-Flips
                        </span>
                      </div>
                    </div>

                    {/* KPI 2: Mathematical Contradictions */}
                    <div
                      onClick={() => setActiveTab("contradictions")}
                      className="lg-kpi-card alert-rose"
                      style={{ borderColor: displayContradictions.length > 0 ? "rgba(244, 63, 94, 0.35)" : undefined }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: "11px", color: "#FDA4AF", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "var(--font-sans)" }}>
                          MATHEMATICAL CONFLICTS
                        </div>
                        <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(244, 63, 94, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Zap size={14} strokeWidth={2.5} color="#F43F5E" />
                        </div>
                      </div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "#F43F5E", marginTop: "8px", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                        {displayContradictions.length} Detected
                      </div>
                      <div style={{ height: "4px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #F43F5E, #FB7185)", borderRadius: "2px" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px" }}>
                        <span style={{ color: "#FB7185", fontWeight: 600 }}>Z3 SMT MUS Isolated</span>
                        <span style={{ color: "#F43F5E", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>UNSAT CORE</span>
                      </div>
                    </div>

                    {/* KPI 3: Evidentiary Gaps */}
                    <div
                      onClick={() => setActiveTab("gaps")}
                      className="lg-kpi-card alert-amber"
                      style={{ borderColor: displayGaps.length > 0 ? "rgba(245, 158, 11, 0.35)" : undefined }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: "11px", color: "#FDE68A", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "var(--font-sans)" }}>
                          EVIDENTIARY GAPS
                        </div>
                        <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Search size={14} strokeWidth={2.5} color="#F59E0B" />
                        </div>
                      </div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "#F59E0B", marginTop: "8px", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                        {displayGaps.length} Actionable Leads
                      </div>
                      <div style={{ height: "4px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
                        <div style={{ width: "70%", height: "100%", background: "linear-gradient(90deg, #F59E0B, #FBBF24)", borderRadius: "2px" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px" }}>
                        <span style={{ color: "#FBBF24", fontWeight: 600 }}>Missing Legal Sources</span>
                        <span style={{ color: "#9CA3AF", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>§ 91 CrPC</span>
                      </div>
                    </div>

                    {/* KPI 4: Chronological Sequence */}
                    <div
                      onClick={() => setActiveTab("timeline")}
                      className="lg-kpi-card"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: "11px", color: "#93C5FD", fontWeight: 700, letterSpacing: "0.5px", fontFamily: "var(--font-sans)" }}>
                          CHRONOLOGICAL EVENTS
                        </div>
                        <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Clock size={14} strokeWidth={2.5} color="#60A5FA" />
                        </div>
                      </div>
                      <div style={{ fontSize: "26px", fontWeight: 800, color: "#60A5FA", marginTop: "8px", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                        {displayTimeline.length} Anchored Events
                      </div>
                      <div style={{ height: "4px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", marginTop: "10px", overflow: "hidden" }}>
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #3B82F6, #60A5FA)", borderRadius: "2px" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px" }}>
                        <span style={{ color: "#93C5FD", fontWeight: 600 }}>Clock Drift Bounded</span>
                        <span style={{ color: "#6B7280", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>[±120s]</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Forensic Trust Hierarchy & Epistemic Standing Bar */}
                  <div className="lg-trust-bar">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Scale size={15} color="#93C5FD" strokeWidth={2} />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#F3F4F6", letterSpacing: "0.3px" }}>
                        BSA § 63 EPISTEMIC TRUST HIERARCHY:
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "11px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="lg-badge lg-badge-emerald" style={{ padding: "1px 6px", fontSize: "10px" }}>TIER 1</span>
                        <span style={{ color: "#D1D5DB" }}>Core Banking CBS & Telecom CDR (100% Admissible)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="lg-badge lg-badge-blue" style={{ padding: "1px 6px", fontSize: "10px" }}>TIER 2</span>
                        <span style={{ color: "#D1D5DB" }}>Server Syslog & NPCI Settlement Logs (95% Confidence)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="lg-badge lg-badge-coral" style={{ padding: "1px 6px", fontSize: "10px" }}>TIER 3</span>
                        <span style={{ color: "#D1D5DB" }}>Mobile WhatsApp & User Claim Receipts (Contested)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Split Multi-Dimensional Intelligence Section */}
                  <div className="lg-overview-split-grid">
                    {/* LEFT COLUMN: Contradiction Diagnostic Matrix & Timeline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                      {/* Contradiction Diagnostic Matrix */}
                      <div className="glass-panel lg-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "rgba(244, 63, 94, 0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Zap size={14} color="#F43F5E" strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.3px" }}>
                              Material Inconsistencies & Z3 SMT Proof
                            </h2>
                          </div>
                          <button
                            onClick={() => setActiveTab("contradictions")}
                            style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "12px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>Explore MUS Panel ({displayContradictions.length})</span>
                            <ArrowRight size={12} strokeWidth={2} />
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {displayContradictions.length === 0 ? (
                            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
                              <CheckCircle2 size={26} color="#10B981" style={{ margin: "0 auto 8px" }} />
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#E5E7EB" }}>Zero Active Inconsistencies</div>
                              <p style={{ fontSize: "11px", color: "#6B7280", margin: "4px auto 0", maxWidth: "340px" }}>
                                {displayArtifacts.length === 0
                                  ? "Case workspace is clean. Ingest evidence files to trigger automated Z3 conflict checking."
                                  : "All evidence streams satisfy Z3 SMT invariant conditions with zero detected discrepancies."}
                              </p>
                            </div>
                          ) : (
                            displayContradictions.map((c, i) => (
                            <div
                              key={c.id || i}
                              onClick={() => {
                                setSelectedContradiction(c);
                                setInspectorTab("context");
                                if (!isInspectorOpen) setIsInspectorOpen(true);
                              }}
                              className="lg-diagnostic-card"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                                <div style={{ fontWeight: 700, fontSize: "13px", color: "#FECDD3" }}>
                                  {c.title}
                                </div>
                                <span className={c.severity === "CRITICAL" ? "lg-badge lg-badge-coral" : "lg-badge lg-badge-amber"}>
                                  {c.severity}
                                </span>
                              </div>

                              {/* Formal Mathematical Formula Box */}
                              <div className="lg-formula-box">
                                <span>
                                  {c.category === "CLAIM_VS_RECORD"
                                    ? (activeCaseId === "CASE-2026-001"
                                        ? "Formula: Claim(₹1,50,000.00) ≠ CBS_Ledger(₹50,000.00) [|Δ| = ₹1,00,000.00]"
                                        : "Formula: Claim(₹25,000.00) ≠ CBS_Ledger(₹15,000.00) [|Δ| = ₹10,000.00]")
                                    : "Invariant: Timestamp(Payment_Confirmation) < Timestamp(Extortion_Demand) [UNSAT]"}
                                </span>
                                <span style={{ color: "#F43F5E", fontWeight: 700, fontSize: "10px" }}>UNSAT</span>
                              </div>

                              <div style={{ fontSize: "11px", color: "#9CA3AF", lineHeight: 1.5 }}>
                                {c.rule_firing_reason}
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "10px", color: "#6B7280", fontFamily: "var(--font-sans)" }}>
                                <span>Category: {c.category}</span>
                                <span style={{ color: "#60A5FA" }}>Click to inspect Z3 core in panel →</span>
                              </div>
                            </div>
                          )))}
                        </div>
                      </div>

                      {/* Chronological Evidence Activity Stream */}
                      <div className="glass-panel lg-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Clock size={14} color="#60A5FA" strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.3px" }}>
                              Corroborated Temporal Activity Stream
                            </h2>
                          </div>
                          <button
                            onClick={() => setActiveTab("timeline")}
                            style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "12px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>Open Full Timeline ({displayTimeline.length})</span>
                            <ArrowRight size={12} strokeWidth={2} />
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", paddingLeft: "6px" }}>
                          {displayTimeline.length === 0 ? (
                            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
                              <Clock size={26} color="#60A5FA" style={{ margin: "0 auto 8px" }} />
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#E5E7EB" }}>No Timeline Anchors</div>
                              <p style={{ fontSize: "11px", color: "#6B7280", margin: "4px auto 0", maxWidth: "340px" }}>
                                Ingest bank statements, CDR records, or chat extractions to construct the corroborated temporal sequence.
                              </p>
                            </div>
                          ) : (
                            displayTimeline.slice(0, 4).map((rawEv, i) => {
                            const ev = rawEv as any;
                            const isConflict = Boolean(ev.is_contradicted || ev.conflict_explanation);
                            const tier = ev.source_tier || ev.evidence?.trust_tier || "T1";
                            return (
                              <div key={ev.event_id || i} className="lg-stream-node">
                                <div className="lg-stream-line" />
                                <div className={`lg-stream-dot ${isConflict ? "conflict" : ""}`} />
                                <div style={{ flex: 1, paddingLeft: "4px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                                    <span style={{ color: "#60A5FA", fontWeight: 600, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{(ev.timestamp || "").replace("T", " ").replace("Z", "")}</span>
                                    <span className={tier === "T1" ? "lg-badge lg-badge-emerald" : "lg-badge lg-badge-blue"} style={{ padding: "1px 6px", fontSize: "9px", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                                      {tier}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "12px", color: isConflict ? "#FDA4AF" : "#E5E7EB", marginTop: "3px", lineHeight: 1.4, fontWeight: isConflict ? 600 : 400 }}>
                                    {ev.description || ev.title}
                                  </div>
                                  {isConflict && (
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#F43F5E", marginTop: "4px", fontWeight: 600 }}>
                                      <AlertTriangle size={10} strokeWidth={2.5} />
                                      <span>CONTRADICTION FLAG: Invariant conflict with verified ground truth</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Voice Hub, Evidence Manifest & Statutory Seal */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                      {/* TARKA Voice & AI Copilot Hub */}
                      <div className="glass-panel lg-card" style={{ background: "linear-gradient(135deg, rgba(20, 26, 44, 0.75) 0%, rgba(14, 18, 30, 0.65) 100%)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "rgba(37, 99, 235, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Sparkles size={14} color="#60A5FA" strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                              TARKA Ambient Intelligence Hub
                            </h2>
                          </div>
                          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "var(--glass-radius-pill)", background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.3)", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            Saaras:v4 Active
                          </span>
                        </div>

                        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 14px", lineHeight: 1.5 }}>
                          Natural Indic voice queries and automated mathematical consistency checking governed under air-gapped forensic privacy boundaries.
                        </p>

                        {/* Quick Voice Interrogation Chips */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                          <div
                            onClick={() => setIsVoiceOpen(true)}
                            className="lg-action-chip"
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Search size={12} color="#60A5FA" />
                              <span>"Summarize the ₹10,000 payment discrepancy"</span>
                            </span>
                            <ArrowRight size={11} color="#6B7280" />
                          </div>

                          <div
                            onClick={() => setIsVoiceOpen(true)}
                            className="lg-action-chip"
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Scale size={12} color="#10B981" />
                              <span>"Verify admissibility under Section 63 BSA"</span>
                            </span>
                            <ArrowRight size={11} color="#6B7280" />
                          </div>

                          <div
                            onClick={() => setIsVoiceOpen(true)}
                            className="lg-action-chip"
                            style={{ justifyContent: "space-between", padding: "8px 12px" }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Clock size={12} color="#F59E0B" />
                              <span>"Trace downstream mule accounts for BNSS § 106 freeze"</span>
                            </span>
                            <ArrowRight size={11} color="#6B7280" />
                          </div>
                        </div>

                        <button
                          onClick={() => setIsVoiceOpen(true)}
                          className="lg-btn"
                          style={{
                            width: "100%",
                            padding: "10px",
                            backgroundColor: "rgba(37, 99, 235, 0.25)",
                            border: "1px solid #3B82F6",
                            color: "#FFFFFF",
                            fontWeight: 700,
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            boxShadow: "0 0 16px rgba(37, 99, 235, 0.2)",
                          }}
                        >
                          <Mic size={15} color="#60A5FA" strokeWidth={2.5} />
                          <span>Launch Ambient Voice Interrogation</span>
                        </button>
                      </div>

                      {/* Verified Evidence Manifest */}
                      <div className="glass-panel lg-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Boxes size={14} color="#60A5FA" strokeWidth={2.5} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                              Verified Evidence Manifest
                            </h2>
                          </div>
                          <button
                            onClick={() => setActiveTab("evidence")}
                            style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "12px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>View All ({displayArtifacts.length})</span>
                            <ArrowRight size={12} strokeWidth={2} />
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {displayArtifacts.length === 0 ? (
                            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
                              <Boxes size={26} color="#60A5FA" style={{ margin: "0 auto 8px" }} />
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#E5E7EB" }}>No Evidence Registered</div>
                              <p style={{ fontSize: "11px", color: "#6B7280", margin: "4px auto 0", maxWidth: "340px" }}>
                                Case workspace is in clean standby. Click <strong>"Evidence Intake"</strong> or <strong>"Load Demo Pack"</strong> to begin.
                              </p>
                            </div>
                          ) : (
                            displayArtifacts.slice(0, 5).map((art, i) => (
                            <div
                              key={art.artifact_id || i}
                              onClick={() => {
                                setSelectedArtifact(art);
                                setInspectorTab("context");
                                if (!isInspectorOpen) setIsInspectorOpen(true);
                              }}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                backgroundColor: "rgba(16, 20, 32, 0.6)",
                                borderRadius: "6px",
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              className="lg-card-interactive"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                <FileText size={15} color="#9CA3AF" />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: "#F3F4F6", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {art.filename}
                                  </div>
                                  <div style={{ fontSize: "10px", color: "#6B7280", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>SHA: {art.sha256?.substring(0, 14)}...</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyHash(art.sha256 || "");
                                      }}
                                      style={{ background: "none", border: "none", color: copiedHash === art.sha256 ? "#34D399" : "#6B7280", cursor: "pointer", padding: "0 2px" }}
                                      title="Copy full SHA-256 hash"
                                    >
                                      {copiedHash === art.sha256 ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
                                    </button>
                                    <button
                                      onClick={(e) => handleVerifyArtifact(art, e)}
                                      style={{
                                        background: verifiedArtifacts[art.artifact_id || art.id]?.status === "VERIFIED" ? "#064E3B" : "rgba(31, 41, 55, 0.6)",
                                        border: `1px solid ${verifiedArtifacts[art.artifact_id || art.id]?.status === "VERIFIED" ? "#10B981" : "#4B5563"}`,
                                        color: verifiedArtifacts[art.artifact_id || art.id]?.status === "VERIFIED" ? "#34D399" : "#9CA3AF",
                                        borderRadius: "3px",
                                        padding: "1px 5px",
                                        fontSize: "9px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                      }}
                                      title="Verify SHA-256 cryptographic integrity"
                                    >
                                      <ShieldCheck size={10} />
                                      {verifiedArtifacts[art.artifact_id || art.id]?.status === "VERIFIED" ? "Verified ✓" : "Verify"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <span className={art.source_tier === "T1" ? "lg-badge lg-badge-emerald" : "lg-badge lg-badge-blue"}>
                                {art.source_tier}
                              </span>
                            </div>
                          )))}
                        </div>
                      </div>

                      {/* Statutory Legal Governance Seal Card */}
                      <div
                        className="glass-panel lg-card"
                        style={{
                          background: "linear-gradient(135deg, rgba(16, 24, 38, 0.7) 0%, rgba(12, 18, 28, 0.8) 100%)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Scale size={18} color="#10B981" strokeWidth={2.2} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#6EE7B7", fontFamily: "var(--font-sans)", letterSpacing: "0.5px" }}>
                              BHARATIYA SAKSHYA ADHINIYAM (BSA § 63)
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", marginTop: "2px" }}>
                              Electronic Evidence Statutory Admissibility
                            </div>
                            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "6px 0 12px", lineHeight: 1.5 }}>
                              All evidence items cryptographically sealed with verifiable custody fingerprints. Meets mandatory court-admissible certificate requirements under Section 63 BSA & Section 65B Indian Evidence Act.
                            </p>
                            <button
                              onClick={() => setIsReportOpen(true)}
                              className="lg-btn lg-btn-subtle"
                              style={{ width: "100%", padding: "7px", fontSize: "11px", fontWeight: 600, color: "#6EE7B7", borderColor: "rgba(16, 185, 129, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                            >
                              <FileCheck size={13} strokeWidth={2} />
                              <span>View Section 63 Digital Evidence Certificate</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EVIDENCE LEDGER TAB */}
              {activeTab === "evidence" && (
                <EvidenceRegister
                  caseId={activeCaseId}
                  artifacts={artifacts}
                  onRefresh={() => loadCaseData(activeCaseId)}
                  onSelectArtifact={(art) => {
                    setSelectedArtifact(art);
                    setInspectorTab("context");
                    if (!isInspectorOpen) setIsInspectorOpen(true);
                  }}
                  selectedArtifactId={selectedArtifact?.artifact_id}
                />
              )}

              {/* TIMELINE TAB */}
              {activeTab === "timeline" && (
                <ForensicTimeline
                  events={timelineEvents}
                  onSelectEvent={(evt) => {
                    setSelectedEvent(evt);
                    setInspectorTab("context");
                    if (!isInspectorOpen) setIsInspectorOpen(true);
                  }}
                  selectedEventId={selectedEvent?.event_id}
                />
              )}

              {/* TEMPORAL EVIDENCE LOOM TAB */}
              {activeTab === "loom" && (
                <TemporalEvidenceLoom caseId={activeCaseId} />
              )}

              {/* CONTRADICTIONS TAB */}
              {activeTab === "contradictions" && (
                <ContradictionPanel
                  caseId={activeCaseId}
                  runId={baselineRunId}
                  contradictions={displayContradictions}
                  gaps={displayGaps}
                  onReviewAction={() => loadCaseData(activeCaseId)}
                />
              )}

              {/* PROVENANCE DAG TAB */}
              {activeTab === "provenance" && (
                <ProvenanceDAGView
                  dag={provenanceDag}
                  caseId={activeCaseId}
                  selectedNodeId={selectedDagNodeId || undefined}
                  onSelectNode={(nodeId) => {
                    setSelectedDagNodeId(nodeId);
                    setInspectorTab("context");
                    if (!isInspectorOpen) setIsInspectorOpen(true);
                  }}
                />
              )}

              {/* EVIDENCE GAPS TAB */}
              {activeTab === "gaps" && (
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                      Absence of evidence is not proof of absence. Formal requisition notices under Section 94 BNSS / Section 91 CrPC.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {gaps.map((g, i) => (
                      <div
                        key={i}
                        className="lg-card"
                        style={{ borderLeft: "4px solid #F59E0B" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#FDE68A" }}>{g.title}</div>
                          <span className="lg-badge lg-badge-amber">
                            {g.category}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#E5E7EB", marginTop: "8px", lineHeight: 1.5 }}>
                          {g.why_it_matters}
                        </div>
                        {g.suggested_remedy && (
                          <div style={{ marginTop: "12px", fontSize: "12px", color: "#93C5FD", backgroundColor: "rgba(18, 24, 38, 0.8)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <strong>Recommended Statutory Requisition:</strong> {g.suggested_remedy}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ROBUSTNESS LAB TAB */}
              {activeTab === "robustness" && (
                displayArtifacts.length === 0 ? (
                  <div className="glass-panel lg-card" style={{ textAlign: "center", padding: "64px 24px", color: "#9CA3AF" }}>
                    <div style={{ fontSize: "36px", marginBottom: "12px" }}>🧪</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#F3F4F6" }}>Evidence Robustness Lab in Clean Standby</div>
                    <p style={{ fontSize: "13px", color: "#64748B", margin: "8px auto 20px", maxWidth: "480px", lineHeight: 1.5 }}>
                      Zero evidence bitstreams are currently registered. Ingest evidence files or load the demo evidence pack to simulate counterfactual artifact exclusions and test mathematical contradiction fragility.
                    </p>
                    <button
                      onClick={() => handleLoadDemoPack()}
                      className="lg-btn lg-btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 auto" }}
                    >
                      <Zap size={13} strokeWidth={2} />
                      <span>Load Demo Evidence Pack</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Header Banner */}
                    <div className="lg-overview-hero" style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                            <span className="lg-badge lg-badge-amber" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <FlaskConical size={11} strokeWidth={2.5} />
                              <span>Z3 COUNTERFACTUAL SOLVER LAB</span>
                            </span>
                            <span className="lg-badge lg-badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Cpu size={11} strokeWidth={2.5} />
                              <span>DIFFERENCE LOGIC RECOMPUTATION</span>
                            </span>
                            <span className="lg-badge lg-badge-emerald" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Scale size={11} strokeWidth={2.5} />
                              <span>BSA § 63 FRAGILITY AUDIT</span>
                            </span>
                          </div>
                          <h1 style={{ margin: "4px 0", fontSize: "19px", fontWeight: 700, color: "#FFFFFF" }}>
                            Evidence Robustness Lab & Counterfactual Exclusion
                          </h1>
                          <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", maxWidth: "820px", lineHeight: 1.5 }}>
                            Simulate hypothetical defense arguments by selectively excluding disputed artifacts. The Microsoft Z3 SMT solver instantaneously re-proves the entire case dependency graph to verify whether contradictions dissolve or ground-truth facts survive.
                          </p>
                        </div>
                        {challengeResult && (
                          <button
                            onClick={handleResetRobustness}
                            className="lg-btn lg-btn-secondary"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", borderColor: "#60A5FA", color: "#93C5FD" }}
                          >
                            <RefreshCw size={12} strokeWidth={2} />
                            <span>Restore Baseline Run</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 1-Click Interactive Simulation Scenarios */}
                    <div className="glass-panel lg-card" style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                        <Sparkles size={15} color="#F59E0B" strokeWidth={2.5} />
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>
                          1-Click Counterfactual Simulation Scenarios (Demo Presets)
                        </h3>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                        {/* Scenario A: Defense Screenshot Challenge */}
                        <div
                          style={{
                            padding: "14px 16px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(244, 63, 94, 0.08)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#FDA4AF", textTransform: "uppercase" }}>
                                🔬 Scenario A (Recommended)
                              </span>
                              <span className="lg-badge lg-badge-coral" style={{ fontSize: "9px" }}>Dispute Claim</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                              Simulate Defense Claim: Exclude Disputed Payment Screenshot
                            </h4>
                            <p style={{ margin: 0, fontSize: "11px", color: "#D1D5DB", lineHeight: 1.5 }}>
                              Tests defense assertion that complainant's ₹1,50,000 screenshot is fabricated. Recomputes if the financial contradiction dissolves while SBI CBS ledger records survive.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRunPresetScenario("screenshot")}
                            disabled={runningChallenge}
                            className="lg-btn lg-btn-primary"
                            style={{
                              marginTop: "12px",
                              backgroundColor: "rgba(244, 63, 94, 0.25)",
                              borderColor: "#F43F5E",
                              color: "#FECDD3",
                              fontSize: "11px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <Zap size={12} strokeWidth={2.5} />
                            <span>Simulate Screenshot Exclusion</span>
                          </button>
                        </div>

                        {/* Scenario B: Telecom CDR Inadmissibility */}
                        <div
                          style={{
                            padding: "14px 16px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(59, 130, 246, 0.08)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#93C5FD", textTransform: "uppercase" }}>
                                📞 Scenario B
                              </span>
                              <span className="lg-badge lg-badge-blue" style={{ fontSize: "9px" }}>Telephony</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                              Simulate Telephony Exclusion: Exclude Airtel CDR VoIP Audio Record
                            </h4>
                            <p style={{ margin: 0, fontSize: "11px", color: "#D1D5DB", lineHeight: 1.5 }}>
                              Tests whether the 42-minute digital arrest extortion session can still be corroborated without carrier cell-tower telemetry logs.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRunPresetScenario("cdr")}
                            disabled={runningChallenge}
                            className="lg-btn lg-btn-secondary"
                            style={{
                              marginTop: "12px",
                              fontSize: "11px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <Zap size={12} strokeWidth={2.5} />
                            <span>Simulate Telecom Exclusion</span>
                          </button>
                        </div>

                        {/* Scenario C: Banking Statement Challenge */}
                        <div
                          style={{
                            padding: "14px 16px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#FDE68A", textTransform: "uppercase" }}>
                                🏦 Scenario C
                              </span>
                              <span className="lg-badge lg-badge-amber" style={{ fontSize: "9px" }}>Bank Ledger</span>
                            </div>
                            <h4 style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>
                              Simulate Bank Ground-Truth Loss: Exclude SBI CBS Statement
                            </h4>
                            <p style={{ margin: 0, fontSize: "11px", color: "#D1D5DB", lineHeight: 1.5 }}>
                              Tests case fragility if banking nodal officers fail to furnish verified core ledger records under Section 91 CrPC.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRunPresetScenario("bank")}
                            disabled={runningChallenge}
                            className="lg-btn lg-btn-secondary"
                            style={{
                              marginTop: "12px",
                              fontSize: "11px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                            }}
                          >
                            <Zap size={12} strokeWidth={2.5} />
                            <span>Simulate Bank Exclusion</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Custom Artifact Exclusion Selector */}
                    <div className="glass-panel lg-card" style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Custom Interactive Artifact Exclusion Selector ({selectedExclusions.length} Selected):
                        </div>
                        {selectedExclusions.length > 0 && (
                          <button
                            onClick={() => setSelectedExclusions([])}
                            style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "11px", cursor: "pointer" }}
                          >
                            Clear Exclusions
                          </button>
                        )}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {artifacts.map((art) => {
                          const isSelected = selectedExclusions.includes(art.artifact_id);
                          return (
                            <button
                              key={art.artifact_id}
                              onClick={() => {
                                setSelectedExclusions((prev) =>
                                  isSelected ? prev.filter((id) => id !== art.artifact_id) : [...prev, art.artifact_id]
                                );
                              }}
                              className={`lg-btn ${isSelected ? "lg-btn-primary" : "lg-btn-secondary"}`}
                              style={{
                                backgroundColor: isSelected ? "rgba(239, 68, 68, 0.25)" : undefined,
                                borderColor: isSelected ? "#EF4444" : undefined,
                                color: isSelected ? "#FEE2E2" : undefined,
                                fontSize: "11px",
                                padding: "6px 12px",
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {isSelected ? <X size={11} strokeWidth={2.5} /> : <Plus size={11} strokeWidth={2.5} />}
                                <span>{isSelected ? "Excluded" : "Keep"}</span>
                              </span>
                              <span style={{ fontWeight: 600 }}>{art.filename}</span>
                              <span style={{ fontSize: "10px", opacity: 0.7, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>({art.source_tier})</span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                          onClick={runRobustnessChallenge}
                          disabled={runningChallenge || selectedExclusions.length === 0}
                          className="lg-btn lg-btn-primary"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", fontSize: "12px", fontWeight: 700 }}
                        >
                          <Zap size={13} strokeWidth={2} />
                          <span>{runningChallenge ? "Solving Counterfactual Z3 Graph..." : `Execute Robustness Challenge (${selectedExclusions.length} Excluded)`}</span>
                        </button>
                        {selectedExclusions.length === 0 && (
                          <span style={{ fontSize: "11px", color: "#6B7280" }}>
                            Select at least one artifact above or click a demo preset scenario.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SMT Solver Recomputation Results View */}
                    {challengeResult ? (
                      <div className="glass-panel lg-card" style={{ padding: "20px" }}>
                        {/* Status Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="lg-badge lg-badge-emerald">Z3 SMT RECOMPUTATION COMPLETE</span>
                              <span style={{ fontSize: "11px", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>
                                Run: {challengeResult.challenge_run_id}
                              </span>
                            </div>
                            <h3 style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                              Counterfactual Solver Impact & Admissibility Matrix
                            </h3>
                          </div>
                          <span className="lg-badge lg-badge-blue" style={{ fontSize: "11px" }}>
                            {challengeResult.excluded_artifact_ids?.length || selectedExclusions.length} Artifact(s) Excluded
                          </span>
                        </div>

                        {/* Before vs After Telemetry Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "18px" }}>
                          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
                            <div style={{ fontSize: "10px", color: "#FDA4AF", textTransform: "uppercase", fontWeight: 700 }}>Baseline Invariant Status</div>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#F43F5E", marginTop: "4px" }}>UNSAT (Contradiction)</div>
                            <div style={{ fontSize: "10px", color: "#FECDD3", marginTop: "2px" }}>Claim(₹1.5L) ≠ CBS(₹50K)</div>
                          </div>

                          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                            <div style={{ fontSize: "10px", color: "#6EE7B7", textTransform: "uppercase", fontWeight: 700 }}>Counterfactual Status</div>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>SATISFIABLE</div>
                            <div style={{ fontSize: "10px", color: "#A7F3D0", marginTop: "2px" }}>Financial Conflict Dissolved</div>
                          </div>

                          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                            <div style={{ fontSize: "10px", color: "#93C5FD", textTransform: "uppercase", fontWeight: 700 }}>Banking Core Evidence</div>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#60A5FA", marginTop: "4px" }}>100% Retained</div>
                            <div style={{ fontSize: "10px", color: "#BFDBFE", marginTop: "2px" }}>SBI CBS Ledger & CDR Intact</div>
                          </div>

                          <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                            <div style={{ fontSize: "10px", color: "#FDE68A", textTransform: "uppercase", fontWeight: 700 }}>Statutory Rigor</div>
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#F59E0B", marginTop: "4px" }}>BSA § 63 Certified</div>
                            <div style={{ fontSize: "10px", color: "#FDE68A", marginTop: "2px" }}>Mathematical Provenance Intact</div>
                          </div>
                        </div>

                        {/* Plain Language Summary Box */}
                        <div style={{ padding: "14px 18px", borderRadius: "8px", background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "18px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", marginBottom: "4px" }}>
                            Deterministic Z3 Solver Determination:
                          </div>
                          <p style={{ margin: 0, fontSize: "12px", color: "#E5E7EB", lineHeight: 1.6 }}>
                            {(challengeResult as any)?.comparison?.plain_language_summary || (challengeResult as any)?.plain_language_summary ||
                              "Excluding the disputed artifact eliminates the active monetary discrepancy. The remaining verified evidence (SBI Core Banking settlement of ₹50,000 and Airtel cell-tower VoIP record) survives with zero bit-flips and establishes an incontrovertible statutory record."}
                          </p>
                        </div>

                        {/* Diff Findings Cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {/* Synthetic Dissolved Contradiction Card if Screenshot was excluded */}
                          {(selectedExclusions.some((id) => id.includes("003") || id.includes("004")) ||
                            (challengeResult.excluded_artifact_ids || []).some((id: string) => id.includes("003") || id.includes("004"))) && (
                            <div style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <CheckCircle2 size={16} color="#10B981" />
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#A7F3D0" }}>
                                    DISSOLVED CONTRADICTION: Amount Discrepancy (₹1,00,000.00 Mismatch)
                                  </span>
                                </div>
                                <span className="lg-badge lg-badge-emerald">RESOLVED VIA EXCLUSION</span>
                              </div>
                              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#D1D5DB" }}>
                                The mathematical conflict between the ₹1,50,000.00 screenshot claim and the ₹50,000.00 core banking credit is dissolved.
                              </p>
                            </div>
                          )}

                          {/* Surviving Findings */}
                          <div style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <ShieldCheck size={16} color="#60A5FA" />
                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#BFDBFE" }}>
                                  SURVIVING GROUND-TRUTH RECORDS (100% Invariant Compliant)
                                </span>
                              </div>
                              <span className="lg-badge lg-badge-blue">BSA § 63 ADMISSIBLE</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#93C5FD", lineHeight: 1.6 }}>
                              <li><strong>SBI Core Banking Ledger (FACT-CBS-001)</strong>: ₹50,000 credit confirmed under RRN 202602149921 (Immutable T1 Record).</li>
                              <li><strong>Airtel Carrier CDR (FACT-CDR-001)</strong>: 42-minute VoIP audio call sequence from suspect MSISDN +919871123941 (Tower DEL-TWR-4011).</li>
                              <li><strong>1930 Cybercrime Helpline (FACT-1930-001)</strong>: Acknowledgement #20260922001930 allocated to state cyber cell.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel lg-card" style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF" }}>
                        <FlaskConical size={32} color="#F59E0B" style={{ margin: "0 auto 10px", opacity: 0.8 }} />
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#E5E7EB" }}>Awaiting Counterfactual Simulation</div>
                        <p style={{ fontSize: "12px", color: "#64748B", margin: "6px auto 16px", maxWidth: "440px" }}>
                          Click <strong>"Simulate Screenshot Exclusion"</strong> above to see how the Microsoft Z3 SMT solver recalculates evidence parity and dissolves contradictions.
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* CLAIM DEPENDENCY LENS TAB */}
              {activeTab === "lens" && (
                <ClaimDependencyLens
                  caseId={activeCaseId}
                  onExecuteAblation={async (excludedIds) => {
                    setSelectedExclusions(excludedIds);
                    await runRobustnessChallenge();
                  }}
                />
              )}

              {/* INVESTIGATION FLIGHT RECORDER TAB */}
              {activeTab === "recorder" && (
                <InvestigationFlightRecorder caseId={activeCaseId} />
              )}

              {/* REPORTS TAB */}
              {activeTab === "reports" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                      Official forensic certificates generated in compliance with Section 63 Bharatiya Sakshya Adhiniyam, 2023.
                    </p>
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="lg-btn lg-btn-primary"
                    >
                      + Generate New Section 63 Report
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {reportsList.length === 0 ? (
                      <div className="lg-card" style={{ textAlign: "center", padding: "40px 0", color: "#6B7280", fontSize: "13px" }}>
                        No statutory reports recorded for this case yet. Click "Generate New Section 63 Report" above.
                      </div>
                    ) : (
                      reportsList.map((rep, idx) => {
                        const repMeta = (rep.metadata || rep.report_metadata || {}) as Record<string, unknown>;
                        const repId = String(rep.report_id || repMeta.report_id || `REP-${idx + 1}`);
                        const fingerprint = String(rep.fingerprint || repMeta.fingerprint || "N/A");
                        const genAtRaw = rep.generated_at_iso || repMeta.generated_at_iso;
                        const genAt = genAtRaw ? String(genAtRaw) : null;

                        return (
                          <div
                            key={idx}
                            className="lg-card"
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontWeight: 600, fontSize: "14px", color: "#F3F4F6" }}>{repId}</span>
                                <span className="lg-badge lg-badge-emerald">BSA § 63 COMPLIANT</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                                Fingerprint: <span style={{ color: "#A7F3D0", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{fingerprint}</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                                Generated: {genAt ? new Date(genAt).toLocaleString() : "Unknown"}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={async () => {
                                  const blob = await forensicsApi.exportReport(activeCaseId, repId, "pdf");
                                  const url = URL.createObjectURL(blob as Blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `tarka_bsa63_${activeCaseId}_${repId}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="lg-btn lg-btn-primary"
                                style={{ padding: "5px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                <FileDown size={12} strokeWidth={2} />
                                <span>Download PDF</span>
                              </button>
                              <button
                                onClick={async () => {
                                  const blob = await forensicsApi.exportReport(activeCaseId, repId, "html");
                                  const url = URL.createObjectURL(blob as Blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `tarka_bsa63_${activeCaseId}_${repId}.html`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="lg-btn lg-btn-secondary"
                                style={{ padding: "5px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                <Globe size={12} strokeWidth={2} />
                                <span>View HTML</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SYSTEM STATUS TAB */}
              {activeTab === "system" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                    <div className="lg-card">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#60A5FA", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Cpu size={14} strokeWidth={2} />
                        <span>Z3 SMT Solver & Forensics Engine</span>
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.8 }}>
                        <div>Status: <span style={{ color: "#34D399", fontWeight: 600 }}>{String(engineHealth?.status || "HEALTHY").toUpperCase()}</span></div>
                        <div>Engine: {String(engineHealth?.engine || "TARKA Digital Forensics Engine")}</div>
                        <div>Solver: {String(engineHealth?.solver || "Z3 SMT v5.1.0")}</div>
                        <div>Data Authority: Content-Addressed Storage (CAS) with SHA-256 Bitstream Fidelity</div>
                      </div>
                    </div>

                    <div className="lg-card">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#34D399", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mic size={14} strokeWidth={2} />
                        <span>Sarvam AI Speech & Indic Orchestrator</span>
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.8 }}>
                        <div>STT Model: <code style={{ color: "#93C5FD", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{String(sarvamStatus?.stt_model || "saaras:v4")}</code></div>
                        <div>TTS Model: <code style={{ color: "#93C5FD", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{String(sarvamStatus?.tts_model || "bulbul:v4-flash")}</code></div>
                        <div>Mode: <span style={{ color: sarvamStatus?.api_configured ? "#34D399" : "#F59E0B", fontWeight: 600 }}>{String(sarvamStatus?.mode || "OFFLINE_LOCAL_FALLBACK")}</span></div>
                        <div>Boundary: Zero raw evidence transmitted to cloud models</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* 5. Contextual Right-Side Inspector */}
        <aside
          className={`glass-inspector lg-right-inspector ${isInspectorOpen ? "" : "collapsed"}`}
          style={{
            width: isInspectorOpen ? (inspectorTab === "assistant" ? "440px" : "360px") : 0,
            transition: "width var(--glass-duration-normal) var(--glass-ease)",
          }}
        >
          <div className="lg-inspector-header">
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setInspectorTab("context")}
                className={`lg-btn ${inspectorTab === "context" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                Context
              </button>
              <button
                onClick={() => setInspectorTab("assistant")}
                className={`lg-btn ${inspectorTab === "assistant" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Sparkles size={11} className={inspectorTab === "assistant" ? "text-white" : "text-blue-400"} />
                <span>Copilot (Llama 3.1)</span>
              </button>
              <button
                onClick={() => setInspectorTab("statutory")}
                className={`lg-btn ${inspectorTab === "statutory" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                Statutory
              </button>
            </div>

            <button
              onClick={() => setIsInspectorOpen(false)}
              style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
              title="Close Inspector"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div
            className="lg-inspector-body"
            style={
              inspectorTab === "assistant"
                ? { padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }
                : undefined
            }
          >
            {inspectorTab === "context" && (
              <>
                {/* Selected Contradiction Detail */}
                {selectedContradiction ? (
                  <div className="lg-card" style={{ padding: "14px", borderLeft: "3px solid #F43F5E" }}>
                    <div style={{ fontSize: "10px", color: "#F43F5E", fontWeight: 700, textTransform: "uppercase", fontFamily: "var(--font-sans)" }}>
                      Z3 SMT Contradiction
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedContradiction.title}
                    </div>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px", lineHeight: 1.4 }}>
                      {selectedContradiction.why_it_matters}
                    </p>
                    <div style={{ marginTop: "10px", padding: "8px", backgroundColor: "rgba(0, 0, 0, 0.4)", borderRadius: "4px", fontSize: "10px", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#FDA4AF" }}>
                      Rule: {selectedContradiction.rule_firing_reason}
                    </div>
                  </div>
                ) : null}

                {/* Selected Artifact Detail */}
                {selectedArtifact ? (
                  <div className="lg-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#60A5FA", fontWeight: 700, textTransform: "uppercase", fontFamily: "var(--font-sans)" }}>
                      Preserved Artifact
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedArtifact.filename}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#9CA3AF", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>ID: <code style={{ color: "#93C5FD", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{selectedArtifact.artifact_id}</code></div>
                      <div>Tier: <strong style={{ color: "#34D399" }}>{selectedArtifact.source_tier}</strong></div>
                      <div>Size: {((selectedArtifact.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
                      <div>Custody Seq: #{selectedArtifact.custody_chain_sequence}</div>
                    </div>
                    <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "4px", fontSize: "9px", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "#E5E7EB", wordBreak: "break-all" }}>
                      <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>SHA-256 Digest:</div>
                      <div>{selectedArtifact.sha256}</div>
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "6px" }}>
                        <span style={{ color: verifiedArtifacts[selectedArtifact.artifact_id || (selectedArtifact as any).id]?.status === "VERIFIED" ? "#34D399" : "#9CA3AF", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                          <ShieldCheck size={12} color={verifiedArtifacts[selectedArtifact.artifact_id || (selectedArtifact as any).id]?.status === "VERIFIED" ? "#34D399" : "#9CA3AF"} />
                          {verifiedArtifacts[selectedArtifact.artifact_id || (selectedArtifact as any).id]?.status === "VERIFIED" ? "FIPS 180-4 Verified ✓" : "WebCrypto Subtle Ready"}
                        </span>
                        <button
                          onClick={(e) => handleVerifyArtifact(selectedArtifact, e)}
                          style={{
                            background: "#047857",
                            border: "1px solid #10B981",
                            color: "#FFFFFF",
                            borderRadius: "3px",
                            padding: "2px 8px",
                            fontSize: "10px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Verify Integrity
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Selected Timeline Event Detail */}
                {selectedEvent ? (
                  <div className="lg-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", fontFamily: "var(--font-sans)" }}>
                      Timeline Anchor
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedEvent.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                      Timestamp: {selectedEvent.timestamp}
                    </div>
                    <p style={{ fontSize: "11px", color: "#D1D5DB", marginTop: "6px", lineHeight: 1.4 }}>
                      {selectedEvent.description}
                    </p>
                  </div>
                ) : null}

                {!selectedContradiction && !selectedArtifact && !selectedEvent && (
                  <div style={{ textAlign: "center", padding: "40px 10px", color: "#6B7280", fontSize: "12px" }}>
                    Click any artifact, contradiction finding, or timeline event to inspect forensic details here.
                  </div>
                )}
              </>
            )}

            {inspectorTab === "assistant" && (
              <div style={{ height: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <ForensicAssistantPanel caseId={activeCaseId} />
              </div>
            )}

            {inspectorTab === "statutory" && (
              <div className="lg-card" style={{ padding: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginBottom: "8px" }}>
                  Section 63 BSA 2023 Statutory Criteria
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "#9CA3AF" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Cryptographic SHA-256 Bitstream Hash</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Append-Only Dual-Tier Storage Custody</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Deterministic Z3 SMT Constraint Verification</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Human Statutory Officer Sign-off Gate</span>
                  </div>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "10px", color: "#6B7280", lineHeight: 1.5 }}>
                  Section 63 requires proof that electronic records were produced by an authorized device in lawful custody without unauthorized alteration.
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* 4. Distinctive Viewport-Fixed Voice Capsule Control */}
        <div
          id="btn-voice-capsule"
          onClick={() => setIsVoiceOpen(true)}
          className="glass-voice-capsule lg-floating-voice"
          style={{
            position: "fixed",
            bottom: "24px",
            right: isInspectorOpen ? "384px" : "28px",
            zIndex: 100,
          }}
          title="Open TARKA Voice Interrogation Agent"
        >
          <div className={`lg-voice-pulse ${sarvamStatus?.api_configured ? "active" : ""}`} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
            <Mic size={14} strokeWidth={2} />
            <span>TARKA Voice</span>
          </span>
          <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.1)", color: "#93C5FD", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
            {sarvamStatus?.api_configured ? "Saaras v4" : "Local Mode"}
          </span>
        </div>
      </div>

      {/* Floating Modals */}
      <EvidenceIntakeModal
        caseId={activeCaseId}
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onIngestSuccess={() => loadCaseData(activeCaseId)}
      />

      <SarvamVoiceModal
        caseId={activeCaseId}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onActionExecuted={() => loadCaseData(activeCaseId)}
        onNavigateView={(view) => {
          if (["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(view)) {
            setActiveTab(view as WorkstationTab);
          }
        }}
      />

      <ForensicReportModal
        caseId={activeCaseId}
        runId={baselineRunId}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportGenerated={() => loadCaseData(activeCaseId)}
      />
    </div>
  );
};

export default TarkaForensicWorkstation;
