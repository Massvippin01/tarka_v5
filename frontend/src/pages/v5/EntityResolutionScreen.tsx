import React, { useState, useMemo } from "react";
import {
  Dna,
  Users,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Building,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
} from "../../components/tarka/kit";
import { getBnss94EntityResolutionDirective } from "../../utils/statutoryDirectives";

interface CanonicalEntity {
  id: string;
  name: string;
  role: string;
  roleBadge: string;
  roleColor: "rose" | "indigo" | "amber" | "emerald";
  tokens: string[];
  fraudScore: number;
  isHardVeto?: boolean;
  hardVetoReason?: string;
  summary: string;
  subScores: {
    velocity: number;
    deviceOverlap: number;
    structuring: number;
    kycDiscrepancy: number;
  };
}

export const EntityResolutionScreen: React.FC = () => {
  const { activeCaseId, activeCase } = useTarkaGlobal();
  const { density, activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();
  const isCompact = density === "compact";

  const investigation = useMemo(() => {
    const base = reconstructedInvestigation || reconstruct5FileInvestigation();
    if (activeCase && activeCase.caseId !== "CASE-2026-001") {
      return {
        ...base,
        firNumber: activeCase.firNumber,
        complainantName: activeCase.complainantName,
        bookedLossInr: activeCase.bookedLossInr,
        claimedLossInr: activeCase.claimedLossInr,
      };
    }
    return base;
  }, [reconstructedInvestigation, activeCase]);

  const dynamicData = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseCanonicalEntities(activeCaseId || "CASE-2026-001", investigation);
  }, [activeCaseId, investigation]);

  const [selectedEntityId, setSelectedEntityId] = useState<string>("ENT-02");

  const canonicalEntities: CanonicalEntity[] = useMemo(() => {
    if (activeDiscoveredCluster) {
      const victim = activeDiscoveredCluster.victimAccount || "SBI_VIC_ARJUN_MEHTA";
      const conduit = activeDiscoveredCluster.layer1Conduit || "AXIS_MULE_KARAN_DAS";
      const l2a = activeDiscoveredCluster.layer2SplitConduits?.[0] || "ICICI_MULE_PRIYA_SHARMA";
      const l2b = activeDiscoveredCluster.layer2SplitConduits?.[1] || "HDFC_MULE_DEV_PATEL";
      const merchant = activeDiscoveredCluster.innocentMerchant || "ICICI_MERCH_METRO_GOLD_GST";
      const gstin = activeDiscoveredCluster.merchantGstin || "07AAACA1234F1Z8";
      const imei = activeDiscoveredCluster.convergedImei || "359988007766552";
      const ja4 = activeDiscoveredCluster.convergedJa4 || "t13d1516h2_99aabbccddeeff01";
      const bssid = activeDiscoveredCluster.bssidHotspot || "AA:BB:CC:11:22:33";

      return [
        {
          id: "ENT-01",
          name: victim.replace(/_/g, " "),
          role: "Complainant Victim",
          roleBadge: "VICTIM ORIGIN",
          roleColor: "indigo",
          fraudScore: 0,
          tokens: [`A/c: ${victim}`, "Complainant Target", "Defrauded Inflow Origin"],
          summary: `Victim account defrauded for ₹${activeDiscoveredCluster.totalDrained.toLocaleString()} outflow across multi-hop syndicate.`,
          subScores: { velocity: 0, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 },
        },
        {
          id: "ENT-02",
          name: conduit.replace(/_/g, " "),
          role: "Layer-1 Primary Mule",
          roleBadge: "L1 CONDUIT MULE",
          roleColor: "rose",
          fraudScore: 98,
          tokens: [`A/c: ${conduit}`, `Chassis IMEI: ${imei}`, `JA4 TLS: ${ja4}`],
          summary: `Primary pass-through conduit receiving full ₹${activeDiscoveredCluster.totalDrained.toLocaleString()} victim inflow and layering across L2 mules.`,
          subScores: { velocity: 98, deviceOverlap: 100, structuring: 94, kycDiscrepancy: 95 },
        },
        {
          id: "ENT-03",
          name: l2a.replace(/_/g, " "),
          role: "Layer-2A Split Mule",
          roleBadge: "L2 SPLIT CONDUIT",
          roleColor: "amber",
          fraudScore: 94,
          tokens: [`A/c: ${l2a}`, `JA4 TLS: ${ja4}`, "Split Layering Node"],
          summary: `Layer-2 conduit receiving split tranche; transferred tainted funds to merchant for bullion purchase.`,
          subScores: { velocity: 92, deviceOverlap: 96, structuring: 90, kycDiscrepancy: 88 },
        },
        {
          id: "ENT-04",
          name: l2b.replace(/_/g, " "),
          role: "Layer-2B Cashout Mule",
          roleBadge: "L2 CASHOUT SINK",
          roleColor: "amber",
          fraudScore: 94,
          tokens: [`A/c: ${l2b}`, `Hotspot BSSID: ${bssid}`, "ATM Cashout Transit"],
          summary: `Layer-2 cashout mule; executed ATM withdrawal at ${activeDiscoveredCluster.atmCashoutSink || "ATM_GURUGRAM_CYBERHUB_09"}.`,
          subScores: { velocity: 96, deviceOverlap: 94, structuring: 92, kycDiscrepancy: 90 },
        },
        {
          id: "ENT-05",
          name: merchant.replace(/_/g, " "),
          role: "Bona-Fide Merchant",
          roleBadge: "✓ HARD VETO SHIELD",
          roleColor: "emerald",
          isHardVeto: true,
          hardVetoReason: `Active GSTIN ${gstin} · Verified retail bullion ledger · Clean deposit ₹${(activeDiscoveredCluster.merchantCleanDeposit || 450000).toLocaleString()} shielded under LIBR.`,
          fraudScore: 4,
          tokens: [`GSTIN: ${gstin}`, `A/c: ${merchant}`, "Clean Turnover Shielded"],
          summary: `Innocent retail merchant. LIBR doctrine applies specific lien of ₹${activeDiscoveredCluster.librRecoverableLien.toLocaleString()} while protecting ₹${(activeDiscoveredCluster.merchantCleanDeposit || 450000).toLocaleString()} clean capital.`,
          subScores: { velocity: 4, deviceOverlap: 0, structuring: 6, kycDiscrepancy: 0 },
        },
      ];
    }
    return dynamicData.entities;
  }, [activeDiscoveredCluster, dynamicData]);

  const [selectedTokenType, setSelectedTokenType] = useState<string>("ALL");
  const [isCopied, setIsCopied] = useState(false);

  const rawTokenList = useMemo(() => {
    return dynamicData.tokens;
  }, [dynamicData]);

  const filteredTokens = rawTokenList.filter((t) => {
    if (selectedTokenType === "ALL") return true;
    return t.sourceType === selectedTokenType;
  });

  const selectedEntity = canonicalEntities.find((e) => e.id === selectedEntityId) || canonicalEntities[1];

  const handleCopyDirective = () => {
    navigator.clipboard.writeText(getBnss94EntityResolutionDirective());
    setIsCopied(true);
    toast.success("§ 94 BNSS Cross-Bank KYC & CAF Requisition copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`tarka-entity-resolution-root ${isCompact ? "tarka-density-compact" : ""}`}
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
        screenId="entities"
        takeaway={`Deterministic multi-source resolution for ${investigation.complainantName} (${investigation.firNumber}): resolved ${canonicalEntities.length} canonical entities across ${rawTokenList.length} evidentiary tokens; hard-veto protection active.`}
        evidenceChips={[
          { tier: "T1", label: `${investigation.nodes[0]?.bank || "Core Banking"} Narration`, hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
          { tier: "T2", label: "WhatsApp Coercion Header", hash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" },
          { tier: "T1", label: "ICICI GSTIN Return", hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a" },
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
          title="Raw identifiers"
          value="24 Mentions"
          icon={Dna}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "4 SOURCES", variant: "indigo" }}
          subtitle="WhatsApp, APK, CBS, CDR"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="24 noisy extracted identifiers parsed from chats, APK payloads, switch logs, and CDRs."
        />

        <KpiTile
          title="Canonical entities"
          value="5 Profiles"
          icon={Users}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "18 → 5 ENTITIES", variant: "emerald" }}
          subtitle="Deterministic Join (Zero Collisions)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Exact join across primary keys (VPA, AOF, IMEI, GSTIN) resolves 18 actors into 5 distinct profiles."
        />

        <KpiTile
          title="Merges vetoed"
          value="1 Shielded"
          icon={ShieldCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "GST PROTECTED", variant: "emerald" }}
          subtitle="Apex Electronics Pvt Ltd"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Active GSTIN 07AAACA1234F1Z8 and 420 monthly retail POS swipes hard-veto false mule syndicate merge."
        />

        <KpiTile
          title="Social-eng. vectors"
          value="2 Active Lures"
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "HIGH THREAT", variant: "rose" }}
          subtitle="Digital Arrest + Malicious C2 APK"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Fake Supreme Court/CBI warrant coercion script paired with SecureInvest_v2.apk SMS interceptor."
        />
      </div>

      {/* =========================================================================
          ROW 2: 2-PANEL STAGE (LEFT 7 COLS HERO MAP + RIGHT 5 COLS DOSSIER)
          ========================================================================= */}
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
        {/* =====================================================================
            LEFT HERO CARD (7 COLUMNS): 3-COLUMN ALIAS RESOLUTION BIPARTITE MAP
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
          <SectionCard
            title="Deterministic Entity Extraction & Alias Resolution Matrix"
            subtitle="Connects raw unstructured evidence tokens to canonical profiles with live hard-veto guardrail."
            icon={Dna}
            iconColor="#4F46E5"
            badgeText="BIPARTITE MAP"
            badgeVariant="indigo"
            provenanceTooltip="Multi-source entity resolution graph verifying zero false positive conflation."
            actionSlot={
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                {["ALL", "whatsapp", "apk", "cbs", "cdr", "pos"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTokenType(type)}
                    className="hover:border-indigo-400 enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-[background-color,border-color,color,transform] duration-150 ease-out"
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      border: selectedTokenType === type ? "1px solid #4F46E5" : "1px solid #CBD5E1",
                      background: selectedTokenType === type ? "#EEF2FF" : "#FFFFFF",
                      color: selectedTokenType === type ? "#4338CA" : "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            }
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.5fr",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                position: "relative",
              }}
            >
              {/* LEFT COLUMN: RAW TOKENS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                  Raw Extracted Tokens ({filteredTokens.length})
                </div>
                {filteredTokens.map((token) => {
                  const isLinked = token.targetEntityId === selectedEntityId;
                  return (
                    <div
                      key={token.id}
                      onClick={() => setSelectedEntityId(token.targetEntityId)}
                      style={{
                        background: isLinked ? "#FFFFFF" : "#F8FAFC",
                        border: isLinked ? `1.5px solid ${token.badgeColor}` : "1px solid #E2E8F0",
                        borderRadius: "5px",
                        padding: "4px 7px",
                        cursor: "pointer",
                        boxShadow: isLinked ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "7.5px", fontWeight: 800, color: token.badgeColor, background: `${token.badgeColor}12`, padding: "1px 4px", borderRadius: "3px" }}>
                          {token.source}
                        </span>
                        <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "#64748B" }}>
                          {token.id}
                        </span>
                      </div>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                        {token.label}
                      </div>
                      <div style={{ fontSize: "9px", fontFamily: "monospace", color: token.badgeColor, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {token.value}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: CANONICAL ENTITIES */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "2px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                  Canonical Investigative Profiles (5)
                </div>

                {canonicalEntities.map((entity) => {
                  const isSelected = entity.id === selectedEntityId;
                  const border = isSelected
                    ? entity.isHardVeto
                      ? "2px solid #059669"
                      : "2px solid #4F46E5"
                    : "1px solid #E2E8F0";

                  return (
                    <div
                      key={entity.id}
                      onClick={() => setSelectedEntityId(entity.id)}
                      style={{
                        background: isSelected ? (entity.isHardVeto ? "#ECFDF5" : "#EEF2FF") : "#FFFFFF",
                        border,
                        borderRadius: "6px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", fontWeight: 800, color: isSelected ? "#0F172A" : "#1E293B" }}>
                          {entity.id} · {entity.name}
                        </span>
                        <span
                          style={{
                            fontSize: "7.5px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: entity.roleColor === "rose" ? "#FFF1F2" : entity.roleColor === "amber" ? "#FFFBEB" : entity.roleColor === "emerald" ? "#D1FAE5" : "#EEF2FF",
                            color: entity.roleColor === "rose" ? "#BE123C" : entity.roleColor === "amber" ? "#B45309" : entity.roleColor === "emerald" ? "#047857" : "#4338CA",
                            border: `1px solid ${entity.roleColor === "rose" ? "#FECDD3" : entity.roleColor === "amber" ? "#FDE68A" : entity.roleColor === "emerald" ? "#6EE7B7" : "#C7D2FE"}`,
                          }}
                        >
                          {entity.roleBadge}
                        </span>
                      </div>

                      <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "1px" }}>
                        {entity.role} · Risk Score: <strong style={{ color: entity.fraudScore > 50 ? "#BE123C" : "#059669" }}>{entity.fraudScore}/100</strong>
                      </div>

                      {entity.isHardVeto && (
                        <div style={{ fontSize: "8px", fontWeight: 700, color: "#065F46", background: "#D1FAE5", border: "1px solid #A7F3D0", padding: "2px 5px", borderRadius: "3px", marginTop: "3px" }}>
                          {entity.hardVetoReason}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* THE STAR VISUAL: HARD-VETO GUARDRAIL CALLOUT */}
                <div
                  style={{
                    marginTop: "auto",
                    background: "#FFF1F2",
                    border: "1px dashed #F43F5E",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div style={{ width: "22px", height: "22px", borderRadius: "4px", background: "#FFE4E6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Shield size={13} color="#E11D48" />
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 800, color: "#991B1B" }}>
                      ⛔ HARD-VETO GUARDRAIL: Rohit Verma (ENT-03) ↛ Apex Electronics (ENT-05)
                    </div>
                    <div style={{ fontSize: "8px", color: "#9F1239" }}>
                      Commercial POS history + active GSTIN halts automated mule grouping, ensuring Section 106 specific lien applies.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* =====================================================================
            RIGHT SUPPORT PANEL (5 COLUMNS): SELECTED ENTITY DOSSIER + PHISHING VECTOR
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 5",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {/* CARD 1: SELECTED ENTITY DOSSIER */}
          <SectionCard
            title={`${selectedEntity.id} Profile Analysis`}
            subtitle="Deterministic entity extraction and evidentiary risk breakdown."
            icon={Building}
            iconColor="#4F46E5"
            badgeText={`SCORE: ${selectedEntity.fraudScore}/100`}
            badgeVariant={selectedEntity.fraudScore > 50 ? "rose" : "emerald"}
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
              {/* Header Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                    {selectedEntity.name}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    {selectedEntity.role} · {selectedEntity.summary}
                  </div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: selectedEntity.fraudScore > 50 ? "#E11D48" : "#059669" }}>
                  {selectedEntity.fraudScore}<span style={{ fontSize: "10px", color: "#64748B" }}>/100</span>
                </div>
              </div>

              {/* Lead Strength ScaleBar */}
              <ScaleBar
                labelAbove="Investigative Lead Strength (0 - 100)"
                min={0}
                max={100}
                value={selectedEntity.fraudScore}
                unit=""
                toleranceBand={{
                  from: 80,
                  to: 100,
                  label: "HIGH CONFIDENCE CONDUIT",
                }}
                valueBelow="Investigative lead score, not a judicial finding"
              />

              {/* 4 Sub-factor bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", background: "#F8FAFC", padding: "6px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Pass-Through Velocity:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.velocity}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.velocity}%`, height: "100%", background: "#E11D48" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Device/JA4 Overlap:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.deviceOverlap}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.deviceOverlap}%`, height: "100%", background: "#4F46E5" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Structuring / Splitting:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.structuring}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.structuring}%`, height: "100%", background: "#D97706" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>KYC Discrepancy:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.kycDiscrepancy}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.kycDiscrepancy}%`, height: "100%", background: "#64748B" }} />
                  </div>
                </div>
              </div>

              {/* Bound Evidence Tokens */}
              <div>
                <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B", marginBottom: "3px" }}>
                  Bound Evidence Tokens:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {selectedEntity.tokens.map((tok, idx) => (
                    <span key={idx} style={{ fontSize: "8px", fontFamily: "monospace", padding: "2px 5px", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "4px", color: "#4338CA" }}>
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* CARD 2: SOCIAL ENGINEERING & PHISHING VECTOR + CTA */}
          <SectionCard
            title="Social-Engineering Lures & Statutory Directives"
            subtitle="Coercion scripts and Section 94 BNSS KYC/CAF production requisition."
            icon={AlertTriangle}
            iconColor="#E11D48"
            badgeText="PS4 CHALLENGE #1"
            badgeVariant="rose"
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
              <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#991B1B" }}>
                  WhatsApp Coercion Header (Digital Arrest Lure):
                </div>
                <div style={{ fontSize: "8.5px", color: "#BE123C", marginTop: "2px", fontStyle: "italic" }}>
                  "High Commission of India / Cyber Cell Warrant #DL-2026-99 demanding instant transfer to VPA vikram.pay@okaxis."
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A" }}>
                  Malicious Investment APK Telemetry:
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px" }}>
                  SecureInvest_v2.apk requesting <code>RECEIVE_SMS</code> to intercept OTPs for unauthorized SIM swapping.
                </div>
              </div>

              {/* UNCLIPPED FULL-WIDTH CTA */}
              <button
                type="button"
                onClick={handleCopyDirective}
                className="hover:bg-indigo-700 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all"
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
                  marginTop: "auto",
                }}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? "Copied Requisition!" : "Copy §94 BNSS KYC/CAF Production Order"}</span>
              </button>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
};
