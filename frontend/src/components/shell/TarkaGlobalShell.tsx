import React, { useState } from "react";
import {
  Shield,
  FileText,
  Zap,
  RotateCcw,
  Mic,
  FileDown,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useTarkaGlobal, type TarkaRoute } from "../../context/TarkaGlobalContext";
import { ReuiStatusBadge } from "../tarka/BentoPrimitives";
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
    setTimeOffsetHours,
    mutations,
    toggleMutation,
    resetAllMutations,
    activeMutationsCount,
    intakeGate,
  } = useTarkaGlobal();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);
  const [mutatorRibbonOpen, setMutatorRibbonOpen] = useState<boolean>(false);

  // 4 Core Pipeline Navigation Items (RULE 2 & DEFECT D9/F: Non-truncating + Gate Lock)
  const navItems = [
    {
      id: "intake" as TarkaRoute,
      step: "01",
      title: "Evidence Intake",
      subtitle: "Ledger & PDF Integrity",
      badgeText: mutations.alterBankRow14 ? "Fail" : "2",
      badgeVariant: mutations.alterBankRow14 ? ("rose" as const) : ("rose" as const),
      tooltip: "2 open flags (Row #14 Extortion Debit + Canva PDF Trailer)",
      isLocked: false,
    },
    {
      id: "attribution" as TarkaRoute,
      step: "02",
      title: "CGNAT Attribution",
      subtitle: "Port Funnel & IMEI Twin",
      badgeText: "✓",
      badgeVariant: "emerald" as const,
      tooltip: intakeGate?.isHalted ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)" : "CGNAT & Hardware Twin Attribution",
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "taint-engine" as TarkaRoute,
      step: "03",
      title: "Taint & BNSS Liens",
      subtitle: "Dinic Min-Cut & §106",
      badgeText: "K=3",
      badgeVariant: "indigo" as const,
      tooltip: intakeGate?.isHalted ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)" : "Taint DAG & BNSS Lien Requisition",
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "court-proof" as TarkaRoute,
      step: "04",
      title: "Court Proof Dossier",
      subtitle: "BSA §63(4) & CBI Memo",
      badgeText: "OK",
      badgeVariant: "emerald" as const,
      tooltip: intakeGate?.isHalted ? "Engine locked: Halted at Falsification Gate (Falsify before Attribute)" : "Section 63(4) BSA Court Admissibility Bundle",
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

  // Operational Clock Stepper Stages (RULE 1: Compact Single-Line Labels)
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

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        background: "var(--reui-frame-bg, #F4F4F5)",
        padding: "8px",
        gap: "8px",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
      }}
    >
      {/* =========================================================================
          1. LEFT SIDEBAR (256PX WIDTH, NATIVE ON #F4F4F5)
          ========================================================================= */}
      <aside
        style={{
          width: "256px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "6px 4px 6px 6px",
        }}
      >
        {/* Top: Brand, Case Combobox & Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Brand Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "7px",
                  background: "#4F46E5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(79, 70, 229, 0.3)",
                }}
              >
                <Shield size={15} strokeWidth={2.4} />
              </div>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#09090B",
                }}
              >
                TARKA
              </span>
            </div>
            <ReuiStatusBadge text="v5.0 BSA § 63" variant="indigo" dot={false} />
          </div>

          {/* ReUI Case Combobox Button (D9: 1-line FIR chip + Title, zero wrapping) */}
          <div
            title="FIR #149/2026 · Noida Cyber Crime Police Station · Digital Arrest Extortion Case"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E4E7",
              borderRadius: "10px",
              padding: "8px 10px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#4F46E5", background: "#EEF2FF", padding: "1px 5px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                  FIR #149/2026
                </span>
                <span style={{ fontSize: "10.5px", color: "#71717A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Noida Cyber
                </span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#09090B", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Digital Arrest Extortion (₹2.15L)
              </div>
            </div>
            <ChevronDown size={14} color="#71717A" style={{ flexShrink: 0 }} />
          </div>

          {/* Section 1: INVESTIGATION ENGINES */}
          <div>
            <div
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#71717A",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "0 8px 6px 8px",
              }}
            >
              Investigation Engines
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {navItems.map((item) => {
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveRoute(item.id)}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: isActive ? "#FFFFFF" : "transparent",
                      border: isActive ? "1px solid #E4E4E7" : "1px solid transparent",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
                      color: "#09090B",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {/* Active Left Indicator Bar */}
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
                          fontSize: "10.5px",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: isActive ? "#4F46E5" : "#71717A",
                          background: isActive ? "#EEF2FF" : "rgba(0,0,0,0.04)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {item.step}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "#09090B" : "#52525B",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ fontSize: "10px", color: "#71717A", marginTop: "1px" }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                      {item.isLocked && <Lock size={12} color="#94A3B8" />}
                      <span title={item.tooltip}>
                        <ReuiStatusBadge text={item.badgeText} variant={item.badgeVariant} dot={false} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Section 2: INGESTED ARTIFACT TREE (ReUI File Tree) */}
          <div>
            <div
              title="Tier-1 = Certified Bank Core/Switch/Telecom IPDR Gateway; Tier-2 = Corroborative; Tier-3 = Complainant Device Extraction"
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#71717A",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "0 8px 6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "help",
              }}
            >
              <span>Ingested Artifact Tree</span>
              <span style={{ fontSize: "9px", color: "#94A3B8", fontWeight: 700 }}>T1–T3 Tiers</span>
            </div>

            <div
              style={{
                marginLeft: "8px",
                paddingLeft: "8px",
                borderLeft: "1px solid #D4D4D8",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {ingestedFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    padding: "3px 4px",
                    borderRadius: "6px",
                    color: "#3F3F46",
                  }}
                  title={f.desc}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                    <FileText size={12} color="#71717A" />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {f.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      background: f.status === "emerald" ? "#ECFDF5" : f.status === "rose" ? "#FFF1F2" : "#FFFBEB",
                      color: f.status === "emerald" ? "#065F46" : f.status === "rose" ? "#9F1239" : "#92400E",
                      border: `1px solid ${f.status === "emerald" ? "#A7F3D0" : f.status === "rose" ? "#FECDD3" : "#FDE68A"}`,
                    }}
                  >
                    {f.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar Footer: Examiner & Solver Telemetry */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E4E7",
            borderRadius: "10px",
            padding: "9px 10px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#09090B" }}>Z3 SMT Solver</span>
            </div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#10B981", fontWeight: 600 }}>
              ONLINE (3.8ms)
            </span>
          </div>

          <div style={{ fontSize: "10px", color: "#71717A" }}>
            CAS SHA-256 Chain: <strong style={{ color: "#065F46" }}>INTACT</strong>
          </div>

          <div
            style={{
              borderTop: "1px solid #F4F4F5",
              paddingTop: "6px",
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#09090B" }}>
                Insp. Vikram Sharma
              </div>
              <div style={{ fontSize: "9.5px", color: "#71717A" }}>
                Investigating Officer (IO)
              </div>
            </div>
            <ReuiStatusBadge text="ISO 17025" variant="emerald" dot={false} />
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN INSET WORKSPACE FRAME (#FAFAFA CANVAS WITH #FFFFFF INNER CARDS)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          background: "var(--reui-canvas-bg, #FAFAFA)",
          border: "1px solid var(--reui-border-strong, #E4E4E7)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          minWidth: 0,
          height: "100%",
        }}
      >
        {/* TOP COMMAND HEADER (RULE 1: STRICT 52PX SINGLE-LINE, ZERO WRAPPING) */}
        <header
          style={{
            height: "52px",
            minHeight: "52px",
            maxHeight: "52px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E4E4E7",
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxSizing: "border-box",
            zIndex: 30,
            whiteSpace: "nowrap",
          }}
        >
          {/* Left: Breadcrumb FIR #149/2026 / Evidence Intake + compact badge ● Z3 Verified */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#71717A", whiteSpace: "nowrap" }}>
              FIR #149/2026
            </span>
            <span style={{ color: "#D4D4D8" }}>/</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#09090B", whiteSpace: "nowrap" }}>
              {currentNav.title}
            </span>
            <ReuiStatusBadge text="Z3 Verified" variant="emerald" />
          </div>

          {/* Center (Segmented Pill Bar): T+0m | T+15m | T+2.5h Lien | T+48h Court */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "#F4F4F5",
              border: "1px solid #E4E4E7",
              borderRadius: "8px",
              padding: "2px 3px",
              flexShrink: 0,
              whiteSpace: "nowrap",
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
                    color: isCurrent ? "#09090B" : "#71717A",
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: isCurrent ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                  title={stg.title}
                >
                  {isCurrent && (
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4F46E5", flexShrink: 0 }} />
                  )}
                  <span>{stg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Header Actions: [⚡ Mutator (N)] · [🎙️ Voice AI] · [⬇ Export §63 PDF] */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {/* Live Judge Mutator Button */}
            <button
              type="button"
              onClick={() => setMutatorRibbonOpen((prev) => !prev)}
              style={{
                height: "32px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: activeMutationsCount > 0 ? "#FFF1F2" : "#F4F4F5",
                border: activeMutationsCount > 0 ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                color: activeMutationsCount > 0 ? "#9F1239" : "#3F3F46",
                fontWeight: 600,
                fontSize: "12px",
                borderRadius: "8px",
                padding: "0 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Zap size={13} color={activeMutationsCount > 0 ? "#F43F5E" : "#71717A"} />
              <span>⚡ Mutator ({activeMutationsCount})</span>
              <ChevronDown
                size={12}
                style={{
                  transform: mutatorRibbonOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              />
            </button>

            {/* Sarvam Voice AI Button */}
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              style={{
                height: "32px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#F4F4F5",
                border: "1px solid #E4E4E7",
                color: "#3F3F46",
                fontWeight: 600,
                fontSize: "12px",
                borderRadius: "8px",
                padding: "0 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Mic size={13} color="#4F46E5" />
              <span>🎙️ Voice AI</span>
            </button>

            {/* Export Section 63(4) PDF Button */}
            <button
              type="button"
              disabled={intakeGate?.isHalted}
              onClick={intakeGate?.isHalted ? undefined : handlePrintPdf}
              title={
                intakeGate?.isHalted
                  ? "Export disabled: Evidence pipeline halted at Falsification Gate (Falsify before Attribute)"
                  : "Export Section 63(4) Forensic Certificate PDF"
              }
              style={{
                height: "32px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#09090B",
                border: "1px solid #09090B",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "12px",
                borderRadius: "8px",
                padding: "0 12px",
                cursor: intakeGate?.isHalted ? "not-allowed" : "pointer",
                opacity: intakeGate?.isHalted ? 0.45 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                whiteSpace: "nowrap",
                transition: "opacity 0.15s ease",
              }}
            >
              <FileDown size={13} />
              <span>⬇ Export §63 PDF</span>
            </button>
          </div>
        </header>

        {/* REUI HORIZONTAL MUTATOR RIBBON (SLIDES OUT DIRECTLY BELOW HEADER) */}
        {mutatorRibbonOpen && (
          <div
            style={{
              background: "#FFFFFF",
              borderBottom: "1px solid #E4E4E7",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#71717A", textTransform: "uppercase" }}>
                6 Forensic Invariant Injections:
              </span>

              {/* 1. Tamper Row #14 Balance */}
              <button
                type="button"
                onClick={() => toggleMutation("alterBankRow14")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.alterBankRow14 ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                  background: mutations.alterBankRow14 ? "#FFF1F2" : "#F4F4F5",
                  color: mutations.alterBankRow14 ? "#9F1239" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.alterBankRow14 ? "✓ 1. Row #14 Balance Tampered (-₹2.00L)" : "1. Tamper Row #14 Balance"}
              </button>

              {/* 2. Forge RRN Date */}
              <button
                type="button"
                onClick={() => toggleMutation("forgeRrnTimestamp")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.forgeRrnTimestamp ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                  background: mutations.forgeRrnTimestamp ? "#FFF1F2" : "#F4F4F5",
                  color: mutations.forgeRrnTimestamp ? "#9F1239" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.forgeRrnTimestamp ? "✓ 2. RRN Date Drifted (+50m)" : "2. Forge RRN Date"}
              </button>

              {/* 3. Drop CGNAT Port */}
              <button
                type="button"
                onClick={() => toggleMutation("dropCgnatSourcePort")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.dropCgnatSourcePort ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                  background: mutations.dropCgnatSourcePort ? "#FFF1F2" : "#F4F4F5",
                  color: mutations.dropCgnatSourcePort ? "#9F1239" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.dropCgnatSourcePort ? "✓ 3. Port Dropped (340 Subs)" : "3. Drop CGNAT Port"}
              </button>

              {/* 4. Trigger Hotspot TTL=63 */}
              <button
                type="button"
                onClick={() => toggleMutation("triggerHotspotCollision")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.triggerHotspotCollision ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                  background: mutations.triggerHotspotCollision ? "#FFF1F2" : "#F4F4F5",
                  color: mutations.triggerHotspotCollision ? "#9F1239" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.triggerHotspotCollision ? "✓ 4. Hotspot TTL=63 Active" : "4. Trigger Hotspot TTL=63"}
              </button>

              {/* 5. Inject ₹2.5L Clean Deposit */}
              <button
                type="button"
                onClick={() => toggleMutation("injectMerchantCleanDeposit")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.injectMerchantCleanDeposit ? "1px solid #C7D2FE" : "1px solid #E4E4E7",
                  background: mutations.injectMerchantCleanDeposit ? "#EEF2FF" : "#F4F4F5",
                  color: mutations.injectMerchantCleanDeposit ? "#3730A3" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.injectMerchantCleanDeposit ? "✓ 5. LIBR Divergence Injected" : "5. Inject ₹2.5L Clean Deposit"}
              </button>

              {/* 6. Flip Custody Byte */}
              <button
                type="button"
                onClick={() => toggleMutation("flipCustodyByte")}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 9px",
                  borderRadius: "6px",
                  border: mutations.flipCustodyByte ? "1px solid #FECDD3" : "1px solid #E4E4E7",
                  background: mutations.flipCustodyByte ? "#FFF1F2" : "#F4F4F5",
                  color: mutations.flipCustodyByte ? "#9F1239" : "#3F3F46",
                  cursor: "pointer",
                }}
              >
                {mutations.flipCustodyByte ? "✓ 6. Merkle Byte Flipped" : "6. Flip Custody Byte"}
              </button>
            </div>

            <button
              type="button"
              onClick={resetAllMutations}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#71717A",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={11} />
              <span>Reset All</span>
            </button>
          </div>
        )}

        {/* WORKSPACE VIEWPORT */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
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
