import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Card, Button, Inspector, ScoreWaterfall } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';

interface NetNode {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  kind: 'victim' | 'risk' | 'safe' | 'cash' | 'dev';
  r?: number;
}

interface NetEdge {
  from: string;
  to: string;
  amount: number;
  step: number;
  isDevice?: boolean;
}

export const FraudNetworkScreen: React.FC = () => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = getCanonicalCase(caseId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState<number>(1000);

  const [replayStep, setReplayStep] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Resize listener
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setSvgWidth(Math.max(760, containerRef.current.clientWidth - 32));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const STEPS = [
    'Victim coerced',
    'UPI transfers',
    'Fan-out to mules',
    'Merchant & ATM',
    'Shared device found',
  ];

  const CLOCKS = ['09:40 IST', '10:00 IST', '10:07 IST', '10:28 IST', '10:35 IST'];

  const rawNodes: NetNode[] = useMemo(() => {
    return [
      { id: 'V', label: canonical.complainant.name, sub: `Victim · ${canonical.complainant.bank.split(' ')[0]}`, x: 90, y: 235, kind: 'victim' },
      { id: 'M1', label: 'Vikram Shah', sub: 'L1 · Axis · 94', x: 340, y: 235, kind: 'risk', r: 28 },
      { id: 'M2', label: 'Rohit Verma', sub: 'L2 · HDFC · 88', x: 620, y: 110, kind: 'risk', r: 24 },
      { id: 'M3', label: 'Sameer Khan', sub: 'L2 · ICICI · 84', x: 620, y: 250, kind: 'risk', r: 20 },
      { id: 'M4', label: 'Deepak Meena', sub: 'Sink · PNB · 61', x: 620, y: 385, kind: 'risk', r: 16 },
      { id: 'APX', label: 'Apex Electronics', sub: 'Merchant · protected', x: 930, y: 70, kind: 'safe' },
      { id: 'ATM', label: 'ATM Sec 18', sub: 'Cash-out terminal', x: 930, y: 250, kind: 'cash' },
      { id: 'DEV', label: 'Handset ••4564', sub: 'Shared by 3 mules', x: 470, y: 415, kind: 'dev' },
      { id: 'WIFI', label: 'Wi-Fi Hotspot', sub: 'BSSID 74:DA:38', x: 470, y: 55, kind: 'dev' },
    ];
  }, [canonical]);

  const rawEdges: NetEdge[] = useMemo(() => {
    const loss = canonical.financials.bookedLossInr;
    return [
      { from: 'V', to: 'M1', amount: loss, step: 0 },
      { from: 'M1', to: 'M2', amount: 300000, step: 1 },
      { from: 'M1', to: 'M3', amount: 155000, step: 1 },
      { from: 'M1', to: 'M4', amount: 45000, step: 1 },
      { from: 'M2', to: 'APX', amount: 180000, step: 2 },
      { from: 'M3', to: 'ATM', amount: 120000, step: 3 },
      { from: 'DEV', to: 'M1', amount: 0, step: 4, isDevice: true },
      { from: 'DEV', to: 'M2', amount: 0, step: 4, isDevice: true },
      { from: 'DEV', to: 'M4', amount: 0, step: 4, isDevice: true },
      { from: 'WIFI', to: 'M1', amount: 0, step: 4, isDevice: true },
      { from: 'WIFI', to: 'M3', amount: 0, step: 4, isDevice: true },
    ];
  }, [canonical]);

  // Scaled node map based on svgWidth
  const nodeMap = useMemo<Record<string, NetNode>>(() => {
    const W = svgWidth;
    const map: Record<string, NetNode> = {};
    rawNodes.forEach((n) => {
      const scaledX = 30 + (n.x * (W - 60)) / 1100;
      map[n.id] = { ...n, x: scaledX };
    });
    return map;
  }, [rawNodes, svgWidth]);

  // Replay animation loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= 4) {
            setIsPlaying(false);
            toast.success('Replay complete: single hardware terminal links 3 mule accounts');
            return 4;
          }
          return prev + 1;
        });
      }, 1400);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleStartPlay = () => {
    setReplayStep(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (replayStep >= 4) setReplayStep(0);
      setIsPlaying(true);
    }
  };

  // Node details for Inspector
  const inspectorDetails = useMemo(() => {
    if (!selectedNodeId) return null;
    if (selectedNodeId === 'DEV') {
      return {
        title: 'Handset Hardware Terminal ••4564',
        subtitle: 'Physical Device Control Hub',
        meta: 'IMEI: 867492061234564 · TAC: 867492',
        score: 96,
        scoreLabel: 'Syndicate hardware confidence',
        why: [
          { label: 'Installed Axis Bank mobile app for Vikram Shah', value: 34 },
          { label: 'Installed HDFC mobile app for Rohit Verma', value: 28 },
          { label: 'Installed PNB mobile app for Deepak Meena', value: 20 },
          { label: 'Cross-referenced in 2 other FIRs (NCR)', value: 14 },
        ],
        narrative:
          'Single physical Android handset operates 3 distinct beneficiary accounts across 3 commercial banks. This is a definitive forensic hallmark of a centralized cyber-fraud mule operation.',
      };
    }

    if (selectedNodeId === 'WIFI') {
      return {
        title: 'Wi-Fi Hotspot BSSID 74:DA:38',
        subtitle: 'Syndicate Network Gateway',
        meta: 'MAC: 74:DA:38:A2:11:BC · ISP: Bharti Airtel',
        score: 91,
        scoreLabel: 'Network convergence confidence',
        why: [
          { label: 'Simultaneous IPDR sessions with Vikram Shah', value: 32 },
          { label: 'Simultaneous IPDR sessions with Sameer Khan', value: 30 },
          { label: 'Repeated CGNAT port assignments during fraud window', value: 18 },
          { label: 'Common geofence coordinates in Noida Sec 62', value: 11 },
        ],
        narrative:
          'Forensic IPDR and CGNAT session correlation establishes that both Vikram Shah and Sameer Khan authenticated their mobile banking sessions through this exact local hotspot.',
      };
    }

    const node = rawNodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;

    return {
      title: node.label,
      subtitle: node.sub,
      meta: `Entity ID: ${node.id} · Case: ${caseId}`,
      score: node.kind === 'safe' ? 12 : node.kind === 'victim' ? null : 88,
      scoreLabel: 'Lead strength / 100',
      why: [
        { label: 'Transaction velocity anomaly detected', value: 26 },
        { label: 'Rapid outbound structuring', value: 22 },
        { label: 'Device telemetry convergence', value: 18 },
      ],
      narrative: `Forensic graph analysis places ${node.label} in direct transactional and hardware alignment with the primary extortion drain.`,
    };
  }, [selectedNodeId, rawNodes, caseId]);

  return (
    <div className="v6-enter space-y-4" data-testid="v6-network-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 4 · Fraud Network"
        title="Who is connected?"
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="warn"
        icon={<AlertTriangle className="w-4 h-4" />}
        action={
          <Button
            variant="default"
            size="sm"
            onClick={handleStartPlay}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            Replay the theft
          </Button>
        }
      >
        One handset and one Wi-Fi hotspot control <b>3 mule accounts</b> across 3 banks. Same device seen in{' '}
        <b>2 other FIRs</b>.
      </FindingStrip>

      {/* Network Graph Card */}
      <div ref={containerRef}>
        <Card className="p-3">
          <svg
            viewBox={`0 0 ${svgWidth} 500`}
            className="w-full h-[500px] overflow-visible select-none"
          >
          <defs>
            <linearGradient id="v6NetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          {/* Edges */}
          <g className="edges">
            {rawEdges.map((e, idx) => {
              if (e.step > replayStep) return null;
              const fromN = nodeMap[e.from];
              const toN = nodeMap[e.to];
              if (!fromN || !toN) return null;

              const isDevice = Boolean(e.isDevice);
              const mx = (fromN.x + toN.x) / 2;
              const d = isDevice
                ? `M${fromN.x},${fromN.y} L${toN.x},${toN.y}`
                : `M${fromN.x},${fromN.y} C${mx},${fromN.y} ${mx},${toN.y} ${toN.x},${toN.y}`;

              const strokeColor = isDevice
                ? '#a78bfa'
                : toN.kind === 'safe'
                ? '#10b981'
                : toN.kind === 'cash'
                ? '#f43f5e'
                : 'url(#v6NetGrad)';

              const strokeWidth = isDevice ? 1.5 : Math.max(2, e.amount / 26000);

              return (
                <g key={idx}>
                  <path
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={isDevice ? 0.75 : 0.5}
                    strokeDasharray={isDevice ? '5 6' : 'none'}
                    className="transition-all duration-300"
                  />

                  {/* Travelling particle on transaction edges */}
                  {!isDevice && (
                    <circle r={3.2} fill="#fde68a" className="drop-shadow-[0_0_4px_#fbbf24]">
                      <animateMotion
                        dur="2.2s"
                        begin={`${idx * 0.2}s`}
                        repeatCount="indefinite"
                        path={d}
                      />
                    </circle>
                  )}

                  {/* Edge Amount Label */}
                  {e.amount > 0 && (
                    <text
                      x={mx}
                      y={(fromN.y + toN.y) / 2 - 8}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill="#a9b4c7"
                      fontFamily="var(--font)"
                    >
                      {formatInr(e.amount, { showPaise: false })}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {Object.values(nodeMap).map((n) => {
              const visible =
                n.kind === 'dev'
                  ? replayStep >= 4
                  : !(n.id === 'APX' && replayStep < 2) &&
                    !(n.id === 'ATM' && replayStep < 3) &&
                    !(['M2', 'M3', 'M4'].includes(n.id) && replayStep < 1) &&
                    !(n.id === 'M1' && replayStep < 0);

              if (!visible) return null;

              const r = n.r || 18;
              const colorMap = {
                victim: '#818cf8',
                risk: '#f43f5e',
                safe: '#10b981',
                cash: '#fb923c',
                dev: '#a78bfa',
              };
              const col = colorMap[n.kind];
              const isSelected = selectedNodeId === n.id;

              return (
                <g
                  key={n.id}
                  className="cursor-pointer group"
                  onClick={() => setSelectedNodeId(n.id)}
                >
                  {/* Pulse ring on hover / select */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r + 8}
                    fill={col}
                    opacity={isSelected ? 0.25 : 0.12}
                    className="group-hover:opacity-30 transition-opacity"
                  />

                  {/* Main Node Circle */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill="#111a2c"
                    stroke={col}
                    strokeWidth={isSelected ? 3.5 : 2.5}
                    className="transition-all"
                  />

                  {/* Node Symbol */}
                  <text
                    x={n.x}
                    y={n.y + 5}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={800}
                    fill={col}
                    fontFamily="var(--font)"
                  >
                    {n.kind === 'dev' ? '⌁' : n.kind === 'safe' ? '✓' : n.kind === 'cash' ? '⌁' : n.kind === 'victim' ? 'V' : '₹'}
                  </text>

                  {/* Node Labels */}
                  <text
                    x={n.x}
                    y={n.y + r + 18}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={700}
                    fill="#eef2f8"
                    fontFamily="var(--font)"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + r + 33}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#a9b4c7"
                    fontFamily="var(--font)"
                  >
                    {n.sub}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Replay Controls Footer */}
        <div className="flex items-center gap-4 mt-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)]">
          <Button
            variant="default"
            size="sm"
            onClick={handleTogglePlay}
            icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          {/* Stepper Timeline */}
          <div className="flex gap-1.5 flex-1">
            {STEPS.map((s, i) => (
              <div
                key={i}
                onClick={() => setReplayStep(i)}
                className={clsx(
                  'flex-1 text-xs font-semibold px-2 py-1.5 border-t-2 cursor-pointer transition-all',
                  i <= replayStep
                    ? 'border-[var(--flow-2)] text-[var(--fg-1)]'
                    : 'border-[var(--surface-3)] text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                )}
              >
                {s}
              </div>
            ))}
          </div>

          {/* Digital Forensic Clock */}
          <span className="v6-mono text-xs font-semibold text-[var(--fg-3)] px-2">
            {CLOCKS[replayStep]}
          </span>
        </div>
      </Card>
      </div>

      {/* 420px Slide-Over Node Details Inspector */}
      {inspectorDetails && (
        <Inspector
          isOpen={Boolean(inspectorDetails)}
          onClose={() => setSelectedNodeId(null)}
          title={inspectorDetails.title}
          subtitle={inspectorDetails.subtitle}
          meta={inspectorDetails.meta}
        >
          {inspectorDetails.score !== null && (
            <div className="flex items-baseline gap-3 pb-4 border-b border-[var(--line)]">
              <div className="text-4xl font-extrabold v6-mono text-[var(--risk)]">
                {inspectorDetails.score}
              </div>
              <div className="text-xs text-[var(--fg-3)] leading-relaxed">
                {inspectorDetails.scoreLabel}
                <br />
                evidentiary attribution lead
              </div>
            </div>
          )}

          <div className="py-4">
            <div className="font-bold text-sm text-[var(--fg-1)] mb-3">
              Forensic contributions
            </div>
            <ScoreWaterfall items={inspectorDetails.why} />
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--fg-1)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--flow-2)]" />
              <span>Attribution Synthesis</span>
            </div>
            <div className="text-xs text-[var(--fg-2)] leading-relaxed">
              {inspectorDetails.narrative}
            </div>
          </div>
        </Inspector>
      )}
    </div>
  );
};
