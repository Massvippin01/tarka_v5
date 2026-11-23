import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  ChevronDown,
  ChevronUp,
  Info,
  Scale,
  Brain,
  AlertOctagon,
  Eye,
} from "lucide-react";
import type { DemoScene, DemoDirectorControls } from "./demoTypes";

interface DemoArrowOverlayProps {
  scene: DemoScene;
  sceneIndex: number;
  totalScenes: number;
  controls: DemoDirectorControls;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const DemoArrowOverlay: React.FC<DemoArrowOverlayProps> = ({
  scene,
  sceneIndex,
  totalScenes,
  controls,
}) => {
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [activeTabSection, setActiveTabSection] = useState<
    "overview" | "plainMeaning" | "investigation" | "tarkaAction" | "limits"
  >("overview");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 120, left: 40 });

  // 1. Locate Target Element Geometry with Fallbacks & Smooth Scroll
  const updateTargetGeometry = useCallback(() => {
    if (typeof document === "undefined") return;

    let targetEl: HTMLElement | null = null;
    if (scene.targetSelector) {
      try {
        targetEl = document.querySelector<HTMLElement>(scene.targetSelector);
      } catch {
        targetEl = null;
      }
    }

    if (!targetEl && scene.fallbackSelectors) {
      for (const sel of scene.fallbackSelectors) {
        try {
          const el = document.querySelector<HTMLElement>(sel);
          if (el) {
            targetEl = el;
            break;
          }
        } catch {
          // ignore selector errors
        }
      }
    }

    if (targetEl) {
      const r = targetEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setTargetRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        });

        // Ensure visible in viewport with gentle smooth scroll if needed
        const isInViewport =
          r.top >= 60 &&
          r.left >= 0 &&
          r.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          r.right <= (window.innerWidth || document.documentElement.clientWidth);

        if (!isInViewport) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
        return;
      }
    }

    // Fallback if target element not yet in DOM or hidden
    setTargetRect(null);
  }, [scene]);

  useEffect(() => {
    updateTargetGeometry();

    const handleUpdate = () => updateTargetGeometry();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    const interval = setInterval(updateTargetGeometry, 250);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      clearInterval(interval);
    };
  }, [updateTargetGeometry]);

  // 2. Responsive Card Positioning to avoid target occlusion
  useEffect(() => {
    if (!targetRect || typeof window === "undefined") {
      setCardPos({ top: 100, left: window.innerWidth > 768 ? window.innerWidth - 440 : 20 });
      return;
    }

    const cardWidth = Math.min(420, window.innerWidth - 40);
    const cardHeight = isMinimized ? 120 : 380;
    const padding = 20;

    let top = 100;
    let left = 20;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Check preferred placement
    const pref = scene.placement || "auto";

    if (pref === "bottom" && targetRect.bottom + cardHeight + padding < viewportH) {
      top = targetRect.bottom + padding;
      left = Math.max(padding, Math.min(viewportW - cardWidth - padding, targetRect.left));
    } else if (pref === "top" && targetRect.top - cardHeight - padding > 60) {
      top = targetRect.top - cardHeight - padding;
      left = Math.max(padding, Math.min(viewportW - cardWidth - padding, targetRect.left));
    } else if (pref === "right" && targetRect.right + cardWidth + padding < viewportW) {
      top = Math.max(70, Math.min(viewportH - cardHeight - padding, targetRect.top));
      left = targetRect.right + padding;
    } else if (pref === "left" && targetRect.left - cardWidth - padding > 0) {
      top = Math.max(70, Math.min(viewportH - cardHeight - padding, targetRect.top));
      left = targetRect.left - cardWidth - padding;
    } else {
      // Auto placement: choose quadrant with maximum free space
      if (targetRect.left > viewportW / 2) {
        // Target is on right half, place card on left
        left = 40;
        top = Math.max(70, Math.min(viewportH - cardHeight - padding, targetRect.top));
      } else {
        // Target is on left half, place card on right
        left = viewportW - cardWidth - 40;
        top = Math.max(70, Math.min(viewportH - cardHeight - padding, targetRect.top));
      }
    }

    setCardPos({ top, left });
  }, [targetRect, scene.placement, isMinimized]);

  // 3. Arrow SVG Coordinates
  const arrowCoordinates = useMemo(() => {
    if (!targetRect) return null;

    const cardWidth = Math.min(420, typeof window !== "undefined" ? window.innerWidth - 40 : 400);
    const cardHeight = isMinimized ? 120 : 380;

    const cardCenter = {
      x: cardPos.left + cardWidth / 2,
      y: cardPos.top + cardHeight / 2,
    };

    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    };

    // Determine exit point from card
    let startX = cardCenter.x;
    let startY = cardCenter.y;
    let endX = targetCenter.x;
    let endY = targetCenter.y;

    if (cardPos.left > targetRect.right) {
      // Card is to the right of target
      startX = cardPos.left;
      startY = Math.min(Math.max(cardPos.top + 30, targetCenter.y), cardPos.top + cardHeight - 30);
      endX = targetRect.right + 6;
      endY = targetCenter.y;
    } else if (cardPos.left + cardWidth < targetRect.left) {
      // Card is to the left of target
      startX = cardPos.left + cardWidth;
      startY = Math.min(Math.max(cardPos.top + 30, targetCenter.y), cardPos.top + cardHeight - 30);
      endX = targetRect.left - 6;
      endY = targetCenter.y;
    } else if (cardPos.top > targetRect.bottom) {
      // Card is below target
      startX = cardCenter.x;
      startY = cardPos.top;
      endX = targetCenter.x;
      endY = targetRect.bottom + 6;
    } else {
      // Card is above target
      startX = cardCenter.x;
      startY = cardPos.top + cardHeight;
      endX = targetCenter.x;
      endY = targetRect.top - 6;
    }

    // Quadratic / cubic control points for sleek dynamic curve
    const dx = endX - startX;
    const ctrl1X = startX + dx * 0.5;
    const ctrl1Y = startY;
    const ctrl2X = startX + dx * 0.5;
    const ctrl2Y = endY;

    return {
      path: `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`,
      endX,
      endY,
      startX,
      startY,
    };
  }, [targetRect, cardPos, isMinimized]);

  return (
    <div
      className="tarka-demo-overlay"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* 1. Subtle Target Spotlight & Cutout Halo */}
      {targetRect && (
        <div
          data-testid="demo-target-spotlight"
          style={{
            position: "fixed",
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: "8px",
            boxShadow: "0 0 0 9999px rgba(5, 8, 15, 0.62), 0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 12px rgba(59, 130, 246, 0.3)",
            border: "2px solid #3B82F6",
            pointerEvents: "none",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 10000,
          }}
        >
          {/* Pulsing Corner Indicator */}
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#60A5FA",
              boxShadow: "0 0 8px #60A5FA",
              animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
        </div>
      )}

      {/* 2. SVG Animated Connector Arrow */}
      {arrowCoordinates && (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10001,
          }}
        >
          <defs>
            <linearGradient id="demoArrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
            </linearGradient>
            <filter id="demoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.7" />
            </filter>
            <marker
              id="demoArrowhead"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 8 4, 0 8" fill="#60A5FA" />
            </marker>
          </defs>

          {/* Shadow line */}
          <path
            d={arrowCoordinates.path}
            fill="none"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Glowing Animated Connector Line */}
          <path
            d={arrowCoordinates.path}
            fill="none"
            stroke="url(#demoArrowGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 4"
            markerEnd="url(#demoArrowhead)"
            filter="url(#demoGlow)"
            style={{
              animation: "demoDash 1.2s linear infinite",
            }}
          />

          {/* Glowing Origin Dot */}
          <circle
            cx={arrowCoordinates.startX}
            cy={arrowCoordinates.startY}
            r="4"
            fill="#60A5FA"
            filter="url(#demoGlow)"
          />
        </svg>
      )}

      {/* 3. High-Contrast Forensic Workstation Caption Card */}
      <div
        ref={cardRef}
        data-testid="demo-caption-card"
        style={{
          position: "fixed",
          top: cardPos.top,
          left: cardPos.left,
          width: Math.min(420, typeof window !== "undefined" ? window.innerWidth - 40 : 400),
          backgroundColor: "rgba(10, 14, 23, 0.94)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.8), 0 0 24px rgba(59, 130, 246, 0.15)",
          color: "#F3F4F6",
          padding: "16px",
          pointerEvents: "auto",
          zIndex: 10002,
          transition: "top 0.25s ease-out, left 0.25s ease-out",
          fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        }}
      >
        {/* Header Pill & Step Counter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "10px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                color: "#93C5FD",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                padding: "2px 8px",
                borderRadius: "999px",
                fontSize: "11px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              ACT {scene.act} • SCENE {sceneIndex + 1}/{totalScenes}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: controls.state === "PAUSED" ? "#FBBF24" : "#34D399",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
              }}
            >
              ● {controls.state}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "2px",
              }}
              title={isMinimized ? "Expand Card" : "Minimize Card"}
            >
              {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            <button
              data-testid="btn-demo-stop"
              onClick={controls.stopDemo}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#FCA5A5",
                borderRadius: "4px",
                cursor: "pointer",
                padding: "3px 6px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Stop & Exit Demonstration (Esc)"
            >
              <Square size={10} fill="#EF4444" strokeWidth={0} />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Scene Title & Subtitle */}
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "0.2px",
            }}
          >
            {scene.title}
          </h2>
          <p
            style={{
              margin: "3px 0 10px 0",
              fontSize: "11px",
              color: "#93C5FD",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {scene.subtitle}
          </p>
        </div>

        {!isMinimized && (
          <>
            {/* 5-Point Forensic Structure Tabs */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: "8px",
                marginBottom: "10px",
                overflowX: "auto",
              }}
            >
              {[
                { id: "overview", label: "Viewer", icon: <Eye size={11} /> },
                { id: "plainMeaning", label: "Meaning", icon: <Info size={11} /> },
                { id: "investigation", label: "Significance", icon: <Scale size={11} /> },
                { id: "tarkaAction", label: "TARKA Action", icon: <Brain size={11} /> },
                { id: "limits", label: "Limits & Law", icon: <AlertOctagon size={11} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabSection(tab.id as typeof activeTabSection)}
                  style={{
                    backgroundColor:
                      activeTabSection === tab.id
                        ? "rgba(59, 130, 246, 0.25)"
                        : "rgba(255, 255, 255, 0.04)",
                    border:
                      activeTabSection === tab.id
                        ? "1px solid rgba(59, 130, 246, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                    color: activeTabSection === tab.id ? "#93C5FD" : "#9CA3AF",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "10px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                    fontWeight: activeTabSection === tab.id ? 600 : 400,
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Explanation Content Box */}
            <div
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "12px",
                lineHeight: 1.55,
                color: "#E2E8F0",
                minHeight: "80px",
                maxHeight: "130px",
                overflowY: "auto",
              }}
            >
              {activeTabSection === "overview" && (
                <div>
                  <strong style={{ color: "#60A5FA", display: "block", marginBottom: "3px", fontSize: "11px" }}>
                    WHAT YOU ARE SEEING:
                  </strong>
                  {scene.explanation.whatViewerSees}
                </div>
              )}
              {activeTabSection === "plainMeaning" && (
                <div>
                  <strong style={{ color: "#FCD34D", display: "block", marginBottom: "3px", fontSize: "11px" }}>
                    PLAIN-LANGUAGE MEANING:
                  </strong>
                  {scene.explanation.plainMeaning}
                </div>
              )}
              {activeTabSection === "investigation" && (
                <div>
                  <strong style={{ color: "#A7F3D0", display: "block", marginBottom: "3px", fontSize: "11px" }}>
                    INVESTIGATIVE SIGNIFICANCE:
                  </strong>
                  {scene.explanation.investigativeSignificance}
                </div>
              )}
              {activeTabSection === "tarkaAction" && (
                <div>
                  <strong style={{ color: "#C4B5FD", display: "block", marginBottom: "3px", fontSize: "11px" }}>
                    WHAT TARKA ACTUALLY DID:
                  </strong>
                  {scene.explanation.tarkaAction}
                </div>
              )}
              {activeTabSection === "limits" && (
                <div>
                  <strong style={{ color: "#FCA5A5", display: "block", marginBottom: "3px", fontSize: "11px" }}>
                    STATUTORY LIMITS & WHAT THIS DOES NOT PROVE:
                  </strong>
                  {scene.explanation.statutoryLimits}
                </div>
              )}
            </div>

            {/* Spoken Script Preview Strip */}
            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                color: "#94A3B8",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                padding: "6px 8px",
                borderRadius: "4px",
                borderLeft: "2px solid #3B82F6",
                maxHeight: "45px",
                overflowY: "auto",
                fontStyle: "italic",
              }}
            >
              "{scene.spokenScript}"
            </div>
          </>
        )}

        {/* Progress Bar */}
        <div
          style={{
            marginTop: "12px",
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${controls.progressPercent}%`,
              backgroundColor: "#3B82F6",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Zero-Mouse Transport Controls */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={controls.prevScene}
              disabled={sceneIndex === 0}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: sceneIndex === 0 ? "#4B5563" : "#D1D5DB",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: sceneIndex === 0 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Previous Scene (←)"
            >
              <SkipBack size={12} />
            </button>

            <button
              data-testid="btn-demo-pause-resume"
              onClick={controls.state === "PAUSED" ? controls.resumeDemo : controls.pauseDemo}
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.25)",
                border: "1px solid rgba(59, 130, 246, 0.5)",
                color: "#FFFFFF",
                borderRadius: "4px",
                padding: "4px 12px",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Pause/Resume (Space)"
            >
              {controls.state === "PAUSED" ? (
                <>
                  <Play size={12} fill="#FFFFFF" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause size={12} fill="#FFFFFF" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              data-testid="btn-demo-next"
              onClick={controls.nextScene}
              disabled={sceneIndex === totalScenes - 1}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: sceneIndex === totalScenes - 1 ? "#4B5563" : "#D1D5DB",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: sceneIndex === totalScenes - 1 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Next Scene (→)"
            >
              <SkipForward size={12} />
            </button>

            <button
              onClick={controls.restartDemo}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#9CA3AF",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Restart Demo (R)"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Voice Mute & Speed Control */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={controls.toggleMute}
              style={{
                background: "none",
                border: "none",
                color: controls.isMuted ? "#9CA3AF" : "#60A5FA",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              title={controls.isMuted ? "Unmute Voice Narration" : "Mute Voice Narration"}
            >
              {controls.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace" }}>
                {controls.isMuted ? "MUTED" : "VOICE"}
              </span>
            </button>

            {/* Speed Pill */}
            <select
              value={controls.playbackSpeed}
              onChange={(e) => controls.setSpeed(Number(e.target.value))}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                color: "#E2E8F0",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                fontSize: "10px",
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "2px 4px",
                cursor: "pointer",
              }}
            >
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2.0x</option>
            </select>
          </div>
        </div>

        {/* Global Keyboard Shortcuts Reminder */}
        <div
          style={{
            marginTop: "8px",
            fontSize: "9px",
            color: "#64748B",
            fontFamily: "'IBM Plex Mono', monospace",
            textAlign: "center",
          }}
        >
          [Space: Pause] • [→: Next] • [←: Prev] • [R: Restart] • [Esc: Exit]
        </div>
      </div>

      <style>{`
        @keyframes demoDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tarka-demo-overlay * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};
