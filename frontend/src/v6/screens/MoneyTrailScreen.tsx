import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowRight,
  Snowflake,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Card, CardHeader, Button, Inspector } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';

interface SankeyNode {
  id: string;
  label: string;
  sub: string;
  col: number;
  kind?: 'safe' | 'risk' | 'frz' | 'victim';
  inVal: number;
  outVal: number;
  val: number;
  h: number;
  x: number;
  y: number;
  oy: number;
  iy: number;
}

interface SankeyLink {
  from: string;
  to: string;
  amount: number;
  d: string;
  w: number;
  color: string;
  isFrozen: boolean;
  fromNode: SankeyNode;
  toNode: SankeyNode;
}

export const MoneyTrailScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = getCanonicalCase(caseId);

  const [frozenNodeIds, setFrozenNodeIds] = useState<Set<string>>(new Set());
  const [isMethodsInspectorOpen, setIsMethodsInspectorOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState<number>(880);

  // Measure container width for responsive Sankey
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setSvgWidth(Math.max(640, containerRef.current.clientWidth - 40));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Canonical Nodes & Links
  const baseNodes = useMemo(() => {
    if (caseId === 'CASE-2026-001') {
      return [
        { id: 'V', label: 'Sunil Kumar', sub: 'SBI ••9101', col: 0, kind: 'victim' as const },
        { id: 'M1', label: 'Vikram Shah', sub: 'Axis ••0291', col: 1, kind: 'risk' as const },
        { id: 'M2', label: 'Rohit Verma', sub: 'HDFC ••1992', col: 2, kind: 'risk' as const },
        { id: 'M3', label: 'Sameer Khan', sub: 'ICICI ••8129', col: 2, kind: 'risk' as const },
        { id: 'M4', label: 'Deepak Meena', sub: 'PNB ••4471', col: 2, kind: 'risk' as const },
        { id: 'APX', label: 'Apex Electronics', sub: 'merchant · lien', col: 3, kind: 'safe' as const },
        { id: 'H2', label: 'Held · HDFC ••1992', sub: 'can freeze', col: 3, kind: 'frz' as const },
        { id: 'ATM', label: 'ATM Noida Sec 18', sub: 'cashed out', col: 3, kind: 'risk' as const },
        { id: 'H3', label: 'Held · ICICI ••8129', sub: 'can freeze', col: 3, kind: 'frz' as const },
        { id: 'H4', label: 'Held · PNB ••4471', sub: 'can freeze', col: 3, kind: 'frz' as const },
      ];
    }

    // Dynamic fallback for other cases
    const vic = canonical.complainant;
    return [
      { id: 'V', label: vic.name, sub: `${vic.bank.split(' ')[0]} ••${vic.accountMasked.slice(-4)}`, col: 0, kind: 'victim' as const },
      { id: 'M1', label: 'Primary Mule', sub: 'Layer-1 Conduit', col: 1, kind: 'risk' as const },
      { id: 'M2', label: 'Secondary Mule A', sub: 'Layer-2 Conduit', col: 2, kind: 'risk' as const },
      { id: 'M3', label: 'Secondary Mule B', sub: 'Layer-2 Conduit', col: 2, kind: 'risk' as const },
      { id: 'H2', label: 'Held in Conduit A', sub: 'can freeze', col: 3, kind: 'frz' as const },
      { id: 'ATM', label: 'Cash Out Terminal', sub: 'cashed out', col: 3, kind: 'risk' as const },
      { id: 'H3', label: 'Held in Conduit B', sub: 'can freeze', col: 3, kind: 'frz' as const },
    ];
  }, [caseId, canonical]);

  const baseLinks = useMemo<Array<[string, string, number]>>(() => {
    if (caseId === 'CASE-2026-001') {
      return [
        ['V', 'M1', 500000],
        ['M1', 'M2', 300000],
        ['M1', 'M3', 155000],
        ['M1', 'M4', 45000],
        ['M2', 'APX', 180000],
        ['M2', 'H2', 120000],
        ['M3', 'ATM', 120000],
        ['M3', 'H3', 35000],
        ['M4', 'H4', 45000],
      ];
    }

    const loss = canonical.financials.bookedLossInr;
    return [
      ['V', 'M1', loss],
      ['M1', 'M2', Math.round(loss * 0.6)],
      ['M1', 'M3', Math.round(loss * 0.4)],
      ['M2', 'H2', Math.round(loss * 0.45)],
      ['M2', 'ATM', Math.round(loss * 0.15)],
      ['M3', 'H3', Math.round(loss * 0.4)],
    ];
  }, [caseId, canonical]);

  // Compute Sankey Layout coordinates
  const { nodes, links, totalFrozenAmount, recoverableRemaining, placesRemaining } = useMemo(() => {
    const W = svgWidth;
    const H = 450;
    const k = 0.00064;
    const gap = 24;
    const nodeW = 12;
    const cols = [8, W * 0.25, W * 0.50, W - 230];

    // Initialize nodes
    const nodeMap: Record<string, SankeyNode> = {};
    baseNodes.forEach((n) => {
      nodeMap[n.id] = {
        ...n,
        inVal: 0,
        outVal: 0,
        val: 0,
        h: 0,
        x: cols[n.col],
        y: 0,
        oy: 0,
        iy: 0,
      };
    });

    // Sum inflow/outflow
    baseLinks.forEach(([from, to, amt]) => {
      if (nodeMap[from]) nodeMap[from].outVal += amt;
      if (nodeMap[to]) nodeMap[to].inVal += amt;
    });

    Object.values(nodeMap).forEach((n) => {
      n.val = Math.max(n.inVal, n.outVal);
      n.h = Math.max(4, n.val * k);
    });

    // Compute Y positions per column
    [0, 1, 2, 3].forEach((c) => {
      const colNodes = Object.values(nodeMap).filter((n) => n.col === c);
      const totalH = colNodes.reduce((acc, n) => acc + n.h, 0) + gap * (colNodes.length - 1);
      let y = Math.max(20, (H - totalH) / 2);

      colNodes.forEach((n) => {
        n.y = y;
        n.oy = y;
        n.iy = y;
        y += n.h + gap;
      });
    });

    // Compute Link Paths
    const computedLinks: SankeyLink[] = baseLinks.map(([fromId, toId, amt]) => {
      const a = nodeMap[fromId];
      const b = nodeMap[toId];
      const w = Math.max(2, amt * k);
      const y1 = a.oy + w / 2;
      const y2 = b.iy + w / 2;
      a.oy += w;
      b.iy += w;

      const x1 = a.x + nodeW;
      const x2 = b.x;
      const mx = (x1 + x2) / 2;
      const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;

      const isFrozen = frozenNodeIds.has(toId);
      const color = isFrozen
        ? 'var(--frozen)'
        : b.kind === 'safe'
        ? '#10b981'
        : b.kind === 'risk'
        ? '#f43f5e'
        : 'url(#v6MoneyFlowGrad)';

      return {
        from: fromId,
        to: toId,
        amount: amt,
        d,
        w,
        color,
        isFrozen,
        fromNode: a,
        toNode: b,
      };
    });

    // Compute frozen total and remaining recoverable pool
    const initialRecoverable = canonical.financials.recoverableLibrInr;
    let frozenSum = 0;

    baseLinks.forEach(([_, to, amt]) => {
      if (frozenNodeIds.has(to) && to !== 'APX') {
        frozenSum += amt;
      }
    });

    const rem = Math.max(0, initialRecoverable - frozenSum);
    const holdPlaces = baseNodes
      .filter((n) => n.kind === 'frz' || n.id === 'APX')
      .filter((n) => !frozenNodeIds.has(n.id)).length;

    return {
      nodes: Object.values(nodeMap),
      links: computedLinks,
      totalFrozenAmount: frozenSum,
      recoverableRemaining: rem,
      placesRemaining: holdPlaces,
    };
  }, [baseNodes, baseLinks, svgWidth, frozenNodeIds, canonical]);

  // Handle freeze click on node
  const handleFreezeNode = (id: string, amount: number, label: string) => {
    setFrozenNodeIds((prev) => new Set([...prev, id]));
    toast.success(`❄ ${label.replace('Held · ', '')} frozen · ${formatInr(amount, { showPaise: false })} secured`);
  };

  const lossInr = canonical.financials.bookedLossInr;
  const initialRecoverable = canonical.financials.recoverableLibrInr;
  const recoveryPct = Math.round((recoverableRemaining / (lossInr || 1)) * 100);
  const cashedOutInr = canonical.financials.unrecoverableCashoutInr || 120000;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-money-screen">
      {/* Page Header with Legend */}
      <PageHead
        kicker="Step 3 · Money Trail"
        title="Where did the money go?"
        actions={
          <div className="flex items-center gap-4 text-xs text-[var(--fg-3)]">
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-[var(--flow)] to-[var(--flow-2)] inline-block" /> Moving
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-[var(--frozen)] inline-block" /> Frozen
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-[var(--safe)] inline-block" /> Protected merchant
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-[var(--risk)] inline-block" /> Cashed out
            </span>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="safe"
        icon={<Snowflake className="w-4 h-4" />}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveView('actions')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            Freeze now
          </Button>
        }
      >
        <b className="v6-mono">{formatInr(recoverableRemaining, { showPaise: false })}</b> of{' '}
        {formatInr(lossInr, { showPaise: false })} can still be stopped in{' '}
        <b>{placesRemaining} {placesRemaining === 1 ? 'place' : 'places'}</b>. Freeze before the golden hour ends.
      </FindingStrip>

      {/* Main Grid: Sankey Diagram (8 cols) + Right KPI Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sankey Flow Card (8 cols) */}
        <div className="lg:col-span-8" ref={containerRef}>
          <Card className="p-4 overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} 450`}
              className="w-full h-[450px] overflow-visible select-none"
            >
              <defs>
                <linearGradient id="v6MoneyFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>

              {/* Connecting Flow Ribbons */}
              <g className="flow-links">
                {links.map((link, idx) => (
                  <g key={idx}>
                    <path
                      d={link.d}
                      fill="none"
                      stroke={link.color}
                      strokeWidth={link.w}
                      strokeOpacity={link.isFrozen ? 0.65 : 0.38}
                      className={clsx(
                        'transition-all duration-300',
                        link.isFrozen && 'stroke-[var(--frozen)] drop-shadow-[0_0_8px_rgba(125,211,252,0.4)]'
                      )}
                    >
                      <title>{`${link.fromNode.label} → ${link.toNode.label}: ${formatInr(link.amount, { showPaise: false })}`}</title>
                    </path>

                    {/* Animated Travelling Particle if not frozen */}
                    {!link.isFrozen && (
                      <circle r={3} fill="#fde68a" className="drop-shadow-[0_0_4px_#fbbf24]">
                        <animateMotion
                          dur="2.6s"
                          begin={`${idx * 0.15}s`}
                          repeatCount="indefinite"
                          path={link.d}
                        />
                      </circle>
                    )}
                  </g>
                ))}
              </g>

              {/* Node Columns & Labels */}
              <g className="nodes">
                {nodes.map((n) => {
                  const isNodeFrozen = frozenNodeIds.has(n.id);
                  const nodeColor = n.kind === 'safe'
                    ? '#10b981'
                    : n.kind === 'risk'
                    ? '#f43f5e'
                    : n.kind === 'frz'
                    ? isNodeFrozen
                      ? 'var(--frozen)'
                      : '#94a3b8'
                    : '#818cf8';

                  const tx = n.x + 12 + 10;
                  const cy = n.y + n.h / 2;
                  const isLastCol = n.col === 3;
                  const displayAmount = formatInr(n.val, { showPaise: false });
                  const subText = `${displayAmount} · ${isNodeFrozen ? 'frozen ❄' : n.sub}`;

                  return (
                    <g key={n.id}>
                      {/* Vertical Node Bar */}
                      <rect
                        x={n.x}
                        y={n.y}
                        width={12}
                        height={Math.max(4, n.h)}
                        rx={4}
                        fill={nodeColor}
                        className={clsx(isNodeFrozen && 'shadow-[0_0_12px_var(--frozen)]')}
                      />

                      {/* Pill Background to ensure text readability */}
                      {!isLastCol && (
                        <rect
                          x={tx - 6}
                          y={cy - 20}
                          width={Math.max(n.label.length * 8, subText.length * 6.5) + 16}
                          height={38}
                          rx={8}
                          fill="rgba(6, 10, 19, 0.85)"
                          stroke="rgba(148, 163, 184, 0.15)"
                        />
                      )}

                      {/* Node Label & Sub */}
                      <text
                        x={tx}
                        y={cy - 3}
                        fontSize={13}
                        fontWeight={700}
                        fill="#eef2f8"
                        fontFamily="var(--font)"
                      >
                        {n.label}
                      </text>
                      <text
                        x={tx}
                        y={cy + 13}
                        fontSize={11.5}
                        fill="#a9b4c7"
                        fontFamily="var(--font)"
                      >
                        {subText}
                      </text>

                      {/* 1-Click Freeze Action on Held Nodes */}
                      {n.kind === 'frz' && !isNodeFrozen && (
                        <g
                          className="cursor-pointer group"
                          role="button"
                          aria-label={`Freeze ${n.label}`}
                          onClick={() => handleFreezeNode(n.id, n.val, n.label)}
                        >
                          <rect
                            x={svgWidth - 68}
                            y={cy - 12}
                            width={64}
                            height={24}
                            rx={7}
                            fill="rgba(125, 211, 252, 0.14)"
                            stroke="rgba(125, 211, 252, 0.5)"
                            className="group-hover:fill-cyan-500/30 group-hover:stroke-cyan-400 transition-colors"
                          />
                          <text
                            x={svgWidth - 36}
                            y={cy + 4}
                            textAnchor="middle"
                            fontSize={11.5}
                            fontWeight={700}
                            fill="#7dd3fc"
                            fontFamily="var(--font)"
                          >
                            Freeze
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </Card>
        </div>

        {/* Right Sidebar: Recoverable KPI & Method Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Recoverable Now KPI Card */}
          <Card className="v6-kpi">
            <div className="k-label">
              <span className="v6-k-ico bg-[var(--frozen-bg)] text-[var(--frozen)]">
                <Snowflake className="w-4 h-4" />
              </span>
              <span>Recoverable now</span>
            </div>

            <div className="k-val v6-mono text-[var(--frozen)]">
              {formatInr(recoverableRemaining, { showPaise: false })}
            </div>

            <div className="v6-gauge-track my-2">
              <div
                className="v6-gauge-fill"
                style={{
                  width: `${recoveryPct}%`,
                  background: 'var(--frozen)',
                }}
              />
            </div>

            <div className="k-foot mt-2">
              {totalFrozenAmount > 0 ? (
                <span className="text-[var(--frozen)] font-semibold">
                  {formatInr(totalFrozenAmount, { showPaise: false })} frozen ·{' '}
                  {formatInr(recoverableRemaining, { showPaise: false })} still at risk
                </span>
              ) : (
                <span>
                  {recoveryPct}% of the loss · {formatInr(cashedOutInr, { showPaise: false })} already cashed out
                </span>
              )}
            </div>
          </Card>

          {/* How We Traced It Card */}
          <Card>
            <CardHeader
              title="How we traced it"
              subtitle="Mathematical taint conservation rules"
            />
            <div className="text-xs text-[var(--fg-2)] leading-relaxed space-y-2">
              <p>
                Money is tracked across banking conduits using the{' '}
                <b className="text-[var(--fg-1)]">Lowest Intermediate Balance Rule (LIBR)</b>: an account cannot pass on more stolen money than its available balance held at transfer timestamp.
              </p>
              <p>
                Clean pre-existing balances and bona fide commercial receipts are excluded from statutory liens under BNSS §106.
              </p>
            </div>

            <button
              type="button"
              className="v6-why mt-4 w-full py-2 text-center"
              data-why="method"
              onClick={() => setIsMethodsInspectorOpen(true)}
            >
              Compare methods →
            </button>
          </Card>
        </div>
      </div>

      {/* 420px Slide-Over Inspector for Tracing Methods Comparison */}
      <Inspector
        isOpen={isMethodsInspectorOpen}
        onClose={() => setIsMethodsInspectorOpen(false)}
        title="Tracing Methods Compared"
        subtitle="Forensic Judicial Admissibility Standards"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-1">
            <div className="flex justify-between items-center">
              <b className="text-sm text-[var(--fg-1)]">Lowest-balance rule (used)</b>
              <span className="v6-mono font-bold text-sm text-[var(--frozen)]">
                {formatInr(initialRecoverable, { showPaise: false })}
              </span>
            </div>
            <div className="v6-gauge-track my-2">
              <div
                className="v6-gauge-fill"
                style={{ width: `${(initialRecoverable / lossInr) * 100}%`, background: 'var(--frozen)' }}
              />
            </div>
            <div className="text-xs text-[var(--fg-3)]">
              Accepted in statutory courts (§106 BNSS); protects clean third-party commercial money.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-1">
            <div className="flex justify-between items-center">
              <b className="text-sm text-[var(--fg-1)]">First-in, first-out (FIFO)</b>
              <span className="v6-mono font-bold text-sm text-[var(--fg-2)]">
                {formatInr(Math.round(lossInr * 0.58), { showPaise: false })}
              </span>
            </div>
            <div className="v6-gauge-track my-2">
              <div
                className="v6-gauge-fill"
                style={{ width: '58%', background: 'var(--fg-3)' }}
              />
            </div>
            <div className="text-xs text-[var(--fg-3)]">
              Over-freezes merchant accounts; frequently contested in high courts.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-1">
            <div className="flex justify-between items-center">
              <b className="text-sm text-[var(--fg-1)]">Proportional split</b>
              <span className="v6-mono font-bold text-sm text-[var(--fg-2)]">
                {formatInr(Math.round(lossInr * 0.67), { showPaise: false })}
              </span>
            </div>
            <div className="v6-gauge-track my-2">
              <div
                className="v6-gauge-fill"
                style={{ width: '67%', background: 'var(--fg-3)' }}
              />
            </div>
            <div className="text-xs text-[var(--fg-3)]">
              Spreads fractional loss across all holders; complex to execute across bank nodal officers.
            </div>
          </div>
        </div>
      </Inspector>
    </div>
  );
};
