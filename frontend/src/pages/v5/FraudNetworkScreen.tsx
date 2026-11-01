import { EvidenceNetworkGraph, type EdgeFilterType, type GraphLayoutMode } from "../../components/tarka/network/EvidenceNetworkGraph";
import React, { useState, useMemo } from "react";
import {
  Network,
  Wifi,
  Cpu,
  Share2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
} from "../../components/tarka/kit";
import { detectHotspotCollision } from "../../utils/cgnatAttribution";


export const FraudNetworkScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { density } = useTarkaUiStore();
  const isCompact = density === "compact";

  const isHotspotActive = !!mutations.triggerHotspotCollision;
  const hotspotResult = useMemo(() => {
    const observed = isHotspotActive ? 63 : 64;
    return detectHotspotCollision(observed, 64);
  }, [isHotspotActive]);

  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>("all");
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("layered");
  const [isCopied, setIsCopied] = useState(false);
  const [isXmlCopied, setIsXmlCopied] = useState(false);

  const handleCopyI4cReport = () => {
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===
Case Ref: FIR #149/2026 Cyber Crime PS Noida
Generated: 2026-09-22 10:30:00 IST | Classification: LAW ENFORCEMENT SENSITIVE

[SYNDICATE INFRASTRUCTURE CLUSTER LINKAGE]
Primary Infrastructure Controller:
• Accomplice Wi-Fi Hotspot BSSID: 74:DA:38:A2:11:BC (Poco X5 Pro AP)
• Ingress Gateway: Airtel PGW (103.21.144.92) | Decremented TTL: ${isHotspotActive ? "63 (Hop Count = 2)" : "64 (Direct)"}
• Client TLS Anchor: JA4 = t13d1516h2_8daaf6 (Identical across 4 Bank Sessions)

[CONTROLLED MULE ENTITIES (4 TARGETS)]
1. Vikram Shah (SBI A/c 41088291083) — L1 Primary Inflow Receiver (₹5,00,000)
2. Rohit Verma (HDFC A/c 5010029419920) — L2A Split Conduit (₹3,00,000)
3. Sameer Khan (AXIS A/c 9140200410291) — L2B Cashout Conduit (₹2,00,000)
4. Paytm Merchant Pool Sink (Sink #1109) — Terminal Escrow

[INTER-STATE CORRELATION]
Blind Index HMAC-SHA256 Match across 14 FIRs (UP, MH, KA, GJ, DL)
Total Syndicate Transaction Exposure: ₹10,42,18,900.00 (Exceeds CBI Mandate ₹10.00 Cr)`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    toast.success("I4C Samanvaya Syndicate Link Report copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyXml = () => {
    const xml = `<Device mobile="919871123941" geocode="28.5355,77.3910" location="Noida Sector 18" ip="103.21.144.92" app="com.sbi.upi" capability="0001" bssid="74:DA:38:A2:11:BC" tls_ja4="t13d1516h2_8daaf6" />`;
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
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: isCompact ? "6px 12px 10px 12px" : "8px 14px 12px 14px",
        gap: isCompact ? "6px" : "8px",
        boxSizing: "border-box",
        background: "#F8FAFC",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          ROW 0: STORY BANNER (PASSES 5-SECOND TEST)
          ========================================================================= */}
      <StoryBanner
        takeaway={
          <span>
            <strong>Kingpin Handset (Samsung M34 · IMEI 86749206...)</strong> physically tethered 4 mule bank accounts across Delhi/Noida cell sectors via shared portable Wi-Fi AP & identical JA4 TLS client fingerprint.
          </span>
        }
        evidenceChips={[
          { tier: "T1", label: "Airtel PGW IPDR", hash: "63a9b18204e112aa894451299cbf", detail: "Packet hop inspection confirming TTL=63 hotspot decrement" },
          { tier: "T1", label: "NPCI Device XML", hash: "89c20491823091ffeed891241aa", detail: "BSSID 74:DA:38:A2:11:BC captured in bank session telemetry" },
          { tier: "T1", label: "Tower DL-TWR-891", hash: "339109bbcf12498214aa8823190", detail: "Sector 4 Rohini cell tower coverage radius" },
        ]}
      />

      {/* =========================================================================
          ROW 1: TOP 4 EXECUTIVE KPI TILES (FULL UNTRUNCATED LABELS)
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
          value="4 Mules → 1 Cluster"
          icon={Network}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "MULTI-MODAL GRAPH", variant: "indigo" }}
          subtitle="Common Hotspot & TLS Controller"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Deterministic set-intersection of BSSID, JA4 TLS, and cell tower coordinates."
        />

        <KpiTile
          title="Tethering proof"
          value={hotspotResult.isHotspotDetected ? "TTL = 63 (Hotspot AP)" : "TTL = 64 (Direct Cellular)"}
          icon={Wifi}
          iconColor={hotspotResult.isHotspotDetected ? "#E11D48" : "#059669"}
          iconBg={hotspotResult.isHotspotDetected ? "#FFF1F2" : "#ECFDF5"}
          statusBadge={{
            text: hotspotResult.isHotspotDetected ? "TETHERED AP" : "DIRECT 4G/5G",
            variant: hotspotResult.isHotspotDetected ? "rose" : "emerald",
            dot: true,
          }}
          subtitle={hotspotResult.isHotspotDetected ? "Hop Count: 2 (-1 PGW Decrement)" : "Single Hop Direct Cellular"}
          microVisual="ring"
          progressPct={hotspotResult.isHotspotDetected ? 100 : 80}
          provenanceTooltip="DoT Clause 39.20 IPDR packet inspection at Airtel PGW Gateway 103.21.144.92."
        />

        <KpiTile
          title="TLS fingerprint match"
          value="JA4 Match 4/4"
          icon={Cpu}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "TLS 1.3 PASS", variant: "emerald" }}
          subtitle="t13d1516h2_8daaf6 Client Binary"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Exact JA4 hash match across all 4 CBS banking sessions proves same modified app."
        />

        <KpiTile
          title="Inter-state linkage"
          value="14 FIRs · 5 States"
          icon={Share2}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          statusBadge={{ text: "₹10.42 CR POOL", variant: "amber" }}
          subtitle="UP, MH, KA, GJ, DL (Exceeds CBI Mandate)"
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
          flex: "1 1 0%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "10px",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            LEFT HERO CARD (7 COLUMNS): CONNECTED ACTOR TOPOLOGY GRAPH
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
          <SectionCard
            title="Fraud-Network & Actor Relationship Topology Graph"
            subtitle="Discovers hidden physical links tying 4 disparate mule accounts to 1 kingpin infrastructure cluster."
            icon={Network}
            iconColor="#4F46E5"
            badgeText={isHotspotActive ? "HOTSPOT COLLISION (TTL=63)" : "DIRECT INGRESS (TTL=64)"}
            badgeVariant={isHotspotActive ? "rose" : "emerald"}
            provenanceTooltip="Multi-modal graph correlating Airtel CGNAT IPDR, NPCI Switch XML, and Mewat CAF files."
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div
                style={{
                  flex: "1 1 0%",
                  minHeight: 0,
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#FAFCFF",
                  position: "relative",
                }}
              >
                <EvidenceNetworkGraph
                  isHotspotActive={isHotspotActive}
                  onToggleHotspot={() => toggleMutation("triggerHotspotCollision")}
                  edgeFilter={edgeFilter}
                  onEdgeFilterChange={setEdgeFilter}
                  layoutMode={layoutMode}
                  onLayoutModeChange={setLayoutMode}
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
                  <Check size={13} color="#4F46E5" />
                  <span style={{ fontWeight: 700 }}>
                    Syndicate Discovery SAT: All 4 account sessions share JA4 client hash <code>t13d1516h2_8daaf6</code> and co-locate at BSSID <code>74:DA:38:A2:11:BC</code>.
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
            RIGHT SUPPORT PANEL (5 COLUMNS): LIGHT-MODE XML & I4C SAMANVAYA BAR
            ===================================================================== */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "10px", height: "100%", minHeight: 0 }}>
          {/* Card 1: Light-Mode <Device> XML & Telemetry Provenance */}
          <SectionCard
            title="UPI 2.0 <Device> XML & Provenance"
            subtitle="NPCI Central Switch telemetry stanza linking handset to network"
            icon={FileText}
            iconColor="#4F46E5"
            badgeText="NPCI SWITCH T1"
            badgeVariant="emerald"
            actionSlot={
              <button
                type="button"
                onClick={handleCopyXml}
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
            {/* Light-Mode Syntax Highlighted Code Box */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "8px 10px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "10px",
                lineHeight: 1.5,
                color: "#1E293B",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <span style={{ color: "#4338CA" }}>&lt;Device </span>
              <span style={{ color: "#047857" }}>mobile</span>=<span style={{ color: "#B45309" }}>"919871123941"</span>{" "}
              <span style={{ color: "#047857" }}>geocode</span>=<span style={{ color: "#B45309" }}>"28.5355,77.3910"</span>{" "}
              <span style={{ color: "#047857" }}>bssid</span>=<span style={{ color: "#E11D48", fontWeight: 700 }}>"74:DA:38:A2:11:BC"</span>{" "}
              <span style={{ color: "#047857" }}>tls_ja4</span>=<span style={{ color: "#4338CA", fontWeight: 700 }}>"t13d1516h2_8daaf6"</span>{" "}
              <span style={{ color: "#4338CA" }}>/&gt;</span>
            </div>

            {/* Explicit Provenance Chips Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>REGISTERED MSISDN</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>NPCI T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "1px", fontFamily: "var(--font-mono)" }}>+91-98711-23941</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>TOWER GEOCODE</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TOWER T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#0F172A", marginTop: "1px", fontFamily: "var(--font-mono)" }}>28.5355° N, 77.3910° E</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>TETHERED BSSID</span>
                  <span style={{ fontSize: "7.5px", background: "#EEF2FF", color: "#4338CA", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TLS T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#BE123C", marginTop: "1px", fontFamily: "var(--font-mono)" }}>74:DA:38:A2:11:BC</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "5px 7px", borderRadius: "5px", fontSize: "9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748B", fontWeight: 700 }}>JA4 CLIENT HASH</span>
                  <span style={{ fontSize: "7.5px", background: "#ECFDF5", color: "#047857", padding: "0.5px 3.5px", borderRadius: "3px", fontWeight: 800 }}>TLS T1</span>
                </div>
                <div style={{ fontWeight: 800, color: "#4F46E5", marginTop: "1px", fontFamily: "var(--font-mono)" }}>t13d1516h2...</div>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: Cross-State Exposure & I4C Samanvaya Bar */}
          <SectionCard
            title="Cross-State Syndicate & I4C Samanvaya"
            subtitle="Blind-index correlation across 14 FIRs in 5 states (Exceeds CBI Mandate)"
            icon={Share2}
            iconColor="#B45309"
            badgeText="₹10.42 CR SYNDICATE"
            badgeVariant="amber"
          >
            {/* Stacked Horizontal State Exposure ScaleBar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <ScaleBar
                min={0}
                max={12}
                value={10.42}
                unit=" Cr"
                labelAbove="Inter-State Exposure vs CBI Mandate (₹10.00 Cr)"
                valueBelow="Syndicate Total: ₹10.42 Cr (CBI Requisition SAT)"
                thresholdLine={{ value: 10.0, label: "₹10.00 Cr CBI Mandate", color: "#DC2626" }}
                zones={[
                  { from: 0, to: 3.85, color: "#3B82F6", label: "UP: ₹3.85Cr (5 FIRs)" },
                  { from: 3.85, to: 6.45, color: "#6366F1", label: "MH: ₹2.60Cr (3 FIRs)" },
                  { from: 6.45, to: 8.40, color: "#8B5CF6", label: "KA: ₹1.95Cr (3 FIRs)" },
                  { from: 8.40, to: 9.62, color: "#F59E0B", label: "GJ: ₹1.22Cr (2 FIRs)" },
                  { from: 9.62, to: 10.42, color: "#10B981", label: "DL: ₹0.80Cr (1 FIR)" },
                ]}
                height={16}
              />

              {/* State Chips Breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", marginTop: "4px" }}>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#3B82F6" }}>UP (5)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹3.85Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#6366F1" }}>MH (3)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹2.60Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#8B5CF6" }}>KA (3)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹1.95Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#F59E0B" }}>GJ (2)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹1.22Cr</div>
                </div>
                <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "3px", borderRadius: "4px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: "#10B981" }}>DL (1)</div>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>₹0.80Cr</div>
                </div>
              </div>
            </div>

            {/* Action Button: Copy I4C Report */}
            <div style={{ marginTop: "auto", paddingTop: "8px" }}>
              <button
                type="button"
                onClick={handleCopyI4cReport}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: isCopied ? "#059669" : "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
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
          </SectionCard>
        </div>
      </main>
    </div>
  );
};
