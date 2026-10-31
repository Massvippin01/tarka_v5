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
  ShieldCheck,
  Building2,
  Cpu,
  Radio,
  MessageSquare,
  FileText,
  Printer,
  CheckCircle2,
  AlertOctagon,
  Fingerprint,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
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

  // 1. Initial 5 Case Artifacts
  const initialArtifacts: CaseArtifact[] = [
    {
      id: "art-victim-screenshot",
      name: "#01 Video Call Screenshot",
      tier: "TIER_2_CORROBORATIVE",
      custodian: "Sunil Kumar (Victim)",
      sha256: "c89148bc92019482019a84719284102948192841029481928410294819284102",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-sbi-cbs",
      name: "#02 SBI CBS Ledger",
      tier: "TIER_1_INDEPENDENT",
      custodian: "State Bank of India (Global IT Centre)",
      sha256: "b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-npci-switch",
      name: "#03 NPCI Central Switch Log",
      tier: "TIER_1_INDEPENDENT",
      custodian: "NPCI Central Gateway Node",
      sha256: "9f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-airtel-cgnat",
      name: "#04 Airtel CGNAT IPDR",
      tier: "TIER_1_INDEPENDENT",
      custodian: "Bharti Airtel Lawful Intercept",
      sha256: "4d71290481029481029481029481029481029481029481029481029481029481",
      isExcluded: false,
      canBeExcluded: true,
    },
    {
      id: "art-whatsapp",
      name: "#05 WhatsApp Chat Export",
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

  // 2. Defense Cross-Examination Alibi Challenges
  const [alibis, setAlibis] = useState<AlibiChallenge[]>([
    {
      id: "alibi-whatsapp-excluded",
      name: "Exclude WhatsApp Chat",
      defenseArgument: "Defense argues WhatsApp chats lack certified device hash under Section 63(4).",
      isChallenged: false,
    },
    {
      id: "alibi-clock-drift",
      name: "Bank Clock Drift +45s",
      defenseArgument: "Defense claims bank transaction time does not synchronize with telecom switch.",
      isChallenged: false,
    },
    {
      id: "alibi-someone-else",
      name: "Shared Device Alibi",
      defenseArgument: "Defense claims physical possession of cellular handset was transferred.",
      isChallenged: false,
    },
  ]);

  const toggleAlibi = (id: string) => {
    setAlibis((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isChallenged: !a.isChallenged } : a))
    );
    if (id === "alibi-whatsapp-excluded") {
      setArtifacts((prev) =>
        prev.map((a) => (a.id === "art-whatsapp" ? { ...a, isExcluded: !a.isExcluded } : a))
      );
    }
  };

  // 3. Evaluate Leave-One-Out Result
  const looResult = useMemo(() => {
    return evaluateLeaveOneOut(artifacts, alibis);
  }, [artifacts, alibis]);

  // 4. BSA Section 63 Split Schedules
  const bsaSchedules = useMemo(() => {
    return generateBsa63SplitSchedules("CASE-2026-001");
  }, []);

  const [activeBsaTab, setActiveBsaTab] = useState<"partB" | "bank" | "isp" | "handset">("partB");

  const currentScheduleText = useMemo(() => {
    if (activeBsaTab === "partB") return bsaSchedules.partB_ForensicExpert;
    if (activeBsaTab === "bank") return bsaSchedules.partA_BankNodal;
    if (activeBsaTab === "isp") return bsaSchedules.partA_IspRouter;
    return bsaSchedules.partA_Handset;
  }, [activeBsaTab, bsaSchedules]);

  const [isScheduleCopied, setIsScheduleCopied] = useState(false);
  const handleCopySchedule = () => {
    navigator.clipboard.writeText(currentScheduleText);
    setIsScheduleCopied(true);
    setTimeout(() => setIsScheduleCopied(false), 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // 5. 24-Word Paper Anchor Bundle
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

  const [isMnemonicCopied, setIsMnemonicCopied] = useState(false);
  const handleCopyMnemonic = () => {
    navigator.clipboard.writeText(paperAnchor.bip39Mnemonic.join(" "));
    setIsMnemonicCopied(true);
    setTimeout(() => setIsMnemonicCopied(false), 2000);
  };

  // 6. Standalone Offline verify.html Exporter
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

  // 7. CBI Multi-State Syndicate Memo
  const cbiMemo = useMemo(() => getCbiSyndicateMemo(), []);

  // State fraud distribution data for the breakdown bar
  const stateBreakdown = [
    { state: "Delhi", amountCrores: 3.40, sharePct: 32.6, color: "#4F46E5", firs: 3 },
    { state: "Maharashtra", amountCrores: 2.85, sharePct: 27.4, color: "#7C3AED", firs: 5 },
    { state: "Karnataka", amountCrores: 1.95, sharePct: 18.7, color: "#0284C7", firs: 3 },
    { state: "Uttar Pradesh", amountCrores: 1.42, sharePct: 13.6, color: "#D97706", firs: 2 },
    { state: "Rajasthan", amountCrores: 0.80, sharePct: 7.7, color: "#E11D48", firs: 1 },
  ];

  // Artifact icons map
  const getArtifactIcon = (id: string) => {
    switch (id) {
      case "art-victim-screenshot":
        return FileText;
      case "art-sbi-cbs":
        return Building2;
      case "art-npci-switch":
        return Cpu;
      case "art-airtel-cgnat":
        return Radio;
      case "art-whatsapp":
        return MessageSquare;
      default:
        return FileText;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        padding: "16px 20px 36px 20px",
        gap: "14px",
        boxSizing: "border-box",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
    >
      {/* =========================================================================
          1. TOP 4 EXECUTIVE SAAS BENTO KPI CARDS (STRICTLY 1-LINE HERO NUMBERS)
          ========================================================================= */}
      <div className="bento-grid-4" style={{ flexShrink: 0 }}>
        {/* Card 1: Evidentiary Robustness */}
        <BentoKpiCard
          title="Evidentiary Robustness"
          metric={`${looResult.confidenceScore}% Survival`}
          metricColor={looResult.proofSurvives ? "#059669" : "#E11D48"}
          subtitle="Survives full exclusion of secondary chats"
          statusBadge={{
            text: looResult.proofSurvives ? "TIER-1 INDEPENDENT" : "SEVERED",
            variant: looResult.proofSurvives ? "emerald" : "rose",
          }}
          delta={{
            value: `${looResult.tier1Count} / 3 Tier-1`,
            isPositive: looResult.proofSurvives,
            isWarning: !looResult.proofSurvives,
            label: "Arjun Panditrao Bench",
          }}
          icon={Scale}
          iconColor={looResult.proofSurvives ? "#059669" : "#E11D48"}
          iconBg={looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2"}
          sparklineData={
            looResult.proofSurvives
              ? [85, 90, 95, 98, 98.4, looResult.confidenceScore]
              : [98, 80, 50, 30, 15, looResult.confidenceScore]
          }
        />

        {/* Card 2: BSA § 63(4) Certificates */}
        <BentoKpiCard
          title="BSA § 63(4) Certificates"
          metric="Parts A & B"
          metricColor="#4F46E5"
          subtitle="Custodian logs separated from expert hash"
          statusBadge={{
            text: "PUNE BAR COMPLIANT",
            variant: "indigo",
          }}
          delta={{
            value: "3 Certificates",
            isPositive: true,
            label: "ISO 17025 Certified",
          }}
          icon={FileCheck}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={[1, 2, 2, 3, 3, 3]}
        />

        {/* Card 3: Cryptographic Paper Seal */}
        <BentoKpiCard
          title="Cryptographic Paper Seal"
          metric="24-Word BIP-39"
          metricColor="#059669"
          subtitle="Offline verifiable via standalone verify.html"
          statusBadge={{
            text: paperAnchor.ed25519SignatureHex.includes("INVALID")
              ? "TAMPER DETECTED"
              : "ED25519 SIGNED",
            variant: paperAnchor.ed25519SignatureHex.includes("INVALID")
              ? "rose"
              : "emerald",
          }}
          delta={{
            value: "256-bit Seed",
            isPositive: true,
            label: "Air-gapped verify",
          }}
          icon={Key}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[24, 24, 24, 24, 24, 24]}
        />

        {/* Card 4: CBI Syndicate Threshold */}
        <BentoKpiCard
          title="CBI Syndicate Threshold"
          metric={cbiMemo.totalLossCroresStr}
          metricColor="#D97706"
          subtitle="Crosses ₹10 Cr mandate for CBI transfer"
          statusBadge={{
            text: "14 FIRS · 5 STATES",
            variant: "amber",
          }}
          delta={{
            value: "DSPE Act § 6",
            isWarning: true,
            label: "Mandatory Transfer",
          }}
          icon={Network}
          iconColor="#D97706"
          iconBg="#FFFBEB"
          sparklineData={[2, 5, 8, 11, 13, 14]}
        />
      </div>

      {/* =========================================================================
          2. ROW 2: 12-COLUMN GRID
             - LEFT (7 COL): LIVE LEAVE-ONE-OUT (LOO) DEFENSE STRESS-TESTER
             - RIGHT (5 COL): BSA § 63(4) CERTIFICATE PREVIEW (REALISTIC LEGAL PAPER)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flexShrink: 0,
        }}
      >
        {/* ROW 2 LEFT (7 COLUMNS): LIVE LEAVE-ONE-OUT (LOO) DEFENSE STRESS-TESTER */}
        <div
          className="bento-card"
          style={{
            gridColumn: "span 7",
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
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Scale size={16} color="#4F46E5" />
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#0F172A",
                  }}
                >
                  Live Leave-One-Out (LOO) Defense Stress-Tester
                </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 800,
                    color: "#047857",
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    padding: "2px 7px",
                    borderRadius: "5px",
                    letterSpacing: "0.3px",
                  }}
                >
                  ARJUN PANDITRAO BENCH (3-JUDGE SC)
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  marginTop: "2px",
                }}
              >
                <strong>Cross-Examination Invariant:</strong> Tests if prosecution survives if the defense successfully excludes secondary screenshots.
              </div>
            </div>

            <button
              type="button"
              onClick={resetArtifacts}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: "7px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                color: "#334155",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Matrix</span>
            </button>
          </div>

          {/* Quick Admissibility Status Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: "8px",
              background: looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2",
              border: looResult.proofSurvives ? "1px solid #A7F3D0" : "1px solid #FECDD3",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {looResult.proofSurvives ? (
                <CheckCircle2 size={15} color="#059669" />
              ) : (
                <AlertOctagon size={15} color="#E11D48" />
              )}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: looResult.proofSurvives ? "#065F46" : "#9F1239",
                }}
              >
                {looResult.proofSurvives
                  ? "PRIMA FACIE ADMISSIBILITY SURVIVES ON INDEPENDENT RECORDS"
                  : "FATAL DEFECT: CHAIN OF CUSTODY SEVERED"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#64748B" }}>
                Tier-1 Active: <strong>{looResult.tier1Count} of 3</strong>
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: looResult.proofSurvives ? "#047857" : "#BE123C",
                }}
              >
                Score: {looResult.confidenceScore}%
              </span>
            </div>
          </div>

          {/* 5 Evidence Artifact Checklist Rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "165px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {artifacts.map((art) => {
              const isTier1 = art.tier === "TIER_1_INDEPENDENT";
              const Icon = getArtifactIcon(art.id);
              return (
                <div
                  key={art.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    background: art.isExcluded ? "#FFF1F2" : "#F8FAFC",
                    border: art.isExcluded
                      ? "1px dashed #FECDD3"
                      : "1px solid #E2E8F0",
                    opacity: art.isExcluded ? 0.65 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={!art.isExcluded}
                      onChange={() => toggleArtifact(art.id)}
                      style={{
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                        accentColor: "#4F46E5",
                        margin: 0,
                      }}
                    />
                    <Icon
                      size={15}
                      color={
                        art.isExcluded
                          ? "#9F1239"
                          : isTier1
                          ? "#059669"
                          : "#64748B"
                      }
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: art.isExcluded ? "#BE123C" : "#0F172A",
                          textDecoration: art.isExcluded
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {art.name}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#64748B",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        SHA: {art.sha256.slice(0, 16)}... · Custodian: {art.custodian}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 800,
                      color: isTier1 ? "#047857" : "#475569",
                      background: isTier1 ? "#ECFDF5" : "#F1F5F9",
                      border: isTier1
                        ? "1px solid #A7F3D0"
                        : "1px solid #E2E8F0",
                      padding: "2px 7px",
                      borderRadius: "5px",
                      letterSpacing: "0.2px",
                      flexShrink: 0,
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
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748B",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.3px",
              }}
            >
              Simulate Defense Cross-Examination Challenges:
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
                    border: alibi.isChallenged
                      ? "1px solid #E11D48"
                      : "1px solid #CBD5E1",
                    background: alibi.isChallenged ? "#FFF1F2" : "#F8FAFC",
                    color: alibi.isChallenged ? "#BE123C" : "#0F172A",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{alibi.name}</span>
                  {alibi.isChallenged && <span>🚨</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Prosecutor Courtroom Rebuttal Callout */}
          <div
            style={{
              fontSize: "11.5px",
              lineHeight: 1.5,
              padding: "10px 14px",
              borderRadius: "10px",
              background: looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2",
              border: looResult.proofSurvives
                ? "1px solid #A7F3D0"
                : "1px solid #FECDD3",
              color: looResult.proofSurvives ? "#065F46" : "#9F1239",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                marginBottom: "2px",
                textTransform: "uppercase",
                fontSize: "10.5px",
                letterSpacing: "0.4px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={13} />
              <span>Prosecutor Cross-Examination Rebuttal:</span>
            </div>
            {looResult.prosecutorRebuttal}
          </div>
        </div>

        {/* ROW 2 RIGHT (5 COLUMNS): OFFICIAL BSA SECTION 63(4) CERTIFICATE PREVIEW */}
        <div
          className="bento-card"
          style={{
            gridColumn: "span 5",
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
          {/* Header & Pune Bar Compliant Seal Stamp */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileCheck size={16} color="#4F46E5" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                BSA § 63(4) Split Certificates
              </span>
            </div>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: "#047857",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                padding: "3px 7px",
                borderRadius: "5px",
                letterSpacing: "0.3px",
              }}
            >
              ✓ PUNE BAR ASSOCIATION 2026 COMPLIANT
            </span>
          </div>

          {/* Interactive Schedule Tab Switcher */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveBsaTab("partB")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
                border:
                  activeBsaTab === "partB"
                    ? "1px solid #4F46E5"
                    : "1px solid #E2E8F0",
                background: activeBsaTab === "partB" ? "#EEF2FF" : "#F8FAFC",
                color: activeBsaTab === "partB" ? "#4338CA" : "#64748B",
                cursor: "pointer",
              }}
            >
              Schedule B (Forensic Expert)
            </button>
            <button
              type="button"
              onClick={() => setActiveBsaTab("bank")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
                border:
                  activeBsaTab === "bank"
                    ? "1px solid #4F46E5"
                    : "1px solid #E2E8F0",
                background: activeBsaTab === "bank" ? "#EEF2FF" : "#F8FAFC",
                color: activeBsaTab === "bank" ? "#4338CA" : "#64748B",
                cursor: "pointer",
              }}
            >
              Schedule A (SBI Bank)
            </button>
            <button
              type="button"
              onClick={() => setActiveBsaTab("isp")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
                border:
                  activeBsaTab === "isp"
                    ? "1px solid #4F46E5"
                    : "1px solid #E2E8F0",
                background: activeBsaTab === "isp" ? "#EEF2FF" : "#F8FAFC",
                color: activeBsaTab === "isp" ? "#4338CA" : "#64748B",
                cursor: "pointer",
              }}
            >
              Schedule A (Airtel ISP)
            </button>
            <button
              type="button"
              onClick={() => setActiveBsaTab("handset")}
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "6px",
                border:
                  activeBsaTab === "handset"
                    ? "1px solid #4F46E5"
                    : "1px solid #E2E8F0",
                background: activeBsaTab === "handset" ? "#EEF2FF" : "#F8FAFC",
                color: activeBsaTab === "handset" ? "#4338CA" : "#64748B",
                cursor: "pointer",
              }}
            >
              Schedule A (Handset)
            </button>
          </div>

          {/* Realistic Physical Legal Paper Styling */}
          <div
            style={{
              background: "#FCFDFE",
              border: "1px solid #CBD5E1",
              borderRadius: "10px",
              padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              lineHeight: 1.55,
              color: "#0F172A",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              height: "175px",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {currentScheduleText}
          </div>

          {/* Certificate Actions & ISO 17025 Tag */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "10.5px", color: "#64748B" }}>
              ISO 17025 Accredited · Tableau T8u Bridge TAB-88219-04
            </span>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={handlePrintCertificate}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <Printer size={12} />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleCopySchedule}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isScheduleCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                }}
              >
                {isScheduleCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isScheduleCopied ? "Copied" : "Copy Certificate"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. ROW 3: 12-COLUMN GRID (FULLY VISIBLE, NEVER CUT OFF)
             - LEFT (6 COL): 24-WORD BIP-39 PAPER ANCHOR + REAL QRCodeSVG + EXPORTER
             - RIGHT (6 COL): SALTED BLIND-INDEX CBI MULTI-STATE SYNDICATE INFOGRAPHIC
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "14px",
          flexShrink: 0,
        }}
      >
        {/* ROW 3 LEFT (6 COLUMNS): 24-WORD BIP-39 PAPER ANCHOR + REAL QRCodeSVG */}
        <div
          className="bento-card"
          style={{
            gridColumn: "span 6",
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
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Key size={16} color="#059669" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                24-Word BIP-39 Paper Anchor & Offline HTML
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  color: "#047857",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                ED25519 SEALED
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={handleCopyMnemonic}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: isMnemonicCopied ? "#ECFDF5" : "#F8FAFC",
                  color: isMnemonicCopied ? "#047857" : "#334155",
                  cursor: "pointer",
                }}
              >
                {isMnemonicCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isMnemonicCopied ? "Copied" : "Copy Words"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadOfflineVerify}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                }}
              >
                <Download size={12} />
                <span>Export Standalone verify.html</span>
              </button>
            </div>
          </div>

          {/* Split Layout: 130px QR Code on Left, 4x6 BIP-39 Word Grid on Right */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "130px 1fr",
              gap: "14px",
              alignItems: "center",
            }}
          >
            {/* Left 130px Column: High-Density Real QRCodeSVG */}
            <div
              style={{
                width: "130px",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                boxSizing: "border-box",
              }}
            >
              <QRCodeSVG
                value={`tarka://merkle/${paperAnchor.merkleRootSha256}?sig=${paperAnchor.ed25519SignatureHex.slice(0, 32)}`}
                size={104}
                level="M"
              />
              <div
                style={{
                  fontSize: "8.5px",
                  color: "#64748B",
                  textAlign: "center",
                  marginTop: "6px",
                  lineHeight: 1.2,
                  fontWeight: 600,
                }}
              >
                Scan against Physical Remand File
              </div>
              <span
                style={{
                  fontSize: "7.5px",
                  fontWeight: 800,
                  color: "#059669",
                  background: "#ECFDF5",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  marginTop: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.2px",
                }}
              >
                ED25519 MERKLE SEAL
              </span>
            </div>

            {/* Right Column: Crisp 4x6 Grid of 24 BIP-39 Mnemonic Words */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "5px",
                padding: "10px",
                background: "#F8FAFC",
                borderRadius: "12px",
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
                    borderRadius: "6px",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    color: "#0F172A",
                    textAlign: "center",
                    fontWeight: 600,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <span style={{ color: "#94A3B8", marginRight: "3px" }}>
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  {word}
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Digests Footer Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "10.5px",
              color: "#64748B",
              background: "#F8FAFC",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
            }}
          >
            <span>
              Merkle Root:{" "}
              <strong
                className="font-mono-tabular"
                style={{ color: "#059669" }}
              >
                {paperAnchor.merkleRootSha256.slice(0, 24)}...
              </strong>
            </span>
            <span>
              Ed25519 Custody Sig:{" "}
              <strong
                className="font-mono-tabular"
                style={{ color: "#4F46E5" }}
              >
                {paperAnchor.ed25519SignatureHex.slice(0, 18)}...
              </strong>
            </span>
          </div>
        </div>

        {/* ROW 3 RIGHT (6 COLUMNS): SALTED BLIND-INDEX CBI MULTI-STATE SYNDICATE INFOGRAPHIC */}
        <div
          className="bento-card"
          style={{
            gridColumn: "span 6",
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
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Network size={16} color="#D97706" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0F172A",
                }}
              >
                Salted Blind-Index (HMAC-SHA256) CBI Syndicate Memo
              </span>
            </div>
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: 800,
                color: "#B45309",
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                padding: "2px 7px",
                borderRadius: "4px",
              }}
            >
              PII-PRESERVING
            </span>
          </div>

          {/* Top Summary Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#92400E",
              }}
            >
              {cbiMemo.syndicateName}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: "#D97706",
                fontFamily: "var(--font-mono)",
              }}
            >
              ₹10.42 Crore across 14 FIRs
            </span>
          </div>

          {/* State Fraud Volume Breakdown Bar with ₹10.00 Cr Threshold Line */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#64748B",
              }}
            >
              <span>Multi-State Fraud Distribution (5 States)</span>
              <span style={{ color: "#D97706", fontWeight: 800 }}>
                ₹10.00 Cr CBI Threshold Crossed ✓
              </span>
            </div>

            {/* Segmented Bar with Threshold Line */}
            <div style={{ position: "relative", width: "100%", height: "16px" }}>
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "10px",
                  borderRadius: "5px",
                  overflow: "hidden",
                  background: "#E2E8F0",
                }}
              >
                {stateBreakdown.map((item, i) => (
                  <div
                    key={i}
                    title={`${item.state}: ₹${item.amountCrores.toFixed(2)} Cr (${item.sharePct}%)`}
                    style={{
                      width: `${item.sharePct}%`,
                      height: "100%",
                      background: item.color,
                    }}
                  />
                ))}
              </div>

              {/* ₹10.00 Cr Threshold Vertical Marker Line */}
              <div
                style={{
                  position: "absolute",
                  left: "96%",
                  top: "-3px",
                  bottom: "-3px",
                  width: "2px",
                  background: "#E11D48",
                  zIndex: 2,
                }}
                title="₹10.00 Cr CBI Mandate Threshold Line"
              />
            </div>

            {/* State Volume Chips */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "4px",
                fontSize: "9.5px",
              }}
            >
              {stateBreakdown.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#334155",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: s.color,
                      display: "inline-block",
                    }}
                  />
                  <span>
                    {s.state}: <strong>₹{s.amountCrores.toFixed(2)} Cr</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2x2 White Sub-Card Grid for Cross-State Match Clusters */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "6px",
            }}
          >
            {cbiMemo.blindIndexedEntities.map((ent, idx) => (
              <div
                key={idx}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "#64748B",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Fingerprint size={11} color="#64748B" />
                    {ent.entityType} MATCH
                  </span>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 800,
                      color: "#059669",
                      background: "#ECFDF5",
                      padding: "1px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    {ent.matchesCount} FIRs
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "9.5px",
                    color: "#0F172A",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    margin: "2px 0",
                  }}
                >
                  {ent.blindIndexHash}
                </div>
                <div style={{ fontSize: "9px", color: "#64748B" }}>
                  {ent.locations[0]}
                </div>
              </div>
            ))}
          </div>

          {/* Statutory CBI Transfer Mandate Callout */}
          <div
            style={{
              fontSize: "10.5px",
              color: "#475569",
              background: "#F1F5F9",
              padding: "6px 10px",
              borderRadius: "7px",
              border: "1px solid #E2E8F0",
              lineHeight: 1.4,
            }}
          >
            <strong>Mandatory CBI Transfer Triggered:</strong> Syndicate loss of ₹10.42 Cr exceeds ₹10.00 Cr threshold under Section 6, Delhi Special Police Establishment Act, 1946. Inter-state warrant generated.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourtProofScreen;
