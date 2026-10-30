import React, { useState } from "react";
import {
  UploadCloud,
  Radio,
  GitFork,
  Scale,
  LayoutDashboard,
  Mic,
  Moon,
  Sun,
  ShieldCheck,
  FolderTree,
} from "lucide-react";
import { useTarkaGlobal, type TarkaRoute } from "../../context/TarkaGlobalContext";
import { useTheme } from "../../context/ThemeContext";
import { LiveJudgeMutatorBar } from "./LiveJudgeMutatorBar";
import { ClockScrubber } from "./ClockScrubber";
import { IntakeScreen } from "../../pages/v5/IntakeScreen";
import { AttributionScreen } from "../../pages/v5/AttributionScreen";
import { TaintEngineScreen } from "../../pages/v5/TaintEngineScreen";
import { CourtProofScreen } from "../../pages/v5/CourtProofScreen";
import { TarkaForensicWorkstation } from "../tarka/TarkaForensicWorkstation";
import { TarkaWorkflowPage } from "../tarka/TarkaWorkflowPage";
import { SarvamVoiceModal } from "../tarka/SarvamVoiceModal";

export const TarkaGlobalShell: React.FC = () => {
  const { activeRoute, setActiveRoute, activeCaseId, setActiveCaseId } = useTarkaGlobal();
  const { theme, setTheme } = useTheme();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);

  const navItems: { id: TarkaRoute; label: string; sub: string; icon: React.ElementType; badge?: string }[] = [
    {
      id: "intake",
      label: "1. Intake & Falsifier",
      sub: "Balance Conservation & PDF XRef",
      icon: UploadCloud,
    },
    {
      id: "attribution",
      label: "2. CGNAT & Hotspot",
      sub: "Candidate Funnel & Dual-SIM",
      icon: Radio,
    },
    {
      id: "taint-engine",
      label: "3. Taint DAG & BNSS",
      sub: "LIBR / Dinic Min-Cut Lien",
      icon: GitFork,
    },
    {
      id: "court-proof",
      label: "4. Adversarial Court Proof",
      sub: "Leave-One-Out & verify.html",
      icon: Scale,
    },
    {
      id: "workstation",
      label: "Full Workstation",
      sub: "Legacy 8-Tab Investigation",
      icon: LayoutDashboard,
      badge: "PRO",
    },
    {
      id: "workflow",
      label: "Pipeline Stages",
      sub: "6-Stage Educational View",
      icon: FolderTree,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", background: "var(--glass-bg-base)", overflow: "hidden" }}>
      {/* 1. Global Floating Live Judge Mutator Bar */}
      <LiveJudgeMutatorBar />

      {/* 2. Top Navigation Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          background: "rgba(10, 13, 20, 0.8)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 14px rgba(37, 99, 235, 0.5)",
            }}
          >
            <ShieldCheck size={18} color="#FFFFFF" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.5px" }}>TARKA</span>
              <span style={{ fontSize: "10px", background: "#2563EB", color: "#FFF", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                v5.0
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.4px" }}>
              The Real-Time Cyber Fraud Attribution & Falsification Engine
            </div>
          </div>
        </div>

        {/* Case Switcher Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#94A3B8" }}>Investigation:</span>
          <select
            value={activeCaseId}
            onChange={(e) => setActiveCaseId(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#F3F4F6",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="CASE-2026-001" style={{ background: "#111827", color: "#FFF" }}>
              CASE-2026-001: Operation Digital Arrest Extortion (1930 Portal)
            </option>
            <option value="upi_payment_discrepancy" style={{ background: "#111827", color: "#FFF" }}>
              SUTRAM-2026-UPI: Payment Discrepancy Golden Master
            </option>
          </select>
        </div>

        {/* Right Actions: Voice Assistant & Theme */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="lg-btn lg-btn-subtle"
            style={{ padding: "5px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Mic size={13} color="#60A5FA" />
            <span>Sarvam Voice (Hindi/En)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === "porcelain" ? "obsidian-glass" : theme === "obsidian-glass" ? "midnight-teal" : "porcelain")}
            className="lg-btn lg-btn-subtle"
            style={{ width: "32px", height: "32px", padding: 0 }}
            title={`Current Theme: ${theme}. Click to cycle.`}
          >
            {theme === "porcelain" ? <Sun size={14} color="#F59E0B" /> : <Moon size={14} color="#60A5FA" />}
          </button>
        </div>
      </header>

      {/* 3. T+0 to T+48h Clock Scrubber */}
      <ClockScrubber />

      {/* 4. Main Body: Bento Left Nav Rail + Dynamic Screen Viewport */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, marginTop: "6px" }}>
        {/* Left Bento Navigation Rail */}
        <aside
          style={{
            width: "240px",
            background: "rgba(10, 14, 22, 0.75)",
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px 8px" }}>
            Core Systems
          </div>

          {navItems.slice(0, 4).map((item) => {
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
                  border: isActive ? "1px solid rgba(37, 99, 235, 0.5)" : "1px solid transparent",
                  background: isActive ? "rgba(37, 99, 235, 0.18)" : "transparent",
                  color: isActive ? "#FFFFFF" : "#94A3B8",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={16} color={isActive ? "#60A5FA" : "#64748B"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: isActive ? 700 : 500, color: isActive ? "#FFF" : "#D1D5DB" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", margin: "8px 0" }} />

          <div style={{ fontSize: "10px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px 6px" }}>
            Advanced Tools
          </div>

          {navItems.slice(4).map((item) => {
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
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: isActive ? "1px solid rgba(37, 99, 235, 0.4)" : "1px solid transparent",
                  background: isActive ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive ? "#FFFFFF" : "#94A3B8",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} color={isActive ? "#60A5FA" : "#64748B"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: isActive ? 700 : 500, color: isActive ? "#FFF" : "#D1D5DB" }}>
                    {item.label}
                  </div>
                </div>
                {item.badge && (
                  <span style={{ fontSize: "9px", background: "rgba(37, 99, 235, 0.3)", color: "#60A5FA", padding: "1px 4px", borderRadius: "3px" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Dynamic Screen Viewport */}
        <main style={{ flex: 1, minWidth: 0, overflow: "hidden", background: "var(--glass-bg-canvas)" }}>
          {activeRoute === "intake" && <IntakeScreen />}
          {activeRoute === "attribution" && <AttributionScreen />}
          {activeRoute === "taint-engine" && <TaintEngineScreen />}
          {activeRoute === "court-proof" && <CourtProofScreen />}
          {activeRoute === "workstation" && <TarkaForensicWorkstation />}
          {activeRoute === "workflow" && <TarkaWorkflowPage />}
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
