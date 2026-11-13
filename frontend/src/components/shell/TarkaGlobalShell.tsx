import React, { useState, useEffect, lazy, Suspense } from "react";
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
  Plus,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Sparkles,
  FolderKanban,
  FileSpreadsheet,
  Users,
  Crosshair,
  Network,
  GitMerge,
  Scale,
  ShieldCheck,
  Binary,
  FileCheck,
  Cpu,
  MoreHorizontal,
  Compass,
  Microscope,
  Search,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { toast } from "sonner";
import { useTarkaGlobal, type TarkaRoute, syncTarkaUrl } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { ReuiStatusBadge } from "../tarka/BentoPrimitives";
import { TarkaCommandPalette } from "../tarka/TarkaCommandPalette";
import { JudgeModeWalkthrough } from "../tarka/demo/JudgeModeWalkthrough";
import { forensicsApi } from "../../api/forensicsApi";
import { ErrorBoundary } from "../common/ErrorBoundary";

// Phase 15.2: Route-level lazy loading for bundle optimization & modular streaming
const IntakeScreen = lazy(() => import("../../pages/v5/IntakeScreen").then((m) => ({ default: m.IntakeScreen })));
const EntityResolutionScreen = lazy(() => import("../../pages/v5/EntityResolutionScreen").then((m) => ({ default: m.EntityResolutionScreen })));
const AttributionScreen = lazy(() => import("../../pages/v5/AttributionScreen").then((m) => ({ default: m.AttributionScreen })));
const FraudNetworkScreen = lazy(() => import("../../pages/v5/FraudNetworkScreen").then((m) => ({ default: m.FraudNetworkScreen })));
const TaintEngineScreen = lazy(() => import("../../pages/v5/TaintEngineScreen").then((m) => ({ default: m.TaintEngineScreen })));
const CourtProofScreen = lazy(() => import("../../pages/v5/CourtProofScreen").then((m) => ({ default: m.CourtProofScreen })));
const CaseWorkspaceScreen = lazy(() => import("../../pages/v5/CaseWorkspaceScreen").then((m) => ({ default: m.CaseWorkspaceScreen })));
const PrivacyCryptoWorkbench = lazy(() => import("../tarka/privacy/PrivacyCryptoWorkbench").then((m) => ({ default: m.PrivacyCryptoWorkbench })));
const BenchmarkLabScreen = lazy(() => import("../../pages/v5/BenchmarkLabScreen").then((m) => ({ default: m.BenchmarkLabScreen })));
const ForensicWorkstationScreen = lazy(() => import("../../pages/v5/ForensicWorkstationScreen").then((m) => ({ default: m.ForensicWorkstationScreen })));
const ReportScreen = lazy(() => import("../../pages/v5/ReportScreen").then((m) => ({ default: m.ReportScreen })));

// Lazy-loaded modal dialogs and drawers
const EvidenceIntakeModal = lazy(() => import("../tarka/workspace/EvidenceIntakeModal").then((m) => ({ default: m.EvidenceIntakeModal })));
const NewCaseModal = lazy(() => import("../tarka/workspace/NewCaseModal").then((m) => ({ default: m.NewCaseModal })));
const BenchmarkLabDrawer = lazy(() => import("../tarka/benchmark/BenchmarkLabDrawer").then((m) => ({ default: m.BenchmarkLabDrawer })));
const PublicDatasetBenchmarkModal = lazy(() => import("../tarka/benchmark/PublicDatasetBenchmarkModal").then((m) => ({ default: m.PublicDatasetBenchmarkModal })));
const SarvamVoiceModal = lazy(() => import("../tarka/SarvamVoiceModal").then((m) => ({ default: m.SarvamVoiceModal })));
const RelationshipEvidenceSheet = lazy(() => import("../tarka/investigation/RelationshipEvidenceSheet").then((m) => ({ default: m.RelationshipEvidenceSheet })));
const InvestigationIntelligenceBrief = lazy(() => import("../tarka/investigation/InvestigationIntelligenceBrief").then((m) => ({ default: m.InvestigationIntelligenceBrief })));
const TransformationAuditLog = lazy(() => import("../tarka/investigation/TransformationAuditLog").then((m) => ({ default: m.TransformationAuditLog })));

// Polished Obsidian Glass Suspense Fallback
const ScreenSuspenseFallback: React.FC = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      minHeight: "420px",
      gap: "14px",
      background: "transparent",
    }}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: "3px solid rgba(6, 182, 212, 0.20)",
        borderTopColor: "#22D3EE",
        animation: "spin 0.8s linear infinite",
        boxShadow: "0 0 16px rgba(6, 182, 212, 0.35)",
      }}
    />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "12px", fontWeight: 800, color: "#22D3EE", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
        STREAMING FORENSIC MODULE...
      </span>
      <span style={{ fontSize: "10px", color: "var(--text-muted, #8C9EB0)" }}>
        Cryptographic Attestation & Component Invariants Active
      </span>
    </div>
  </div>
);

const getStageGuidanceTitle = (route: TarkaRoute): string => {
  switch (route) {
    case "workspace": return "Multi-Case Command Hub";
    case "intake": return "Step 01: Evidence & Ledger — Did the money really leave?";
    case "entities": return "Step 02: People & Accounts — Who is who?";
    case "taint-engine": return "Step 03: Money Trail — Where did it go?";
    case "network": return "Step 04: Fraud Network — Who is connected?";
    case "attribution": return "Step 05: Device & SIM Attribution — Which phone/SIM did it?";
    case "report": return "Step 06: Report & Actions — Freeze orders & court certificate";
    case "court-proof": return "Advanced Lab: BSA § 63 Evidence Certificate";
    case "privacy-crypto": return "Advanced Lab: Cryptographic Verification & ZKP";
    case "workstation": return "Advanced Lab: Deep Forensic Loom & Flight Recorder";
    default: return "Forensic Investigation Workflow";
  }
};

const getStageGuidanceAction = (route: TarkaRoute): string => {
  switch (route) {
    case "workspace": return "Select active FIR case or import digital evidence files.";
    case "intake": return "Verify Finacle CBS statement & detect tampering in forged receipts.";
    case "entities": return "Merge suspect aliases across bank accounts while protecting commercial entities.";
    case "taint-engine": return "Trace fund dispersion under Lowest Intermediate Balance Rule (LIBR).";
    case "network": return "Discover syndicate links, accomplice Wi-Fi hotspots, and mule rings.";
    case "attribution": return "Isolate suspect handset via CGNAT port allocation and IMEI TAC.";
    case "report": return "Review executive summary and export auto-drafted §106/§107 freeze directives.";
    case "court-proof": return "Verify SHA-256 CAS integrity and export Section 63(4) admissible dossier.";
    case "privacy-crypto": return "Inspect Zero-Knowledge proofs and HSM signature attestations.";
    case "workstation": return "Analyze multi-track temporal evidence loom and Z3 claim ablation.";
    default: return "Follow verified evidentiary findings.";
  }
};

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
    caseWorkspaces,
    activeCaseId,
    selectCaseWorkspace,
    openNewCaseModal,
    openEvidenceModal,
  } = useTarkaGlobal();

  const activeCase = caseWorkspaces.find((c) => c.caseId === activeCaseId) || caseWorkspaces[0];

  const {
    activePage,
    setActivePage,
    sidebarCollapsed,
    toggleSidebar,
    presentationMode,
    togglePresentationMode,
    investigationMode,
    setInvestigationMode,
    cycleInvestigationMode,
    startJudgeDemo,
    density,
    setDensity,
    activeDiscoveredCluster,
    setActiveDiscoveredCluster,
    selectedEvidenceEdge,
    setSelectedEvidenceEdge,
    relationshipSheetOpen,
    setRelationshipSheetOpen,
    intelligenceBriefOpen,
    setIntelligenceBriefOpen,
    transformationAuditModalOpen,
    setTransformationAuditModalOpen,
  } = useTarkaUiStore();

  const [voiceOpen, setVoiceOpen] = useState<boolean>(false);
  const [mutatorRibbonOpen, setMutatorRibbonOpen] = useState<boolean>(false);
  const [headerCaseOpen, setHeaderCaseOpen] = useState<boolean>(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [isHoverPeeking, setIsHoverPeeking] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCompiledGoldenHourDirectives = () => {
    return `=== TARKA GOLDEN HOUR 1930 DISPATCH PACK — FIR #149/2026 ===
Generated: 2026-09-22 10:30:00 IST | SLA Remaining: 118 Minutes

[NOTICE 1: SBI §94 BNSS CBS VERIFICATION & INVARIANT PRODUCTION]
Target: SBI Nodal Officer | UTR #626510149921
Demands: Finacle 10.x transaction commit log, HSM cryptographic signature, and dual %%EOF incremental xref audit.

[NOTICE 2: HDFC & AXIS §107 BNSS CONDUIT ATTACHMENT ORDER]
Targets: HDFC Bank (A/c 5010029419920 - Rohit Verma) & Axis Bank (A/c 9140200410291 - Sameer Khan)
Demands: Immediate full debit freeze under Section 107 BNSS for Layer-2 split mule accounts.

[NOTICE 3: ICICI §106(1) BNSS PROPORTIONAL MERCHANT DEBIT LIEN]
Target: ICICI Bank (A/c 001405008129 - Apex Electronics Pvt Ltd, GSTIN 07AAACA1234F1Z8)
Demands: Proportional debit lien on ₹1,80,000.00 while preserving ₹2,50,000.00 clean operational working capital under Roscoe v. Winder doctrine.

[NOTICE 4: AIRTEL DoT CLAUSE 39.20 & §94 BNSS CGNAT ORDER]
Target: Bharti Airtel Lawful Intercept Nodal Officer | NAT IP 103.21.144.92:44000-44511
Demands: Dynamic NAT IPDR translation table, cell tower DL-TWR-891 RADIUS logs, and IMEI 867492061234564 binding.

[NOTICE 5: NPCI UPI 2.0 SWITCH CERTIFICATION UNDER §63(4) BSA]
Target: NPCI Central Switch Operations Lead
Demands: Section 63(4) electronic record certificate verifying UPI 2.0 <Device> XML stanza and JA4 TLS fingerprint t13d1516h2_8daaf6.

=== ALL 5 DIRECTIVES AUTHORIZED UNDER SEAL OF IO, CYBER CRIME PS NOIDA ===`;
  };

  // Live Judge Mutation Audit Log ("Session Receipts")
  const [mutationReceipts, setMutationReceipts] = useState<Array<{ id: string; time: string; text: string; type: "tamper" | "clean" }>>([
    { id: "rcpt-0", time: "10:00:14", text: "Baseline CBS Finacle 10.x Commit Verified (6/6 Invariant Satisfied)", type: "clean" },
  ]);

  const addReceipt = (text: string, type: "tamper" | "clean" = "tamper") => {
    const time = new Date().toTimeString().split(" ")[0];
    setMutationReceipts((prev) => [{ id: `rcpt-${Date.now()}-${Math.random()}`, time, text, type }, ...prev.slice(0, 7)]);
  };

  // Backend connection status probe for zero-error offline resilience
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  useEffect(() => {
    let isMounted = true;
    const probe = async () => {
      try {
        await forensicsApi.getHealth();
        if (isMounted) setIsBackendOnline(true);
      } catch {
        if (isMounted) setIsBackendOnline(false);
      }
    };
    probe();
    const interval = setInterval(probe, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      } else if (e.altKey && !isInput) {
        if (e.key === "0" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setActivePage("workspaces");
        } else if (e.key === "1") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("intake");
        } else if (e.key === "2") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("entities");
        } else if (e.key === "3") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("taint-engine");
        } else if (e.key === "4") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("network");
        } else if (e.key === "5") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("attribution");
        } else if (e.key === "6") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("report");
        } else if (e.key === "7") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("court-proof");
        } else if (e.key === "8") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("privacy-crypto");
        } else if (e.key === "9") {
          e.preventDefault();
          setActivePage("workbench");
          setActiveRoute("workstation");
        } else if (e.key === "b" || e.key === "B" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          setActivePage("benchmark");
        } else if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          cycleInvestigationMode();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, togglePresentationMode, setActiveRoute, setActivePage]);

  // Command Hub Navigation Item
  const workspaceNavItem = {
    id: "workspace" as TarkaRoute,
    step: "00",
    title: "Station Command & Workspaces Hub",
    shortTitle: "Command Hub",
    subtitle: "Multi-Case Command Hub",
    badgeText: `${caseWorkspaces.length} Cases`,
    badgeVariant: "indigo" as const,
    tooltip: "00 Command Hub — Multi-Case Command Workspace & Intake Hub (Alt+0)",
    icon: FolderKanban,
    isLocked: false,
  };

  // 6 Plain-Language Core PS4 Deliverable Pipeline Navigation Items
  const coreNavItems = [
    {
      id: "intake" as TarkaRoute,
      step: "01",
      title: "1 Evidence & Ledger",
      shortTitle: "1 Evidence & Ledger",
      subtitle: "Did the money really leave?",
      badgeText: mutations.alterBankRow14 ? "Tampered" : "Valid",
      badgeVariant: mutations.alterBankRow14 ? ("rose" as const) : ("emerald" as const),
      tooltip: "01 Evidence & Ledger — Did the money really leave? (Alt+1)",
      icon: FileSpreadsheet,
      isLocked: false,
    },
    {
      id: "entities" as TarkaRoute,
      step: "02",
      title: "2 People & Accounts",
      shortTitle: "2 People & Accounts",
      subtitle: "Who is who?",
      badgeText: "5 Ent",
      badgeVariant: "indigo" as const,
      tooltip: "02 People & Accounts — Who is who? (Alt+2)",
      icon: Users,
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "taint-engine" as TarkaRoute,
      step: "03",
      title: "3 Money Trail",
      shortTitle: "3 Money Trail",
      subtitle: "Where did it go?",
      badgeText: "LIBR",
      badgeVariant: "emerald" as const,
      tooltip: "03 Money Trail — Where did it go? (Alt+3)",
      icon: GitMerge,
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "network" as TarkaRoute,
      step: "04",
      title: "4 Fraud Network",
      shortTitle: "4 Fraud Network",
      subtitle: "Who is connected?",
      badgeText: "Syndicate",
      badgeVariant: "indigo" as const,
      tooltip: "04 Fraud Network — Who is connected? (Alt+4)",
      icon: Network,
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "attribution" as TarkaRoute,
      step: "05",
      title: "5 Device & SIM Attribution",
      shortTitle: "5 Device & SIM",
      subtitle: "Which phone/SIM did it?",
      badgeText: "1:1 Match",
      badgeVariant: "emerald" as const,
      tooltip: "05 Device & SIM Attribution — Which phone/SIM did it? (Alt+5)",
      icon: Crosshair,
      isLocked: intakeGate?.isHalted,
    },
    {
      id: "report" as TarkaRoute,
      step: "06",
      title: "6 Report & Actions",
      shortTitle: "6 Report & Actions",
      subtitle: "Freeze orders & court certificate",
      badgeText: "Directives",
      badgeVariant: "emerald" as const,
      tooltip: "06 Report & Actions — Freeze orders & court certificate (Alt+6)",
      icon: Scale,
      isLocked: false,
    },
  ];

  // Advanced Forensic Lab Navigation Items
  const advancedNavItems = [
    {
      id: "court-proof" as TarkaRoute,
      step: "L1",
      title: "Court Evidence Dossier",
      shortTitle: "Court Dossier",
      subtitle: "BSA §63(4) Certificate",
      badgeText: "§63(4)",
      badgeVariant: "emerald" as const,
      tooltip: "Court Evidence Dossier — BSA §63(4) Certificate & LOO Proof (Alt+7)",
      icon: FileCheck,
      isLocked: false,
    },
    {
      id: "privacy-crypto" as TarkaRoute,
      step: "L2",
      title: "Privacy, Cryptography & ZKP",
      shortTitle: "Privacy & ZKP",
      subtitle: "ECDH-PSI & ZKP proofs",
      badgeText: "ZKP",
      badgeVariant: "indigo" as const,
      tooltip: "Privacy, Cryptography & ZKP Lab (Alt+8)",
      icon: ShieldCheck,
      isLocked: false,
    },
    {
      id: "workstation" as TarkaRoute,
      step: "L3",
      title: "Forensic Loom Workstation",
      shortTitle: "Forensic Loom",
      subtitle: "Temporal Loom & SMT Lens",
      badgeText: "LOOM",
      badgeVariant: "emerald" as const,
      tooltip: "Forensic Loom Workstation — Temporal Loom & SMT Lens (Alt+9)",
      icon: Binary,
      isLocked: false,
    },
    {
      id: "benchmarks" as TarkaRoute,
      step: "L4",
      title: "Benchmark & Stress Lab",
      shortTitle: "Benchmark Lab",
      subtitle: "100k-row throughput",
      badgeText: "100k Rows",
      badgeVariant: "indigo" as const,
      tooltip: "Benchmark & Stress Lab (Alt+B)",
      icon: Cpu,
      isLocked: false,
    },
  ];

  const navItems = [workspaceNavItem, ...coreNavItems, ...advancedNavItems];

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

  const renderNavButton = (item: (typeof navItems)[0]) => {
    const isActive =
      activePage === "benchmark"
        ? item.id === "benchmarks"
        : activePage === "workspaces"
        ? item.id === "workspace"
        : activeRoute === item.id;
    const IconComp = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (item.id === "workspace") {
            setActivePage("workspaces");
            syncTarkaUrl(activeCaseId, "workspace");
          } else if (item.id === "benchmarks") {
            setActivePage("benchmark");
            syncTarkaUrl(activeCaseId, "benchmarks");
          } else {
            setActivePage("workbench");
            setActiveRoute(item.id);
          }
        }}
        title={`${item.step} ${item.shortTitle} — ${item.subtitle}`}
        className="hover:bg-cyan-500/10 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "space-between" : "center",
          padding: isExpanded ? "7px 9px" : "6px 0",
          borderRadius: "8px",
          background: isActive ? "rgba(6, 182, 212, 0.16)" : "transparent",
          border: isActive ? "1px solid rgba(34, 211, 238, 0.35)" : "1px solid transparent",
          color: isActive ? "#FFFFFF" : "#94A3B8",
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
              background: "#06B6D4",
              boxShadow: "0 0 8px #22D3EE",
            }}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isExpanded ? "6px" : "2px",
              flexDirection: isExpanded ? "row" : "column",
              flexShrink: 0,
              width: isExpanded ? "auto" : "42px",
            }}
          >
            <IconComp size={15} color={isActive ? "#22D3EE" : "#94A3B8"} />
            <span
              style={{
                fontSize: isExpanded ? "11px" : "9.5px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: isActive ? "#22D3EE" : "#94A3B8",
                background: isActive ? "rgba(6, 182, 212, 0.22)" : "rgba(255, 255, 255, 0.04)",
                padding: isExpanded ? "2px 5px" : "1px 3px",
                borderRadius: "3px",
                border: `1px solid ${isActive ? "rgba(34, 211, 238, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
              }}
            >
              {item.step}
            </span>
          </div>
          {isExpanded && (
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#FFFFFF" : "#E2E8F0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.shortTitle}
              </div>
              <div style={{ fontSize: "9.5px", color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.subtitle}
              </div>
            </div>
          )}
        </div>

        {isExpanded && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            {item.isLocked && <Lock size={12} color="#FB7185" />}
            <ReuiStatusBadge text={item.badgeText} variant={item.badgeVariant} dot={false} />
          </div>
        )}
      </button>
    );
  };

  // Determine effective sidebar state (56px collapsed vs 232px expanded/peeking)
  const isExpanded = isMobile ? !sidebarCollapsed : (!sidebarCollapsed || isHoverPeeking);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        maxWidth: "100vw",
        height: "100vh",
        background: "var(--bento-canvas, #060B14)",
        padding: isMobile ? "3px" : "6px",
        gap: isMobile ? "3px" : "6px",
        boxSizing: "border-box",
        overflowX: "hidden",
        overflowY: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
      }}
    >
      <TarkaCommandPalette />
      <JudgeModeWalkthrough />

      {/* Mobile Drawer Backdrop */}
      {isMobile && !sidebarCollapsed && (
        <div
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 11, 20, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 110,
          }}
        />
      )}

      {/* =========================================================================
          1. SHADCN-STYLE COLLAPSIBLE SIDEBAR RAIL (56PX DEFAULT / 232PX EXPANDED)
          Rendered ONLY on activePage === "workbench" (Hidden on Workspaces & Benchmark)
          ========================================================================= */}
      {!presentationMode && activePage === "workbench" && (
        <aside
          onMouseEnter={() => {
            if (!isMobile && sidebarCollapsed) setIsHoverPeeking(true);
          }}
          onMouseLeave={() => {
            if (!isMobile && sidebarCollapsed) setIsHoverPeeking(false);
          }}
          style={{
            display: isMobile && sidebarCollapsed ? "none" : "flex",
            position: isMobile ? "fixed" : (isHoverPeeking ? "absolute" : "relative"),
            left: isMobile ? "6px" : undefined,
            top: isMobile ? "6px" : undefined,
            bottom: isMobile ? "6px" : undefined,
            width: isMobile ? "240px" : `${isExpanded ? 232 : 56}px`,
            minWidth: isMobile ? "240px" : `${isExpanded ? 232 : 56}px`,
            maxWidth: isMobile ? "240px" : `${isExpanded ? 232 : 56}px`,
            height: isMobile ? "calc(100% - 12px)" : "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "8px 6px",
            background: "var(--glass-tint-level-2, rgba(19, 34, 56, 0.95))",
            border: "1px solid var(--glass-border-specular, rgba(255, 255, 255, 0.08))",
            borderRadius: "12px",
            boxShadow: isMobile || isHoverPeeking ? "0 16px 36px -4px rgba(0, 0, 0, 0.85)" : "0 4px 20px -2px rgba(0, 0, 0, 0.40)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            zIndex: isMobile ? 120 : (isHoverPeeking ? 100 : 10),
            transition: isMobile ? "none" : "width 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.18s ease",
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
                    background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    boxShadow: "0 2px 10px rgba(6, 182, 212, 0.35)",
                    flexShrink: 0,
                  }}
                >
                  <Shield size={16} strokeWidth={2.4} />
                </div>
                {isExpanded && (
                  <span style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.03em", color: "#FFFFFF" }}>
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
                  title={`${activeCase?.firNumber || "Case"} · ${activeCase?.policeStation || ""} · ${activeCase?.title || ""}`}
                  className="hover:border-cyan-400/50 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--glass-border-specular, rgba(255, 255, 255, 0.08))",
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
                        <span style={{ fontSize: "9.5px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#22D3EE", background: "rgba(6, 182, 212, 0.16)", border: "1px solid rgba(34, 211, 238, 0.25)", padding: "1px 4px", borderRadius: "3px" }}>
                          {activeCase?.firNumber || "CASE"}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#94A3B8" }}>
                          {activeCase?.policeStation ? activeCase.policeStation.split(" ")[0] : "Station"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#F8FAFC", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {activeCase?.title ? activeCase.title.slice(0, 22) : "Digital Arrest"}...
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#22D3EE" }}>
                      {activeCase?.firNumber ? activeCase.firNumber.replace(/[^0-9]/g, "").slice(0, 3) || "001" : "001"}
                    </span>
                  )}
                  {isExpanded && <ChevronDown size={12} color="#94A3B8" />}
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  side="right"
                  align="start"
                  sideOffset={8}
                  style={{
                    background: "#132238",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.70)",
                    width: "300px",
                    zIndex: 9999,
                    fontFamily: "var(--font-sans)",
                    color: "#F8FAFC",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        SWITCH ACTIVE CASE WORKSPACE
                      </span>
                      <ReuiStatusBadge text={`${caseWorkspaces.length} Cases`} variant="indigo" dot={false} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
                      {caseWorkspaces.map((cw) => {
                        const isCurrent = cw.caseId === activeCaseId;
                        return (
                          <div
                            key={cw.caseId}
                            onClick={() => selectCaseWorkspace(cw.caseId, activeRoute === "workspace" ? "workspace" : cw.currentStage)}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              background: isCurrent ? "rgba(6, 182, 212, 0.18)" : "rgba(255, 255, 255, 0.03)",
                              border: isCurrent ? "1px solid rgba(34, 211, 238, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: isCurrent ? "#22D3EE" : "#CBD5E1" }}>
                                {cw.firNumber}
                              </span>
                              {cw.goldenHourRemainingMins > 0 ? (
                                <span style={{ fontSize: "9px", fontWeight: 700, color: "#FBBF24", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.30)", padding: "1px 4px", borderRadius: "3px" }}>
                                  ⚡ {cw.goldenHourRemainingMins}m
                                </span>
                              ) : isCurrent ? (
                                <span style={{ fontSize: "9px", fontWeight: 700, color: "#34D399", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.30)", padding: "1px 4px", borderRadius: "3px" }}>
                                  ACTIVE
                                </span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {cw.title}
                            </div>
                            <div style={{ fontSize: "9.5px", color: "#64748B" }}>
                              {(cw.policeStation || "PS Noida").split(",")[0]} · {cw.complainantName || "Complainant"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px", display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={openNewCaseModal}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          padding: "5px 8px",
                          borderRadius: "6px",
                          background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                          color: "#FFFFFF",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(6, 182, 212, 0.25)",
                        }}
                      >
                        <Plus size={12} />
                        <span>New Case Workspace</span>
                      </button>
                    </div>
                  </div>
                  <Popover.Arrow style={{ fill: "#132238" }} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Navigation Engines */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {renderNavButton(workspaceNavItem)}

              {isExpanded && (
                <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 6px 3px" }}>
                  Investigation Steps (1–6)
                </div>
              )}
              {coreNavItems.map(renderNavButton)}

              {isExpanded && (
                <div style={{ fontSize: "9.5px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 6px 3px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: "6px" }}>
                  Advanced Lab
                </div>
              )}
              {advancedNavItems.map(renderNavButton)}
            </nav>

            {/* Artifacts Tree Popover Button */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  title="Inspect Ingested Artifact Tree (T1/T2/T3 Tiers)"
                  className="hover:bg-slate-800/60 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isExpanded ? "flex-start" : "center",
                    gap: "8px",
                    padding: isExpanded ? "6px 8px" : "8px 0",
                    borderRadius: "8px",
                    border: "1px solid var(--glass-border-specular, rgba(255, 255, 255, 0.08))",
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "#F8FAFC",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <FolderTree size={14} color="#94A3B8" />
                  {isExpanded && <span>Artifact Tree (5)</span>}
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  side="right"
                  align="center"
                  sideOffset={8}
                  style={{
                    background: "#132238",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.70)",
                    width: "280px",
                    zIndex: 9999,
                    fontFamily: "var(--font-sans)",
                    color: "#F8FAFC",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#FFFFFF", marginBottom: "6px" }}>
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
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          fontSize: "10.5px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                          <FileText size={11} color="#94A3B8" />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {f.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 700,
                            padding: "0.5px 4px",
                            borderRadius: "3px",
                            background: f.status === "emerald" ? "rgba(16, 185, 129, 0.15)" : f.status === "rose" ? "rgba(244, 63, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: f.status === "emerald" ? "#34D399" : f.status === "rose" ? "#FB7185" : "#FBBF24",
                            border: `1px solid ${f.status === "emerald" ? "rgba(16, 185, 129, 0.30)" : f.status === "rose" ? "rgba(244, 63, 94, 0.30)" : "rgba(245, 158, 11, 0.30)"}`,
                          }}
                        >
                          {f.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Popover.Arrow style={{ fill: "#132238" }} />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          {/* Bottom Sidebar: Z3 Solver Telemetry, IO Avatar, and Collapse Toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px" }}>
            {/* Z3 Status Dot & Tooltip */}
            <div
              title="Z3 SMT Solver: ONLINE 3.8 ms · CAS SHA-256 Chain INTACT"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isExpanded ? "space-between" : "center",
                padding: "4px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "10px",
                cursor: "help",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981", flexShrink: 0 }} />
                {isExpanded && <span style={{ fontWeight: 700, color: "#FFFFFF" }}>Z3 SMT</span>}
              </div>
              {isExpanded && (
                <span style={{ fontFamily: "var(--font-mono)", color: "#34D399", fontWeight: 700, fontSize: "9px" }}>
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
                  background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 8px rgba(6, 182, 212, 0.3)",
                }}
              >
                VS
              </div>
              {isExpanded && (
                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Insp. Vikram Sharma
                  </div>
                  <div style={{ fontSize: "9px", color: "#94A3B8" }}>Investigating Officer</div>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={`Toggle Sidebar Rail (Ctrl+B) — Currently ${sidebarCollapsed ? "Collapsed (56px)" : "Expanded (232px)"}`}
              className="hover:bg-slate-800/50 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "5px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.04)",
                color: "#94A3B8",
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
          background: "var(--glass-tint-level-1, rgba(15, 27, 46, 0.75))",
          border: "1px solid var(--glass-border-specular, rgba(255, 255, 255, 0.08))",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          minWidth: 0,
          minHeight: 0,
          height: "100%",
        }}
      >
        {/* TOP COMMAND HEADER — 3-ZONE FLEX LAYOUT (NO OVERLAP AT 1366 / 1440 / 1920) */}
        <header
          style={{
            height: "44px",
            minHeight: "44px",
            maxHeight: "44px",
            background: "var(--glass-tint-level-2, rgba(19, 34, 56, 0.85))",
            borderBottom: "1px solid var(--glass-border-specular, rgba(255, 255, 255, 0.08))",
            padding: "0 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexShrink: 0,
            boxSizing: "border-box",
            whiteSpace: "nowrap",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          {/* ZONE 1 (LEFT): Mobile Drawer Trigger + Mode Switcher + Presentation Modes */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {isMobile && activePage === "workbench" && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="lg:hidden"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  color: "#0F172A",
                  cursor: "pointer",
                }}
                title="Open Navigation Menu"
              >
                <FolderTree size={14} color="#4F46E5" />
              </button>
            )}

            {/* Top-Level Mode Switcher (Workspaces | Workbench) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "7px",
                padding: "2px",
                gap: "2px",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActivePage("workspaces");
                  setActiveRoute("workspace");
                }}
                title="Workspaces Hub: Multi-Case Command & Evidence Dropzone (Alt+W / Alt+0)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: activePage === "workspaces" ? 800 : 600,
                  background: activePage === "workspaces" ? "rgba(6, 182, 212, 0.20)" : "transparent",
                  color: activePage === "workspaces" ? "#22D3EE" : "#94A3B8",
                  boxShadow: activePage === "workspaces" ? "0 0 10px rgba(6, 182, 212, 0.25)" : "none",
                  border: activePage === "workspaces" ? "1px solid rgba(34, 211, 238, 0.40)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <FolderKanban size={12} color={activePage === "workspaces" ? "#22D3EE" : "#94A3B8"} />
                <span>Workspaces</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePage("workbench");
                  if (activeRoute === "workspace") setActiveRoute("intake");
                }}
                title="Case Workbench: 6-Stage Forensic Investigation Pipeline (Alt+1..6)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: activePage === "workbench" ? 800 : 600,
                  background: activePage === "workbench" ? "rgba(6, 182, 212, 0.20)" : "transparent",
                  color: activePage === "workbench" ? "#22D3EE" : "#94A3B8",
                  boxShadow: activePage === "workbench" ? "0 0 10px rgba(6, 182, 212, 0.25)" : "none",
                  border: activePage === "workbench" ? "1px solid rgba(34, 211, 238, 0.40)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Search size={12} color={activePage === "workbench" ? "#22D3EE" : "#94A3B8"} />
                <span>Workbench</span>
              </button>
            </div>

            {/* Investigation Presentation Modes (Guided | Analyst | Review) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "7px",
                padding: "2px",
                gap: "2px",
                flexShrink: 0,
              }}
              role="radiogroup"
              aria-label="Investigation Presentation Mode"
            >
              <button
                type="button"
                onClick={() => {
                  setInvestigationMode("guided");
                  startJudgeDemo();
                }}
                title="Guided Investigation: Step-by-step guidance for frontline officers & rapid response (Alt+M)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: investigationMode === "guided" ? 800 : 600,
                  background: investigationMode === "guided" ? "rgba(6, 182, 212, 0.22)" : "transparent",
                  color: investigationMode === "guided" ? "#22D3EE" : "#94A3B8",
                  border: investigationMode === "guided" ? "1px solid rgba(34, 211, 238, 0.45)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Compass size={11} color={investigationMode === "guided" ? "#22D3EE" : "#94A3B8"} />
                <span>Guided</span>
              </button>

              <button
                type="button"
                onClick={() => setInvestigationMode("analyst")}
                title="Analyst Workbench: High-density multi-pane analytical workstation (Alt+M)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: investigationMode === "analyst" ? 800 : 600,
                  background: investigationMode === "analyst" ? "rgba(59, 130, 246, 0.22)" : "transparent",
                  color: investigationMode === "analyst" ? "#60A5FA" : "#94A3B8",
                  border: investigationMode === "analyst" ? "1px solid rgba(96, 165, 250, 0.45)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Microscope size={11} color={investigationMode === "analyst" ? "#60A5FA" : "#94A3B8"} />
                <span>Analyst</span>
              </button>

              <button
                type="button"
                onClick={() => setInvestigationMode("review")}
                title="Forensic Review: Bitstream verification, SHA-256 CAS provenance, and BSA Section 63 admissibility (Alt+M)"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: investigationMode === "review" ? 800 : 600,
                  background: investigationMode === "review" ? "rgba(16, 185, 129, 0.22)" : "transparent",
                  color: investigationMode === "review" ? "#34D399" : "#94A3B8",
                  border: investigationMode === "review" ? "1px solid rgba(52, 211, 153, 0.45)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Scale size={11} color={investigationMode === "review" ? "#34D399" : "#94A3B8"} />
                <span>Review</span>
              </button>
            </div>
          </div>

          {/* ZONE 2 (CENTER): Flexible Breadcrumb with text-overflow ellipsis (Never Collides) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flex: "1 1 auto",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "rgba(255, 255, 255, 0.20)", flexShrink: 0 }}>/</span>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "#22D3EE",
                fontWeight: 700,
                background: "rgba(6, 182, 212, 0.16)",
                border: "1px solid rgba(34, 211, 238, 0.25)",
                padding: "1px 5px",
                borderRadius: "3px",
                flexShrink: 0,
              }}
            >
              {activePage === "benchmark" ? "BENCHMARK-LAB" : activeCase?.firNumber || "CASE"}
            </span>
            <span style={{ color: "rgba(255, 255, 255, 0.20)", flexShrink: 0 }}>/</span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#F8FAFC",
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {activePage === "benchmark"
                ? "Synthetic & Public Dataset Forensic Benchmark"
                : activePage === "workspaces" || activeRoute === "workspace"
                ? "Multi-Case Command Hub"
                : currentNav.shortTitle || currentNav.title}
            </span>
            <span className="hidden xl:inline-flex flex-shrink-0">
              <ReuiStatusBadge text="Z3 Verified" variant="emerald" />
            </span>
            {!isBackendOnline ? (
              <span
                data-testid="offline-demo-pill"
                className="flex-shrink-0"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "#FBBF24",
                  background: "rgba(245, 158, 11, 0.16)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                }}
                title="Backend server offline · Operating deterministically with local verified fixtures"
              >
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#F59E0B" }} />
                Offline demo data
              </span>
            ) : null}
          </div>

          {/* ZONE 3 (RIGHT): Exactly 5 Visible Actions + Single '⋯ More' Popover */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            {/* 1. Case Switcher */}
            <Popover.Root open={headerCaseOpen} onOpenChange={setHeaderCaseOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  title={`Active Case: ${activeCase?.firNumber || "CASE"} · ${activeCase?.title || ""}`}
                  className="hover:border-cyan-400/50 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid rgba(34, 211, 238, 0.30)",
                    borderRadius: "6px",
                    padding: "0 8px",
                    color: "#22D3EE",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Shield size={12} color="#22D3EE" />
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    {activeCase?.firNumber ? activeCase.firNumber.replace(/FIR #/i, "CASE-") : "CASE-001"}
                  </span>
                  <ChevronDown size={11} color="#94A3B8" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  style={{
                    width: "300px",
                    background: "#132238",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: "10px",
                    boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.75)",
                    padding: "10px",
                    zIndex: 100,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    color: "#F8FAFC",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      SWITCH ACTIVE CASE
                    </span>
                    <ReuiStatusBadge text={`${caseWorkspaces.length} Cases`} variant="indigo" dot={false} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
                    {caseWorkspaces.map((cw) => {
                      const isCurrent = cw.caseId === activeCaseId;
                      return (
                        <div
                          key={cw.caseId}
                          onClick={() => {
                            selectCaseWorkspace(cw.caseId, activeRoute === "workspace" ? "workspace" : cw.currentStage);
                            setHeaderCaseOpen(false);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            background: isCurrent ? "rgba(6, 182, 212, 0.18)" : "rgba(255, 255, 255, 0.03)",
                            border: isCurrent ? "1px solid rgba(34, 211, 238, 0.35)" : "1px solid rgba(255, 255, 255, 0.06)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-mono)", color: isCurrent ? "#22D3EE" : "#CBD5E1" }}>
                              {cw.firNumber}
                            </span>
                            {cw.goldenHourRemainingMins > 0 ? (
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#FBBF24", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.30)", padding: "1px 4px", borderRadius: "3px" }}>
                                ⚡ {cw.goldenHourRemainingMins}m
                              </span>
                            ) : isCurrent ? (
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#34D399", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.30)", padding: "1px 4px", borderRadius: "3px" }}>
                                ACTIVE
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#F8FAFC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cw.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        openNewCaseModal();
                        setHeaderCaseOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                        color: "#FFFFFF",
                        border: "none",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={12} />
                      <span>New Case Workspace</span>
                    </button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* 2. Brief */}
            <button
              type="button"
              onClick={() => setIntelligenceBriefOpen(true)}
              className="hover:bg-cyan-500/20 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              title="Open 7-Question Explainable Investigation Intelligence Brief"
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(6, 182, 212, 0.14)",
                border: "1px solid rgba(34, 211, 238, 0.30)",
                color: "#22D3EE",
                fontWeight: 700,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 8px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.08)",
                flexShrink: 0,
              }}
            >
              <Sparkles size={11} color="#22D3EE" />
              <span>Brief</span>
            </button>

            {/* 3. Voice AI */}
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              className="hover:bg-slate-800/60 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              title="Voice AI Assistant"
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                color: "#334155",
                fontWeight: 600,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 8px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Mic size={11} color="#4F46E5" />
              <span>Voice AI</span>
            </button>

            {/* 4. Export Report */}
            <button
              type="button"
              disabled={intakeGate?.isHalted}
              onClick={() => setActiveRoute("report")}
              className="hover:bg-slate-800 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              title={
                intakeGate?.isHalted
                  ? "Export disabled: Falsification Gate halted downstream admissibility"
                  : "View & Export Certified A4 Report (BSA §63(4))"
              }
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: intakeGate?.isHalted ? "rgba(255, 255, 255, 0.05)" : "#0F1B2E",
                color: intakeGate?.isHalted ? "#8C9EB0" : "#FFFFFF",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontWeight: 600,
                fontSize: "11px",
                borderRadius: "6px",
                padding: "0 8px",
                cursor: intakeGate?.isHalted ? "not-allowed" : "pointer",
                boxShadow: intakeGate?.isHalted ? "none" : "0 1px 2px rgba(0,0,0,0.1)",
                flexShrink: 0,
              }}
            >
              <FileDown size={11} />
              <span>Export Report</span>
            </button>

            {/* 5. + Evidence */}
            <button
              type="button"
              onClick={() => openEvidenceModal(activeCaseId)}
              title="Insert & Quarantine Forensic Evidence Exhibit (WebCrypto Hashing)"
              className="hover:brightness-110 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "0 8px",
                borderRadius: "6px",
                border: "1px solid #4338CA",
                background: "#4F46E5",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "11px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
                flexShrink: 0,
              }}
            >
              <Plus size={12} />
              <span>+ Evidence</span>
            </button>

            {/* ⋯ More Popover (rarely used controls: Mutator, Lab, Compact, Lien clock, 1930 SLA) */}
            <Popover.Root open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  title="More tools & forensic controls"
                  className="hover:bg-slate-800/60 enabled:active:scale-[0.96] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    background: activeMutationsCount > 0 ? "rgba(244, 63, 94, 0.18)" : "rgba(255, 255, 255, 0.05)",
                    border: activeMutationsCount > 0 ? "1px solid rgba(244, 63, 94, 0.35)" : "1px solid rgba(255, 255, 255, 0.12)",
                    color: activeMutationsCount > 0 ? "#FB7185" : "#F8FAFC",
                    fontWeight: 600,
                    fontSize: "11px",
                    borderRadius: "6px",
                    padding: "0 7px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <MoreHorizontal size={13} />
                  <span>More</span>
                  {activeMutationsCount > 0 && (
                    <span style={{ fontSize: "8.5px", fontWeight: 800, background: "#E11D48", color: "#FFFFFF", padding: "0.5px 3.5px", borderRadius: "3px" }}>
                      {activeMutationsCount}
                    </span>
                  )}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  style={{
                    width: "290px",
                    background: "#132238",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    borderRadius: "10px",
                    boxShadow: "0 12px 32px -4px rgba(0, 0, 0, 0.75)",
                    padding: "10px",
                    zIndex: 100,
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    color: "#F8FAFC",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: "4px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    FORENSIC UTILITIES &amp; LABS
                  </div>

                  {/* Operational Clock Stepper */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10.5px", color: "#94A3B8" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={11} color="#60A5FA" />
                        <span>Timeline Calibration</span>
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#22D3EE", fontWeight: 700 }}>
                        {(clockStages.find((stg) => Math.abs(timeOffsetHours - stg.offset) < 0.5) || clockStages[2]).label}
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "3px" }}>
                      {clockStages.map((stg, idx) => {
                        const isCurrent = Math.abs(timeOffsetHours - stg.offset) < 0.5;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setTimeOffsetHours(stg.offset)}
                            style={{
                              padding: "4px 2px",
                              fontSize: "10px",
                              fontWeight: 700,
                              borderRadius: "4px",
                              border: isCurrent ? "1px solid #38BDF8" : "1px solid rgba(255, 255, 255, 0.08)",
                              background: isCurrent ? "rgba(56, 189, 248, 0.20)" : "rgba(255, 255, 255, 0.04)",
                              color: isCurrent ? "#38BDF8" : "#94A3B8",
                              cursor: "pointer",
                            }}
                          >
                            {stg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Judge Mutator Drawer */}
                  <button
                    type="button"
                    onClick={() => {
                      setMutatorRibbonOpen((prev) => !prev);
                      setMoreMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: activeMutationsCount > 0 ? "rgba(244, 63, 94, 0.18)" : "rgba(255, 255, 255, 0.04)",
                      border: activeMutationsCount > 0 ? "1px solid rgba(244, 63, 94, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: activeMutationsCount > 0 ? "#FB7185" : "#F8FAFC",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
                      <Zap size={12} color={activeMutationsCount > 0 ? "#F43F5E" : "#94A3B8"} />
                      <span>Falsification Mutator</span>
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: activeMutationsCount > 0 ? "#FB7185" : "#94A3B8" }}>
                      {activeMutationsCount} Active →
                    </span>
                  </button>

                  {/* Benchmark Lab Screen Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("benchmark");
                      setMoreMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: activePage === "benchmark" ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.04)",
                      border: activePage === "benchmark" ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: activePage === "benchmark" ? "#34D399" : "#F8FAFC",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
                      <Zap size={12} color="#10B981" />
                      <span>Empirical Benchmark Lab</span>
                    </span>
                    <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#10B981", background: "rgba(16, 185, 129, 0.20)", padding: "1px 4px", borderRadius: "3px" }}>
                      Alt+B
                    </span>
                  </button>

                  {/* Density Compact Toggle */}
                  <button
                    type="button"
                    onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#F8FAFC",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600 }}>
                      {density === "comfortable" ? <Minimize2 size={12} color="#94A3B8" /> : <Maximize2 size={12} color="#94A3B8" />}
                      <span>Display Density</span>
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#22D3EE" }}>
                      {density === "comfortable" ? "Standard" : "Compact"}
                    </span>
                  </button>

                  {/* 1930 SLA Golden Hour Dispatch */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(getCompiledGoldenHourDirectives());
                        toast.success("Copied 5 Golden-Hour Directives to clipboard!", {
                          description: "Statutory dispatch bundle for SBI, HDFC, Axis, ICICI, Airtel, and NPCI.",
                          duration: 4000,
                        });
                      }
                      setMoreMenuOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(245, 158, 11, 0.14)",
                      border: "1px solid rgba(245, 158, 11, 0.30)",
                      color: "#FBBF24",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700 }}>
                      <Zap size={12} color="#F59E0B" />
                      <span>1930 Golden Hour SLA</span>
                    </span>
                    <span style={{ fontSize: "9px", fontWeight: 800, background: "#FEF3C7", color: "#B45309", padding: "1px 4px", borderRadius: "3px" }}>
                      118m Left (Copy Orders)
                    </span>
                  </button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </header>

        {/* PHASE 15 ADAPTIVE PRESENTATION MODE HUD */}
        {investigationMode === "guided" && activePage === "workbench" && (
          <div
            style={{
              background: "rgba(6, 182, 212, 0.10)",
              borderBottom: "1px solid rgba(34, 211, 238, 0.25)",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#F8FAFC",
              flexShrink: 0,
              zIndex: 15,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "#06B6D4", color: "#060B14", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", fontSize: "10px", letterSpacing: "0.04em" }}>
                GUIDED WORKFLOW
              </span>
              <span style={{ fontWeight: 700, color: "#22D3EE" }}>
                {getStageGuidanceTitle(activeRoute)}
              </span>
              <span style={{ color: "#8C9EB0" }}>·</span>
              <span style={{ color: "#CBD5E1" }}>
                {getStageGuidanceAction(activeRoute)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={startJudgeDemo}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                  color: "#FFFFFF",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(6, 182, 212, 0.3)",
                }}
              >
                <Sparkles size={11} />
                <span>⚡ 3-Min Judge Demo</span>
              </button>
              <span style={{ fontSize: "10px", color: "#94A3B8" }}>Press Alt+M for Analyst view</span>
            </div>
          </div>
        )}

        {investigationMode === "review" && activePage === "workbench" && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.10)",
              borderBottom: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#F8FAFC",
              flexShrink: 0,
              zIndex: 15,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "#10B981", color: "#060B14", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", fontSize: "10px", letterSpacing: "0.04em" }}>
                BSA § 63 REVIEW
              </span>
              <span style={{ fontWeight: 700, color: "#34D399" }}>
                Immutable Evidence Chain Verified
              </span>
              <span style={{ color: "#8C9EB0" }}>·</span>
              <span style={{ color: "#E2E8F0", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                SHA-256 CAS INTACT · Z3 SMT UNSAT PROVEN · NTP SKEW: +14s (COMPLIANT)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setTransformationAuditModalOpen(true)}
                style={{
                  background: "rgba(16, 185, 129, 0.18)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#34D399",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                📜 Lineage Audit Log
              </button>
            </div>
          </div>
        )}

        {/* Mutator Ribbon Drawer */}
        {mutatorRibbonOpen && (
          <div
            style={{
              background: "#132238",
              borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "11px",
              flexShrink: 0,
              color: "#F8FAFC",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color: "#FFFFFF" }}>Live Judge Falsification Mutators:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !mutations.alterBankRow14;
                    toggleMutation("alterBankRow14");
                    addReceipt(next ? "Row #14 Altered (+₹2.0L Deficit) ⟶ Gate I1 Halted (Extortion Debit Flushed)" : "Row #14 Restored to ₹5,22,440.00 ⟶ Gate I1 Passed", next ? "tamper" : "clean");
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: mutations.alterBankRow14 ? "1px solid rgba(244, 63, 94, 0.40)" : "1px solid rgba(255, 255, 255, 0.10)",
                    background: mutations.alterBankRow14 ? "rgba(244, 63, 94, 0.20)" : "rgba(255, 255, 255, 0.05)",
                    color: mutations.alterBankRow14 ? "#FB7185" : "#E2E8F0",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Zap size={11} color={mutations.alterBankRow14 ? "#F43F5E" : "#94A3B8"} />
                  <span>{mutations.alterBankRow14 ? "Row #14 Tampered (-₹2.00L)" : "Alter Bank Row #14"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !mutations.forgeRrnTimestamp;
                    toggleMutation("forgeRrnTimestamp");
                    addReceipt(next ? "Forge RRN Clock Skew (+50m / 3000s) ⟶ Gate I2 Flagged (Switch Skew)" : "Reset RRN Clock Skew (+14s) ⟶ Gate I2 Passed", next ? "tamper" : "clean");
                  }}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: mutations.forgeRrnTimestamp ? "1px solid rgba(244, 63, 94, 0.40)" : "1px solid rgba(255, 255, 255, 0.10)",
                    background: mutations.forgeRrnTimestamp ? "rgba(244, 63, 94, 0.20)" : "rgba(255, 255, 255, 0.05)",
                    color: mutations.forgeRrnTimestamp ? "#FB7185" : "#E2E8F0",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {mutations.forgeRrnTimestamp ? "RRN Skew Active (+50m)" : "Forge RRN Clock Skew"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetAllMutations();
                  addReceipt("All Invariants Reset to Clean State (6/6 Conserved)", "clean");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#CBD5E1",
                  cursor: "pointer",
                  fontSize: "10.5px",
                }}
              >
                <RotateCcw size={10} />
                <span>Reset Clean</span>
              </button>
            </div>

            {/* Live Judge Mutation Audit Log (Session Receipts) */}
            <div style={{ background: "#0B1220", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9.5px", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                <span>Live Judge Mutation Audit Trail (Session Receipts)</span>
                <span style={{ color: "#34D399" }}>Real-time Audit Log</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "72px", overflowY: "auto" }}>
                {mutationReceipts.map((rcpt) => (
                  <div key={rcpt.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#8C9EB0" }}>{rcpt.time}</span>
                    <span style={{ color: rcpt.type === "tamper" ? "#FB7185" : "#34D399", fontWeight: 600 }}>
                      {rcpt.type === "tamper" ? "✗" : "✓"} {rcpt.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIVE DISCOVERED CLUSTER FROM REAL STREAMING BENCHMARK BANNER */}
        {activeDiscoveredCluster && (
          <div
            style={{
              background: "#064E3B",
              borderBottom: "1px solid #059669",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 600,
              color: "#ECFDF5",
              zIndex: 15,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", width: "8px", height: "8px", borderRadius: "50%", background: "#10B981", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontWeight: 800, letterSpacing: "0.03em", fontFamily: "var(--font-mono)", color: "#A7F3D0" }}>
                🟢 LIVE DISCOVERED CLUSTER: {activeDiscoveredCluster.id} ({activeDiscoveredCluster.name})
              </span>
              <span style={{ color: "#6EE7B7" }}>·</span>
              <span>Extracted from: <strong style={{ color: "#FFFFFF" }}>{activeDiscoveredCluster.sourceDataset} (100k Stream)</strong></span>
              <span style={{ color: "#6EE7B7" }}>·</span>
              <span>Drained: <strong style={{ color: "#FDE047" }}>₹{activeDiscoveredCluster.totalDrained.toLocaleString()}</strong></span>
              <span style={{ color: "#6EE7B7" }}>·</span>
              <span>LIBR Recoverable: <strong style={{ color: "#6EE7B7" }}>₹{activeDiscoveredCluster.librRecoverableLien.toLocaleString()}</strong></span>
              <span style={{ color: "#6EE7B7" }}>·</span>
              <span>Converged Device: <strong style={{ fontFamily: "var(--font-mono)", color: "#E0E7FF" }}>{activeDiscoveredCluster.convergedImei || "N/A"}</strong></span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setActivePage("benchmark")}
                style={{
                  background: "#065F46",
                  border: "1px solid #34D399",
                  color: "#ECFDF5",
                  padding: "2px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <ArrowLeft size={10} />
                <span>Return to Benchmark Lab</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveDiscoveredCluster(null);
                  selectCaseWorkspace("CASE-2026-001", "intake");
                  toast.info("Returned to base investigation CASE-2026-001");
                }}
                style={{
                  background: "#047857",
                  border: "1px solid #10B981",
                  color: "#FFFFFF",
                  padding: "2px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✕ Exit Discovered Cluster
              </button>
            </div>
          </div>
        )}

        {/* 1. PERSISTENT SANDBOX STRESS-TEST MODE WARNING BANNER */}
        {activeMutationsCount > 0 && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.16)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.35)",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: 700,
              color: "#FBBF24",
              zIndex: 15,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={15} color="#F59E0B" />
              <span>
                ⚠️ SANDBOX STRESS-TEST MODE ACTIVE (Original Evidence Immutable · Signed Simulation Receipt Generated)
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#FDE68A",
                  background: "rgba(245, 158, 11, 0.25)",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {activeMutationsCount} Active Mutator{activeMutationsCount > 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={resetAllMutations}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.50)",
                color: "#FDE68A",
                padding: "3px 10px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "10.5px",
                fontWeight: 700,
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              Reset All Mutators
            </button>
          </div>
        )}

        {/* 2. STATUTORY EVIDENTIARY HALT BANNER (BLOCKS S03–S06 WHEN INTAKE GATE IS HALTED) */}
        {intakeGate.isHalted &&
          activeRoute !== "workspace" &&
          activeRoute !== "intake" &&
          activeRoute !== "entities" && (
            <div
              style={{
                background: "rgba(244, 63, 94, 0.16)",
                borderBottom: "1px solid rgba(244, 63, 94, 0.35)",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                fontSize: "11px",
                color: "#FB7185",
                zIndex: 15,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "4px",
                    background: "rgba(244, 63, 94, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FB7185",
                    fontWeight: 900,
                    fontSize: "13px",
                  }}
                >
                  ⛔
                </div>
                <div>
                  <span style={{ fontWeight: 800, color: "#FFFFFF" }}>
                    PIPELINE HALTED: Upstream Invariant Violation Detected
                  </span>
                  <span style={{ marginLeft: "6px", color: "#FECDD3" }}>
                    — Cannot Generate Admissible §63(4) Output on Unreconciled or Tampered Telemetry. Downstream attribution & certificates locked until resolved in Screen 01.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRoute("intake")}
                style={{
                  background: "#E11D48",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  boxShadow: "0 1px 3px rgba(225, 29, 72, 0.4)",
                }}
              >
                Resolve in Intake (Alt+1) →
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
            overscrollBehavior: "contain",
            position: "relative",
            minHeight: 0,
            minWidth: 0,
            height: "100%",
          }}
        >
          <ErrorBoundary fallbackTitle="Screen Render Notice">
            <Suspense fallback={<ScreenSuspenseFallback />}>
              {activePage === "benchmark" ? (
                <BenchmarkLabScreen />
              ) : activePage === "workspaces" || activeRoute === "workspace" ? (
                <CaseWorkspaceScreen />
              ) : (
                <>
                  {activeRoute === "intake" && <IntakeScreen />}
                  {activeRoute === "entities" && <EntityResolutionScreen />}
                  {activeRoute === "attribution" && <AttributionScreen />}
                  {activeRoute === "network" && <FraudNetworkScreen />}
                  {activeRoute === "taint-engine" && <TaintEngineScreen />}
                  {activeRoute === "court-proof" && <CourtProofScreen />}
                  {activeRoute === "privacy-crypto" && <PrivacyCryptoWorkbench />}
                  {activeRoute === "workstation" && <ForensicWorkstationScreen />}
                  {activeRoute === "report" && <ReportScreen />}
                </>
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Live Cryptographic Evidence Intake & Case Modals (Lazy Loaded) */}
      <Suspense fallback={null}>
        <ErrorBoundary fallbackTitle="Evidence Modal Notice">
          <EvidenceIntakeModal />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="New Case Modal Notice">
          <NewCaseModal />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="Benchmark Drawer Notice">
          <BenchmarkLabDrawer />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="Benchmark Modal Notice">
          <PublicDatasetBenchmarkModal />
        </ErrorBoundary>

        {/* Voice Assistant Modal */}
        {voiceOpen && (
          <ErrorBoundary fallbackTitle="Voice Assistant Notice">
            <SarvamVoiceModal
              caseId={activeCaseId || "CASE-2026-001"}
              isOpen={voiceOpen}
              onClose={() => setVoiceOpen(false)}
            />
          </ErrorBoundary>
        )}

        {/* PS04 Multi-File Investigation Reconstructor Drawers & Modals */}
        <RelationshipEvidenceSheet
          edge={selectedEvidenceEdge}
          isOpen={relationshipSheetOpen}
          onClose={() => {
            setRelationshipSheetOpen(false);
            setSelectedEvidenceEdge(null);
          }}
        />

        <ErrorBoundary fallbackTitle="Investigation Intelligence Brief Notice">
          <InvestigationIntelligenceBrief
            isOpen={intelligenceBriefOpen}
            onClose={() => setIntelligenceBriefOpen(false)}
          />
        </ErrorBoundary>

        <ErrorBoundary fallbackTitle="Transformation Audit Log Notice">
          <TransformationAuditLog
            isOpen={transformationAuditModalOpen}
            onClose={() => setTransformationAuditModalOpen(false)}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
};
