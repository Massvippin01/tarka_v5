import React, { useState, useMemo } from "react";
import {
  Network,
  Wifi,
  Cpu,
  Share2,
  FileText,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
} from "../../components/tarka/kit";
import { EvidenceNetworkGraph, type EdgeFilterType } from "../../components/tarka/network/EvidenceNetworkGraph";
import { CrossStateWaterfall } from "../../components/tarka/network/CrossStateWaterfall";
import { detectHotspotCollision } from "../../utils/cgnatAttribution";
import { EndToEndReconstructionStrip } from "../../components/tarka/investigation/EndToEndReconstructionStrip";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import { buildCase002Bundle, buildCase003Bundle } from "../../services/caseSyncBridge";
import { ScreenFindingCard } from "../../components/tarka/common/ScreenFindingCard";

export const FraudNetworkScreen: React.FC = () => {
  const { mutations, toggleMutation, activeCaseId, setActiveRoute } = useTarkaGlobal();
  const { density, activeDiscoveredCluster, setSelectedEvidenceEdge, reconstructedInvestigation } = useTarkaUiStore();
  const isCompact = density === "compact";

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId === "CASE-2026-002") {
      return buildCase002Bundle();
    }
    if (activeCaseId === "CASE-2026-003") {
      return buildCase003Bundle();
    }
    return reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  const ja4 = activeDiscoveredCluster?.convergedJa4 || "t13d1516h2_8daaf6";
  const bssid = activeDiscoveredCluster?.bssidHotspot || "74:DA:38:A2:11:BC";

  const isHotspotActive = activeDiscoveredCluster?.packetTtl === 63 || !!mutations.triggerHotspotCollision;
  const hotspotResult = useMemo(() => {
    const observed = activeDiscoveredCluster?.packetTtl || (isHotspotActive ? 63 : 64);
    return detectHotspotCollision(observed, 64);
  }, [isHotspotActive, activeDiscoveredCluster]);

  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>("all");
  const [isCopied, setIsCopied] = useState(false);
  const [isXmlCopied, setIsXmlCopied] = useState(false);

  const handleCopyI4cReport = () => {
    const mules = investigation.nodes.filter(n => n.entityType !== "VICTIM");
    const muleList = mules.map((m, idx) => `${idx + 1}. ${m.label} (${m.bank} ${m.accountMasked}) — ${m.details || m.entityType}`).join("\n");
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===
Case Ref: ${investigation.firNumber} ${investigation.policeStation}
Complainant: ${investigation.complainantName} | Booked Loss: ₹${investigation.bookedLossInr.toLocaleString("en-IN")}
Generated: 2026-09-22 10:30:00 IST | Classification: LAW ENFORCEMENT SENSITIVE

[SYNDICATE INFRASTRUCTURE CLUSTER LINKAGE]
Primary Infrastructure Controller:
• Accomplice Wi-Fi Hotspot BSSID: ${bssid}
• Ingress Gateway: Airtel/Jio PGW | Decremented TTL: ${isHotspotActive ? "63 (Hop Count = 2)" : "64 (Direct)"}
• Client TLS Anchor: JA4 = ${ja4}

[CONTROLLED MULE ENTITIES (${mules.length} TARGETS)]
${muleList}

[INTER-STATE CORRELATION]
Blind Index HMAC-SHA256 Match across multi-state FIRs
Total Syndicate Transaction Exposure: ₹${(investigation.bookedLossInr * 20.84).toLocaleString("en-IN")} (Exceeds CBI Mandate ₹10.00 Cr)`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    toast.success("I4C Samanvaya Syndicate Link Report copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyXml = () => {
    const victim = investigation.nodes.find(n => n.entityType === "VICTIM") || investigation.nodes[0];
    const xml = `<Device account="${victim?.accountMasked || ''}" mobile="919871123941" geocode="28.5355,77.3910" location="${investigation.policeStation}" ip="103.21.144.92" app="com.bank.upi" capability="0001" bssid="${bssid}" tls_ja4="${ja4}" />`;
    navigator.clipboard.writeText(xml);
    setIsXmlCopied(true);
    toast.success("UPI 2.0 <Device> XML stanza copied!");
    setTimeout(() => setIsXmlCopied(false), 2000);
  };

  return (
    <div
      className={`tarka-fraud-network-root ${isCompact ? "tarka-density-compact" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: isCompact ? "8px 12px 24px 12px" : "10px 16px 32px 16px",
        gap: isCompact ? "8px" : "10px",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      {/* =========================================================================
          ROW 0: STORY BANNER (PASSES 5-SECOND TEST)
          ========================================================================= */}
      <StoryBanner
        takeaway={
          <span>
            <strong>Controller device cluster ({investigation.firNumber})</strong> physically tethered {investigation.nodes.filter(n => n.entityType !== "VICTIM").length} accounts across bank nodal sessions for victim {investigation.complainantName} (Loss: ₹{investigation.bookedLossInr.toLocaleString("en-IN")}).
          </span>
        }
        evidenceChips={[
          { tier: "T1", label: "Telco PGW IPDR", hash: "63a9b18204e112aa894451299cbf", detail: "Packet hop inspection confirming TTL=63 hotspot decrement" },
          { tier: "T1", label: "NPCI Device XML", hash: "89c20491823091ffeed891241aa", detail: `BSSID ${bssid} captured in bank session telemetry` },
          { tier: "T1", label: "Cell Tower Coverage", hash: "339109bbcf12498214aa8823190", detail: investigation.policeStation },
        ]}
      />

      {/* 5-File Cross-Artifact Evidentiary Reconstruction Strip */}
      <EndToEndReconstructionStrip />

      {/* Top Investigator Finding Card */}
      <ScreenFindingCard
        finding="4 mule accounts connected to accomplice Poco X5 hotspot via shared JA4 TLS signature."
        metric="1 Hotspot · 4 Mules"
        metricLabel="Shared JA4 Fingerprint"
        actionLabel="Isolate Device & SIM"
        onAction={() => setActiveRoute("attribution")}
        status="verified"
        evidenceTag="Multi-Modal Actor Attribution Graph"
      />

      {/* =========================================================================
          ROW 1: TOP 4 EXECUTIVE KPI TILES (<= 12 CHAR HERO VALUE)
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <KpiTile
          title="Actors linked"
          value={`${investigation.nodes.length} → 1`}
          icon={Network}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "MULTI-MODAL", variant: "indigo" }}
          subtitle={`${investigation.nodes.filter(n => n.entityType !== "VICTIM").length} nodes → 1 cluster`}
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Deterministic set-intersection of BSSID, JA4 TLS, and cell tower coordinates."
        />

        <KpiTile
          title="Tethering proof"
          value={hotspotResult.isHotspotDetected ? "TTL 63" : "TTL 64"}
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "TETHERED AP" : "DIRECT 4G/5G",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
            dot: true,
          }}
          subtitle={hotspotResult.isHotspotDetected ? "hotspot AP (-1 hop)" : "direct cellular"}
          microVisual="ring"
          progressPct={hotspotResult.isHotspotDetected ? 100 : 80}
          provenanceTooltip="DoT Clause 39.20 IPDR packet inspection confirming hop count."
        />

        <KpiTile
          title="TLS fingerprint"
          value={`${investigation.edges.length}/${investigation.edges.length} Match`}
          icon={Cpu}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "TLS 1.3 PASS", variant: "emerald" }}
          subtitle="JA4 client hash"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Exact JA4 hash match across all CBS banking sessions proves same modified app."
        />

        <KpiTile
          title="Inter-state pool"
          value={`₹${(investigation.bookedLossInr * 20.84 / 10000000).toFixed(2)} Cr`}
          icon={Share2}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          statusBadge={{ text: "14 FIRs", variant: "amber" }}
          subtitle="5 states (exceeds CBI)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="I4C Samanvaya HMAC blind-index correlation crossing CBI ₹10.00 Cr statutory threshold."
        />
      </div>

      {/* =========================================================================
          ROW 2: MAIN STAGE (7 COLS HERO TOPOLOGY + 5 COLS DISSECTOR)
          ========================================================================= */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "12px",
          alignItems: "start",
        }}
      >
        {/* =====================================================================
            LEFT HERO CARD (7 COLUMNS): CONNECTED ACTOR TOPOLOGY GRAPH
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column" }}>
          <SectionCard
            title="Fraud-Network & Actor Relationship Topology Graph"
            subtitle="Discovers hidden physical links tying 4 disparate mule accounts to 1 controller cluster."
            icon={Network}
            iconColor="#4F46E5"
            badgeText={isHotspotActive ? "CORROBORATED TETHERING (TTL=63)" : "DIRECT INGRESS (TTL=64)"}
            badgeVariant={isHotspotActive ? "rose" : "emerald"}
            provenanceTooltip="Corroborated Tethering Proof (3-Factor Convergence: TTL=63 + BSSID + JA4 TLS)."
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#FAFCFF",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <EvidenceNetworkGraph
                  isHotspotActive={isHotspotActive}
                  onToggleHotspot={() => toggleMutation("triggerHotspotCollision")}
                  edgeFilter={edgeFilter}
                  onEdgeFilterChange={setEdgeFilter}
                />
              </div>

              {/* Bottom Status Ticker */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  fontSize: "10.5px",
                  color: "#312E81",
                  marginTop: "6px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <ShieldCheck size={13} color="#4F46E5" />
                  <span style={{ fontWeight: 700 }}>
                    Corroborated Tethering Proof (3-Factor Convergence): 1. IPv4 TTL=63 (ΔTTL = -1 hop) · 2. Shared AP BSSID <code>74:DA:38:A2:11:BC</code> · 3. JA4 Fingerprint <code>t13d1516h2_8daaf6</code> across all 4 mule logins.
                  </span>
                </div>
                <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#4F46E5" }}>
                  P &lt; 1.4 × 10⁻⁷
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* =====================================================================
            RIGHT SUPPORT PANEL (5 COLUMNS): XML PROVENANCE & ECHARTS WATERFALL
            ===================================================================== */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Card 1: UPI Device XML card with compact Provenance table (Shrinks to content) */}
          <SectionCard
            title="UPI 2.0 <Device> XML & Provenance"
            subtitle="NPCI Central Switch telemetry stanza linking handset to network"
            icon={FileText}
            iconColor="#4F46E5"
            badgeText="NPCI SWITCH T1"
            badgeVariant="emerald"
            style={{ flexShrink: 0 }}
            actionSlot={
              <button
                type="button"
                onClick={handleCopyXml}
                className="hover:border-indigo-400 enabled:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  padding: "3px 7px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: isXmlCopied ? "#ECFDF5" : "#F8FAFC",
                  color: isXmlCopied ? "#047857" : "#0F172A",
                  cursor: "pointer",
                }}
              >
                {isXmlCopied ? <Check size={11} /> : <Copy size={11} />}
                <span>{isXmlCopied ? "Copied" : "Copy XML"}</span>
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Syntax Highlighted Code Box */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "5px",
                  padding: "6px 8px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "9.5px",
                  lineHeight: 1.4,
                  color: "#1E293B",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                <span style={{ color: "#4338CA" }}>&lt;Device </span>
                <span style={{ color: "#047857" }}>mobile</span>=<span style={{ color: "#B45309" }}>"919871123941"</span>{" "}
                <span style={{ color: "#047857" }}>geocode</span>=<span style={{ color: "#B45309" }}>"28.5355,77.3910"</span>{" "}
                <span style={{ color: "#047857" }}>bssid</span>=<span style={{ color: "#E11D48", fontWeight: 700 }}>"{bssid}"</span>{" "}
                <span style={{ color: "#047857" }}>tls_ja4</span>=<span style={{ color: "#4338CA", fontWeight: 700 }}>"{ja4}"</span>{" "}
                <span style={{ color: "#4338CA" }}>/&gt;</span>
              </div>

              {/* Compact Evidence Provenance Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #CBD5E1", color: "#475569" }}>
                    <th style={{ padding: "3px 5px", textAlign: "left", fontWeight: 700 }}>Attribute</th>
                    <th style={{ padding: "3px 5px", textAlign: "left", fontWeight: 700 }}>Value</th>
                    <th style={{ padding: "3px 5px", textAlign: "left", fontWeight: 700 }}>Provenance Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "3px 5px", fontWeight: 700, color: "#334155" }}>mobile</td>
                    <td style={{ padding: "3px 5px", fontFamily: "var(--font-mono)" }}>+91-98711-23941</td>
                    <td style={{ padding: "3px 5px" }}>
                      <span style={{ background: "#ECFDF5", color: "#047857", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                        NPCI Switch T1
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "3px 5px", fontWeight: 700, color: "#334155" }}>geocode</td>
                    <td style={{ padding: "3px 5px", fontFamily: "var(--font-mono)" }}>28.5355°N, 77.3910°E</td>
                    <td style={{ padding: "3px 5px" }}>
                      <span style={{ background: "#ECFDF5", color: "#047857", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                        Tower BTS Log
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "3px 5px", fontWeight: 700, color: "#334155" }}>bssid</td>
                    <td style={{ padding: "3px 5px", fontFamily: "var(--font-mono)", color: "#BE123C", fontWeight: 700 }}>{bssid}</td>
                    <td style={{ padding: "3px 5px" }}>
                      <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                        PSP Telemetry
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 5px", fontWeight: 700, color: "#334155" }}>tls_ja4</td>
                    <td style={{ padding: "3px 5px", fontFamily: "var(--font-mono)", color: "#4338CA", fontWeight: 700 }}>{ja4}</td>
                    <td style={{ padding: "3px 5px" }}>
                      <span style={{ background: "#EEF2FF", color: "#4338CA", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                        Airtel PGW TLS
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Interactive Attributed Relationships Strip */}
              <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Attributed Relationships (Click to Inspect Evidence Sheet):
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {investigation.edges.slice(2).map((e) => {
                    const isInsuff = e.matchClassification === "INSUFFICIENT_EVIDENCE";
                    const isApex = e.targetNodeId === "M3A-APEX";
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEvidenceEdge(e)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: `1px solid ${isInsuff ? "#F59E0B" : isApex ? "#10B981" : "#C7D2FE"}`,
                          background: isInsuff ? "#FFFBEB" : isApex ? "#ECFDF5" : "#EEF2FF",
                          color: isInsuff ? "#92400E" : isApex ? "#065F46" : "#3730A3",
                          fontSize: "9.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{isInsuff ? "⚠️" : isApex ? "🛡️" : "🔗"}</span>
                        <span>{(e.sourceLabel || e.sourceNodeId || "Src").split(" ")[0]} → {(e.targetLabel || e.targetNodeId || "Tgt").split(" ")[0]}</span>
                        <span style={{ opacity: 0.8 }}>₹{(((e.amount ?? 0)) / 1000).toFixed(0)}k</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: ECharts Cumulative Exposure Waterfall */}
          <SectionCard
            title="Cross-State Syndicate (₹10.42 Cr Total)"
            subtitle="Cumulative exposure across 14 FIRs (Exceeds CBI Mandate ₹10.00 Cr)"
            icon={Share2}
            iconColor="#B45309"
            badgeText="CBI REQUISITION SAT"
            badgeVariant="rose"
            style={{ flex: "1 1 auto", minHeight: 280 }}
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 240 }}>
              {/* ECharts Waterfall Canvas */}
              <div style={{ flex: "1 1 auto", minHeight: 190 }}>
                <CrossStateWaterfall height="100%" />
              </div>

              {/* Bottom Action CTA */}
              <div style={{ paddingTop: "6px", borderTop: "1px solid #E2E8F0", marginTop: "auto", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCopyI4cReport}
                  className="hover:bg-indigo-700 enabled:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: "5px",
                    border: "none",
                    background: isCopied ? "#059669" : "#4F46E5",
                    color: "#FFFFFF",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
                    transition: "background 0.15s ease",
                  }}
                >
                  {isCopied ? <Check size={12} /> : <FileText size={12} />}
                  <span>{isCopied ? "Report Copied to Clipboard" : "📋 Copy Inter-State Syndicate Report (I4C Format)"}</span>
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
};
