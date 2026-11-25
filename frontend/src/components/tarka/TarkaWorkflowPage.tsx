import React, { useState } from "react";
import {
  UploadCloud,
  ShieldCheck,
  Binary,
  Cpu,
  GitBranch,
  AlertTriangle,
  Clock,
  ChevronRight,
  Zap,
  CheckCircle2,
  Terminal,
  Sparkles,
  ExternalLink,
  Play,
  Copy,
  Check,
  FileCode,
} from "lucide-react";
import { sha256HexSync } from "../../utils/sha256";

interface PipelineStage {
  id: string;
  stepNumber: string;
  nameEn: string;
  nameHi: string;
  subtitle: string;
  latencyMs: number;
  statutoryRef: string;
  badgeColor: "blue" | "emerald" | "amber" | "rose" | "purple";
  icon: React.ElementType;
  inputs: { name: string; tier: "T1" | "T2" | "T3"; size: string; description: string }[];
  processBullets: string[];
  epistemicRole: string;
  outputs: { name: string; type: string; desc: string }[];
  codeSnippet: { language: string; title: string; code: string };
  keyInvariant?: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "stage-01",
    stepNumber: "STAGE 01",
    nameEn: "Intake & Cryptographic Sealing",
    nameHi: "अंतर्ग्रहण एवं अभिरक्षा",
    subtitle: "Air-gapped bitstream registration and zero-bit-flip SHA-256 custody ledger generation",
    latencyMs: 14,
    statutoryRef: "Bharatiya Sakshya Adhiniyam, 2023 (BSA § 63)",
    badgeColor: "blue",
    icon: UploadCloud,
    inputs: [
      { name: "whatsapp_chat_extraction.txt", tier: "T3", size: "4.2 KB", description: "Complainant WhatsApp export with threat dialogue" },
      { name: "fake_payment_screenshot.json", tier: "T3", size: "18.4 KB", description: "Victim's submitted mobile payment receipt claim" },
      { name: "bank_statement_cbs.csv", tier: "T1", size: "142.8 KB", description: "Official SBI Core Banking System ledger export" },
      { name: "telecom_cdr_airtel.csv", tier: "T1", size: "9.8 KB", description: "Carrier Airtel CDR record with cell tower telemetry" },
    ],
    processBullets: [
      "Immediate raw bitstream ingestion without in-flight file mutation or cloud transmission.",
      "Deterministic computation of cryptographic SHA-256 hash digests at the microsecond of intake.",
      "Registration into the append-only Merkle-linked Custody Ledger (`custody_head_hash`).",
      "Explicit metadata tagging of acquisition officer, timestamp, and client environment.",
    ],
    epistemicRole: "Custody verification only. Proves bytes have not changed since acquisition; does not establish truth of authorship.",
    outputs: [
      { name: "Artifact Custody Ledger", type: "JSON", desc: "Append-only SHA-256 custody ledger record" },
      { name: "Source Tier Classification", type: "Metadata", desc: "Initial partitioning into T1 (Carrier/Bank) and T3 (User claims)" },
    ],
    codeSnippet: {
      language: "json",
      title: "Custody Head Registration Ledger",
      code: `{\n  "case_id": "CASE-2026-001",\n  "artifact_id": "ART-BANK-003",\n  "filename": "bank_statement_cbs.csv",\n  "source_tier": "T1_AUTHORITATIVE_RECORD",\n  "sha256": "${sha256HexSync("bank_statement_cbs.csv")}",\n  "byte_count": 142800,\n  "acquisition_officer": "ACP Rajesh Kumar",\n  "intake_timestamp": "2026-09-22T09:30:15.120Z",\n  "custody_verification": "VALID_ZERO_BIT_FLIP"\n}`,
    },
  },
  {
    id: "stage-02",
    stepNumber: "STAGE 02",
    nameEn: "Evidence DNA & Epistemic Normalization",
    nameHi: "डीएनए निष्कर्षण एवं स्तरीकरण",
    subtitle: "Multi-modal OCR, timestamp synchronization, and hard epistemic boundary enforcement",
    latencyMs: 38,
    statutoryRef: "SUTRAM 2026 Epistemic Honesty Standard",
    badgeColor: "purple",
    icon: Binary,
    inputs: [
      { name: "Raw Ingested Bitstreams", tier: "T1", size: "4 Files", description: "Registered evidence bitstreams from Stage 01" },
    ],
    processBullets: [
      "Extraction of temporal anchors: ISO-8601 UTC normalization with IST (+05:30) offset validation.",
      "OCR bounding-box text isolation on payment receipts detecting visual overlays and mismatched font baselines.",
      "CSV relational parsing: Extracting UPI Reference Numbers (RRNs), transaction amounts, and balance deltas.",
      "Hard Epistemic Boundary Enforcement: Partitioning [T1 Verified Facts] from [T3 Unverified Claims].",
    ],
    epistemicRole: "Guarantees unverified chat or screenshot claims can never masquerade as verified core banking ledger facts.",
    outputs: [
      { name: "Canonical Fact Stream", type: "CanonicalFact[]", desc: "Structured events with explicit confidence and time provenance" },
      { name: "OCR Bounding Metadata", type: "JSON", desc: "Pixel coordinate boundaries for overlay inspection" },
    ],
    codeSnippet: {
      language: "typescript",
      title: "Epistemic Canonical Fact Extraction",
      code: `// Enforced Epistemic Classification\nconst fact_screenshot: CanonicalFact = {\n  fact_id: "FACT-CLAIM-001",\n  subject: "Victim_Claim",\n  predicate: "REPORTED_PAID_SUM",\n  object_value: "150000.00",\n  identifiers: { rrn: "202602149921", vpa: "sbi.deputy.cbi@okhdfc" },\n  trust_tier: "T3_UNVERIFIED_CLAIM", // Editable visual artifact\n};\n\nconst fact_bank_cbs: CanonicalFact = {\n  fact_id: "FACT-CBS-001",\n  subject: "SBI_Core_Banking_CBS",\n  predicate: "SETTLED_CREDIT_SUM",\n  object_value: "50000.00",\n  identifiers: { rrn: "202602149921" },\n  trust_tier: "T1_VERIFIED_FACT", // Authoritative core ledger\n};`,
    },
  },
  {
    id: "stage-03",
    stepNumber: "STAGE 03",
    nameEn: "Identity Resolution & Provenance DAG",
    nameHi: "पहचान समाधान एवं उद्भव आरेख",
    subtitle: "Deterministic entity graph resolution with hard vetoes and lineage tracking",
    latencyMs: 26,
    statutoryRef: "BSA § 63 Chain of Custody Protocol",
    badgeColor: "blue",
    icon: GitBranch,
    inputs: [
      { name: "CanonicalFact[] Stream", tier: "T1", size: "18 Facts", description: "Extracted facts from multi-modal evidence" },
    ],
    processBullets: [
      "Cross-source correlation across disparate identifiers: Phone numbers, VPAs, RRNs, Account numbers, and IMEIs.",
      "Hard Veto Matching: Rejects false positive entity merges if telecom IMSI or account branch codes conflict.",
      "Directed Acyclic Graph (DAG) construction linking every derived insight directly to its root artifact byte offset.",
      "Full cryptographic lineage: Every claim points to its exact parent SHA-256 bitstream hash.",
    ],
    epistemicRole: "Establishes explainable mathematical provenance from high-level findings down to raw bitstream bytes.",
    outputs: [
      { name: "Entity Resolution Graph", type: "EntityProfile[]", desc: "Unified personas for Complainant, Impersonator, and Mules" },
      { name: "Provenance DAG", type: "DAG Nodes & Edges", desc: "Audit-ready causal graph" },
    ],
    codeSnippet: {
      language: "typescript",
      title: "Provenance DAG Lineage Node",
      code: `{\n  "node_id": "FINDING-CONTRA-001",\n  "node_type": "CONTRADICTION",\n  "label": "Claimed Transfer (₹1.5L) ≠ CBS Credit (₹50K)",\n  "parent_fact_ids": ["FACT-CLAIM-001", "FACT-CBS-001"],\n  "parent_artifact_hashes": [\n    "${sha256HexSync("fake_payment_screenshot.json")}", // fake_payment_screenshot.json\n    "${sha256HexSync("bank_statement_cbs.csv")}"  // bank_statement_cbs.csv\n  ],\n  "mathematical_invariance": "FINANCIAL_LEDGER_PARITY_UNSAT"\n}`,
    },
  },
  {
    id: "stage-04",
    stepNumber: "STAGE 04",
    nameEn: "Z3 SMT Invariant Theorem Prover",
    nameHi: "Z3 गणितीय विरोधाभास शोधक",
    subtitle: "Automated First-Order Logic verification and Minimal Unsatisfiable Subset (MUS) isolation",
    latencyMs: 65,
    statutoryRef: "Deterministic Logic Guarantee (Zero Hallucination)",
    badgeColor: "rose",
    icon: Cpu,
    inputs: [
      { name: "Resolved Entity DAG", tier: "T1", size: "Graph", description: "Unified fact graph from Stage 03" },
    ],
    processBullets: [
      "Translates forensic claims into formal First-Order Logic constraints in the Microsoft Z3 SMT Theorem Prover.",
      "Executes Difference Logic & Linear Arithmetic to test fundamental conservation invariants.",
      "Invariant 1 (Monetary Parity): Claimed_Amount == CBS_Credit -> Evaluates to UNSAT (|Δ| = ₹1,00,000.00).",
      "Invariant 2 (Temporal Causality): Demand_Time < Payment_Time -> Evaluates to UNSAT (10:25:10 IST > 10:14:02 IST).",
      "Minimal Unsatisfiable Subset (MUS) extraction: Pins the exact conflicting pair without LLM speculation.",
    ],
    epistemicRole: "Replaces probabilistic AI guessing with mathematically proven contradiction theorems admissible in court.",
    outputs: [
      { name: "SMT Invariant Report", type: "UNSAT Proof", desc: "Formal proof of contradiction with active delta" },
      { name: "MUS Core Set", type: "ArtifactID[]", desc: "Minimal set of conflicting files" },
    ],
    codeSnippet: {
      language: "python",
      title: "Microsoft Z3 SMT Difference Logic Constraint",
      code: `from z3 import Solver, Real, Bool, And, unsat\n\ns = Solver()\nclaimed_amt = Real('screenshot_amount')\ncbs_credit = Real('cbs_ledger_amount')\n\n# Assert verified core banking credit\ns.add(cbs_credit == 50000.00)\n\n# Assert unverified complainant screenshot claim\ns.add(claimed_amt == 150000.00)\n\n# Invariant: Financial Ledger Parity under RRN 202602149921\ns.add(claimed_amt == cbs_credit)\n\nresult = s.check()  # Returns unsat!\nif result == unsat:\n    # Isolated MUS Contradiction: |Δ| = ₹1,00,000.00\n    contradiction_proof = s.unsat_core()`,
    },
    keyInvariant: "Claim(₹1,50,000) ≠ CBS_Credit(₹50,000) [UNSAT: Δ = ₹1,00,000.00]",
  },
  {
    id: "stage-05",
    stepNumber: "STAGE 05",
    nameEn: "Chronology & Evidence Robustness Lab",
    nameHi: "समयरेखा एवं रोबस्टनेस लैब",
    subtitle: "Bounded time interval sequencing and counterfactual artifact exclusion simulation",
    latencyMs: 42,
    statutoryRef: "BSA § 63 Temporal Admissibility",
    badgeColor: "amber",
    icon: Clock,
    inputs: [
      { name: "Extracted Invariant Proofs", tier: "T1", size: "SMT Results", description: "Contradiction findings from Stage 04" },
    ],
    processBullets: [
      "Strict chronological ordering of all case events with bounded hardware clock uncertainty intervals (±1s to ±15s).",
      "Visual flag highlights directly on the temporal continuum showing the exact instant causality broke.",
      "Evidence Robustness Lab (Counterfactual Engine): Investigator can simulate excluding suspect evidence.",
      "Instant recomputation: Excluding `fake_payment_screenshot.json` dissolves the contradiction; bank & CDR records survive 100%.",
    ],
    epistemicRole: "Allows investigating officers and trial lawyers to test hypothetical defenses and isolate evidence fragility.",
    outputs: [
      { name: "Bounded Chronology", type: "TimelineEvent[]", desc: "Verified chronological sequence of events" },
      { name: "Counterfactual Proof Matrix", type: "DiffComparison", desc: "Active vs Dissolved findings comparison" },
    ],
    codeSnippet: {
      language: "json",
      title: "Counterfactual Exclusion Recomputation",
      code: `{\n  "baseline_run_id": "run_base_CASE-2026-001",\n  "counterfactual_run_id": "run_cf_exclude_screenshot_01",\n  "excluded_artifacts": ["ART-SS-002: fake_payment_screenshot.json"],\n  "recomputed_smt_status": "SATISFIABLE",\n  "dissolved_findings": [\n    "FINDING-CONTRA-001 (Amount Mismatch ₹1,00,000.00)"\n  ],\n  "surviving_verified_findings": [\n    "FACT-CBS-001 (SBI Core Banking ₹50,000 Settlement)",\n    "FACT-CDR-001 (Airtel 42-Minute VoIP Audio Session)",\n    "FACT-1930-001 (1930 Helpline Extortion Intake)"\n  ]\n}`,
    },
  },
  {
    id: "stage-06",
    stepNumber: "STAGE 06",
    nameEn: "Statutory Freezing & BSA Court Certification",
    nameHi: "सांविधिक आदेश एवं न्यायालय प्रमाणन",
    subtitle: "Section 106 BNSS Golden Hour account freeze notices and Section 63 BSA court admissibility certificates",
    latencyMs: 32,
    statutoryRef: "BNSS § 106 & BSA § 63 Statutory Adjudication",
    badgeColor: "emerald",
    icon: ShieldCheck,
    inputs: [
      { name: "Full Provenance & Invariant DAG", tier: "T1", size: "Complete Case", description: "Fully verified case graph" },
    ],
    processBullets: [
      "Automated drafting of Section 106 BNSS rapid debit freeze notices to ICICI Bank Nodal Officer for Layer-2 mule account.",
      "Prevents mule syndicate cash-out at ATMs during the critical Golden Hour window.",
      "Generation of cryptographic Section 63 BSA electronic evidence certificate with unbroken SHA-256 custody tree.",
      "Local SLM Copilot (Llama 3.1 8B): Natural language investigator interrogation with 100% offline air-gapped security.",
    ],
    epistemicRole: "Converts raw mathematical proofs into legally binding, statutory police actions and trial-ready evidence.",
    outputs: [
      { name: "Section 106 BNSS Freezing Order", type: "PDF / Requisition", desc: "Urgent debit freeze requisition for ICICI Layer 2 A/C" },
      { name: "Section 63 BSA Certificate", type: "Court Evidence Dossier", desc: "Signed electronic admissibility certificate" },
      { name: "Local Copilot Grounding", type: "Llama 3.1 8B", desc: "Air-gapped investigator natural-language interface" },
    ],
    codeSnippet: {
      language: "markdown",
      title: "Section 106 BNSS Golden Hour Freeze Requisition",
      code: `**STATUTORY REQUISITION UNDER SECTION 106, BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023**\n\nTo: Nodal Officer, ICICI Bank Ltd., Cyber Fraud Cell\nRe: URGENT GOLDEN HOUR DEBIT FREEZE NOTICE\nFIR No: FIR/2026/001-CYB (Delhi State Cyber Crime Cell / 1930 NCRP Portal)\n\nYou are hereby directed under Section 106 BNSS, 2023, to immediately place an administrative lien and DEBIT FREEZE upon the following downstream mule beneficiary account:\n\n- Beneficiary Bank: ICICI Bank Ltd.\n- Beneficiary Account Number: 629101554289 (Layer 2 Mule Account)\n- Primary Originating RRN: 202602149921\n- Ingested Sum: ₹50,000.00 (from SBI Mule Account XXXX4210)\n- Digital Custody Head Hash: b198302ca876543210fedcba9876543210abcdef\n\nCompliance is mandatory within 60 minutes of electronic receipt.\nAuthority: ACP Rajesh Kumar, Cyber Crime Branch`,
    },
  },
];

export const TarkaWorkflowPage: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState<string>("stage-01");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [simStep, setSimStep] = useState<number>(0);

  const activeStage = PIPELINE_STAGES.find((s) => s.id === activeStageId) || PIPELINE_STAGES[0];

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const simSteps = [
    {
      title: "Step 1: Ingest 4 Raw Files",
      desc: "Complainant WhatsApp Chat, Payment Screenshot, SBI CBS Statement, and Airtel CDR ingested with zero bit-flip SHA-256 seals under BSA § 63.",
      status: "COMPLETED",
      highlight: "4 Bitstream Hashes Locked",
    },
    {
      title: "Step 2: Evidence DNA & Epistemic Partitioning",
      desc: "Parser extracts ₹1,50,000 claim from screenshot [T3 Unverified] and ₹50,000 credit from bank CBS ledger [T1 Verified Fact].",
      status: "COMPLETED",
      highlight: "T1 vs T3 Boundary Enforced",
    },
    {
      title: "Step 3: Microsoft Z3 SMT Theorem Prover",
      desc: "Z3 compiles difference logic invariants under RRN 202602149921: Claimed(150K) == CBS_Credit(50K) -> Evaluates to UNSAT (|Δ| = ₹1,00,000).",
      status: "CONFLICT DETECTED",
      highlight: "UNSAT: Δ = ₹1,00,000.00",
    },
    {
      title: "Step 4: Golden Hour Section 106 BNSS Freezing",
      desc: "Traces rapid downstream hop to Layer-2 mule account (ICICI A/C 629101554289) and drafts Section 106 BNSS debit freeze notice.",
      status: "DISPATCHED",
      highlight: "ICICI Layer 2 A/C Lien Frozen",
    },
    {
      title: "Step 5: Section 63 BSA Court Certificate",
      desc: "Generates signed electronic evidence certificate with Merkle hash tree and Z3 mathematical proof log ready for trial court.",
      status: "READY FOR TRIAL",
      highlight: "Court Certified Admissibility",
    },
  ];

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: "#07090e",
        color: "#e2e8f0",
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px 32px 64px",
        boxSizing: "border-box",
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* 1. TOP STANDALONE HEADER (NO DASHBOARD LINKS) */}
      {/* -------------------------------------------------------------------- */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          backgroundColor: "rgba(13, 17, 26, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          marginBottom: "28px",
          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 14px",
              backgroundColor: "rgba(37, 99, 235, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              borderRadius: "10px",
            }}
          >
            <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "-0.5px", color: "#60a5fa" }}>
              TARKA
            </span>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#93c5fd" }}>तर्क</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                padding: "2px 6px",
                backgroundColor: "rgba(37, 99, 235, 0.3)",
                borderRadius: "4px",
                color: "#bfdbfe",
              }}
            >
              SUTRAM 2026
            </span>
          </div>

          <div style={{ height: "24px", width: "1px", backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#f8fafc", letterSpacing: "-0.2px" }}>
              End-to-End Forensic Architecture & Pipeline Workflow
            </h1>
            <p style={{ fontSize: "12px", margin: "2px 0 0", color: "#94a3b8" }}>
              Mathematical Invariance Verification & Statutory Compliance under BSA § 63 & BNSS § 106
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "#34d399",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            Z3 SMT Invariant Solver Active
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(6, 182, 212, 0.12)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              color: "#22d3ee",
            }}
          >
            <Cpu size={12} />
            Local Llama 3.1 8B (Air-Gapped)
          </div>

          <a
            href="/?case=CASE-2026-001"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#e2e8f0",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>Open Case Workstation</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* 2. EXECUTIVE ARCHITECTURE BANNER */}
      {/* -------------------------------------------------------------------- */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "20px",
          padding: "28px 32px",
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(24px)",
          marginBottom: "28px",
          background:
            "radial-gradient(ellipse at top right, rgba(37, 99, 235, 0.18) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.12) 0%, transparent 50%), rgba(13, 17, 26, 0.8)",
        }}
      >
        <div style={{ maxWidth: "980px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              color: "#60a5fa",
              border: "1px solid rgba(96, 165, 250, 0.3)",
              marginBottom: "14px",
            }}
          >
            <Sparkles size={12} />
            Indigenous Digital Evidence Pipeline Standard
          </div>

          <h2 style={{ fontSize: "26px", fontWeight: 800, margin: "0 0 10px", color: "#f8fafc", letterSpacing: "-0.5px" }}>
            From 4 Messy Intake Files to Invariant Proof & Golden Hour Account Freezing
          </h2>

          <p style={{ fontSize: "14px", lineHeight: "1.65", color: "#cbd5e1", margin: "0 0 20px" }}>
            Every day, India’s <strong>1930 Cybercrime Helpline</strong> and State Cyber Cells receive thousands of UPI extortion,
            "Digital Arrest," and investment fraud complaints. An Investigating Officer (IO) receives <strong>4 messy files</strong>:
            a Victim’s WhatsApp Chat, a Fake Payment Screenshot, a Bank Statement CSV, and a Telecom CDR.
            TARKA replaces 6+ hours of manual Excel correlation with <strong>mathematical Z3 SMT proofs</strong> in under 2 seconds,
            securing the <strong>Golden Hour</strong> under <strong>Section 106 BNSS</strong> and guaranteeing <strong>Section 63 BSA</strong> court admissibility.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                padding: "8px 14px",
                backgroundColor: "rgba(0, 0, 0, 0.35)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <CheckCircle2 size={14} style={{ color: "#34d399" }} />
              <span><strong>Zero Hallucination:</strong> Deterministic SMT Logic instead of probabilistic guessing</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                padding: "8px 14px",
                backgroundColor: "rgba(0, 0, 0, 0.35)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <ShieldCheck size={14} style={{ color: "#60a5fa" }} />
              <span><strong>Epistemic Honesty:</strong> Rigid T1 (Bank/CDR) vs T3 (Screenshots) tier boundary</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                padding: "8px 14px",
                backgroundColor: "rgba(0, 0, 0, 0.35)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Zap size={14} style={{ color: "#fbbf24" }} />
              <span><strong>Golden Hour Action:</strong> Automated Section 106 BNSS Layer 2 freezing notices</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 3. INTERACTIVE VISUAL PIPELINE FLOW STEPPER */}
      {/* -------------------------------------------------------------------- */}
      <section style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", margin: 0 }}>
            Interactive Workflow Architecture (Click Any Stage To Inspect)
          </h3>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Total Pipeline Execution: <strong>~217 ms</strong> (100% Local Acceleration)
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "12px",
          }}
        >
          {PIPELINE_STAGES.map((stg, idx) => {
            const Icon = stg.icon;
            const isSelected = stg.id === activeStageId;
            return (
              <button
                key={stg.id}
                onClick={() => setActiveStageId(stg.id)}
                style={{
                  textAlign: "left",
                  padding: "16px 14px",
                  borderRadius: "14px",
                  backgroundColor: isSelected ? "rgba(37, 99, 235, 0.18)" : "rgba(13, 17, 26, 0.7)",
                  border: isSelected ? "1px solid rgba(96, 165, 250, 0.6)" : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: isSelected ? "0 0 20px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)" : "none",
                  cursor: "pointer",
                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      color: isSelected ? "#93c5fd" : "#64748b",
                    }}
                  >
                    0{idx + 1} // {stg.stepNumber}
                  </span>
                  <div
                    style={{
                      padding: "6px",
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "rgba(37, 99, 235, 0.3)" : "rgba(255, 255, 255, 0.05)",
                      color: isSelected ? "#60a5fa" : "#94a3b8",
                    }}
                  >
                    <Icon size={14} />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: isSelected ? "#ffffff" : "#cbd5e1",
                      marginBottom: "2px",
                      lineHeight: "1.3",
                    }}
                  >
                    {stg.nameEn}
                  </div>
                  <div style={{ fontSize: "11px", color: isSelected ? "#60a5fa" : "#64748b" }}>
                    {stg.nameHi}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "6px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "10px",
                    color: isSelected ? "#93c5fd" : "#64748b",
                  }}
                >
                  <span>{stg.latencyMs} ms</span>
                  <ChevronRight size={12} style={{ opacity: isSelected ? 1 : 0.4 }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 4. ACTIVE STAGE DEEP-DIVE INSPECTOR (SPLIT VIEW) */}
      {/* -------------------------------------------------------------------- */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "24px",
          marginBottom: "28px",
        }}
      >
        {/* Left: Stage Blueprint & Methodology */}
        <div
          style={{
            backgroundColor: "rgba(13, 17, 26, 0.8)",
            borderRadius: "18px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "24px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 36px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(37, 99, 235, 0.25)",
                    color: "#93c5fd",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {activeStage.stepNumber}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                  {activeStage.nameHi}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>•</span>
                <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 600 }}>
                  ⚡ {activeStage.latencyMs} ms latency
                </span>
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px", color: "#f8fafc" }}>
                {activeStage.nameEn}
              </h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: "1.5" }}>
                {activeStage.subtitle}
              </p>
            </div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
              }}
            >
              {activeStage.statutoryRef}
            </div>
          </div>

          {/* Key Invariant Highlight if present */}
          {activeStage.keyInvariant && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertTriangle size={16} style={{ color: "#fb7185", flexShrink: 0 }} />
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#fda4af" }}>
                <strong>Z3 Invariant Violation:</strong> {activeStage.keyInvariant}
              </div>
            </div>
          )}

          {/* Process Walkthrough */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>
              Algorithmic Execution & Forensics Protocol
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeStage.processBullets.map((bullet, bIdx) => (
                <div key={bIdx} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(37, 99, 235, 0.2)",
                      color: "#60a5fa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {bIdx + 1}
                  </div>
                  <span style={{ fontSize: "13px", lineHeight: "1.55", color: "#cbd5e1" }}>
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Input & Output Specifications */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Inputs */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
                Inputs Consumed ({activeStage.inputs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeStage.inputs.map((inp, iIdx) => (
                  <div key={iIdx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <FileCode size={12} style={{ color: "#60a5fa" }} />
                      <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#e2e8f0" }}>{inp.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: inp.tier === "T1" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: inp.tier === "T1" ? "#34d399" : "#fbbf24",
                      }}
                    >
                      {inp.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
                Outputs Generated ({activeStage.outputs.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeStage.outputs.map((out, oIdx) => (
                  <div key={oIdx} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>{out.name}</span>
                      <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>{out.type}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{out.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Epistemic Role Marker */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              fontSize: "12px",
              color: "#93c5fd",
            }}
          >
            <strong>Epistemic Role:</strong> {activeStage.epistemicRole}
          </div>
        </div>

        {/* Right: Technical Code & Theorem Proof Box */}
        <div
          style={{
            backgroundColor: "rgba(10, 14, 22, 0.9)",
            borderRadius: "18px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 12px 36px -10px rgba(0, 0, 0, 0.6)",
          }}
        >
          {/* Code Window Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Terminal size={14} style={{ color: "#60a5fa" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>
                {activeStage.codeSnippet.title}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                }}
              >
                {activeStage.codeSnippet.language}
              </span>
            </div>

            <button
              onClick={() => handleCopyCode(activeStage.id, activeStage.codeSnippet.code)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "none",
                color: copiedCodeId === activeStage.id ? "#34d399" : "#cbd5e1",
                cursor: "pointer",
              }}
            >
              {copiedCodeId === activeStage.id ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedCodeId === activeStage.id ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Code Content */}
          <div
            style={{
              padding: "18px",
              flex: 1,
              overflowY: "auto",
              maxHeight: "440px",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "1.65",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {activeStage.codeSnippet.code}
            </pre>
          </div>

          {/* Code Footer / Grounding Stamp */}
          <div
            style={{
              padding: "10px 18px",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <span>Verified Grounding: Immutable Local Computation</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>Zero Cloud API Leakage</span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 5. INTERACTIVE LIVE SIMULATION: TRACE CASE FIR-2026-001 */}
      {/* -------------------------------------------------------------------- */}
      <section
        style={{
          borderRadius: "18px",
          padding: "24px 28px",
          backgroundColor: "rgba(13, 17, 26, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Play size={14} style={{ color: "#38bdf8" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                Interactive Pipeline Simulation: Operation Digital Arrest Extortion (FIR-2026-001)
              </h3>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              Step through how the 4 intake files traverse each algorithmic stage to trigger Section 106 BNSS account freezing.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setSimStep((prev) => Math.max(0, prev - 1))}
              disabled={simStep === 0}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: simStep === 0 ? "#64748b" : "#e2e8f0",
                fontSize: "12px",
                fontWeight: 600,
                cursor: simStep === 0 ? "not-allowed" : "pointer",
              }}
            >
              Previous Step
            </button>
            <button
              onClick={() => setSimStep((prev) => Math.min(simSteps.length - 1, prev + 1))}
              disabled={simStep === simSteps.length - 1}
              style={{
                padding: "6px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(37, 99, 235, 0.4)",
                border: "1px solid rgba(59, 130, 246, 0.6)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: simStep === simSteps.length - 1 ? "not-allowed" : "pointer",
              }}
            >
              Next Step ({simStep + 1}/{simSteps.length})
            </button>
          </div>
        </div>

        {/* Step Progression Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "18px" }}>
          {simSteps.map((st, sIdx) => {
            const isCurrent = sIdx === simStep;
            const isDone = sIdx < simStep;
            return (
              <div
                key={sIdx}
                onClick={() => setSimStep(sIdx)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  backgroundColor: isCurrent
                    ? "rgba(37, 99, 235, 0.22)"
                    : isDone
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(0, 0, 0, 0.25)",
                  border: isCurrent
                    ? "1px solid rgba(96, 165, 250, 0.6)"
                    : isDone
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: isCurrent ? "#93c5fd" : isDone ? "#34d399" : "#64748b" }}>
                    STAGE 0{sIdx + 1}
                  </span>
                  {isDone ? (
                    <CheckCircle2 size={12} style={{ color: "#34d399" }} />
                  ) : isCurrent ? (
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                  ) : null}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: isCurrent ? "#ffffff" : "#cbd5e1" }}>
                  {st.title.split(":")[1] || st.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Simulation State Box */}
        <div
          style={{
            padding: "18px 22px",
            borderRadius: "12px",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>
              {simSteps[simStep].title}
            </div>
            <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
              {simSteps[simStep].desc}
            </div>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "20px" }}>
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: simStep === 2 ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)",
                color: simStep === 2 ? "#fb7185" : "#34d399",
                border: simStep === 2 ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                marginBottom: "4px",
              }}
            >
              {simSteps[simStep].status}
            </div>
            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#93c5fd" }}>
              {simSteps[simStep].highlight}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 6. STATUTORY & ARCHITECTURAL COMPARISON MATRIX */}
      {/* -------------------------------------------------------------------- */}
      <section
        style={{
          borderRadius: "18px",
          padding: "24px 28px",
          backgroundColor: "rgba(13, 17, 26, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 16px", color: "#f8fafc" }}>
          Platform Architectural Advantages: TARKA SUTRAM vs Traditional Manual / GenAI Approaches
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 700 }}>DIMENSION</th>
                <th style={{ padding: "10px 14px", color: "#f87171", fontWeight: 700 }}>MANUAL EXCEL / GENERIC COPILOTS</th>
                <th style={{ padding: "10px 14px", color: "#34d399", fontWeight: 700 }}>TARKA INDIGENOUS PLATFORM (Z3 + BSA 63)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>Time to Correlate 4 Files</td>
                <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>6+ Hours of manual VLOOKUPs across RRNs</td>
                <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 600 }}>&lt; 2.0 Seconds automated SMT graph reconciliation</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>Golden Hour Freezing Window</td>
                <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>Missed. Money laundered via Layer 2/3 mules & ATMs</td>
                <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 600 }}>Secured. Instant Section 106 BNSS notice generation</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>AI Hallucination Risk</td>
                <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>High. LLMs fabricate RRNs or confuse amounts</td>
                <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 600 }}>Zero. Mathematical Z3 SMT prover guarantees correctness</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>Epistemic Distinction</td>
                <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>Blurs screenshots with bank ledgers equally</td>
                <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 600 }}>Strict boundary: T1 Bank/CDR vs T3 Screenshot claims</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#f8fafc" }}>Court Evidence Admissibility</td>
                <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>Vulnerable to Section 63 BSA certificate hash challenges</td>
                <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 600 }}>100% Admissible with SHA-256 custody tree & Merkle head</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 7. FOOTER & ACCESS URL NOTICE */}
      {/* -------------------------------------------------------------------- */}
      <footer
        style={{
          marginTop: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          fontSize: "11px",
          color: "#64748b",
        }}
      >
        <div>
          <span>URL Scope: Dedicated Standalone Architecture Route </span>
          <code
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "#93c5fd",
              fontFamily: "monospace",
            }}
          >
            /workflow
          </code>
          <span> or </span>
          <code
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              color: "#93c5fd",
              fontFamily: "monospace",
            }}
          >
            /?view=workflow
          </code>
          <span> (Unlinked from dashboard)</span>
        </div>

        <div>
          <span>TARKA तर्क Platform Architecture • SentinelX Wave 6 Engineering Constitution</span>
        </div>
      </footer>
    </div>
  );
};

export default TarkaWorkflowPage;
