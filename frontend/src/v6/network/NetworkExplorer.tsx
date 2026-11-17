import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Sigma from 'sigma';
import type { NodeHoverDrawingFunction } from 'sigma/rendering';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Gauge, Network, RotateCcw, Upload } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { formatInr } from '../../lib/formatInr';
import { useCaseFixture } from '../../selectors/bundleAdapter';
import { useV6Theme } from '../shell/useV6Theme';
import { Button, EmptyState, Skeleton } from '../ui';
import type { NetworksResponse } from '../triage/triage';
import { buildExplorerGraph, layerKey, layerOf, memberKey, mix, syntheticNetworks, victimToCashOutPath, type NodeAttrs, type Palette } from './networkGraph';
import { STATUS_META, crossCaseByMember, fixtureNetworks, focusSearch, networkTotals, parseFocus, resolveFocus, statusOf, type Focus, type NetworkStatus } from './networkFocus';
import { AccountPanel, CrossCaseBadge, DecisionBar, NetworkPanel, ProjectPanel, type Net } from './NetworkPanels';

const LAYER_CAP = 40; // accounts drawn per hop layer before the rest fold into "+N more"

const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 404) return 'The server has no network analysis for this case yet.';
    return e.response ? `Server replied ${e.response.status}.` : 'Could not reach the TARKA server.';
  }
  return e instanceof Error ? e.message : String(e);
};

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readTheme = () => {
  const fg3 = cssVar('--fg-3');
  const surface = cssVar('--surface-1');
  return {
    palette: { cool: fg3, hot: cssVar('--risk'), victim: cssVar('--safe'), bubble: fg3, edge: mix(fg3, surface, 0.55), hub: mix(fg3, surface, 0.45) } as Palette,
    status: Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, cssVar(v.token)])) as Record<NetworkStatus, string>,
    accent: cssVar('--accent'),
    fg: cssVar('--fg-1'),
    fg3,
    surface,
    line: cssVar('--line'),
    faded: cssVar('--surface-3'),
  };
};
type Look = ReturnType<typeof readTheme>;

// Hover card in the theme's colours (sigma's default is always white).
const hoverDrawer =
  (t: Look): NodeHoverDrawingFunction<NodeAttrs> =>
  (ctx, d, s) => {
    const size = s.labelSize;
    ctx.font = `600 ${size}px ${s.labelFont}`;
    const w = d.label ? ctx.measureText(d.label).width + 14 : 0;
    ctx.fillStyle = t.surface;
    ctx.strokeStyle = t.line;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.roundRect(d.x - d.size - 3, d.y - size / 2 - 6, w + d.size * 2 + 6, size + 12, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size + 2, 0, Math.PI * 2);
    ctx.fill();
    if (d.label) {
      ctx.fillStyle = t.fg;
      ctx.fillText(d.label, d.x + d.size + 6, d.y + size / 3);
    }
  };

/** Focus lives in the URL (?net=&acct=) so Back/Forward and shared links land on the same zoom. */
function useUrlFocus(): [Focus, (f: Focus) => void] {
  const [focus, setFocus] = useState<Focus>(() => parseFocus(window.location.search));
  useEffect(() => {
    const on = () => setFocus(parseFocus(window.location.search));
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const go = useCallback((f: Focus) => {
    const search = focusSearch(window.location.search, f);
    if (search !== window.location.search) window.history.pushState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
    setFocus(f);
  }, []);
  return [focus, go];
}

export const NetworkExplorer: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const stress = Number(new URLSearchParams(window.location.search).get('stress')) || 0;
  const q = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse & { networks: Net[] }>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks`)).data,
    enabled: !stress,
  });
  const { fixture, isLoading: fixtureLoading } = useCaseFixture(stress ? null : caseId);
  const fromServer = (q.data?.networks.length ?? 0) > 0;
  const nets: Net[] = useMemo(
    () => (stress ? syntheticNetworks(stress) : fromServer ? q.data!.networks : fixture ? fixtureNetworks(fixture) : []),
    [stress, fromServer, q.data, fixture],
  );
  const hits = useMemo(() => q.data?.cross_case_hits ?? [], [q.data]);
  const totals = useMemo(() => networkTotals(nets), [nets]);

  const [focus, go] = useUrlFocus();
  const { zoom, network, member } = resolveFocus(nets, focus);
  const crossByMember = useMemo(() => (network ? crossCaseByMember(network.members, hits) : new Map<string, string[]>()), [network, hits]);
  const crossByNet = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!hits.length || nets.length > 2000) return m;
    for (const n of nets) {
      const cases = new Set<string>();
      for (const v of crossCaseByMember(n.members, hits).values()) v.forEach((c) => cases.add(c));
      if (cases.size) m.set(n.network_id, [...cases]);
    }
    return m;
  }, [nets, hits]);

  const [filter, setFilter] = useState<NetworkStatus | null>(null);
  const [hoverNet, setHoverNet] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [path, setPath] = useState<{ nodes: Set<string>; edges: Set<string> } | null>(null);
  const [pathNote, setPathNote] = useState<string | null>(null);
  const [fps, setFps] = useState<string | null>(null);
  const { theme } = useV6Theme();
  const look = useMemo(readTheme, [theme]);

  // New case or new network: drop the route and folded-layer state.
  useEffect(() => {
    setPath(null);
    setPathNote(null);
    setExpanded(new Set());
  }, [caseId, network?.network_id]);

  const graph = useMemo(() => {
    if (stress) return buildExplorerGraph(nets, new Set(nets.map((n) => n.network_id)), look.palette);
    if (zoom === 'project') return buildExplorerGraph(nets, new Set(), look.palette, { bubbleColor: (n) => look.status[statusOf(n as Net)] });
    return buildExplorerGraph([network!], new Set([network!.network_id]), look.palette, { layerCap: LAYER_CAP, expandedLayers: expanded });
    // network object identity changes on refetch; its id + members are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stress, zoom === 'project' ? nets : network, look, expanded]);

  const selectedKey = member && network ? memberKey(network.network_id, member.id) : null;
  const neighbours = useMemo(() => (selectedKey && graph.hasNode(selectedKey) ? new Set(graph.neighbors(selectedKey)) : null), [graph, selectedKey]);
  const maxEdge = useMemo(() => {
    let m = 0;
    graph.forEachEdge((_, a) => (m = Math.max(m, (a as { amount?: number }).amount ?? 0)));
    return m;
  }, [graph]);

  const container = useRef<HTMLDivElement>(null);
  const sigma = useRef<Sigma<NodeAttrs> | null>(null);
  const live = useRef({ path, selectedKey, neighbours, look, hoverNet, filter, zoom, maxEdge });
  live.current = { path, selectedKey, neighbours, look, hoverNet, filter, zoom, maxEdge };
  const nav = useRef({ go, network });
  nav.current = { go, network };

  const hasData = nets.length > 0;
  const loading = !stress && (q.isLoading || (fixtureLoading && !q.data?.networks.length));
  // the canvas div only exists once the skeleton is gone, so mount sigma on that, not on data alone
  const canvasReady = hasData && !loading;
  useEffect(() => {
    if (!container.current || !canvasReady) return;
    const s = new Sigma<NodeAttrs>(graph, container.current, {
      defaultEdgeType: 'arrow',
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelWeight: '600',
      labelRenderedSizeThreshold: 6,
      zIndex: true,
      stagePadding: 90, // room for labels right of the last column
      hideEdgesOnMove: graph.order > 20_000,
      nodeReducer: (key, d) => {
        const { path: p, selectedKey: sel, neighbours: nb, look: t, hoverNet: hn, filter: f } = live.current;
        if (d.kind === 'bubble') {
          const statusOk = !f || statusOf(nets.find((n) => n.network_id === d.networkId) as Net) === f;
          const out = { ...d, borderColor: t.surface };
          if (!statusOk) return { ...out, color: t.faded, label: '', zIndex: 0 };
          return d.networkId === hn ? { ...out, highlighted: true, forceLabel: true, zIndex: 2, size: d.size + 3 } : out;
        }
        if (p) return p.nodes.has(key) ? { ...d, forceLabel: true, zIndex: 2, size: d.size + 2 } : { ...d, color: t.faded, label: '', zIndex: 0 };
        if (sel) {
          if (key === sel) return { ...d, highlighted: true, forceLabel: true, zIndex: 3, size: d.size + 3 };
          if (nb?.has(key)) return { ...d, forceLabel: true, zIndex: 2 };
          return { ...d, color: t.faded, label: '', zIndex: 0 };
        }
        // hubs stay quiet: smaller label priority, no forced label
        return d.hub ? { ...d, label: d.label, zIndex: 0 } : { ...d, zIndex: 1 };
      },
      edgeReducer: (key, d) => {
        const { path: p, look: t, selectedKey: sel, maxEdge: mx } = live.current;
        const amt = (d as { amount?: number }).amount ?? 0;
        const base = { ...d, size: mx > 0 ? 0.6 + 3 * Math.sqrt(amt / mx) : 1 };
        if (p) return p.edges.has(key) ? { ...base, color: t.accent, size: base.size + 2, zIndex: 1 } : { ...base, color: t.faded, zIndex: 0 };
        if (sel) {
          const g = sigma.current?.getGraph();
          const touches = !!g && (g.source(key) === sel || g.target(key) === sel);
          return touches ? { ...base, color: t.accent, zIndex: 1 } : { ...base, color: t.faded, zIndex: 0 };
        }
        return base;
      },
    });
    sigma.current = s;
    // sigma only listens to window resize: also refit when the panel resizes or the pixel ratio changes
    const refit = () => {
      s.resize(true);
      s.refresh();
    };
    const ro = new ResizeObserver(refit);
    ro.observe(container.current);
    let dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    const onDpr = () => {
      refit();
      dprQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      dprQuery.addEventListener('change', onDpr, { once: true });
    };
    dprQuery.addEventListener('change', onDpr, { once: true });
    s.on('clickNode', ({ node }) => {
      const a = s.getGraph().getNodeAttributes(node);
      const { go: to } = nav.current;
      if (a.kind === 'bubble') to({ net: a.networkId, acct: null });
      else if (a.kind === 'group') setExpanded((e) => new Set(e).add(layerKey(a.networkId, a.layer!)));
      else to({ net: a.networkId, acct: a.memberId ?? null });
    });
    s.on('clickStage', () => {
      const { go: to, network: n } = nav.current;
      if (live.current.zoom === 'account' && n) to({ net: n.network_id, acct: null });
    });
    s.on('enterNode', ({ node }) => {
      container.current?.style.setProperty('cursor', 'pointer');
      const a = s.getGraph().getNodeAttributes(node);
      if (a.kind === 'bubble') setHoverNet(a.networkId);
    });
    s.on('leaveNode', () => {
      container.current?.style.removeProperty('cursor');
      setHoverNet(null);
    });
    return () => {
      ro.disconnect();
      dprQuery.removeEventListener('change', onDpr);
      s.kill();
      sigma.current = null;
    };
    // the instance lives while there is data; graph swaps go through setGraph below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady]);

  // Swap graphs and re-frame when the zoom level or network changes.
  const framed = useRef<string>('');
  useEffect(() => {
    const s = sigma.current;
    if (!s) return;
    if (s.getGraph() !== graph) s.setGraph(graph);
    s.setSetting('labelColor', { color: look.fg });
    s.setSetting('defaultDrawNodeHover', hoverDrawer(look));
    const frame = `${zoom}|${network?.network_id ?? ''}`;
    const cam = s.getCamera();
    if (frame !== framed.current && zoom !== 'account') {
      framed.current = frame;
      void cam.animatedReset({ duration: 450 });
    }
    if (zoom === 'account' && selectedKey && graph.hasNode(selectedKey)) {
      framed.current = frame;
      requestAnimationFrame(() => {
        const d = s.getNodeDisplayData(selectedKey);
        if (d) void cam.animate({ x: d.x, y: d.y, ratio: Math.min(cam.ratio, 0.6) }, { duration: 450 });
      });
    }
    s.refresh();
  }, [graph, look, path, selectedKey, neighbours, hoverNet, filter, zoom, network?.network_id]);

  const showPath = (throughId?: string) => {
    if (!network) return;
    if (path && !throughId) {
      setPath(null);
      setPathNote(null);
      return;
    }
    const r = victimToCashOutPath(network);
    if (!r.ok) {
      setPath(null);
      setPathNote(r.reason);
      return;
    }
    let ids = r.path;
    if (throughId && !ids.includes(throughId)) {
      // shortest route into the account, then onwards; fall back to just its direct links
      const into = victimToCashOutPath({ ...network, members: network.members.map((m) => (m.id === throughId ? { ...m, hop: 1e9 } : m)) });
      ids = into.ok && into.path[into.path.length - 1] === throughId ? into.path : [throughId];
    }
    // unfold any layer the route passes through, so every step is visible
    const layer = layerOf(network);
    setExpanded((e) => {
      const next = new Set(e);
      for (const id of ids) {
        const m = network.members.find((x) => x.id === id);
        if (m) next.add(layerKey(network.network_id, layer(m)));
      }
      return next;
    });
    const keys = ids.map((id) => memberKey(network.network_id, id));
    setPath({ nodes: new Set(keys), edges: new Set(keys.slice(1).map((k, i) => `${keys[i]}>${k}`)) });
    const last = network.members.find((m) => m.id === ids[ids.length - 1])?.label ?? 'the last account';
    setPathNote(ids.length > 1 ? `${ids.length - 1} hop${ids.length === 2 ? '' : 's'} from the victim to ${last}` : 'No victim money reaches this account inside the network.');
  };

  const measureFps = () => {
    const s = sigma.current;
    if (!s) return;
    let frames = 0;
    const count = () => frames++;
    s.on('afterRender', count);
    const cam = s.getCamera();
    const t0 = performance.now();
    void cam
      .animate({ ratio: 0.2, angle: 0.6 }, { duration: 1500 })
      .then(() => cam.animate({ ratio: 1, angle: 0 }, { duration: 1500 }))
      .then(() => {
        s.off('afterRender', count);
        const v = (frames * 1000) / (performance.now() - t0);
        setFps(`${v.toFixed(0)} fps over ${graph.order.toLocaleString('en-IN')} accounts, ${graph.size.toLocaleString('en-IN')} links`);
      });
  };

  const glass = 'v6-glass rounded-2xl';
  const height = 'h-[calc(100vh-232px)] min-h-[520px]';

  if (loading)
    return (
      <div className={`grid grid-cols-[1fr_340px] gap-3 ${height}`} data-testid="v6-network-explorer-loading">
        <div className={`${glass} relative overflow-hidden`}>
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex items-end gap-5">
              {[38, 72, 26, 54, 44].map((s, i) => (
                <Skeleton key={i} variant="circle" width={s} height={s} style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-[12px] text-[var(--fg-3)]">Finding who paid whom…</p>
        </div>
        <div className={`${glass} p-4 space-y-3`}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      </div>
    );
  if (!stress && q.isError && !nets.length)
    return (
      <EmptyState
        icon={<Network className="w-6 h-6" />}
        title="Could not load the network"
        description={errText(q.error)}
        action={
          <Button size="sm" onClick={() => void q.refetch()}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try again
          </Button>
        }
      />
    );
  if (!hasData)
    return (
      <EmptyState
        icon={<Network className="w-6 h-6" />}
        title="No money networks in this case yet"
        description="Upload bank or UPI statements. TARKA links accounts that pass money between each other and shows each gang here."
        action={
          <Button size="sm" variant="primary" onClick={() => setActiveView('upload')}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload statements
          </Button>
        }
      />
    );

  const crumb = 'max-w-[240px] truncate rounded-md px-1.5 py-0.5';
  const canDecide = fromServer && !stress;

  return (
    <div className="space-y-2.5" data-testid="v6-network-explorer" data-zoom={zoom}>
      {/* breadcrumb + decision bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-[38px]">
        <nav aria-label="Network zoom" className="flex items-center gap-1 text-[13px] min-w-0">
          <button
            className={`${crumb} ${zoom === 'project' ? 'font-semibold text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]'}`}
            onClick={() => go({ net: null, acct: null })}
            disabled={nets.length === 1 && zoom === 'network'}
            aria-current={zoom === 'project' ? 'page' : undefined}
            title={`All ${totals.networks.toLocaleString('en-IN')} networks in ${caseId}`}
          >
            {nets.length === 1 ? caseId : `All networks · ${totals.networks.toLocaleString('en-IN')}`}
          </button>
          {network && nets.length > 1 && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
              <button
                className={`${crumb} v6-mono ${zoom === 'network' ? 'font-semibold text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]'}`}
                onClick={() => go({ net: network.network_id, acct: null })}
                aria-current={zoom === 'network' ? 'page' : undefined}
                title={network.network_id}
              >
                {network.network_id}
              </button>
            </>
          )}
          {member && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
              <span className={`${crumb} v6-mono font-semibold text-[var(--fg-1)]`} aria-current="page" title={member.label}>
                {member.label}
              </span>
            </>
          )}
        </nav>
        {network && (
          <span className="text-[12px] text-[var(--fg-3)] whitespace-nowrap">
            {network.mule_count.toLocaleString('en-IN')} mules · {network.victim_count.toLocaleString('en-IN')} victims · {formatInr(network.amount_inr || 0, { compact: true })}
          </span>
        )}
        {network && <CrossCaseBadge cases={crossByNet.get(network.network_id) ?? []} />}
        {stress > 0 && (
          <Button size="sm" variant="ghost" onClick={measureFps} title="Zoom and rotate for 3 seconds and count frames">
            <Gauge className="w-3.5 h-3.5 mr-1" /> {fps ?? 'Measure frame rate'}
          </Button>
        )}
      </div>
      <AnimatePresence initial={false} mode="wait">
        {network && !stress && (
          <motion.div key={network.network_id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <DecisionBar caseId={caseId} n={network} saved={canDecide} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`grid grid-cols-[minmax(0,1fr)_340px] gap-3 ${network && !stress ? 'h-[calc(100vh-290px)]' : height} min-h-[480px]`}>
        <div className={`${glass} flex flex-col overflow-hidden`}>
          <div className="relative flex-1 min-h-0">
            <div ref={container} className="absolute inset-0" aria-label={zoom === 'project' ? 'All money networks in this case' : `Accounts in ${network?.network_id}`} role="img" />
          </div>
          <Legend zoom={zoom} look={look} hasGroups={graph.someNode((_, a) => a.kind === 'group')} />
        </div>

        <aside className={`${glass} min-h-0 overflow-hidden`} aria-label="Details">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${zoom}|${network?.network_id ?? ''}|${member?.id ?? ''}`}
              className="h-full"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {zoom === 'project' && (
                <ProjectPanel
                  nets={nets}
                  fixture={fixture}
                  totals={totals}
                  crossCounts={crossByNet}
                  filter={filter}
                  onFilter={setFilter}
                  onOpen={(id) => go({ net: id, acct: null })}
                  onHover={setHoverNet}
                />
              )}
              {zoom === 'network' && network && (
                <NetworkPanel
                  n={network}
                  fixture={fixture}
                  crossByMember={crossByMember}
                  pathNote={pathNote}
                  pathOn={!!path}
                  onPath={() => showPath()}
                  onAccount={(id) => go({ net: network.network_id, acct: id })}
                />
              )}
              {zoom === 'account' && network && member && (
                <AccountPanel
                  m={member}
                  n={network}
                  fixture={fixture}
                  crossCases={crossByMember.get(member.id) ?? []}
                  links={{
                    into: new Set((network.links ?? []).filter((l) => l[1] === member.id).map((l) => l[0])).size,
                    out: new Set((network.links ?? []).filter((l) => l[0] === member.id).map((l) => l[1])).size,
                  }}
                  onPathThrough={() => showPath(member.id)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
};

const Legend: React.FC<{ zoom: string; look: Look; hasGroups: boolean }> = ({ zoom, look, hasGroups }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--fg-2)]">
    {zoom === 'project' ? (
      <>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {(Object.keys(STATUS_META) as NetworkStatus[]).map((s) => (
            <StatusDot key={s} color={look.status[s]} label={STATUS_META[s].label} />
          ))}
        </div>
        <div className="text-[var(--fg-3)]">Bubble size = money victims paid in. Click a bubble to open the gang.</div>
      </>
    ) : (
      <>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span title="How strongly an account behaves like a mule: money in and straight out again, in a short burst">Mule heat</span>
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${look.palette.cool}, ${look.palette.hot})` }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusDot color={look.palette.victim} label="victim" />
          <StatusDot color={look.palette.hub!} label="ATM / shop (shared by everyone)" />
          <StatusDot color={look.accent} label="route" />
        </div>
        <div className="text-[var(--fg-3)]">
          Money flows left → right, one column per hop from the victim.{hasGroups ? ' Click a “+N more” dot to show the whole column.' : ''}
        </div>
      </>
    )}
  </div>
);

const StatusDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="flex items-center gap-1 whitespace-nowrap">
    <i className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /> {label}
  </span>
);

export default NetworkExplorer;
