import React, { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  Zap,
  RotateCcw,
  Mic,
  FileDown,
  ChevronDown,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  Maximize2,
  Minimize2,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { useTarkaGlobal, type TarkaRoute } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { ReuiStatusBadge } from "../tarka/BentoPrimitives";
import { IntakeScreen } from "../../pages/v5/IntakeScreen";
import { AttributionScreen } from "../../pages/v5/AttributionScreen";
import { TaintEngineScreen } from "../../pages/v5/TaintEngineScreen";
import { CourtProofScreen } from "../../pages/v5/CourtProofScreen";
import { SarvamVoiceModal } from "../tarka/SarvamVoiceModal";
import { TarkaCommandPalette } from "../tarka/TarkaCommandPalette";

export const TarkaGlobalShell: React.FC = () => {
  const {
    activeRoute,
    setActiveRoute,
    timeOffsetHours,
    setTimeOffsetHours,
    mutations,
    toggleMutation,
    resetAllMutations,
    activeMutationsCount,
    intakeGate,
  } = useTarkaGlobal();

  const {
    sidebarCollapsed,
    toggleSidebar,
    presentationMode,
    togglePresentationMode,
    density,
    setDensity,
  } = useTarkaUiStore();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);
  const [mutatorRibbonOpen, setMutatorRibbonOpen] = useState<boolean>(false);
  const [isHoverPeeking, setIsHoverPeeking] = useState<boolean>(false);

  // Global Ctrl+B (sidebar) and F (presentation mode) shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.key === "b" || e.key === "B") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleSidebar();
      } else if ((e.key === "f" || e.key === "F") && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        togglePresentationMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, togglePresentationMode]);

  // 4 Core Pipeline Navigation Items
  const navItems = [
    {
      id: "intake" as TarkaRoute,
      step: "01",
      title: "Evidence Intake & Ledger Falsification",
      shortTitle: "Evidence Intake",
      subtitle: "Ledger & PDF Integrity",
      badgeText: mutations.alterBankRow14 ? "Fail" : "2",
      badgeVariant: mutations.alterBankRow14 ? ("rose" as const) : ("rose" as const),
      tooltip: "2 open flags (Row #14 Extortion Debit + Canva PDF Trailer)",
      isLocked: false,
    },
    {
      id: "attribution" as TarkaRoute,
      step: "02",
      title: "CGNAT Attribution & Hardware Twin",
      shortTitle: "CGNAT Attribution",
      subtitle: "Port Funnel & IMEI Twin",
      badgeText: "✓",
      badgeVariant: "emerald" as const,
      tooltip: intakeGate?.isHalted
        ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)"
        : "CGNAT & Hardware Twin Attribution",
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "taint-engine" as TarkaRoute,
      step: "03",
      title: "Taint DAG & BNSS Liens",
      shortTitle: "Taint & BNSS Liens",
      subtitle: "Dinic Min-Cut & §106",
      badgeText: "K=3",
      badgeVariant: "indigo" as const,
      tooltip: intakeGate?.isHalted
        ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)"
        : "Taint DAG & BNSS Lien Requisition",
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "court-proof" as TarkaRoute,
      step: "04",
      title: "BSA § 63(4) Court Proof Dossier",
      shortTitle: "Court Proof Dossier",
      subtitle: "BSA §63(4) & CBI Memo",
      badgeText: "OK",
      badgeVariant: "emerald" as const,
      tooltip: intakeGate?.isHalted
        ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)"
        : "Section 63(4) BSA Court Admissibility Bundle",
      isLocked: intakeGate?.isHalted,
    },
  ];

  // Ingested File Tree Artifacts
  const ingestedFiles = [
    { name: "sbi_finacle_cbs.csv", tier: "T1", status: "emerald" as const, desc: "Finacle 10.x HSM Signed" },
    { name: "victim_upi_receipt.pdf", tier: "T3", status: "rose" as const, desc: "XRef Incremental Canva Edit" },
    { name: "npci_switch_raw.xml", tier: "T1", status: "emerald" as const, desc: "Central UPI Gateway Log" },
    { name: "airtel_cgnat_ipdr.csv", tier: "T1", status: "emerald" as const, desc: "9,996 Citizens Masked" },
    { name: "whatsapp_chat.txt", tier: "T3", status: "amber" as const, desc: "Uncertified Extortion Chat" },
  ];

  // Operational Clock Stepper Stages
  const clockStages = [
    { label: "T+0m", offset: 0, title: "FIR Ingestion" },
    { label: "T+15m", offset: 0.25, title: "L1 Mule Freeze" },
    { label: "T+2.5h Lien", offset: 2.5, title: "Golden Hour SOP" },
    { label: "T+48h Court", offset: 48, title: "Sec 107 BNSS Filing" },
  ];

  const currentNav = navItems.find((n) => n.id === activeRoute) || navItems[0];

  const handlePrintPdf = () => {
    window.print();
  };

  // Determine effective sidebar state (56px collapsed vs 232px expanded/peeking)
  const isExpanded = !sidebarCollapsed || isHoverPeeking;

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        background: "var(--reui-frame-bg, #F4F4F5)",
        padding: "6px",
        gap: "6px",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
      }}
    >
      <TarkaCommandPalette />

      {/* =========================================================================
          1. SHADCN-STYLE COLLAPSIBLE SIDEBAR RAIL (56PX DEFAULT / 232PX EXPANDED)
          ========================================================================= */}
      {!presentationMode && (
        <aside
          onMouseEnter={() => {
            if (sidebarCollapsed) setIsHoverPeeking(true);
          }}
          onMouseLeave={() => {
            if (sidebarCollapsed) setIsHoverPeeking(false);
          }}
          style={{
            width: `${isExpanded ? 232 : 56}px`,
            minWidth: `${isExpanded ? 232 : 56}px`,
            maxWidth: `${isExpanded ? 232 : 56}px`,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "8px 6px",
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            boxShadow: isHoverPeeking ? "0 10px 25px -5px rgba(15, 23, 42, 0.1)" : "0 1px 3px rgba(0,0,0,0.02)",
            position: isHoverPeeking ? "absolute" : "relative",
            zIndex: isHoverPeeking ? 100 : 10,
            transition: "width 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {/* Top: Brand, Case Popover & Engine Nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Brand Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: isExpanded ? "space-between" : "center", padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "7px",
                    background: "#4F46E5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <Shield size={16} strokeWidth={2.4} />
                </div>
                {isExpanded && (
                  <span style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.03em", color: "#09090B" }}>
                    TARKA
                  </span>
                )}
              </div>
              {isExpanded && <ReuiStatusBadge text="v5.0 BSA § 63" variant="indigo" dot={false} />}
            </div>

            {/* Case Combobox / Popover */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  title="FIR #149/2026 · Noida Cyber Crime PS · Digital Arrest Extortion (₹2.15L)"
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    padding: isExpanded ? "6px 8px" : "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isExpanded ? "space-between" : "center",
                    cursor: "pointer",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {isExpanded ? (
                    <div style={{ textAlign: "left", minWidth: 0, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "9.5px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#4F46E5", background: "#EEF2FF", padding: "1px 4px", borderRadius: "3px" }}>
                          FIR #149/2026
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#64748B" }}>Noida</span>
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#09090B", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Digital Arrest (₹2.15L)
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#4F46E5" }}>
                      149
                    </span>
                  )}
                  {isExpanded && <ChevronDown size={12} color="#71717A" />}
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  side="right"
                  align="start"
                  sideOffset={8}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)",
                    width: "280px",
                    zIndex: 9999,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#4338CA", background: "#EEF2FF", padding: "2px 6px", borderRadius: "4px" }}>
                        FIR #149/2026
                      </span>
                      <ReuiStatusBadge text="ACTIVE CASE" variant="emerald" dot={true} />
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#09090B" }}>
                      Digital Arrest Extortion (₹2.15L)
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B", lineHeight: 1.3 }}>
                      Noida Cyber Crime Police Station · Complainant: Sunil Kumar · Incident: 22-09-2026
                    </div>
                  </div>
                  <Popover.Arrow style={{ fill: "#FFFFFF" }} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Navigation Engines */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {navItems.map((item) => {
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveRoute(item.id)}
                    title={`${item.step} ${item.shortTitle} — ${item.subtitle}`}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: isExpanded ? "space-between" : "center",
                      padding: isExpanded ? "7px 9px" : "8px 0",
                      borderRadius: "8px",
                      background: isActive ? "#F1F5F9" : "transparent",
                      border: isActive ? "1px solid #E2E8F0" : "1px solid transparent",
                      color: "#09090B",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          left: "0px",
                          top: "20%",
                          bottom: "20%",
                          width: "3px",
                          borderRadius: "0 3px 3px 0",
                          background: "#4F46E5",
                        }}
                      />
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          color: isActive ? "#4338CA" : "#64748B",
                          background: isActive ? "#EEF2FF" : "#F8FAFC",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: `1px solid ${isActive ? "#C7D2FE" : "#E2E8F0"}`,
                          flexShrink: 0,
                        }}
                      >
                        {item.step}
                      </span>
                      {isExpanded && (
                        <div style={{ minWidth: 0, overflow: "hidden" }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? "#09090B" : "#475569",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.shortTitle}
                          </div>
                          <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                            {item.subtitle}
                          </div>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                        {item.isLocked && <Lock size={12} color="#E11D48" />}
                        <ReuiStatusBadge text={item.badgeText} variant={item.badgeVariant} dot={false} />
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Artifacts Tree Popover Button */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  title="Inspect Ingested Artifact Tree (T1/T2/T3 Tiers)"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isExpanded ? "flex-start" : "center",
                    gap: "8px",
                    padding: isExpanded ? "6px 8px" : "8px 0",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    background: "#F8FAFC",
                    color: "#334155",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <FolderTree size={14} color="#64748B" />
                  {isExpanded && <span>Artifact Tree (5)</span>}
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  side="right"
                  align="center"
                  sideOffset={8}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)",
                    width: "280px",
                    zIndex: 9999,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#09090B", marginBottom: "6px" }}>
                    Ingested Artifact Tree (T1–T3 Tiers)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {ingestedFiles.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "3px 5px",
                          borderRadius: "4px",
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          fontSize: "10.5px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                          <FileText size={11} color="#64748B" />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {f.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 700,
                            padding: "0.5px 4px",
                            borderRadius: "3px",
                            background: f.status === "emerald" ? "#ECFDF5" : f.status === "rose" ? "#FFF1F2" : "#FFFBEB",
                            color: f.status === "emerald" ? "#047857" : f.status === "rose" ? "#BE123C" : "#92400E",
                          }}
                        >
                          {f.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Popover.Arrow style={{ fill: "#FFFFFF" }} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          {/* Bottom Sidebar: Z3 Solver Telemetry, IO Avatar, and Collapse Toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "8px" }}>
            {/* Z3 Status Dot & Tooltip */}
            <div
              title="Z3 SMT Solver: ONLINE 3.8 ms · CAS SHA-256 Chain INTACT"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "space-between" : "center",
                padding: "4px",
                background: "#F8FAFC",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
                fontSize: "10px",
                cursor: "help",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                {isExpanded && <span style={{ fontWeight: 700, color: "#09090B" }}>Z3 SMT</span>}
              </div>
              {isExpanded && (
                <span style={{ fontFamily: "var(--font-mono)", color: "#047857", fontWeight: 700, fontSize: "9px" }}>
                  3.8ms
                </span>
              )}
            </div>

            {/* IO Avatar (Tooltip: name + role) */}
            <div
              title="Insp. Vikram Sharma · Investigating Officer (IO)"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "flex-start" : "center",
                gap: "8px",
                padding: "2px 4px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "#4338CA",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                VS
              </div>
              {isExpanded && (
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#09090B", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Insp. Vikram Sharma
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>Investigating Officer</div>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={`Toggle Sidebar Rail (Ctrl+B) — Currently ${sidebarCollapsed ? "Collapsed (56px)" : "Expanded (232px)"}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "5px",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                color: "#64748B",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 600,
                width: "100%",
              }}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
              {isExpanded && <span>Collapse (Ctrl+B)</span>}
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================================
          2. MAIN WORKSPACE CONTAINER (HEADER + FLUID CONTENT ROOT)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
        }}
      >
        {/* TOP COMMAND HEADER (STRICT 48PX SINGLE-LINE, ZERO WRAPPING) */}
        <header
          style={{
            height: "44px",
            minHeight: "44px",
            maxHeight: "44px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          {/* Left: Breadcrumb FIR #149/2026 / Engine Title + Z3 Verified */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#64748B" }}>
              FIR #149/2026
            </span>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#09090B", letterSpacing: "-0.01em" }}>
              {currentNav.title}
            </span>
            <ReuiStatusBadge text="Z3 Verified" variant="emerald" />
          </div>

          {/* Center: Operational Clock Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "2px",
              flexShrink: 0,
            }}
          >
            {clockStages.map((stg, idx) => {
              const isCurrent = Math.abs(timeOffsetHours - stg.offset) < 0.5;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTimeOffsetHours(stg.offset)}
                  style={{
                    border: "none",
                    background: isCurrent ? "#FFFFFF" : "transparent",
                    color: isCurrent ? "#09090B" : "#64748B",
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: "11px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    boxShadow: isCurrent ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={stg.title}
                >
                  {isCurrent && (
                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#4F46E5" }} />
                  )}
                  <span>{stg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Header Controls: [Density Slider] · [⚡ Mutator] · [🎙️ Voice AI] · [⬇ Export §63 PDF] */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {/* View Density Slide Toggle: Standard vs Short / Small View */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#E2E8F0",
                border: "1px solid #CBD5E1",
                borderRadius: "20px",
                padding: "2px",
                height: "28px",
                boxSizing: "border-box",
                position: "relative",
                userSelect: "none",
                cursor: "pointer",
              }}
              role="radiogroup"
              aria-label="Dashboard View Density"
            >
              {/* Sliding Background Indicator Pill */}
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  bottom: "2px",
                  left: density === "comfortable" ? "2px" : "calc(50% + 1px)",
                  width: "calc(50% - 3px)",
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.08)",
                  transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              />

              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                role="radio"
                aria-checked={density === "comfortable"}
                title="Standard Comfortable View"
                style={{
                  border: "none",
                  background: "transparent",
                  color: density === "comfortable" ? "#0F172A" : "#64748B",
                  fontWeight: density === "comfortable" ? 700 : 500,
                  fontSize: "10.5px",
                  padding: "2px 8px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  position: "relative",
                  zIndex: 2,
                  transition: "color 0.18s ease",
                }}
              >
                <Maximize2 size={10} color={density === "comfortable" ? "#4F46E5" : "#64748B"} />
                <span>Standard</span>
              </button>

              <button
                type="button"
                onClick={() => setDensity("compact")}
                role="radio"
                aria-checked={density === "compact"}
                title="Short / Small Dashboard View"
                style={{
                  border: "none",
                  background: "transparent",
                  color: density === "compact" ? "#0F172A" : "#64748B",
                  fontWeight: density === "compact" ? 700 : 500,
                  fontSize: "10.5px",
                  padding: "2px 8px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  position: "relative",
                  zIndex: 2,
                  transition: "color 0.18s ease",
                }}
              >
                <Minimize2 size={10} color={density === "compact" ? "#4F46E5" : "#64748B"} />
                <span>Small View</span>
              </button>
            </div>

            {/* Live Judge Mutator Button */}
            <button
              type="button"
              onClick={() => setMutatorRibbonOpen((prev) => !prev)}
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: activeMutationsCount > 0 ? "#FFF1F2" : "#F8FAFC",
                border: activeMutationsCount > 0 ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                color: activeMutationsCount > 0 ? "#BE123C" : "#334155",
                fontWeight: 600,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 9px",
                cursor: "pointer",
              }}
            >
              <Zap size={11} color={activeMutationsCount > 0 ? "#E11D48" : "#64748B"} />
              <span>Mutator ({activeMutationsCount})</span>
              <ChevronDown size={11} />
            </button>

            {/* Voice AI */}
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                color: "#334155",
                fontWeight: 600,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 8px",
                cursor: "pointer",
              }}
            >
              <Mic size={11} color="#64748B" />
              <span>Voice AI</span>
            </button>

            {/* Export §63 PDF */}
            <button
              type="button"
              disabled={intakeGate?.isHalted}
              onClick={handlePrintPdf}
              title={
                intakeGate?.isHalted
                  ? "Export disabled: Falsification Gate halted downstream admissibility"
                  : "Generate & Export §63(4) BSA Evidence Certificate"
              }
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: intakeGate?.isHalted ? "#F1F5F9" : "#0F172A",
                color: intakeGate?.isHalted ? "#94A3B8" : "#FFFFFF",
                border: "1px solid transparent",
                fontWeight: 600,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 10px",
                cursor: intakeGate?.isHalted ? "not-allowed" : "pointer",
                boxShadow: intakeGate?.isHalted ? "none" : "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              <FileDown size={11} />
              <span>Export §63 PDF</span>
            </button>
          </div>
        </header>

        {/* Mutator Ribbon Drawer */}
        {mutatorRibbonOpen && (
          <div
            style={{
              background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              fontSize: "11px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "#0F172A" }}>Live Judge Falsification Mutators:</span>
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: mutations.alterBankRow14 ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                  background: mutations.alterBankRow14 ? "#FFF1F2" : "#FFFFFF",
                  color: mutations.alterBankRow14 ? "#BE123C" : "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Zap size={11} color={mutations.alterBankRow14 ? "#E11D48" : "#64748B"} />
                <span>{mutations.alterBankRow14 ? "Row #14 Tampered (-₹2.00L)" : "Alter Bank Row #14"}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleMutation("forgeRrnTimestamp")}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: mutations.forgeRrnTimestamp ? "1px solid #FECDD3" : "1px solid #E2E8F0",
                  background: mutations.forgeRrnTimestamp ? "#FFF1F2" : "#FFFFFF",
                  color: mutations.forgeRrnTimestamp ? "#BE123C" : "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {mutations.forgeRrnTimestamp ? "RRN Skew Active (+50m)" : "Forge RRN Clock Skew"}
              </button>
            </div>

            <button
              type="button"
              onClick={resetAllMutations}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                cursor: "pointer",
                fontSize: "10.5px",
              }}
            >
              <RotateCcw size={10} />
              <span>Reset Clean</span>
            </button>
          </div>
        )}

        {/* WORKSPACE CONTENT BODY */}
        <div
          id="tarka-workspace-body"
          className={density === "compact" ? "tarka-density-compact" : "tarka-density-comfortable"}
          style={{
            flex: "1 1 0%",
            overflowY: "auto",
            overflowX: "hidden",
            position: "relative",
            minHeight: 0,
            minWidth: 0,
            height: "100%",
          }}
        >
          {activeRoute === "intake" && <IntakeScreen />}
          {activeRoute === "attribution" && <AttributionScreen />}
          {activeRoute === "taint-engine" && <TaintEngineScreen />}
          {activeRoute === "court-proof" && <CourtProofScreen />}
        </div>
      </div>

      {/* Voice Assistant Modal */}
      {voiceOpen && (
        <SarvamVoiceModal
          caseId="CASE-2026-001"
          isOpen={voiceOpen}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
};
