/**
 * SVG views of the Fraud Network page: the layered gang graph (network / account zoom) and the project bubbles.
 * Labels go through placeLabels(), so they never sit on a node or on each other; they are drawn last on opaque
 * pills, so no money line strikes through text.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { formatInr } from '../../lib/formatInr';
import type { NetworkMember, NetworkSubgroup } from '../triage/triage';
import { GlyphNode, type GlyphKind } from './glyphs';
import { LABEL_FONT, LABEL_H, bubbleRows, layeredLayout, placeLabels, truncate, type LabelRequest } from './graphLayout';
import { STATUS_META, crossCaseText, statusOf, type NetworkStatus } from './networkFocus';
import type { Net } from './NetworkPanels';

/* ---------------- shared bits ---------------- */

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

const Pill: React.FC<{ x: number; y: number; w: number; text: string; full?: string; strong?: boolean; dim?: boolean }> = ({ x, y, w, text, full, strong, dim }) => (
  <g opacity={dim ? 0.35 : 1} pointerEvents="none">
    <title>{full ?? text}</title>
    <rect x={x} y={y} width={w} height={LABEL_H} rx={6} fill="var(--surface-1)" fillOpacity={0.94} stroke={strong ? 'var(--accent)' : 'var(--line)'} />
    <text x={x + 6} y={y + LABEL_H / 2 + LABEL_FONT * 0.36} fontSize={LABEL_FONT} fontWeight={strong ? 650 : 520} fill="var(--fg-1)" className="v6-mono">
      {text}
    </text>
  </g>
);

const ZoomButtons: React.FC<{ onIn: () => void; onOut: () => void; onFit: () => void }> = ({ onIn, onOut, onFit }) => (
  <div className="absolute top-2.5 right-2.5 v6-glass rounded-lg flex flex-col overflow-hidden">
    {[
      [onIn, <Plus key="i" className="w-3.5 h-3.5" />, 'Zoom in'],
      [onOut, <Minus key="o" className="w-3.5 h-3.5" />, 'Zoom out'],
      [onFit, <Maximize key="f" className="w-3.5 h-3.5" />, 'Fit to view'],
    ].map(([fn, icon, label]) => (
      <button key={label as string} onClick={fn as () => void} aria-label={label as string} title={label as string} className="p-1.5 text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]">
        {icon as React.ReactNode}
      </button>
    ))}
  </div>
);

/* ---------------- gang graph ---------------- */

const roleText = (m: NetworkMember) =>
  m.role === 'VICTIM' ? 'Victim' : m.role === 'MULE' ? `Mule, layer ${m.hop ?? '?'}` : m.role === 'CASH_OUT' ? 'Cash-out point' : m.verdict === 'NOT_MULE' ? 'Cleared account' : 'ATM, shop or unclear account';

function look(m: NetworkMember | undefined): { kind: GlyphKind; fill: string; ink: string; dashed?: boolean; stroke?: string } {
  if (!m) return { kind: 'device', fill: 'var(--surface-2)', ink: 'var(--fg-2)', stroke: 'var(--line-2)' };
  if (m.role === 'VICTIM') return { kind: 'victim', fill: 'var(--flow)', ink: 'var(--surface-1)' };
  // layer-1 mules royal blue, deeper layers navy: shade + ring tell them apart, not colour alone
  if (m.role === 'MULE') return (m.hop ?? 1) <= 1 ? { kind: 'mule', fill: 'var(--accent)', ink: 'var(--surface-1)' } : { kind: 'mule', fill: 'var(--fg-1)', ink: 'var(--surface-1)' };
  if (m.role === 'CASH_OUT') return { kind: /atm|cash/i.test(m.label) ? 'cashout' : /binance|wazirx|usdt|crypto|p2p/i.test(m.label) ? 'cashout' : 'bank', fill: 'var(--surface-2)', ink: 'var(--fg-2)', stroke: 'var(--fg-3)' };
  return { kind: 'hub', fill: 'var(--surface-2)', ink: 'var(--fg-3)', dashed: true, stroke: 'var(--line-2)' };
}

const radius = (m?: NetworkMember) => (!m ? 11 : m.role === 'MULE' ? 7.5 + 2.5 * (m.mule_score ?? 0) : m.role === 'VICTIM' ? 7.5 : 8.5);
const ROW = 28; // min vertical gap between dots in one column, px

export const GangSvg: React.FC<{
  network: Net;
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  /** member ids on the highlighted route, in order */
  route: string[] | null;
  crossByMember: Map<string, string[]>;
  onSelect: (id: string | null) => void;
  onExpand: (layer: number) => void;
}> = ({ network, expanded, selectedId, route, crossByMember, onSelect, onExpand }) => {
  const [wrap, { w: W, h: H }] = useSize<HTMLDivElement>();
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);

  // fold each column to what fits at ~ROW px spacing (max 30); "+N more" holds the rest
  const cap = Math.max(6, Math.min(30, Math.floor((H - 52) / ROW) - 1));
  const lay = useMemo(() => layeredLayout(network, cap, expanded), [network, expanded, cap]);
  // reset the camera for a new network
  useEffect(() => {
    setView({ k: 1, tx: 0, ty: 0 });
  }, [network.network_id]);

  // small gangs: every name fits, so show them all; dense ones reveal low-priority names as you zoom
  const dense = lay.nodes.length > 40;
  const M = { l: dense ? 56 : Math.min(160, W * 0.2), r: Math.min(190, W * 0.24), t: 22, b: 22 };
  const base = (x: number, y: number) => ({ x: M.l + x * Math.max(1, W - M.l - M.r), y: M.t + y * Math.max(1, H - M.t - M.b) });
  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    for (const n of lay.nodes) {
      const b = base(n.x, n.y);
      p.set(n.key, { x: b.x * view.k + view.tx, y: b.y * view.k + view.ty });
    }
    return p;
  }, [lay, W, H, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // focus = selected account + its direct counterparties, or the route
  const focus = useMemo(() => {
    if (route?.length) {
      const keys = route.map((id) => lay.nodeOf.get(id) ?? id);
      return { nodes: new Set(keys), edges: new Set(keys.slice(1).map((k, i) => `${keys[i]}>${k}`)) };
    }
    if (selectedId) {
      const k = lay.nodeOf.get(selectedId) ?? selectedId;
      const nodes = new Set([k]);
      const edges = new Set<string>();
      for (const e of lay.edges)
        if (e.from === k || e.to === k) {
          nodes.add(e.from);
          nodes.add(e.to);
          edges.add(`${e.from}>${e.to}`);
        }
      return { nodes, edges };
    }
    return null;
  }, [route, selectedId, lay]);

  const maxAmt = useMemo(() => lay.edges.reduce((m, e) => Math.max(m, e.amount), 0), [lay]);
  const firstLayer = lay.layers[0];

  const labels = useMemo(() => {
    if (!W || !H) return [];
    const minPriority = !dense ? 0 : view.k < 1.4 ? 2.5 : view.k < 2.2 ? 1.5 : 0;
    const reqs: LabelRequest[] = lay.nodes.map((n) => {
      const p = pos.get(n.key)!;
      const m = n.member;
      const forced = n.key === hover || (focus?.nodes.has(n.key) ?? false) || n.key === (selectedId ? lay.nodeOf.get(selectedId) : null);
      const priority = forced ? 10 : n.kind === 'group' ? 5 : !m ? 0 : m.role === 'CASH_OUT' || m.role === 'UNKNOWN' ? 4 : m.role === 'MULE' ? ((m.mule_score ?? 0) >= 0.8 ? 3 : 2) : 1;
      const text = n.kind === 'group' ? `+${n.hidden!.toLocaleString('en-IN')} more` : truncate(m!.label, 22);
      return { id: n.key, text, x: p.x, y: p.y, r: radius(m) + 6, priority: focus && !forced ? priority - 2 : priority, prefer: n.layer === firstLayer ? 'left' : 'right' };
    });
    const circles = lay.nodes.map((n) => ({ id: n.key, ...pos.get(n.key)!, r: radius(n.member) + 6 }));
    return placeLabels(reqs, circles, { bounds: { x: 2, y: 2, w: W - 4, h: H - 4 }, minPriority });
  }, [lay, pos, view.k, hover, focus, selectedId, W, H, firstLayer, dense]);

  const zoomAt = (px: number, py: number, f: number) =>
    setView((v) => {
      const k = Math.min(6, Math.max(0.5, v.k * f));
      return { k, tx: px - ((px - v.tx) * k) / v.k, ty: py - ((py - v.ty) * k) / v.k };
    });
  // wheel must be non-passive to stop the page scrolling
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [W]);

  const edgePath = (a: { x: number; y: number }, b: { x: number; y: number }, ra: number, rb: number) => {
    const dir = b.x >= a.x ? 1 : -1;
    const [x1, x2] = [a.x + dir * (ra + 2), b.x - dir * (rb + 7)];
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`;
  };
  const member = (key: string) => lay.nodes.find((n) => n.key === key)?.member;
  const he = hoverEdge !== null ? lay.edges[hoverEdge] : null;

  return (
    <div ref={wrap} className="absolute inset-0 select-none" data-testid="gang-svg">
      {W > 0 && (
        <svg
          ref={svgRef}
          width={W}
          height={H}
          className="block touch-none"
          role="group"
          aria-label={`Money network ${network.network_id}: ${network.victim_count} victims, ${network.mule_count} mules`}
          onPointerDown={(e) => {
            if ((e.target as Element).closest('[data-node]')) return;
            drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
            (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const [dx, dy] = [e.clientX - d.x, e.clientY - d.y];
            if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
            setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            if (d && !d.moved) onSelect(null);
          }}
          style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
        >
          <defs>
            {[
              ['arrow', 'var(--fg-3)'],
              ['arrow-hot', 'var(--accent)'],
            ].map(([id, c]) => (
              <marker key={id} id={`${network.network_id}-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path d="M0 1 L9 5 L0 9 z" fill={c} />
              </marker>
            ))}
          </defs>

          {/* money links: width by ₹, arrow toward the receiver */}
          <g fill="none">
            {lay.edges.map((e, i) => {
              const [a, b] = [pos.get(e.from)!, pos.get(e.to)!];
              const hot = focus?.edges.has(`${e.from}>${e.to}`) || hoverEdge === i;
              const d = edgePath(a, b, radius(member(e.from)), radius(member(e.to)));
              const w = 1 + 4 * Math.sqrt(maxAmt ? e.amount / maxAmt : 0);
              return (
                <g key={i}>
                  <path
                    d={d}
                    stroke={hot ? 'var(--accent)' : 'var(--fg-3)'}
                    strokeOpacity={focus ? (hot ? 0.95 : 0.07) : hot ? 0.95 : 0.32}
                    strokeWidth={hot ? w + 0.8 : w}
                    markerEnd={`url(#${network.network_id}-${hot ? 'arrow-hot' : 'arrow'})`}
                  />
                  <path d={d} stroke="transparent" strokeWidth={Math.max(8, w + 6)} onPointerEnter={() => setHoverEdge(i)} onPointerLeave={() => setHoverEdge(null)} />
                </g>
              );
            })}
          </g>

          {/* nodes */}
          {lay.nodes.map((n) => {
            const p = pos.get(n.key)!;
            const m = n.member;
            const r = radius(m);
            const dim = !!focus && !focus.nodes.has(n.key);
            const sel = selectedId && lay.nodeOf.get(selectedId) === n.key;
            const lk = look(m);
            const xc = m ? crossByMember.get(m.id)?.length ?? 0 : 0;
            const label = n.kind === 'group' ? `${n.hidden} more accounts in this column. Press to show them all.` : `${roleText(m!)} ${m!.label}${m!.role === 'MULE' ? `, mule score ${Math.round((m!.mule_score ?? 0) * 100)}%` : ''}${xc ? `, ${crossCaseText(xc)}` : ''}`;
            const act = () => (n.kind === 'group' ? onExpand(n.layer) : onSelect(m!.id));
            return (
              <g
                key={n.key}
                data-node
                transform={`translate(${p.x} ${p.y})`}
                opacity={dim ? 0.22 : 1}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={sel ? true : undefined}
                className="cursor-pointer outline-none [&:focus-visible>circle.focus]:stroke-[var(--accent)]"
                onClick={act}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act())}
                onPointerEnter={() => setHover(n.key)}
                onPointerLeave={() => setHover((h) => (h === n.key ? null : h))}
                onFocus={() => setHover(n.key)}
                onBlur={() => setHover((h) => (h === n.key ? null : h))}
              >
                <title>{label}</title>
                <circle className="focus" r={r + 7} fill="none" stroke="transparent" strokeWidth={2} />
                {sel && <circle r={r + 7} fill="none" stroke="var(--accent)" strokeWidth={2} />}
                {m?.role === 'MULE' && (
                  // mule score as a ring: the filled arc is the score
                  <>
                    <circle r={r + 3.5} fill="none" stroke="var(--line-2)" strokeWidth={2.4} />
                    <circle
                      r={r + 3.5}
                      fill="none"
                      stroke="var(--risk)"
                      strokeWidth={2.4}
                      strokeDasharray={`${2 * Math.PI * (r + 3.5) * (m.mule_score ?? 0)} 999`}
                      transform="rotate(-90)"
                      strokeLinecap="round"
                    />
                  </>
                )}
                {n.kind === 'group' ? (
                  <>
                    <circle r={r} fill="var(--surface-1)" stroke="var(--accent)" strokeDasharray="3 3" strokeWidth={1.5} />
                    <path d="M -5 0 H 5 M 0 -5 V 5" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" />
                  </>
                ) : (
                  <GlyphNode r={r} {...lk} />
                )}
                {xc > 0 && <circle cx={r * 0.75} cy={-r * 0.75} r={3.6} fill="var(--risk)" stroke="var(--surface-1)" strokeWidth={1.2} />}
              </g>
            );
          })}

          {/* labels last, on opaque pills */}
          {labels.map((l) => {
            if (!l.visible) return null;
            const n = lay.nodes.find((x) => x.key === l.id)!;
            const strong = n.key === hover || (!!selectedId && lay.nodeOf.get(selectedId) === n.key);
            return (
              <g key={l.id}>
                {l.leader && <line {...l.leader} stroke="var(--fg-3)" strokeWidth={1} strokeDasharray="2 2" pointerEvents="none" />}
                <Pill x={l.x} y={l.y} w={l.w} text={l.text} full={n.member?.label} strong={strong} dim={!!focus && !focus.nodes.has(n.key)} />
              </g>
            );
          })}

          {/* amount pill for the hovered link */}
          {he &&
            (() => {
              const [a, b] = [pos.get(he.from)!, pos.get(he.to)!];
              const t = formatInr(he.amount);
              const w = t.length * 7 + 16;
              const [x, y] = [(a.x + b.x) / 2 - w / 2, (a.y + b.y) / 2 - 12];
              return (
                <g pointerEvents="none">
                  <rect x={x} y={y} width={w} height={22} rx={11} fill="var(--fg-1)" />
                  <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize={12} fontWeight={650} fill="var(--surface-1)" className="tabular-nums">
                    {t}
                  </text>
                </g>
              );
            })()}
        </svg>
      )}
      <ZoomButtons onIn={() => zoomAt(W / 2, H / 2, 1.3)} onOut={() => zoomAt(W / 2, H / 2, 1 / 1.3)} onFit={() => setView({ k: 1, tx: 0, ty: 0 })} />
    </div>
  );
};

/* ---------------- project bubbles ---------------- */

export const ProjectBubbles: React.FC<{
  nets: Net[];
  hoverNet: string | null;
  filter: NetworkStatus | null;
  crossByNet: Map<string, string[]>;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
}> = ({ nets, hoverNet, filter, crossByNet, onOpen, onHover }) => {
  const [wrap, { w: W, h: H }] = useSize<HTMLDivElement>();
  const byId = useMemo(() => new Map(nets.map((n) => [n.network_id, n])), [nets]);
  const { slots, height } = useMemo(() => bubbleRows(nets.map((n) => ({ id: n.network_id, amount: n.amount_inr || 0 })), Math.max(320, W - 16)), [nets, W]);
  const hovered = useRef<SVGGElement | null>(null);
  // the list on the right hovers a bubble: keep it in view
  useEffect(() => {
    hovered.current?.scrollIntoView?.({ block: 'nearest' });
  }, [hoverNet]);
  return (
    <div ref={wrap} className="absolute inset-0 overflow-y-auto" data-testid="project-bubbles">
      {W > 0 && (
        <svg width={W} height={Math.max(H, height)} role="list" aria-label={`${nets.length} money networks, biggest first`}>
          {slots.map((s) => {
            const n = byId.get(s.id)!;
            const st = statusOf(n);
            const c = `var(${STATUS_META[st].token})`;
            const off = !!filter && st !== filter;
            const hot = hoverNet === s.id;
            const xc = crossByNet.get(s.id)?.length ?? 0;
            const name = truncate(s.id, Math.max(8, Math.floor(s.cell / 7.2)));
            const label = `${s.id}: ${STATUS_META[st].label}, ${formatInr(n.amount_inr || 0, { compact: true })} paid in by ${n.victim_count} victims, ${n.mule_count} mules${xc ? `, ${crossCaseText(xc)}` : ''}`;
            return (
              <g
                key={s.id}
                ref={hot ? hovered : undefined}
                transform={`translate(${s.x + 8} ${s.y})`}
                opacity={off ? 0.25 : 1}
                role="listitem button"
                tabIndex={0}
                aria-label={label}
                className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-[var(--accent)]"
                onClick={() => onOpen(s.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(s.id))}
                onPointerEnter={() => onHover(s.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(s.id)}
                onBlur={() => onHover(null)}
              >
                <title>{label}</title>
                <circle className="ring" r={s.r + 5} fill="none" stroke={hot ? 'var(--accent)' : 'transparent'} strokeWidth={2} />
                <circle r={s.r} fill={`color-mix(in srgb, ${c} 16%, var(--surface-1))`} stroke={c} strokeWidth={hot ? 3 : 2} />
                {s.r >= 24 ? (
                  <text y={4} textAnchor="middle" fontSize={s.r >= 34 ? 13 : 11} fontWeight={650} fill="var(--fg-1)" className="tabular-nums">
                    {formatInr(n.amount_inr || 0, { compact: true })}
                  </text>
                ) : (
                  <circle r={3} fill={c} />
                )}
                {xc > 0 && <circle cx={s.r * 0.72} cy={-s.r * 0.72} r={5} fill="var(--risk)" stroke="var(--surface-1)" strokeWidth={1.5} />}
                <text y={s.r + 16} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--fg-1)" className="v6-mono">
                  {name}
                </text>
                <text y={s.r + 30} textAnchor="middle" fontSize={11} fill="var(--fg-3)">
                  {s.r < 24 ? `${formatInr(n.amount_inr || 0, { compact: true })} · ` : ''}
                  {n.mule_count} mules
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

/* ---------------- subgroup bubbles (>200 member giant networks) ---------------- */

export const SubgroupBubbles: React.FC<{
  subgroups: NetworkSubgroup[];
  selectedSubgroupId: string | null;
  onSelect: (id: string) => void;
}> = ({ subgroups, selectedSubgroupId, onSelect }) => {
  const [wrap, { w: W, h: H }] = useSize<HTMLDivElement>();
  const byId = useMemo(() => new Map(subgroups.map((s) => [s.subgroup_id, s])), [subgroups]);
  const { slots, height } = useMemo(
    () => bubbleRows(subgroups.map((s) => ({ id: s.subgroup_id, amount: s.amount_inr || s.held_inr || s.member_count })), Math.max(320, W - 16)),
    [subgroups, W],
  );
  return (
    <div ref={wrap} className="absolute inset-0 overflow-y-auto" data-testid="subgroup-bubbles">
      {W > 0 && (
        <svg width={W} height={Math.max(H, height)} role="list" aria-label={`${subgroups.length} sub-groups detected inside this network`}>
          {slots.map((s) => {
            const sg = byId.get(s.id)!;
            const hot = selectedSubgroupId === s.id;
            const name = truncate(sg.label, Math.max(8, Math.floor(s.cell / 7.2)));
            const tip = `${sg.subgroup_id} (${sg.label}): ${sg.member_count} accounts (${sg.mule_count} mules, ${sg.victim_count} victims), ${formatInr(sg.amount_inr, { compact: true })}`;
            return (
              <g
                key={s.id}
                transform={`translate(${s.x + 8} ${s.y})`}
                role="listitem button"
                tabIndex={0}
                aria-label={tip}
                className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-[var(--accent)]"
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(s.id))}
              >
                <title>{tip}</title>
                <circle className="ring" r={s.r + 5} fill="none" stroke={hot ? 'var(--accent)' : 'transparent'} strokeWidth={2} />
                <circle r={s.r} fill="color-mix(in srgb, var(--accent) 16%, var(--surface-1))" stroke="var(--accent)" strokeWidth={hot ? 3 : 2} />
                {s.r >= 24 ? (
                  <text y={4} textAnchor="middle" fontSize={s.r >= 34 ? 12.5 : 10.5} fontWeight={650} fill="var(--fg-1)" className="tabular-nums">
                    {formatInr(sg.amount_inr || sg.held_inr, { compact: true })}
                  </text>
                ) : (
                  <circle r={3} fill="var(--accent)" />
                )}
                <text y={s.r + 16} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--fg-1)" className="v6-mono">
                  {name}
                </text>
                <text y={s.r + 30} textAnchor="middle" fontSize={11} fill="var(--fg-3)">
                  {sg.mule_count} mules · {sg.member_count} accts
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};
