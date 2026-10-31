import React, { useState, useRef, useEffect } from "react";
import {
  Zap,
  RotateCcw,
  AlertTriangle,
  Radio,
  Clock,
  Wifi,
  Landmark,
  ShieldAlert,
  ChevronDown,
  X,
  Play,
  Pause,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const LiveDemoSimulatorPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    mutations,
    toggleMutation,
    resetAllMutations,
    activeMutationsCount,
    timeOffsetHours,
    setTimeOffsetHours,
    isPlaying,
    setIsPlaying,
    simulatedDateTimeStr,
  } = useTarkaGlobal();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const mutationList = [
    {
      key: "alterBankRow14" as const,
      label: "1. Doctored Bank Row #14 (+₹1,00,000 Fraud)",
      desc: "Injects +₹1L balance jump. Breaks double-entry conservation invariant in CBS Finacle.",
      icon: AlertTriangle,
      activeColor: "#DC2626",
      badge: "UNSAT",
      active: !!mutations.alterBankRow14,
    },
    {
      key: "forgeRrnTimestamp" as const,
      label: "2. Forge RRN Clock (+15m Switch Drift)",
      desc: "Injects 15-minute clock drift between UPI 12-digit Julian hour and CBS bank record.",
      icon: Clock,
      activeColor: "#D97706",
      badge: "DISCREPANCY",
      active: !!mutations.forgeRrnTimestamp,
    },
    {
      key: "dropCgnatSourcePort" as const,
      label: "3. Drop CGNAT Source Port (340 Candidates)",
      desc: "Simulates missing ISP port translation. Explodes candidate pool from 1 back to 340.",
      icon: Radio,
      activeColor: "#D97706",
      badge: "AMBIGUOUS",
      active: !!mutations.dropCgnatSourcePort,
    },
    {
      key: "triggerHotspotCollision" as const,
      label: "4. Wi-Fi Hotspot Tethering (TTL 64 → 63)",
      desc: "Simulates TCP SYN TTL decrement from 64 to 63 via accomplice Android hotspot AP.",
      icon: Wifi,
      activeColor: "#2563EB",
      badge: "COLLISION",
      active: !!mutations.triggerHotspotCollision,
    },
    {
      key: "injectMerchantCleanDeposit" as const,
      label: "5. Clean Deposit (+₹2.5L LIBR Divergence)",
      desc: "Injects innocent commercial credit, causing Roscoe v. Winder LIBR & FIFO to diverge.",
      icon: Landmark,
      activeColor: "#7C3AED",
      badge: "DIVERGED",
      active: !!mutations.injectMerchantCleanDeposit,
    },
    {
      key: "flipCustodyByte" as const,
      label: "6. Tamper Custody Bitstream (Seq #4 Bit-Flip)",
      desc: "Alters 1 byte in evidence ledger. Immediately breaks SHA-256 Merkle root verification.",
      icon: ShieldAlert,
      activeColor: "#DC2626",
      badge: "HASH BROKEN",
      active: !!mutations.flipCustodyByte,
    },
  ];

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* Sleek Header Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          height: "34px",
          padding: "0 12px",
          borderRadius: "8px",
          border: activeMutationsCount > 0 ? "1px solid rgba(220, 38, 38, 0.4)" : "1px solid var(--bento-border-subtle, #E2E8F0)",
          background: activeMutationsCount > 0 ? "#FEF2F2" : "var(--bento-card-bg, #FFFFFF)",
          color: activeMutationsCount > 0 ? "#DC2626" : "var(--bento-text-main, #0F172A)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          transition: "all 0.15s ease",
        }}
      >
        <Zap size={13} color={activeMutationsCount > 0 ? "#DC2626" : "#2563EB"} />
        <span>⚡ Live Demo Simulator</span>
        {activeMutationsCount > 0 ? (
          <span
            style={{
              fontSize: "10px",
              background: "#DC2626",
              color: "#FFFFFF",
              padding: "1px 6px",
              borderRadius: "10px",
              fontWeight: 700,
            }}
          >
            {activeMutationsCount} ACTIVE
          </span>
        ) : (
          <ChevronDown size={12} color="var(--bento-text-muted, #64748B)" />
        )}
      </button>

      {/* Floating Popover Card */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "440px",
            background: "var(--bento-card-bg, #FFFFFF)",
            border: "1px solid var(--bento-border-subtle, #E2E8F0)",
            borderRadius: "14px",
            boxShadow: "0 14px 38px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
            padding: "16px",
            zIndex: 1000,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Popover Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "rgba(37, 99, 235, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={13} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bento-text-main, #0F172A)" }}>
                  Adversarial Court SMT Simulator
                </div>
                <div style={{ fontSize: "11px", color: "var(--bento-text-muted, #64748B)" }}>
                  Toggle live forensic invariants in &lt;5ms
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={resetAllMutations}
                disabled={activeMutationsCount === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: "transparent",
                  color: activeMutationsCount === 0 ? "#94A3B8" : "#2563EB",
                  cursor: activeMutationsCount === 0 ? "not-allowed" : "pointer",
                  opacity: activeMutationsCount === 0 ? 0.5 : 1,
                }}
              >
                <RotateCcw size={11} />
                <span>Reset Ground Truth</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--bento-text-muted, #64748B)",
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Mutation Switches List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto" }}>
            {mutationList.map((m) => {
              return (
                <div
                  key={m.key}
                  onClick={() => toggleMutation(m.key)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: m.active ? `1px solid ${m.activeColor}` : "1px solid var(--bento-border-subtle, #E2E8F0)",
                    background: m.active ? "rgba(220, 38, 38, 0.04)" : "var(--bento-canvas-subtle, #F8FAFC)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: m.active ? `1px solid ${m.activeColor}` : "1px solid var(--bento-border-subtle, #CBD5E1)",
                      background: m.active ? m.activeColor : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "1px",
                      flexShrink: 0,
                    }}
                  >
                    {m.active && <span style={{ color: "#FFF", fontSize: "10px", fontWeight: 800 }}>✓</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: m.active ? m.activeColor : "var(--bento-text-main, #0F172A)" }}>
                        {m.label}
                      </span>
                      {m.active && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: m.activeColor,
                            color: "#FFFFFF",
                          }}
                        >
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--bento-text-muted, #64748B)", marginTop: "2px", lineHeight: 1.4 }}>
                      {m.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Integrated Mini Timeline Scrubber */}
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--bento-border-subtle, #E2E8F0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--bento-text-muted, #64748B)" }}>
                Statutory Clock: <strong className="font-mono-tabular" style={{ color: "var(--bento-text-main, #0F172A)" }}>T+{timeOffsetHours.toFixed(1)}h</strong> ({simulatedDateTimeStr})
              </div>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--bento-border-subtle, #E2E8F0)",
                  background: isPlaying ? "rgba(37,99,235,0.1)" : "transparent",
                  color: isPlaying ? "#2563EB" : "var(--bento-text-muted, #64748B)",
                  cursor: "pointer",
                }}
              >
                {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="48"
              step="0.5"
              value={timeOffsetHours}
              onChange={(e) => setTimeOffsetHours(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#2563EB", cursor: "pointer", height: "4px" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--bento-text-muted, #94A3B8)", marginTop: "2px" }}>
              <span>T+0h Intake</span>
              <span>T+2h Golden Hour</span>
              <span>T+24h Inter-Bank</span>
              <span>T+48h Court Expiry</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
