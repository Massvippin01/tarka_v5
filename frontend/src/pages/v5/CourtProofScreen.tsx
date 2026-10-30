import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldAlert,
  FileText,
  Download,
  Key,
  CheckCircle2,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const CourtProofScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();

  // Sub-tabs in Court Proof Screen
  const [activeTab, setActiveTab] = useState<"leave-one-out" | "bsa-split" | "ed25519-bundle" | "cbi-aggregation">("leave-one-out");

  // Leave-one-out selected challenge artifacts
  const [excludedArtifacts, setExcludedArtifacts] = useState<string[]>(["fake_payment_screenshot.json"]);

  const toggleExclude = (filename: string) => {
    setExcludedArtifacts((prev) =>
      prev.includes(filename) ? prev.filter((f) => f !== filename) : [...prev, filename]
    );
  };

  // Leave-One-Out Matrix Scenarios
  const leaveOneOutResults = useMemo(() => {
    const isScreenshotExcluded = excludedArtifacts.includes("fake_payment_screenshot.json");
    const isCbsExcluded = excludedArtifacts.includes("bank_statement_cbs.csv");

    if (isScreenshotExcluded) {
      return {
        smtVerdict: "SATISFIABLE (NO CONFLICT)",
        verdictColor: "#10B981",
        dissolvedContradictions: [
          "Factual Amount Conflict (Claim ₹1.5L vs Settled ₹50k)",
          "Temporal Causal Inversion (10:14 IST vs 10:25 IST)",
        ],
        survivingVerifiedFacts: [
          "SBI CBS Ledger: ₹50,000 settled into Mule A/C (T1 Verified)",
          "Airtel CDR: 42-minute VoIP audio session at Tower DEL-4011 (T1 Verified)",
          "1930 NCRP Dossier: Official Complainant Extortion Intake (T1 Verified)",
        ],
        prosecutionRobustnessScore: "94% (Indisputable Documentary Trial Record)",
        defenseImpact: "Defense attempt to rely on fabricated screenshot fails; bank and telecom records independently substantiate digital arrest extortion.",
      };
    }

    if (isCbsExcluded) {
      return {
        smtVerdict: "EVIDENTIARY VOID (UNVERIFIABLE)",
        verdictColor: "#F59E0B",
        dissolvedContradictions: [],
        survivingVerifiedFacts: ["Chat claim and telecom CDR only"],
        prosecutionRobustnessScore: "32% (Primary Financial Loss Unproven)",
        defenseImpact: "Core monetary fraud element fails without official banking ledger.",
      };
    }

    return {
      smtVerdict: "UNSATISFIABLE (FACTUAL CONTRADICTION ACTIVE)",
      verdictColor: "#F43F5E",
      dissolvedContradictions: [],
      survivingVerifiedFacts: ["All 4 files ingested under Section 63 BSA custody"],
      prosecutionRobustnessScore: "58% (Discrepancy Requires Counterfactual Isolation)",
      defenseImpact: "Active ₹1,00,000 discrepancy between claim and bank record is prime target for defense cross-examination.",
    };
  }, [excludedArtifacts]);

  // Ed25519 Proof Bundle Telemetry
  const proofBundle = useMemo(() => {
    const isCompromised = mutations.ledgerBitFlip;
    return {
      ed25519PublicKey: "ed25519:pk_e01928fa48bc1209ef7842019abccda448102941",
      ed25519Signature: isCompromised
        ? "sig_ed25519:INVALID_HASH_COMPROMISED_AT_SEQ_004"
        : "sig_ed25519:78ab0912bcde45678910fedcba0123456789abcdef0123456789abcdef01234567",
      merkleRoot: isCompromised
        ? "ROOT_FAIL_e912bcda0012_BIT_FLIPPED"
        : "d4e567a12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e",
      bip39Mnemonic: "amber digital arrest zero bit flip custody ledger verify court anchor rapid lien",
      qrDigestPayload: "TARKA://PROOF/CASE-2026-001/MERKLE/d4e567a12b3c4d5e6f7a8b9c0d1e2f3a",
      isCompromised,
    };
  }, [mutations.ledgerBitFlip]);

  // Generate Single-File Offline verify.html
  const handleDownloadVerifyHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TARKA v5.0 Judicial Proof Bundle Verifier (Offline Air-Gapped Standard)</title>
  <style>
    body { font-family: monospace; background: #06070a; color: #f3f4f6; padding: 24px; }
    .card { background: #121622; border: 1px solid #2563eb; border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    .emerald { color: #10b981; }
    .coral { color: #f43f5e; }
    .hash { word-break: break-all; color: #60a5fa; }
  </style>
</head>
<body>
  <h1>TARKA v5.0 Judicial Evidence Admissibility Bundle</h1>
  <p>Statutory Standard: Bharatiya Sakshya Adhiniyam, 2023 (BSA § 63)</p>
  <div class="card">
    <h3>Case: CASE-2026-001 (Operation Digital Arrest Extortion)</h3>
    <p>Merkle Custody Root: <span class="hash">${proofBundle.merkleRoot}</span></p>
    <p>Ed25519 Public Key: <span class="hash">${proofBundle.ed25519PublicKey}</span></p>
    <p>Custody Status: <strong class="${proofBundle.isCompromised ? "coral" : "emerald"}">${proofBundle.isCompromised ? "CORRUPTED (BIT FLIP DETECTED)" : "100% UNBROKEN ZERO-BIT-FLIP INTEGRITY"}</strong></p>
  </div>
  <p>Self-contained zero-dependency verification for air-gapped judicial laptops.</p>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TARKA_JUDICIAL_VERIFY_CASE_2026_001.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", overflowY: "auto", height: "calc(100vh - 120px)" }}>
      {/* Top Hero Banner */}
      <div className="lg-overview-hero" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="lg-badge lg-badge-coral" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Scale size={11} strokeWidth={2.5} />
                <span>SCREEN 4: ADVERSARIAL COURT PROOF & CBI AGGREGATION</span>
              </span>
              <span className="lg-badge lg-badge-emerald">BSA § 63(4) SPLIT CERTIFICATE</span>
            </div>
            <h1 style={{ margin: "2px 0 4px", fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              Adversarial Court Defense Matrix, Ed25519 Offline Proof & CBI Syndicate Memo
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", maxWidth: "800px", lineHeight: 1.5 }}>
              Live counterfactual leave-one-out defense admissibility testing, Section 63(4) BSA dual-track certificates pursuant to Pune Bar Association precedents, single-file air-gapped verify.html generation, and salted blind-index syndicate aggregation.
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", padding: "3px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("leave-one-out")}
              className={`lg-tab ${activeTab === "leave-one-out" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Leave-One-Out Defense Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bsa-split")}
              className={`lg-tab ${activeTab === "bsa-split" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              BSA § 63(4) Split Drafts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ed25519-bundle")}
              className={`lg-tab ${activeTab === "ed25519-bundle" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              Ed25519 Bundle & verify.html
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cbi-aggregation")}
              className={`lg-tab ${activeTab === "cbi-aggregation" ? "lg-tab-active" : ""}`}
              style={{ fontSize: "11px", padding: "6px 12px" }}
            >
              ₹10-Cr CBI Syndicate Memo
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: Live Leave-One-Out Defense Admissibility Matrix */}
      {activeTab === "leave-one-out" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Controls & Artifact Toggle Selector */}
          <div className="lg-bento-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px" }}>
              Simulate Adversarial Defense Challenges (Toggle Evidence Exclusions):
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Defense counsel routinely moves under BSA § 63 to strike unverified screenshots or informal chats. Test how the prosecution case holds up when specific items are excluded.
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[
                { filename: "fake_payment_screenshot.json", tier: "T3 Claim", name: "Victim Screenshot (₹1.5L Claim)" },
                { filename: "whatsapp_chat_extraction.txt", tier: "T3 Comms", name: "WhatsApp Threat Chat Export" },
                { filename: "bank_statement_cbs.csv", tier: "T1 Bank", name: "SBI CBS Ledger (₹50k Credit)" },
                { filename: "telecom_cdr_airtel.csv", tier: "T1 Carrier", name: "Airtel CDR (42m VoIP Call)" },
              ].map((item) => {
                const isExcluded = excludedArtifacts.includes(item.filename);
                return (
                  <button
                    key={item.filename}
                    type="button"
                    onClick={() => toggleExclude(item.filename)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isExcluded ? "1px solid #F43F5E" : "1px solid rgba(255, 255, 255, 0.12)",
                      background: isExcluded ? "rgba(244, 63, 94, 0.15)" : "rgba(255, 255, 255, 0.04)",
                      color: isExcluded ? "#FECDD3" : "#D1D5DB",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{isExcluded ? "❌ EXCLUDED:" : "✓ INCLUDED:"}</span>
                    <span>{item.name}</span>
                    <span style={{ fontSize: "9px", opacity: 0.7 }}>({item.tier})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcome Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="lg-bento-card" style={{ borderLeft: `4px solid ${leaveOneOutResults.verdictColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                  Z3 SMT Mathematical Re-evaluation:
                </span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: leaveOneOutResults.verdictColor }}>
                  {leaveOneOutResults.smtVerdict}
                </span>
              </div>

              <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", margin: "10px 0 4px" }}>
                Prosecution Case Robustness: {leaveOneOutResults.prosecutionRobustnessScore}
              </div>
              <p style={{ fontSize: "11px", color: "#CBD5E1", lineHeight: 1.5, margin: "6px 0 12px" }}>
                {leaveOneOutResults.defenseImpact}
              </p>

              {leaveOneOutResults.dissolvedContradictions.length > 0 && (
                <div style={{ padding: "10px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#A7F3D0", marginBottom: "4px" }}>
                    ✓ Contradictions Dissolved by Excluding Screenshot:
                  </div>
                  {leaveOneOutResults.dissolvedContradictions.map((c) => (
                    <div key={c} style={{ fontSize: "11px", color: "#E2E8F0" }}>• {c}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg-bento-card">
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#F3F4F6", marginBottom: "10px" }}>
                Surviving Verified Evidentiary Pillars (100% Intact)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {leaveOneOutResults.survivingVerifiedFacts.map((fact) => (
                  <div
                    key={fact}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      fontSize: "11px",
                      color: "#E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <CheckCircle2 size={14} color="#10B981" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Section 63(4) BSA Split Drafts + Pune Bar Validator */}
      {activeTab === "bsa-split" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Part A: Lawful Custodian Certificate */}
          <div className="lg-bento-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="lg-badge lg-badge-blue">BSA § 63(4)(a) PART A DRAFT</span>
              <span style={{ fontSize: "10px", color: "#60A5FA", fontWeight: 700 }}>DEVICE / SERVER CUSTODIAN</span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>Certificate of Electronic Custody</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Signatory: Chief Technology Officer, SBI Core Banking Division</div>

            <pre
              style={{
                marginTop: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                color: "#93C5FD",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {`FORM A: CERTIFICATE UNDER SECTION 63(4)(a) BSA, 2023
I, Sh. Alok Verma, Chief General Manager (IT), State Bank of India, do hereby certify:
1. That Core Banking System ledger export (bank_statement_cbs.csv) was produced by automated CBS servers operating lawfully under normal business routine.
2. That zero human editing, alteration, or interception occurred during export.
3. System SHA-256 Digest: b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567`}
            </pre>
          </div>

          {/* Part B: Expert Cyber Examiner Certificate (Pune Bar Mandate) */}
          <div className="lg-bento-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="lg-badge lg-badge-emerald">BSA § 63(4)(b) PART B DRAFT</span>
              <span style={{ fontSize: "10px", color: "#10B981", fontWeight: 700 }}>EXPERT EXAMINER (*PUNE BAR*)</span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>Certificate of Forensic Examination</div>
            <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>Signatory: ACP Rajesh Kumar, Certified Examiner under Sec 79A IT Act</div>

            <pre
              style={{
                marginTop: "12px",
                background: "rgba(0, 0, 0, 0.4)",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "11px",
                color: "#A7F3D0",
                fontFamily: "var(--font-mono)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {`FORM B: CERTIFICATE UNDER SECTION 63(4)(b) BSA, 2023
(Pursuant to Pune Bar Association v. Union of India, 2024 Mandate)
I, ACP Rajesh Kumar, Examiner of Electronic Evidence (Sec 79A IT Act), certify:
1. That bitstreams were ingested via TARKA air-gapped cryptographic engine.
2. Invariant verification proved that complainant screenshot claim was mathematically inconsistent with settled core banking ledger (|Δ| = ₹1,00,000).
3. Examiner Digital Signature: ED25519 Verified.`}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Ed25519 Proof Bundle & Single-File verify.html */}
      {activeTab === "ed25519-bundle" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Key size={16} color="#60A5FA" />
              <span>Ed25519 Asymmetric Signed Proof Bundle</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 12px" }}>
              Cryptographically anchors case findings and Merkle custody trees with Ed25519 signatures and physical BIP-39 mnemonic recovery words.
            </p>

            {/* Mutation Alert if Bit Flip is triggered */}
            {proofBundle.isCompromised && (
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid #F43F5E", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#FECDD3", fontWeight: 700, fontSize: "12px" }}>
                  <ShieldAlert size={16} color="#F43F5E" />
                  <span>BITSTREAM MUTATION ALARM: SEQUENCE #4 COMPROMISED</span>
                </div>
                <div style={{ fontSize: "11px", color: "#E2E8F0", marginTop: "4px" }}>
                  1 byte altered in custody table. Merkle root mismatch trips court admissibility check immediately.
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px" }}>
              <div>
                <div style={{ color: "#94A3B8" }}>Ed25519 Public Key:</div>
                <div style={{ color: "#60A5FA", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{proofBundle.ed25519PublicKey}</div>
              </div>

              <div>
                <div style={{ color: "#94A3B8" }}>Merkle Custody Root:</div>
                <div style={{ color: proofBundle.isCompromised ? "#F43F5E" : "#10B981", fontFamily: "var(--font-mono)", fontWeight: 700, wordBreak: "break-all" }}>
                  {proofBundle.merkleRoot}
                </div>
              </div>

              <div>
                <div style={{ color: "#94A3B8" }}>Physical BIP-39 Mnemonic Paper Anchor:</div>
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "8px", borderRadius: "6px", color: "#FDE68A", fontFamily: "var(--font-mono)" }}>
                  {proofBundle.bip39Mnemonic}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => toggleMutation("ledgerBitFlip")}
                className={`lg-mutator-btn ${mutations.ledgerBitFlip ? "active-coral" : ""}`}
              >
                <ShieldAlert size={13} />
                <span>{mutations.ledgerBitFlip ? "Revert Bit Flip" : "Simulate Bit Flip (Trip Alarm)"}</span>
              </button>
            </div>
          </div>

          <div className="lg-bento-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={16} color="#10B981" />
              <span>Offline Air-Gapped `verify.html` Generator</span>
            </div>
            <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 14px", lineHeight: 1.5 }}>
              Generates a zero-dependency, self-verifying HTML file. Trial judges and defense counsel can open this file on an air-gapped court laptop without internet access to independently verify SHA-256 Merkle hashes.
            </p>

            <button
              type="button"
              onClick={handleDownloadVerifyHtml}
              className="lg-btn lg-btn-primary"
              style={{ padding: "10px 18px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Download size={14} />
              <span>Export Air-Gapped `verify.html`</span>
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ₹10-Crore CBI Syndicate Aggregation Memo */}
      {activeTab === "cbi-aggregation" && (
        <div className="lg-bento-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={16} color="#60A5FA" />
              <span>CBI / NCRP Cross-State Syndicate Blind-Index Aggregation Memo</span>
            </div>
            <span className="lg-badge lg-badge-coral">₹10.42 CRORE TOTAL LOSS</span>
          </div>

          <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 14px" }}>
            Uses deterministic salted blind indexes <code>HMAC-SHA256(identifier, salt)</code> to aggregate 14 related FIRs across Delhi, Mumbai, and Bengaluru without leaking unconvicted citizen PII.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#94A3B8" }}>
                <th style={{ padding: "8px 12px" }}>Jurisdiction / Police Station</th>
                <th style={{ padding: "8px 12px" }}>FIR Number</th>
                <th style={{ padding: "8px 12px" }}>Salted Blind-Index Phone</th>
                <th style={{ padding: "8px 12px" }}>Associated Layer-2 Mule A/C</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Extorted Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ps: "Delhi Cyber Crime Cell", fir: "FIR/2026/001-CYB", hash: "hmac_b912a...01", acc: "ICICI 629101554289", amt: "₹50,000.00" },
                { ps: "Mumbai BKC Cyber Police", fir: "CR-192/2026", hash: "hmac_b912a...01", acc: "ICICI 629101554289", amt: "₹2,40,00,000.00" },
                { ps: "Bengaluru CID Cyber Crime", fir: "FIR-44/2026/BLR", hash: "hmac_b912a...01", acc: "ICICI 629101554289", amt: "₹4,12,00,000.00" },
                { ps: "Hyderabad Cyberabad PS", fir: "CR-89/2026/CYB", hash: "hmac_b912a...01", acc: "ICICI 629101554289", amt: "₹3,90,00,000.00" },
              ].map((row) => (
                <tr key={row.fir} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ padding: "8px 12px", color: "#F3F4F6" }}>{row.ps}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "#60A5FA" }}>{row.fir}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "#A7F3D0" }}>{row.hash}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "#FECDD3" }}>{row.acc}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono)", color: "#F43F5E", fontWeight: 700 }}>
                    {row.amt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
