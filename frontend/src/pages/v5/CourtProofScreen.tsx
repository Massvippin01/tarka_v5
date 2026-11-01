import React, { useState, useMemo } from "react";
import {
  Scale,
  Download,
  RotateCcw,
  Copy,
  Check,
  FileCheck,
  Building2,
  FileText,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
} from "../../components/tarka/kit";
import {
  generateBsa63SplitSchedules,
  getCanonicalPaperAnchor,
  generateOfflineVerifyHtml,
  type CaseArtifact,
  type AlibiChallenge,
} from "../../utils/courtProofEngine";
import {
  getBnss106PoliceSpecificLienNotice,
  getBnss107JudicialAttachmentApplication,
} from "../../utils/statutoryDirectives";

type DossierTab = "loo" | "certificates" | "syndicate";

export const CourtProofScreen: React.FC = () => {
  const { density, activeDiscoveredCluster } = useTarkaUiStore();
  const isCompact = density === "compact";

  const ja4 = activeDiscoveredCluster?.convergedJa4 || "t13d1516h2_8daaf6";
  const imei = activeDiscoveredCluster?.convergedImei || "867492061234564";
  const tac = imei.slice(0, 8);
  const recoverableLien = activeDiscoveredCluster
    ? `₹${activeDiscoveredCluster.librRecoverableLien.toLocaleString()}`
    : "₹3,80,000";

  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>("loo");
  const [auditSentenceIdx, setAuditSentenceIdx] = useState<number>(0);

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
      name: "Exclude WhatsApp & Screenshot",
      defenseArgument: "Defense argues secondary chat exports lack certified device hash under Section 63(4).",
      isChallenged: false,
    },
    {
      id: "alibi-clock-drift",
      name: "Bank Clock Drift +45s",
      defenseArgument: "Defense claims bank transaction timestamp deviates beyond permissible Stratum-2 sync.",
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
        prev.map((a) =>
          a.id === "art-whatsapp" || a.id === "art-victim-screenshot"
            ? { ...a, isExcluded: !a.isExcluded }
            : a
        )
      );
    }
  };

  // Support matrix: 5 Material Findings x 5 Ingested Artifacts
  const claimsMatrix = [
    {
      id: "c1",
      name: "1. ₹2.00L Hidden CBS Debit",
      supports: {
        "art-victim-screenshot": "CORROBORATIVE",
        "art-sbi-cbs": "PRIMARY",
        "art-npci-switch": "PRIMARY",
        "art-airtel-cgnat": "NONE",
        "art-whatsapp": "CORROBORATIVE",
      },
    },
    {
      id: "c2",
      name: "2. Single-Handset CGNAT Attribution",
      supports: {
        "art-victim-screenshot": "NONE",
        "art-sbi-cbs": "CORROBORATIVE",
        "art-npci-switch": "PRIMARY",
        "art-airtel-cgnat": "PRIMARY",
        "art-whatsapp": "NONE",
      },
    },
    {
      id: "c3",
      name: "3. Accomplice Hotspot Tethering (TTL=63)",
      supports: {
        "art-victim-screenshot": "NONE",
        "art-sbi-cbs": "NONE",
        "art-npci-switch": "PRIMARY",
        "art-airtel-cgnat": "PRIMARY",
        "art-whatsapp": "NONE",
      },
    },
    {
      id: "c4",
      name: "4. Multi-Hop Mule Taint Flow (3-Way DAG)",
      supports: {
        "art-victim-screenshot": "NONE",
        "art-sbi-cbs": "PRIMARY",
        "art-npci-switch": "PRIMARY",
        "art-airtel-cgnat": "NONE",
        "art-whatsapp": "CORROBORATIVE",
      },
    },
    {
      id: "c5",
      name: "5. ₹1.80L Proportional Merchant Lien",
      supports: {
        "art-victim-screenshot": "NONE",
        "art-sbi-cbs": "PRIMARY",
        "art-npci-switch": "PRIMARY",
        "art-airtel-cgnat": "NONE",
        "art-whatsapp": "NONE",
      },
    },
  ];

  // 4. BSA Section 63 Split Schedules
  const bsaSchedules = useMemo(() => {
    return generateBsa63SplitSchedules("CASE-2026-001");
  }, []);

  const [activeBsaTab, setActiveBsaTab] = useState<
    "partB" | "bank" | "isp" | "handset" | "bnss106" | "bnss107"
  >("partB");

  const currentScheduleText = useMemo(() => {
    if (activeBsaTab === "partB") return bsaSchedules.partB_ForensicExpert;
    if (activeBsaTab === "bank") return bsaSchedules.partA_BankNodal;
    if (activeBsaTab === "isp") return bsaSchedules.partA_IspRouter;
    if (activeBsaTab === "handset") return bsaSchedules.partA_Handset;
    if (activeBsaTab === "bnss106") return getBnss106PoliceSpecificLienNotice();
    return getBnss107JudicialAttachmentApplication();
  }, [activeBsaTab, bsaSchedules]);

  const [isScheduleCopied, setIsScheduleCopied] = useState(false);
  const handleCopySchedule = () => {
    navigator.clipboard.writeText(currentScheduleText);
    setIsScheduleCopied(true);
    toast.success("Section 63(4) Certificate copied to clipboard!");
    setTimeout(() => setIsScheduleCopied(false), 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // 5. Paper Anchor (Ed25519 & BIP-39 Phonetic Digest)
  const paperAnchor = useMemo(() => {
    return getCanonicalPaperAnchor("CASE-2026-001");
  }, []);

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

  // STR Narrative Sentences
  const strNarrativeSentences = [
    "Investigation across 14 linked FIRs reveals a centralized cyber-fraud syndicate operating under Jamtara-Noida Nexus #CBI-2026-CYBER-09.",
    "Aggregated fraud loss across UP, Maharashtra, Karnataka, Gujarat, and Delhi exceeds ₹10.42 Crore, satisfying mandatory transfer criteria under Section 6 of the Delhi Special Police Establishment (DSPE) Act, 1946.",
    `Primary infrastructure controller is linked via identical JA4 TLS fingerprint (${ja4}) and physical dual-SIM motherboard TAC (${tac}).`,
    `Statutory liens under Section 106 BNSS have successfully frozen ${recoverableLien} in immediate recoverable assets while shielding innocent merchant working capital.`,
  ];

  return (
    <div
      className={`tarka-court-root ${isCompact ? "tarka-density-compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: isCompact ? "6px 12px 10px 12px" : "8px 16px 12px 16px",
        gap: isCompact ? "6px" : "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      {/* STORY BANNER */}
      <StoryBanner
        screenId="court-proof"
        takeaway="Leave-one-out stress testing proves all 5 material findings survive complete exclusion of Tier-2/3 artifacts; Section 63(4) dual certificates and CBI ₹10.42 Cr threshold verified."
        evidenceChips={[
          { tier: "T1", label: "RFC-3161 Timestamp", hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
          { tier: "T1", label: "Ed25519 Judicial Seal", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
          { tier: "T1", label: "CBI Mandate Audit", hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a" },
        ]}
      />

      {/* KPI ROW: 4 TILES WITH UNTRUNCATED LABELS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: isCompact ? "6px" : "10px",
          flexShrink: 0,
        }}
      >
        <KpiTile
          title="Findings surviving"
          value="5 of 5 Material Claims"
          icon={Scale}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "100% SURVIVAL", variant: "emerald" }}
          subtitle="Arjun Panditrao Khotkar Invariant"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="All 5 core charges stand independently on immutable Tier-1 logs even upon complete exclusion of civilian chats."
        />

        <KpiTile
          title="§63(4) certificates"
          value="Parts A & B Ready"
          icon={FileCheck}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "CERTIFIED", variant: "indigo" }}
          subtitle="Custodian + Expert Dual Signatures"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Split statutory certificates: Schedule A signed by bank/telco custodians, Schedule B by forensic examiner."
        />

        <KpiTile
          title="Paper seal"
          value="RFC-3161 / Ed25519"
          icon={ShieldCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "AIR-GAP VALID", variant: "emerald" }}
          subtitle="24-Word BIP-39 Phonetic Digest"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Self-contained verifiable paper anchor with offline verification HTML app."
        />

        <KpiTile
          title="CBI threshold"
          value="₹10.42 Crore"
          icon={Building2}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          statusBadge={{ text: "DSPE ACT §6", variant: "amber" }}
          subtitle="14 FIRs Across 5 States (CBI Mandate)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Multi-state syndicate loss exceeds ₹10.00 Cr statutory threshold for federal CBI transfer."
        />
      </div>

      {/* TABS SWITCHER: LOO STRESS TEST | §63(4) CERTIFICATES | CBI SYNDICATE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "6px",
          padding: "3px 8px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={() => setActiveDossierTab("loo")}
            className="hover:text-slate-900 enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-out"
            style={{
              padding: "3px 10px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: activeDossierTab === "loo" ? "#EEF2FF" : "transparent",
              color: activeDossierTab === "loo" ? "#4F46E5" : "#64748B",
            }}
          >
            🛡️ Leave-One-Out Defense Stress-Tester
          </button>

          <button
            type="button"
            onClick={() => setActiveDossierTab("certificates")}
            className="hover:text-slate-900 enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-out"
            style={{
              padding: "3px 10px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: activeDossierTab === "certificates" ? "#EEF2FF" : "transparent",
              color: activeDossierTab === "certificates" ? "#4F46E5" : "#64748B",
            }}
          >
            📜 BSA §63(4) Split Certificates & Offline Verifier
          </button>

          <button
            type="button"
            onClick={() => setActiveDossierTab("syndicate")}
            className="hover:text-slate-900 enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-out"
            style={{
              padding: "3px 10px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: activeDossierTab === "syndicate" ? "#EEF2FF" : "transparent",
              color: activeDossierTab === "syndicate" ? "#4F46E5" : "#64748B",
            }}
          >
            🏛️ CBI ₹10.42 Cr Multi-State Syndicate & STR Audit
          </button>
        </div>

        <div style={{ fontSize: "9px", color: "#64748B" }}>
          Statutory Reference: <strong>Bharatiya Sakshya Adhiniyam, 2023</strong>
        </div>
      </div>

      {/* MAIN STAGE ACCORDING TO ACTIVE TAB */}
      {activeDossierTab === "loo" && (
        <main
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {/* LEFT 7 COLS: INTERACTIVE CLAIM X EVIDENCE SUPPORT MATRIX */}
          <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="Claim × Evidence Support Matrix (Leave-One-Out)"
              subtitle="Demonstrates that all 5 prosecution claims survive on independent Tier-1 records even under hostile cross-examination."
              icon={Scale}
              iconColor="#4F46E5"
              badgeText="100% RESILIENT"
              badgeVariant="emerald"
              actionSlot={
                <button
                  type="button"
                  onClick={resetArtifacts}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#475569",
                  }}
                >
                  <RotateCcw size={10} /> Reset Defense Deck
                </button>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: "8px" }}>
                {/* MATRIX TABLE */}
                <div
                  style={{
                    flex: "1 1 0%",
                    minHeight: 0,
                    overflowY: "auto",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5px" }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", color: "#475569", fontWeight: 700 }}>
                          Material Prosecution Finding
                        </th>
                        {artifacts.map((art) => (
                          <th
                            key={art.id}
                            onClick={() => toggleArtifact(art.id)}
                            style={{
                              padding: "6px 4px",
                              textAlign: "center",
                              color: art.isExcluded ? "#94A3B8" : "#0F172A",
                              cursor: "pointer",
                              textDecoration: art.isExcluded ? "line-through" : "none",
                              background: art.isExcluded ? "#F1F5F9" : "transparent",
                            }}
                            title="Click to exclude this evidence artifact"
                          >
                            <div style={{ fontSize: "8.5px", fontWeight: 700 }}>{art.name.slice(0, 15)}</div>
                            <span
                              style={{
                                fontSize: "7px",
                                fontWeight: 800,
                                padding: "1px 3px",
                                borderRadius: "2px",
                                background: art.tier.startsWith("TIER_1") ? "#ECFDF5" : "#FEF3C7",
                                color: art.tier.startsWith("TIER_1") ? "#047857" : "#B45309",
                              }}
                            >
                              {art.tier.startsWith("TIER_1") ? "T1" : "T2"}
                            </span>
                          </th>
                        ))}
                        <th style={{ padding: "6px 6px", textAlign: "center", color: "#0F172A", fontWeight: 800 }}>
                          Survival Verdict
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimsMatrix.map((claim) => {
                        const activeT1 = artifacts.some(
                          (a) => !a.isExcluded && a.tier.startsWith("TIER_1") && claim.supports[a.id as keyof typeof claim.supports] === "PRIMARY"
                        );
                        const activeT2 = artifacts.some(
                          (a) => !a.isExcluded && claim.supports[a.id as keyof typeof claim.supports] === "CORROBORATIVE"
                        );
                        const survives = activeT1;

                        return (
                          <tr key={claim.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "#0F172A" }}>
                              {claim.name}
                            </td>
                            {artifacts.map((art) => {
                              const supp = claim.supports[art.id as keyof typeof claim.supports];
                              return (
                                <td
                                  key={art.id}
                                  style={{
                                    padding: "6px 4px",
                                    textAlign: "center",
                                    background: art.isExcluded ? "#F8FAFC" : "transparent",
                                    opacity: art.isExcluded ? 0.35 : 1,
                                  }}
                                >
                                  {supp === "PRIMARY" ? (
                                    <span style={{ color: "#059669", fontWeight: "bold" }} title="Primary Tier-1 Proof">●</span>
                                  ) : supp === "CORROBORATIVE" ? (
                                    <span style={{ color: "#4F46E5", fontWeight: "bold" }} title="Corroborative Tier-2 Proof">◐</span>
                                  ) : (
                                    <span style={{ color: "#CBD5E1" }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ padding: "6px 6px", textAlign: "center" }}>
                              {survives ? (
                                <span style={{ fontSize: "8px", fontWeight: 800, padding: "2px 5px", borderRadius: "3px", background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" }}>
                                  ✓ Survives (T1)
                                </span>
                              ) : activeT2 ? (
                                <span style={{ fontSize: "8px", fontWeight: 800, padding: "2px 5px", borderRadius: "3px", background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A" }}>
                                  ⚠ Tier-2 Only
                                </span>
                              ) : (
                                <span style={{ fontSize: "8px", fontWeight: 800, padding: "2px 5px", borderRadius: "3px", background: "#FFF1F2", color: "#E11D48", border: "1px solid #FECDD3" }}>
                                  ✗ Unsupported
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 3 DEFENSE CHALLENGE DECK CARDS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                    Hostile Cross-Examination Stress Deck (Click to Challenge):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {alibis.map((alibi) => (
                      <div
                        key={alibi.id}
                        onClick={() => toggleAlibi(alibi.id)}
                        style={{
                          background: alibi.isChallenged ? "#FEF2F2" : "#FFFFFF",
                          border: alibi.isChallenged ? "1.5px solid #F43F5E" : "1px solid #CBD5E1",
                          borderRadius: "5px",
                          padding: "5px 7px",
                          cursor: "pointer",
                          transition: "all 0.12s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8.5px", fontWeight: 800, color: alibi.isChallenged ? "#E11D48" : "#0F172A" }}>
                            {alibi.name}
                          </span>
                          <span style={{ fontSize: "7px", fontWeight: 800, padding: "1px 4px", borderRadius: "2px", background: alibi.isChallenged ? "#FFE4E6" : "#F1F5F9", color: alibi.isChallenged ? "#BE123C" : "#64748B" }}>
                            {alibi.isChallenged ? "EXCLUDED" : "ACTIVE"}
                          </span>
                        </div>
                        <div style={{ fontSize: "7.5px", color: "#64748B", marginTop: "2px", lineHeight: "1.25" }}>
                          {alibi.defenseArgument}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT 5 COLS: STRUCTURED REBUTTAL BRIEF & PRECEDENTS */}
          <div style={{ gridColumn: "span 5", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="Prosecutor Rebuttal & Legal Precedent Deck"
              subtitle="Statutory compliance under Arjun Panditrao Khotkar (2020) and BSA 2023."
              icon={FileText}
              iconColor="#059669"
              badgeText="JUDICIAL ANCHOR"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px", overflowY: "auto" }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#0F172A", marginBottom: "3px" }}>
                    Supreme Court Benchmark:
                  </div>
                  <div style={{ fontSize: "9px", color: "#334155", fontStyle: "italic", lineHeight: "1.4" }}>
                    "The certificate under Section 65B(4) is a condition precedent to the admissibility of electronic record evidence. Where machine output is certified by the lawful custodian, proof of original physical device is not required."
                  </div>
                  <div style={{ fontSize: "8px", color: "#64748B", marginTop: "4px" }}>
                    — <em>Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal</em> (2020) 7 SCC 1
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#0F172A" }}>
                    Forensic Soundness Findings:
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "9px", color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: "bold" }}>✓</span>
                    <div>
                      <strong>Independent Carrier Logs:</strong> Airtel CGNAT IPDR and SBI Finacle commit logs operate on decoupled infrastructure with zero collusion possibility.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "9px", color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: "bold" }}>✓</span>
                    <div>
                      <strong>Deterministic Zero-Cycle Money Trail:</strong> Time-expanded DAG eliminates accounting loops, proving unbroken provenance to beneficiaries.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "9px", color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: "bold" }}>✓</span>
                    <div>
                      <strong>Examiner Qualification:</strong> System certified under BSA Section 63(4) Part B; see detailed examiner qualifications in Schedule B.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid #E2E8F0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", color: "#64748B" }}>
                    RFC-3161 Timestamp Token: <strong>SHA-256 Intact</strong>
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#059669" }}>
                    LEAVE-ONE-OUT: PASS ✓
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
        </main>
      )}

      {activeDossierTab === "certificates" && (
        <main
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {/* LEFT 8 COLS: PRINTABLE BOND PAPER CERTIFICATE PREVIEW */}
          <div style={{ gridColumn: "span 8", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="BSA § 63(4) Split Statutory Certificates"
              subtitle="Dual-schedule statutory certificates: Schedule A (System Custodians) + Schedule B (Cyber Forensic Examiner)."
              icon={FileCheck}
              iconColor="#4F46E5"
              badgeText="PART A & B"
              badgeVariant="indigo"
              actionSlot={
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 600,
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={10} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      border: "none",
                      background: "#4F46E5",
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    {isScheduleCopied ? <Check size={10} /> : <Copy size={10} />}
                    {isScheduleCopied ? "Copied" : "Copy Certificate"}
                  </button>
                </div>
              }
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: "6px" }}>
                {/* Schedule & Statutory Sub-tabs */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {[
                    { id: "partB", label: "Schedule B · Forensic Examiner" },
                    { id: "bank", label: "Schedule A · SBI Finacle Nodal" },
                    { id: "isp", label: "Schedule A · Airtel PGW / CGNAT" },
                    { id: "handset", label: "Schedule A · Handset Seizure" },
                    { id: "bnss106", label: "§106 BNSS · Police Specific Lien" },
                    { id: "bnss107", label: "§107 BNSS · Judicial Attachment" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveBsaTab(tab.id as any)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        border: activeBsaTab === tab.id ? "1px solid #4F46E5" : "1px solid #E2E8F0",
                        background: activeBsaTab === tab.id ? "#EEF2FF" : "#F8FAFC",
                        color: activeBsaTab === tab.id ? "#4F46E5" : "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Judicial Bond Paper Text Viewport */}
                <div
                  style={{
                    flex: "1 1 0%",
                    minHeight: 0,
                    overflowY: "auto",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "9.5px",
                    lineHeight: "1.45",
                    whiteSpace: "pre-wrap",
                    color: "#0F172A",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  {currentScheduleText}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT 4 COLS: QR SEAL + PGP READOUT + 24-WORD DIGEST + STANDALONE VERIFY.HTML */}
          <div style={{ gridColumn: "span 4", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="Air-Gap Paper Seal & Standalone Verifier"
              subtitle="Zero-trust physical evidence seal verifiable without network connectivity."
              icon={ShieldCheck}
              iconColor="#059669"
              badgeText="RFC-3161 ANCHOR"
              badgeVariant="emerald"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px", overflowY: "auto" }}>
                {/* QR Code and Cryptographic Seal */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "#F8FAFC", padding: "8px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                  <QRCodeSVG value={paperAnchor.ed25519SignatureHex} size={64} />
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A" }}>
                      Ed25519 Judicial Signature:
                    </div>
                    <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#475569", wordBreak: "break-all" }}>
                      {paperAnchor.ed25519SignatureHex.slice(0, 32)}...
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
                      RFC-3161 Qualified Timestamp: 2026-09-22 10:30:00 IST
                    </div>
                  </div>
                </div>

                {/* Courtroom Phonetic Readout Aid (PGP Word List) */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", marginBottom: "3px" }}>
                    Courtroom Phonetic Readout Aid (64-Bit Prefix):
                  </div>
                  <div style={{ fontSize: "9.5px", fontFamily: "monospace", color: "#4F46E5", fontWeight: 700, lineHeight: 1.4 }}>
                    {paperAnchor.phoneticReadout}
                  </div>
                  <div style={{ fontSize: "8px", color: "#64748B", marginTop: "2px" }}>
                    Standardized PGP/NATO phonetic vocabulary for unambiguous judicial transcription.
                  </div>
                </div>

                {/* 24-Word BIP-39 Phonetic Verification Mnemonic */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>
                    24-Word Paper Anchor Mnemonic:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px" }}>
                    {paperAnchor.bip39Mnemonic.slice(0, 12).map((word, idx) => (
                      <span key={idx} style={{ fontSize: "8px", fontFamily: "monospace", padding: "1px 4px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "3px", color: "#334155" }}>
                        {idx + 1}. {word}
                      </span>
                    ))}
                  </div>
                </div>

                {/* EXPORT STANDALONE VERIFY.HTML CTA */}
                <button
                  type="button"
                  onClick={handleExportVerifyHtml}
                  className="hover:bg-emerald-700 enabled:active:scale-[0.96] transition-[background-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    background: "#059669",
                    color: "#FFFFFF",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(5, 150, 105, 0.2)",
                    marginTop: "auto",
                  }}
                >
                  <Download size={12} />
                  <span>Export Standalone verify.html (Air-Gap)</span>
                </button>
              </div>
            </SectionCard>
          </div>
        </main>
      )}

      {activeDossierTab === "syndicate" && (
        <main
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "10px",
            overflow: "hidden",
          }}
        >
          {/* LEFT 6 COLS: CBI THERMOMETER & MULTI-STATE EXPOSURE */}
          <div style={{ gridColumn: "span 6", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="CBI Statutory Jurisdiction Thermometer"
              subtitle="Inter-state loss across 5 states crossing the ₹10.00 Cr threshold under DSPE Act Section 6."
              icon={Building2}
              iconColor="#B45309"
              badgeText="EXCEEDS ₹10.00 CR"
              badgeVariant="amber"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "8px" }}>
                {/* CBI Threshold Thermometer ScaleBar */}
                <ScaleBar
                  labelAbove="Total Multi-State Syndicate Fraud Volume"
                  min={0}
                  max={15}
                  value={10.42}
                  unit="Cr"
                  thresholdLine={{
                    value: 10.0,
                    label: "CBI THRESHOLD (₹10.00 CR)",
                    color: "#DC2626",
                  }}
                  toleranceBand={{
                    from: 10.0,
                    to: 15.0,
                    label: "CBI MANDATORY TRANSFER",
                  }}
                  valueBelow="Total: ₹10.42 Cr (UP: ₹3.85Cr, MH: ₹2.60Cr, KA: ₹1.95Cr, GJ: ₹1.22Cr, DL: ₹0.80Cr)"
                />

                {/* State breakdown list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    { state: "Uttar Pradesh", amt: "₹3.85 Cr", firs: 4, share: "37%" },
                    { state: "Maharashtra", amt: "₹2.60 Cr", firs: 3, share: "25%" },
                    { state: "Karnataka", amt: "₹1.95 Cr", firs: 3, share: "19%" },
                    { state: "Gujarat", amt: "₹1.22 Cr", firs: 2, share: "12%" },
                    { state: "Delhi", amt: "₹0.80 Cr", firs: 2, share: "7%" },
                  ].map((st, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", padding: "4px 8px", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A" }}>{st.state}</span>
                      <div style={{ display: "flex", gap: "8px", fontSize: "9px" }}>
                        <span style={{ color: "#64748B" }}>{st.firs} FIRs</span>
                        <strong style={{ color: "#B45309" }}>{st.amt}</strong>
                        <span style={{ color: "#059669" }}>({st.share})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* RIGHT 6 COLS: CLICK-TO-AUDIT STR NARRATIVE & MHA ORDERS */}
          <div style={{ gridColumn: "span 6", height: "100%", minHeight: 0 }}>
            <SectionCard
              title="Click-to-Audit Suspicious Transaction Report (STR)"
              subtitle="Interactive executive memo linking each assertion to cryptographic SHA-256 evidence."
              icon={FileText}
              iconColor="#4F46E5"
              badgeText="FIU-IND COMPLIANT"
              badgeVariant="indigo"
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
                <div
                  style={{
                    flex: "1 1 0%",
                    minHeight: 0,
                    overflowY: "auto",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "9.5px",
                    lineHeight: "1.5",
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0F172A", marginBottom: "4px" }}>
                    Executive STR Memo Ref: CBI/EO-II/2026/0491
                  </div>
                  {strNarrativeSentences.map((sentence, idx) => (
                    <span
                      key={idx}
                      onClick={() => setAuditSentenceIdx(idx)}
                      style={{
                        cursor: "pointer",
                        background: auditSentenceIdx === idx ? "#FEF3C7" : "transparent",
                        borderBottom: auditSentenceIdx === idx ? "1.5px solid #D97706" : "none",
                        padding: "1px 2px",
                      }}
                    >
                      {sentence}{" "}
                    </span>
                  ))}
                </div>

                <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "5px", padding: "6px 8px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#4338CA" }}>
                    Verified Statutory Evidence Binding:
                  </div>
                  <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#3730A3", marginTop: "1px" }}>
                    SHA-256 Digest: b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </main>
      )}
    </div>
  );
};
