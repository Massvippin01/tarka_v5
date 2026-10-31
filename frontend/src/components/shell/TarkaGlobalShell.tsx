import React, { useState } from "react";
import {
  ScanLine,
  Radio,
  GitFork,
  Scale,
  Mic,
  Search,
  ChevronDown,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useTarkaGlobal, type TarkaRoute } from "../../context/TarkaGlobalContext";
import { LiveDemoSimulatorPopover } from "./LiveDemoSimulatorPopover";
import { IntakeScreen } from "../../pages/v5/IntakeScreen";
import { AttributionScreen } from "../../pages/v5/AttributionScreen";
import { TaintEngineScreen } from "../../pages/v5/TaintEngineScreen";
import { CourtProofScreen } from "../../pages/v5/CourtProofScreen";
import { SarvamVoiceModal } from "../tarka/SarvamVoiceModal";

export const TarkaGlobalShell: React.FC = () => {
  const {
    activeRoute,
    setActiveRoute,
    activeCaseId,
    timeOffsetHours,
    statutoryPeriod,
    mutations,
    toggleMutation,
  } = useTarkaGlobal();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 4 Main Taskforge-Style Navigation Items
  const navItems = [
    {
      id: "intake" as TarkaRoute,
      label: "1. Evidence Overview",
      icon: ScanLine,
    },
    {
      id: "attribution" as TarkaRoute,
      label: "2. CGNAT Attribution",
      icon: Radio,
    },
    {
      id: "taint-engine" as TarkaRoute,
      label: "3. Taint & Lien Flow",
      icon: GitFork,
    },
    {
      id: "court-proof" as TarkaRoute,
      label: "4. Court Proof Bundle",
      icon: Scale,
    },
  ];

  // Route Titles & Subtitles matching Taskforge
  const routeMeta: Record<TarkaRoute, { title: string; subtitle: string }> = {
    intake: {
      title: "Evidence & Ledger Overview",
      subtitle: `${activeCaseId} · Welcome back, Insp. Vikram! Here's your forensic intake overview.`,
    },
    attribution: {
      title: "IP & Phone Attribution",
      subtitle: `${activeCaseId} · CGNAT Candidate Funnel · IMEI Twin & Z3 Clock Synchronization.`,
    },
    "taint-engine": {
      title: "Taint & Lien Flow",
      subtitle: `${activeCaseId} · Time-Expanded DAG · Dinic Min-Cut & BNSS § 106 Targeted Freezes.`,
    },
    "court-proof": {
      title: "Court Proof & Legal Dossier",
      subtitle: `${activeCaseId} · BSA § 63(4) Certificates · BIP-39 Paper Anchor & CBI Syndicate Aggregation.`,
    },
    workstation: {
      title: "Forensic Workstation",
      subtitle: `${activeCaseId} · Complete Digital Evidence Workbench.`,
    },
    workflow: {
      title: "Investigation Workflow",
      subtitle: `${activeCaseId} · Multi-Agency Escalation & Timeline.`,
    },
  };

  const currentMeta = routeMeta[activeRoute] || routeMeta.intake;

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        background: "#050807",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16, 185, 129, 0.12), transparent 70%)",
        color: "#F8FAFC",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* =========================================================================
          1. LEFT SIDEBAR (220PX FIXED WIDTH, BORDERLESS ON #050807)
          ========================================================================= */}
      <aside
        style={{
          width: "220px",
          height: "100%",
          background: "#050807",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px 14px",
          boxSizing: "border-box",
          flexShrink: 0,
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          zIndex: 50,
        }}
      >
        {/* Top: Brand Header & Nav List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Brand: Clean white title TARKA with subtle emerald dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "12px" }}>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
              }}
            >
              TARKA
            </span>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 8px #10B981",
                display: "inline-block",
                marginTop: "2px",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#71717A",
                marginLeft: "2px",
              }}
            >
              v5.0
            </span>
          </div>

          {/* Navigation Items (Airy, Taskforge Style with Glowing 3px Left Indicator) */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => {
              const isActive = activeRoute === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRoute(item.id)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "11px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: isActive ? "rgba(16, 185, 129, 0.08)" : "transparent",
                    color: isActive ? "#FFFFFF" : "#71717A",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 500,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#D4D4D8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#71717A";
                  }}
                >
                  {/* Active 3px glowing Emerald vertical indicator bar on left edge */}
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "15%",
                        bottom: "15%",
                        width: "3px",
                        borderRadius: "0 3px 3px 0",
                        background: "#10B981",
                        boxShadow: "0 0 10px #10B981",
                      }}
                    />
                  )}

                  <Icon
                    size={16}
                    color={isActive ? "#10B981" : "#71717A"}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Subtle Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(255, 255, 255, 0.05)",
                margin: "12px 6px",
              }}
            />

            {/* Secondary Utility Links */}
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "transparent",
                color: "#71717A",
                fontSize: "12.5px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#D4D4D8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#71717A")}
            >
              <Mic size={15} color="#71717A" />
              <span>Sarvam Voice AI</span>
            </button>
          </nav>
        </div>

        {/* Bottom User Profile Card (Taskforge Alex Johnson Style) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: "12px",
            background: "#0C1310",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #006b46 0%, #10B981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
              }}
            >
              VS
            </div>
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#FFFFFF" }}>
                Insp. Vikram
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#10B981",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>CBI Cyber</span>
                <span style={{ color: "#71717A" }}>·</span>
                <span style={{ color: "#34D399" }}>ISO 17025</span>
              </div>
            </div>
          </div>
          <ChevronDown size={13} color="#71717A" />
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA (68PX HEADER + WORKSPACE CANVAS)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* TOP HEADER BAR (68PX HEIGHT, #050807 TRANSPARENT) */}
        <header
          style={{
            height: "68px",
            padding: "0 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            background: "transparent",
            boxSizing: "border-box",
            zIndex: 40,
          }}
        >
          {/* Left: Page Title (22px bold #FFFFFF) + Subtitle (13px #71717A) */}
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {currentMeta.title}
            </h1>
            <p
              style={{
                fontSize: "12.5px",
                fontWeight: 500,
                color: "#71717A",
                margin: "2px 0 0 0",
              }}
            >
              {currentMeta.subtitle}
            </p>
          </div>

          {/* Right: Search Input + Tamper Toggle Pill + Golden Hour Pill + Profile Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Dark Pill Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#0C1310",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "999px",
                padding: "6px 14px",
                width: "250px",
                boxSizing: "border-box",
              }}
            >
              <Search size={13} color="#71717A" strokeWidth={2.2} />
              <input
                type="text"
                placeholder="Search RRN, UTR, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  color: "#FFFFFF",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Live Demo Simulator Popover */}
            <LiveDemoSimulatorPopover />

            {/* Interactive [⚡ Tamper Row #14] Toggle Pill Button */}
            <button
              type="button"
              onClick={() => toggleMutation("alterBankRow14")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: mutations.alterBankRow14
                  ? "rgba(239, 68, 68, 0.16)"
                  : "rgba(16, 185, 129, 0.10)",
                border: mutations.alterBankRow14
                  ? "1px solid rgba(239, 68, 68, 0.35)"
                  : "1px solid rgba(16, 185, 129, 0.25)",
                color: mutations.alterBankRow14 ? "#F87171" : "#10B981",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Toggle Row #14 ledger falsification (+₹2.00L dispute)"
            >
              <Zap size={13} color={mutations.alterBankRow14 ? "#EF4444" : "#10B981"} />
              <span>
                {mutations.alterBankRow14 ? "Row #14 Tampered 🚨" : "Tamper Row #14"}
              </span>
            </button>

            {/* [T+2.5h Golden Hour ▾] Dropdown Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "#0C1310",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "12px",
                color: "#E2E8F0",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background:
                    statutoryPeriod.code === "GOLDEN_HOUR" ? "#EF4444" : "#10B981",
                  boxShadow:
                    statutoryPeriod.code === "GOLDEN_HOUR"
                      ? "0 0 6px #EF4444"
                      : "0 0 6px #10B981",
                }}
              />
              <span style={{ fontWeight: 600 }}>T+{timeOffsetHours.toFixed(1)}h</span>
              <span style={{ color: "#71717A" }}>·</span>
              <span style={{ color: "#8E9893" }}>{statutoryPeriod.label}</span>
              <ChevronDown size={12} color="#71717A" />
            </div>

            {/* Inspector Avatar & ISO Tag */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 8px",
                borderRadius: "999px",
                background: "#0C1310",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #006b46 0%, #10B981 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                VS
              </div>
              <ShieldCheck size={14} color="#10B981" />
            </div>
          </div>
        </header>

        {/* WORKSPACE VIEWPORT (FITS ALL 3 ROWS CLEANLY WITH ZERO SQUISHING) */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "20px 28px 36px 28px",
            boxSizing: "border-box",
            background: "transparent",
          }}
        >
          {activeRoute === "intake" && <IntakeScreen />}
          {activeRoute === "attribution" && <AttributionScreen />}
          {activeRoute === "taint-engine" && <TaintEngineScreen />}
          {activeRoute === "court-proof" && <CourtProofScreen />}
          {(activeRoute === "workstation" || activeRoute === "workflow") && <IntakeScreen />}
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

export default TarkaGlobalShell;
