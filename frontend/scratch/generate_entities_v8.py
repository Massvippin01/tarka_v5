import os

code = r'''import React, { useState } from "react";
import {
  Dna,
  Users,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Building,
  Smartphone,
  Shield,
  FileText,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
} from "../../components/tarka/kit";
import { getBnss94EntityResolutionDirective } from "../../utils/statutoryDirectives";

interface RawToken {
  id: string;
  source: string;
  sourceType: "whatsapp" | "apk" | "cbs" | "cdr" | "pos";
  value: string;
  label: string;
  targetEntityId: string;
  badgeColor: string;
}

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

const RAW_TOKENS: RawToken[] = [
  { id: "T-01", source: "WhatsApp (T3)", sourceType: "whatsapp", label: "Demanded VPA", value: "vikram.pay@okaxis", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-02", source: "WhatsApp (T3)", sourceType: "whatsapp", label: "Complainant MSISDN", value: "+91-9810044210", targetEntityId: "ENT-01", badgeColor: "#4338CA" },
  { id: "T-03", source: "Phishing APK (T2)", sourceType: "apk", label: "C2 Telemetry IP", value: "103.21.144.92", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-04", source: "Phishing APK (T2)", sourceType: "apk", label: "APK Perms", value: "READ_SMS (OTP Sniff)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-05", source: "SBI CBS (T1)", sourceType: "cbs", label: "Debit Narration", value: "UPI/DR/.../VIKRAM_MULE", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-06", source: "SBI CBS (T1)", sourceType: "cbs", label: "Victim A/c", value: "SBI A/c 30910029101", targetEntityId: "ENT-01", badgeColor: "#4338CA" },
  { id: "T-07", source: "HDFC CBS (T1)", sourceType: "cbs", label: "L2A Mule A/c", value: "HDFC 5010029419920", targetEntityId: "ENT-03", badgeColor: "#B45309" },
  { id: "T-08", source: "Axis CBS (T1)", sourceType: "cbs", label: "L2B Mule A/c", value: "AXIS 9140200410291", targetEntityId: "ENT-04", badgeColor: "#B45309" },
  { id: "T-09", source: "Airtel CDR (T1)", sourceType: "cdr", label: "Swapped SIM IMSI", value: "40410...904 (09:44 IST)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-10", source: "Airtel CDR (T1)", sourceType: "cdr", label: "Chassis TAC", value: "TAC 86749206 (M34 5G)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-11", source: "ICICI POS (T1)", sourceType: "pos", label: "Verified GSTIN", value: "07AAACA1234F1Z8", targetEntityId: "ENT-05", badgeColor: "#047857" },
  { id: "T-12", source: "ICICI POS (T1)", sourceType: "pos", label: "Retail POS Inflows", value: "420 Txns/mo (POS-774)", targetEntityId: "ENT-05", badgeColor: "#047857" },
];

const CANONICAL_ENTITIES: CanonicalEntity[] = [
  {
    id: "ENT-01",
    name: "Sunil Kumar",
    role: "Complainant Victim",
    roleBadge: "VICTIM ORIGIN",
    roleColor: "indigo",
    fraudScore: 0,
    tokens: ["SBI A/c 30910029101", "MSISDN +91-9810044210", "Digital-Arrest Phishing Target"],
    summary: "Target of coordinated fake CBI digital-arrest coercion. Suffered ₹5,00,000 defrauded outflow across two tranches.",
    subScores: { velocity: 0, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 },
  },
  {
    id: "ENT-02",
    name: "Vikram Shah",
    role: "Layer-1 Primary Mule",
    roleBadge: "L1 CONDUIT MULE",
    roleColor: "rose",
    fraudScore: 98,
    tokens: ["VPA: vikram.pay@okaxis", "MSISDN: +91-9871123941", "Chassis IMEI: 867492061234564", "Finacle Dwell: 112s"],
    summary: "Primary conduit receiving full ₹5.00L inflow. Immediate pass-through conduit to Layer-2 mules within 112 seconds.",
    subScores: { velocity: 98, deviceOverlap: 100, structuring: 94, kycDiscrepancy: 95 },
  },
  {
    id: "ENT-03",
    name: "Rohit Verma",
    role: "Layer-2A Split Mule",
    roleBadge: "L2 SPLIT CONDUIT",
    roleColor: "amber",
    fraudScore: 94,
    tokens: ["HDFC 5010029419920", "VPA: rohit.traders@ybl", "JA4 TLS: t13d1516h2_8daaf6"],
    summary: "Received ₹3,00,000 (60% split tranche). Retained ₹1,20,000 and routed ₹1,80,000 to Apex Electronics.",
    subScores: { velocity: 92, deviceOverlap: 96, structuring: 90, kycDiscrepancy: 88 },
  },
  {
    id: "ENT-04",
    name: "Sameer Khan",
    role: "Layer-2B Cashout Mule",
    roleBadge: "L2 CASHOUT SINK",
    roleColor: "amber",
    fraudScore: 94,
    tokens: ["AXIS 9140200410291", "ATM Card #4491", "Hotspot BSSID: 74:DA:38:A2:11:BC"],
    summary: "Received ₹2,00,000 (40% split tranche). Executed ₹1,20,000 emergency ATM cash withdrawal at Noida Sec-18 ATM DL-049.",
    subScores: { velocity: 96, deviceOverlap: 94, structuring: 92, kycDiscrepancy: 90 },
  },
  {
    id: "ENT-05",
    name: "Apex Electronics Pvt Ltd",
    role: "Bona-Fide Merchant",
    roleBadge: "✓ HARD VETO SHIELD",
    roleColor: "emerald",
    isHardVeto: true,
    hardVetoReason: "Active GSTIN 07AAACA1234F1Z8 · 420 monthly retail POS swipes · 0 shared device/IP identifiers with syndicate.",
    fraudScore: 6,
    tokens: ["GSTIN: 07AAACA1234F1Z8", "ICICI A/c 001405008129", "Retail POS Merchant (POS-774)"],
    summary: "Innocent commercial entity. Received ₹1.80L payment for genuine goods. Protected under Section 106(1) Specific Lien.",
    subScores: { velocity: 5, deviceOverlap: 0, structuring: 8, kycDiscrepancy: 0 },
  },
];

export const EntityResolutionScreen: React.FC = () => {
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  const [selectedEntityId, setSelectedEntityId] = useState<string>("ENT-02");
  const [selectedTokenType, setSelectedTokenType] = useState<string>("ALL");
  const [isCopied, setIsCopied] = useState(false);

  const filteredTokens = RAW_TOKENS.filter((t) => {
    if (selectedTokenType === "ALL") return true;
    return t.sourceType === selectedTokenType;
  });

  const selectedEntity = CANONICAL_ENTITIES.find((e) => e.id === selectedEntityId) || CANONICAL_ENTITIES[1];

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
        takeaway="Deterministic multi-source join collapses 24 noisy tokens into 5 canonical entities; active GSTIN and POS telemetry hard-veto false syndicate merge for Apex Electronics."
        evidenceChips={[
          { tier: "T1", label: "SBI Finacle Narration", hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
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
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", paddingRight: "2px" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", paddingRight: "2px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                  Canonical Investigative Profiles (5)
                </div>

                {CANONICAL_ENTITIES.map((entity) => {
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
'''

with open('src/pages/v5/EntityResolutionScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('EntityResolutionScreen.tsx rewritten cleanly!')
