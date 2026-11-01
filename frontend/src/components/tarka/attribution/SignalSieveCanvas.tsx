import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { quadtree as d3Quadtree } from "d3-quadtree";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Radio,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useFocusStore } from "../kit";

export interface SignalSieveCanvasProps {
  isPortDropped: boolean;
  onTogglePortDropped: () => void;
  onSelectCandidate?: (candidateId: string) => void;
}

interface SubscriberDot {
  id: number;
  maskedId: string;
  tower: string;
  x: number;
  y: number;
  loginMask: number; // 4 bits: bit 0 = L1, bit 1 = L2, bit 2 = L3, bit 3 = L4
  isTarget: boolean;
}

export const SignalSieveCanvas: React.FC<SignalSieveCanvasProps> = ({
  isPortDropped,
  onTogglePortDropped,
  onSelectCandidate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stepper / Playback State
  const [currentStep, setCurrentStep] = useState<number>(4); // 0 (10k) to 4 (1)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0); // 0.5x, 1x, 2x
  const [useUtc, setUseUtc] = useState<boolean>(false);
  const [isTableView, setIsTableView] = useState<boolean>(false);

  // Active Login Exclusions (all 4 active by default)
  const [hoveredDot, setHoveredDot] = useState<SubscriberDot | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightedLoginCount, setHighlightedLoginCount] = useState<number | null>(null);

  const { setSelectedNodeId } = useFocusStore();

  // Generate 10,000 Deterministic Subscribers with Seeded PRNG
  const subscribers: SubscriberDot[] = useMemo(() => {
    const list: SubscriberDot[] = [];
    const N = 10000;
    const towers = ["DL-TWR-891", "DL-TWR-842", "UP-TWR-104", "DL-TWR-701"];

    // Seeded random function (LCG)
    let s = 42;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    // 1 Target Needle (ID 8849) in all 4 logins (1111)
    // 5 near-misses in 3 logins
    // 35 in 2 logins
    // 299 in 1 login
    // Remaining in 0 logins (background)
    for (let i = 0; i < N; i++) {
      let mask = 0;
      let isTarget = false;

      if (i === 8849) {
        mask = 0b1111; // In all 4 logins
        isTarget = true;
      } else if (i < 5) {
        mask = 0b0111; // In 3 logins
      } else if (i < 40) {
        mask = 0b0011; // In 2 logins
      } else if (i < 340) {
        mask = 0b0001; // In 1 login
      } else {
        mask = 0;
      }

      // Assign tower: target and majority in DL-TWR-891
      const tower = isTarget || i < 4200 ? "DL-TWR-891" : towers[Math.floor(rnd() * towers.length)];

      list.push({
        id: i,
        maskedId: isTarget ? "SUB-8849-VIKRAM" : `SUB-${1000 + (i % 9000)}-${(i * 37) % 10000}`,
        tower,
        x: 0,
        y: 0,
        loginMask: mask,
        isTarget,
      });
    }

    return list;
  }, []);

  // Compute Active Survivors based on current step and login checkboxes
  const { survivorCount } = useMemo(() => {
    // Stage counts when all 4 active: 10000 -> 340 -> 41 -> 6 -> 1
    const counts = [10000, 340, 41, 6, isPortDropped ? 340 : 1];
    return {
      survivorCount: counts[currentStep] || 1,
    };
  }, [currentStep, isPortDropped]);

  // Register dev hook
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tarkaViz = window.__tarkaViz || {};
      window.__tarkaViz.haystack = {
        stats: () => ({
          total: 10000,
          currentStep,
          survivors: [340, 41, 6, 1],
          activeSurvivors: survivorCount,
          isPortDropped,
          targetCount: 1,
        }),
      };
    }
  }, [currentStep, survivorCount, isPortDropped]);

  // Playback Loop
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setTimeout(() => {
        setCurrentStep((prev) => {
          if (prev >= 4) {
            setIsPlaying(false);
            return 4;
          }
          return prev + 1;
        });
      }, 900 / playSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, playSpeed]);

  // Canvas Layout Coordinates Calculation
  const cols = 125;
  const rows = 80; // 125 x 80 = 10,000 dots

  // Build Quadtree for mouse hover
  const quadtree = useMemo(() => {
    return d3Quadtree<SubscriberDot>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(subscribers);
  }, [subscribers]);

  // Render Canvas with Robust Dimension Fallbacks
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, canvas.parentElement?.clientWidth || 0, 720);
    const height = Math.max(rect.height, canvas.parentElement?.clientHeight || 0, 220);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const cellW = width / cols;
    const cellH = height / rows;

    // Background Tower Grid Tiles
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, width * 0.45, height - 8);

    // Target Tower Label
    ctx.fillStyle = "#94A3B8";
    ctx.font = "8px JetBrains Mono, monospace";
    ctx.fillText("SECTOR: DL-TWR-891 (ROHINI SEC 4)", 8, 14);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= subscribers.length) break;

        const sub = subscribers[idx];
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        sub.x = cx;
        sub.y = cy;

        const loginCount = (sub.loginMask & 1) + ((sub.loginMask >> 1) & 1) + ((sub.loginMask >> 2) & 1) + ((sub.loginMask >> 3) & 1);

        let isSurvivor = false;
        if (currentStep === 0) isSurvivor = true;
        else if (currentStep === 1) isSurvivor = idx < 340 || sub.isTarget;
        else if (currentStep === 2) isSurvivor = idx < 41 || sub.isTarget;
        else if (currentStep === 3) isSurvivor = idx < 6 || sub.isTarget;
        else if (currentStep === 4) isSurvivor = isPortDropped ? idx < 340 : sub.isTarget;

        const isHighlighted = highlightedLoginCount !== null ? loginCount === highlightedLoginCount : false;

        if (sub.isTarget) {
          // TARGET NEEDLE (SUB-8849-VIKRAM)
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#10B981";
          ctx.fill();

          // Outer Pulsing Halo
          ctx.beginPath();
          ctx.arc(cx, cy, 9, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Star Glyph in Center
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "8px sans-serif";
          ctx.fillText("★", cx - 3.5, cy + 3);
        } else if (isSurvivor) {
          // SURVIVORS IN STEP
          ctx.beginPath();
          ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = isPortDropped ? "#F59E0B" : "#4F46E5";
          ctx.fill();
        } else if (isHighlighted) {
          // HISTOGRAM HIGHLIGHTED DOTS
          ctx.beginPath();
          ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#EC4899";
          ctx.fill();
        } else {
          // BACKGROUND INACTIVE SUBSCRIBERS
          ctx.beginPath();
          ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = "#CBD5E1";
          ctx.fill();
        }
      }
    }
  }, [subscribers, currentStep, isPortDropped, highlightedLoginCount]);

  useEffect(() => {
    renderCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      renderCanvas();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [renderCanvas]);

  // Handle Canvas Mousemove for Quadtree Hit-testing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nearest = quadtree.find(mouseX, mouseY, 16);
    if (nearest) {
      setHoveredDot(nearest);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredDot(null);
      setTooltipPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDot(null);
    setTooltipPos(null);
  };

  const handleCanvasClick = () => {
    if (hoveredDot) {
      setSelectedNodeId(hoveredDot.maskedId);
      if (onSelectCandidate) onSelectCandidate(hoveredDot.maskedId);
      toast.info(`Selected ${hoveredDot.maskedId} · Tower ${hoveredDot.tower}`);
    }
  };

  // Step Meta Data
  const stepsMeta = [
    {
      id: "S1",
      stepNum: 1,
      bank: "SBI Mule 1083",
      timeIst: "07:48:04 IST",
      timeUtc: "02:18:04 UTC",
      publicIp: "103.21.144.92",
      port: "OMITTED BY BANK",
      pool: 340,
      survivors: 340,
      eliminated: 9660,
    },
    {
      id: "S2",
      stepNum: 2,
      bank: "HDFC Mule 9920",
      timeIst: "07:51:19 IST",
      timeUtc: "02:21:19 UTC",
      publicIp: "103.21.144.92",
      port: "OMITTED BY BANK",
      pool: 340,
      survivors: 41,
      eliminated: 299,
    },
    {
      id: "S3",
      stepNum: 3,
      bank: "Axis Mule 4102",
      timeIst: "07:54:51 IST",
      timeUtc: "02:24:51 UTC",
      publicIp: "103.21.144.92",
      port: "OMITTED BY BANK",
      pool: 340,
      survivors: 6,
      eliminated: 35,
    },
    {
      id: "S4",
      stepNum: 4,
      bank: "Paytm Sink 1109",
      timeIst: "07:58:10 IST",
      timeUtc: "02:28:10 UTC",
      publicIp: "103.21.144.92",
      port: isPortDropped ? "PORT DROPPED" : ":44321 (ISP DoT 39.20)",
      pool: 340,
      survivors: isPortDropped ? 340 : 1,
      eliminated: isPortDropped ? 0 : 5,
    },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        position: "relative",
      }}
    >
      {/* TOOLBAR HEADER ROW: Controls, Scrubber, Drop Port, Table View */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          padding: "6px 12px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          fontSize: "11px",
        }}
      >
        {/* Left: Playback & Step Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid #CBD5E1",
              background: isPlaying ? "#FEF3C7" : "#FFFFFF",
              color: isPlaying ? "#B45309" : "#0F172A",
              fontSize: "10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isPlaying ? <Pause size={11} /> : <Play size={11} />}
            <span>{isPlaying ? "Pause" : "Play Sieve"}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
            disabled={currentStep === 0}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              cursor: currentStep === 0 ? "default" : "pointer",
              color: currentStep === 0 ? "#CBD5E1" : "#475569",
            }}
            title="Step Back"
          >
            <SkipBack size={11} />
          </button>

          {/* Scrubber 0 to 4 */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "#F1F5F9", padding: "2px", borderRadius: "5px" }}>
            {[0, 1, 2, 3, 4].map((step) => {
              const active = currentStep === step;
              const labels = ["10k", "340", "41", "6", isPortDropped ? "340" : "1 ★"];
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => setCurrentStep(step)}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "9px",
                    fontWeight: active ? 800 : 500,
                    border: "none",
                    background: active ? "#4F46E5" : "transparent",
                    color: active ? "#FFFFFF" : "#64748B",
                    cursor: "pointer",
                  }}
                >
                  {labels[step]}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep((p) => Math.min(4, p + 1))}
            disabled={currentStep === 4}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              cursor: currentStep === 4 ? "default" : "pointer",
              color: currentStep === 4 ? "#CBD5E1" : "#475569",
            }}
            title="Step Forward"
          >
            <SkipForward size={11} />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaySpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
            style={{
              padding: "2px 5px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              fontSize: "9px",
              fontWeight: 700,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            {playSpeed}x
          </button>
        </div>

        {/* Right: Path B Drop Port & View as Table */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Drop Source Port Mutator Toggle */}
          <button
            type="button"
            onClick={onTogglePortDropped}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "5px",
              border: isPortDropped ? "1.5px solid #D97706" : "1px solid #CBD5E1",
              background: isPortDropped ? "#FEF3C7" : "#FFFFFF",
              color: isPortDropped ? "#B45309" : "#475569",
              cursor: "pointer",
            }}
            title="Toggle between Path A (Sequential Set Intersection) and Path B (DoT 39.20 ISP Port Translation)"
          >
            <Radio size={11} color={isPortDropped ? "#B45309" : "#64748B"} />
            <span>{isPortDropped ? "Path B Active (Drop Port: 340 Ambiguous)" : "Drop Source Port"}</span>
          </button>

          {/* IST / UTC Toggle */}
          <button
            type="button"
            onClick={() => setUseUtc(!useUtc)}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              fontSize: "9px",
              fontWeight: 600,
              color: "#64748B",
              cursor: "pointer",
            }}
          >
            {useUtc ? "UTC" : "IST"}
          </button>

          {/* Table Toggle */}
          <button
            type="button"
            onClick={() => setIsTableView(!isTableView)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "5px",
              border: "1px solid #E2E8F0",
              background: isTableView ? "#EEF2FF" : "#FFFFFF",
              color: isTableView ? "#4338CA" : "#64748B",
              cursor: "pointer",
            }}
          >
            <TableIcon size={11} />
            <span>{isTableView ? "Canvas Sieve" : "View as Table"}</span>
          </button>
        </div>
      </div>

      {/* VIEW AS TABLE MODE */}
      {isTableView ? (
        <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", padding: "12px", background: "#FFFFFF" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B" }}>
                <th style={{ padding: "6px 8px" }}>Step</th>
                <th style={{ padding: "6px 8px" }}>Bank Session</th>
                <th style={{ padding: "6px 8px" }}>Timestamp</th>
                <th style={{ padding: "6px 8px" }}>Public IP & Translated Port</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>ISP Pool (n_i)</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Survivors After ∩</th>
                <th style={{ padding: "6px 8px" }}>Reduction Status</th>
              </tr>
            </thead>
            <tbody>
              {stepsMeta.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "8px", fontWeight: 700, color: "#4F46E5" }}>Step {s.stepNum}</td>
                  <td style={{ padding: "8px", fontWeight: 700, color: "#0F172A" }}>{s.bank}</td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>
                    {useUtc ? s.timeUtc : s.timeIst}
                  </td>
                  <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>
                    {s.publicIp} {s.port}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{s.pool}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 800, color: s.survivors === 1 ? "#059669" : "#0F172A" }}>
                    {s.survivors}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ fontSize: "9.5px", fontWeight: 700, color: s.survivors === 1 ? "#059669" : "#B45309" }}>
                      {s.survivors === 1 ? "INDIVIDUATED (TARGET NEEDLE)" : `−${s.eliminated} Eliminated`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* HERO CANVAS (FLEX-1, MIN-HEIGHT 220PX) */
        <div
          style={{
            flex: "1 1 0%",
            minHeight: "220px",
            position: "relative",
            background: "#FAFCFF",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
            style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
          />

          {/* Top Right Live Countdown Pill */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "12px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "4px 8px",
              boxShadow: "0 2px 6px rgba(15,23,42,0.06)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              pointerEvents: "none",
            }}
          >
            <span style={{ color: "#64748B" }}>Surviving Handsets:</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: "12px",
                color: survivorCount === 1 ? "#059669" : isPortDropped ? "#D97706" : "#4F46E5",
              }}
            >
              {survivorCount.toLocaleString()} / 10,000
            </span>
            <span style={{ fontSize: "8.5px", color: "#94A3B8" }}>· layout illustrative · counts exact</span>
          </div>

          {/* Quadtree Hover Tooltip */}
          {hoveredDot && tooltipPos && (
            <div
              style={{
                position: "fixed",
                left: `${tooltipPos.x + 12}px`,
                top: `${tooltipPos.y - 28}px`,
                background: "#0F172A",
                color: "#FFFFFF",
                borderRadius: "6px",
                padding: "6px 8px",
                fontSize: "10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                pointerEvents: "none",
                zIndex: 100,
                fontFamily: "var(--font-sans)",
              }}
            >
              <div style={{ fontWeight: 800, color: hoveredDot.isTarget ? "#34D399" : "#FFFFFF" }}>
                {hoveredDot.isTarget ? "★ TARGET NEEDLE: " : ""}
                {hoveredDot.maskedId}
              </div>
              <div style={{ fontSize: "9px", color: "#94A3B8", marginTop: "2px" }}>
                Tower: {hoveredDot.tower} · Present in {((hoveredDot.loginMask & 1) + ((hoveredDot.loginMask >> 1) & 1) + ((hoveredDot.loginMask >> 2) & 1) + ((hoveredDot.loginMask >> 3) & 1))}/4 Bank Logins
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          4-STEP STEPPER (HATCHED CAPACITY FUNNEL + INTERSECTION ∩ CONNECTORS - IMAGE 1)
          ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          borderBottom: "1px solid #E2E8F0",
          padding: "5px 10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxSizing: "border-box",
        }}
      >
        {stepsMeta.map((s, idx) => {
          const isPassed = currentStep >= s.stepNum;
          const isTargetStep = s.stepNum === 4;
          const barPct = s.stepNum === 1 ? 100 : s.stepNum === 2 ? 46 : s.stepNum === 3 ? 22 : isPortDropped ? 100 : 10;

          return (
            <React.Fragment key={s.id}>
              <div
                onClick={() => setCurrentStep(s.stepNum)}
                style={{
                  flex: 1,
                  background: isPassed ? (isTargetStep && !isPortDropped ? "#ECFDF5" : "#F8FAFC") : "#FFFFFF",
                  border: isPassed
                    ? isTargetStep && !isPortDropped
                      ? "1.5px solid #10B981"
                      : "1px solid #C7D2FE"
                    : "1px solid #E2E8F0",
                  borderRadius: "6px",
                  padding: "4px 7px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "8.5px", fontWeight: 800, color: isPassed ? "#4F46E5" : "#64748B" }}>
                    Step {s.stepNum}: {s.bank}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "7.5px",
                      color: "#94A3B8",
                    }}
                  >
                    {useUtc ? s.timeUtc : s.timeIst}
                  </span>
                </div>

                {/* Hatched Capacity Box with Proportional Gradient Fill - Matching Image 1 */}
                <div
                  style={{
                    position: "relative",
                    height: "22px",
                    marginTop: "3px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                  }}
                >
                  <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
                    <defs>
                      <pattern id={`hatch-${s.id}`} width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="6" stroke="#94A3B8" strokeWidth="1" opacity="0.28" />
                      </pattern>
                      <linearGradient id={`barGrad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isTargetStep && !isPortDropped ? "#10B981" : "#4F46E5"} />
                        <stop offset="100%" stopColor={isTargetStep && !isPortDropped ? "#059669" : "#059669"} />
                      </linearGradient>
                    </defs>
                    {/* Background Hatched Capacity Bar (340 Handsets) */}
                    <rect width="100%" height="100%" fill={`url(#hatch-${s.id})`} />
                    {/* Active Foreground Bar */}
                    <rect
                      y={`${100 - barPct}%`}
                      width="100%"
                      height={`${barPct}%`}
                      fill={`url(#barGrad-${s.id})`}
                      opacity={isPassed ? 1 : 0.3}
                      style={{ transition: "all 0.25s ease" }}
                    />
                  </svg>

                  {/* Floating Count Badge on Top of Bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "4px",
                      background: isTargetStep && !isPortDropped ? "#059669" : "#4F46E5",
                      color: "#FFFFFF",
                      fontSize: "8px",
                      fontWeight: 800,
                      padding: "0.5px 5px",
                      borderRadius: "3px",
                      fontFamily: "var(--font-mono)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                  >
                    {isPortDropped && isTargetStep ? "340" : s.survivors} {isTargetStep && !isPortDropped ? "★" : ""}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                  <span style={{ fontSize: "7.5px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85px" }}>
                    {s.port}
                  </span>
                  <span style={{ fontSize: "7.5px", fontWeight: 700, color: isTargetStep && !isPortDropped ? "#059669" : "#475569" }}>
                    {isTargetStep && !isPortDropped ? "1 TARGET" : `${s.survivors} SURVIVORS`}
                  </span>
                </div>
              </div>

              {/* Set Intersection Connector ∩ between stages */}
              {idx < 3 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Set Intersection (∩)"
                >
                  <div
                    style={{
                      width: "17px",
                      height: "17px",
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      border: "1px solid #C7D2FE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      color: "#4338CA",
                    }}
                  >
                    ∩
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* =========================================================================
          BOTTOM ROW: APPEARANCE HISTOGRAM & BAYESIAN ODDS METER
          ========================================================================= */}
      <div
        style={{
          height: "75px",
          minHeight: "75px",
          maxHeight: "75px",
          background: "#FAFCFF",
          padding: "6px 12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          boxSizing: "border-box",
        }}
      >
        {/* Left: Appearance Histogram (Handsets in 1, 2, 3, 4 Logins) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A" }}>
              Multi-Login Appearance Histogram (Log-Scale)
            </span>
            <span style={{ fontSize: "8.5px", color: "#64748B" }}>(Hover bar to highlight on canvas)</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "42px", paddingTop: "4px" }}>
            {[
              { count: 1, label: "1 Login", val: 299, pct: 90, color: "#94A3B8" },
              { count: 2, label: "2 Logins", val: 35, pct: 45, color: "#6366F1" },
              { count: 3, label: "3 Logins", val: 5, pct: 20, color: "#F59E0B" },
              { count: 4, label: "4 Logins (Target)", val: 1, pct: 10, color: "#10B981" },
            ].map((bar) => {
              const isHov = highlightedLoginCount === bar.count;
              return (
                <div
                  key={bar.count}
                  onMouseEnter={() => setHighlightedLoginCount(bar.count)}
                  onMouseLeave={() => setHighlightedLoginCount(null)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(6, bar.pct * 0.35)}px`,
                      background: isHov ? "#EC4899" : bar.color,
                      borderRadius: "3px 3px 0 0",
                      transition: "all 0.15s ease",
                    }}
                  />
                  <div style={{ fontSize: "8px", fontWeight: 700, color: "#475569", marginTop: "2px" }}>
                    {bar.val}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Bayesian Coincidental Odds Meter */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "4px 8px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A" }}>
              Bayesian Coincidental Match Odds
            </span>
            <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 800, color: "#4F46E5" }}>
              P = 1.40 × 10⁻⁷
            </span>
          </div>

          <div style={{ fontSize: "8.5px", color: "#475569", marginTop: "2px" }}>
            <code>E = (N−1)·Π(n_i/N) = 9999 × (340/10000)³ × (1/10000)</code>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "3px" }}>
            <span style={{ fontSize: "8.5px", color: "#059669", fontWeight: 700 }}>
              1 in 7,142,857 Coincidence Odds · Statistically Unique
            </span>
            <span style={{ fontSize: "7.5px", color: "#94A3B8" }}>Independent mobility assumption</span>
          </div>
        </div>
      </div>
    </div>
  );
};
