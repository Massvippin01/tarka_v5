import React, { useState } from "react";
import {
  ScanLine,
  Radio,
  GitFork,
  Scale,
  Mic,
  Moon,
  Sun,
  ShieldCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { useTarkaGlobal, type TarkaRoute } from "../../context/TarkaGlobalContext";
import { useTheme } from "../../context/ThemeContext";
import { LiveDemoSimulatorPopover } from "./LiveDemoSimulatorPopover";
import { IntakeScreen } from "../../pages/v5/IntakeScreen";
import { AttributionScreen } from "../../pages/v5/AttributionScreen";
import { TaintEngineScreen } from "../../pages/v5/TaintEngineScreen";
import { CourtProofScreen } from "../../pages/v5/CourtProofScreen";
import { SarvamVoiceModal } from "../tarka/SarvamVoiceModal";

export const TarkaGlobalShell: React.FC = () => {
  const { activeRoute, setActiveRoute, activeCaseId, timeOffsetHours, statutoryPeriod } = useTarkaGlobal();
  const { theme, setTheme } = useTheme();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);

  // 4 Primary Investigator Screens (Cleaned of all unnecessary jargon)
  const navItems = [
    {
      id: "intake" as TarkaRoute,
      label: "1. Evidence & Receipt Scanner",
      sub: "Bank CSV, RRN & PDF Check",
      icon: ScanLine,
    },
    {
      id: "attribution" as TarkaRoute,
      label: "2. IP & Phone Attribution",
      sub: "CGNAT Funnel & SIM-Swap",
      icon: Radio,
    },
    {
      id: "taint-engine" as TarkaRoute,
      label: "3. Money Trail & Lien Orders",
      sub: "Mule Flow & Sec 106 BNSS",
      icon: GitFork,
    },
    {
      id: "court-proof" as TarkaRoute,
      label: "4. Court Dossier & Refund",
      sub: "Sec 63 BSA & Victim Refund",
      icon: Scale,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: "var(--bento-canvas-bg, #F1F5F9)", overflow: "hidden", fontFamily: "var(--font-heading)" }}>
      {/* 1. SINGLE 52PX TOP HEADER BAR */}
      <header
        style={{
          height: "52px",
          padding: "0 18px",
          background: "var(--bento-card-bg, #FFFFFF)",
          borderBottom: "1px solid var(--bento-border-subtle, #E2E8F0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Brand Logo & Active Case Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 900,
                fontSize: "14px",
                boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
              }}
            >
              T
            </div>
            <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--bento-text-main, #0F172A)" }}>
              TARKA
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                background: "#EEF2FF",
                color: "#4F46E5",
                padding: "2px 6px",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
              }}
            >
              v5.0
            </span>
          </div>

          <div style={{ width: "1px", height: "20px", background: "var(--bento-border-subtle, #E2E8F0)" }} />

          {/* Active Case Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "var(--bento-canvas-subtle, #F8FAFC)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              fontSize: "12px",
              color: "var(--bento-text-secondary, #334155)",
            }}
          >
            <Briefcase size={12} color="#4F46E5" />
            <span style={{ fontWeight: 700, color: "var(--bento-text-main, #0F172A)" }}>{activeCaseId}</span>
            <span style={{ color: "var(--bento-text-muted, #94A3B8)" }}>·</span>
            <span>Digital Arrest Extortion (₹2,15,000 Loss)</span>
          </div>
        </div>

        {/* Center: Live Case Clock & Statutory Period */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "6px",
              background: statutoryPeriod.code === "GOLDEN_HOUR" ? "rgba(220,38,38,0.08)" : "rgba(37,99,235,0.08)",
              border: statutoryPeriod.code === "GOLDEN_HOUR" ? "1px solid rgba(220,38,38,0.25)" : "1px solid rgba(37,99,235,0.2)",
              fontSize: "11px",
              fontWeight: 600,
              color: statutoryPeriod.code === "GOLDEN_HOUR" ? "#DC2626" : "#2563EB",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statutoryPeriod.code === "GOLDEN_HOUR" ? "#DC2626" : "#2563EB" }} />
            <span className="font-mono-tabular">T+{timeOffsetHours.toFixed(1)}h</span>
            <span style={{ color: "var(--bento-text-muted, #94A3B8)" }}>·</span>
            <span>{statutoryPeriod.label}</span>
          </div>
        </div>

        {/* Right Actions: Live Demo Simulator Dropdown + Sarvam Voice + Theme + User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Live Simulator Popover Dropdown */}
          <LiveDemoSimulatorPopover />

          {/* Sarvam AI Voice Assistant */}
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "34px",
              padding: "0 12px",
              borderRadius: "8px",
              border: "1px solid rgba(37,99,235,0.25)",
              background: "rgba(37,99,235,0.06)",
              color: "#2563EB",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Mic size={13} />
            <span>Sarvam Voice AI</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => setTheme(theme === "porcelain" ? "obsidian" : "porcelain")}
            title="Toggle Daylight Bento / Dark Glass"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              background: "transparent",
              color: "var(--bento-text-muted, #64748B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {theme === "porcelain" ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <div style={{ width: "1px", height: "20px", background: "var(--bento-border-subtle, #E2E8F0)" }} />

          {/* Investigator Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              VS
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--bento-text-main, #0F172A)" }}>
                Insp. Vikram Sharma
              </div>
              <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #64748B)" }}>
                CBI Cyber Crime Cell
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE: SIDEBAR + VIEWPORT */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Clean Single Left Sidebar (230px) */}
        <aside
          style={{
            width: "230px",
            background: "var(--bento-card-bg, #FFFFFF)",
            borderRight: "1px solid var(--bento-border-subtle, #E2E8F0)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "14px 10px",
            flexShrink: 0,
          }}
        >
          {/* Primary Nav Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--bento-text-muted, #94A3B8)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 10px 8px" }}>
              Forensic Investigation Pipeline
            </div>

            {navItems.map((item) => {
              const isActive = activeRoute === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRoute(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: isActive ? "1px solid #C7D2FE" : "1px solid transparent",
                    background: isActive ? "#EEF2FF" : "transparent",
                    color: isActive ? "#4F46E5" : "var(--bento-text-secondary, #475569)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={16} color={isActive ? "#2563EB" : "var(--bento-text-muted, #64748B)"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: isActive ? 800 : 600, color: isActive ? "#2563EB" : "var(--bento-text-main, #0F172A)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #64748B)", marginTop: "1px" }}>
                      {item.sub}
                    </div>
                  </div>
                  {isActive && <ChevronRight size={13} color="#2563EB" />}
                </button>
              );
            })}
          </div>

          {/* Bottom System Health Telemetry Card */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "var(--bento-canvas-subtle, #F8FAFC)",
              border: "1px solid var(--bento-border-subtle, #E2E8F0)",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <ShieldCheck size={13} color="#059669" />
              <span style={{ fontWeight: 700, color: "var(--bento-text-main, #0F172A)" }}>Z3 Formal Solver: OK</span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--bento-text-muted, #64748B)" }}>
              CAS SHA-256 Ledger: Chain Valid · ISO 17025 Ready
            </div>
          </div>
        </aside>

        {/* Viewport: 100% Height Above the Fold */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "var(--bento-canvas-bg, #F1F5F9)",
          }}
        >
          {activeRoute === "intake" && <IntakeScreen />}
          {activeRoute === "attribution" && <AttributionScreen />}
          {activeRoute === "taint-engine" && <TaintEngineScreen />}
          {activeRoute === "court-proof" && <CourtProofScreen />}
        </main>
      </div>

      {/* Voice Assistant Modal */}
      {voiceOpen && (
        <SarvamVoiceModal
          isOpen={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          caseId={activeCaseId}
        />
      )}
    </div>
  );
};
