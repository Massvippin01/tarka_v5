import React, { useState, useMemo } from "react";
import {
  Scale,
  Download,
  RotateCcw,
  Copy,
  Check,
  FileCheck,
  Network,
  Key,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { SaasExecutiveKpiCard } from "../../components/tarka/SaasExecutiveKpiCard";
import {
  evaluateLeaveOneOut,
  generateBsa63SplitSchedules,
  getCanonicalPaperAnchor,
  generateOfflineVerifyHtml,
  getCbiSyndicateMemo,
  type CaseArtifact,
  type AlibiChallenge,
} from "../../utils/courtProofEngine";

export const CourtProofScreen: React.FC = () => {
  const { mutations } = useTarkaGlobal();

  // Initial Case Artifacts
  const initialArtifacts: CaseArtifact[] = [
    {
      id: "art-victim-screenshot",
      name: "#01 Complainant Video Call Screenshot",
      tier: "TIER_2_CORROBORATIVE",
      custodian: "Sunil Kumar (Victim)",
      sha256: "c89148bc92019482019a84719284102948192841029481928410294819284102",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-sbi-cbs",
      name: "#02 SBI CBS Core Banking Ledger",
      tier: "TIER_1_INDEPENDENT",
      custodian: "State Bank of India (Global IT Centre)",
      sha256: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-npci-switch",
      name: "#03 NPCI Central UPI Switch Log",
      tier: "TIER_1_INDEPENDENT",
      custodian: "NPCI Central Gateway Node",
      sha256: "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-airtel-cgnat",
      name: "#04 Airtel CGNAT IPDR Translation",
      tier: "TIER_1_INDEPENDENT",
      custodian: "Bharti Airtel Lawful Intercept",
      sha256: "4d71290481029481029481029481029481029481029481029481029481029481",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-whatsapp",
      name: "#05 WhatsApp Extortion Chat Export",
      tier: "TIER_2_CORROBORATIVE",
      custodian: "Complainant Cellular Handset",
      sha256: "88ab102938475610293847561029384756102938475610293847561029384756",
      isExcluded: false,
      canBeExcluded: true,
    },
  ];

  const [artifacts, setArtifacts] = useState<CaseArtifact[]>(initialArtifacts);

  const toggleArtifact = (id: string) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isExcluded: !a.isExcluded } : a))
    );
  };

  const resetArtifacts = () => {
    setArtifacts(initialArtifacts);
    setAlibis((prev) => prev.map((a) => ({ ...a, isChallenged: false })));
  };

  // Defense Alibi Challenges
  const [alibis, setAlibis] = useState<AlibiChallenge[]>([
    {
      id: "alibi-whatsapp-excluded",
      name: "WhatsApp Chat Excluded under BSA § 63",
      defenseArgument: "Defense argues WhatsApp chats lack certified device hash under Section 63(4).",
      isChallenged: false,
    },
    {
      id: "alibi-clock-drift",
      name: "Bank Finacle Clock Drifted +45s",
      defenseArgument: "Defense claims bank transaction time does not synchronize with telecom switch.",
      isChallenged: false,
    },
    {
      id: "alibi-someone-else",
      name: "Someone Else Held the Phone",
      defenseArgument: "Defense claims physical possession of cellular handset was transferred.",
      isChallenged: false,
    },
  ]);

  const toggleAlibi = (id: string) => {
    setAlibis((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isChallenged: !a.isChallenged } : a))
    );
    // If WhatsApp alibi toggled, also exclude WhatsApp artifact
    if (id === "alibi-whatsapp-excluded") {
      setArtifacts((prev) =>
        prev.map((a) => (a.id === "art-whatsapp" ? { ...a, isExcluded: !a.isExcluded } : a))
      );
    }
  };

  // Evaluate LOO
  const looResult = useMemo(() => {
    return evaluateLeaveOneOut(artifacts, alibis);
  }, [artifacts, alibis]);

  // BSA Section 63 Split Schedules
  const bsaSchedules = useMemo(() => {
    return generateBsa63SplitSchedules("CASE-2026-001");
  }, []);

  const [activeBsaTab, setActiveBsaTab] = useState<"partB" | "bank" | "isp">("partB");

  const currentScheduleText = useMemo(() => {
    if (activeBsaTab === "partB") return bsaSchedules.partB_ForensicExpert;
    if (activeBsaTab === "bank") return bsaSchedules.partA_BankNodal;
    return bsaSchedules.partA_IspRouter;
  }, [activeBsaTab, bsaSchedules]);

  const [isScheduleCopied, setIsScheduleCopied] = useState(false);
  const handleCopySchedule = () => {
    navigator.clipboard.writeText(currentScheduleText);
    setIsScheduleCopied(true);
    setTimeout(() => setIsScheduleCopied(false), 2000);
  };

  // 24-Word Paper Anchor Bundle
  const paperAnchor = useMemo(() => {
    const canonical = getCanonicalPaperAnchor("CASE-2026-001");
    if (mutations.flipCustodyByte || mutations.ledgerBitFlip) {
      return {
        ...canonical,
        merkleRootSha256: "CORRUPTED_ROOT_HASH_BIT_FLIPPED_AT_SEQ_004",
        ed25519SignatureHex: "INVALID_ED25519_SIGNATURE_DIGEST_MISMATCH",
      };
    }
    return canonical;
  }, [mutations.flipCustodyByte, mutations.ledgerBitFlip]);

  // Offline verify.html download
  const handleDownloadOfflineVerify = () => {
    const html = generateOfflineVerifyHtml(paperAnchor);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TARKA_PROOF_VERIFY_${paperAnchor.caseId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CBI Syndicate Cluster Memo
  const cbiMemo = useMemo(() => getCbiSyndicateMemo(), []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        padding: "16px 20px",
        gap: "14px",
        boxSizing: "border-box",
        overflowY: "auto",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* 1. TOP 4 EXECUTIVE SAAS KPI METRIC CARDS (MIN-HEIGHT: 108PX) */}
      <div className="saas-kpi-row">
        <SaasExecutiveKpiCard
          label="Evidentiary Robustness"
          metric={`${looResult.confidenceScore}%`}
          metricColor={looResult.proofSurvives ? "#059669" : "#E11D48"}
          subtext={looResult.proofSurvives ? "Survives complete exclusion of secondary chats" : "Fatal defect: Independent institutional records excluded"}
          statusBadge={{
            text: looResult.proofSurvives ? "TIER-1 INDEPENDENT" : "SEVERED",
            variant: looResult.proofSurvives ? "emerald" : "rose",
          }}
          icon={Scale}
          iconColor={looResult.proofSurvives ? "#059669" : "#E11D48"}
          iconBg={looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2"}
        />

        <SaasExecutiveKpiCard
          label="BSA § 63(4) Split Schedules"
          metric="Parts A & B"
          metricColor="#4F46E5"
          subtext="Separates bank system logs from forensic expert analysis"
          statusBadge={{
            text: "PUNE BAR COMPLIANT",
            variant: "indigo",
          }}
          icon={FileCheck}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
        />

        <SaasExecutiveKpiCard
          label="Cryptographic Paper Anchor"
          metric="24-Word BIP-39"
          metricColor="#059669"
          subtext="Ed25519 custodial hash seal verifiable without internet"
          statusBadge={{
            text: "OFFLINE VERIFIED",
            variant: "emerald",
          }}
          icon={Key}
          iconColor="#059669"
          iconBg="#ECFDF5"
        />

        <SaasExecutiveKpiCard
          label="CBI Syndicate Match"
          metric={cbiMemo.totalLossCroresStr}
          metricColor="#D97706"
          subtext="14 connected FIRs across 5 states via blind-index hashes"
          statusBadge={{
            text: "CBI TRANSFER READY",
            variant: "amber",
          }}
          icon={Network}
          iconColor="#D97706"
          iconBg="#FFFBEB"
        />
      </div>

      {/* 2. MAIN 12-COLUMN BENTO GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 6 COLUMNS (LOO STRESS-TESTER & 24-WORD BIP-39 PAPER ANCHOR WITH QR SEAL) */}
        <div style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 1: LIVE LEAVE-ONE-OUT (LOO) ADMISSIBILITY STRESS-TESTER */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Scale size={16} color="#4F46E5" />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                    Live Leave-One-Out (LOO) Defense Stress-Tester
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                    ARJUN PANDITRAO BENCH
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  <strong>What this means for IO:</strong> Proves whether prosecution succeeds if defense excludes phone screenshots.
                </div>
              </div>

              <button
                type="button"
                onClick={resetArtifacts}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={12} />
                <span>Reset Matrix</span>
              </button>
            </div>

            {/* 5 Evidence Artifact Checklist Rows with Clean Scroll */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "175px", overflowY: "auto", paddingRight: "4px" }}>
              {artifacts.map((art) => {
                const isTier1 = art.tier === "TIER_1_INDEPENDENT";
                return (
                  <div
                    key={art.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: art.isExcluded ? "#FFF1F2" : "#F8FAFC",
                      border: art.isExcluded ? "1px dashed #FECDD3" : "1px solid #E2E8F0",
                      opacity: art.isExcluded ? 0.6 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        checked={!art.isExcluded}
                        onChange={() => toggleArtifact(art.id)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#4F46E5", margin: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: art.isExcluded ? "#BE123C" : "#0F172A" }}>
                          {art.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                          SHA: {art.sha256.slice(0, 16)}... | Custodian: {art.custodian}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 800,
                        color: isTier1 ? "#047857" : "#475569",
                        background: isTier1 ? "#ECFDF5" : "#F1F5F9",
                        border: isTier1 ? "1px solid #A7F3D0" : "1px solid #E2E8F0",
                        padding: "2px 7px",
                        borderRadius: "5px",
                      }}
                    >
                      {isTier1 ? "TIER-1 INDEPENDENT" : "TIER-2 CORROBORATIVE"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Defense Alibi Quick Challenge Buttons */}
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", marginBottom: "6px" }}>
                Defense Cross-Examination Alibi Challenges:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {alibis.map((alibi) => (
                  <button
                    key={alibi.id}
                    type="button"
                    onClick={() => toggleAlibi(alibi.id)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: alibi.isChallenged ? "1px solid #E11D48" : "1px solid #CBD5E1",
                      background: alibi.isChallenged ? "#FFF1F2" : "#F8FAFC",
                      color: alibi.isChallenged ? "#BE123C" : "#0F172A",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {alibi.name} {alibi.isChallenged ? "🚨" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Prosecutor Cross-Examination Rebuttal Callout */}
            <div
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
                padding: "10px 14px",
                borderRadius: "10px",
                background: looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2",
                border: looResult.proofSurvives ? "1px solid #A7F3D0" : "1px solid #FECDD3",
                color: looResult.proofSurvives ? "#065F46" : "#9F1239",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: "2px", textTransform: "uppercase", fontSize: "11px" }}>
                Prosecutor Courtroom Rebuttal:
              </div>
              {looResult.prosecutorRebuttal}
            </div>
          </div>

          {/* CARD 2: 24-WORD BIP-39 PAPER ANCHOR WITH EMBEDDED SVG QR SEAL */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Key size={15} color="#059669" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  24-Word BIP-39 Cryptographic Paper Anchor & Offline HTML
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownloadOfflineVerify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#0284C7",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <Download size={13} />
                <span>Export verify.html</span>
              </button>
            </div>

            {/* Split Grid: 4x6 Word Matrix on Left, SVG QR Seal on Right */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "14px", alignItems: "center" }}>
              {/* 4x6 Word Matrix */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "5px",
                  padding: "8px",
                  background: "#F8FAFC",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                }}
              >
                {paperAnchor.bip39Mnemonic.map((word, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      padding: "4px 6px",
                      borderRadius: "5px",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      color: "#0F172A",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: "#94A3B8", marginRight: "3px" }}>{String(idx + 1).padStart(2, "0")}.</span>
                    {word}
                  </div>
                ))}
              </div>

              {/* Embedded Cryptographic QRCodeSVG Merkle Seal */}
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "5px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  flexShrink: 0,
                }}
                title={`SHA-256 Merkle Root: ${paperAnchor.merkleRootSha256}`}
              >
                <QRCodeSVG
                  value={`tarka://merkle/${paperAnchor.merkleRootSha256}?sig=${paperAnchor.ed25519SignatureHex.slice(0, 32)}`}
                  size={58}
                  level="M"
                />
                <span style={{ fontSize: "7.5px", fontWeight: 800, color: "#059669", marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.2px" }}>
                  ED25519 SEAL
                </span>
              </div>
            </div>

            {/* Hashes Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#64748B" }}>
              <span>Merkle Root: <strong className="font-mono-tabular" style={{ color: "#059669" }}>{paperAnchor.merkleRootSha256.slice(0, 24)}...</strong></span>
              <span>Ed25519 Sig: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{paperAnchor.ed25519SignatureHex.slice(0, 16)}...</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6 COLUMNS (BSA SECTION 63(4) COURT CERTIFICATE PREVIEW & CBI SYNDICATE MEMO) */}
        <div style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          {/* CARD 3: BSA SECTION 63(4) SPLIT SCHEDULES ON CRISP WHITE COURT LETTERHEAD */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={16} color="#4F46E5" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  BSA Section 63(4) Split Schedules
                </span>
                <span style={{ fontSize: "9.5px", fontWeight: 800, color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 6px", borderRadius: "4px" }}>
                  PUNE BAR COMPLIANT
                </span>
              </div>

              {/* Schedule Tab Switcher */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("partB")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: activeBsaTab === "partB" ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                    background: activeBsaTab === "partB" ? "#EEF2FF" : "#F8FAFC",
                    color: activeBsaTab === "partB" ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  Schedule B (Expert)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("bank")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: activeBsaTab === "bank" ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                    background: activeBsaTab === "bank" ? "#EEF2FF" : "#F8FAFC",
                    color: activeBsaTab === "bank" ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  Schedule A (Bank)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("isp")}
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: activeBsaTab === "isp" ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                    background: activeBsaTab === "isp" ? "#EEF2FF" : "#F8FAFC",
                    color: activeBsaTab === "isp" ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  Schedule A (ISP)
                </button>
              </div>
            </div>

            {/* Authentic White Court Certificate Preview */}
            <div
              style={{
                background: "#FCFDFE",
                border: "1px solid #CBD5E1",
                borderRadius: "10px",
                padding: "14px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                lineHeight: 1.5,
                color: "#0F172A",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                maxHeight: "165px",
              }}
            >
              {currentScheduleText}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Accreditation: <strong>MeitY Empanelled / ISO 17025</strong> · Tableau T8u Bridge TAB-88219-04
              </span>

              <button
                type="button"
                onClick={handleCopySchedule}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isScheduleCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {isScheduleCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{isScheduleCopied ? "Copied" : "Copy Court Certificate"}</span>
              </button>
            </div>
          </div>

          {/* CARD 4: SALTED BLIND-INDEX CBI MULTI-STATE SYNDICATE AGGREGATION MEMO */}
          <div
            className="bento-card"
            style={{
              padding: "16px 20px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "16px",
              boxShadow: "0 4px 20px -4px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Network size={15} color="#D97706" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Salted Blind-Index (HMAC-SHA256) CBI Syndicate Memo
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "2px 6px", borderRadius: "4px" }}>
                PII-PRESERVING
              </span>
            </div>

            {/* Bold Summary Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400E" }}>
                {cbiMemo.syndicateName}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)" }}>
                {cbiMemo.totalLossCroresStr} · 14 Connected FIRs
              </span>
            </div>

            {/* 2x2 White Sub-Card Grid for Cross-State Match Clusters */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {cbiMemo.blindIndexedEntities.map((ent, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B" }}>
                      {ent.entityType} MATCH
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#059669" }}>
                      {ent.matchesCount} FIRs
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#0F172A", fontFamily: "var(--font-mono)", fontWeight: 700, margin: "2px 0" }}>
                    {ent.blindIndexHash}
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                    {ent.locations[0]}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "11px", color: "#475569", background: "#F1F5F9", padding: "6px 10px", borderRadius: "6px" }}>
              <strong>Mandatory CBI Transfer Triggered:</strong> Syndicate loss crosses ₹10 Crore threshold across Delhi, Maharashtra, Karnataka, and UP under Delhi Special Police Establishment Act § 6.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
