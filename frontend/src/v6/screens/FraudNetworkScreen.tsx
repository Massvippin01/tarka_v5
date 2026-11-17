import React, { useState, useMemo } from 'react';
import { ArrowRight, Copy, Check, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import {
  EvidenceNetworkGraph,
  type EdgeFilterType,
} from '../../components/tarka/network/EvidenceNetworkGraph';
import { CrossStateWaterfall } from '../../components/tarka/network/CrossStateWaterfall';
import { buildCaseBundleFromFixture } from '../../fixtures/cases';
import { formatInr } from '../../lib/formatInr';
import {
  selectDeviceFacts,
  selectSyndicate,
  selectAccountFlows,
  selectFinancialSummary,
} from '../../selectors/caseSelectors';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';

type NetworkViewMode = 'graph' | 'waterfall';

const FraudNetworkScreenInner: React.FC<ActiveCaseProps & { viewSwitch?: React.ReactNode }> = ({ fixture: canonicalCase, viewSwitch }) => {
  const { setActiveView } = useCaseStore();
  const { mutations, toggleMutation, setActiveRoute } = useTarkaGlobal();

  const caseId = canonicalCase.caseId;
  const investigation = useMemo(() => buildCaseBundleFromFixture(canonicalCase), [canonicalCase]);
  const devices = useMemo(() => selectDeviceFacts(canonicalCase), [canonicalCase]);
  const syndicate = useMemo(() => selectSyndicate(canonicalCase), [canonicalCase]);
  const flows = useMemo(() => selectAccountFlows(canonicalCase), [canonicalCase]);
  const fin = useMemo(() => selectFinancialSummary(canonicalCase), [canonicalCase]);

  const [viewMode, setViewMode] = useState<NetworkViewMode>('graph');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>('all');
  const [isCopiedI4c, setIsCopiedI4c] = useState(false);
  const [isCopiedXml, setIsCopiedXml] = useState(false);

  const ja4 = devices.ja4s[0] ?? null;
  const bssid = devices.bssids[0] ?? null;
  const publicIp = devices.publicIps[0] ?? null;
  const sharedBssidAccounts = bssid ? flows.filter((a) => a.bssidHotspot === bssid) : [];
  const sharedImeiGroups = devices.devices.filter((d) => d.accountNames.length > 1);
  const isHotspotActive = sharedBssidAccounts.length >= 2 || !!mutations.triggerHotspotCollision;

  const mules = flows.filter((a) => a.role === 'MULE' || a.role === 'CONDUIT' || a.role === 'UNRESOLVED');
  const linkedNames = sharedImeiGroups[0]?.accountNames ?? [];

  const handleCopyI4cReport = () => {
    const muleList = mules
      .map((m, idx) => `${idx + 1}. ${m.holderName} (${m.bank} ${m.accountMasked}), ${m.roleLabel}`)
      .join('\n');
    const report = `=== I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT ===\nCase Ref: ${investigation.firNumber} ${investigation.policeStation}\nComplainant: ${investigation.complainantName} | Booked Loss: ${formatInr(investigation.bookedLossInr)}\nClassification: LAW ENFORCEMENT SENSITIVE\n\n[SHARED INFRASTRUCTURE]\n• Wi-Fi BSSID: ${bssid ?? 'none recorded'}\n• Client TLS anchor (JA4): ${ja4 ?? 'none recorded'}\n• Public IP: ${publicIp?.ip ?? 'none recorded'}\n• Handsets: ${devices.devices.map((d) => d.imei).join(', ') || 'none recorded'}\n\n[CONTROLLED MULE ENTITIES (${mules.length} TARGETS)]\n${muleList}\n\n[LINKED CASES]\n${syndicate.combinedCases.map((c) => `${c.caseId} (${c.policeStation}): ${formatInr(c.bookedLossInr)}`).join('\n')}\nCombined exposure: ${formatInr(syndicate.combinedExposureInr)}`;

    navigator.clipboard.writeText(report);
    setIsCopiedI4c(true);
    toast.success('I4C Samanvaya Syndicate Link Report copied to clipboard');
    setTimeout(() => setIsCopiedI4c(false), 2000);
  };

  const xmlStanza = `<Device
  account="${canonicalCase.complainant.accountMasked}"
  mobile="${canonicalCase.complainant.phone.replace(/\D/g, '')}"
  location="${investigation.policeStation}"
  ip="${publicIp?.ip ?? ''}"
  app="com.bank.upi"
  capability="0001"
  bssid="${bssid ?? ''}"
  tls_ja4="${ja4 ?? ''}"
/>`;

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlStanza);
    setIsCopiedXml(true);
    toast.success('UPI 2.0 <Device> XML stanza copied');
    setTimeout(() => setIsCopiedXml(false), 2000);
  };

  const actorsLinkedCount = investigation.nodes.length;

  return (
    <div className="v6-enter space-y-3" data-testid="v6-network-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 4 · Network"
        title="How were they connected?"
        actions={
          <div className="flex items-center gap-2">
            {viewSwitch}
            <button
              type="button"
              onClick={handleCopyI4cReport}
              title="Copy the I4C report"
              aria-label="Copy the I4C report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isCopiedI4c ? <Check className="w-3.5 h-3.5 text-[var(--safe)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--fg-3)]" />}
              <span className="hidden 2xl:inline">Copy I4C report</span>
            </button>
            <button
              type="button"
              onClick={handleCopyXml}
              title="Copy the device evidence as XML"
              aria-label="Copy the device evidence as XML"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isCopiedXml ? <Check className="w-3.5 h-3.5 text-[var(--safe)]" /> : <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />}
              <span className="hidden 2xl:inline">Copy device XML</span>
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

      {/* Layer Filter & Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg shadow-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[12px] font-semibold text-[var(--fg-3)] mr-1">Show:</span>
          {(
            [
              ['all', 'Everything', 'All links between accounts and devices'],
              ['cashflow', 'Money', 'Bank and UPI payments'],
              ['tether', 'Same Wi-Fi', 'Accounts used from the same Wi-Fi hotspot (BSSID)'],
              ['ja4', 'Same app/browser', 'Same TLS client fingerprint (JA4) seen in bank sessions'],
              ['caf', 'SIM paperwork', 'Same identity on the SIM customer application form (CAF)'],
              ['c2', 'Control servers', 'Command-and-control (C2) servers seen in the evidence'],
            ] as [EdgeFilterType, string, string][]
          ).map(([val, label, hint]) => (
            <button
              key={val}
              type="button"
              title={hint}
              onClick={() => setEdgeFilter(val)}
              className={`px-2 py-0.5 text-[12px] font-semibold rounded transition-colors ${
                edgeFilter === val ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded ${viewMode === 'graph' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'}`}
            >
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('waterfall')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded ${viewMode === 'waterfall' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)]'}`}
            >
              Linked-case waterfall
            </button>
          </div>
        </div>
      </div>

      {/* GRAPH FIRST: visible without scrolling */}
      {viewMode === 'waterfall' ? (
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--fg-1)]">Linked-case exposure waterfall</h3>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                {syndicate.linkedCaseIds.length
                  ? `This case plus ${syndicate.linkedCaseIds.length} case${syndicate.linkedCaseIds.length === 1 ? '' : 's'} sharing infrastructure: ${formatInr(syndicate.combinedExposureInr)} combined.`
                  : 'No other case shares infrastructure with this one yet.'}
              </p>
            </div>
            <button type="button" onClick={() => setViewMode('graph')} className="text-[12px] font-semibold text-[var(--accent)] hover:underline">
              ← Back to Graph
            </button>
          </div>
          <div className="h-[440px]">
            <CrossStateWaterfall height="100%" caseId={caseId} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg overflow-hidden shadow-xs min-h-[540px]">
          <EvidenceNetworkGraph
            isHotspotActive={isHotspotActive}
            onToggleHotspot={() => toggleMutation('triggerHotspotCollision')}
            edgeFilter={edgeFilter}
            onEdgeFilterChange={setEdgeFilter}
            caseId={caseId}
          />
        </div>
      )}

      {/* Explanation below the graph */}
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
            <span>Inspect hardware and network evidence</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          {linkedNames.length > 1 ? (
            <>
              Shared handset <strong>IMEI {sharedImeiGroups[0].imei}</strong> links <strong>{linkedNames.join(', ')}</strong>.
              {bssid ? ` The same Wi-Fi anchor (${bssid}) appears on ${sharedBssidAccounts.length} account${sharedBssidAccounts.length === 1 ? '' : 's'}.` : ''}
            </>
          ) : (
            <>No shared handset found between accounts in this case yet. {devices.hasDeviceEvidence ? 'Review the session facts below.' : 'No device evidence has been ingested.'}</>
          )}
        </span>
      </FindingStrip>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Actors linked</span>
            <span className="v6-badge bg-[var(--color-flow-bg)] text-[var(--flow)]">MULTI-HOP</span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">{actorsLinkedCount} nodes connected</div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            {mules.length} mule account{mules.length === 1 ? '' : 's'}, {flows.filter((a) => a.role === 'MERCHANT').length} merchant, {flows.filter((a) => a.role === 'SINK').length} cash-out
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Shared Wi-Fi anchor</span>
            <span className={`v6-badge ${isHotspotActive ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]' : 'bg-[var(--color-safe-bg)] text-[var(--safe)]'}`}>
              {bssid ? `${sharedBssidAccounts.length} ACCOUNTS` : 'NONE'}
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">{isHotspotActive ? 'Common hotspot' : 'No shared anchor'}</div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate font-mono" title={bssid ?? undefined}>
            BSSID: {bssid ?? 'not recorded'}
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">TLS client fingerprint</span>
            <span className="v6-badge bg-[var(--color-device-bg)] text-[var(--device)]">
              {ja4 ? (devices.ja4s.length === 1 ? 'JA4 CONVERGED' : `${devices.ja4s.length} FINGERPRINTS`) : 'NONE'}
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--device)] truncate font-mono" title={ja4 ?? undefined}>
            {ja4 ? ja4.slice(0, 14) : 'Not recorded'}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            {ja4 ? `Seen in ${devices.sessions.filter((s) => s.ja4 === ja4).length} bank sessions` : 'No TLS evidence ingested'}
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Linked cases</span>
            <span className="v6-badge bg-[var(--color-risk-bg)] text-[var(--risk)]">
              {syndicate.linkedCaseIds.length} LINKED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">{formatInr(syndicate.combinedExposureInr, { compact: true })} combined</div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate" title={syndicate.linkedCaseIds.join(', ')}>
            {syndicate.linkedCaseIds.length ? syndicate.linkedCaseIds.join(', ') : 'No cross-case links'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--line)]">
            <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">UPI 2.0 &lt;Device&gt; XML stanza</span>
            <button type="button" onClick={handleCopyXml} className="text-[12px] text-[var(--accent)] font-semibold hover:underline flex items-center gap-1">
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] leading-relaxed whitespace-pre-wrap break-all">{xmlStanza}</div>
          <p className="text-[12px] text-[var(--fg-3)]">Built from the complainant record and this case's network sessions.</p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-2">
          <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider block pb-1 border-b border-[var(--line)]">Corroborating facts</span>
          <div className="space-y-1.5 text-[12px]">
            <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
              <div className="font-semibold text-[var(--fg-1)]">1. Handset</div>
              <div className="text-[var(--fg-2)] mt-0.5">
                {devices.devices.length
                  ? devices.devices.map((d) => `IMEI ${d.imei} used by ${d.accountNames.join(', ')}`).join('. ')
                  : 'No handset identifiers recorded.'}
              </div>
            </div>
            <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
              <div className="font-semibold text-[var(--fg-1)]">2. TLS client hello (JA4)</div>
              <div className="text-[var(--fg-2)] mt-0.5">
                {ja4 ? (
                  <>
                    Fingerprint <span className="font-mono text-[var(--device)] break-all">{ja4}</span> appears across {new Set(devices.sessions.filter((s) => s.ja4 === ja4).map((s) => s.accountName)).size} sending account(s).
                  </>
                ) : (
                  'No TLS fingerprint recorded.'
                )}
              </div>
            </div>
            <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)]">
              <div className="font-semibold text-[var(--fg-1)]">3. Network source</div>
              <div className="text-[var(--fg-2)] mt-0.5">
                {publicIp
                  ? `Public IP ${publicIp.ip} (${publicIp.sessionCount} session${publicIp.sessionCount === 1 ? '' : 's'}, source ports ${publicIp.ports.join(', ')}). Total loss ${formatInr(fin.bookedLossInr)}.`
                  : 'No public IP recorded.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FraudNetworkScreen = withActiveCase<{ viewSwitch?: React.ReactNode }>(FraudNetworkScreenInner);
