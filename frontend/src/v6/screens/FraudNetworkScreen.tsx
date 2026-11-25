import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import {
  EvidenceNetworkGraph,
  type EdgeFilterType,
} from '../../components/tarka/network/EvidenceNetworkGraph';
import { CrossStateWaterfall } from '../../components/tarka/network/CrossStateWaterfall';
import { getCanonicalCase, CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import { reconstruct5FileInvestigation } from '../../utils/investigationReconstructor';
import { formatInr } from '../../utils/formatters';
import { GangSvg } from '../network/NetworkSvg';
import type { Net } from '../network/NetworkPanels';
import type { NetworkMember, MemberRole } from '../triage/triage';

type NetworkViewMode = 'graph' | 'svg' | 'waterfall';

export const FraudNetworkScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { mutations, toggleMutation, setActiveRoute } = useTarkaGlobal();
  const { activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = useMemo(() => getCanonicalCase(caseId), [caseId]);

  const investigation = useMemo(() => {
    if (caseId && CANONICAL_CASES[caseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[caseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [caseId, reconstructedInvestigation]);

  const [viewMode, setViewMode] = useState<NetworkViewMode>('graph');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>('all');
  const [isCopiedI4c, setIsCopiedI4c] = useState(false);
  const [isCopiedXml, setIsCopiedXml] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [selectedSvgNodeId, setSelectedSvgNodeId] = useState<string | null>(null);

  const netData: Net = useMemo(() => {
    const members: NetworkMember[] = investigation.nodes.map((n) => {
      const isVictim = n.entityType === 'VICTIM';
      const isMule = n.entityType === 'LAYER_1_MULE' || n.entityType === 'LAYER_2_CONDUIT';
      const isCashout = n.entityType === 'LAYER_3_SINK';
      const role: MemberRole = isVictim ? 'VICTIM' : isMule ? 'MULE' : isCashout ? 'CASH_OUT' : 'UNKNOWN';
      const hop = n.details?.includes('Hop 1') ? 1 : n.details?.includes('Hop 2') ? 2 : 1;
      return {
        id: n.id,
        label: n.label,
        kind: 'bank',
        role,
        mule_score: isMule ? 0.92 : 0.1,
        hop,
        why: n.details || 'Conduit transaction node',
        held_inr: 165000,
        in_inr: 285000,
        out_inr: 120000,
        verdict: isMule ? 'CONFIRMED_MULE' : isVictim ? 'NOT_MULE' : null,
      };
    });

    const links: [string, string, number][] = investigation.edges.map((e) => [
      e.sourceNodeId,
      e.targetNodeId,
      e.amount,
    ]);

    return {
      network_id: 'net-mewat-cyberabad',
      member_count: members.length,
      mule_count: members.filter((m) => m.role === 'MULE').length,
      victim_count: members.filter((m) => m.role === 'VICTIM').length,
      amount_inr: 500000,
      cashed_out_inr: 120000,
      recoverable_inr: 380000,
      members,
      links,
    };
  }, [investigation]);

  const crossByMember = useMemo(() => new Map<string, string[]>([
    ['mule-1', ['FIR-UP-149/2026', 'FIR-MH-882/2026', 'FIR-DL-412/2026']],
    ['mule-2', ['FIR-UP-149/2026', 'FIR-KA-219/2026']],
  ]), []);

  const ja4 = activeDiscoveredCluster?.convergedJa4 || 't13d1516h2_8daaf6';
  const bssid = activeDiscoveredCluster?.bssidHotspot || '74:DA:38:A2:11:BC';

  const isHotspotActive = activeDiscoveredCluster?.packetTtl === 63 || !!mutations.triggerHotspotCollision;

  const handleCopyI4cReport = () => {
    const mules = investigation.nodes.filter((n) => n.entityType !== 'VICTIM');
    const muleList = mules
      .map((m, idx) => `${idx + 1}. ${m.label} (${m.bank} ${m.accountMasked}) — ${m.details || m.entityType}`)
      .join('\n');
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===\nCase Ref: ${investigation.firNumber} ${investigation.policeStation}\nComplainant: ${investigation.complainantName} | Booked Loss: ${formatInr(investigation.bookedLossInr)}\nGenerated: 2026-09-22 10:30:00 IST | Classification: LAW ENFORCEMENT SENSITIVE\n\n[SYNDICATE INFRASTRUCTURE CLUSTER LINKAGE]\nPrimary Infrastructure Controller:\n• Accomplice Wi-Fi Hotspot BSSID: ${bssid}\n• Ingress Gateway: Airtel/Jio PGW | Decremented TTL: ${isHotspotActive ? '63 (Hop Count = 2)' : '64 (Direct)'}\n• Client TLS Anchor: JA4 = ${ja4}\n\n[CONTROLLED MULE ENTITIES (${mules.length} TARGETS)]\n${muleList}\n\n[INTER-STATE CORRELATION]\nBlind Index HMAC-SHA256 Match across multi-state FIRs\nTotal Syndicate Transaction Exposure: ₹10.42 Cr (Exceeds CBI Mandate ₹10.00 Cr)`;

    navigator.clipboard.writeText(report);
    setIsCopiedI4c(true);
    toast.success('I4C Samanvaya Syndicate Link Report copied to clipboard');
    setTimeout(() => setIsCopiedI4c(false), 2000);
  };

  const handleCopyXml = () => {
    const victim = investigation.nodes.find((n) => n.entityType === 'VICTIM') || investigation.nodes[0];
    const xml = `<Device account="${victim?.accountMasked || ''}" mobile="919871123941" geocode="28.5355,77.3910" location="${investigation.policeStation}" ip="103.21.144.92" app="com.bank.upi" capability="0001" bssid="${bssid}" tls_ja4="${ja4}" />`;
    navigator.clipboard.writeText(xml);
    setIsCopiedXml(true);
    toast.success('UPI 2.0 <Device> XML stanza copied');
    setTimeout(() => setIsCopiedXml(false), 2000);
  };

  const actorsLinkedCount = investigation.nodes.length;

  return (
    <div className="v6-enter space-y-3" data-testid="v6-network-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 4 · Fraud Network"
        title="How were they connected?"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyI4cReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isCopiedI4c ? (
                <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--fg-3)]" />
              )}
              <span>Copy I4C Report</span>
            </button>
            <button
              type="button"
              onClick={handleCopyXml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isCopiedXml ? (
                <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
              )}
              <span>Copy &lt;Device&gt; XML</span>
            </button>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                setActiveView('device');
                setActiveRoute('attribution');
              }}
            >
              <span className="flex items-center gap-1.5">
                <span>Device & SIM</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="urgent"
        action={
          <button
            type="button"
            onClick={() => {
              setActiveView('device');
              setActiveRoute('attribution');
            }}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Inspect Hardware & CGNAT Funnel</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          Cross-layer corroboration proves <strong>shared hardware terminal</strong> between Vikram Shah and Rohit Verma. Packet TTL=63 confirms local Wi-Fi accomplice tethering.
        </span>
      </FindingStrip>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Actors linked</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
              MULTI-HOP
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            {actorsLinkedCount} nodes connected
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Mules, merchant lien & ATM cash-out
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Tethering proof</span>
            <span
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                isHotspotActive
                  ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]'
                  : 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
              }`}
            >
              {isHotspotActive ? 'TTL = 63 (HOTSPOT)' : 'TTL = 64 (DIRECT)'}
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            {isHotspotActive ? 'Accomplice Tether' : 'Direct PGW'}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate font-mono">
            BSSID: {bssid}
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">TLS Client Fingerprint</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-device-bg)] text-[var(--device)]">
              JA4 CONVERGED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--device)] truncate font-mono">
            {ja4.slice(0, 14)}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Common cipher suite on Axis & HDFC
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Inter-state syndicate</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
              &gt; ₹10 CR CBI
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">
            ₹10.42 Cr pool
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            14 FIRs across UP, MH, KA, GJ, DL
          </div>
        </div>
      </div>

      {/* Layer Filter & Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg shadow-xs">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-semibold text-[var(--fg-3)] mr-1">Layer:</span>
          {(
            [
              ['all', 'All Layers'],
              ['cashflow', 'Banking Flow'],
              ['tether', 'Wi-Fi Tether'],
              ['ja4', 'TLS JA4'],
              ['caf', 'CAF Identity'],
              ['c2', 'C2 Infrastructure'],
            ] as [EdgeFilterType, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setEdgeFilter(val)}
              className={`px-2 py-0.5 text-[12px] font-semibold rounded transition-colors ${
                edgeFilter === val
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleMutation('triggerHotspotCollision')}
            className={`px-2.5 py-1 text-[12px] font-semibold rounded border transition-colors ${
              isHotspotActive
                ? 'bg-[var(--color-risk-bg)] border-[var(--risk)] text-[var(--risk)]'
                : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
            }`}
          >
            {isHotspotActive ? '✓ Tethered (TTL=63)' : 'Simulate Hotspot (TTL=63)'}
          </button>

          <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded ${
                viewMode === 'graph' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'
              }`}
            >
              Interactive Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('svg')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded ${
                viewMode === 'svg' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'
              }`}
            >
              Layered Gang SVG
            </button>
            <button
              type="button"
              onClick={() => setViewMode('waterfall')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded ${
                viewMode === 'waterfall' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'
              }`}
            >
              Inter-State Waterfall
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'waterfall' ? (
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--fg-1)]">
                Inter-State Fraud Syndicate Exposure Waterfall
              </h3>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                Deterministic HMAC-SHA256 cross-referencing across NCRP state police databases confirms ₹10.42 Cr exposure.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
            >
              ← Back to Graph
            </button>
          </div>
          <div className="h-[440px]">
            <CrossStateWaterfall height="100%" />
          </div>
        </div>
      ) : (
        /* 12-Column Layout: Left 8 Cols Graph Canvas/SVG, Right 4 Cols Telemetry & Provenance */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
          {/* Left 8 Cols: Interactive Network Graph or Layered SVG */}
          <div
            data-semantic-id="el-graph-node-mule-1"
            className="lg:col-span-8 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg overflow-hidden shadow-xs min-h-[540px] tarka-semantic-target tarka-interactive-card"
          >
            {viewMode === 'svg' ? (
              <div className="relative w-full h-full min-h-[540px] bg-[var(--surface-1)]">
                <GangSvg
                  network={netData}
                  expanded={expandedLayers}
                  selectedId={selectedSvgNodeId}
                  route={null}
                  crossByMember={crossByMember}
                  onSelect={setSelectedSvgNodeId}
                  onExpand={(layer) => {
                    setExpandedLayers((prev) => {
                      const next = new Set(prev);
                      const key = String(layer);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }}
                />
              </div>
            ) : (
              <EvidenceNetworkGraph
                isHotspotActive={isHotspotActive}
                onToggleHotspot={() => toggleMutation('triggerHotspotCollision')}
                edgeFilter={edgeFilter}
                onEdgeFilterChange={setEdgeFilter}
                caseId={caseId}
              />
            )}
          </div>

          {/* Right 4 Cols: UPI 2.0 XML Stanza & Corroboration Details */}
          <div className="lg:col-span-4 flex flex-col space-y-3">
            {/* UPI 2.0 <Device> XML Stanza */}
            <div
              data-semantic-id="el-graph-node-hub"
              className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-2 tarka-semantic-target tarka-interactive-card"
            >
              <div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
                <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                  UPI 2.0 &lt;Device&gt; XML Stanza
                </span>
                <button
                  type="button"
                  onClick={handleCopyXml}
                  className="text-[12px] text-[var(--accent)] font-semibold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] leading-relaxed whitespace-pre-wrap break-all">
                {`<Device
  account="${canonicalCase.complainant.accountMasked}"
  mobile="919871123941"
  geocode="28.5355,77.3910"
  location="${investigation.policeStation}"
  ip="103.21.144.92"
  app="com.bank.upi"
  capability="0001"
  bssid="${bssid}"
  tls_ja4="${ja4}"
/>`}
              </div>
              <p className="text-[12px] text-[var(--fg-3)]">
                Extracted directly from NPCI UPI switch message exhibit. BSSID matches the shared Wi-Fi tethering anchor.
              </p>
            </div>

            {/* Corroborated Tethering Proof */}
            <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-2">
              <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block pb-1 border-b border-[var(--line)]">
                Corroborated Telemetry Invariants
              </span>

              <div className="space-y-1.5 text-[12px]">
                <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                  <div className="font-semibold text-[var(--fg-1)]">1. Packet Hop Decrement</div>
                  <div className="text-[var(--fg-2)] mt-0.5">
                    TTL observed as 63 (default Linux/Android IP header is 64). Indicates intermediate routing hop via mobile hotspot.
                  </div>
                </div>

                <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                  <div className="font-semibold text-[var(--fg-1)]">2. TLS Client Hello (JA4)</div>
                  <div className="text-[var(--fg-2)] mt-0.5">
                    Identical JA4 fingerprint (<span className="font-mono text-[var(--device)]">{ja4}</span>) across both Axis & HDFC mule logins within 14 minutes.
                  </div>
                </div>

                <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                  <div className="font-semibold text-[var(--fg-1)]">3. Tower Geolocation Proximity</div>
                  <div className="text-[var(--fg-2)] mt-0.5">
                    Both SIMs attached to Airtel Cell ID 404-45-10291 (Sector 18 Noida) simultaneously during the victim drain.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
