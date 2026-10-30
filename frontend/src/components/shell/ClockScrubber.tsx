import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  Scale,
  Calendar,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const ClockScrubber: React.FC = () => {
  const {
    timeOffsetHours,
    setTimeOffsetHours,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    simulatedDateTimeStr,
    statutoryPeriod,
  } = useTarkaGlobal();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeOffsetHours(parseFloat(e.target.value));
  };

  const handleJump = (targetHours: number) => {
    setTimeOffsetHours(targetHours);
  };

  const handleStep = (delta: number) => {
    setTimeOffsetHours((prev) => Math.min(48, Math.max(0, parseFloat((prev + delta).toFixed(1)))));
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        background: "rgba(12, 16, 26, 0.88)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "8px 16px",
        margin: "8px 16px 0 16px",
      }}
    >
      {/* Top Row: Clock Telemetry, Steppers & Statutory Period Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        {/* Left: Playback Controls & Timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "2px" }}>
            <button
              type="button"
              onClick={() => handleJump(0)}
              className="lg-btn-icon"
              title="Reset to T+0 (09:30 IST Incident Intake)"
              style={{ width: "26px", height: "26px", padding: 0 }}
            >
              <SkipBack size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="lg-btn-icon"
              title="Step backward -1 hour"
              style={{ width: "26px", height: "26px", padding: 0 }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className={`lg-btn-icon ${isPlaying ? "lg-btn-active" : ""}`}
              title={isPlaying ? "Pause Timeline Accrual" : "Play Timeline Accrual (T+0 -> T+48h)"}
              style={{
                width: "28px",
                height: "28px",
                padding: 0,
                background: isPlaying ? "rgba(37, 99, 235, 0.3)" : "rgba(255, 255, 255, 0.08)",
                borderColor: isPlaying ? "#3B82F6" : "rgba(255, 255, 255, 0.15)",
                color: isPlaying ? "#60A5FA" : "#FFFFFF",
              }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: "1px" }} />}
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="lg-btn-icon"
              title="Step forward +1 hour"
              style={{ width: "26px", height: "26px", padding: 0 }}
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleJump(48)}
              className="lg-btn-icon"
              title="Jump to T+48h (Statutory Court Expiry)"
              style={{ width: "26px", height: "26px", padding: 0 }}
            >
              <SkipForward size={12} />
            </button>
          </div>

          {/* Speed Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "6px", padding: "1px" }}>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                style={{
                  fontSize: "10px",
                  fontWeight: playbackSpeed === spd ? 700 : 500,
                  color: playbackSpeed === spd ? "#60A5FA" : "#94A3B8",
                  background: playbackSpeed === spd ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  border: "none",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  cursor: "pointer",
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Current Temporal Coordinates */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#F3F4F6", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <Calendar size={13} color="#60A5FA" />
              <span>{simulatedDateTimeStr}</span>
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#60A5FA",
                background: "rgba(59, 130, 246, 0.12)",
                padding: "2px 7px",
                borderRadius: "5px",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                fontFamily: "var(--font-mono)",
              }}
            >
              T+{timeOffsetHours.toFixed(1)}h
            </span>
          </div>
        </div>

        {/* Right: Statutory Period Indicator Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {statutoryPeriod.statutoryRef}
            </div>
            <div style={{ fontSize: "11px", color: "#CBD5E1" }}>
              {statutoryPeriod.hoursRemaining > 0 ? (
                <span>Window Closes in <strong>{statutoryPeriod.hoursRemaining}h</strong></span>
              ) : (
                <span style={{ color: "#F43F5E" }}>Statutory Deadline Elapsed</span>
              )}
            </div>
          </div>

          <div
            className={`lg-badge ${statutoryPeriod.badgeClass}`}
            style={{
              padding: "5px 10px",
              fontSize: "11px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {statutoryPeriod.code === "GOLDEN_HOUR" ? (
              <ShieldAlert size={13} className="animate-pulse" />
            ) : statutoryPeriod.code === "INTER_BANK_TAINT" ? (
              <Clock size={13} />
            ) : (
              <Scale size={13} />
            )}
            <span>{statutoryPeriod.label}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Range Slider with Stage Milestones */}
      <div style={{ position: "relative", width: "100%", padding: "4px 0" }}>
        <input
          type="range"
          min="0"
          max="48"
          step="0.1"
          value={timeOffsetHours}
          onChange={handleSliderChange}
          style={{
            width: "100%",
            height: "5px",
            accentColor: timeOffsetHours <= 2 ? "#F43F5E" : timeOffsetHours <= 24 ? "#F59E0B" : "#3B82F6",
            cursor: "pointer",
            borderRadius: "4px",
            background: "rgba(255, 255, 255, 0.15)",
          }}
        />

        {/* Milestone Pinpoints */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9px",
            color: "#64748B",
            marginTop: "2px",
            fontFamily: "var(--font-mono)",
            userSelect: "none",
          }}
        >
          <span style={{ color: timeOffsetHours >= 0 ? "#60A5FA" : undefined, cursor: "pointer" }} onClick={() => handleJump(0)}>
            T+0h (09:30 Intake)
          </span>
          <span style={{ color: timeOffsetHours >= 2 ? "#F43F5E" : undefined, cursor: "pointer", fontWeight: 700 }} onClick={() => handleJump(2)}>
            T+2h (Golden Hour § 106)
          </span>
          <span style={{ color: timeOffsetHours >= 6 ? "#F59E0B" : undefined, cursor: "pointer" }} onClick={() => handleJump(6)}>
            T+6h (Layer 2 Hop)
          </span>
          <span style={{ color: timeOffsetHours >= 24 ? "#A855F7" : undefined, cursor: "pointer" }} onClick={() => handleJump(24)}>
            T+24h (RTGS / CDR Dump)
          </span>
          <span style={{ color: timeOffsetHours >= 48 ? "#3B82F6" : undefined, cursor: "pointer", fontWeight: 700 }} onClick={() => handleJump(48)}>
            T+48h (Court Attachment § 107)
          </span>
        </div>
      </div>
    </div>
  );
};
