import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowRight, ChevronRight, Copy, Fingerprint, Info, Network as NetworkIcon, RadioTower, RefreshCw, Smartphone, Upload, Users, Wifi,
} from 'lucide-react';
import apiClient from '../../api/client';
import { PageHead, FindingStrip, Button, Skeleton } from '../ui';
import { BorderBeam } from '../../components/magicui/border-beam';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { CANONICAL_CASES } from '../../fixtures/cases';
import { getDot3920PortBlockDirective, getBnss94ImeiSeizureDirective } from '../../utils/statutoryDirectives';
import { setFocus, useFocus, focusLevel } from '../../lib/focusUrl';
import { fixtureNetworks } from '../network/networkFocus';
import type { NetworksResponse } from '../triage/triage';
import {
  DEVICE_KINDS, KIND_META, demoDeviceRows, demoSimChanges, deviceHeadline, istTime, rowValue, rowsFromServer, scopeDevices,
  viewFromRows, viewFromServer, type DeviceCluster, type DeviceKind, type DeviceRow, type DevicesResponse,
} from '../../selectors/deviceSelectors';
import { ClusterGraph, SourceRowsDialog, type RowsRequest } from '../devices/DevicePanels';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';

const enc = encodeURIComponent;
const PAGE = 60;
const KIND_ICON: Record<DeviceKind, React.ElementType> = { imei: Smartphone, imsi: RadioTower, device_id: Fingerprint, bssid: Wifi, ip: NetworkIcon };
const n = (x: number) => x.toLocaleString('en-IN');

const KindChip: React.FC<{ kind: DeviceKind; count?: number }> = ({ kind, count }) => {
  const Icon = KIND_ICON[kind];
  const strong = KIND_META[kind].strength !== 'weak';
  return (
    <span
      title={`${KIND_META[kind].label}. ${KIND_META[kind].tip}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium border whitespace-nowrap ${
        strong ? 'bg-[var(--accent-bg)]/60 text-[var(--accent)] border-[var(--accent)]/25' : 'bg-[var(--surface-2)] text-[var(--fg-2)] border-[var(--line)]'
      }`}
    >
      <Icon className="w-3 h-3" />
      {KIND_META[kind].label}
      {count !== undefined && count > 1 && <span className="opacity-70">×{count}</span>}
    </span>
  );
};

const Kpi: React.FC<{ label: string; tip: string; value: number; sub: string; onClick?: () => void; disabled?: boolean }> = ({ label, tip, value, sub, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="v6-card text-left group disabled:cursor-default enabled:hover:-translate-y-px transition-transform focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
  >
    <span className="text-[12px] font-medium text-[var(--fg-3)] flex items-center gap-1" title={tip}>
      {label}
      <Info className="w-3 h-3 opacity-60" />
    </span>
    <span className="block text-[26px] leading-tight font-semibold text-[var(--fg-1)] mt-1 tabular-nums">
      {n(value)}
    </span>
    <span className="block text-[12px] text-[var(--fg-3)] mt-0.5 truncate group-enabled:group-hover:text-[var(--accent)]" title={sub}>
      {sub}
    </span>
  </button>
);

const DeviceSimScreenInner: React.FC<ActiveCaseProps> = ({ fixture }) => {
  const { setActiveView } = useCaseStore();
  const { setActiveRoute } = useTarkaGlobal();
  const caseId = fixture.caseId;
  const demo = CANONICAL_CASES[caseId] ?? null; // demo cases carry device facts in their record; uploads read the server
  const urlFocus = useFocus();

  const devicesQ = useQuery({
    queryKey: ['devices', caseId],
    queryFn: async () => (await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/devices`)).data,
    enabled: !demo,
  });
  const networksQ = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)).data,
    enabled: !demo,
  });

  const nets = useMemo(() => (demo ? fixtureNetworks(demo) : networksQ.data?.networks ?? null), [demo, networksQ.data]);
  const memberLabel = useMemo(() => new Map((nets ?? []).flatMap((x) => x.members.map((m) => [m.id, m.label] as const))), [nets]);
  const labelOf = (k: string) => memberLabel.get(k) ?? k;

  const demoRows = useMemo(() => {
    if (!demo) return null;
    const idByName = new Map((nets ?? []).flatMap((x) => x.members.map((m) => [m.label, m.id] as const)));
    return demoDeviceRows(demo, (name) => idByName.get(name) ?? name);
  }, [demo, nets]);
  const view = useMemo(
    () => (demoRows ? viewFromRows(demoRows, (k) => memberLabel.get(k) ?? k, demoSimChanges(demo!)) : devicesQ.data ? viewFromServer(devicesQ.data) : null),
    [demoRows, demo, devicesQ.data, memberLabel],
  );

  // A network id that is not in this case (stale link) falls back to the whole case, as on the Network page.
  const staleNet = !!nets && !!urlFocus.networkId && !nets.some((x) => x.network_id === urlFocus.networkId);
  const focus = staleNet ? { ...urlFocus, networkId: null } : urlFocus;
  const level = focusLevel(focus);
  const scoped = useMemo(() => (view ? scopeDevices(view, focus, nets) : null), [view, focus.networkId, focus.account, nets]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = scoped?.view ?? null;
  const outside = (k: string) => !!scoped?.scope && !scoped.scope.has(k);
  const scopeLabel = level === 'account' ? 'linked to this account' : level === 'network' ? 'in this network' : 'in this case';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showClusters, setShowClusters] = useState(PAGE);
  const [showAccounts, setShowAccounts] = useState(PAGE);
  const [rowsReq, setRowsReq] = useState<RowsRequest | null>(null);
  const selected: DeviceCluster | null = v?.clusters.find((c) => c.id === selectedId) ?? v?.clusters[0] ?? null;

  const rowsQ = useQuery({
    queryKey: ['device-rows', caseId, rowsReq?.account, rowsReq?.kind, rowsReq?.value],
    queryFn: async () => {
      const { data } = await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/devices`, {
        params: { account: rowsReq!.account, kind: rowsReq!.kind, value: rowsReq!.value },
      });
      return rowsFromServer(data.rows ?? []);
    },
    enabled: !demo && !!rowsReq,
  });
  const dialogRows: DeviceRow[] | undefined = demoRows
    ? rowsReq
      ? demoRows.filter((r) => (!rowsReq.account || r.account === rowsReq.account) && (!rowsReq.kind || rowValue(r, rowsReq.kind as DeviceKind) === rowsReq.value))
      : undefined
    : rowsQ.data;

  // Account zoom: that account's own sightings, as a session timeline.
  const acctKey = focus.account ? (view?.accounts.some((a) => a.key === focus.account) ? focus.account : focus.account.toLowerCase()) : null;
  const sessionsQ = useQuery({
    queryKey: ['device-rows', caseId, acctKey, undefined, undefined],
    queryFn: async () => {
      const { data } = await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/devices`, { params: { account: acctKey } });
      return rowsFromServer(data.rows ?? []);
    },
    enabled: !demo && !!acctKey && !!view?.hasData,
  });
  const sessions = acctKey ? (demoRows ? demoRows.filter((r) => r.account === acctKey) : sessionsQ.data) : undefined;

  const clustersRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLDivElement>(null);
  const accountsRef = useRef<HTMLDivElement>(null);
  const jump = (r: React.RefObject<HTMLDivElement | null>) => r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openAccount = (key: string) => setFocus({ networkId: focus.networkId, account: key });
  const copy = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const net = nets?.find((x) => x.network_id === focus.networkId);
  const crumb = 'max-w-[260px] truncate rounded-md px-1.5 py-0.5';
  const loading = !demo && devicesQ.isLoading;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-device-screen">
      <PageHead
        kicker="Step 5 · Devices & SIMs"
        title="Which phones, SIMs and connections are behind these accounts?"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="md" variant="ghost" onClick={() => copy(getDot3920PortBlockDirective(caseId), 'Telecom data request copied')} title="Request to the telecom operator under DoT licence Clause 39.20 (CDR / IPDR / SIM records)">
              <span className="flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" />Telecom data request</span>
            </Button>
            <Button size="md" variant="ghost" onClick={() => copy(getBnss94ImeiSeizureDirective(caseId), 'Phone seizure notice copied')} title="Notice to produce the handset under §94 BNSS (IMEI seizure)">
              <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" />Phone seizure notice</span>
            </Button>
            <Button size="md" variant="primary" onClick={() => { setActiveView('actions'); setActiveRoute('report'); }}>
              <span className="flex items-center gap-1.5">Actions & report<ArrowRight className="w-3.5 h-3.5" /></span>
            </Button>
          </div>
        }
      />

      {/* zoom breadcrumb */}
      <nav aria-label="Zoom" className="flex items-center gap-1 text-[13px] px-2 py-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-1)] backdrop-blur-md w-fit max-w-full">
        <button type="button" onClick={() => setFocus({ networkId: null, account: null })} className={`${crumb} ${level === 'project' ? 'font-semibold text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:bg-[var(--hover)]'}`}>
          Whole case
        </button>
        {focus.networkId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
            <button type="button" onClick={() => setFocus({ networkId: focus.networkId, account: null })} className={`${crumb} v6-mono ${level === 'network' ? 'font-semibold text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:bg-[var(--hover)]'}`} title={focus.networkId}>
              Network {focus.networkId}
            </button>
          </>
        )}
        {focus.account && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
            <span className={`${crumb} font-semibold text-[var(--fg-1)]`} aria-current="page" title={labelOf(focus.account)}>{labelOf(focus.account)}</span>
          </>
        )}
        {level === 'network' && net && <span className="text-[12px] text-[var(--fg-3)] pl-2 whitespace-nowrap">{n(net.member_count)} accounts</span>}
      </nav>

      {loading ? (
        <div className="space-y-3">
          <Skeleton height={44} />
          <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={96} />)}</div>
          <div className="grid grid-cols-12 gap-3"><Skeleton className="col-span-7" height={360} /><Skeleton className="col-span-5" height={360} /></div>
        </div>
      ) : !demo && devicesQ.isError ? (
        <div className="v6-card flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-[var(--urgent)]">Could not load device records</p>
            <p className="text-[12px] text-[var(--fg-3)] mt-0.5">The server did not answer. Your uploads are safe; try again in a moment.</p>
          </div>
          <Button size="md" onClick={() => devicesQ.refetch()}><span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Try again</span></Button>
        </div>
      ) : !view?.hasData ? (
        <NoDeviceData onUpload={() => setActiveView('upload')} />
      ) : (
        <>
          <FindingStrip variant={v!.clusters.length ? 'urgent' : 'safe'}>
            <span title={deviceHeadline(v!, scopeLabel)}>{v!.accounts.length || v!.clusters.length ? deviceHeadline(v!, scopeLabel) : `No device records ${scopeLabel}. Other accounts in the case have them — go back to the whole case to see them.`}</span>
          </FindingStrip>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Kpi label="Accounts with device records" tip="Accounts seen in the uploaded call, internet or login records." value={v!.accounts.length} sub="See every account →" onClick={() => jump(accountsRef)} />
            <Kpi label="Groups sharing a device" tip="Accounts joined by the same phone (IMEI), SIM (IMSI), app install, Wi-Fi router (BSSID) or internet address (IP)." value={v!.clusters.length} sub={v!.clusters.length ? `${n(v!.clusters.reduce((s, c) => s + c.accounts.length, 0))} accounts in groups →` : 'No shared devices'} onClick={() => jump(clustersRef)} disabled={!v!.clusters.length} />
            <Kpi label="SIM changes" tip="An account seen with a new SIM (IMSI), or a record that says SIM swap / port / duplicate SIM." value={v!.simChangesTotal} sub={v!.simChangesTotal ? 'See the timeline →' : 'None in the records'} onClick={() => jump(simRef)} disabled={!v!.simChangesTotal} />
            <Kpi label="Device records read" tip="Rows read from uploaded CDR / IPDR / login logs (or, in a demo case, from the case record)." value={level === 'project' ? v!.eventsTotal : v!.accounts.reduce((s, a) => s + a.events, 0)} sub={view.origin === 'demo' ? 'From the case record' : 'From uploaded logs'} disabled />
          </div>

          {/* clusters + detail */}
          <div ref={clustersRef} className="grid grid-cols-1 lg:grid-cols-12 gap-3 scroll-mt-4">
            <section className="v6-card lg:col-span-7 !p-0 overflow-hidden">
              <header className="px-4 pt-3 pb-2 border-b border-[var(--line)]">
                <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">Accounts that share a device</h3>
                <p className="text-[12px] text-[var(--fg-3)]">Strongest first: the same phone, SIM or app install usually means one person runs these accounts.</p>
              </header>
              {v!.clusters.length === 0 ? (
                <p className="px-4 py-8 text-[13px] text-[var(--fg-3)] text-center">No two accounts {scopeLabel} share a phone, SIM, Wi-Fi or internet address.</p>
              ) : (
                <div className="max-h-[440px] overflow-auto">
                  <table className="w-full table-fixed text-[12.5px]">
                    <thead className="sticky top-0 z-10 bg-[var(--glass-2)] backdrop-blur-md text-left text-[var(--fg-3)]">
                      <tr>
                        <th className="w-[72px] px-4 py-2 font-medium">Group</th>
                        <th className="px-2 py-2 font-medium">Accounts</th>
                        <th className="w-[190px] px-2 py-2 font-medium">Linked by</th>
                        <th className="w-[92px] px-4 py-2 font-medium text-right" title="Records that show the shared device">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v!.clusters.slice(0, showClusters).map((c) => {
                        const kinds = DEVICE_KINDS.filter((k) => c.links.some((l) => l.kind === k));
                        const isSel = selected?.id === c.id;
                        const names = c.accounts.map(labelOf);
                        return (
                          <tr key={c.id} onClick={() => setSelectedId(c.id)} className={`cursor-pointer border-t border-[var(--line)] transition-colors ${isSel ? 'bg-[var(--accent-bg)]/40' : 'hover:bg-[var(--hover)]'}`}>
                            <td className="px-4 py-2 v6-mono text-[var(--fg-2)]">{c.id}</td>
                            <td className="px-2 py-2">
                              <span className="font-semibold text-[var(--fg-1)]">{c.accounts.length} accounts</span>
                              <span className="block truncate text-[var(--fg-3)]" title={names.join(', ')}>{names.join(', ')}</span>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap gap-1">{kinds.map((k) => <KindChip key={k} kind={k} count={c.links.filter((l) => l.kind === k).length} />)}</div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRowsReq({ title: `${KIND_META[c.links[0].kind].label} — ${c.links[0].value}`, kind: c.links[0].kind, value: c.links[0].value }); }}
                                className="v6-mono font-semibold text-[var(--accent)] hover:underline"
                                title="Show the records"
                              >
                                {n(c.links.reduce((s, l) => s + l.events, 0))}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {v!.clusters.length > showClusters && (
                    <button type="button" onClick={() => setShowClusters((s) => s + PAGE)} className="w-full py-2 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--hover)] border-t border-[var(--line)]">
                      Show {n(Math.min(PAGE, v!.clusters.length - showClusters))} more of {n(v!.clusters.length - showClusters)}
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="v6-card lg:col-span-5 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.div key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">Group {selected.id}</h3>
                        <p className="text-[12px] text-[var(--fg-3)]">{selected.accounts.length} accounts · {KIND_META[selected.strongestKind].label.toLowerCase()}</p>
                      </div>
                      <Users className="w-4 h-4 text-[var(--accent)] flex-none mt-1" />
                    </div>
                    <ClusterGraph cluster={selected} labelOf={labelOf} outside={outside} onAccount={openAccount} />
                    <ul className="mt-3 space-y-1.5">
                      {selected.links.slice(0, 12).map((l) => (
                        <li key={`${l.kind}:${l.value}`} className="flex items-center justify-between gap-2 text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--surface-1)]/70 border border-[var(--line)]">
                          <span className="flex items-center gap-2 min-w-0">
                            <KindChip kind={l.kind} />
                            <span className="v6-mono truncate text-[var(--fg-1)]" title={l.value}>{l.value}</span>
                          </span>
                          <button type="button" className="flex-none text-[var(--accent)] font-semibold hover:underline whitespace-nowrap" onClick={() => setRowsReq({ title: `${KIND_META[l.kind].label} — ${l.value}`, kind: l.kind, value: l.value })}>
                            {l.accounts.length} accts · {n(l.events)} records
                          </button>
                        </li>
                      ))}
                      {selected.links.length > 12 && <li className="text-[12px] text-[var(--fg-3)] px-1">+{selected.links.length - 12} more shared identifiers</li>}
                    </ul>
                    {scoped?.scope && selected.accounts.some(outside) && (
                      <p className="mt-2 text-[12px] text-[var(--fg-2)]">Hollow dots are accounts outside this {level === 'account' ? 'account' : 'network'} — the device links them in.</p>
                    )}
                    <BorderBeam size={90} duration={9} colorFrom="var(--accent)" colorTo="transparent" />
                  </motion.div>
                ) : (
                  <p className="text-[13px] text-[var(--fg-3)] py-10 text-center">Pick a group to see how its accounts are linked.</p>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* SIM + sessions timeline / accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <section ref={simRef} className="v6-card lg:col-span-5 scroll-mt-4">
              <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">{acctKey ? 'SIM changes and sessions' : 'SIM changes'}</h3>
              <p className="text-[12px] text-[var(--fg-3)] mb-3">Only what the records show, oldest first.</p>
              <Timeline sims={v!.simChanges} sessions={sessions} sessionsLoading={!demo && !!acctKey && sessionsQ.isLoading} labelOf={labelOf} onAccount={openAccount} />
              {v!.simChangesTotal > v!.simChanges.length && <p className="text-[12px] text-[var(--fg-3)] mt-2">Showing the first {n(v!.simChanges.length)} of {n(v!.simChangesTotal)}.</p>}
            </section>

            <section ref={accountsRef} className="v6-card lg:col-span-7 !p-0 overflow-hidden scroll-mt-4">
              <header className="px-4 pt-3 pb-2 border-b border-[var(--line)]">
                <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">Accounts and their devices</h3>
                <p className="text-[12px] text-[var(--fg-3)]">Click an account to zoom in; click a count to see its records.</p>
              </header>
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full table-fixed text-[12.5px]">
                  <thead className="sticky top-0 z-10 bg-[var(--glass-2)] backdrop-blur-md text-left text-[var(--fg-3)]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Account</th>
                      {(['imei', 'imsi', 'ip', 'bssid'] as DeviceKind[]).map((k) => (
                        <th key={k} className="w-[64px] px-1 py-2 font-medium text-center" title={`${KIND_META[k].label.replace('Same ', '')}s used. ${KIND_META[k].tip}`}>{KIND_META[k].short}s</th>
                      ))}
                      <th className="w-[150px] px-2 py-2 font-medium">Last seen (IST)</th>
                      <th className="w-[84px] px-4 py-2 font-medium text-right">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v!.accounts.slice(0, showAccounts).map((a) => (
                      <tr key={a.key} className={`border-t border-[var(--line)] hover:bg-[var(--hover)] ${a.key === acctKey ? 'bg-[var(--accent-bg)]/40' : ''}`}>
                        <td className="px-4 py-1.5">
                          <button type="button" onClick={() => openAccount(a.key)} className="block max-w-full truncate text-left font-medium text-[var(--fg-1)] hover:text-[var(--accent)]" title={`${labelOf(a.key)}${a.phone ? ` · ${a.phone}` : ''}`}>
                            {labelOf(a.key)}
                          </button>
                          {a.phone && <span className="block v6-mono text-[11.5px] text-[var(--fg-3)]">{a.phone}</span>}
                        </td>
                        {(['imei', 'imsi', 'ip', 'bssid'] as DeviceKind[]).map((k) => (
                          <td key={k} className={`px-1 py-1.5 text-center tabular-nums ${a.identifiers[k].length > 1 ? 'font-semibold text-[var(--accent)]' : 'text-[var(--fg-2)]'}`} title={a.identifiers[k].join(', ') || 'None'}>
                            {a.identifiers[k].length || '—'}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 v6-mono text-[var(--fg-2)] truncate">{istTime(a.lastTs)}</td>
                        <td className="px-4 py-1.5 text-right">
                          <button type="button" className="v6-mono font-semibold text-[var(--accent)] hover:underline" onClick={() => setRowsReq({ title: `Records for ${labelOf(a.key)}`, account: a.key })}>
                            {n(a.events)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {v!.accounts.length > showAccounts && (
                  <button type="button" onClick={() => setShowAccounts((s) => s + PAGE)} className="w-full py-2 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--hover)] border-t border-[var(--line)]">
                    Show {n(Math.min(PAGE, v!.accounts.length - showAccounts))} more of {n(v!.accounts.length - showAccounts)}
                  </button>
                )}
                {v!.accounts.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-[var(--fg-3)]">No device records {scopeLabel}.</p>}
              </div>
            </section>
          </div>

          {v!.common.length > 0 && (
            <details className="v6-card text-[12.5px]">
              <summary className="cursor-pointer font-semibold text-[var(--fg-1)]">
                {n(v!.common.length)} identifier{v!.common.length === 1 ? '' : 's'} left out of the groups — used by too many accounts to point to one person
              </summary>
              <p className="text-[12px] text-[var(--fg-3)] mt-1 mb-2">Usually a mobile carrier's shared internet address, public Wi-Fi or a bank kiosk.</p>
              <ul className="space-y-1">
                {v!.common.map((c) => (
                  <li key={`${c.kind}:${c.value}`} className="flex items-center gap-2">
                    <KindChip kind={c.kind} />
                    <span className="v6-mono truncate" title={c.value}>{c.value}</span>
                    <button type="button" className="ml-auto text-[var(--accent)] hover:underline whitespace-nowrap" onClick={() => setRowsReq({ title: `${KIND_META[c.kind].label} — ${c.value}`, kind: c.kind, value: c.value })}>
                      {n(c.accountCount)} accounts · {n(c.events)} records
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <SourceRowsDialog
        request={rowsReq}
        rows={dialogRows}
        loading={!demo && rowsQ.isLoading}
        error={!demo && rowsQ.isError}
        labelOf={labelOf}
        onClose={() => setRowsReq(null)}
      />
    </div>
  );
};

const Timeline: React.FC<{
  sims: ReturnType<typeof scopeDevices>['view']['simChanges'];
  sessions: DeviceRow[] | undefined;
  sessionsLoading: boolean;
  labelOf: (k: string) => string;
  onAccount: (k: string) => void;
}> = ({ sims, sessions, sessionsLoading, labelOf, onAccount }) => {
  type Item = { ts: number | null; time: string; title: React.ReactNode; detail: string; sim: boolean; source: string | null; key: string };
  const items: Item[] = [
    ...sims.map((s, i): Item => ({
      key: `s${i}`,
      ts: s.ts,
      time: istTime(s.ts),
      sim: true,
      title: (
        <>
          {s.kind === 'new_sim' ? 'New SIM in use' : 'SIM event recorded'}
          {s.account && (
            <>
              {' · '}
              <button type="button" className="hover:text-[var(--accent)] underline-offset-2 hover:underline" onClick={() => onAccount(s.account)}>{labelOf(s.account)}</button>
            </>
          )}
        </>
      ),
      detail: s.kind === 'new_sim' ? `SIM ${s.from ?? '?'} → ${s.to ?? '?'}${s.imei ? ` · phone ${s.imei}` : ''}` : s.event ?? '',
      source: s.source,
    })),
    ...(sessions ?? []).map((r): Item => ({
      key: r.key,
      ts: r.ts,
      time: r.timeLabel,
      sim: false,
      title: r.event || 'Session',
      detail: [r.imei && `phone ${r.imei}`, r.imsi && `SIM ${r.imsi}`, r.ip && `IP ${r.ip}`, r.bssid && `Wi-Fi ${r.bssid}`].filter(Boolean).join(' · '),
      source: r.source,
    })),
  ].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));

  if (sessionsLoading) return <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={40} />)}</div>;
  if (!items.length) return <p className="text-[13px] text-[var(--fg-3)] py-6 text-center">No SIM change appears in these records.</p>;
  return (
    <ol className="relative max-h-[380px] overflow-auto pl-5 space-y-2 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--line-2)]">
      {items.slice(0, 300).map((it) => (
        <li key={it.key} className="relative">
          <span className={`absolute -left-[17px] top-2.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--glass-2)] ${it.sim ? 'bg-[var(--accent)]' : 'bg-[var(--fg-3)]'}`} />
          <div className={`rounded-lg px-2.5 py-1.5 border text-[12px] ${it.sim ? 'border-[var(--accent)]/30 bg-[var(--accent-bg)]/30' : 'border-[var(--line)] bg-[var(--surface-1)]/60'}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-[var(--fg-1)] truncate">{it.title}</span>
              <span className="v6-mono text-[11.5px] text-[var(--fg-3)] whitespace-nowrap">{it.time}</span>
            </div>
            {it.detail && <div className="v6-mono text-[11.5px] text-[var(--fg-2)] truncate" title={it.detail}>{it.detail}</div>}
            {it.source && <div className="text-[11px] text-[var(--fg-3)] truncate" title={it.source}>{it.source}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
};

const NoDeviceData: React.FC<{ onUpload: () => void }> = ({ onUpload }) => (
  <section className="relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-1)] backdrop-blur-md p-8">
    <div className="max-w-[640px]">
      <div className="w-11 h-11 rounded-xl bg-[var(--accent-bg)]/70 text-[var(--accent)] flex items-center justify-center mb-4">
        <Smartphone className="w-5 h-5" />
      </div>
      <h2 className="text-[18px] font-semibold text-[var(--fg-1)]">Upload CDR / IPDR / bank login logs to see devices</h2>
      <p className="text-[13px] text-[var(--fg-2)] mt-1.5 leading-relaxed">
        This case has no phone, SIM or login records yet, so there is nothing to show — TARKA does not guess devices from bank statements.
        Ask the telecom operator for call records (CDR) and internet session records (IPDR), and the bank or UPI app for login logs of the suspect accounts.
      </p>
      <ul className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-[12.5px]">
        {[
          ['Accounts that share a phone', 'Same handset (IMEI) or SIM (IMSI) on “different” mules'],
          ['Shared Wi-Fi and internet', 'Same router (BSSID) or address (IP) at the same time'],
          ['SIM swaps and sessions', 'A new SIM shortly before the money moved'],
        ].map(([t, d]) => (
          <li key={t} className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/60 px-3 py-2.5">
            <span className="block font-semibold text-[var(--fg-1)]">{t}</span>
            <span className="block text-[var(--fg-3)] mt-0.5">{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" onClick={onUpload}>
          <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Open Upload Center</span>
        </Button>
        <span className="text-[12px] text-[var(--fg-3)]">
          CSV files are recognised by their columns: a time, an account / UPI id or mobile number, and at least one of IMEI, IMSI, IP, Wi-Fi BSSID or device id.
        </span>
      </div>
    </div>
  </section>
);

export const DeviceSimScreen = withActiveCase(DeviceSimScreenInner);
