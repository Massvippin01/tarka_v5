/**
 * TARKA Autonomous Demo Director - Authoritative Versioned Scenes
 * 
 * Each scene implements the strict 5-part layman explanation structure:
 * 1. What the viewer is seeing
 * 2. Plain-language everyday meaning
 * 3. Why it matters to an investigation
 * 4. What TARKA actually did
 * 5. What the result proves and does not prove
 */

import type { DemoScene } from "./demoTypes";

export const DEMO_SCENES: DemoScene[] = [
  {
    id: "SCENE_01_FIRST_PRINCIPLES",
    act: 1,
    title: "Platform Intake & First Principles",
    subtitle: "Mathematical Digital Forensics vs Generative Hallucination",
    targetTab: "landing",
    targetSelector: "#btn-open-workstation",
    fallbackSelectors: [".tarka-minimal-landing", "header"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "The minimal entry landing of TARKA, showing active case upi_payment_discrepancy and core system telemetry.",
      plainMeaning:
        "Think of this as the secure evidence intake desk at a cyber forensics lab. Cases enter here before any examination starts.",
      investigativeSignificance:
        "Financial investigations fail when software makes probabilistic guesses. TARKA enforces that software only proposes mathematical facts, while humans retain authority.",
      tarkaAction:
        "Initialized a secure, offline investigation session bound to case upi_payment_discrepancy with zero external cloud dependencies.",
      statutoryLimits:
        "Starting a case workspace creates an auditable container; it does not assume or imply any wrongdoing by any party.",
    },
    spokenScript:
      "Welcome to TARKA, an indigenous digital forensics intelligence platform. In modern cyber fraud investigations, officers encounter contradictory claims across bank statements, messaging chats, and digital screenshots. Traditional AI models guess; TARKA uses deterministic mathematics. Our guiding constitutional rule is simple: AI proposes, evidence verifies, human decides. Let us enter the forensic workstation.",
    autoAction: "SWITCH_TAB",
    minDurationMs: 6500,
    maxWaitDurationMs: 12000,
  },
  {
    id: "SCENE_02_EVIDENCE_REGISTER",
    act: 2,
    title: "Evidence Register & SHA-256 Bitstream Integrity",
    subtitle: "Immutable Custody and Data-Preservation Hashing",
    targetTab: "evidence",
    targetSelector: '[data-testid="artifact-row-ART-001-DB791B3C"]',
    fallbackSelectors: ['button[id*="btn-verify"]', ".lg-table-wrapper table tbody tr", "#nav-item-evidence"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "The Evidence Register listing 6 digital artifacts with source trust tiers (T1 Core Bank Statement, T1 CDR, T3 Screenshot).",
      plainMeaning:
        "A cryptographic fingerprint is like a digital wax seal. If a single character or byte changes in the file, the hash changes completely.",
      investigativeSignificance:
        "Under Section 63 of the Bharatiya Sakshya Adhiniyam, digital evidence is only admissible if prosecutors prove the data was preserved identically from seizure.",
      tarkaAction:
        "Computed the real-time SHA-256 bitstream checksum of bank_statement.csv directly against the on-disk storage bytes and validated it against the custody ledger.",
      statutoryLimits:
        "A matching SHA-256 hash confirms the bitstream was preserved without tampering in storage. It does not prove the bank statement author was truthful.",
    },
    spokenScript:
      "We are now in the Evidence Register. Here, each seized digital file is cataloged with its source trust tier. Notice artifact ART-001, an official core-banking transaction export. TARKA has computed its SHA-256 hash across the raw bitstream. The green badge confirms the file on disk matches its intake custody record to the exact byte. Remember: cryptographic hashing proves data integrity during transit, not the inherent truthfulness of the creator.",
    autoAction: "VERIFY_BITSTREAM",
    minDurationMs: 7500,
    maxWaitDurationMs: 15000,
  },
  {
    id: "SCENE_03_TIMELINE_UNCERTAINTY",
    act: 3,
    title: "Multi-Clock Timeline with Explicit Uncertainty",
    subtitle: "Preserving Clock Skew and Sensor Domain Intervals",
    targetTab: "timeline",
    targetSelector: '[data-testid="timeline-container"]',
    fallbackSelectors: [".lg-table-wrapper", "#nav-item-timeline"],
    placement: "right",
    explanation: {
      whatViewerSees:
        "A chronological sequence of payment requests, banking debits, and telecom calls, each marked with explicit uncertainty bounds (plus/minus delta t).",
      plainMeaning:
        "Different computers have different clocks. Your phone clock, the bank server clock, and a cell tower clock never agree to the exact millisecond.",
      investigativeSignificance:
        "Flattening timestamps into a single speculative timeline causes wrongful convictions by inventing false chronological sequences.",
      tarkaAction:
        "Normalized multi-source timestamps into partial causal orderings with explicit temporal intervals and conflict flags.",
      statutoryLimits:
        "Displays time intervals supported by preserved logs. Does not fabricate a single unverified microsecond timestamp.",
    },
    spokenScript:
      "Investigations span multiple clock domains: telecom cell towers, core banking mainframes, and mobile phone local times. TARKA refuses to flatten these into an artificial single timestamp. Instead, every event retains explicit uncertainty bounds. When two events overlap without causal proof, TARKA flags the interval rather than guessing which clock was right.",
    autoAction: "SWITCH_TAB",
    minDurationMs: 7000,
    maxWaitDurationMs: 14000,
  },
  {
    id: "SCENE_04_CONTRADICTIONS_Z3",
    act: 4,
    title: "Z3 SMT Contradiction Analysis",
    subtitle: "Isolating the ₹25,000 vs ₹15,000 Discrepancy via Minimal Unsatisfiable Subsets",
    targetTab: "contradictions",
    targetSelector: '[data-testid="contradiction-card-CONTRA-AMT"]',
    fallbackSelectors: ['div:has(span:has-text("CONTRA-AMT"))', ".lg-table-wrapper", "#nav-item-contradictions"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "A critical contradiction card isolating the UPI payment amount discrepancy under Reference Number 202602148891.",
      plainMeaning:
        "Two witnesses are giving conflicting testimony that cannot both be true at the same time: one says twenty-five thousand rupees, the other says fifteen thousand.",
      investigativeSignificance:
        "Suspects often fabricate payment receipt screenshots to claim they paid a smaller or larger amount than actually transacted.",
      tarkaAction:
        "Embedded Z3 SMT difference logic checked the assertion: Core Bank Statement ART-001 debited ₹25,000.00, while Receipt Screenshot ART-004 claims ₹15,000.00. The solver proved these constraints are mutually unsatisfiable.",
      statutoryLimits:
        "Proves a mathematical contradiction exists between the supplied records. Does not accuse any person of fraud—the discrepancy could stem from clerical error, ledger delay, or digital manipulation.",
    },
    spokenScript:
      "Here is TARKA's mathematical reasoning engine at work. Under UPI reference number 202602148891, the core banking ledger records an actual debit of twenty-five thousand rupees. However, the suspect's submitted screenshot claims a payment of only fifteen thousand rupees. The embedded Z3 SMT solver proves these two statements are mathematically irreconcilable. The contradiction is surfaced with raw and normalized values for mandatory human review.",
    autoAction: "EXPAND_CONTRADICTION",
    minDurationMs: 8500,
    maxWaitDurationMs: 16000,
  },
  {
    id: "SCENE_05_ROBUSTNESS_LAB",
    act: 5,
    title: "Evidence Robustness Lab (Counterfactual 'What-If')",
    subtitle: "Real Constraint Graph Recomputation Without Modifying Evidence",
    targetTab: "robustness",
    targetSelector: '[data-testid="btn-execute-challenge"]',
    fallbackSelectors: ['button:has-text("Execute Robustness Challenge")', "#nav-item-robustness"],
    placement: "top",
    explanation: {
      whatViewerSees:
        "The Counterfactual Lab where artifact ART-004 (the unverified screenshot) is excluded, and the resulting diff shows removed versus surviving findings.",
      plainMeaning:
        "Imagine removing one suspect document from a folder and checking if the rest of your case still stands firm or falls apart.",
      investigativeSignificance:
        "Before entering court, an investigator must know which conclusions depend solely on weak evidence, and which conclusions are corroborated by rock-solid official records.",
      tarkaAction:
        "Recomputed all Z3 constraints without modifying the immutable case ledger. The ₹15,000 contradiction dissolved completely, while the bank debit and telecom CDR findings survived intact.",
      statutoryLimits:
        "Demonstrates mathematical sensitivity to excluded inputs; does not permanently delete or alter the original evidence archive.",
    },
    spokenScript:
      "What happens if the examiner excludes the disputed screenshot? In the Robustness Lab, TARKA runs a counterfactual recomputation. The engine re-solves all logic constraints. Notice the result: the amount discrepancy finding dissolves and is removed, because it depended entirely on the excluded screenshot. Meanwhile, the bank debit and CDR corroboration survive intact. This is real mathematical sensitivity analysis, not UI filtering.",
    autoAction: "EXCLUDE_AND_RECOMPUTE",
    minDurationMs: 8500,
    maxWaitDurationMs: 18000,
  },
  {
    id: "SCENE_06_PROVENANCE_DAG",
    act: 6,
    title: "Provenance Directed Acyclic Graph (DAG)",
    subtitle: "Complete Lineage from Raw Disk Bytes to Court Finding",
    targetTab: "provenance",
    targetSelector: '[data-testid="provenance-dag-container"]',
    fallbackSelectors: [".provenance-dag-container", "#nav-item-provenance"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "An interactive directed graph tracing lines from raw evidence files, to SHA-256 hashes, to facts, to inference rules, to findings.",
      plainMeaning:
        "A family tree of evidence. Every conclusion in TARKA can show its parents, grandparents, and the exact byte coordinates it came from.",
      investigativeSignificance:
        "In a trial, cross-examination routinely attacks unexplained conclusions. If software cannot show its exact derivation chain, the evidence is discarded.",
      tarkaAction:
        "Rendered the full topological derivation DAG connecting artifact bytes through Evidence DNA to Z3 constraint assertions.",
      statutoryLimits:
        "Visualizes verifiable dependency chains. Does not replace statutory relevance determinations under Section 3 of BSA.",
    },
    spokenScript:
      "Under modern evidentiary statutes, judges reject black-box algorithms. In the Provenance DAG, every single conclusion is explicitly connected to its origin. Clicking any node reveals its byte offset, SHA-256 checksum, and governing forensic rule. An investigator can stand in the witness box and trace any finding down to the raw magnetic or solid-state bits on disk.",
    autoAction: "SWITCH_TAB",
    minDurationMs: 7500,
    maxWaitDurationMs: 14000,
  },
  {
    id: "SCENE_07_STATUTORY_REPORT",
    act: 7,
    title: "Section 63 BSA Statutory Report & Seal",
    subtitle: "Court-Admissible Legal Certificate with Cryptographic Manifest",
    targetTab: "overview",
    targetSelector: "#btn-bsa-report",
    fallbackSelectors: ['[data-testid="btn-bsa-report"]', ".glass-topbar"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "The Section 63 BSA Statutory Report certificate modal, displaying the examiner declaration, complete SHA-256 manifest, and custody seal.",
      plainMeaning:
        "The final legal affidavit submitted to the court, signed with a cryptographic seal that proves nothing was tampered with.",
      investigativeSignificance:
        "Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 mandates that electronic records be accompanied by a certificate describing the device, hashing algorithm, and custody integrity.",
      tarkaAction:
        "Generated an official report with fingerprint 6c176ba4875a8a7d, certifying the 6 evidence artifacts and mathematical contradictions.",
      statutoryLimits:
        "Produces the required statutory certificate; legal admissibility is ultimately determined by the presiding magistrate or judge.",
    },
    spokenScript:
      "The investigation culminates in an admissible legal document. TARKA automatically compiles the Section 63 BSA statutory report. It includes the mandatory examiner acknowledgment, the complete SHA-256 evidence manifest, and a tamper-evident digital custody seal. This report is exportable as JSON or PDF, formatted directly for Indian judicial proceedings.",
    autoAction: "OPEN_REPORT_MODAL",
    minDurationMs: 8000,
    maxWaitDurationMs: 16000,
  },
  {
    id: "SCENE_08_CONCLUSION",
    act: 8,
    title: "Conclusion: Human Decides",
    subtitle: "Objective Analysis Complete • Statutory Requisition Next Step",
    targetTab: "overview",
    targetSelector: ".glass-topbar",
    fallbackSelectors: [".glass-center-canvas", "header"],
    placement: "bottom",
    explanation: {
      whatViewerSees:
        "The completed case workstation with zero unresolved errors, showing verified bitstreams and documented contradictions.",
      plainMeaning:
        "The investigation has finished its automated phase. The software has organized the facts, and now the human officer takes over.",
      investigativeSignificance:
        "TARKA never brands a person guilty or innocent. It isolates mathematical facts so investigating officers and prosecutors can issue Section 94 BNSS requisitions for missing records.",
      tarkaAction:
        "Concluded automated demonstration with full forensic integrity, zero state corruption, and auditable custody ledger intact.",
      statutoryLimits:
        "TARKA provides mathematical analysis; final investigative conclusions, chargesheets, and judicial verdicts remain strictly human responsibilities.",
    },
    spokenScript:
      "This concludes our autonomous demonstration. In under five minutes, TARKA verified bitstream integrity with SHA-256, isolated an exact ten-thousand rupee discrepancy using Z3 SMT logic, proved mathematical dependency through counterfactual exclusion, and generated a Section 63 statutory report. As our constitution demands: AI proposes, evidence verifies, human decides. Thank you.",
    autoAction: "SWITCH_TAB",
    minDurationMs: 7000,
    maxWaitDurationMs: 14000,
  },
];
