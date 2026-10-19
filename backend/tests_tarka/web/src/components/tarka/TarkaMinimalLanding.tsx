import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Globe,
  Palette,
  SlidersHorizontal,
  LayoutGrid,
  ChevronRight,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { TarkaParticleOrb, type OrbState } from "./TarkaParticleOrb";
import { useTheme, type ThemeMode } from "../../context/ThemeContext";

interface TarkaMinimalLandingProps {
  onOpenWorkstation: (tab?: string) => void;
  onActivateVoice: () => void;
  isVoiceActive: boolean;
  voiceState: OrbState;
  audioLevel: number;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
  cases: Array<{ case_id: string; title?: string }>;
  reportCount?: number;
}

export const TarkaMinimalLanding: React.FC<TarkaMinimalLandingProps> = ({
  onOpenWorkstation,
  onActivateVoice,
  isVoiceActive,
  voiceState,
  audioLevel,
  selectedLanguage,
  onLanguageChange,
  activeCaseId,
  onSelectCase,
  cases,
  reportCount = 0,
}) => {
  const { theme, setTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showCaseSelector, setShowCaseSelector] = useState(false);

  const languageOptions = [
    { code: "en-IN", label: "Indian English (en-IN)" },
    { code: "ta-IN", label: "Tamil (தமிழ்)" },
    { code: "hi-IN", label: "Hindi (हिन्दी)" },
    { code: "bn-IN", label: "Bengali (বাংলা)" },
    { code: "unknown", label: "Auto-Detect Language" },
  ];

  const themeLabels: Record<ThemeMode, string> = {
    "obsidian-glass": "Obsidian Glass (Default)",
    "porcelain": "Porcelain (Light Minimal)",
    "midnight-teal": "Midnight Teal (Forensic)",
    "high-contrast": "High-Contrast Accessible",
  };

  const samplePrompts = [
    "Summarize this case in natural language",
    "Explain the payment discrepancy finding",
    "Trace provenance down to source evidence bytes",
    "What remains uncertain and which evidence is missing?",
    "Generate statutory Section 63 BSA report",
  ];

  return (
    <div
      className="tarka-minimal-landing"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "32px 40px",
        boxSizing: "border-box",
        background: "var(--glass-bg-base)",
        color: "var(--glass-text-primary)",
        overflow: "hidden",
      }}
    >
      {/* 1. Subtle Automotive Top Header */}
      <header
        style={{
          width: "100%",
          maxWidth: "1280px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        {/* Brand Wordmark */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Serif', Georgia, serif",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "3px",
              color: "var(--glass-text-bright)",
              textShadow: "0 0 24px rgba(255, 255, 255, 0.18)",
            }}
          >
            TARKA
          </span>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--glass-accent-blue)",
              letterSpacing: "1px",
            }}
          >
            तर्क
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "var(--glass-text-muted)",
              letterSpacing: "0.5px",
              marginLeft: "6px",
            }}
          >
            SUTRAM 2026 • DIGITAL FORENSICS
          </span>
        </div>

        {/* Top Right Quick Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Active Case Selector Pill */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowCaseSelector(!showCaseSelector)}
              className="lg-btn lg-btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontFamily: "'IBM Plex Mono', monospace",
                padding: "6px 12px",
                borderRadius: "var(--glass-radius-pill)",
              }}
              title="Select active forensic case"
            >
              <ShieldCheck size={14} className="text-blue-400" />
              <span>{activeCaseId}</span>
              <ChevronRight size={12} style={{ transform: showCaseSelector ? "rotate(90deg)" : "none" }} />
            </button>

            {showCaseSelector && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  background: "var(--glass-tint-level-3)",
                  backdropFilter: "var(--glass-blur-lg)",
                  border: "1px solid var(--glass-border-specular)",
                  borderRadius: "var(--glass-radius-md)",
                  padding: "6px",
                  minWidth: "260px",
                  boxShadow: "var(--glass-shadow-lg)",
                  zIndex: 50,
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--glass-text-muted)", padding: "6px 10px", fontWeight: 600 }}>
                  FORENSIC CASE WORKSPACES
                </div>
                {cases.map((c) => (
                  <button
                    key={c.case_id}
                    onClick={() => {
                      onSelectCase(c.case_id);
                      setShowCaseSelector(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: "var(--glass-radius-sm)",
                      background: c.case_id === activeCaseId ? "var(--glass-tint-active)" : "transparent",
                      color: c.case_id === activeCaseId ? "var(--glass-text-bright)" : "var(--glass-text-primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{c.case_id}</span>
                    {c.case_id === activeCaseId && <span style={{ color: "var(--glass-accent-emerald)", fontSize: "10px" }}>ACTIVE</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings Toggle Pill */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="lg-btn lg-btn-secondary"
            style={{
              padding: "6px 10px",
              borderRadius: "var(--glass-radius-pill)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
            }}
            title="Language & Theme Settings"
          >
            <SlidersHorizontal size={14} />
            <span>Settings</span>
          </button>

          {/* Direct Workstation Button */}
          <button
            id="btn-open-workstation"
            onClick={() => onOpenWorkstation("overview")}
            className="lg-btn lg-btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "7px 16px",
              borderRadius: "var(--glass-radius-pill)",
            }}
          >
            <LayoutGrid size={14} />
            <span>Open Workstation</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </header>

      {/* Settings Flyout Drawer / Modal */}
      {showSettings && (
        <div
          style={{
            position: "absolute",
            top: "84px",
            right: "40px",
            width: "320px",
            background: "var(--glass-tint-floating)",
            backdropFilter: "var(--glass-blur-xl)",
            border: "1px solid var(--glass-border-strong)",
            borderRadius: "var(--glass-radius-lg)",
            padding: "20px",
            boxShadow: "var(--glass-shadow-floating)",
            zIndex: 60,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--glass-text-bright)" }}>
              Preferences & Environment
            </span>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: "none", border: "none", color: "var(--glass-text-muted)", cursor: "pointer", fontSize: "16px" }}
            >
              ✕
            </button>
          </div>

          {/* Language Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--glass-text-secondary)", marginBottom: "6px" }}>
              <Globe size={13} /> SPOKEN & ORCHESTRATION LANGUAGE
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="glass-input lg-select"
              style={{ width: "100%", fontSize: "12px", padding: "6px 8px" }}
            >
              {languageOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Mode Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--glass-text-secondary)", marginBottom: "6px" }}>
              <Palette size={13} /> VISUAL DESIGN THEME (ALT + T)
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {(["obsidian-glass", "porcelain", "midnight-teal", "high-contrast"] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--glass-radius-sm)",
                    textAlign: "left",
                    fontSize: "12px",
                    background: theme === t ? "var(--glass-tint-active)" : "rgba(255, 255, 255, 0.04)",
                    border: theme === t ? "1px solid var(--glass-border-accent)" : "1px solid transparent",
                    color: theme === t ? "var(--glass-text-bright)" : "var(--glass-text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{themeLabels[t]}</span>
                  {theme === t && <span style={{ color: "var(--glass-accent-blue)" }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "var(--glass-text-muted)", lineHeight: 1.5, borderTop: "1px solid var(--glass-border-subtle)", paddingTop: "12px" }}>
            Acoustic Echo Cancellation (AEC) and Hands-Free V2 barge-in are actively enforced.
          </div>
        </div>
      )}

      {/* 2. Central Hero Stage with Particle Voice Orb */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          maxWidth: "760px",
          margin: "auto",
          zIndex: 5,
        }}
      >
        {/* Particle Sphere Orb */}
        <div style={{ marginBottom: "36px", position: "relative" }}>
          <TarkaParticleOrb
            state={voiceState}
            audioLevel={audioLevel}
            size={380}
            theme={theme}
            onClick={onActivateVoice}
          />

          {/* Quick Microphone Button Floating Under Orb */}
          <button
            id="btn-landing-mic"
            onClick={onActivateVoice}
            className="lg-btn"
            style={{
              position: "absolute",
              bottom: "-18px",
              left: "50%",
              transform: "translateX(-50%)",
              background: isVoiceActive ? "var(--glass-accent-blue)" : "var(--glass-tint-level-3)",
              color: isVoiceActive ? "#FFFFFF" : "var(--glass-text-bright)",
              borderRadius: "var(--glass-radius-pill)",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "var(--glass-shadow-floating)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid var(--glass-border-specular)",
            }}
          >
            {isVoiceActive ? <Mic size={16} /> : <MicOff size={16} />}
            <span>{isVoiceActive ? "Hands-Free Active" : "Start Conversation"}</span>
          </button>
        </div>

        {/* Primary Headline Instruction */}
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.5px",
            color: "var(--glass-text-bright)",
            margin: "0 0 10px 0",
          }}
        >
          Indigenous Multilingual Conversational Forensics
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "var(--glass-text-secondary)",
            lineHeight: 1.6,
            maxWidth: "580px",
            margin: "0 0 24px 0",
          }}
        >
          Speak naturally in Indian English, Tamil, Hindi, or Bengali. TARKA resolves mathematical contradictions using Z3 SMT logic and traces provenance directly down to raw bytes.
        </p>

        {/* Suggestion / Conversational Inquiry Chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px",
            maxWidth: "680px",
          }}
        >
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                onActivateVoice();
              }}
              style={{
                background: "var(--glass-tint-level-1)",
                border: "1px solid var(--glass-border-subtle)",
                borderRadius: "var(--glass-radius-pill)",
                color: "var(--glass-text-secondary)",
                padding: "6px 14px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--glass-text-bright)";
                e.currentTarget.style.borderColor = "var(--glass-border-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--glass-text-secondary)";
                e.currentTarget.style.borderColor = "var(--glass-border-subtle)";
              }}
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </main>

      {/* 3. Restrained Bottom Navigation / Telemetry Footer */}
      <footer
        style={{
          width: "100%",
          maxWidth: "1280px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--glass-border-subtle)",
          paddingTop: "20px",
          fontSize: "12px",
          color: "var(--glass-text-muted)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--glass-accent-emerald)" }} />
            <span>Z3 SMT Solver v4.12: Active</span>
          </span>
          <span>•</span>
          <span>Sarvam Saaras STT & Bulbul TTS</span>
          <span>•</span>
          <span>Hands-Free V2 Barge-in Active</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => onOpenWorkstation("reports")}
            style={{
              background: "none",
              border: "none",
              color: "var(--glass-text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FileText size={13} />
            <span>Reports Library ({reportCount})</span>
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenWorkstation("evidence")}
            style={{
              background: "none",
              border: "none",
              color: "var(--glass-text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Evidence Ledger</span>
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenWorkstation("system")}
            style={{
              background: "none",
              border: "none",
              color: "var(--glass-text-secondary)",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={13} />
            <span>System Health</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
