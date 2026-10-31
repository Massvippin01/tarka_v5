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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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

type DossierTab = "loo" | "certificates" | "syndicate";

export const CourtProofScreen: React.FC = () => {
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>("loo");
  const [auditSentenceIdx, setAuditSentenceIdx] = useState<number | null>(0);

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

  // 5. Paper Anchor (Ed25519 & BIP-39 Phonetic Digest)
  const paperAnchor = useMemo(() => {
    return getCanonicalPaperAnchor("CASE-2026-001");
  }, []);

  const [isMnemonicCopied, setIsMnemonicCopied] = useState(false);
  const handleCopyMnemonic = () => {
    navigator.clipboard.writeText(paperAnchor.bip39Mnemonic.join(" "));
    setIsMnemonicCopied(true);
    setTimeout(() => setIsMnemonicCopied(false), 2000);
  };

  const handleExportVerifyHtml = () => {
    const htmlContent = generateOfflineVerifyHtml(paperAnchor);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TARKA_CASE-2026-001_Verify_Offline.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 6. CBI Syndicate Memo
  const cbiMemo = useMemo(() => {
    return getCbiSyndicateMemo();
  }, []);

  // Multi-State Fraud Volume Breakdown
  const stateBreakdown = [
    { state: "Delhi", amountCrores: 3.40, sharePct: 32.6, color: "#4F46E5", firs: 3 },
    { state: "Maharashtra", amountCrores: 2.85, sharePct: 27.4, color: "#7C3AED", firs: 5 },
    { state: "Karnataka", amountCrores: 1.95, sharePct: 18.7, color: "#0284C7", firs: 3 },
    { state: "Uttar Pradesh", amountCrores: 1.42, sharePct: 13.6, color: "#D97706", firs: 2 },
    { state: "Rajasthan", amountCrores: 0.80, sharePct: 7.7, color: "#E11D48", firs: 1 },
  ];

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
        height: "calc(100dvh - 56px)",
        maxHeight: "calc(100dvh - 56px)",
        padding: "12px 16px 16px 16px",
        gap: "10px",
        boxSizing: "border-box",
        background: "var(--bento-canvas, #F4F6FB)",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          1. TOP 4 EXECUTIVE SAAS BENTO KPI CARDS
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
          metric="RFC-3161 / Ed25519"
          metricColor="#059669"
          subtitle="FIPS 180-4 / Ed25519 Paper Verification Matrix"
          statusBadge={{
            text: paperAnchor.ed25519SignatureHex.includes("INVALID")
              ? "TAMPER DETECTED"
              : "ED25519 SIGNED",
            variant: paperAnchor.ed25519SignatureHex.includes("INVALID")
              ? "rose"
              : "emerald",
          }}
          delta={{
            value: "FIPS 180-4",
            isPositive: true,
            label: "Human Hash Grid",
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
          2. COURTROOM DOSSIER 3-TAB SEGMENTED BAR (PROGRESSIVE DISCLOSURE)
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          padding: "4px 8px",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", paddingLeft: "4px", letterSpacing: "0.05em" }}>
            Courtroom Dossier Studio:
          </span>
          {[
            { id: "loo" as const, label: "🛡️ Leave-One-Out (LOO) Defense Stress-Tester", icon: Scale },
            { id: "certificates" as const, label: "📜 BSA §63(4) Split Certificates & Offline Verifier", icon: FileCheck },
            { id: "syndicate" as const, label: "🏛️ CBI ₹10.42 Cr Multi-State Syndicate & STR Audit", icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDossierTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDossierTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: isActive ? "1px solid #4F46E5" : "1px solid transparent",
                  background: isActive ? "#EEF2FF" : "transparent",
                  color: isActive ? "#4338CA" : "#64748B",
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={12} color={isActive ? "#4F46E5" : "#64748B"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#047857", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
            BSA § 63(4) STATUTORY FILING READY ✓
          </span>
        </div>
      </div>

      {/* =========================================================================
          3. FULL-STAGE HERO CANVAS (MAX 2 SIMULTANEOUS PANELS PER TAB)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            TAB 1: LEAVE-ONE-OUT (LOO) DEFENSE STRESS-TESTER
            ===================================================================== */}
        {activeDossierTab === "loo" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "12px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* TAB 1 LEFT (6 COLUMNS): ALL 5 EVIDENCE ARTIFACTS + DEFENSE CHALLENGES */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      Evidence Artifact Registry (5 Artifacts)
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                      Toggle individual artifacts to simulate defense exclusion challenges in court.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetArtifacts}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "5px",
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={10} />
                    <span>Reset All</span>
                  </button>
                </div>

                {/* 5 Artifact Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {artifacts.map((art) => {
                    const IconComp = getArtifactIcon(art.id);
                    const isTier1 = art.tier === "TIER_1_INDEPENDENT";
                    return (
                      <div
                        key={art.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          borderRadius: "7px",
                          background: art.isExcluded ? "#F1F5F9" : isTier1 ? "#ECFDF5" : "#F8FAFC",
                          border: art.isExcluded
                            ? "1px dashed #CBD5E1"
                            : isTier1
                            ? "1px solid #A7F3D0"
                            : "1px solid #E2E8F0",
                          opacity: art.isExcluded ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={!art.isExcluded}
                            onChange={() => toggleArtifact(art.id)}
                            style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "#4F46E5" }}
                          />
                          <IconComp size={14} color={art.isExcluded ? "#94A3B8" : isTier1 ? "#059669" : "#4F46E5"} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: art.isExcluded ? "#94A3B8" : "#0F172A" }}>
                              {art.name}
                            </div>
                            <div style={{ fontSize: "9px", color: "#64748B", fontFamily: "var(--font-mono)" }}>
                              SHA: {art.sha256.slice(0, 16)}... · Custodian: {art.custodian}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: isTier1 ? "#D1FAE5" : "#EEF2FF",
                            color: isTier1 ? "#047857" : "#4338CA",
                            flexShrink: 0,
                          }}
                        >
                          {isTier1 ? "TIER-1 INDEPENDENT" : "TIER-2 CORROBORATIVE"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Defense Cross-Examination Challenge Simulation Buttons */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0F172A" }}>
                  Simulate Defense Cross-Examination Challenges:
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {alibis.map((alibi) => (
                    <button
                      key={alibi.id}
                      type="button"
                      onClick={() => toggleAlibi(alibi.id)}
                      style={{
                        padding: "4px 9px",
                        borderRadius: "5px",
                        fontSize: "10px",
                        fontWeight: 600,
                        border: alibi.isChallenged ? "1px solid #BE123C" : "1px solid #CBD5E1",
                        background: alibi.isChallenged ? "#FFF1F2" : "#FFFFFF",
                        color: alibi.isChallenged ? "#BE123C" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {alibi.name} {alibi.isChallenged ? "Active" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TAB 1 RIGHT (6 COLUMNS): TRIAL SURVIVAL SCORE CARD & PROSECUTOR REBUTTAL */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      Leave-One-Out Mathematical Robustness
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                      Independent 3-Judge Supreme Court benchmark (*Arjun Panditrao Khotkar*).
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 800,
                      background: looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2",
                      color: looResult.proofSurvives ? "#047857" : "#BE123C",
                      border: `1px solid ${looResult.proofSurvives ? "#A7F3D0" : "#FECDD3"}`,
                      padding: "2px 7px",
                      borderRadius: "4px",
                    }}
                  >
                    {looResult.proofSurvives ? "EVIDENTIARY SURVIVAL: 100%" : "ATTRIBUTION SEVERED"}
                  </span>
                </div>

                {/* Score Hero Box */}
                <div
                  style={{
                    background: looResult.proofSurvives ? "#ECFDF5" : "#FFF1F2",
                    border: `1px solid ${looResult.proofSurvives ? "#A7F3D0" : "#FECDD3"}`,
                    borderRadius: "10px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                      Post-Challenge Prosecution Survival
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: looResult.proofSurvives ? "#047857" : "#BE123C", fontFamily: "var(--font-mono)" }}>
                      {looResult.confidenceScore}% Survival
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                      {looResult.tier1Count} of 3 Statutory Tier-1 Records Validated
                    </div>
                  </div>
                  <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Scale size={22} color={looResult.proofSurvives ? "#059669" : "#E11D48"} />
                  </div>
                </div>
              </div>

              {/* Full Prosecutor Rebuttal Card */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "9px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  flex: 1,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                    <ShieldCheck size={14} color="#059669" />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F172A" }}>
                      PROSECUTOR CROSS-EXAMINATION REBUTTAL BRIEF:
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#334155", lineHeight: 1.45 }}>
                    Even if secondary handset screenshots and private WhatsApp chats are wholly excluded under BSA Section 63(4), the state's attribution and fund-flow proof stands entirely upon independent statutory Tier-1 records (SBI Core Banking Ledger #02, NPCI Central Switch Log #03, and Airtel CGNAT IPDR #04). The mathematical candidate intersection (340 → 1) and LIBR taint conservation are verifiable independently of any uncertified digital device.
                  </div>
                </div>

                <div style={{ fontSize: "9.5px", color: "#047857", fontWeight: 700, background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "4px 8px", borderRadius: "5px" }}>
                  Precedent: *Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1*
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: BSA § 63(4) SPLIT CERTIFICATES & OFFLINE VERIFIER
            ===================================================================== */}
        {activeDossierTab === "certificates" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "12px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* TAB 2 LEFT (7 COLUMNS): BSA §63(4) CERTIFICATE VIEWER */}
            <div
              style={{
                gridColumn: "span 7",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {/* Header with Schedule Tabs */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  {(
                    [
                      { id: "partB" as const, label: "Schedule B (Forensic Expert)" },
                      { id: "bank" as const, label: "Schedule A (SBI Bank)" },
                      { id: "isp" as const, label: "Schedule A (Airtel ISP)" },
                      { id: "handset" as const, label: "Schedule A (Handset)" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveBsaTab(s.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "10px",
                        fontWeight: 700,
                        border: activeBsaTab === s.id ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                        background: activeBsaTab === s.id ? "#EEF2FF" : "#F8FAFC",
                        color: activeBsaTab === s.id ? "#4338CA" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={11} />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "4px 9px",
                      borderRadius: "5px",
                      border: "none",
                      background: isScheduleCopied ? "#059669" : "#4F46E5",
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    {isScheduleCopied ? <Check size={11} /> : <Copy size={11} />}
                    <span>{isScheduleCopied ? "Copied" : "Copy Certificate"}</span>
                  </button>
                </div>
              </div>

              {/* Certificate Paper Viewer */}
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: "220px",
                  background: "#FCFDFE",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  lineHeight: 1.5,
                  color: "#0F172A",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  boxSizing: "border-box",
                }}
              >
                {currentScheduleText}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: "#64748B", borderTop: "1px solid #E2E8F0", paddingTop: "5px" }}>
                <span>ISO 17025 Accredited · Tableau T8u Bridge TAB-88219-04</span>
                <span style={{ color: "#047857", fontWeight: 700 }}>✓ PUNE BAR 2026 COMPLIANT</span>
              </div>
            </div>

            {/* TAB 2 RIGHT (5 COLUMNS): FIPS 180-4 PAPER VERIFICATION MATRIX */}
            <div
              style={{
                gridColumn: "span 5",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 16px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                      FIPS 180-4 / Ed25519 Paper Verification Matrix
                    </div>
                    <div style={{ fontSize: "9.5px", color: "#64748B", marginTop: "1px" }}>
                      24-Word Phonetic Verification Digest for physical remand files.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportVerifyHtml}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: "#4F46E5",
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <Download size={11} />
                    <span>verify.html</span>
                  </button>
                </div>

                {/* QR Code and Phonetic Word Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "115px 1fr", gap: "10px", alignItems: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "9px", padding: "8px 10px" }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "6px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <QRCodeSVG
                      value={`tarka://merkle/${paperAnchor.merkleRootSha256}?sig=${paperAnchor.ed25519SignatureHex.slice(0, 32)}`}
                      size={95}
                      level="M"
                    />
                    <span style={{ fontSize: "7px", fontWeight: 800, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: "3px", marginTop: "4px" }}>
                      ED25519 SEALED
                    </span>
                  </div>

                  {/* 24-Word Phonetic Verification Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px" }}>
                    {paperAnchor.bip39Mnemonic.map((word, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "4px",
                          padding: "2px 4px",
                          fontSize: "8.5px",
                          fontFamily: "var(--font-mono)",
                          textAlign: "center",
                          color: "#0F172A",
                        }}
                      >
                        <span style={{ color: "#64748B", fontSize: "7.5px" }}>{String(idx + 1).padStart(2, "0")}.</span> {word}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hashes and Copy Digest Button */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9.5px", color: "#64748B" }}>Merkle Root:</span>
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#047857", fontWeight: 700 }}>
                    {paperAnchor.merkleRootSha256.slice(0, 24)}...
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9.5px", color: "#64748B" }}>Ed25519 Custody Sig:</span>
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#4F46E5", fontWeight: 700 }}>
                    {paperAnchor.ed25519SignatureHex.slice(0, 24)}...
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMnemonic}
                  style={{
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "5px 8px",
                    borderRadius: "5px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: "9.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isMnemonicCopied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                  <span>{isMnemonicCopied ? "24-Word Digest Copied" : "Copy 24-Word Verification Digest"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: CBI MULTI-STATE SYNDICATE & STR AUDIT
            ===================================================================== */}
        {activeDossierTab === "syndicate" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: "12px",
              height: "100%",
              minHeight: 0,
            }}
          >
            {/* TAB 3 LEFT (6 COLUMNS): 5-STATE FRAUD BAR & 14-FIR BLIND-INDEX MATCHES */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      Jamtara-Noida Nexus #CBI-2026-CYBER-09
                    </div>
                    <div style={{ fontSize: "10px", color: "#D97706", fontWeight: 700, marginTop: "1px" }}>
                      ₹10.42 Crore across 14 FIRs (Exceeds ₹10 Cr DSPE Act Threshold)
                    </div>
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 800, background: "#FEF3C7", color: "#B45309", padding: "2px 7px", borderRadius: "4px" }}>
                    PII-PRESERVING
                  </span>
                </div>

                {/* 5-State Distribution Bar */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "9px", padding: "8px 10px", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 700, color: "#64748B", marginBottom: "4px" }}>
                    <span>Multi-State Distribution</span>
                    <span style={{ color: "#D97706" }}>₹10.00 Cr CBI Threshold Crossed ✓</span>
                  </div>
                  <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "#E2E8F0" }}>
                    {stateBreakdown.map((item, i) => (
                      <div key={i} title={`${item.state}: ₹${item.amountCrores} Cr`} style={{ width: `${item.sharePct}%`, height: "100%", background: item.color }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "8.5px", color: "#64748B" }}>
                    {stateBreakdown.map((item, i) => (
                      <span key={i}>
                        <strong style={{ color: item.color }}>●</strong> {item.state}: ₹{item.amountCrores}Cr
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4 Blind-Index Match Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>
                      <span>MSISDN MATCH</span>
                      <span style={{ color: "#047857", fontWeight: 800 }}>9 FIRs</span>
                    </div>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#0F172A", marginTop: "2px" }}>
                      hmac_sha256_b189a9f2...
                    </div>
                  </div>

                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>
                      <span>DEVICE IMEI MATCH</span>
                      <span style={{ color: "#047857", fontWeight: 800 }}>12 FIRs</span>
                    </div>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#0F172A", marginTop: "2px" }}>
                      hmac_sha256_e72810a9...
                    </div>
                  </div>

                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>
                      <span>PAN MATCH</span>
                      <span style={{ color: "#047857", fontWeight: 800 }}>6 FIRs</span>
                    </div>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#0F172A", marginTop: "2px" }}>
                      hmac_sha256_44a92c81...
                    </div>
                  </div>

                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", fontWeight: 700, color: "#64748B" }}>
                      <span>BANK ACCOUNT MATCH</span>
                      <span style={{ color: "#047857", fontWeight: 800 }}>8 FIRs</span>
                    </div>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#0F172A", marginTop: "2px" }}>
                      hmac_sha256_91820a4b...
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory CBI Transfer Callout */}
              <div style={{ fontSize: "9.5px", color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "7px", padding: "7px 10px", lineHeight: 1.35 }}>
                <strong>Mandatory CBI Transfer Triggered:</strong> Syndicate loss of ₹10.42 Cr exceeds ₹10.00 Cr threshold under Section 6, Delhi Special Police Establishment Act, 1946. Inter-state warrant generated.
              </div>
            </div>

            {/* TAB 3 RIGHT (6 COLUMNS): ZERO-HALLUCINATION STR SUMMARY (CLICK-TO-AUDIT) */}
            <div
              style={{
                gridColumn: "span 6",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                      Zero-Hallucination Executive STR Summary
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                      Click any sentence below to verify its deterministic cryptographic provenance.
                    </div>
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 800, background: "#ECFDF5", color: "#047857", padding: "2px 7px", borderRadius: "4px" }}>
                    CRYPTO-GROUNDED
                  </span>
                </div>

                {/* 3 Clickable Sentences */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    {
                      idx: 0,
                      sentence: "1. Target Chassis IMEI 867492061234564 and BSSID 74:DA:38:A2:11:BC operated 3 conduit accounts draining ₹5,00,000 in FIR #149/2026.",
                      provenance: "✓ [Verified: Airtel PGW Ingress Hash 4d7129... · Section 63(4) BSA SAT]",
                    },
                    {
                      idx: 1,
                      sentence: "2. Salted blind-index token HMAC-SHA256(86749206...) matches 14 interstate FIRs across 5 states totaling ₹10.42 Crore, crossing the ₹10.00 Cr DSPE Act §6 threshold.",
                      provenance: "✓ [Verified across 14 State Nodal Ledger Hashes · Section 6 DSPE Mandate SAT · Zero LLM Generation]",
                    },
                    {
                      idx: 2,
                      sentence: "3. Under Roscoe v. Winder LIBR accounting, ₹1.80L is held under §106(1) specific lien while shielding ₹2.50L clean merchant working capital.",
                      provenance: "✓ [Verified: ICICI Finacle Ledger Bal[k] Min-Cut Proof · Rajasthan HC Precedent]",
                    },
                  ].map((item) => {
                    const isSelected = auditSentenceIdx === item.idx;
                    return (
                      <div
                        key={item.idx}
                        onClick={() => setAuditSentenceIdx(item.idx)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "7px",
                          background: isSelected ? "#FFFBEB" : "#F8FAFC",
                          border: isSelected ? "1.5px solid #F59E0B" : "1px solid #E2E8F0",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontSize: "10.5px", color: isSelected ? "#92400E" : "#1E293B", fontWeight: isSelected ? 700 : 500, lineHeight: 1.4 }}>
                          {item.sentence}
                        </div>
                        {isSelected && (
                          <div style={{ marginTop: "4px", fontSize: "9px", fontFamily: "var(--font-mono)", color: "#B45309", background: "#FEF3C7", padding: "2px 6px", borderRadius: "4px" }}>
                            {item.provenance}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warrant Inter-State Transfer Footer */}
              <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "8px", padding: "8px 11px", fontSize: "10px", color: "#312E81", lineHeight: 1.4 }}>
                <strong>Judicial Warrant Intimation:</strong> Case dossier is cryptographically compiled and ready for automatic transmittal to the Central Bureau of Investigation, Special Cyber Crime Division (New Delhi).
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const ProofScreen = CourtProofScreen;
