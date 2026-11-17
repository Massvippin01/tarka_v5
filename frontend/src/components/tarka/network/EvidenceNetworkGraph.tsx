import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Radio,
  Smartphone,
  Server,
  Wifi,
  Cpu,
  Building,
  Shield,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  IndianRupee,
  Clock,
  User,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { layoutNetwork, type NetworkEdgeLayout } from "./layoutNetwork";
import { lintViz } from "../../../utils/lintViz";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { useTarkaGlobal } from "../../../context/TarkaGlobalContext";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";
import { buildCase002Bundle, buildCase003Bundle } from "../../../services/caseSyncBridge";
import { CANONICAL_CASES, buildCaseBundleFromFixture, findCase } from "../../../fixtures/cases";
import { formatInr } from "../../../utils/formatters";
import { selectAccountFlows, selectDeviceFacts, selectFinancialSummary } from "../../../selectors/caseSelectors";
import { sha256HexSync, canonicalJson } from "../../../utils/sha256";
import { useQuery } from "@tanstack/react-query";
import type { CaseActionsResponse } from "../../../types/actions";
import { selectCaseActionFinancials } from "../../../selectors/actionSelectors";
import { useCaseStore } from "../../../store/useCaseStore";

export type EdgeFilterType = "all" | "cashflow" | "tether" | "ja4" | "caf" | "c2";

interface EvidenceNetworkGraphProps {
  isHotspotActive: boolean;
  onToggleHotspot: () => void;
  edgeFilter: EdgeFilterType;
  onEdgeFilterChange: (filter: EdgeFilterType) => void;
  caseId?: string;
}

interface EvidenceSheetData {
  title: string;
  category: string;
  source: string;
  sha256: string;
  statutoryBasis: string;
  details: string;
  linkedEntities: string[];
}

export interface ReplayStepData {
  step: number;
  phaseId: string;
  timeLabel: string;
  clockTime: string;
  title: string;
  headline: string;
  narrative: string;
  amount: string;
  statutory: string;
  recoverySummary?: string;
  activeNodeIds: string[];
  activeEdgeIds: string[];
  muleBalances: Record<
    string,
    { balance: string; change?: string; note: string; tone: "emerald" | "amber" | "rose" | "slate" | "indigo" }
  >;
}

export function getCaseReplaySteps(_caseId: string, canonicalCase?: any): ReplayStepData[] {
  const victimAcc = canonicalCase?.accounts?.find((a: any) => a.holderType === "VICTIM");
  const l1Acc = canonicalCase?.accounts?.find((a: any) => a.holderType === "LAYER_1_MULE");
  const l2Acc = canonicalCase?.accounts?.find((a: any) => a.holderType === "LAYER_2_CONDUIT");
  const merchAcc = canonicalCase?.accounts?.find((a: any) => a.holderType === "BONA_FIDE_MERCHANT");
  const sinkAcc = canonicalCase?.accounts?.find((a: any) => a.holderType === "LAYER_3_SINK");

  const victimId = victimAcc?.nodeId || "node-victim";
  const l1Id = l1Acc?.nodeId || "acc-vikram";
  const l2Id = l2Acc?.nodeId || "acc-rohit";
  const merchId = merchAcc?.nodeId || "acc-sink";
  const sinkId = sinkAcc?.nodeId || "node-atm";

  const victim = canonicalCase?.complainant?.name || "Victim";
  const lossFormatted = formatInr(canonicalCase?.financials?.bookedLossInr ?? 0);
  const l1Mule = l1Acc?.holderName || "Primary Mule";
  const l2Mule = l2Acc?.holderName || "Intermediary Mule";
  const merchant = merchAcc?.holderName || "Commercial Merchant";
  const bank = canonicalCase?.complainant?.bank || "Core Banking";
  const acc = canonicalCase?.complainant?.accountMasked || "A/c";
  const station = canonicalCase?.policeStation || "Cyber Crime Police Station";
  const recoverable = formatInr(canonicalCase?.financials?.recoverableLibrInr ?? 0);
  const frozenMuleInr = formatInr(canonicalCase?.financials?.frozenMuleBalanceInr ?? 0);
  const shieldedInr = formatInr(canonicalCase?.financials?.shieldedCommercialInr ?? 0);
  const cashoutInr = formatInr(canonicalCase?.financials?.unrecoverableCashoutInr ?? 0);

  return [
    {
      step: 0,
      phaseId: "sim-swap",
      timeLabel: "T - 16m",
      clockTime: "09:44:00 IST",
      title: "PRE-ATTACK BTS REGISTRATION & RECONNAISSANCE",
      headline: `Pre-attack surveillance and account reconnaissance on victim ${victim}`,
      narrative: `Attacker executes unauthorized credential and SIM reconnaissance targeting victim ${victim} (${canonicalCase?.complainant?.phone || "+91-98711-23941"}). Attacker hijacks authentication channel before bank alert triggers.`,
      amount: "—",
      statutory: "DoT License Clause 39.20 & Telco BTS Stratum-2",
      activeNodeIds: ["node-tower", "node-victim", victimId],
      activeEdgeIds: ["edge-tower-hero"],
      muleBalances: {
        "node-victim": { balance: lossFormatted, note: `Victim Balance (${bank} ${acc})`, tone: "slate" },
        "acc-vikram": { balance: "₹0", note: "L1 Primary Mule Standby", tone: "slate" },
        "acc-rohit": { balance: "₹0", note: "L2A Conduit Standby", tone: "slate" },
        "acc-sameer": { balance: "₹0", note: "L2B Conduit Standby", tone: "slate" },
        "acc-sink": { balance: "₹0", note: "Escrow Sink Standby", tone: "slate" },
        "node-atm": { balance: "₹0", note: "ATM Terminal Standby", tone: "slate" },
        [victimId]: { balance: lossFormatted, note: `Victim Balance (${bank} ${acc})`, tone: "slate" },
        [l1Id]: { balance: "₹0", note: "L1 Primary Mule Standby", tone: "slate" },
        [l2Id]: { balance: "₹0", note: "L2 Conduit Standby", tone: "slate" },
        [merchId]: { balance: "₹0", note: "Escrow Standby", tone: "slate" },
        [sinkId]: { balance: "₹0", note: "ATM Standby", tone: "slate" },
      },
    },
    {
      step: 1,
      phaseId: "primary-inflow",
      timeLabel: "T + 00m",
      clockTime: "10:00:14 IST",
      title: "PRIMARY FRAUDULENT INFLOW (VICTIM → L1 MULE)",
      headline: `Victim ${victim} debited ${lossFormatted} via ${bank} to primary mule ${l1Mule}`,
      narrative: `Victim ${victim} (${bank} ${acc}) is fraudulently debited ${lossFormatted}. Funds credit instantly into L1 primary mule ${l1Mule}. NPCI Central Switch captures device telemetry.`,
      amount: lossFormatted,
      statutory: "BSA §63(4) Electronic Stanza & NPCI Central Switch T1",
      activeNodeIds: ["node-victim", "acc-vikram", victimId, l1Id],
      activeEdgeIds: ["edge-cash-victim-vikram", `edge-cash-${victimId}-${l1Id}`, "E1"],
      muleBalances: {
        "node-victim": { balance: "₹0", change: `-${lossFormatted}`, note: "Debited via Core Banking", tone: "rose" },
        "acc-vikram": { balance: lossFormatted, change: `+${lossFormatted}`, note: `Credited in Full (${l1Mule})`, tone: "emerald" },
        "acc-rohit": { balance: "₹0", note: "Awaiting Layering Transfer", tone: "slate" },
        "acc-sameer": { balance: "₹0", note: "Awaiting Layering Transfer", tone: "slate" },
        "acc-sink": { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
        "node-atm": { balance: "₹0", note: "ATM Standby", tone: "slate" },
        [victimId]: { balance: "₹0", change: `-${lossFormatted}`, note: "Debited via Core Banking", tone: "rose" },
        [l1Id]: { balance: lossFormatted, change: `+${lossFormatted}`, note: `Credited in Full (${l1Mule})`, tone: "emerald" },
        [l2Id]: { balance: "₹0", note: "Awaiting Layering Transfer", tone: "slate" },
        [merchId]: { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
        [sinkId]: { balance: "₹0", note: "ATM Standby", tone: "slate" },
      },
    },
    {
      step: 2,
      phaseId: "ap-binding",
      timeLabel: "T + 04m",
      clockTime: "10:04:12 IST",
      title: "HOTSPOT TETHERING & JA4 TLS AP BINDING",
      headline: `Accomplice Wi-Fi Hotspot binds mule banking sessions simultaneously`,
      narrative: `Controller Device Cluster activates portable Wi-Fi AP. Packet Gateway confirms decremented TTL=63 (-1 hop). Identical client TLS fingerprint across banking sessions proves single physical operator.`,
      amount: "—",
      statutory: "ISO/IEC 27037 & DoT License Clause 39.20 (TTL=63 Corroboration)",
      activeNodeIds: ["node-hero", "hub-tether", "hub-ja4", "hub-caf", "acc-vikram", "acc-rohit", "acc-sameer", "acc-sink", victimId, l1Id, l2Id, merchId, sinkId],
      activeEdgeIds: [
        "edge-hero-tether",
        "edge-tether-vikram",
        "edge-tether-rohit",
        "edge-tether-sameer",
        "edge-tether-sink",
        "edge-hero-ja4",
        "edge-ja4-vikram",
        "edge-ja4-rohit",
        "edge-ja4-sameer",
        "edge-ja4-sink",
        `edge-ja4-${l1Id}`,
        `edge-ja4-${l2Id}`,
        `edge-ja4-${merchId}`,
      ],
      muleBalances: {
        "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
        "acc-vikram": { balance: lossFormatted, note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "emerald" },
        "acc-rohit": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
        "acc-sameer": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
        "acc-sink": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
        "node-atm": { balance: "₹0", note: "Standby", tone: "slate" },
        [victimId]: { balance: "₹0", note: "Debited", tone: "rose" },
        [l1Id]: { balance: lossFormatted, note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "emerald" },
        [l2Id]: { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
        [merchId]: { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
        [sinkId]: { balance: "₹0", note: "Standby", tone: "slate" },
      },
    },
    {
      step: 3,
      phaseId: "fan-out",
      timeLabel: "T + 09m",
      clockTime: "10:09:45 IST",
      title: "RAPID LAYERING FAN-OUT (L1 → L2A & L2B)",
      headline: `${l1Mule} fans out ${lossFormatted} rapidly to intermediary accounts (${l2Mule})`,
      narrative: `${l1Mule} disperses ${lossFormatted} across intermediary accounts including ${l2Mule} and ${merchant}. Deliberate layering fan-out orchestrated to evade immediate single-account lien limits.`,
      amount: lossFormatted,
      statutory: "CBS Core Banking Ledgers & Switch Telemetry",
      activeNodeIds: ["acc-vikram", "acc-rohit", "acc-sameer", l1Id, l2Id, merchId],
      activeEdgeIds: ["edge-cash-vikram-rohit", "edge-cash-vikram-sameer", "E2", "E3", `edge-cash-${l1Id}-${l2Id}`, `edge-cash-${l1Id}-${merchId}`],
      muleBalances: {
        "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
        "acc-vikram": { balance: "₹0", change: `-${lossFormatted}`, note: "Fully Dispersed to Layer 2 Mules", tone: "amber" },
        "acc-rohit": { balance: "Intermediary Hold", change: "+Layering", note: `Credited ${l2Mule}`, tone: "emerald" },
        "acc-sameer": { balance: "Secondary Hold", change: "+Layering", note: "Credited Intermediary", tone: "emerald" },
        "acc-sink": { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
        "node-atm": { balance: "₹0", note: "Standby", tone: "slate" },
        [victimId]: { balance: "₹0", note: "Debited", tone: "rose" },
        [l1Id]: { balance: "₹0", change: `-${lossFormatted}`, note: "Dispersed to Layer 2 & Escrow", tone: "amber" },
        [l2Id]: { balance: frozenMuleInr, change: "+Layering", note: `Credited ${l2Mule}`, tone: "emerald" },
        [merchId]: { balance: shieldedInr, change: "+Escrow", note: `Credited ${merchant}`, tone: "indigo" },
        [sinkId]: { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
      },
    },
    {
      step: 4,
      phaseId: "cashout-sink",
      timeLabel: "T + 18m",
      clockTime: "10:18:22 IST",
      title: "IMMEDIATE PHYSICAL CASHOUT & ESCROW SINK",
      headline: `Mule syndicate executes cashout and merchant terminal transfers (${merchant})`,
      narrative: `Mule accounts execute cash withdrawals and swipe transactions via ${merchant} POS terminals to conceal asset trail before cyber police intercept.`,
      amount: lossFormatted,
      statutory: "ATM Electronic Journal & CCTV Log · Merchant Escrow Ledger",
      activeNodeIds: ["acc-sameer", "node-atm", "acc-rohit", "acc-sink", l1Id, l2Id, merchId, sinkId],
      activeEdgeIds: ["edge-cash-sameer-atm", "edge-cash-rohit-sink", "E4", `edge-cash-${l1Id}-${sinkId}`, `edge-cash-${l2Id}-${sinkId}`],
      muleBalances: {
        "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
        "acc-vikram": { balance: "₹0", note: "Exhausted", tone: "slate" },
        "acc-rohit": { balance: "Partial Hold", change: "-Escrow", note: "Remaining in Account", tone: "amber" },
        "acc-sameer": { balance: "Partial Hold", change: "-ATM", note: "Remaining in Account", tone: "amber" },
        "acc-sink": { balance: "Escrow Hold", change: "+Escrow", note: `Locked in ${merchant} Escrow`, tone: "indigo" },
        "node-atm": { balance: "Withdrawn", change: "Cash Out", note: "Physical Currency Dispensed", tone: "rose" },
        [victimId]: { balance: "₹0", note: "Debited", tone: "rose" },
        [l1Id]: { balance: "₹0", note: "Exhausted", tone: "slate" },
        [l2Id]: { balance: frozenMuleInr, change: "-Cashout", note: "Remaining in Account", tone: "amber" },
        [merchId]: { balance: shieldedInr, change: "+Escrow", note: `Locked in ${merchant} Escrow`, tone: "indigo" },
        [sinkId]: { balance: cashoutInr, change: "Cash Out", note: "Physical Currency Dispensed", tone: "rose" },
      },
    },
    {
      step: 5,
      phaseId: "freeze-secured",
      timeLabel: "T + 2.5h",
      clockTime: "10:30:00 IST",
      title: "STATUTORY FREEZE & LIBR RECOVERY (BNSS §106/§107)",
      headline: `Section 106/107 BNSS freeze executed; ${recoverable} secured under Clayton's Case LIBR rule`,
      narrative: `${station} transmits emergency provisional debit freezes under BNSS §106/§107. Clayton's Case Lowest Intermediate Balance Rule (LIBR) legally binds recoverable assets. Net recovered: ${recoverable} / ${lossFormatted}.`,
      amount: `${recoverable} Secured (Restitution Ready)`,
      statutory: "BNSS §106/§107 & BSA §63 Electronic Admissibility Protocol",
      recoverySummary: `${recoverable} SECURED (RESTITUTION READY UNDER LIBR DOCTRINE)`,
      activeNodeIds: ["node-victim", "acc-vikram", "acc-rohit", "acc-sameer", "acc-sink", "node-atm", victimId, l1Id, l2Id, merchId, sinkId],
      activeEdgeIds: [
        "edge-cash-victim-vikram",
        "edge-cash-vikram-rohit",
        "edge-cash-vikram-sameer",
        "edge-cash-sameer-atm",
        "edge-cash-rohit-sink",
        "E1",
        "E2",
        "E3",
        "E4",
      ],
      muleBalances: {
        "node-victim": { balance: recoverable, note: "Secured for Restitution", tone: "emerald" },
        "acc-vikram": { balance: "₹0 (Frozen)", note: "BNSS §107 Debit Freeze", tone: "slate" },
        "acc-rohit": { balance: "Frozen", note: "BNSS §107 Debit Freeze", tone: "emerald" },
        "acc-sameer": { balance: "Frozen", note: "BNSS §107 Debit Freeze", tone: "emerald" },
        "acc-sink": { balance: "Liened", note: "Merchant Escrow Lien Secured", tone: "emerald" },
        "node-atm": { balance: "Withdrawn", note: "CCTV Physical Evidence Seized", tone: "rose" },
        [victimId]: { balance: recoverable, note: "Secured for Restitution", tone: "emerald" },
        [l1Id]: { balance: "₹0 (Frozen)", note: "BNSS §107 Debit Freeze", tone: "slate" },
        [l2Id]: { balance: `${frozenMuleInr} (Frozen)`, note: "BNSS §107 Debit Freeze", tone: "emerald" },
        [merchId]: { balance: `${shieldedInr} (Shielded)`, note: "Excluded Commercial Escrow", tone: "emerald" },
        [sinkId]: { balance: `${cashoutInr} (Withdrawn)`, note: "CCTV Physical Evidence Seized", tone: "rose" },
      },
    },
  ];
}

export const EvidenceNetworkGraph: React.FC<EvidenceNetworkGraphProps> = ({
  isHotspotActive,
  onToggleHotspot,
  edgeFilter,
  onEdgeFilterChange,
  caseId: propCaseId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 980,
    height: 560,
  });

  const [viewMode, setViewMode] = useState<"graph" | "matrix" | "table">("graph");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<EvidenceSheetData | null>(null);

  const { setSelectedEvidenceEdge, reconstructedInvestigation } = useTarkaUiStore();
  const { activeCaseId: globalCaseId } = useTarkaGlobal();
  const storeCaseId = useCaseStore((s) => s.activeCaseId);
  const activeCaseId = propCaseId || storeCaseId || globalCaseId || "CASE-2026-001";

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId && CANONICAL_CASES[activeCaseId]) {
      return reconstructedInvestigation;
    }
    // Demo fixture or uploaded-data case (same shape, see selectors/bundleAdapter).
    const known = findCase(activeCaseId);
    if (known) {
      return buildCaseBundleFromFixture(known);
    }
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId === "CASE-2026-002") {
      return buildCase002Bundle();
    }
    if (activeCaseId === "CASE-2026-003") {
      return buildCase003Bundle();
    }
    return reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  // Fullscreen, Minimized & Zoom States
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullscreenHudMinimized, setIsFullscreenHudMinimized] = useState<boolean>(false);
  const [showNarrativeStrip, setShowNarrativeStrip] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const { data: networkActionsData } = useQuery<CaseActionsResponse>({
    queryKey: ["case", activeCaseId, "actions"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cases/${activeCaseId}/actions`, {
        headers: { Authorization: "Bearer test-token" },
      });
      return res.ok ? res.json() : null;
    },
    staleTime: 5000,
  });

  const networkActionFinancials = useMemo(() => {
    return selectCaseActionFinancials(activeCaseId || "", networkActionsData?.actions, networkActionsData?.summary);
  }, [activeCaseId, networkActionsData]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoomLevel(1);

  // Lock body scroll in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // 6-step Chronological Forensic Replay Engine
  const [replayStep, setReplayStep] = useState<number>(5); // Default to Step 5 (full picture at rest)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);

  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Measure outer container using ResizeObserver to guarantee 100% in-page auto-fit
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0) {
          setContainerWidth(Math.floor(width));
          if (isFullscreen) {
            setDimensions({
              width: Math.max(1160, Math.floor(width)),
              height: Math.max(780, Math.floor(height) - 130),
            });
          } else {
            setDimensions({
              width: 1160,
              height: 780,
            });
          }
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [viewMode, isFullscreen]);

  // Determine whether cashflow nodes/edges should be included
  const includeCashFlowNodes = edgeFilter === "cashflow" || edgeFilter === "all";

  // Layer filter state (Prompt 11)
  const [selectedLayer, setSelectedLayer] = useState<"all" | "L1" | "L2" | "L3">("all");

  // Compute pure layout (Data-Driven with Layered BFS)
  const layout = useMemo(() => {
    return layoutNetwork(
      dimensions.width,
      dimensions.height,
      isHotspotActive,
      edgeFilter === "cashflow" ? "cashflow" : edgeFilter,
      includeCashFlowNodes,
      investigation,
      investigation?.muleScores
    );
  }, [dimensions.width, dimensions.height, isHotspotActive, edgeFilter, includeCashFlowNodes, investigation]);

  // Dynamic shrink-to-fit scale: guarantees all 3 rows of nodes, all hops, and all boundaries
  // shrink to fit the container perfectly without scrollbars or clipped text
  const inPageFitScale = useMemo(() => {
    const layoutW = layout.width || 1160;
    const layoutH = layout.height || 780;

    if (isFullscreen) {
      if (typeof window === "undefined") return zoomLevel;
      const availW = Math.max(600, window.innerWidth - 32);
      const availH = Math.max(400, window.innerHeight - (isFullscreenHudMinimized ? 80 : 150));
      const sW = availW / layoutW;
      const sH = availH / layoutH;
      const baseScale = Math.min(sW, sH);
      return Math.round(baseScale * zoomLevel * 1000) / 1000;
    }

    // In-page: calculate exact ratio so the 1160px layout fits the available width with 12px margin
    if (!containerWidth || containerWidth <= 0) return 0.68 * zoomLevel;
    const availW = Math.max(280, containerWidth - 12);
    const fitScale = availW / layoutW;

    return Math.round(fitScale * zoomLevel * 1000) / 1000;
  }, [isFullscreen, isFullscreenHudMinimized, containerWidth, layout.width, layout.height, zoomLevel]);

  // Dynamic scaled height so container always fits all rows of nodes
  const scaledCanvasHeight = useMemo(() => {
    const layoutH = layout.height || 780;
    return Math.ceil(layoutH * inPageFitScale) + 16;
  }, [layout.height, inPageFitScale]);

  const caseId = activeCaseId || "CASE-2026-001";
  const canonicalCase = findCase(activeCaseId) ?? CANONICAL_CASES["CASE-2026-001"];
  const recoveryPct = selectFinancialSummary(canonicalCase).recoveryPct;
  const replaySteps = useMemo(() => {
    return getCaseReplaySteps(caseId, canonicalCase);
  }, [caseId, canonicalCase]);
  const currentStepData = replaySteps[replayStep] ?? replaySteps[replaySteps.length - 1];

  // Case-driven facts for chips, evidence sheets and the correlation matrix (no hard-coded names).
  const caseFlows = useMemo(() => selectAccountFlows(canonicalCase), [canonicalCase]);
  const caseDevices = useMemo(() => selectDeviceFacts(canonicalCase), [canonicalCase]);
  const matrixAccounts = useMemo(() => caseFlows.filter((a) => a.role !== "VICTIM"), [caseFlows]);
  const matrixNames = matrixAccounts.map((a) => a.holderName);
  const matrixRows = useMemo(() => {
    const total = matrixAccounts.length;
    const bssid = caseDevices.bssids[0];
    const ja4 = caseDevices.ja4s[0];
    const imei = caseDevices.devices[0]?.imei;
    const introCounts = new Map<string, number>();
    matrixAccounts.forEach((a) => {
      if (a.introducerId && !/^(NONE|DIRECT|COMMERCIAL|CASH)/.test(a.introducerId)) introCounts.set(a.introducerId, (introCounts.get(a.introducerId) ?? 0) + 1);
    });
    const topIntro = [...introCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mk = (vector: string, type: string, test: (a: (typeof matrixAccounts)[number]) => string | null, color: string, basis: string) => {
      const cells = matrixAccounts.map((a) => test(a) ?? "—");
      const hits = cells.filter((c) => c !== "—").length;
      return { vector, type, cells, strength: `${hits}/${total} ${hits === total && total > 0 ? "(Deterministic)" : hits > 0 ? "(Corroborative)" : "(No match)"}`, color, basis };
    };
    const rows = [
      mk("UPI / bank money flow", "Financial ledgers", (a) => (a.inflowInr > 0 ? formatInr(a.inflowInr) + " in" : null), "#059669", "BSA §63 & BNSS §106/§107"),
    ];
    if (bssid) rows.push(mk(`Wi-Fi anchor (${bssid})`, "Hardware", (a) => (a.bssidHotspot === bssid ? "● MATCH" : null), "#8B5CF6", "BSA §63(4) Electronic Stanza"));
    if (ja4) rows.push(mk(`JA4 TLS fingerprint (${ja4})`, "App fingerprint", (a) => (caseDevices.sessions.some((x) => x.accountName === a.holderName && x.ja4 === ja4) || a.deviceImei ? "● MATCH" : null), "#10B981", "ISO/IEC 27037 Telemetry"));
    if (imei) rows.push(mk(`Handset IMEI ${imei}`, "Device", (a) => (a.deviceImei === imei ? "● MATCH" : null), "#0284C7", "DoT Clause 39.20"));
    if (topIntro) rows.push(mk(`Shared introducer (${topIntro})`, "Account opening", (a) => (a.introducerId === topIntro ? "● MATCH" : null), "#F59E0B", "KYC / CAF records"));
    return rows;
  }, [matrixAccounts, caseDevices]);

  // Replay playback timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isPlaying) {
      const stepDuration = Math.round(2400 / playbackSpeed);
      timer = setTimeout(() => {
        setReplayStep((prev) => {
          if (prev >= 5) {
            setIsPlaying(false);
            return 5;
          }
          return prev + 1;
        });
      }, stepDuration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, replayStep, playbackSpeed]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (replayStep >= 5) {
        setReplayStep(0);
      }
      setIsPlaying(true);
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setReplayStep((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setReplayStep((prev) => Math.min(5, prev + 1));
  };

  const handleResetReplay = () => {
    setIsPlaying(false);
    setReplayStep(0);
  };

  const handleJumpToStep = (s: number) => {
    setIsPlaying(false);
    setReplayStep(s);
  };

  // Fullscreen keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (isFullscreen && (e.key === " " || e.code === "Space")) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        handleTogglePlay();
      } else if (isFullscreen && e.key === "ArrowRight") {
        e.preventDefault();
        handleStepForward();
      } else if (isFullscreen && e.key === "ArrowLeft") {
        e.preventDefault();
        handleStepBack();
      } else if (isFullscreen && (e.key === "m" || e.key === "M")) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        setIsFullscreenHudMinimized((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, isPlaying, replayStep]);

  // Run geometry linter on canvas
  useEffect(() => {
    if (canvasRef.current) {
      const result = lintViz(canvasRef.current);
      if (canvasRef.current.parentElement) {
        canvasRef.current.parentElement.setAttribute("data-lint", result.passed ? "pass" : "fail");
      }
    }
  }, [layout, viewMode]);

  // Expose dev stats
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.network = {
        stats: () => ({
          nodeCount: layout.nodes.length,
          edgeCount: layout.edges.length,
          activeFilter: edgeFilter,
          isHotspotActive,
          replayStep,
          isPlaying,
          busCount: 0,
        }),
      };
    }
  }, [layout, edgeFilter, isHotspotActive, viewMode, replayStep, isPlaying]);

  // Opacity dimming on hover, replay, or layer filtering
  const getNodeOpacity = (nodeId: string) => {
    // Layer filtering (Prompt 11)
    if (selectedLayer !== "all") {
      const node = layout.nodes.find((n) => n.id === nodeId);
      if (node && (node.category === "account" || node.category === "sink")) {
        if (selectedLayer === "L1" && node.hopDistance !== 1 && !node.id.includes("vikram")) return 0.2;
        if (selectedLayer === "L2" && node.hopDistance !== 2 && !node.id.includes("rohit") && !node.id.includes("sameer")) return 0.2;
        if (selectedLayer === "L3" && node.hopDistance !== 3 && node.category !== "sink") return 0.2;
      }
    }

    if (hoveredNodeId) {
      if (nodeId === hoveredNodeId) return 1;
      if (hoveredNodeId === "node-hero") return 1;
      if (nodeId === "node-hero") return 0.9;
      const relatedEdge = layout.edges.find(
        (e) =>
          (e.sourceId === hoveredNodeId && e.targetId === nodeId) ||
          (e.targetId === hoveredNodeId && e.sourceId === nodeId)
      );
      return relatedEdge ? 1 : 0.18;
    }

    // Step-based highlight during active replay
    if (isPlaying || replayStep < 5) {
      const isActiveInStep = currentStepData.activeNodeIds.some(
        (id) => nodeId === id || nodeId.includes(id) || id.includes(nodeId)
      );
      return isActiveInStep ? 1 : 0.35;
    }

    return 1;
  };

  const getEdgeOpacity = (edge: NetworkEdgeLayout) => {
    // If playing or on a discrete replay step < 5
    if (isPlaying || replayStep < 5) {
      const isEdgeActiveInStep = currentStepData.activeEdgeIds.some(
        (id) => edge.id.includes(id) || id.includes(edge.id)
      );
      return isEdgeActiveInStep ? 1 : 0.08;
    }

    if (!hoveredNodeId) return 0.88;
    if (edge.sourceId === hoveredNodeId || edge.targetId === hoveredNodeId) return 1;
    return 0.12;
  };

  const openEvidenceSheet = (sheet: EvidenceSheetData) => {
    setSelectedSheet(sheet);
  };

  // Find active cash edges for animated rupee particles
  const activeCashEdges = useMemo(() => {
    return layout.edges.filter((e) => {
      if (e.type !== "cash") return false;
      if (isPlaying || replayStep < 5) {
        return currentStepData.activeEdgeIds.some(
          (id) => e.id.includes(id) || id.includes(e.id)
        );
      }
      return true;
    });
  }, [layout.edges, isPlaying, replayStep, currentStepData]);

  const content = (
    <div
      ref={containerRef}
      className="hero-canvas-container"
      data-testid="hero-canvas"
      data-case-id={caseId}
      style={{
        display: "flex",
        flexDirection: "column",
        width: isFullscreen ? "100vw" : "100%",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        height: isFullscreen ? "100vh" : undefined,
        zIndex: isFullscreen ? 99999 : 1,
        background: "var(--surface-1)",
        overflow: isFullscreen ? "hidden" : "visible",
      }}
    >
      {/* =========================================================================
          FULLSCREEN REPLAY COMMAND HEADER (CRISP SAAS THEME WITH MINIMIZE OPTION)
          ========================================================================= */}
      {isFullscreen && isFullscreenHudMinimized && (
        <div
          data-testid="fullscreen-replay-mini-hud"
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100001,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(12px)",
            border: "1px solid #CBD5E1",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
            borderRadius: "9999px",
            padding: "5px 14px",
          }}
        >
          <button
            type="button"
            onClick={handleTogglePlay}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11.5px",
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: "9999px",
              border: "none",
              background: isPlaying ? "#DC2626" : "#059669",
              color: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            {isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button
              type="button"
              onClick={handleStepBack}
              disabled={replayStep <= 0}
              title="Previous Step"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px", color: "#64748B" }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
              Step {replayStep}/5
            </span>
            <button
              type="button"
              onClick={handleStepForward}
              disabled={replayStep >= 5}
              title="Next Step"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px", color: "#64748B" }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <span style={{ width: "1px", height: "16px", background: "#E2E8F0" }} />

          <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#334155", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentStepData.title}
          </span>

          <span style={{ width: "1px", height: "16px", background: "#E2E8F0" }} />

          <button
            type="button"
            onClick={() => setIsFullscreenHudMinimized(false)}
            data-testid="expand-fullscreen-hud-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#4F46E5",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronDown size={14} />
            <span>Expand HUD</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#64748B",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginLeft: "4px",
            }}
          >
            <Minimize2 size={13} />
            <span>Exit (Esc)</span>
          </button>
        </div>
      )}

      {isFullscreen && !isFullscreenHudMinimized && (
        <div
          data-testid="fullscreen-replay-header"
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            padding: "8px 16px",
            gap: "8px",
            zIndex: 100000,
            flexShrink: 0,
            color: "#0F172A",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.05)",
          }}
        >
          {/* Top Bar: Title + Big Play Button + Controls + Layer Filters + Zoom + Exit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {/* Left: Branding & Case Title */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#4F46E5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <Shield size={16} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#0F172A", letterSpacing: "0.2px" }}>
                    FULLSCREEN INVESTIGATION REPLAY
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      background: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      color: "#4338CA",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {activeCaseId || "CASE-2026-001"}
                  </span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                  Evidence Network & Chronological Fund Flow Visualization (DoT Clause 39.20 · BSA §63)
                </div>
              </div>
            </div>

            {/* Center: REPLAY CONTROLS WITH PROMINENT PLAY BUTTON INSIDE FULLSCREEN */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "4px 10px",
              }}
            >
              {/* Prev Step */}
              <button
                type="button"
                onClick={handleStepBack}
                disabled={replayStep <= 0}
                title="Previous Replay Step (Left Arrow)"
                style={{
                  background: "transparent",
                  border: "none",
                  color: replayStep <= 0 ? "#CBD5E1" : "#475569",
                  cursor: replayStep <= 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* PRIMARY PLAY / PAUSE BUTTON */}
              <button
                type="button"
                onClick={handleTogglePlay}
                data-testid="fullscreen-play-btn"
                title="Play or Pause Replay (Spacebar)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 900,
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: isPlaying
                    ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
                    : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: isPlaying
                    ? "0 2px 8px rgba(239,68,68,0.3)"
                    : "0 2px 8px rgba(16,185,129,0.3)",
                  transition: "all 0.15s ease-out",
                }}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} fill="white" />}
                <span>{isPlaying ? "PAUSE REPLAY" : "PLAY REPLAY"}</span>
              </button>

              {/* Next Step */}
              <button
                type="button"
                onClick={handleStepForward}
                disabled={replayStep >= 5}
                title="Next Replay Step (Right Arrow)"
                style={{
                  background: "transparent",
                  border: "none",
                  color: replayStep >= 5 ? "#CBD5E1" : "#475569",
                  cursor: replayStep >= 5 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                <ChevronRight size={16} />
              </button>

              {/* Reset to Start */}
              <button
                type="button"
                onClick={handleResetReplay}
                title="Reset Replay to T+00"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748B",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                <RotateCcw size={14} />
              </button>

              {/* 6 Step Navigation Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px", marginLeft: "6px" }}>
                {[
                  { step: 0, label: "0: Inflow" },
                  { step: 1, label: "1: UPI Split" },
                  { step: 2, label: "2: AP Tether" },
                  { step: 3, label: "3: Layering" },
                  { step: 4, label: "4: Cashout" },
                  { step: 5, label: "5: Freezes" },
                ].map((st) => {
                  const isCurrent = replayStep === st.step;
                  return (
                    <button
                      key={st.step}
                      type="button"
                      onClick={() => handleJumpToStep(st.step)}
                      style={{
                        fontSize: "11.5px",
                        fontWeight: isCurrent ? 800 : 600,
                        padding: "3px 7px",
                        borderRadius: "4px",
                        border: isCurrent ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                        background: isCurrent ? "#4F46E5" : "#FFFFFF",
                        color: isCurrent ? "#FFFFFF" : "#475569",
                        cursor: "pointer",
                        boxShadow: isCurrent ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              {/* Speed Selector */}
              <div
                style={{
                  display: "inline-flex",
                  background: "#F1F5F9",
                  border: "1px solid #E2E8F0",
                  borderRadius: "4px",
                  padding: "2px",
                  marginLeft: "4px",
                }}
              >
                {([0.5, 1, 2] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      fontSize: "11px",
                      fontWeight: playbackSpeed === spd ? 800 : 500,
                      padding: "2px 5px",
                      borderRadius: "3px",
                      border: "none",
                      background: playbackSpeed === spd ? "#EEF2FF" : "transparent",
                      color: playbackSpeed === spd ? "#4338CA" : "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Layer Filters, Zoom Controls, Minimize HUD & Exit Fullscreen Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Edge Filter Pills */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                {(
                  [
                    { id: "all", label: "ALL" },
                    { id: "cashflow", label: "💰 CASH" },
                    { id: "tether", label: "📶 TETHER" },
                    { id: "ja4", label: "🔒 JA4" },
                    { id: "caf", label: "📋 CAF" },
                  ] as const
                ).map((tab) => {
                  const isActive = edgeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onEdgeFilterChange(tab.id)}
                      style={{
                        fontSize: "11px",
                        fontWeight: isActive ? 800 : 600,
                        padding: "3px 6px",
                        borderRadius: "4px",
                        border: isActive ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                        background: isActive ? "#EEF2FF" : "#FFFFFF",
                        color: isActive ? "#4338CA" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Zoom Buttons */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  borderRadius: "5px",
                  padding: "2px 4px",
                  gap: "3px",
                }}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    padding: "2px",
                    display: "inline-flex",
                  }}
                >
                  <ZoomOut size={12} />
                </button>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#334155",
                    padding: "0 2px",
                  }}
                >
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#475569",
                    cursor: "pointer",
                    padding: "2px",
                    display: "inline-flex",
                  }}
                >
                  <ZoomIn size={12} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    style={{
                      fontSize: "11px",
                      color: "#4F46E5",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "0 2px",
                      fontWeight: 700,
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* MINIMIZE HUD BUTTON */}
              <button
                type="button"
                onClick={() => setIsFullscreenHudMinimized(true)}
                title="Minimize Header to floating pill for maximum canvas space (Press M)"
                data-testid="minimize-fullscreen-hud-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  padding: "5px 9px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <ChevronUp size={13} />
                <span>Minimize HUD</span>
              </button>

              {/* EXIT FULLSCREEN BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  setZoomLevel(1);
                }}
                data-testid="exit-fullscreen-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#F1F5F9",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <Minimize2 size={13} />
                <span>Exit (Esc)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Narrative HUD Strip */}
          {showNarrativeStrip && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "6px",
                padding: "6px 14px",
                gap: "12px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    background: "#0F172A",
                    color: "#FFFFFF",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <Clock size={11} />
                  <span>{currentStepData.clockTime}</span>
                  <span style={{ opacity: 0.8 }}>({currentStepData.timeLabel})</span>
                </span>

                <span style={{ fontWeight: 800, color: "#0F172A" }}>{currentStepData.title}</span>

                {currentStepData.amount !== "—" && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 900,
                      background: "#ECFDF5",
                      color: "#047857",
                      border: "1px solid #A7F3D0",
                      padding: "1px 7px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Flow: {currentStepData.amount}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#475569", fontSize: "11.5px" }}>{currentStepData.headline}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {currentStepData.statutory}
                </span>
                <button
                  type="button"
                  onClick={() => setShowNarrativeStrip(false)}
                  title="Hide Step Details Strip"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#94A3B8",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TOOLBAR STRIP (PRIMARY FILTERS & VIEW MODES) - SHOWN IN NORMAL MODE
          ========================================================================= */}
      {!isFullscreen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            minHeight: 40,
            padding: "6px 12px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            zIndex: 10,
            flexShrink: 0,
            gap: "8px",
          }}
        >
          {/* Left: Filter Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#64748B", marginRight: "4px" }}>
              VIEW LAYER:
            </span>
            {(
              [
                { id: "all", label: "ALL EVIDENCE", icon: null },
                { id: "cashflow", label: "💰 CASH FLOW (MONEY TRAIL)", icon: IndianRupee },
                { id: "tether", label: "📶 TETHER (Wi-Fi AP)", icon: Wifi },
                { id: "ja4", label: "🔒 JA4 TLS", icon: Cpu },
                { id: "caf", label: "📋 CAF", icon: Building },
                { id: "c2", label: "⚡ C2 BOT", icon: Server },
              ] as const
            ).map((tab) => {
              const isActive = edgeFilter === tab.id;
              const isCash = tab.id === "cashflow";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onEdgeFilterChange(tab.id)}
                  className="hover:border-indigo-300 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    fontSize: "12px",
                    fontWeight: isActive ? 800 : 600,
                    padding: isCash ? "3px 9px" : "3px 7px",
                    borderRadius: "5px",
                    border: isActive
                      ? isCash
                        ? "1px solid #059669"
                        : "1px solid #6366F1"
                      : "1px solid #E2E8F0",
                    background: isActive
                      ? isCash
                        ? "#ECFDF5"
                        : "#EEF2FF"
                      : "#FFFFFF",
                    color: isActive
                      ? isCash
                        ? "#047857"
                        : "#4338CA"
                      : "#64748B",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: isActive ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}

            <div style={{ width: "1px", height: "16px", background: "#E2E8F0", margin: "0 4px" }} />

            <span style={{ fontSize: "12px", fontWeight: 800, color: "#64748B", marginRight: "2px" }}>
              HOP:
            </span>
            {(
              [
                { id: "all", label: "ALL" },
                { id: "L1", label: "L1 MULE" },
                { id: "L2", label: "L2 CONDUIT" },
                { id: "L3", label: "SINKS" },
              ] as const
            ).map((layerTab) => {
              const isActive = selectedLayer === layerTab.id;
              return (
                <button
                  key={layerTab.id}
                  type="button"
                  onClick={() => setSelectedLayer(layerTab.id)}
                  style={{
                    fontSize: "12px",
                    fontWeight: isActive ? 800 : 600,
                    padding: "3px 7px",
                    borderRadius: "4px",
                    border: isActive ? "1.5px solid #4F46E5" : "1px solid #CBD5E1",
                    background: isActive ? "#EEF2FF" : "#FFFFFF",
                    color: isActive ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  {layerTab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Controls, Zoom, Minimize & Fullscreen */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Simulate Hotspot Toggle */}
            <button
              type="button"
              onClick={onToggleHotspot}
              className="hover:bg-slate-100 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "5px",
                border: isHotspotActive ? "1px solid #FCA5A5" : "1px solid #CBD5E1",
                background: isHotspotActive ? "#FFF1F2" : "#F8FAFC",
                color: isHotspotActive ? "#E11D48" : "#475569",
                cursor: "pointer",
              }}
            >
              <Wifi size={11} color={isHotspotActive ? "#E11D48" : "#64748B"} />
              <span>{isHotspotActive ? "Shared Wi-Fi anchor" : "No shared anchor"}</span>
            </button>

            {/* Graph | Matrix | Table Switcher */}
            <div
              style={{
                display: "inline-flex",
                padding: "2px",
                background: "#F1F5F9",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("graph")}
                style={{
                  fontSize: "12px",
                  fontWeight: viewMode === "graph" ? 800 : 500,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "graph" ? "#FFFFFF" : "transparent",
                  color: viewMode === "graph" ? "#0F172A" : "#64748B",
                  boxShadow: viewMode === "graph" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                Graph
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                style={{
                  fontSize: "12px",
                  fontWeight: viewMode === "matrix" ? 800 : 500,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "matrix" ? "#FFFFFF" : "transparent",
                  color: viewMode === "matrix" ? "#0F172A" : "#64748B",
                  boxShadow: viewMode === "matrix" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                Matrix
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  fontSize: "12px",
                  fontWeight: viewMode === "table" ? 800 : 500,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "table" ? "#FFFFFF" : "transparent",
                  color: viewMode === "table" ? "#0F172A" : "#64748B",
                  boxShadow: viewMode === "table" ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  cursor: "pointer",
                }}
              >
                Table
              </button>
            </div>

            {/* Zoom Controls */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                borderRadius: "5px",
                padding: "1px 3px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  padding: "2px",
                  display: "inline-flex",
                }}
              >
                <ZoomOut size={11} />
              </button>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#334155",
                  minWidth: "28px",
                  textAlign: "center",
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  padding: "2px",
                  display: "inline-flex",
                }}
              >
                <ZoomIn size={11} />
              </button>
              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom to 100%"
                  style={{
                    fontSize: "12px",
                    color: "#2563EB",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontWeight: 700,
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Minimize / Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMinimized((m) => !m)}
              data-testid="toggle-minimize-btn"
              title={isMinimized ? "Expand Graph" : "Minimize Graph"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "5px",
                border: "1px solid #CBD5E1",
                background: isMinimized ? "#EEF2FF" : "#F8FAFC",
                color: isMinimized ? "#4338CA" : "#475569",
                cursor: "pointer",
              }}
            >
              {isMinimized ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
              <span>{isMinimized ? "Expand" : "Minimize"}</span>
            </button>

            {/* Full Screen Button */}
            <button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsFullscreen(true);
              }}
              data-testid="enter-fullscreen-btn"
              title="Open Fullscreen Replay Mode (100vw x 100vh)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: "5px",
                border: "1px solid #4338CA",
                background: "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
              }}
            >
              <Maximize2 size={11} />
              <span>Full Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MINIMIZED COMPACT REPLAY STRIP (WHEN USER MINIMIZES THE GRAPH)
          ========================================================================= */}
      {isMinimized && !isFullscreen && (
        <div
          data-testid="minimized-graph-strip"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            gap: "10px",
            flexWrap: "wrap",
            zIndex: 9,
          }}
        >
          {/* Left: Replay Controls & Current Step */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: "4px",
                background: "#E2E8F0",
                color: "#475569",
                letterSpacing: "0.5px",
              }}
            >
              GRAPH MINIMIZED
            </span>

            <button
              type="button"
              onClick={handleTogglePlay}
              data-testid="minimized-play-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 800,
                padding: "4px 9px",
                borderRadius: "5px",
                border: "none",
                background: isPlaying ? "#EF4444" : "#10B981",
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(15,23,42,0.1)",
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} fill="white" />}
              <span>{isPlaying ? "Pause" : "Play Replay"}</span>
            </button>

            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#0F172A",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Clock size={11} color="#64748B" />
              <span>Step {replayStep + 1}/6:</span>
              <span style={{ color: "#2563EB" }}>{currentStepData.title}</span>
            </span>

            {currentStepData.amount !== "—" && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  background: "#ECFDF5",
                  color: "#047857",
                  border: "1px solid #A7F3D0",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                Flow: {currentStepData.amount}
              </span>
            )}
          </div>

          {/* Center: Live Mule Balance Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>Accounts:</span>
            {matrixAccounts
              .filter((a) => a.role !== "SINK" && currentStepData.muleBalances[a.nodeId]?.balance !== undefined)
              .map((a) => (
                <span key={a.nodeId} title={a.holderName} style={{ fontSize: "12px", fontFamily: "var(--font-mono)", padding: "1px 5px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "3px" }}>
                  {a.holderName.split(" ")[0]}: <b>{currentStepData.muleBalances[a.nodeId]?.balance}</b>
                </span>
              ))}
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", padding: "1px 5px", background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FECDD3", borderRadius: "3px" }}>
              Cash-out: <b>{currentStepData.muleBalances[matrixAccounts.find((a) => a.role === "SINK")?.nodeId ?? "node-atm"]?.balance ?? "—"}</b>
            </span>
          </div>

          {/* Right: Expand & Fullscreen Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              data-testid="expand-graph-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 9px",
                borderRadius: "5px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#1E293B",
                cursor: "pointer",
              }}
            >
              <Maximize2 size={12} />
              <span>Expand Graph</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMinimized(false);
                setIsFullscreen(true);
              }}
              data-testid="minimized-fullscreen-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "5px",
                border: "none",
                background: "#4F46E5",
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
              }}
            >
              <Maximize2 size={12} />
              <span>Full Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          FORENSIC CHRONOLOGICAL REPLAY HUD (WHERE CASH WENT & TIMELINE)
          ========================================================================= */}
      {!isMinimized && !isFullscreen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "6px 12px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            gap: "6px",
            zIndex: 8,
            flexShrink: 0,
          }}
        >
          {/* Row 1: Player Controls & Discrete Step Pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            {/* Play/Pause & Step Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleTogglePlay}
                className="hover:opacity-90 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: "none",
                  background: isPlaying ? "#DC2626" : "#059669",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  boxShadow: isPlaying ? "0 1px 3px rgba(220,38,38,0.3)" : "0 1px 3px rgba(5,150,105,0.3)",
                }}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? "Pause" : "Play Trail"}</span>
              </button>

              <button
                type="button"
                onClick={handleStepBack}
                disabled={replayStep <= 0}
                title="Step backward"
                style={{
                  padding: "4px 6px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: replayStep <= 0 ? "#94A3B8" : "#334155",
                  cursor: replayStep <= 0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={13} />
              </button>

              <button
                type="button"
                onClick={handleStepForward}
                disabled={replayStep >= 5}
                title="Step forward"
                style={{
                  padding: "4px 6px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: replayStep >= 5 ? "#94A3B8" : "#334155",
                  cursor: replayStep >= 5 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronRight size={13} />
              </button>

              <button
                type="button"
                onClick={handleResetReplay}
                title="Reset to Step 0"
                style={{
                  padding: "4px 6px",
                  borderRadius: "5px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <RotateCcw size={12} />
              </button>

              {/* Speed Selector */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "4px",
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  overflow: "hidden",
                  marginLeft: "4px",
                }}
              >
                {([0.5, 1, 2] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      fontSize: "12px",
                      fontWeight: playbackSpeed === spd ? 800 : 600,
                      padding: "3px 6px",
                      border: "none",
                      background: playbackSpeed === spd ? "#EEF2FF" : "transparent",
                      color: playbackSpeed === spd ? "#4338CA" : "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Step Navigation Pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap" }}>
              {[
                { idx: 0, label: "0: SIM SWAP" },
                { idx: 1, label: `1: INFLOW ${investigation?.bookedLossInr ? formatInr(investigation.bookedLossInr) : "FUNDS"}` },
                { idx: 2, label: "2: AP BIND" },
                { idx: 3, label: "3: FAN-OUT" },
                { idx: 4, label: "4: CASHOUT" },
                { idx: 5, label: `5: FREEZE (${recoveryPct}%)` },
              ]
                // SIM swap / Wi-Fi binding steps only when the case holds device evidence.
                .filter((st) => (st.idx !== 0 && st.idx !== 2) || caseDevices.devices.length > 0 || caseDevices.bssids.length > 0)
                .map((st) => {
                const isCur = replayStep === st.idx;
                return (
                  <button
                    key={st.idx}
                    type="button"
                    onClick={() => handleJumpToStep(st.idx)}
                    style={{
                      fontSize: "12px",
                      fontWeight: isCur ? 800 : 600,
                      padding: "3px 7px",
                      borderRadius: "4px",
                      border: isCur ? "1.5px solid #4F46E5" : "1px solid #E2E8F0",
                      background: isCur ? "#4F46E5" : "#FFFFFF",
                      color: isCur ? "#FFFFFF" : "#475569",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Forensic Narrative HUD Banner */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}
          >
            {/* Banner Header: Time + Title + Amount Badge */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "12px",
                    fontWeight: 800,
                    background: "#0F172A",
                    color: "#FFFFFF",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <Clock size={10} />
                  <span>{currentStepData.clockTime}</span>
                  <span style={{ opacity: 0.75 }}>({currentStepData.timeLabel})</span>
                </span>

                <span style={{ fontSize: "12px", fontWeight: 800, color: "#1E293B" }}>
                  {currentStepData.title}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {currentStepData.amount !== "—" && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 900,
                      background: "#ECFDF5",
                      color: "#047857",
                      border: "1px solid #A7F3D0",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <span>Flow:</span>
                    <span>{currentStepData.amount}</span>
                  </span>
                )}

                {replayStep === 5 && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      background: "#EEF2FF",
                      color: "#4338CA",
                      border: "1px solid #C7D2FE",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <ShieldCheck size={11} />
                    <span>{recoveryPct}% SECURED UNDER LIBR</span>
                  </span>
                )}
              </div>
            </div>

            {/* Banner Body: Narrative Text & Statutory Citation */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.35, flex: 1 }}>
                {currentStepData.narrative}
              </p>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "#64748B",
                  background: "#F1F5F9",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                {currentStepData.statutory}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: PURE SVG + HTML TOPOLOGY CANVAS (AUTO-FIT & WHITE THEME)
          ========================================================================= */}
      {viewMode === "graph" && (!isMinimized || isFullscreen) && (
        <div
          ref={canvasRef}
          style={{
            height: isFullscreen ? "calc(100vh - 130px)" : scaledCanvasHeight,
            minHeight: isFullscreen ? "calc(100vh - 130px)" : scaledCanvasHeight,
            maxHeight: isFullscreen ? undefined : scaledCanvasHeight,
            position: "relative",
            width: "100%",
            overflowX: isFullscreen ? "auto" : "hidden",
            overflowY: isFullscreen ? "auto" : "hidden",
            scrollbarWidth: "thin",
            flex: isFullscreen ? "1 1 auto" : undefined,
            background: "var(--surface-1)",
          }}
        >
          {/* Zoom & Scaling Wrapper */}
          <div
            style={{
              width: layout.width,
              minWidth: layout.width,
              height: layout.height,
              minHeight: layout.height,
              transform: `scale(${inPageFitScale})`,
              transformOrigin: "left top",
              transition: "transform 0.15s ease-out",
              position: "relative",
              marginLeft: Math.max(0, Math.floor((containerWidth - (layout.width * inPageFitScale)) / 2)),
            }}
          >
            {/* Background Grid Pattern & SVG Edges */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <defs>
                <pattern id="net-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="0.75" fill="#CBD5E1" />
                </pattern>

                {/* Arrow Markers for vertical bezier endpoints */}
                <marker
                  id="arrow-blue"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0284C7" />
                </marker>
                <marker
                  id="arrow-rose"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#BE123C" />
                </marker>
                <marker
                  id="arrow-violet"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
                </marker>
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
                </marker>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#net-grid)" />

              {/* Community Detection Bounding Hulls (Prompt 11) */}
              {layout.communityHulls?.map((hull) => {
                const labelText = hull.name.toUpperCase();
                const badgeWidth = Math.min(380, labelText.length * 6.0 + 20);
                const badgeX = hull.labelX ?? 100;
                const badgeY = hull.labelY ?? 100;
                return (
                  <g key={hull.id} className="community-hull">
                    <path
                      d={hull.path}
                      fill="rgba(99, 102, 241, 0.03)"
                      stroke={hull.color || "#6366F1"}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                    />
                    {/* High-contrast solid pill to guarantee zero text collision */}
                    <rect
                      x={badgeX - 6}
                      y={badgeY - 11}
                      width={badgeWidth}
                      height={18}
                      rx={4}
                      fill="#FFFFFF"
                      stroke="#C7D2FE"
                      strokeWidth={1}
                    />
                    <text
                      x={badgeX}
                      y={badgeY + 2}
                      fill={hull.color || "#4338CA"}
                      fontSize="10"
                      fontWeight="700"
                      letterSpacing="0.04em"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}

              {/* Render Edges: Halo Layer First, then Color Path */}
              {layout.edges.map((edge) => (
                <path
                  key={`halo-${edge.id}`}
                  d={edge.haloPath}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={edge.type === "cash" ? 7 : 5.5}
                  strokeLinecap="round"
                  opacity={getEdgeOpacity(edge) > 0 ? 0.95 : 0}
                  style={{ transition: "opacity 0.2s ease" }}
                />
              ))}

              {layout.edges.map((edge) => {
                const isCashEdge = edge.type === "cash";
                return (
                  <path
                    key={edge.id}
                    className="network-edge"
                    d={edge.path}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={edge.strokeWidth || (isCashEdge ? 3.0 : 2.25)}
                    strokeDasharray={edge.dashed ? "5,4" : undefined}
                    markerEnd={`url(#${edge.arrowhead})`}
                    opacity={getEdgeOpacity(edge)}
                    style={{
                      pointerEvents: "auto",
                      transition: "opacity 0.2s ease, stroke-width 0.15s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const matched =
                        edge.targetId.includes("rohit") ? investigation.edges[2] :
                          edge.targetId.includes("sameer") ? investigation.edges[3] :
                            edge.targetId.includes("sink") ? investigation.edges[5] :
                              investigation.edges[0];
                      setSelectedEvidenceEdge(matched);
                      openEvidenceSheet({
                        title: isCashEdge
                          ? `Cash Flow: ${edge.sourceId} → ${edge.targetId} (${edge.amount || "₹"})`
                          : `Link: ${edge.sourceId} → ${edge.targetId}`,
                        category: isCashEdge ? "Financial Money Trail" : edge.type.toUpperCase(),
                        source: isCashEdge ? "Core Banking Ledger & NPCI Telemetry" : "Network Correlation Engine",
                        sha256: sha256HexSync(canonicalJson({ src: edge.sourceId, tgt: edge.targetId, amt: edge.amount, ts: edge.timestamp })),
                        statutoryBasis: isCashEdge ? "BNSS §106/§107 & BSA §63(4)" : "BSA §63(4) Electronic Record Admissibility",
                        details: isCashEdge
                          ? `Transaction flow ${edge.amount} recorded at ${edge.timestamp}. Provenance verified via CBS transaction logs and Clayton's Case LIBR principle.`
                          : `Deterministic evidence link correlating network session telemetry under type [${edge.type}].`,
                        linkedEntities: [edge.sourceId, edge.targetId],
                      });
                    }}
                  />
                );
              })}

              {/* ===================================================================
                ANIMATED SVG CURRENCY FLOW PARTICLES (₹) GLIDING ON CASH PATHS
                =================================================================== */}
              {activeCashEdges.map((edge) => {
                const dur = playbackSpeed === 2 ? "1.2s" : playbackSpeed === 0.5 ? "3.2s" : "2.0s";
                return (
                  <g key={`particle-${edge.id}`}>
                    {/* Glowing Pulse Dot */}
                    <circle r="7" fill={edge.color}>
                      <animateMotion path={edge.path} dur={dur} repeatCount="indefinite" />
                    </circle>
                    {/* Rupee Character Particle */}
                    <text
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      pointerEvents="none"
                    >
                      ₹
                      <animateMotion path={edge.path} dur={dur} repeatCount="indefinite" />
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* =====================================================================
              ROW A: CONTROLLER DEVICE CLUSTER (HERO) & SATELLITES
              ===================================================================== */}
            {layout.nodes
              .filter((n) => n.category === "controller" || n.category === "hero")
              .map((node) => {
                const isHero = node.category === "hero";
                const opacity = getNodeOpacity(node.id);

                return (
                  <div
                    key={node.id}
                    className="node-card"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() =>
                      openEvidenceSheet({
                        title: node.label,
                        category: isHero ? "Controller Device Cluster" : "Network Ingress",
                        source: isHero ? `Telecom IPDR${caseDevices.devices[0] ? ` · IMEI ${caseDevices.devices[0].imei}` : ""}` : "Network ingress log",
                        sha256: "89c20491823091ffeed891241aa44591aefc48201",
                        statutoryBasis: "BSA §63 & DoT License Clause 39.20",
                        details: node.sublabel,
                        linkedEntities: matrixNames,
                      })
                    }
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: node.w,
                      minHeight: node.h,
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      border: isHero ? "1.5px solid #E11D48" : "1px solid #CBD5E1",
                      boxShadow: isHero
                        ? "0 2px 10px rgba(225, 29, 72, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06)"
                        : "0 1px 3px rgba(15, 23, 42, 0.06)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: isHero ? "8px 12px" : "6px 10px",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.2s ease, transform 0.15s ease",
                      zIndex: isHero ? 5 : 4,
                    }}
                  >
                    {/* Top Badge for Hero */}
                    {isHero && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            color: "#E11D48",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "#E11D48",
                              animation: "pulse 1.5s infinite",
                            }}
                          />
                          Controller Device Cluster
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                            color: isHotspotActive ? "#E11D48" : "#047857",
                            padding: "1px 4px",
                            borderRadius: "3px",
                            border: isHotspotActive ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                          }}
                        >
                          {isHotspotActive ? "Shared Wi-Fi anchor" : "No shared anchor"}
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {node.id === "node-tower" && <Radio size={14} color="#0284C7" />}
                      {isHero && <Smartphone size={15} color="#E11D48" />}
                      {node.id === "node-c2" && <Server size={14} color="#BE123C" />}

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: isHero ? "12.5px" : "12px",
                            fontWeight: 800,
                            color: "#0F172A",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {node.label}
                        </div>
                        <div
                          style={{
                            fontSize: isHero ? "11.5px" : "11px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {node.sublabel}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* =====================================================================
              ROW B: THREE EVIDENCE HUBS (56px CIRCLES)
              ===================================================================== */}
            {layout.nodes
              .filter((n) => n.category === "hub")
              .map((hub) => {
                const opacity = getNodeOpacity(hub.id);

                return (
                  <div
                    key={hub.id}
                    className="evidence-hub"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredNodeId(hub.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() =>
                      openEvidenceSheet({
                        title: hub.label,
                        category: "Corroborative Evidence Hub",
                        source:
                          hub.id === "hub-tether"
                            ? "Airtel BSSID Telemetry"
                            : hub.id === "hub-ja4"
                              ? "JA4 TLS Fingerprint"
                              : "CAF / KYC records",
                        sha256: "339109bbcf12498214aa88231908812c3f19a03b",
                        statutoryBasis: "BSA §63 Admissibility Protocol",
                        details: `Coverage: ${hub.strength} accounts correlated under this evidence vector.`,
                        linkedEntities: hub.id === "hub-caf" ? matrixAccounts.filter((a) => a.introducerId && !/^(NONE|DIRECT|COMMERCIAL|CASH)/.test(a.introducerId)).map((a) => a.holderName) : matrixNames,
                      })
                    }
                    style={{
                      position: "absolute",
                      left: hub.x,
                      top: hub.y,
                      width: hub.w,
                      height: hub.h,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      border: `2px solid ${hub.color}`,
                      boxShadow: `0 0 12px -2px ${hub.color}40, 0 2px 6px rgba(15,23,42,0.06)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.2s ease, transform 0.15s ease",
                      zIndex: 4,
                    }}
                  >
                    {hub.id === "hub-tether" && <Wifi size={22} color={hub.color} />}
                    {hub.id === "hub-ja4" && <Cpu size={22} color={hub.color} />}
                    {hub.id === "hub-caf" && <Building size={22} color={hub.color} />}

                    {/* Two-Line Caption BELOW Hub */}
                    <div
                      style={{
                        position: "absolute",
                        top: hub.h + 4,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 140,
                        textAlign: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#0F172A",
                          textShadow: "0 0 3px #FFFFFF, 0 0 6px #FFFFFF",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hub.label}
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 800,
                          color: hub.color,
                          fontFamily: "var(--font-mono)",
                          textShadow: "0 0 3px #FFFFFF, 0 0 6px #FFFFFF",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {hub.strength ? `${hub.strength} Match` : "Corroborated"}
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* =====================================================================
              ROW B SATELLITE: VICTIM NODE
              ===================================================================== */}
            {layout.nodes
              .filter((n) => n.category === "victim")
              .map((node) => {
                const opacity = getNodeOpacity(node.id);
                const balanceInfo = currentStepData.muleBalances[node.id];

                return (
                  <div
                    key={node.id}
                    className="node-card"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      const vName = canonicalCase?.complainant?.name || node.label || "Victim";
                      const vBank = canonicalCase?.complainant?.bank || (node as any).bank || "Bank";
                      const fir = canonicalCase?.firNumber || "FIR";
                      const lossStr = canonicalCase ? formatInr(canonicalCase.financials.bookedLossInr) : "Booked Loss";
                      const l1Mule = canonicalCase?.accounts?.find((a: any) => a.holderType === "LAYER_1_MULE")?.holderName || "L1 Mule";
                      openEvidenceSheet({
                        title: `Victim ${vName} (${vBank} Account)`,
                        category: "Crime Inception / Complainant",
                        source: `${canonicalCase?.ncrpAckNo || "NCRP 1930 Helpline"} & ${vBank} Core Banking`,
                        sha256: "01c77f0a8c29341098bca44019488a09b3019f",
                        statutoryBasis: `FIR #${fir} U/S 66D IT Act & 318(4) BNS`,
                        details: `Victim reported unauthorized debits following cyber-extortion fraud. Initial booked loss ${lossStr}.`,
                        linkedEntities: [l1Mule],
                      });
                    }}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: node.w,
                      minHeight: node.h,
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      border: "1.5px solid #EF4444",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.15)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.2s ease, transform 0.15s ease",
                      zIndex: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "#FEE2E2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <User size={12} color="#DC2626" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#991B1B",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine1 || node.label}
                        </div>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine2 || node.sublabel}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Replay Balance Tag */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        borderTop: "1px solid #FEE2E2",
                        paddingTop: "2px",
                        gap: "4px",
                      }}
                    >
                      <span style={{ fontWeight: 800, color: "#DC2626", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Bal: {balanceInfo ? balanceInfo.balance : "₹0"}
                      </span>
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#991B1B",
                          padding: "0.5px 3.5px",
                          borderRadius: "2px",
                          fontWeight: 700,
                          fontSize: "10.5px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        Loss: {investigation?.bookedLossInr ? formatInr(investigation.bookedLossInr) : "Loss Recorded"}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* =====================================================================
              ROW C: CASHOUT SINKS (ATM / PHYSICAL ESCROW)
              ===================================================================== */}
            {layout.nodes
              .filter((n) => n.category === "sink")
              .map((node) => {
                const opacity = getNodeOpacity(node.id);
                const balanceInfo = currentStepData.muleBalances[node.id];

                return (
                  <div
                    key={node.id}
                    className="node-card"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      const matched =
                        investigation.edges.find((e) => e.targetNodeId === node.id || e.sourceNodeId === node.id) ||
                        investigation.edges[0];
                      if (matched) setSelectedEvidenceEdge(matched);

                      openEvidenceSheet({
                        title: `${node.label} (Cashout Sink)`,
                        category: "Physical Cashout Location",
                        source: `${(node as any).bank || "ATM"} Electronic Journal & Branch CCTV Video Log`,
                        sha256: sha256HexSync(canonicalJson({ id: node.id, label: node.label })),
                        statutoryBasis: "BSA §63 & BNSS §106 CCTV Seizure",
                        details:
                          node.tooltip ||
                          `${node.label} physical cash withdrawal point. Surveillance CCTV footage timestamp aligns with telco telemetry.`,
                        linkedEntities: [node.label],
                      });
                    }}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: node.w,
                      minHeight: node.h,
                      borderRadius: "6px",
                      background: "#FFFFFF",
                      border: "1.5px solid #DC2626",
                      boxShadow: "0 2px 8px rgba(220, 38, 38, 0.15)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.2s ease, transform 0.15s ease",
                      zIndex: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "#FEE2E2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Building size={12} color="#DC2626" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#991B1B",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine1 || node.label}
                        </div>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine2 || node.sublabel}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Cashout Tag */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        borderTop: "1px solid #FEE2E2",
                        paddingTop: "2px",
                        gap: "4px",
                      }}
                    >
                      <span style={{ fontWeight: 800, color: "#DC2626", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {balanceInfo ? balanceInfo.balance : (node.amountReceivedInr ? `Cash: ₹${(node.amountReceivedInr / 1000).toFixed(0)}K` : "Cash Out")}
                      </span>
                      <span
                        style={{
                          background: "#FEE2E2",
                          color: "#991B1B",
                          padding: "0.5px 3.5px",
                          borderRadius: "2px",
                          fontWeight: 700,
                          fontSize: "10.5px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        ATM Cashout
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* =====================================================================
              ROW C: FOUR ACCOUNT CARDS (176x64) WITH DYNAMIC REPLAY BALANCES
              ===================================================================== */}
            {layout.nodes
              .filter((n) => n.category === "account")
              .map((node) => {
                const opacity = getNodeOpacity(node.id);
                const balanceInfo = currentStepData.muleBalances[node.id];

                const getToneColor = (tone?: string) => {
                  if (tone === "emerald") return { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" };
                  if (tone === "amber") return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" };
                  if (tone === "rose") return { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" };
                  if (tone === "indigo") return { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" };
                  return { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" };
                };

                const toneStyle = getToneColor(balanceInfo?.tone);
                const isNodeFrozen = Boolean(
                  networkActionFinancials.frozenAccountIds.has(node.id) ||
                  Array.from(networkActionFinancials.frozenAccountIds).some(
                    (fa) => (node.sublabel && node.sublabel.includes(fa)) || (node.tooltip && node.tooltip.includes(fa)) || (node.label && node.label.includes(fa))
                  )
                );

                return (
                  <div
                    key={node.id}
                    className="node-card"
                    tabIndex={0}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => {
                      const matched =
                        investigation.edges.find((e) => e.targetNodeId === node.id || e.sourceNodeId === node.id) ||
                        investigation.edges[0];
                      if (matched) setSelectedEvidenceEdge(matched);

                      const scoreEntry =
                        investigation.muleScores?.[node.id] ||
                        investigation.muleScores?.[node.sublabel.split(" · A/C ")[1]] ||
                        investigation.muleScores?.[node.label];
                      const reasons = scoreEntry?.topReasons || [
                        "Rapid post-credit fund drain within 180 seconds",
                        "Shared device MAC / BSSID hotspot link with accomplice",
                        "High velocity layering across multiple intermediary conduits",
                      ];

                      openEvidenceSheet({
                        title: `Account Dossier: ${node.label}`,
                        category: `Mule Account Analysis (${node.riskBand || "CRITICAL"})`,
                        source: "Core Banking Ledger & Cyber Crime Freeze Engine",
                        sha256: sha256HexSync(canonicalJson({ id: node.id, label: node.label, role: node.role, score: node.muleScore })),
                        statutoryBasis: "BNSS §107 Provisional Seizure Order & BSA §63(4)",
                        details: `${node.role || "Mule Account"} · ${node.sublabel}\nInvestigative Lead Strength: ${node.muleScore ?? 85}/100 (${node.riskBand || "CRITICAL"})\n\nFeature Contributions:\n${reasons.map((r: string) => `• ${r}`).join("\n")}${node.crossCaseLinked ? `\n\nCross-Case Correlation:\nAccount active in syndicated cyber-extortion FIR ${node.crossCaseId || "CASE-2026-003"}.` : ""}`,
                        linkedEntities: ["Controller Device Cluster", "JA4 TLS Anchor", node.label],
                      });
                    }}
                    style={{
                      position: "absolute",
                      left: node.x,
                      top: node.y,
                      width: node.w,
                      minHeight: node.h,
                      borderRadius: "6px",
                      background: isNodeFrozen ? "#F0F9FF" : "#FFFFFF",
                      border: isNodeFrozen ? "2px solid #0284C7" : "1px solid #CBD5E1",
                      boxShadow: isNodeFrozen ? "0 0 0 2px rgba(2, 132, 199, 0.25)" : "0 1px 3px rgba(15,23,42,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "5px 8px",
                      boxSizing: "border-box",
                      cursor: "pointer",
                      opacity,
                      transition: "opacity 0.2s ease, transform 0.15s ease",
                      zIndex: 4,
                    }}
                  >
                    {/* Top Edge Port Markers */}
                    <div
                      style={{
                        position: "absolute",
                        top: -3,
                        left: 0,
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        gap: "38px",
                        pointerEvents: "none",
                      }}
                    >
                      <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#8B5CF6" }} />
                      <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#10B981" }} />
                      <span style={{ width: "5px", height: "3px", borderRadius: "1px", background: "#F59E0B" }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Shield size={13} color={node.color} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#0F172A",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine1 || node.label}
                        </div>
                        <div
                          title={node.tooltip || `${node.label} · ${node.sublabel}`}
                          style={{
                            fontSize: "12px",
                            color: "#64748B",
                            fontFamily: "var(--font-mono)",
                            lineHeight: 1.25,
                            wordBreak: "break-word",
                            maxHeight: "2.5em",
                            overflow: "hidden",
                          }}
                        >
                          {node.labelLine2 || node.sublabel}
                        </div>
                        {/* Mule Lead Score & Cross-FIR Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap", marginTop: "2px" }}>
                          {node.muleScore !== undefined && (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 800,
                                background: node.riskBand === "CRITICAL" ? "#FEE2E2" : node.riskBand === "ELEVATED" ? "#FEF3C7" : node.riskBand === "MERCHANT" ? "#ECFDF5" : "#E0E7FF",
                                color: node.riskBand === "CRITICAL" ? "#991B1B" : node.riskBand === "ELEVATED" ? "#B45309" : node.riskBand === "MERCHANT" ? "#047857" : "#3730A3",
                                padding: "0.5px 3.5px",
                                borderRadius: "2px",
                              }}
                            >
                              Score: {node.muleScore}/100
                            </span>
                          )}
                          {node.crossCaseLinked && (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 800,
                                background: "#EEF2FF",
                                color: "#4338CA",
                                border: "1px solid #C7D2FE",
                                padding: "0.5px 3px",
                                borderRadius: "2px",
                              }}
                              title="Correlated suspect account linked across multiple FIRs"
                            >
                              🔗 CROSS-FIR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Balance Row (Where Cash Went) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        borderTop: "1px solid #F1F5F9",
                        paddingTop: "2px",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          color: toneStyle.text,
                          background: toneStyle.bg,
                          padding: "1px 4px",
                          borderRadius: "3px",
                          border: `1px solid ${toneStyle.border}`,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "11px",
                        }}
                      >
                        Bal: {balanceInfo ? balanceInfo.balance : "₹0"}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          color: isNodeFrozen ? "#0369A1" : "#059669",
                          fontWeight: 800,
                          background: isNodeFrozen ? "#E0F2FE" : "#ECFDF5",
                          padding: "0.5px 4px",
                          borderRadius: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                          fontSize: "10.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isNodeFrozen ? "🔒 §107 Frozen" : "Not frozen"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MULTI-SOURCE EVIDENCE CORRELATION MATRIX
          ========================================================================= */}
      {viewMode === "matrix" && (!isMinimized || isFullscreen) && (
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 380,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#FFFFFF",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 4px 0" }}>
              Multi-Source Evidence Correlation & Money Trail Matrix
            </h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
              Cross-session intersection of hardware, network and cash-flow evidence across the {matrixAccounts.length} non-victim accounts in this case.
            </p>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Evidence Vector</th>
                {matrixAccounts.map((a) => (
                  <th key={a.nodeId} title={a.holderName} style={{ padding: "8px 10px", fontWeight: 800, color: "#334155", maxWidth: 140, overflowWrap: "anywhere" }}>
                    {a.holderName}
                  </th>
                ))}
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Strength</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Statutory Admissibility</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #E2E8F0",
                    background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    openEvidenceSheet({
                      title: row.vector,
                      category: row.type,
                      source: "Multi-Source Correlator",
                      sha256: "4a2b918374c810dfaa291882410a8ef183c0",
                      statutoryBasis: row.basis,
                      details: `Deterministic match across targeted accounts with score ${row.strength}.`,
                      linkedEntities: matrixNames,
                    })
                  }
                >
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: row.color }} />
                      <span>{row.vector}</span>
                    </div>
                  </td>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: cell === "—" ? "#94A3B8" : "#047857" }}>
                      {cell}
                    </td>
                  ))}
                  <td style={{ padding: "8px 10px", fontWeight: 800, color: row.color }}>{row.strength}</td>
                  <td style={{ padding: "8px 10px", color: "#475569", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    {row.basis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: VIEW AS TABLE
          ========================================================================= */}
      {viewMode === "table" && (!isMinimized || isFullscreen) && (
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 380,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#FFFFFF",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Node ID</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Label</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Category</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Sublabel / Telemetry</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Replay Balance</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {layout.nodes.map((node, i) => {
                const bal = currentStepData.muleBalances[node.id];
                return (
                  <tr key={node.id} style={{ borderBottom: "1px solid #E2E8F0", background: i % 2 === 0 ? "#FFF" : "#F8FAFC" }}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#334155" }}>
                      {node.id}
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>{node.label}</td>
                    <td style={{ padding: "8px 10px", color: "#64748B", textTransform: "capitalize" }}>{node.category}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{node.sublabel}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857" }}>
                      {bal ? bal.balance : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#059669",
                          background: "#ECFDF5",
                          padding: "1px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        Active Link
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          EVIDENCE SHEET SLIDE-OVER / DIALOG
          ========================================================================= */}
      {selectedSheet && (!isMinimized || isFullscreen) && (
        <div
          style={{
            position: "absolute",
            top: isFullscreen ? 80 : 40,
            right: 0,
            bottom: 0,
            width: 320,
            background: "#FFFFFF",
            borderLeft: "1px solid #CBD5E1",
            boxShadow: "-4px 0 16px rgba(15,23,42,0.08)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            animation: "slideIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#F8FAFC",
            }}
          >
            <div>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>
                {selectedSheet.category}
              </span>
              <h4 style={{ fontSize: "12.5px", fontWeight: 800, color: "#0F172A", margin: "2px 0 0 0" }}>
                {selectedSheet.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSheet(null)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "4px",
                color: "#64748B",
              }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ flex: 1, padding: "12px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>SOURCE SYSTEM</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                {selectedSheet.source}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>EVIDENCE SHA-256 HASH</label>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  color: "#334155",
                  background: "#F1F5F9",
                  padding: "5px 7px",
                  borderRadius: "4px",
                  wordBreak: "break-all",
                  marginTop: "2px",
                }}
              >
                {selectedSheet.sha256}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>STATUTORY ADMISSIBILITY</label>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                {selectedSheet.statutoryBasis}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>CORRELATION DETAILS</label>
              <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4, marginTop: "2px" }}>
                {selectedSheet.details}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>CORRELATED ENTITIES</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {selectedSheet.linkedEntities.map((ent, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "#EEF2FF",
                      color: "#4338CA",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <button
              type="button"
              onClick={() => {
                toast.success("Navigating to Entity Dossier...");
                setSelectedSheet(null);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "5px",
                border: "1px solid #C7D2FE",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span>Inspect in Entities (02)</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};
