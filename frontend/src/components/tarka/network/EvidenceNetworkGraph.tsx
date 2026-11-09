import React, { useState, useEffect, useRef, useMemo } from "react";
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
  X,
  IndianRupee,
  Clock,
  User,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { layoutNetwork, type NetworkEdgeLayout } from "./layoutNetwork";
import { lintViz } from "../../../utils/lintViz";
import { useTarkaUiStore } from "../../../store/useTarkaUiStore";
import { reconstruct5FileInvestigation } from "../../../utils/investigationReconstructor";

export type EdgeFilterType = "all" | "cashflow" | "tether" | "ja4" | "caf" | "c2";

interface EvidenceNetworkGraphProps {
  isHotspotActive: boolean;
  onToggleHotspot: () => void;
  edgeFilter: EdgeFilterType;
  onEdgeFilterChange: (filter: EdgeFilterType) => void;
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

export const CHRONOLOGICAL_REPLAY_STEPS: ReplayStepData[] = [
  {
    step: 0,
    phaseId: "sim-swap",
    timeLabel: "T - 16m",
    clockTime: "09:44:00 IST",
    title: "PRE-ATTACK BTS REGISTRATION & SIM SWAP",
    headline: "Unauthorized SIM swap on victim Sunil Kumar at Airtel Tower DL-TWR-891",
    narrative:
      "Attacker executes unauthorized SIM swap on victim Sunil Kumar (MSISDN +91-98711-23941) registered at Rohini Sector 4 BTS (Azimuth 120°). Attacker hijacks SMS/OTP authentication channel, initiating 15-minute credential harvesting window before bank alert triggers.",
    amount: "—",
    statutory: "DoT License Clause 39.20 & Airtel BTS Stratum-2",
    activeNodeIds: ["node-tower", "node-victim"],
    activeEdgeIds: ["edge-tower-hero"],
    muleBalances: {
      "node-victim": { balance: "₹5,00,000", note: "Victim Balance (SBI A/c 30910029101)", tone: "slate" },
      "acc-vikram": { balance: "₹0", note: "L1 Primary Mule Standby", tone: "slate" },
      "acc-rohit": { balance: "₹0", note: "L2A Conduit Standby", tone: "slate" },
      "acc-sameer": { balance: "₹0", note: "L2B Conduit Standby", tone: "slate" },
      "acc-sink": { balance: "₹0", note: "Escrow Sink Standby", tone: "slate" },
      "node-atm": { balance: "₹0", note: "ATM Terminal Standby", tone: "slate" },
    },
  },
  {
    step: 1,
    phaseId: "primary-inflow",
    timeLabel: "T + 00m",
    clockTime: "10:00:14 IST",
    title: "PRIMARY FRAUDULENT INFLOW (VICTIM → L1 MULE)",
    headline: "Victim Sunil Kumar debited ₹5,00,000 via SBI UPI 2.0 to primary mule Vikram Shah",
    narrative:
      "Victim Sunil Kumar (SBI A/c 30910029101) is fraudulently debited ₹5,00,000 under UPI RRN 42910029101. Funds credit instantly into L1 primary mule Vikram Shah (SBI A/c 41088291083). NPCI Central Switch captures BSSID 74:DA:38:A2:11:BC in device stanza.",
    amount: "₹5,00,000",
    statutory: "BSA §63(4) Electronic Stanza & NPCI Central Switch T1",
    activeNodeIds: ["node-victim", "acc-vikram"],
    activeEdgeIds: ["edge-cash-victim-vikram"],
    muleBalances: {
      "node-victim": { balance: "₹0", change: "-₹5.00L", note: "Debited via UPI RRN 42910029101", tone: "rose" },
      "acc-vikram": { balance: "₹5,00,000", change: "+₹5.00L", note: "Credited in Full (SBI A/c 41088291083)", tone: "emerald" },
      "acc-rohit": { balance: "₹0", note: "Awaiting Layering Transfer", tone: "slate" },
      "acc-sameer": { balance: "₹0", note: "Awaiting Layering Transfer", tone: "slate" },
      "acc-sink": { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
      "node-atm": { balance: "₹0", note: "ATM Standby", tone: "slate" },
    },
  },
  {
    step: 2,
    phaseId: "ap-binding",
    timeLabel: "T + 04m",
    clockTime: "10:04:12 IST",
    title: "HOTSPOT TETHERING & JA4 TLS AP BINDING",
    headline: "Accomplice Wi-Fi Hotspot (Poco X5 AP) binds 4 mule banking sessions simultaneously",
    narrative:
      "Controller Device Cluster activates portable Wi-Fi AP (BSSID 74:DA:38:A2:11:BC). Airtel PGW confirms decremented TTL=63 (-1 hop). Identical client TLS fingerprint JA4=t13d1516h2_8daaf6 across all 4 CBS banking sessions proves single physical operator.",
    amount: "—",
    statutory: "ISO/IEC 27037 & DoT License Clause 39.20 (TTL=63 Corroboration)",
    activeNodeIds: ["node-hero", "hub-tether", "hub-ja4", "acc-vikram", "acc-rohit", "acc-sameer", "acc-sink"],
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
    ],
    muleBalances: {
      "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
      "acc-vikram": { balance: "₹5,00,000", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "emerald" },
      "acc-rohit": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
      "acc-sameer": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
      "acc-sink": { balance: "₹0", note: "Banking Session Active (TTL=63 · JA4 Match)", tone: "slate" },
      "node-atm": { balance: "₹0", note: "Standby", tone: "slate" },
    },
  },
  {
    step: 3,
    phaseId: "fan-out",
    timeLabel: "T + 09m",
    clockTime: "10:09:45 IST",
    title: "RAPID LAYERING FAN-OUT (L1 → L2A & L2B)",
    headline: "Vikram Shah fans out ₹5,00,000 within 5 seconds to Rohit Verma (₹3.00L) & Sameer Khan (₹2.00L)",
    narrative:
      "Vikram Shah disperses all ₹5,00,000 within 5 seconds: ₹3,00,000 via IMPS to Rohit Verma (HDFC A/c 5010029419920) and ₹2,00,000 to Sameer Khan (Axis A/c 9140200410291). Deliberate layering fan-out orchestrated to evade immediate single-account lien limits.",
    amount: "₹5,00,000 (Split: ₹3.00L + ₹2.00L)",
    statutory: "CBS Core Banking Ledgers & IMPS RRN 42910029881 / 42910029889",
    activeNodeIds: ["acc-vikram", "acc-rohit", "acc-sameer"],
    activeEdgeIds: ["edge-cash-vikram-rohit", "edge-cash-vikram-sameer"],
    muleBalances: {
      "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
      "acc-vikram": { balance: "₹0", change: "-₹5.00L", note: "Fully Dispersed to Layer 2 Mules", tone: "amber" },
      "acc-rohit": { balance: "₹3,00,000", change: "+₹3.00L", note: "Credited HDFC A/c 5010029419920", tone: "emerald" },
      "acc-sameer": { balance: "₹2,00,000", change: "+₹2.00L", note: "Credited Axis A/c 9140200410291", tone: "emerald" },
      "acc-sink": { balance: "₹0", note: "Awaiting Transfer", tone: "slate" },
      "node-atm": { balance: "₹0", note: "Standby", tone: "slate" },
    },
  },
  {
    step: 4,
    phaseId: "cashout-sink",
    timeLabel: "T + 18m",
    clockTime: "10:18:22 IST",
    title: "IMMEDIATE PHYSICAL CASHOUT & ESCROW SINK",
    headline: "Sameer Khan withdraws ₹1.20L cash at Rohini ATM; Rohit Verma swipes ₹1.80L into merchant pool",
    narrative:
      "Sameer Khan executes ₹1,20,000 ATM cash withdrawal at Rohini Sector 4 ATM DL-049. Simultaneously, Rohit Verma swipes ₹1,80,000 via Apex Electronics POS terminal into Paytm Merchant Pool Sink (#1109) to conceal asset trail before cyber police intercept.",
    amount: "₹3,00,000 (₹1.20L ATM Cash + ₹1.80L Escrow)",
    statutory: "ATM DL-049 Electronic Journal & CCTV Log · Paytm Escrow Ledger",
    activeNodeIds: ["acc-sameer", "node-atm", "acc-rohit", "acc-sink"],
    activeEdgeIds: ["edge-cash-sameer-atm", "edge-cash-rohit-sink"],
    muleBalances: {
      "node-victim": { balance: "₹0", note: "Debited", tone: "rose" },
      "acc-vikram": { balance: "₹0", note: "Exhausted", tone: "slate" },
      "acc-rohit": { balance: "₹1,20,000", change: "-₹1.80L", note: "Remaining in HDFC Account", tone: "amber" },
      "acc-sameer": { balance: "₹80,000", change: "-₹1.20L", note: "Remaining in Axis Account", tone: "amber" },
      "acc-sink": { balance: "₹1,80,000", change: "+₹1.80L", note: "Locked in Paytm Merchant Escrow", tone: "indigo" },
      "node-atm": { balance: "₹1,20,000", change: "Cash Out", note: "Physical Currency Dispensed (ATM DL-049)", tone: "rose" },
    },
  },
  {
    step: 5,
    phaseId: "freeze-secured",
    timeLabel: "T + 2.5h",
    clockTime: "10:30:00 IST",
    title: "STATUTORY FREEZE & LIBR RECOVERY (BNSS §106/§107)",
    headline: "Section 106/107 BNSS freeze executed; ₹3,80,000 (76%) secured under Clayton's Case LIBR rule",
    narrative:
      "Noida Cyber Crime PS transmits emergency provisional debit freezes under BNSS §106/§107 via I4C NCRP API. Clayton's Case Lowest Intermediate Balance Rule (LIBR) legally binds ₹1.20L in HDFC, ₹80k in Axis, and ₹1.80L in Paytm Escrow. Net recovered: ₹3,80,000 / ₹5,00,000 (76%).",
    amount: "₹3,80,000 Secured (76% Restitution)",
    statutory: "BNSS §106/§107 & BSA §63 Electronic Admissibility Protocol",
    recoverySummary: "₹3,80,000 SECURED (76% RESTITUTION READY UNDER LIBR DOCTRINE)",
    activeNodeIds: ["node-victim", "acc-vikram", "acc-rohit", "acc-sameer", "acc-sink", "node-atm"],
    activeEdgeIds: [
      "edge-cash-victim-vikram",
      "edge-cash-vikram-rohit",
      "edge-cash-vikram-sameer",
      "edge-cash-sameer-atm",
      "edge-cash-rohit-sink",
    ],
    muleBalances: {
      "node-victim": { balance: "₹3,80,000", note: "Secured for Restitution (76%)", tone: "emerald" },
      "acc-vikram": { balance: "₹0 (Frozen)", note: "BNSS §107 Debit Freeze", tone: "slate" },
      "acc-rohit": { balance: "₹1,20,000 (Frozen)", note: "BNSS §107 Debit Freeze", tone: "emerald" },
      "acc-sameer": { balance: "₹80,000 (Frozen)", note: "BNSS §107 Debit Freeze", tone: "emerald" },
      "acc-sink": { balance: "₹1,80,000 (Liened)", note: "Paytm Escrow Lien Secured", tone: "emerald" },
      "node-atm": { balance: "₹1,20,000 (Withdrawn)", note: "CCTV Physical Evidence Seized", tone: "rose" },
    },
  },
];

export const EvidenceNetworkGraph: React.FC<EvidenceNetworkGraphProps> = ({
  isHotspotActive,
  onToggleHotspot,
  edgeFilter,
  onEdgeFilterChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 820,
    height: 520,
  });

  const [viewMode, setViewMode] = useState<"graph" | "matrix" | "table">("graph");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<EvidenceSheetData | null>(null);

  const { setSelectedEvidenceEdge } = useTarkaUiStore();
  const investigation = useMemo(() => reconstruct5FileInvestigation(), []);

  // 6-step Chronological Forensic Replay Engine
  const [replayStep, setReplayStep] = useState<number>(5); // Default to Step 5 (full picture at rest)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);

  // Measure canvas using ResizeObserver
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.max(760, Math.floor(width)),
            height: Math.max(520, Math.floor(height)),
          });
        }
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [viewMode]);

  // Determine whether cashflow nodes/edges should be included
  const includeCashFlowNodes = edgeFilter === "cashflow" || edgeFilter === "all";

  // Compute pure layout
  const layout = useMemo(() => {
    return layoutNetwork(
      dimensions.width,
      dimensions.height,
      isHotspotActive,
      edgeFilter === "cashflow" ? "cashflow" : edgeFilter,
      includeCashFlowNodes
    );
  }, [dimensions.width, dimensions.height, isHotspotActive, edgeFilter, includeCashFlowNodes]);

  const currentStepData = CHRONOLOGICAL_REPLAY_STEPS[replayStep] || CHRONOLOGICAL_REPLAY_STEPS[5];

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

  // Opacity dimming on hover or replay
  const getNodeOpacity = (nodeId: string) => {
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
      const isActiveInStep = currentStepData.activeNodeIds.includes(nodeId);
      return isActiveInStep ? 1 : 0.35;
    }

    return 1;
  };

  const getEdgeOpacity = (edge: NetworkEdgeLayout) => {
    // If playing or on a discrete replay step < 5
    if (isPlaying || replayStep < 5) {
      const isEdgeActiveInStep = currentStepData.activeEdgeIds.includes(edge.id);
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
        return currentStepData.activeEdgeIds.includes(e.id);
      }
      return true;
    });
  }, [layout.edges, isPlaying, replayStep, currentStepData]);

  return (
    <div
      ref={containerRef}
      className="hero-canvas-container"
      data-testid="hero-canvas"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        position: "relative",
        background: "#FAFCFF",
        overflow: "hidden",
      }}
    >
      {/* =========================================================================
          TOOLBAR STRIP (PRIMARY FILTERS & VIEW MODES)
          ========================================================================= */}
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
          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#64748B", marginRight: "4px" }}>
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
                  fontSize: "10px",
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
        </div>

        {/* Right: Controls & View Switcher */}
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
              fontSize: "10px",
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
            <span>{isHotspotActive ? "TTL=63 Tethered" : "TTL=64 Direct"}</span>
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
                fontSize: "10px",
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
                fontSize: "10px",
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
                fontSize: "10px",
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
        </div>
      </div>

      {/* =========================================================================
          FORENSIC CHRONOLOGICAL REPLAY HUD (WHERE CASH WENT & TIMELINE)
          ========================================================================= */}
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
                fontSize: "10.5px",
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
                    fontSize: "9px",
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
              { idx: 1, label: "1: INFLOW ₹5L" },
              { idx: 2, label: "2: AP BIND" },
              { idx: 3, label: "3: FAN-OUT" },
              { idx: 4, label: "4: CASHOUT" },
              { idx: 5, label: "5: FREEZE (76%)" },
            ].map((st) => {
              const isCur = replayStep === st.idx;
              return (
                <button
                  key={st.idx}
                  type="button"
                  onClick={() => handleJumpToStep(st.idx)}
                  style={{
                    fontSize: "9.5px",
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
                  fontSize: "9.5px",
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

              <span style={{ fontSize: "11px", fontWeight: 800, color: "#1E293B" }}>
                {currentStepData.title}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {currentStepData.amount !== "—" && (
                <span
                  style={{
                    fontSize: "10.5px",
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
                    fontSize: "10px",
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
                  <span>76% SECURED UNDER LIBR</span>
                </span>
              )}
            </div>
          </div>

          {/* Banner Body: Narrative Text & Statutory Citation */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", fontSize: "10px" }}>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.35, flex: 1 }}>
              {currentStepData.narrative}
            </p>
            <span
              style={{
                flexShrink: 0,
                fontSize: "9px",
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

      {/* =========================================================================
          VIEW MODE 1: PURE SVG + HTML TOPOLOGY CANVAS
          ========================================================================= */}
      {viewMode === "graph" && (
        <div
          ref={canvasRef}
          style={{
            height: 520,
            minHeight: 520,
            position: "relative",
            width: "100%",
            overflow: "hidden",
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
                  strokeWidth={isCashEdge ? 3.0 : 2.25}
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
                      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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
                      source: isHero ? "Airtel PGW & Samsung TAC 86749206" : "Rohini Sector 4 BTS",
                      sha256: "89c20491823091ffeed891241aa44591aefc48201",
                      statutoryBasis: "BSA §63 & DoT License Clause 39.20",
                      details: node.sublabel,
                      linkedEntities: ["Vikram Shah (L1)", "Rohit Verma (L2A)", "Sameer Khan (L2B)", "Paytm Sink #1109"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    border: isHero ? "1.5px solid #F43F5E" : "1px solid #CBD5E1",
                    boxShadow: isHero
                      ? "0 0 16px -2px rgba(244, 63, 94, 0.35), 0 4px 12px rgba(15, 23, 42, 0.08)"
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
                          fontSize: "8.5px",
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
                          fontSize: "8px",
                          fontWeight: 700,
                          background: isHotspotActive ? "#FFF1F2" : "#ECFDF5",
                          color: isHotspotActive ? "#E11D48" : "#047857",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          border: isHotspotActive ? "1px solid #FECDD3" : "1px solid #A7F3D0",
                        }}
                      >
                        {isHotspotActive ? "TTL=63 Tethered" : "TTL=64 Direct"}
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
                          fontSize: isHero ? "12px" : "11px",
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
                          fontSize: isHero ? "9.5px" : "9px",
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
                          : "Mewat CAF Retailer Logs",
                      sha256: "339109bbcf12498214aa88231908812c3f19a03b",
                      statutoryBasis: "BSA §63 Admissibility Protocol",
                      details: `Coverage: ${hub.strength} accounts correlated under this evidence vector.`,
                      linkedEntities:
                        hub.id === "hub-caf" ? ["Sameer Khan (L2B)", "Paytm Sink #1109"] : ["All 4 Mule Accounts"],
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
                        fontSize: "10.5px",
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
                        fontSize: "9.5px",
                        fontWeight: 800,
                        color: hub.color,
                        fontFamily: "var(--font-mono)",
                        textShadow: "0 0 3px #FFFFFF, 0 0 6px #FFFFFF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {hub.strength} Match
                    </div>
                  </div>
                </div>
              );
            })}

          {/* =====================================================================
              ROW B SATELLITE: VICTIM NODE (Sunil Kumar)
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
                  onClick={() =>
                    openEvidenceSheet({
                      title: "Victim Sunil Kumar (SBI Account)",
                      category: "Crime Inception / Complainant",
                      source: "NCRP 1930 Helpline & SBI Core Banking RRN 42910029101",
                      sha256: "01c77f0a8c29341098bca44019488a09b3019f",
                      statutoryBasis: "FIR #149/2026 U/S 66D IT Act & 318(4) BNS",
                      details:
                        "Victim reported immediate unauthorized debits following a SIM-swap phishing call. Initial loss ₹5,00,000.",
                      linkedEntities: ["Vikram Shah (L1 Mule)"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
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
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          color: "#991B1B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.label}
                      </div>
                      <div
                        style={{
                          fontSize: "8.5px",
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

                  {/* Dynamic Replay Balance Tag */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "8.5px",
                      borderTop: "1px solid #FEE2E2",
                      paddingTop: "2px",
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "#DC2626" }}>
                      Bal: {balanceInfo ? balanceInfo.balance : "₹0"}
                    </span>
                    <span
                      style={{
                        background: "#FEE2E2",
                        color: "#991B1B",
                        padding: "0.5px 3.5px",
                        borderRadius: "2px",
                        fontWeight: 700,
                      }}
                    >
                      Loss: ₹5.00L
                    </span>
                  </div>
                </div>
              );
            })}

          {/* =====================================================================
              ROW B SATELLITE: ATM CASHOUT SINK (Rohini Sec-4 ATM DL-049)
              ===================================================================== */}
          {layout.nodes
            .filter((n) => n.category === "sink" && n.id === "node-atm")
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
                  onClick={() =>
                    openEvidenceSheet({
                      title: "Rohini Sector 4 ATM DL-049 (Cashout Sink)",
                      category: "Physical Cashout Location",
                      source: "ATM Electronic Journal & Branch CCTV Video Log",
                      sha256: "90da912041289cf00124801bfe491048",
                      statutoryBasis: "BSA §63 & BNSS §106 CCTV Seizure",
                      details:
                        "Sameer Khan debit card withdrawal of ₹1,20,000 at 10:18:22 IST. Surveillance CCTV footage timestamp aligns with Airtel Tower DL-TWR-891 azimuth.",
                      linkedEntities: ["Sameer Khan (L2B Mule)"],
                    })
                  }
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
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
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 800,
                          color: "#991B1B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {node.label}
                      </div>
                      <div
                        style={{
                          fontSize: "8.5px",
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

                  {/* Dynamic Cashout Tag */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "8.5px",
                      borderTop: "1px solid #FEE2E2",
                      paddingTop: "2px",
                    }}
                  >
                    <span style={{ fontWeight: 800, color: "#DC2626" }}>
                      {balanceInfo ? balanceInfo.balance : "Cash: ₹1.20L"}
                    </span>
                    <span
                      style={{
                        background: "#FEE2E2",
                        color: "#991B1B",
                        padding: "0.5px 3.5px",
                        borderRadius: "2px",
                        fontWeight: 700,
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

              return (
                <div
                  key={node.id}
                  className="node-card"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    const matched =
                      node.id.includes("vikram") ? investigation.edges[0] :
                      node.id.includes("rohit") ? investigation.edges[2] :
                      node.id.includes("sameer") ? investigation.edges[3] :
                      node.id.includes("sink") ? investigation.edges[5] :
                      investigation.edges[0];
                    setSelectedEvidenceEdge(matched);
                    openEvidenceSheet({
                      title: node.label,
                      category: "Controlled Mule Account",
                      source: "Core Banking Ledger & Cyber Crime Freeze",
                      sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
                      statutoryBasis: "BNSS §107 Provisional Seizure Order",
                      details: `${node.role || "Mule Account"} · ${node.sublabel}`,
                      linkedEntities: ["Controller Device Cluster"],
                    });
                  }}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderRadius: "6px",
                    background: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
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
                        style={{
                          fontSize: "11px",
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
                          fontSize: "9px",
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

                  {/* Dynamic Balance Row (Where Cash Went) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "8.5px",
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
                      }}
                    >
                      Bal: {balanceInfo ? balanceInfo.balance : "₹0"}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        color: "#059669",
                        fontWeight: 800,
                        background: "#ECFDF5",
                        padding: "0.5px 3.5px",
                        borderRadius: "2px",
                      }}
                    >
                      §107 Frozen
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MULTI-SOURCE EVIDENCE CORRELATION MATRIX
          ========================================================================= */}
      {viewMode === "matrix" && (
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
            <p style={{ fontSize: "11px", color: "#64748B", margin: 0 }}>
              Shows cross-session intersection of physical hardware, network IPDR, CAF vectors, and UPI cash flows tying 4 accounts to 1 cluster.
            </p>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Evidence Vector</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Vikram Shah (L1)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Rohit Verma (L2A)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Sameer Khan (L2B)</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Paytm Sink</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Strength</th>
                <th style={{ padding: "8px 10px", fontWeight: 800, color: "#334155" }}>Statutory Admissibility</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  vector: "UPI 2.0 Inflow & Dispersal Flow",
                  type: "Financial Ledgers",
                  m1: "₹5.00L Inflow",
                  m2a: "₹3.00L Split",
                  m2b: "₹2.00L Split",
                  sink: "₹1.80L Escrow",
                  strength: "100% Tracked",
                  color: "#059669",
                  basis: "BSA §63 & BNSS §106/§107",
                },
                {
                  vector: "Wi-Fi Tether AP (74:DA:38:A2:11:BC)",
                  type: "Hardware Tether",
                  m1: "● MATCH",
                  m2a: "● MATCH",
                  m2b: "● MATCH",
                  sink: "● MATCH",
                  strength: "4/4 (Deterministic)",
                  color: "#8B5CF6",
                  basis: "BSA §63(4) Electronic Stanza",
                },
                {
                  vector: "JA4 TLS Fingerprint (t13d1516h2_8daaf6)",
                  type: "App Binary Hash",
                  m1: "● MATCH",
                  m2a: "● MATCH",
                  m2b: "● MATCH",
                  sink: "● MATCH",
                  strength: "4/4 (Deterministic)",
                  color: "#10B981",
                  basis: "ISO/IEC 27037 Telemetry",
                },
                {
                  vector: "Shared CAF Retailer (Mewat #4401)",
                  type: "SIM Registration",
                  m1: "—",
                  m2a: "—",
                  m2b: "● MATCH",
                  sink: "● MATCH",
                  strength: "2/4 (Corroborative)",
                  color: "#F59E0B",
                  basis: "DoT Clause 39.20 CAF",
                },
                {
                  vector: "Telegram C2 Exfiltration (@c2_bot)",
                  type: "C2 Telemetry",
                  m1: "● MATCH",
                  m2a: "● MATCH",
                  m2b: "● MATCH",
                  sink: "● MATCH",
                  strength: "4/4 (Deterministic)",
                  color: "#BE123C",
                  basis: "CERT-In Ingress Log",
                },
                {
                  vector: "Cell Tower Azimuth (DL-TWR-891 Sec 4)",
                  type: "Geographic Co-location",
                  m1: "● MATCH",
                  m2a: "● MATCH",
                  m2b: "● MATCH",
                  sink: "● MATCH",
                  strength: "4/4 (100% Sector)",
                  color: "#0284C7",
                  basis: "Airtel BTS Stratum-2",
                },
              ].map((row, idx) => (
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
                      linkedEntities: ["Vikram Shah", "Rohit Verma", "Sameer Khan", "Paytm Sink"],
                    })
                  }
                >
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0F172A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: row.color }} />
                      <span>{row.vector}</span>
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: row.m1 === "—" ? "#94A3B8" : "#047857" }}>
                    {row.m1}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: row.m2a === "—" ? "#94A3B8" : "#047857" }}>
                    {row.m2a}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: row.m2b === "—" ? "#94A3B8" : "#047857" }}>
                    {row.m2b}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: row.sink === "—" ? "#94A3B8" : "#047857" }}>
                    {row.sink}
                  </td>
                  <td style={{ padding: "8px 10px", fontWeight: 800, color: row.color }}>{row.strength}</td>
                  <td style={{ padding: "8px 10px", color: "#475569", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
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
      {viewMode === "table" && (
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 380,
            overflowY: "auto",
            padding: "16px 20px",
            background: "#FFFFFF",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
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
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: "10px" }}>{node.sublabel}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857" }}>
                      {bal ? bal.balance : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: "9.5px",
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
      {selectedSheet && (
        <div
          style={{
            position: "absolute",
            top: 40,
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
              <span style={{ fontSize: "9px", fontWeight: 800, color: "#4F46E5", textTransform: "uppercase" }}>
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
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>SOURCE SYSTEM</label>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                {selectedSheet.source}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>EVIDENCE SHA-256 HASH</label>
              <div
                style={{
                  fontSize: "9.5px",
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
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>STATUTORY ADMISSIBILITY</label>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#059669", marginTop: "2px" }}>
                {selectedSheet.statutoryBasis}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>CORRELATION DETAILS</label>
              <div style={{ fontSize: "11px", color: "#334155", lineHeight: 1.4, marginTop: "2px" }}>
                {selectedSheet.details}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "#64748B" }}>CORRELATED ENTITIES</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {selectedSheet.linkedEntities.map((ent, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "9px",
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
                fontSize: "11px",
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
};
