import React, { useState } from "react";
import {
  Dna,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { BentoKpiCard } from "../../components/tarka/BentoPrimitives";
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
}

const RAW_TOKENS: RawToken[] = [
  { id: "T-01", source: "WhatsApp Chat (T3)", sourceType: "whatsapp", label: "Demanded VPA", value: "vikram.pay@okaxis", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-02", source: "WhatsApp Chat (T3)", sourceType: "whatsapp", label: "Complainant MSISDN", value: "+91-9810044210", targetEntityId: "ENT-01", badgeColor: "#4338CA" },
  { id: "T-03", source: "Fake Investment APK (T2)", sourceType: "apk", label: "C2 Telemetry IP", value: "103.21.144.92", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-04", source: "Fake Investment APK (T2)", sourceType: "apk", label: "APK Perms", value: "READ_SMS (OTP Sniff)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-05", source: "SBI Finacle CBS (T1)", sourceType: "cbs", label: "Debit Narration", value: "UPI/DR/.../VIKRAM_MULE", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-06", source: "SBI Finacle CBS (T1)", sourceType: "cbs", label: "Victim A/c", value: "SBI A/c 30910029101", targetEntityId: "ENT-01", badgeColor: "#4338CA" },
  { id: "T-07", source: "HDFC CBS Commit (T1)", sourceType: "cbs", label: "L2A Mule A/c", value: "HDFC 5010029419920", targetEntityId: "ENT-03", badgeColor: "#B45309" },
  { id: "T-08", source: "Axis CBS Commit (T1)", sourceType: "cbs", label: "L2B Mule A/c", value: "AXIS 9140200410291", targetEntityId: "ENT-04", badgeColor: "#B45309" },
  { id: "T-09", source: "Airtel CAF & IPDR (T1)", sourceType: "cdr", label: "Swapped SIM IMSI", value: "40410...904 (09:44 IST)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-10", source: "Airtel CAF & IPDR (T1)", sourceType: "cdr", label: "Chassis TAC", value: "TAC 86749206 (M34 5G)", targetEntityId: "ENT-02", badgeColor: "#BE123C" },
  { id: "T-11", source: "ICICI Merchant Stream (T1)", sourceType: "pos", label: "Verified GSTIN", value: "07AAACA1234F1Z8", targetEntityId: "ENT-05", badgeColor: "#047857" },
  { id: "T-12", source: "ICICI Merchant Stream (T1)", sourceType: "pos", label: "Retail POS Inflows", value: "420 Txns/mo (POS-774)", targetEntityId: "ENT-05", badgeColor: "#047857" },
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
        height: "calc(100dvh - 56px)",
        maxHeight: "calc(100dvh - 56px)",
        padding: isCompact ? "8px 12px 12px 12px" : "12px 16px 16px 16px",
        gap: isCompact ? "8px" : "10px",
        boxSizing: "border-box",
        background: "var(--bento-canvas, #F4F6FB)",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          ROW 1: TOP 4 EXECUTIVE KPI METRIC CARDS
          ========================================================================= */}
      <div className="bento-grid-4" style={{ flexShrink: 0 }}>
        <BentoKpiCard
          title="Raw Identifiers Extracted"
          metric="24 Mentions"
          metricColor="#4F46E5"
          statusBadge={{ text: "4 SOURCES", variant: "indigo" }}
          meta="WhatsApp, APK, CBS, CDR"
          subtitle="Multi-modal noisy evidence tokens"
          icon={Dna}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          sparklineData={[12, 16, 20, 22, 24, 24]}
        />

        <BentoKpiCard
          title="Resolved Canonical Entities"
          metric="5 Profiles"
          metricColor="#059669"
          statusBadge={{ text: "18 → 5 ENTITIES", variant: "emerald" }}
          meta="Deterministic Join"
          subtitle="Jaro-Winkler + Strict Key Matching"
          icon={Users}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[18, 14, 10, 7, 5, 5]}
        />

        <BentoKpiCard
          title="Hard-Veto Collisions Blocked"
          metric="1 Shielded"
          metricColor="#059669"
          statusBadge={{ text: "GST PROTECTED", variant: "emerald" }}
          meta="Apex Electronics"
          subtitle="Active GSTIN prevents false mule merge"
          icon={ShieldCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          sparklineData={[0, 0, 1, 1, 1, 1]}
        />

        <BentoKpiCard
          title="Social Eng. & Phishing Vectors"
          metric="2 Active Lures"
          metricColor="#BE123C"
          statusBadge={{ text: "HIGH THREAT", variant: "rose" }}
          meta="APK & Coercion"
          subtitle="Fake CBI Notice + Telegram C2 APK"
          icon={AlertTriangle}
          iconColor="#BE123C"
          iconBg="#FFF1F2"
          sparklineData={[1, 1, 2, 2, 2, 2]}
        />
      </div>

      {/* =========================================================================
          ROW 2: 2-PANEL EXECUTIVE STAGE (LEFT 7 COLS HERO + RIGHT 5 COLS INSPECTOR)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "12px",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            LEFT HERO CANVAS (7 COLUMNS): MULTI-SOURCE ENTITY RESOLUTION GRAPH
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 7",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "14px 18px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
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
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Dna size={15} color="#4F46E5" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                  Multi-Source Entity Extraction & Alias Resolution Matrix
                </div>
                <div style={{ fontSize: "10px", color: "#64748B", marginTop: "1px" }}>
                  Converts 24 unstructured & financial evidence tokens into 5 canonical investigative profiles.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {["ALL", "whatsapp", "apk", "cbs", "cdr", "pos"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTokenType(type)}
                  style={{
                    padding: "2.5px 7px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    border: selectedTokenType === type ? "1px solid #4F46E5" : "1px solid #CBD5E1",
                    background: selectedTokenType === type ? "#EEF2FF" : "#F8FAFC",
                    color: selectedTokenType === type ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Bipartite Graph / Mapping Stage */}
          <div
            style={{
              flex: "1 1 0%",
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "1.2fr 44px 1.4fr",
              gap: "6px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "10px",
              overflow: "hidden",
            }}
          >
            {/* Left: Raw Evidence Tokens */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", paddingRight: "4px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
                Raw Extracted Tokens ({filteredTokens.length})
              </div>
              {filteredTokens.map((token) => {
                const isLinkedToSelected = token.targetEntityId === selectedEntityId;
                return (
                  <div
                    key={token.id}
                    onClick={() => setSelectedEntityId(token.targetEntityId)}
                    style={{
                      background: isLinkedToSelected ? "#FFFFFF" : "#FFFFFF",
                      border: isLinkedToSelected ? `1.5px solid ${token.badgeColor}` : "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "5px 7px",
                      cursor: "pointer",
                      boxShadow: isLinkedToSelected ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "8px", fontWeight: 800, color: token.badgeColor, background: `${token.badgeColor}12`, padding: "1px 4px", borderRadius: "3px" }}>
                        {token.source}
                      </span>
                      <span style={{ fontSize: "7.5px", fontFamily: "var(--font-mono)", color: "#64748B" }}>
                        {token.id}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                      {token.label}
                    </div>
                    <div style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", color: token.badgeColor, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {token.value}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle: Convergence Flow Arrows */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <div style={{ width: "2px", height: "40px", background: "linear-gradient(to bottom, #94A3B8, #4F46E5)" }} />
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#EEF2FF", border: "1px solid #C7D2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={11} color="#4F46E5" />
              </div>
              <div style={{ fontSize: "8px", fontWeight: 800, color: "#4F46E5", writingMode: "vertical-rl", letterSpacing: "0.08em" }}>
                RESOLVE
              </div>
              <div style={{ width: "2px", height: "40px", background: "linear-gradient(to bottom, #4F46E5, #059669)" }} />
            </div>

            {/* Right: 5 Canonical Entities */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", paddingRight: "4px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
                Canonical Entities (5)
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
                      borderRadius: "7px",
                      padding: "6px 9px",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 2px 4px rgba(15,23,42,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 800, color: isSelected ? "#0F172A" : "#1E293B" }}>
                        {entity.id} · {entity.name}
                      </span>
                      <span
                        style={{
                          fontSize: "8px",
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

                    <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px" }}>
                      {entity.role} · Risk Score: <strong style={{ color: entity.fraudScore > 50 ? "#BE123C" : "#059669" }}>{entity.fraudScore}/100</strong>
                    </div>

                    {entity.isHardVeto && (
                      <div style={{ fontSize: "8px", fontWeight: 700, color: "#065F46", background: "#D1FAE5", border: "1px solid #A7F3D0", padding: "1.5px 5px", borderRadius: "3px", marginTop: "3px" }}>
                        {entity.hardVetoReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hard Veto Guardrail Alert */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="#059669" />
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#166534" }}>
                HARD-VETO GUARDRAIL ACTIVE: Autonomous merge prevented between ENT-03 (Rohit) and ENT-05 (Apex Electronics).
              </span>
            </div>
            <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", color: "#15803D", fontWeight: 700 }}>
              § 106(1) Specific Lien Applied
            </span>
          </div>
        </div>

        {/* =====================================================================
            RIGHT INSPECTOR DOCK (5 COLUMNS): SOCIAL ENG. EXTRACTOR & EVIDENCE GAPS
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 5",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: isCompact ? "10px 14px" : "14px 16px",
            boxShadow: "0 2px 8px -2px rgba(15, 23, 42, 0.04)",
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
          {/* Card 1: Selected Entity Detailed Dossier */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                {selectedEntity.id} Profile Analysis
              </span>
              <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 800, color: selectedEntity.fraudScore > 50 ? "#BE123C" : "#047857" }}>
                Score: {selectedEntity.fraudScore}/100
              </span>
            </div>
            <div style={{ fontSize: "10.5px", color: "#334155", lineHeight: 1.4 }}>
              {selectedEntity.summary}
            </div>

            <div style={{ marginTop: "8px", borderTop: "1px solid #E2E8F0", paddingTop: "6px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "3px" }}>
                Bound Evidence Tokens:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {selectedEntity.tokens.map((tok, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "9px",
                      fontFamily: "var(--font-mono)",
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: "4px",
                      padding: "1px 6px",
                      color: "#0F172A",
                    }}
                  >
                    {tok}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Extracted Social Engineering & Phishing Artifacts */}
          <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <AlertTriangle size={13} color="#BE123C" />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#BE123C" }}>
                  Phishing APK & WhatsApp Coercion Script
                </span>
              </div>
              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#BE123C", background: "#FFE4E6", padding: "1px 5px", borderRadius: "3px" }}>
                PS4 CHALLENGE #1
              </span>
            </div>

            <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.35 }}>
              • <strong>WhatsApp Coercion Header:</strong> <i>"High Commission of India / Cyber Cell Warrant #DL-2026-99"</i> demanding instant transfer to VPA <code>vikram.pay@okaxis</code>.<br />
              • <strong>Malicious APK:</strong> <code>SecureInvest_v2.apk</code> requesting <code>android.permission.RECEIVE_SMS</code> to intercept OTPs for midnight SIM swapping.
            </div>
          </div>

          {/* Card 3: Actionable Statutory Directive Requisition */}
          <div style={{ background: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#0F766E" }}>
                Evidence-Gap & KYC Production Mandate
              </span>
              <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#0D9488", background: "#CCFBF1", padding: "1px 5px", borderRadius: "3px" }}>
                § 94 BNSS
              </span>
            </div>

            <div style={{ fontSize: "9.5px", color: "#115E59", lineHeight: 1.35 }}>
              Cross-bank identity gap detected between Layer-2 mules (Rohit & Sameer). Both share JA4 TLS and Wi-Fi hotspot but have unverified Aadhaar tokens.
            </div>

            <button
              type="button"
              onClick={handleCopyDirective}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "none",
                background: isCopied ? "#059669" : "#0D9488",
                color: "#FFFFFF",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(13, 148, 136, 0.25)",
              }}
            >
              {isCopied ? <Check size={12} /> : <FileText size={12} />}
              <span>{isCopied ? "Order Copied" : "📋 Copy §94 BNSS KYC/CAF Production Order"}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
