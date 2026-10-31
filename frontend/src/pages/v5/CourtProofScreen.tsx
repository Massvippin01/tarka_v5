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
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
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
        padding: "10px 14px",
        gap: "10px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 1. SINGLE-LINE 4-PILL TELEMETRY STRIP (HEIGHT: 38PX, NO VERTICAL SCROLL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          height: "38px",
          flexShrink: 0,
        }}
      >
        {/* Pill 1: Admissibility Robustness */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: looResult.proofSurvives ? "1px solid rgba(5,150,105,0.3)" : "1px solid rgba(225,29,72,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Scale size={14} color={looResult.proofSurvives ? "#059669" : "#E11D48"} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              ADMISSIBILITY SCORE
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: looResult.proofSurvives ? "#059669" : "#E11D48",
              background: looResult.proofSurvives ? "rgba(5,150,105,0.1)" : "rgba(225,29,72,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {looResult.confidenceScore}% ({looResult.proofSurvives ? "PROOF SURVIVES" : "SEVERED"})
          </span>
        </div>

        {/* Pill 2: BSA § 63(4) Split Schedules */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(79,70,229,0.25)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileCheck size={14} color="#4F46E5" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              BSA § 63(4) SCHEDULES
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#4F46E5",
              background: "rgba(79,70,229,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            PARTS A & B READY (PUNE BAR)
          </span>
        </div>

        {/* Pill 3: Cryptographic Paper Anchor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(16,185,129,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Key size={14} color="#059669" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              CRYPTO PAPER ANCHOR
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#059669",
              background: "rgba(5,150,105,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            24-WORD BIP-39 + ED25519
          </span>
        </div>

        {/* Pill 4: CBI Syndicate Nexus */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            borderRadius: "8px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid rgba(217,119,6,0.3)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Network size={14} color="#D97706" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-secondary, #475569)" }}>
              CBI MULTI-STATE NEXUS
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#D97706",
              background: "rgba(217,119,6,0.1)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {cbiMemo.linkedFirCount} FIRS · {cbiMemo.totalLossCroresStr}
          </span>
        </div>
      </div>

      {/* 2. MAIN 12-COLUMN BENTO INFOGRAPHIC WORKSPACE (HEIGHT: CALC(100% - 48PX), OVERFLOW: HIDDEN) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "10px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT COLUMN: 6 COLS (LEAVE-ONE-OUT STRESS-TESTER & BIP-39 PAPER ANCHOR) */}
        <div
          style={{
            gridColumn: "span 6",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 1: LIVE LEAVE-ONE-OUT (LOO) ADMISSIBILITY STRESS-TESTER */}
          <div
            style={{
              flex: "1 1 58%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Scale size={15} color="#4F46E5" />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                    Live Leave-One-Out (LOO) Defense Stress-Tester
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                    ARJUN PANDITRAO BENCH
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted, #94A3B8)" }}>
                  Toggle artifacts or alibis to stress-test prosecution reliance on Tier-1 independent records.
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
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: "var(--bento-canvas-subtle, #F8FAFC)",
                  color: "var(--bento-text-secondary, #475569)",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            </div>

            {/* 5 Artifact Checklist Rows */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                flex: 1,
                justifyContent: "space-around",
              }}
            >
              {artifacts.map((art) => {
                const isTier1 = art.tier === "TIER_1_INDEPENDENT";
                return (
                  <div
                    key={art.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      background: art.isExcluded ? "rgba(225,29,72,0.04)" : "var(--bento-canvas-subtle, #F8FAFC)",
                      border: art.isExcluded ? "1px dashed rgba(225,29,72,0.3)" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                      opacity: art.isExcluded ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={!art.isExcluded}
                        onChange={() => toggleArtifact(art.id)}
                        style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "#4F46E5", margin: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: art.isExcluded ? "#E11D48" : "var(--bento-text-primary, #0F172A)" }}>
                          {art.name}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", fontFamily: "var(--font-mono)" }}>
                          SHA: {art.sha256.slice(0, 16)}... | Custodian: {art.custodian}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        color: isTier1 ? "#059669" : "#64748B",
                        background: isTier1 ? "rgba(5,150,105,0.1)" : "rgba(100,116,139,0.1)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {isTier1 ? "TIER-1 INDEPENDENT" : "TIER-2 CORROBORATIVE"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Defense Alibi Quick Challenge Buttons */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {alibis.map((alibi) => (
                <button
                  key={alibi.id}
                  type="button"
                  onClick={() => toggleAlibi(alibi.id)}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: alibi.isChallenged ? "1px solid #DC2626" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: alibi.isChallenged ? "rgba(220,38,38,0.1)" : "var(--bento-canvas-subtle, #F8FAFC)",
                    color: alibi.isChallenged ? "#B91C1C" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  {alibi.name} {alibi.isChallenged ? "🚨" : ""}
                </button>
              ))}
            </div>

            {/* Prosecutor Cross-Examination Rebuttal Banner */}
            <div
              style={{
                fontSize: "10px",
                lineHeight: 1.4,
                padding: "6px 8px",
                borderRadius: "6px",
                background: looResult.proofSurvives ? "rgba(5,150,105,0.08)" : "rgba(225,29,72,0.08)",
                border: looResult.proofSurvives ? "1px solid rgba(5,150,105,0.25)" : "1px solid rgba(225,29,72,0.25)",
                color: looResult.proofSurvives ? "#065F46" : "#9F1239",
              }}
            >
              {looResult.prosecutorRebuttal}
            </div>
          </div>

          {/* CARD 2: 24-WORD BIP-39 PAPER ANCHOR & OFFLINE VERIFY.HTML */}
          <div
            style={{
              flex: "1 1 42%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Key size={14} color="#059669" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  24-Word BIP-39 Paper Anchor & Offline HTML Exporter
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownloadOfflineVerify}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#0284C7",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                <Download size={11} />
                <span>Export verify.html</span>
              </button>
            </div>

            {/* 24-Word Mnemonic Word Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "4px",
                padding: "6px",
                background: "var(--bento-canvas-subtle, #F8FAFC)",
                borderRadius: "6px",
                border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              }}
            >
              {paperAnchor.bip39Mnemonic.map((word, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "9px",
                    fontFamily: "var(--font-mono)",
                    padding: "2px 4px",
                    borderRadius: "3px",
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "var(--bento-text-primary, #0F172A)",
                    textAlign: "center",
                  }}
                >
                  <span style={{ color: "var(--bento-text-muted, #94A3B8)", marginRight: "2px" }}>{idx + 1}.</span>
                  {word}
                </div>
              ))}
            </div>

            {/* SHA-256 Root & Ed25519 Seal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)" }}>
              <span>Merkle Root: <strong className="font-mono-tabular" style={{ color: "#059669" }}>{paperAnchor.merkleRootSha256.slice(0, 24)}...</strong></span>
              <span>Ed25519 Sig: <strong className="font-mono-tabular" style={{ color: "#4F46E5" }}>{paperAnchor.ed25519SignatureHex.slice(0, 16)}...</strong></span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6 COLS (BSA 63 SCHEDULES & CBI SYNDICATE NEXUS) */}
        <div
          style={{
            gridColumn: "span 6",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
          }}
        >
          {/* CARD 3: BSA SECTION 63(4) SPLIT SCHEDULES (PARTS A & B) */}
          <div
            style={{
              flex: "1 1 58%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FileCheck size={15} color="#4F46E5" />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  BSA Section 63(4) Split Schedules
                </span>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "rgba(5,150,105,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                  PUNE BAR COMPLIANT
                </span>
              </div>

              {/* Schedule Tab Switcher */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("partB")}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    border: activeBsaTab === "partB" ? "1px solid #4F46E5" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: activeBsaTab === "partB" ? "rgba(79,70,229,0.12)" : "transparent",
                    color: activeBsaTab === "partB" ? "#4338CA" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  Schedule B (Expert)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("bank")}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    border: activeBsaTab === "bank" ? "1px solid #4F46E5" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: activeBsaTab === "bank" ? "rgba(79,70,229,0.12)" : "transparent",
                    color: activeBsaTab === "bank" ? "#4338CA" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  Schedule A (Bank)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBsaTab("isp")}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    border: activeBsaTab === "isp" ? "1px solid #4F46E5" : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: activeBsaTab === "isp" ? "rgba(79,70,229,0.12)" : "transparent",
                    color: activeBsaTab === "isp" ? "#4338CA" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                  }}
                >
                  Schedule A (ISP)
                </button>
              </div>
            </div>

            {/* Certificate Text Box */}
            <div
              style={{
                flex: 1,
                background: "var(--bento-canvas-subtle, #F8FAFC)",
                borderRadius: "8px",
                border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                lineHeight: 1.4,
                color: "var(--bento-text-primary, #0F172A)",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                minHeight: 0,
              }}
            >
              {currentScheduleText}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)" }}>
                Tableau T8u Bridge (S/N TAB-88219-04) · SHA-256 (FIPS 180-4)
              </div>

              <button
                type="button"
                onClick={handleCopySchedule}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  background: isScheduleCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {isScheduleCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isScheduleCopied ? "Copied" : "Copy Schedule"}</span>
              </button>
            </div>
          </div>

          {/* CARD 4: SALTED BLIND-INDEX CBI MULTI-STATE SYNDICATE AGGREGATION MEMO */}
          <div
            style={{
              flex: "1 1 42%",
              background: "var(--bento-card-bg, #FFFFFF)",
              borderRadius: "12px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Network size={14} color="#D97706" />
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                  Salted Blind-Index (HMAC-SHA256) CBI Syndicate Memo
                </span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#D97706", background: "rgba(217,119,6,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                PII-PRESERVING AGGREGATION
              </span>
            </div>

            {/* Syndicate Header Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bento-canvas-subtle, #F8FAFC)", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-primary, #0F172A)" }}>
                {cbiMemo.syndicateName}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#D97706", fontFamily: "var(--font-mono)" }}>
                {cbiMemo.totalLossCroresStr} ({cbiMemo.linkedFirCount} Connected FIRs)
              </span>
            </div>

            {/* 4 Blind-Indexed Entity Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "6px",
                flex: 1,
                minHeight: 0,
              }}
            >
              {cbiMemo.blindIndexedEntities.map((ent, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bento-canvas-subtle, #F8FAFC)",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--bento-text-muted, #94A3B8)" }}>
                      {ent.entityType} MATCH
                    </span>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#059669" }}>
                      {ent.matchesCount} FIRs
                    </span>
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--bento-text-secondary, #475569)", fontFamily: "var(--font-mono)" }}>
                    {ent.blindIndexHash}
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--bento-text-muted, #94A3B8)" }}>
                    {ent.locations[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
