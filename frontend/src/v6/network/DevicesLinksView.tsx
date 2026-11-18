/**
 * Network step, second tab: which accounts in the focused network share a phone / SIM / Wi-Fi / IP, and which other
 * cases share accounts with it. Device logic and the cluster graph come from the Devices page (deviceSelectors,
 * DevicePanels); this view only scopes them to the Network page's focus.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, FolderSearch, Network, RotateCcw, Smartphone, Upload, X } from 'lucide-react';
import clsx from 'clsx';
import apiClient from '../../api/client';
import { CANONICAL_CASES } from '../../fixtures/cases';
import { setFocus, useFocus } from '../../lib/focusUrl';
import { useCaseStore } from '../../store/useCaseStore';
import {
  KIND_META,
  demoDeviceRows,
  demoSimChanges,
  deviceHeadline,
  istTime,
  rowValue,
  rowsFromServer,
  scopeDevices,
  viewFromRows,
  viewFromServer,
  type DeviceKind,
  type DeviceRow,
  type DevicesResponse,
} from '../../selectors/deviceSelectors';
import { ClusterGraph, SourceRowsDialog, type RowsRequest } from '../devices/DevicePanels';
import { Button, EmptyState, Skeleton } from '../ui';
import type { NetworksResponse } from '../triage/triage';
import { ID_KIND, crossCaseLinks, fixtureCaseHits, fixtureNetworks, idKindLabel, linkSentence, resolveFocus, type CaseLink } from './networkFocus';

const enc = encodeURIComponent;
const n0 = (n: number) => n.toLocaleString('en-IN');
const card = 'v6-glass rounded-2xl';

export const DevicesLinksView: React.FC<{ onOpenCase: (caseId: string, account: string | null) => void }> = ({ onOpenCase }) => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const demo = CANONICAL_CASES[caseId] ?? null; // demo cases carry device facts in their record; uploads read the server

  const networksQ = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)).data,
    enabled: !demo,
  });
  const devicesQ = useQuery({
    queryKey: ['devices', caseId],
    queryFn: async () => (await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/devices`)).data,
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

  // Same focus as the Money networks tab; a stale network id falls back to the whole case.
  const urlFocus = useFocus();
  const { zoom, network, member } = resolveFocus(nets ?? [], { net: urlFocus.networkId, acct: urlFocus.account });
  const devFocus = { networkId: network && zoom !== 'project' ? network.network_id : null, account: member?.id ?? null };
  const scoped = useMemo(() => (view ? scopeDevices(view, devFocus, nets) : null), [view, devFocus.networkId, devFocus.account, nets]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = scoped?.view ?? null;
  const outside = (k: string) => !!scoped?.scope && !scoped.scope.has(k);
  const scopeLabel = zoom === 'account' ? 'linked to this account' : zoom === 'network' ? 'in this network' : 'in this case';

  const links = useMemo(() => {
    const members = member ? [member] : network && zoom !== 'project' ? network.members : (nets ?? []).flatMap((n) => n.members);
    const hits = demo ? fixtureCaseHits(demo) : networksQ.data?.cross_case_hits ?? [];
    return crossCaseLinks(members, hits);
  }, [member, network, zoom, nets, demo, networksQ.data]);

  const [clusterId, setClusterId] = useState<string | null>(null);
  const selected = v?.clusters.find((c) => c.id === clusterId) ?? v?.clusters[0] ?? null;

  const [rowsReq, setRowsReq] = useState<RowsRequest | null>(null);
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

  const loading = !demo && (networksQ.isLoading || devicesQ.isLoading);
  const failed = !demo && (networksQ.isError || devicesQ.isError) && !view;
  const openAccount = (key: string) => setFocus({ networkId: network?.network_id ?? null, account: key });

  if (loading)
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-3" data-testid="v6-devices-links-loading">
        <div className={`${card} p-5 space-y-3`}>
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-48" />
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}
        </div>
        <div className={`${card} p-5 space-y-3`}>
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      </div>
    );
  if (failed)
    return (
      <EmptyState
        icon={<Network className="w-6 h-6" />}
        title="Could not load device and case links"
        description="The TARKA server did not answer. Check that it is running, then try again."
        action={
          <Button size="sm" onClick={() => void Promise.all([networksQ.refetch(), devicesQ.refetch()])}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try again
          </Button>
        }
      />
    );

  const scopeName = member ? member.label : network && zoom !== 'project' ? network.network_id : `all of ${caseId}`;

  return (
    <div className="space-y-3" data-testid="v6-devices-links">
      <div className="flex flex-wrap items-center gap-2 text-[13px] min-h-[30px]">
        <span className="text-[var(--fg-3)]">Showing</span>
        <span className="v6-mono font-semibold text-[var(--fg-1)] truncate max-w-[360px]" title={scopeName}>
          {scopeName}
        </span>
        {(urlFocus.networkId || urlFocus.account) && (
          <button
            onClick={() => setFocus({ networkId: member && network && (nets?.length ?? 0) > 1 ? network.network_id : null, account: null })}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5 text-[12px] text-[var(--fg-2)] hover:bg-[var(--hover)]"
            title={member ? 'Widen to the whole network' : 'Widen to the whole case'}
          >
            <X className="w-3 h-3" /> {member ? 'whole network' : 'whole case'}
          </button>
        )}
        <span className="text-[var(--fg-3)]">· pick a network or account on the Money networks tab to narrow this</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-3 items-start">
        {/* ---------- shared devices ---------- */}
        <section className={`${card} overflow-hidden`} aria-labelledby="shared-devices-h">
          <header className="px-5 pt-4 pb-3 border-b border-[var(--line)]">
            <h2 id="shared-devices-h" className="text-[14.5px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[var(--accent)]" /> Shared phones, SIMs and Wi-Fi
            </h2>
            {v?.hasData && <p className="text-[12.5px] text-[var(--fg-2)] mt-1">{deviceHeadline(v, scopeLabel)}</p>}
          </header>

          {!view?.hasData ? (
            <div className="p-5">
              <EmptyState
                icon={<Smartphone className="w-6 h-6" />}
                title="No phone, SIM or Wi-Fi records in this case yet"
                description="Bank statements say who paid whom, not which phone they used. Call records and bank login logs show when two accounts are run from the same handset, SIM or Wi-Fi."
                action={
                  <Button size="sm" variant="primary" onClick={() => setActiveView('upload')}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload call records or bank login logs
                  </Button>
                }
              />
            </div>
          ) : !v || v.clusters.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-[var(--fg-3)]" data-testid="no-shared-devices">
              No account {scopeLabel} shares a phone, SIM, Wi-Fi router or internet address with another account.
            </p>
          ) : (
            <>
              {v.clusters.length > 1 && (
                <div role="tablist" aria-label="Groups of accounts" className="flex flex-wrap gap-1.5 px-5 pt-3">
                  {v.clusters.map((c, i) => (
                    <button
                      key={c.id}
                      role="tab"
                      aria-selected={selected?.id === c.id}
                      onClick={() => setClusterId(c.id)}
                      title={KIND_META[c.strongestKind].tip}
                      className={clsx(
                        'rounded-lg px-2.5 py-1 text-[12px] font-medium whitespace-nowrap border',
                        selected?.id === c.id ? 'bg-[var(--accent-bg)] text-[var(--accent)] border-[var(--accent-ring)]' : 'border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]',
                      )}
                    >
                      Group {i + 1} · {KIND_META[c.strongestKind].label} · {n0(c.accounts.length)} accounts
                    </button>
                  ))}
                </div>
              )}
              {selected && (
                <div className="px-5 pt-3 max-w-[560px]">
                  <ClusterGraph cluster={selected} labelOf={labelOf} outside={outside} onAccount={openAccount} />
                  {selected.accounts.some(outside) && <p className="text-[11.5px] text-[var(--fg-3)] mt-1">Hollow dots are accounts outside {network && zoom !== 'project' ? 'this network' : 'the selection'}.</p>}
                </div>
              )}
              <div className="px-5 py-3 overflow-x-auto">
                <table className="w-full table-fixed text-[12.5px] border-collapse" data-testid="shared-device-table">
                  <thead>
                    <tr className="text-left text-[11.5px] text-[var(--fg-3)]">
                      <th className="w-[26%] py-1.5 pr-3 font-medium">What is shared</th>
                      <th className="w-[28%] py-1.5 pr-3 font-medium">Value</th>
                      <th className="w-[12%] py-1.5 pr-3 font-medium text-right">Accounts</th>
                      <th className="w-[12%] py-1.5 pr-3 font-medium text-right" title="Records in the uploaded files that show this value on one of these accounts">
                        <span className="underline decoration-dotted underline-offset-2">Records</span>
                      </th>
                      <th className="py-1.5 font-medium">Seen (IST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected?.links.map((l) => (
                      <tr key={`${l.kind}:${l.value}`} className="border-t border-[var(--line)] align-top">
                        <td className="py-2 pr-3">
                          <span className="font-medium text-[var(--fg-1)]" title={KIND_META[l.kind].tip}>
                            {KIND_META[l.kind].label}
                          </span>
                          {KIND_META[l.kind].strength === 'weak' && <span className="block text-[11px] text-[var(--fg-3)]">weaker on its own</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="block truncate v6-mono text-[var(--fg-2)]" title={l.value}>
                            {l.value}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums" title={l.accounts.map(labelOf).join(', ')}>
                          {n0(l.accounts.length)}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <button
                            className="tabular-nums font-semibold text-[var(--fg-1)] underline decoration-dotted underline-offset-4 decoration-current/40 hover:decoration-current"
                            onClick={() => setRowsReq({ title: `${KIND_META[l.kind].label}: ${l.value}`, kind: l.kind, value: l.value })}
                            title="Show the records behind this number"
                            data-testid="device-records"
                          >
                            {n0(l.events)}
                          </button>
                        </td>
                        <td className="py-2 text-[11.5px] text-[var(--fg-3)]">
                          <span className="block truncate" title={`${istTime(l.firstTs)} → ${istTime(l.lastTs)}`}>
                            {l.firstTs === null ? '—' : l.firstTs === l.lastTs ? istTime(l.firstTs) : `${istTime(l.firstTs)} → ${istTime(l.lastTs)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* ---------- other cases ---------- */}
        <CaseLinks links={links} scope={member ? 'this account' : network && zoom !== 'project' ? 'this network' : 'this case'} onOpenCase={onOpenCase} />
      </div>

      <SourceRowsDialog request={rowsReq} rows={dialogRows} loading={!demo && rowsQ.isLoading} error={!demo && rowsQ.isError} labelOf={labelOf} onClose={() => setRowsReq(null)} />
    </div>
  );
};

const CaseLinks: React.FC<{ links: CaseLink[]; scope: string; onOpenCase: (caseId: string, account: string | null) => void }> = ({ links, scope, onOpenCase }) => {
  const [limit, setLimit] = useState(12);
  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="case-links-h" data-testid="case-links">
      <header className="px-5 pt-4 pb-3 border-b border-[var(--line)]">
        <h2 id="case-links-h" className="text-[14.5px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
          <FolderSearch className="w-4 h-4 text-[var(--accent)]" /> Other cases with the same accounts
        </h2>
        <p className="text-[12.5px] text-[var(--fg-2)] mt-1">
          {links.length
            ? `${n0(links.length)} other case${links.length === 1 ? '' : 's'} you can open share${links.length === 1 ? 's' : ''} an account, UPI ID, phone or device with ${scope}.`
            : 'Only cases you are allowed to open are checked.'}
        </p>
      </header>
      {links.length === 0 ? (
        <p className="px-5 py-8 text-[13px] text-[var(--fg-3)]" data-testid="no-case-links">
          No other case shares an account, UPI ID, phone or device with {scope}.
        </p>
      ) : (
        <ol className="divide-y divide-[var(--line)]">
          {links.slice(0, limit).map((l) => {
            const first = l.items.find((i) => i.member)?.member ?? null;
            return (
              <li key={l.caseId} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[var(--fg-1)]">
                      Shares <b>{linkSentence(l)}</b> with <span className="v6-mono font-semibold">{l.caseId}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {l.items.slice(0, 4).map((i) => (
                        <button
                          key={i.identifier}
                          onClick={() => onOpenCase(l.caseId, i.member?.id ?? null)}
                          title={`${idKindLabel(i.kind)}${ID_KIND[i.kind]?.tip ? ` (${ID_KIND[i.kind].tip})` : ''}: ${i.identifier}. Open it in ${l.caseId}.`}
                          className="max-w-[200px] truncate rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[11.5px] v6-mono text-[var(--fg-2)] hover:border-[var(--accent-ring)] hover:text-[var(--fg-1)]"
                        >
                          {i.identifier}
                        </button>
                      ))}
                      {l.items.length > 4 && <span className="text-[11.5px] text-[var(--fg-3)] self-center">+{n0(l.items.length - 4)} more</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="default" onClick={() => onOpenCase(l.caseId, first?.id ?? null)} title={`Open ${l.caseId} on its Network page`}>
                    <span className="flex items-center gap-1">
                      Open <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </Button>
                </div>
              </li>
            );
          })}
          {links.length > limit && (
            <li className="px-5 py-2">
              <Button size="sm" variant="ghost" onClick={() => setLimit((x) => x + 20)}>
                Show {Math.min(20, links.length - limit)} more cases
              </Button>
            </li>
          )}
        </ol>
      )}
    </section>
  );
};
