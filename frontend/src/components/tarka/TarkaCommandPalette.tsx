import React, { useEffect } from "react";
import { Command } from "cmdk";
import {
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Zap,
  RotateCcw,
  Maximize2,
  Sliders,
  PanelLeft,
  Search,
  LayoutGrid,
  FilePlus2,
  FileUp,
  FolderOpen,
  Database,
} from "lucide-react";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";

export const TarkaCommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveDockTab,
    togglePresentationMode,
    toggleDensity,
    toggleSidebar,
    setBenchmarkLabOpen,
    setPublicDatasetModalOpen,
  } = useTarkaUiStore();

  const {
    toggleMutation,
    resetAllMutations,
    setActiveRoute,
    caseWorkspaces,
    selectCaseWorkspace,
    openNewCaseModal,
    openEvidenceModal
  } = useTarkaGlobal();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
      }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "560px",
          maxWidth: "92vw",
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
      >
        <Command
          label="TARKA Global Forensic Command Palette"
          style={{ width: "100%", display: "flex", flexDirection: "column" }}
        >
          {/* Input Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderBottom: "1px solid #E2E8F0",
              background: "#F8FAFC",
            }}
          >
            <Search size={15} color="#64748B" />
            <Command.Input
              autoFocus
              placeholder="Type a command, case, mutator, or forensic tool... (Esc to close)"
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "#0F172A",
                fontFamily: "inherit",
              }}
            />
            <kbd
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "#94A3B8",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Items List */}
          <Command.List
            style={{
              maxHeight: "340px",
              overflowY: "auto",
              padding: "6px",
            }}
          >
            <Command.Empty
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#64748B",
                fontSize: "12px",
              }}
            >
              No matching forensic commands found.
            </Command.Empty>

            {/* Group 0: Investigation Workspaces & Cases */}
            <Command.Group
              heading="STATION WORKSPACES & CASES"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#94A3B8",
                padding: "6px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <Command.Item
                onSelect={() => {
                  setActiveRoute("workspace");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <LayoutGrid size={14} color="#4F46E5" />
                  <span>Go to Screen 00: Station Command & Workspaces Hub</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>Alt+0</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  openNewCaseModal();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FilePlus2 size={14} color="#059669" />
                  <span>Register New FIR / NCRP 1930 Case Workspace</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  openEvidenceModal();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileUp size={14} color="#7C3AED" />
                  <span>Insert / Quarantine Raw Evidence File (WebCrypto Hashing)</span>
                </div>
              </Command.Item>

              {caseWorkspaces.map((cw) => (
                <Command.Item
                  key={cw.caseId}
                  onSelect={() => {
                    selectCaseWorkspace(cw.caseId, cw.currentStage);
                    setCommandPaletteOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FolderOpen size={14} color="#64748B" />
                    <span>Switch to {cw.caseId}: {cw.firNumber} ({cw.title.slice(0, 32)}...)</span>
                  </div>
                  <span style={{ fontSize: "10px", color: "#4F46E5", fontFamily: "var(--font-mono)" }}>
                    {cw.goldenHourRemainingMins > 0 ? `${cw.goldenHourRemainingMins}m SLA` : "Active"}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Group: Benchmark & Dataset Lab */}
            <Command.Group
              heading="FORENSIC BENCHMARK & DATASET STREAMING"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#059669",
                padding: "8px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setBenchmarkLabOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#065F46",
                  background: "#ECFDF5",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={14} color="#059669" />
                  <span style={{ fontWeight: 700 }}>Open Forensic Benchmark &amp; Calibration Lab</span>
                </div>
                <kbd style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#047857" }}>Alt+B</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setPublicDatasetModalOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#3730A3",
                  background: "#EEF2FF",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Database size={14} color="#4F46E5" />
                  <span style={{ fontWeight: 700 }}>Open Public Dataset Benchmark (PaySim / IBM AML / IEEE-CIS)</span>
                </div>
                <kbd style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#4338CA" }}>Alt+D</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setBenchmarkLabOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sliders size={14} color="#4F46E5" />
                  <span>Run 100k CGNAT &amp; UPI Stress-Test Benchmark</span>
                </div>
                <span style={{ fontSize: "10px", color: "#64748B" }}>60 FPS Worker</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  setBenchmarkLabOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileUp size={14} color="#0284C7" />
                  <span>Upload External CSV / PaySim Benchmark Dataset</span>
                </div>
                <span style={{ fontSize: "10px", color: "#64748B" }}>Chunked 64KB</span>
              </Command.Item>
            </Command.Group>

            {/* Group 1: Inspector Dock Tabs */}
            <Command.Group
              heading="INSPECTOR DOCK TABS"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#94A3B8",
                padding: "8px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderTop: "1px solid #F1F5F9",
                marginTop: "4px",
              }}
            >
              <Command.Item
                onSelect={() => {
                  setActiveDockTab("rrn");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={14} color="#4F46E5" />
                  <span>Open NPCI RRN Forensic Lab</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>1</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("pdf");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={14} color="#E11D48" />
                  <span>Open PDF XRef & Revision Inspector</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>2</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("privacy");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span>Open CGNAT Merkle Privacy Shield</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>3</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("proof");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Open Gate Falsification Proof Timeline</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>4</kbd>
              </Command.Item>
            </Command.Group>

            {/* Group 2: Forensic Mutators & Tamper Triggers */}
            <Command.Group
              heading="INSPECTOR DOCK TABS"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#94A3B8",
                padding: "6px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <Command.Item
                onSelect={() => {
                  setActiveDockTab("rrn");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={14} color="#4F46E5" />
                  <span>Open NPCI RRN Forensic Lab</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>1</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("pdf");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={14} color="#E11D48" />
                  <span>Open PDF XRef & Revision Inspector</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>2</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("privacy");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span>Open CGNAT Merkle Privacy Shield</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>3</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setActiveDockTab("proof");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={14} color="#7C3AED" />
                  <span>Open Gate Falsification Proof Timeline</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>4</kbd>
              </Command.Item>
            </Command.Group>

            {/* Group 2: Forensic Mutators & Tamper Triggers */}
            <Command.Group
              heading="FORENSIC MUTATORS"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#94A3B8",
                padding: "8px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderTop: "1px solid #F1F5F9",
                marginTop: "4px",
              }}
            >
              <Command.Item
                onSelect={() => {
                  toggleMutation("alterBankRow14");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#BE123C",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={14} color="#E11D48" />
                  <span>Toggle Row #14 Balance Tamper (-₹2.00L)</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>T</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleMutation("forgeRrnTimestamp");
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#B45309",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={14} color="#D97706" />
                  <span>Forge RRN NTP Clock Skew (+50m)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  resetAllMutations();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <RotateCcw size={14} color="#64748B" />
                  <span>Reset All Forensic Mutations to Clean State</span>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Group 3: View & Workspace Controls */}
            <Command.Group
              heading="VIEW & WORKSPACE MODES"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#94A3B8",
                padding: "8px 8px 3px 8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderTop: "1px solid #F1F5F9",
                marginTop: "4px",
              }}
            >
              <Command.Item
                onSelect={() => {
                  togglePresentationMode();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Maximize2 size={14} color="#4F46E5" />
                  <span>Toggle Presentation Mode (Hide Sidebar Rail)</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>F</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleDensity();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sliders size={14} color="#64748B" />
                  <span>Toggle Density (Comfortable / Compact)</span>
                </div>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleSidebar();
                  setCommandPaletteOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PanelLeft size={14} color="#64748B" />
                  <span>Toggle Sidebar Expansion</span>
                </div>
                <kbd style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "var(--font-mono)" }}>Ctrl+B</kbd>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

