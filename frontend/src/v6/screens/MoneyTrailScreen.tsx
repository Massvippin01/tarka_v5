import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as echarts from 'echarts';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Pause, Play, RotateCcw, ShieldCheck, Snowflake, Upload, Waypoints } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { formatInr, formatInrCompact, pctOf } from '../../lib/formatInr';
import { setFocus, useFocus } from '../../lib/focusUrl';
import { selectMoneyFigure, type MoneyFigure } from '../../selectors/caseSelectors';
import {
  LAYERS,
  reconcileGap,
  replayAt,
  selectDoctrine,
  selectFlowGraph,
  selectFreezeQueue,
  selectMoneyScope,
  selectReplay,
  withTimes,
  type FlowBox,
  type FlowGraph,
  type LayerId,
  type MoneyScope,
  type Replay,
} from '../../selectors/moneySelectors';
import { fixtureNetworks, memberFigure, networkFigure } from '../network/networkFocus';
import type { Net } from '../network/NetworkPanels';
import type { NetworksResponse } from '../triage/triage';
import { useV6Theme } from '../shell/useV6Theme';
import { Button, EmptyState, PageHead, Skeleton, SourceNumber } from '../ui';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';
import type { CanonicalCaseFixture } from '../../fixtures/cases';

const FREEZE_SHOWN = 8;
const card = 'v6-glass rounded-2xl';
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const withTotal = (f: MoneyFigure, totalInr: number): MoneyFigure => ({ ...f, totalInr });

/* ---------- hero ---------- */

const HERO_TEXT = {
  project: ['lost by victims', 'still recoverable', 'already cashed out'],
  network: ['lost by victims', 'still recoverable', 'already cashed out'],
  account: ['received', 'still in this account', 'moved on'],
} as const;

const Hero: React.FC<{ c: CanonicalCaseFixture; s: MoneyScope }> = ({ c, s }) => {
  const figs = useMemo(() => {
    if (s.level === 'project')
      return [selectMoneyFigure(c, 'loss'), selectMoneyFigure(c, 'recoverable'), selectMoneyFigure(c, 'cashout')];
    if (s.level === 'network') return (['paidIn', 'recoverable', 'cashedOut'] as const).map((k) => networkFigure(c, s.network!, k));
    return (['in', 'held', 'out'] as const).map((k) => memberFigure(c, s.member!, k));
  }, [c, s]);
  const values = [s.lossInr, s.recoverableInr, s.cashedOutInr];
  const text = HERO_TEXT[s.level];
  const gap = s.level === 'account' ? 0 : reconcileGap(s);
  const parts = [
    { key: 'rec', v: s.recoverableInr, color: 'var(--accent)', label: 'can still be frozen' },
    { key: 'out', v: s.cashedOutInr, color: 'color-mix(in srgb, var(--fg-3) 55%, transparent)', label: s.level === 'account' ? 'moved on' : 'gone as cash' },
    { key: 'unk', v: s.unaccountedInr, color: 'repeating-linear-gradient(135deg, var(--line-2) 0 4px, transparent 4px 8px)', label: 'not traced yet' },
  ].filter((p) => p.v > 0);
  const whole = Math.max(1, s.lossInr);
  return (
    <section className={`${card} px-7 pt-6 pb-5`} aria-label="Money summary" data-testid="money-hero">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        {values.map((v, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight aria-hidden className="w-6 h-6 mb-3 text-[var(--line-2)] flex-none" />}
            <div className="min-w-0">
              <div
                className={`text-[34px] leading-none font-[650] tracking-tight tabular-nums ${i === 1 ? 'text-[var(--accent)]' : i === 2 ? 'text-[var(--fg-2)]' : 'text-[var(--fg-1)]'}`}
                data-testid={`hero-${['loss', 'recoverable', 'cashout'][i]}`}
              >
                <SourceNumber figure={withTotal(figs[i], v)}>{formatInr(v)}</SourceNumber>
              </div>
              <div className="text-[13px] text-[var(--fg-2)] mt-1.5">{text[i]}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]" role="img" aria-label="Where every rupee is now">
        {parts.map((p) => (
          <motion.div
            key={p.key}
            initial={{ width: 0 }}
            animate={{ width: `${(p.v / whole) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ background: p.color }}
            title={`${formatInr(p.v)} ${p.label}`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[var(--fg-2)]">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="tabular-nums font-semibold text-[var(--fg-1)]">{pctOf(p.v, whole)}%</span> {p.label}
            {p.key === 'unk' && <span className="tabular-nums">({formatInrCompact(p.v)})</span>}
          </span>
        ))}
        {gap !== 0 && (
          <span className="inline-flex items-center gap-1 text-[var(--risk)]" title="Lost should equal still held + cashed out + not traced.">
            <AlertTriangle className="w-3.5 h-3.5" /> Figures are off by {formatInr(gap)} — check the network split
          </span>
        )}
      </div>
    </section>
  );
};

/* ---------- breadcrumb ---------- */

const Crumbs: React.FC<{ s: MoneyScope; nets: Net[] }> = ({ s, nets }) => {
  const crumb = 'max-w-[260px] truncate rounded-md px-1.5 py-0.5';
  const link = `${crumb} text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]`;
  const here = `${crumb} font-semibold text-[var(--fg-1)]`;
  if (nets.length <= 1 && s.level !== 'account') return null;
  return (
    <nav aria-label="Zoom level" className="flex items-center gap-1 text-[13px]">
      {nets.length > 1 &&
        (s.level === 'project' ? (
          <span className={here} aria-current="page">All {nets.length} networks</span>
        ) : (
          <button type="button" className={link} onClick={() => setFocus({ networkId: null, account: null })}>All {nets.length} networks</button>
        ))}
      {s.network && (
        <>
          {nets.length > 1 && <ChevronRight className="w-3.5 h-3.5 text-[var(--line-2)]" />}
          {s.level === 'network' ? (
            <span className={`${here} v6-mono`} aria-current="page">{s.network.network_id}</span>
          ) : (
            <button type="button" className={`${link} v6-mono`} onClick={() => setFocus({ networkId: s.network!.network_id, account: null })}>
              {s.network.network_id}
            </button>
          )}
        </>
      )}
      {s.member && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--line-2)]" />
          <span className={`${here} v6-mono`} aria-current="page" title={s.member.label}>{s.member.label}</span>
        </>
      )}
    </nav>
  );
};

/* ---------- flow diagram ---------- */

const FlowChart: React.FC<{ graph: FlowGraph; onPick: (b: FlowBox) => void }> = ({ graph, onPick }) => {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const { theme } = useV6Theme();
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const c = echarts.init(el.current!, undefined, { renderer: 'canvas' });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      c.dispose();
    };
  }, []);

  useEffect(() => {
    const c = chart.current!;
    const color = {
      victims: cssVar('--fg-2'),
      mule: cssVar('--risk'),
      exit: cssVar('--fg-3'),
      held: cssVar('--accent'),
    };
    const fg1 = cssVar('--fg-1');
    const fg3 = cssVar('--fg-3');
    const byId = new Map(graph.boxes.map((b) => [b.id, b]));
    const colorOf = (b: FlowBox) => (b.kind === 'held' ? color.held : b.layer === 'victims' ? color.victims : b.layer === 'exit' ? color.exit : color.mule);
    const maxDepth = Math.max(...graph.boxes.map((b) => b.depth));
    // labels sit between columns: keep them narrower than a column so they never run into the next one
    const labelWidth = Math.max(80, Math.min(170, (el.current!.clientWidth - 40) / Math.max(1, maxDepth) - 34));
    c.setOption(
      {
        animationDuration: 500,
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: (p: { dataType: string; data: { name?: string; source?: string; target?: string; value?: number }; value: number }) => {
            if (p.dataType === 'edge') return `${byId.get(p.data.source!)?.name} → ${byId.get(p.data.target!)?.name}<br/><b>${formatInr(p.value)}</b>`;
            const b = byId.get(p.data.name!)!;
            const hint = b.kind === 'layer' ? 'Click to open this layer' : b.kind === 'more' ? 'Click to fold this layer again' : b.kind === 'account' ? 'Click to zoom into this account' : 'Money a freeze can still hold';
            const full = b.layer && b.kind === 'layer' ? LAYERS.find((l) => l.id === b.layer)!.label : b.name;
            return `<b>${full}</b>${b.count ? ` · ${b.count.toLocaleString('en-IN')} accounts` : ''}<br/>${formatInr(p.value)}<br/><span style="opacity:.7">${hint}</span>`;
          },
        },
        series: [
          {
            type: 'sankey',
            left: 8,
            right: 8,
            top: 12,
            bottom: 12,
            nodeWidth: 12,
            nodeGap: 10,
            nodeAlign: 'justify',
            layoutIterations: 32,
            draggable: false,
            emphasis: { focus: 'adjacency' },
            data: graph.boxes.map((b) => ({
              name: b.id,
              depth: b.depth,
              itemStyle: { color: colorOf(b), borderWidth: 0, borderRadius: 3 },
              label: { position: b.depth === maxDepth ? 'left' : 'right' },
            })),
            links: graph.links,
            lineStyle: { color: 'gradient', opacity: 0.28, curveness: 0.5 },
            label: {
              color: fg1,
              fontSize: 12,
              width: labelWidth,
              overflow: 'truncate',
              formatter: (p: { name: string; value: number }) => {
                const b = byId.get(p.name)!;
                const n = b.kind === 'layer' && b.count ? `${b.name} · ${b.count.toLocaleString('en-IN')}` : b.name;
                return `{n|${n}}\n{v|${formatInrCompact(p.value)}}`;
              },
              rich: { n: { fontWeight: 600, color: fg1, fontSize: 12 }, v: { color: fg3, fontSize: 11.5, padding: [2, 0, 0, 0] } },
            },
          },
        ],
      },
      true,
    );
    c.off('click');
    c.on('click', (p) => {
      if (p.dataType !== 'node') return;
      const b = byId.get((p.data as { name: string }).name);
      if (b) pick.current(b);
    });
  }, [graph, theme]);

  return <div ref={el} className="h-[380px] w-full" data-testid="money-flow-chart" />;
};

const FlowCard: React.FC<{ s: MoneyScope }> = ({ s }) => {
  const [expanded, setExpanded] = useState<Set<LayerId>>(new Set());
  const scopeKey = `${s.level}:${s.network?.network_id ?? ''}:${s.member?.key ?? ''}`;
  useEffect(() => setExpanded(new Set()), [scopeKey]);
  const graph = useMemo(() => selectFlowGraph(s, expanded), [s, expanded]);
  const toggle = (l: LayerId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  const onPick = (b: FlowBox) => {
    if ((b.kind === 'layer' || b.kind === 'more') && b.layer) toggle(b.layer);
    else if (b.kind === 'account' && b.member && b.member.key !== s.member?.key) setFocus({ networkId: b.member.net, account: b.member.id });
  };
  return (
    <section className={`${card} p-5 min-w-0`} aria-label="How the money moved">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-[650] text-[var(--fg-1)]">How the money moved</h2>
          <p className="text-[12.5px] text-[var(--fg-2)] mt-0.5">
            {graph.grouped
              ? `${s.members.length.toLocaleString('en-IN')} accounts grouped by how far they are from the victim. Click a group to see its biggest accounts.`
              : 'Every account, left to right from victim to cash-out. Click an account to zoom in.'}
          </p>
        </div>
        {graph.grouped && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Open a layer">
            {LAYERS.filter((l) => graph.boxes.some((b) => b.layer === l.id)).map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={expanded.has(l.id)}
                onClick={() => toggle(l.id)}
                className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                  expanded.has(l.id)
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                    : 'border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
                }`}
              >
                {l.short}
              </button>
            ))}
          </div>
        )}
      </div>
      {graph.boxes.length ? (
        <FlowChart graph={graph} onPick={onPick} />
      ) : (
        <div className="h-[380px] grid place-items-center text-[13px] text-[var(--fg-2)]">No payments between these accounts to draw.</div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--fg-3)]">
        {[
          ['var(--fg-2)', 'Victims'],
          ['var(--risk)', 'Mule accounts'],
          ['var(--fg-3)', 'Cash-out, ATMs, shops'],
          ['var(--accent)', 'Can still be frozen'],
        ].map(([c, t]) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            {t}
          </span>
        ))}
        {graph.hiddenLinks > 0 && (
          <span title="A flow diagram can only run left to right, so payments inside a layer or back up the chain are left out. They are still counted in every total.">
            {graph.hiddenLinks.toLocaleString('en-IN')} sideways payment{graph.hiddenLinks === 1 ? '' : 's'} not drawn
          </span>
        )}
      </div>
    </section>
  );
};

/* ---------- replay ---------- */

const IST = (ts: number) =>
  new Date(ts * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const since = (sec: number) => {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.round(h / 24)} days`;
};

const ReplayCard: React.FC<{ r: Replay | null }> = ({ r }) => {
  const reduce = useReducedMotion();
  const [t, setT] = useState(r?.end ?? 0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setT(r?.end ?? 0);
    setPlaying(false);
  }, [r]);
  useEffect(() => {
    if (!playing || !r) return;
    if (reduce) {
      setT(r.end);
      setPlaying(false);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const span = Math.max(1, r.end - r.start);
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setT((cur) => {
        const next = Math.min(r.end, cur + (span * dt) / 9000); // whole trail in ~9 s
        if (next >= r.end) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, r, reduce]);

  if (!r)
    return (
      <section className={`${card} p-5`} aria-label="Replay">
        <h2 className="text-[15px] font-[650] text-[var(--fg-1)]">Replay the money</h2>
        <p className="text-[12.5px] text-[var(--fg-2)] mt-2">These statements carry no payment times for the accounts, so the replay can't run. Upload statements with transaction dates to see it.</p>
      </section>
    );

  const at = replayAt(r, t);
  const final = replayAt(r, r.end);
  const lanes = LAYERS.filter((l) => final[l.id].accounts > 0);
  const max = Math.max(1, ...lanes.map((l) => final[l.id].amount));
  const elapsed = t - r.start;
  const golden = elapsed <= 3600;
  const play = () => {
    if (t >= r.end) setT(r.start);
    setPlaying((p) => !p);
  };
  return (
    <section className={`${card} p-5`} aria-label="Replay">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-[650] text-[var(--fg-1)]">Replay the money</h2>
          <p className="text-[12.5px] text-[var(--fg-2)] mt-0.5">Each account counts once, from its first payment.</p>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-[650] tabular-nums text-[var(--fg-1)]" aria-live="polite">{IST(t)}</div>
          <div className={`text-[12px] font-medium ${golden ? 'text-[var(--accent)]' : 'text-[var(--fg-3)]'}`} title="The first hour after a victim pays, when banks can still stop the money most easily.">
            {golden ? `Golden hour: ${Math.max(0, 60 - Math.round(elapsed / 60))} min left` : `${since(elapsed)} after the first payment · golden hour over`}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {lanes.map((l) => (
          <div key={l.id} className="grid grid-cols-[150px_1fr_120px] items-center gap-3 text-[12.5px]">
            <span className="truncate text-[var(--fg-2)]" title={l.label}>{l.label}</span>
            <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: l.id === 'victims' ? 'var(--fg-2)' : l.id === 'exit' ? 'var(--fg-3)' : 'var(--risk)' }}
                animate={{ width: `${(at[l.id].amount / max) * 100}%` }}
                transition={{ duration: playing ? 0 : 0.35 }}
              />
            </div>
            <span className="tabular-nums text-right text-[var(--fg-1)]" title={`${formatInr(at[l.id].amount)} across ${at[l.id].accounts} account(s)`}>
              {formatInrCompact(at[l.id].amount)} <span className="text-[var(--fg-3)]">· {at[l.id].accounts.toLocaleString('en-IN')}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={play} aria-label={playing ? 'Pause replay' : 'Play replay'}>
          {playing ? <Pause className="w-4 h-4" /> : t >= r.end ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <div className="relative flex-1">
          <input
            type="range"
            min={r.start}
            max={r.end}
            step={Math.max(1, Math.round((r.end - r.start) / 400))}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-label="Time"
            className="w-full accent-[var(--accent)]"
          />
          {r.firstExit != null && r.end > r.start && (
            <span
              className="absolute -top-1 w-0.5 h-2 bg-[var(--fg-2)] rounded"
              style={{ left: `${((r.firstExit - r.start) / (r.end - r.start)) * 100}%` }}
              title={`First cash-out ${since(r.firstExit - r.start)} after the first payment`}
            />
          )}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-[var(--fg-3)] tabular-nums">
        <span>{IST(r.start)}</span>
        {r.firstExit != null && <span>First cash-out after {since(r.firstExit - r.start)}</span>}
        <span>{IST(r.end)}</span>
      </div>
    </section>
  );
};

/* ---------- freeze list ---------- */

const FreezeCard: React.FC<{ c: CanonicalCaseFixture; s: MoneyScope; showNet: boolean }> = ({ c, s, showNet }) => {
  const setActiveView = useCaseStore((st) => st.setActiveView);
  const queue = useMemo(() => selectFreezeQueue(s), [s]);
  const total = queue.reduce((a, i) => a + i.heldInr, 0);
  const shown = queue.slice(0, FREEZE_SHOWN);
  return (
    <section className={`${card} p-5 flex flex-col min-w-0`} aria-label="Freeze these first">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-[650] text-[var(--fg-1)]">Freeze these first</h2>
          <p className="text-[12.5px] text-[var(--fg-2)] mt-0.5">Most money held, moved most recently, first.</p>
        </div>
        <Snowflake className="w-4 h-4 text-[var(--accent)] flex-none mt-1" aria-hidden />
      </div>
      {queue.length ? (
        <>
          <div className="mt-3 text-[13px] text-[var(--fg-2)]">
            <span className="font-semibold text-[var(--fg-1)] tabular-nums">{formatInrCompact(total)}</span> in {queue.length.toLocaleString('en-IN')} account{queue.length === 1 ? '' : 's'}
          </div>
          <ol className="mt-2 divide-y divide-[var(--line)]" data-testid="freeze-list">
            {shown.map((i, idx) => (
              <li key={i.member.key} className="py-2.5 grid grid-cols-[20px_1fr_auto] gap-x-2.5 items-start">
                <span className="text-[12px] tabular-nums text-[var(--fg-3)] pt-0.5">{idx + 1}</span>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setFocus({ networkId: i.member.net, account: i.member.id })}
                    className="block max-w-full truncate text-left text-[13px] font-medium text-[var(--fg-1)] v6-mono hover:text-[var(--accent)]"
                    title={`${i.member.label} — open this account`}
                  >
                    {i.member.label}
                  </button>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <span
                      className="h-1 w-10 flex-none rounded-full bg-[var(--surface-2)] overflow-hidden"
                      title={`Urgency ${Math.round(i.urgency * 100)}%: how recently this account moved money`}
                    >
                      <span className="block h-full bg-[var(--accent)]" style={{ width: `${Math.max(8, i.urgency * 100)}%` }} />
                    </span>
                    <span className="truncate text-[11.5px] text-[var(--fg-3)]" title={`${i.reason} — counted from the newest payment in the uploaded statements`}>{i.reason}</span>
                  </div>
                  {showNet && (
                    <button type="button" onClick={() => setFocus({ networkId: i.member.net, account: null })} className="text-[11.5px] v6-mono text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                      {i.member.net}
                    </button>
                  )}
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-[var(--fg-1)]">
                  <SourceNumber figure={withTotal(memberFigure(c, i.member, 'held'), i.heldInr)}>{formatInrCompact(i.heldInr)}</SourceNumber>
                </span>
              </li>
            ))}
          </ol>
          {queue.length > FREEZE_SHOWN && (
            <div className="text-[12px] text-[var(--fg-3)] py-1">+{(queue.length - FREEZE_SHOWN).toLocaleString('en-IN')} more in the Actions queue</div>
          )}
        </>
      ) : (
        <p className="mt-3 text-[13px] text-[var(--fg-2)]">
          No money is left in any mule account here, so there is nothing to freeze. Ask the banks for ATM CCTV and cash-out records instead.
        </p>
      )}
      <div className="mt-auto pt-4">
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center"
          onClick={() => {
            // Actions page reads ?sel= (party keys) once to pre-tick these rows, then removes it
            const p = new URLSearchParams(window.location.search);
            if (shown.length) p.set('sel', shown.map((i) => i.member.id).join(','));
            window.history.replaceState(window.history.state, '', `${window.location.pathname}?${p}${window.location.hash}`);
            setActiveView('actions');
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            Open the freeze queue <ChevronRight className="w-4 h-4" />
          </span>
        </Button>
      </div>
    </section>
  );
};

/* ---------- doctrine ---------- */

const DoctrineCard: React.FC<{ c: CanonicalCaseFixture; s: MoneyScope; recoverable: MoneyFigure }> = ({ c, s, recoverable }) => {
  const opts = useMemo(() => selectDoctrine(c, s), [c, s]);
  return (
    <section className={`${card} p-5`} aria-label="Which tracing rule to use">
      <h2 className="text-[15px] font-[650] text-[var(--fg-1)]">Which tracing rule to use</h2>
      <p className="text-[12.5px] text-[var(--fg-2)] mt-0.5">How much a bank must hold depends on how stolen money is traced.</p>
      <div className="mt-3 space-y-2">
        {opts.map((o) => (
          <div
            key={o.key}
            className={`rounded-xl border p-3 ${o.recommended ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]' : 'border-[var(--line)]'}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold text-[var(--fg-1)] truncate cursor-help" title={o.term}>
                {o.title}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-[var(--fg-1)]">
                <SourceNumber figure={withTotal(recoverable, o.recoverableInr)}>{formatInrCompact(o.recoverableInr)}</SourceNumber>
              </span>
            </div>
            {o.recommended && (
              <span className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-semibold text-[var(--accent)]">
                <ShieldCheck className="w-3.5 h-3.5" /> Recommended
              </span>
            )}
            <p className="text-[12px] text-[var(--fg-2)] mt-1 leading-snug">{o.explain}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ---------- screen ---------- */

const MoneyTrailScreenInner: React.FC<ActiveCaseProps> = ({ fixture }) => {
  const setActiveView = useCaseStore((s) => s.setActiveView);
  const caseId = fixture.caseId;
  const q = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse & { networks: Net[] }>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks`)).data,
  });
  const nets: Net[] = useMemo(() => {
    const server = q.data?.networks ?? [];
    return withTimes(fixture, server.length ? server : fixtureNetworks(fixture));
  }, [q.data, fixture]);
  const f = useFocus();
  const scope = useMemo(() => selectMoneyScope(nets, { net: f.networkId, acct: f.account }), [nets, f.networkId, f.account]);
  const replay = useMemo(() => selectReplay(scope), [scope]);
  const recoverableFig = useMemo(() => {
    if (scope.level === 'project') return selectMoneyFigure(fixture, 'recoverable');
    if (scope.level === 'network') return networkFigure(fixture, scope.network!, 'recoverable');
    return memberFigure(fixture, scope.member!, 'held');
  }, [fixture, scope]);

  const head = (
    <PageHead
      kicker="Step 3 · Money trail"
      title="Where did the money go, and how much can we still freeze?"
      actions={
        <Button variant="default" size="md" onClick={() => setActiveView('network')}>
          <span className="inline-flex items-center gap-1.5">
            <Waypoints className="w-4 h-4" /> See the network
          </span>
        </Button>
      }
    />
  );

  if (q.isLoading && !fixtureNetworks(fixture).length)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading the money trail" data-testid="v6-money-screen">
        {head}
        <Skeleton height={150} className="rounded-2xl" />
        <div className="grid grid-cols-12 gap-4">
          <Skeleton height={440} className="col-span-8 rounded-2xl" />
          <Skeleton height={440} className="col-span-4 rounded-2xl" />
        </div>
      </div>
    );

  if (!nets.length)
    return (
      <div className="space-y-4" data-testid="v6-money-screen">
        {head}
        {q.isError ? (
          <EmptyState
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Couldn't load the money trail"
            description="The TARKA server did not return this case's networks. Check that it is running, then try again."
            action={<Button variant="primary" size="sm" onClick={() => q.refetch()}>Try again</Button>}
          />
        ) : (
          <EmptyState
            icon={<Upload className="w-5 h-5" />}
            title="No money trail yet"
            description="Upload the victims' and suspects' bank or UPI statements. TARKA will trace where the money went and what is still in mule accounts."
            action={<Button variant="primary" size="sm" onClick={() => setActiveView('upload')}>Go to Upload Center</Button>}
          />
        )}
      </div>
    );

  return (
    <div className="v6-enter space-y-4" data-testid="v6-money-screen">
      {head}
      <Crumbs s={scope} nets={nets} />
      <AnimatePresence mode="wait">
        <motion.div key={`${scope.level}:${scope.network?.network_id}:${scope.member?.key}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <Hero c={fixture} s={scope} />
        </motion.div>
      </AnimatePresence>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4 min-w-0">
          <FlowCard s={scope} />
          <ReplayCard r={replay} />
        </div>
        <div className="col-span-12 xl:col-span-4 space-y-4 min-w-0 flex flex-col">
          <FreezeCard c={fixture} s={scope} showNet={scope.level === 'project'} />
          <DoctrineCard c={fixture} s={scope} recoverable={recoverableFig} />
        </div>
      </div>
    </div>
  );
};

export const MoneyTrailScreen = withActiveCase(MoneyTrailScreenInner);
