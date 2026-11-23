import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Boxes,
  Clock,
  Zap,
  GitFork,
  Search,
  FlaskConical,
  FileText,
  ShieldCheck,
  RefreshCw,
  FolderUp,
  FileCheck,
  PanelRight,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mic,
  Check,
  X,
  Plus,
  FileDown,
  Globe,
  Cpu,
  CheckCircle2,
  Sparkles,
  Play,
  UploadCloud,
  Eye,
  GitCompare,
} from "lucide-react";
import { forensicsApi } from "../../api/forensicsApi";
import type { ArtifactIntake, ProvenanceDAG, CounterfactualComparison } from "../../types/forensics";
import { EvidenceRegister } from "./EvidenceRegister";
import { ForensicTimeline, type TimelineEvent } from "./ForensicTimeline";
import { ContradictionPanel, type ContradictionItem, type EvidenceGapItem } from "./ContradictionPanel";
import { ProvenanceDAGView } from "../graphs/ProvenanceDAGView";
import { ChallengeDiffCard } from "./ChallengeDiffCard";
import { ForensicReportModal } from "./ForensicReportModal";
import { EvidenceIntakeModal } from "./EvidenceIntakeModal";
import { SarvamVoiceModal } from "./SarvamVoiceModal";
import { ForensicAssistantPanel } from "./ForensicAssistantPanel";
import { TarkaMinimalLanding } from "./TarkaMinimalLanding";
import { MultimodalInbox } from "./MultimodalInbox";
import { VisualForensicsViewer } from "./VisualForensicsViewer";
import { HypothesesWorkspace } from "./HypothesesWorkspace";
import { DemoArrowOverlay, DemoDirectorModal, useDemoDirector } from "./demo";

type WorkstationTab =
  | "landing"
  | "overview"
  | "inbox"
  | "evidence"
  | "visual"
  | "timeline"
  | "contradictions"
  | "hypotheses"
  | "provenance"
  | "gaps"
  | "robustness"
  | "reports"
  | "system";

type InspectorTab = "context" | "assistant" | "statutory";

export const TarkaForensicWorkstation: React.FC = () => {
  const [activeCaseId, setActiveCaseId] = useState<string>("upi_payment_discrepancy");
  const [cases, setCases] = useState<Array<{ case_id: string; title?: string; artifact_count?: number }>>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-IN");
  const [selectedVisualArtifactId, setSelectedVisualArtifactId] = useState<string>("");
  const getInitialTab = (): WorkstationTab => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") || p.get("nav");
      if (t && ["landing", "overview", "inbox", "evidence", "visual", "timeline", "contradictions", "hypotheses", "provenance", "gaps", "robustness", "reports", "system"].includes(t)) {
        return t as WorkstationTab;
      }
      if (p.get("view") === "workstation") {
        return "overview";
      }
    }
    return "landing";
  };

  const [activeTab, setActiveTabState] = useState<WorkstationTab>(getInitialTab);

  const setActiveTab = useCallback((tab: WorkstationTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab") || p.get("nav");
      if (t && ["overview", "inbox", "evidence", "visual", "timeline", "contradictions", "hypotheses", "provenance", "gaps", "robustness", "reports", "system"].includes(t)) {
        setActiveTabState(t as WorkstationTab);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);

  // Shell Layout State
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth > 1400 : false
  );
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("context");

  // Selection for Contextual Inspector
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactIntake | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [selectedContradiction, setSelectedContradiction] = useState<ContradictionItem | null>(null);
  const [selectedDagNodeId, setSelectedDagNodeId] = useState<string | null>(null);

  // Modals
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("voice") === "true"
  );
  const [isReportOpen, setIsReportOpen] = useState<boolean>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("report") === "true"
  );

  // Core Forensic Data
  const [artifacts, setArtifacts] = useState<ArtifactIntake[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
  const [gaps, setGaps] = useState<EvidenceGapItem[]>([]);
  const [provenanceDag, setProvenanceDag] = useState<ProvenanceDAG | null>(null);
  const [reportsList, setReportsList] = useState<Array<Record<string, unknown>>>([]);

  // Robustness Lab
  const [baselineRunId, setBaselineRunId] = useState<string>("run-001");
  const [selectedExclusions, setSelectedExclusions] = useState<string[]>(["ART-004-BCCD4200"]);
  const [runningChallenge, setRunningChallenge] = useState<boolean>(false);
  const [challengeResult, setChallengeResult] = useState<CounterfactualComparison | null>(null);

  // Demo Director State
  const [isDemoDirectorOpen, setIsDemoDirectorOpen] = useState<boolean>(false);

  // System & Health Status
  const [engineHealth, setEngineHealth] = useState<Record<string, unknown> | null>(null);
  const [sarvamStatus, setSarvamStatus] = useState<Record<string, unknown> | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>("INVESTIGATOR_DELHI");

  const runRobustnessChallenge = useCallback(async () => {
    try {
      setRunningChallenge(true);
      const res = await forensicsApi.runChallenge(activeCaseId, baselineRunId, selectedExclusions);
      setChallengeResult(res);
    } catch (e) {
      console.error("Robustness run failed:", e);
    } finally {
      setRunningChallenge(false);
    }
  }, [activeCaseId, baselineRunId, selectedExclusions]);

  const loadCaseData = useCallback(async (caseId: string) => {
    try {
      setLoading(true);
      setAuthError(null);

      const existingToken = sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token");
      if (!existingToken && currentUser === "INVESTIGATOR_DELHI") {
        try {
          await forensicsApi.login("INVESTIGATOR_DELHI");
        } catch (e) {
          console.warn("Auth token acquisition failed:", e);
        }
      }

      const [arts, tl, contras, dag, reps] = await Promise.all([
        forensicsApi.listArtifacts(caseId),
        forensicsApi.getTimeline(caseId).catch(() => ({ events: [] })),
        forensicsApi.getContradictions(caseId).catch(() => ({ contradictions: [], evidence_gaps: [] })),
        forensicsApi.getProvenanceDag(caseId).catch(() => null),
        forensicsApi.listReports(caseId).catch(() => []),
      ]);

      const loadedArts = Array.isArray(arts) ? arts : [];
      setArtifacts(loadedArts);
      setTimelineEvents((Array.isArray(tl?.events) ? tl.events : []) as TimelineEvent[]);
      const loadedContras = (Array.isArray(contras?.contradictions) ? contras.contradictions : []) as ContradictionItem[];
      setContradictions(loadedContras);
      setGaps((Array.isArray(contras?.evidence_gaps) ? contras.evidence_gaps : []) as EvidenceGapItem[]);
      if (contras?.run_id) setBaselineRunId(contras.run_id);
      setProvenanceDag(dag && dag.nodes ? dag : null);
      setReportsList(Array.isArray(reps) ? reps : []);

      // Auto-select initial context if not selected
      if (loadedContras.length > 0 && !selectedContradiction) {
        setSelectedContradiction(loadedContras[0]);
      }
      if (loadedArts.length > 0 && !selectedArtifact) {
        setSelectedArtifact(loadedArts[0]);
      }
    } catch (err: unknown) {
      console.error("Failed to load case data:", err);
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axErr?.response?.status === 401) {
        setAuthError("HTTP 401: Authentication required. Session token missing or invalid.");
      } else if (axErr?.response?.status === 403) {
        setAuthError(`HTTP 403: Case scope forbidden. ${axErr.response.data?.detail || ""}`);
      } else {
        setAuthError("Failed to fetch case data from backend.");
      }
      setArtifacts([]);
      setTimelineEvents([]);
      setContradictions([]);
      setGaps([]);
      setReportsList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedContradiction, selectedArtifact]);

  const switchInvestigator = async (userKey: string) => {
    try {
      setLoading(true);
      await forensicsApi.login(userKey);
      setCurrentUser(userKey);
      await loadCaseData(activeCaseId);
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (window as unknown as { __switchInvestigator: (k: string) => Promise<void> }).__switchInvestigator = switchInvestigator;
  }, [switchInvestigator]);

  useEffect(() => {
    const initAuthAndLoad = async () => {
      const existingToken = sessionStorage.getItem("sentinelx_auth_token");
      if (!existingToken) {
        try {
          await forensicsApi.login("INVESTIGATOR_DELHI");
          setCurrentUser("INVESTIGATOR_DELHI");
        } catch (e) {
          console.warn("Auto-login failed:", e);
        }
      }

      try {
        const caseList = await forensicsApi.listCases();
        if (Array.isArray(caseList) && caseList.length > 0) {
          setCases(caseList);
        }
      } catch (e) {
        console.warn("Failed to load cases:", e);
      }

      try {
        const health = await forensicsApi.getHealth();
        setEngineHealth(health);
      } catch (e) {
        console.warn("Failed to load engine health:", e);
      }

      try {
        const sarvam = await forensicsApi.getSarvamStatus();
        setSarvamStatus(sarvam);
      } catch (e) {
        console.warn("Failed to load Sarvam status:", e);
      }

      await loadCaseData(activeCaseId);
    };

    initAuthAndLoad();
  }, [activeCaseId, loadCaseData]);

  const handleSeedSynthetic = async () => {
    try {
      setSeeding(true);
      await forensicsApi.seedSyntheticCase(activeCaseId);
      await loadCaseData(activeCaseId);
    } catch (err) {
      console.error("Seed error:", err);
      alert("Failed to seed synthetic case: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSeeding(false);
    }
  };

  // Demo Director Orchestrator
  const demo = useDemoDirector({
    activeTab,
    setActiveTab,
    caseId: activeCaseId,
    onRefreshCase: () => loadCaseData(activeCaseId),
    onOpenReportModal: setIsReportOpen,
    onExecuteRobustness: runRobustnessChallenge,
  });

  // URL auto-launch support (?demo=true / ?demo=start)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("demo") === "true" || p.get("demo") === "start") {
        setIsDemoDirectorOpen(true);
        demo.runPreflight().then((passed) => {
          if (passed && p.get("autoplay") === "true") {
            setIsDemoDirectorOpen(false);
            demo.startDemo();
          }
        });
      }
    }
  }, []);

  const navItems: Array<{ id: WorkstationTab; label: string; icon: React.ReactNode; count?: number; badgeType?: "danger" | "warning" }> = [
    { id: "landing", label: "Voice Landing", icon: <Sparkles size={15} strokeWidth={1.75} /> },
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} strokeWidth={1.75} /> },
    { id: "inbox", label: "Multimodal Intake", icon: <UploadCloud size={15} strokeWidth={1.75} /> },
    { id: "evidence", label: "Evidence Ledger", icon: <Boxes size={15} strokeWidth={1.75} />, count: artifacts.length },
    { id: "visual", label: "Visual TRACE (ELA)", icon: <Eye size={15} strokeWidth={1.75} /> },
    { id: "timeline", label: "Timeline", icon: <Clock size={15} strokeWidth={1.75} />, count: timelineEvents.length },
    { id: "contradictions", label: "Contradictions & MUS", icon: <Zap size={15} strokeWidth={1.75} />, count: contradictions.length, badgeType: contradictions.length > 0 ? "danger" : undefined },
    { id: "hypotheses", label: "Competing Hypotheses", icon: <GitCompare size={15} strokeWidth={1.75} /> },
    { id: "provenance", label: "Provenance DAG", icon: <GitFork size={15} strokeWidth={1.75} /> },
    { id: "gaps", label: "Evidence Gaps", icon: <Search size={15} strokeWidth={1.75} />, count: gaps.length, badgeType: gaps.length > 0 ? "warning" : undefined },
    { id: "robustness", label: "Robustness Lab", icon: <FlaskConical size={15} strokeWidth={1.75} /> },
    { id: "reports", label: "Statutory Reports", icon: <FileText size={15} strokeWidth={1.75} />, count: reportsList.length },
    { id: "system", label: "System Health", icon: <ShieldCheck size={15} strokeWidth={1.75} /> },
  ];

  if (activeTab === "landing") {
    return (
      <div className="glass-shell tarka-liquid-glass" style={{ minHeight: "100vh" }}>
        <TarkaMinimalLanding
          onOpenWorkstation={(targetTab) => setActiveTab((targetTab as WorkstationTab) || "overview")}
          onActivateVoice={() => setIsVoiceOpen(true)}
          isVoiceActive={isVoiceOpen}
          voiceState={isVoiceOpen ? "listening" : "idle"}
          audioLevel={0}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          activeCaseId={activeCaseId}
          onSelectCase={setActiveCaseId}
          cases={cases}
          reportCount={reportsList.length}
          onOpenDemoDirector={() => setIsDemoDirectorOpen(true)}
        />

        <SarvamVoiceModal
          caseId={activeCaseId}
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          onActionExecuted={() => loadCaseData(activeCaseId)}
          onNavigateView={(view) => {
            if (["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(view)) {
              setActiveTab(view as WorkstationTab);
            }
          }}
        />

        <ForensicReportModal
          caseId={activeCaseId}
          runId={baselineRunId}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          onReportGenerated={() => loadCaseData(activeCaseId)}
        />

        {/* Demo Director Guided Tour Overlay & Preflight Modal on Landing */}
        {demo.currentScene && (demo.state === "RUNNING" || demo.state === "PAUSED") && (
          <DemoArrowOverlay
            scene={demo.currentScene}
            sceneIndex={demo.currentSceneIndex}
            totalScenes={demo.totalScenes}
            controls={demo}
          />
        )}

        <DemoDirectorModal
          isOpen={isDemoDirectorOpen}
          onClose={() => setIsDemoDirectorOpen(false)}
          preflight={demo.preflight}
          onRunPreflight={demo.runPreflight}
          onStartDemo={async () => {
            setIsDemoDirectorOpen(false);
            await demo.startDemo();
          }}
          demoState={demo.state}
        />
      </div>
    );
  }

  return (
    <div className="glass-shell tarka-liquid-glass">
      {/* 1. Compact, Refined Top Application Bar */}
      <header className="glass-topbar lg-topbar">
        {/* Brand & Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontFamily: "'IBM Plex Serif', Georgia, serif",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                color: "#FFFFFF",
                textShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
              }}
            >
              TARKA
            </span>
            <span style={{ fontSize: "14px", color: "#60A5FA", fontWeight: 600 }}>तर्क</span>
          </div>

          <div className="lg-badge lg-badge-blue">
            SUTRAM 2026 • DIGITAL FORENSICS
          </div>

          {/* Active Case Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
            <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>CASE:</span>
            <select
              value={activeCaseId}
              onChange={(e) => setActiveCaseId(e.target.value)}
              className="glass-input lg-select"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", padding: "4px 8px" }}
            >
              <option value="upi_payment_discrepancy">upi_payment_discrepancy (SUTRAM Benchmark)</option>
              {cases
                .filter((c) => c.case_id !== "upi_payment_discrepancy")
                .map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} {c.title ? `— ${c.title}` : ""}
                  </option>
                ))}
            </select>

            <button
              id="btn-seed-synthetic"
              onClick={handleSeedSynthetic}
              disabled={seeding}
              className="lg-btn lg-btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
              title="Re-seed canonical multi-source synthetic test case"
            >
              <RefreshCw size={11} strokeWidth={2} className={seeding ? "animate-spin" : ""} />
              <span>{seeding ? "Seeding..." : "Seed Synthetic Case"}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Voice & Prompt Capsule (Center of Topbar - Phase 10 Skeuomorphic Spec) */}
        <div className="dynamic-capsule-bar" style={{ minWidth: "360px", maxWidth: "460px", margin: "0 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isVoiceOpen ? "#F43F5E" : "#3B82F6",
                boxShadow: isVoiceOpen ? "0 0 10px #F43F5E" : "0 0 8px #3B82F6",
              }}
            />
            <span style={{ fontSize: "11px", color: "#93C5FD", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>TARKA</span>
          </div>
          <input
            type="text"
            placeholder="Inquire: 'Reconcile ₹25,000 receipt against bank statement'..."
            className="capsule-prompt-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsVoiceOpen(true);
              }
            }}
          />
          <button
            onClick={() => setIsVoiceOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#60A5FA",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "2px",
            }}
            title="Open Ambient Voice Interrogation"
          >
            <Mic size={14} />
          </button>
        </div>

        {/* Global Workstation Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Autonomous Demo Director Button */}
          <button
            id="btn-autonomous-demo"
            data-testid="btn-autonomous-demo-workstation"
            onClick={() => setIsDemoDirectorOpen(true)}
            className="lg-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(37, 99, 235, 0.25)",
              border: "1px solid #3B82F6",
              color: "#93C5FD",
              fontWeight: 600,
              fontSize: "11px",
              padding: "5px 12px",
            }}
            title="Open TARKA Autonomous Demo Director"
          >
            <Play size={12} fill="#60A5FA" strokeWidth={0} />
            <span>Autonomous Demo</span>
          </button>

          {/* Voice Landing Button */}
          <button
            id="btn-voice-landing"
            onClick={() => setActiveTab("landing")}
            className="lg-btn lg-btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Return to Minimal Voice Landing Screen"
          >
            <Sparkles size={13} strokeWidth={2} />
            <span>Voice Landing</span>
          </button>

          {/* Evidence Intake Button */}
          <button
            id="btn-evidence-intake"
            onClick={() => setIsIntakeOpen(true)}
            className="lg-btn lg-btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FolderUp size={13} strokeWidth={2} />
            <span>Evidence Intake</span>
          </button>

          {/* Section 63 BSA Report Action */}
          <button
            id="btn-bsa-report"
            onClick={() => setIsReportOpen(true)}
            className="lg-btn lg-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FileCheck size={13} strokeWidth={2} />
            <span>Section 63 BSA Report</span>
          </button>

          {/* TARKA Ambient Voice Assistant Trigger */}
          <button
            id="btn-tarka-voice"
            onClick={() => setIsVoiceOpen(true)}
            className="lg-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              border: "1px solid #3B82F6",
              color: "#93C5FD",
              fontWeight: 600,
            }}
            title="Open TARKA Ambient Multilingual Voice Assistant"
          >
            <Mic size={13} strokeWidth={2} style={{ color: "#60A5FA" }} />
            <span>Ambient Voice</span>
          </button>

          {/* Active Jurisdiction / RBAC Identity Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(18, 22, 31, 0.8)",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "11px",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span style={{ color: "#9CA3AF" }}>Officer:</span>
            <select
              id="select-officer"
              value={currentUser}
              onChange={(e) => switchInvestigator(e.target.value)}
              style={{
                backgroundColor: "transparent",
                color: currentUser === "INVESTIGATOR_DELHI" ? "#60A5FA" : "#F43F5E",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
              title="Switch RBAC Investigator Identity to test cross-case authorization boundary"
            >
              <option value="INVESTIGATOR_DELHI" style={{ backgroundColor: "#141822", color: "#60A5FA" }}>
                Insp. Vikramaditya (Delhi - Authorized)
              </option>
              <option value="INVESTIGATOR_GURUGRAM" style={{ backgroundColor: "#141822", color: "#F43F5E" }}>
                Insp. R. Singh (Gurugram - Unauthorized)
              </option>
            </select>
          </div>

          {/* System Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "11px",
            }}
            title={`Z3 Solver: ${engineHealth?.solver || "v5.1.0"} • Sarvam: ${sarvamStatus?.mode || "Local Fallback"}`}
          >
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 6px #10B981" }} />
            <span style={{ color: "#D1D5DB", fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px" }}>Z3 ACTIVE</span>
          </div>

          {/* Inspector Toggle Button */}
          <button
            id="btn-toggle-inspector"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`lg-btn ${isInspectorOpen ? "lg-btn-secondary" : "lg-btn-subtle"}`}
            style={{ padding: "5px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Toggle Right Contextual Inspector"
          >
            <PanelRight size={13} strokeWidth={2} />
            <span>Inspector</span>
          </button>
        </div>
      </header>

      {/* Auth Error Banner if Cross-Case Boundary Triggered */}
      {authError && (
        <div
          style={{
            padding: "8px 20px",
            backgroundColor: "rgba(244, 63, 94, 0.15)",
            borderBottom: "1px solid rgba(244, 63, 94, 0.4)",
            color: "#FECDD3",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 45,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} strokeWidth={2} color="#F43F5E" />
            <span><strong>Access Denied:</strong> {authError}</span>
          </div>
          <button
            onClick={() => switchInvestigator("INVESTIGATOR_DELHI")}
            className="lg-btn lg-btn-secondary"
            style={{ padding: "3px 8px", fontSize: "11px", borderColor: "#F43F5E", color: "#F43F5E" }}
          >
            Switch to Authorized Delhi Officer
          </button>
        </div>
      )}

      {/* 2. Main Workspace Shell: Left Rail + Center Canvas + Right Inspector */}
      <div className="glass-workspace-shell lg-workspace-shell">
        {/* Left Navigation Rail (Skeuomorphic & Curved 3D Glass - LUMEN Reference Spec) */}
        <aside className={`glass-left-rail lg-left-rail ${isLeftRailCollapsed ? "collapsed" : ""} curved-glass-sidebar`} style={{ margin: "12px 0 12px 12px", height: "calc(100vh - 84px)" }}>
          {!isLeftRailCollapsed && (
            <div style={{ padding: "16px 14px 12px 14px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#FFFFFF",
                    boxShadow: "0 0 12px rgba(59, 130, 246, 0.5)",
                  }}
                >
                  VI
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>Vikramaditya</span>
                    <span className="lg-badge lg-badge-emerald" style={{ fontSize: "9px", padding: "1px 5px" }}>PRO</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "'IBM Plex Mono', monospace" }}>
                    UID: 604218935
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="lg-nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                  }}
                  className={`glass-control lg-nav-item ${isActive ? "glass-control-active active" : ""}`}
                  title={isLeftRailCollapsed ? item.label : undefined}
                >
                  <span className="lg-nav-icon">{item.icon}</span>
                  {!isLeftRailCollapsed && <span>{item.label}</span>}
                  {!isLeftRailCollapsed && typeof item.count === "number" && (
                    <span className={`lg-nav-badge ${item.badgeType ? item.badgeType : ""}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bulletin Notice Card (LUMEN Spec) */}
          {!isLeftRailCollapsed && (
            <div style={{ padding: "0 10px 10px 10px", marginTop: "auto" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(30, 41, 59, 0.45)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#93C5FD", marginBottom: "4px" }}>
                  <ShieldCheck size={12} color="#60A5FA" />
                  <span>LEGAL NOTICE</span>
                </div>
                <div style={{ fontSize: "10px", color: "#94A3B8", lineHeight: 1.35 }}>
                  Section 63 BSA & Section 94 BNSS statutory rules strictly enforced.
                </div>
              </div>
            </div>
          )}

          {/* Rail Collapse Toggle */}
          <div style={{ paddingTop: "8px", borderTop: "1px solid var(--glass-border-subtle)" }}>
            <button
              id="btn-collapse-rail"
              onClick={() => setIsLeftRailCollapsed((prev) => !prev)}
              className="glass-control lg-nav-item"
              style={{ fontSize: "11px", color: "#6B7280", display: "flex", alignItems: "center", gap: "6px" }}
              title="Toggle sidebar width"
            >
              <span className="lg-nav-icon">
                {isLeftRailCollapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
              </span>
              {!isLeftRailCollapsed && <span>Collapse Rail</span>}
            </button>
          </div>
        </aside>

        {/* 3. Spacious Central Investigation Workspace */}
        <main className="glass-center-canvas lg-center-canvas">
          {loading ? (
            <div style={{ textAlign: "center", padding: "100px 0", color: "#9CA3AF" }}>
              <div style={{ display: "inline-block", width: "24px", height: "24px", borderRadius: "50%", border: "2px solid #3B82F6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: "13px", fontWeight: 500, marginTop: "12px", fontFamily: "'IBM Plex Mono', monospace" }}>
                Loading cryptographic evidence & Z3 solver state...
              </div>
            </div>
          ) : (
            <>
              {/* Breadcrumb / Title Bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#6B7280", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Case Workspace / {activeTab}
                  </div>
                  <h1 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>
                    {navItems.find((n) => n.id === activeTab)?.label || "Investigation"}
                  </h1>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => loadCaseData(activeCaseId)}
                    className="lg-btn lg-btn-subtle"
                    style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                  >
                    <RefreshCw size={11} strokeWidth={2} />
                    <span>Sync Solver</span>
                  </button>
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Executive Briefing Banner */}
                  <div
                    className="glass-panel lg-card"
                    data-testid="workstation-statutory-banner"
                    style={{ position: "relative", overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="lg-badge lg-badge-emerald">CANONICAL SYNTHETIC CASE</span>
                          <span className="lg-badge lg-badge-blue">BSA § 63 CERTIFIED WORKSPACE</span>
                          <span style={{ fontSize: "11px", color: "#6B7280", fontFamily: "'IBM Plex Mono', monospace" }}>
                            Run ID: {baselineRunId}
                          </span>
                        </div>
                        <h2 style={{ margin: "10px 0 6px", fontSize: "17px", fontWeight: 700, color: "#FFFFFF" }}>
                          UPI Payment Discrepancy Investigation
                        </h2>
                        <p style={{ margin: 0, fontSize: "13px", color: "#9CA3AF", lineHeight: 1.5, maxWidth: "780px" }}>
                          Investigation of ₹25,000 digital payment discrepancy across core banking CBS ledger, CDR telecom records, WhatsApp extraction, and conflicting claims receipts. Governed strictly under the Bharatiya Sakshya Adhiniyam, 2023 (Section 63) and deterministic Z3 SMT solver invariants.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          id="btn-voice-inquire"
                          onClick={() => setIsVoiceOpen(true)}
                          className="lg-btn lg-btn-secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Mic size={13} strokeWidth={2} />
                          <span>Voice Inquire</span>
                        </button>
                        <button
                          onClick={() => setIsReportOpen(true)}
                          className="lg-btn lg-btn-primary"
                        >
                          Generate Official Audit Report
                        </button>
                      </div>
                    </div>

                    {/* 4 Key Forensic Metrics Tiles */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: "14px",
                        marginTop: "20px",
                        paddingTop: "16px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div
                        onClick={() => setActiveTab("evidence")}
                        className="glass-panel glass-panel-interactive lg-card lg-card-interactive"
                        style={{ padding: "14px" }}
                      >
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>REGISTERED EVIDENCE</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#F3F4F6", marginTop: "4px" }}>
                          {artifacts.length} Artifacts
                        </div>
                        <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Check size={12} strokeWidth={2.5} />
                          <span>100% Bitstream Verified</span>
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab("contradictions")}
                        className="glass-panel glass-panel-interactive lg-card lg-card-interactive"
                        style={{ padding: "14px", borderColor: contradictions.length > 0 ? "rgba(244, 63, 94, 0.35)" : undefined }}
                      >
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>MATHEMATICAL CONTRADICTIONS</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#F43F5E", marginTop: "4px" }}>
                          {contradictions.length} Detected
                        </div>
                        <div style={{ fontSize: "11px", color: "#FB7185", marginTop: "2px" }}>
                          Z3 SMT Solver MUS Isolated
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab("gaps")}
                        className="glass-panel glass-panel-interactive lg-card lg-card-interactive"
                        style={{ padding: "14px", borderColor: gaps.length > 0 ? "rgba(245, 158, 11, 0.35)" : undefined }}
                      >
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>EVIDENTIARY GAPS</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#F59E0B", marginTop: "4px" }}>
                          {gaps.length} Actionable Leads
                        </div>
                        <div style={{ fontSize: "11px", color: "#FBBF24", marginTop: "2px" }}>
                          Missing Subscriber CAF & Logs
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab("timeline")}
                        className="glass-panel glass-panel-interactive lg-card lg-card-interactive"
                        style={{ padding: "14px" }}
                      >
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600 }}>CHRONOLOGICAL EVENTS</div>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: "#60A5FA", marginTop: "4px" }}>
                          {timelineEvents.length} Events
                        </div>
                        <div style={{ fontSize: "11px", color: "#93C5FD", marginTop: "2px" }}>
                          Preserving Clock Uncertainty
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Split Quick View: Contradictions & Evidence */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px" }}>
                    {/* Contradictions Quick Card */}
                    <div className="glass-panel lg-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Zap size={14} strokeWidth={2} color="#F43F5E" />
                          <span>Material Contradictions (Z3 Solver)</span>
                        </h2>
                        <button
                          onClick={() => setActiveTab("contradictions")}
                          style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
                        >
                          View All ({contradictions.length}) →
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(contradictions || []).slice(0, 3).map((c, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedContradiction(c);
                              setInspectorTab("context");
                              if (!isInspectorOpen) setIsInspectorOpen(true);
                            }}
                            style={{
                              padding: "12px 14px",
                              backgroundColor: "rgba(18, 22, 32, 0.6)",
                              borderLeft: "3px solid #F43F5E",
                              borderRadius: "6px",
                              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                              borderRight: "1px solid rgba(255, 255, 255, 0.05)",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            className="lg-card-interactive"
                          >
                            <div style={{ fontWeight: 600, fontSize: "12px", color: "#FECDD3" }}>{c.title}</div>
                            <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px", lineHeight: 1.4 }}>
                              {c.rule_firing_reason || "Mathematical inconsistency detected between verified sources."}
                            </div>
                            <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "6px", fontFamily: "'IBM Plex Mono', monospace" }}>
                              Category: {c.category} • Severity: {c.severity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Registered Artifacts Quick Card */}
                    <div className="glass-panel lg-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Boxes size={14} strokeWidth={2} color="#60A5FA" />
                          <span>Verified Evidence Manifest</span>
                        </h2>
                        <button
                          onClick={() => setActiveTab("evidence")}
                          style={{ background: "none", border: "none", color: "#60A5FA", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
                        >
                          View All ({artifacts.length}) →
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(artifacts || []).slice(0, 4).map((art, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedArtifact(art);
                              setInspectorTab("context");
                              if (!isInspectorOpen) setIsInspectorOpen(true);
                            }}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 12px",
                              backgroundColor: "rgba(18, 22, 32, 0.6)",
                              borderRadius: "6px",
                              fontSize: "12px",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            className="lg-card-interactive"
                          >
                            <div>
                              <span style={{ fontWeight: 500, color: "#E5E7EB" }}>{art.filename}</span>
                              <div style={{ fontSize: "10px", color: "#6B7280", fontFamily: "'IBM Plex Mono', monospace", marginTop: "2px" }}>
                                SHA: {art.sha256?.substring(0, 16)}...
                              </div>
                            </div>
                            <span className={art.source_tier === "T1" ? "lg-badge lg-badge-emerald" : "lg-badge lg-badge-blue"}>
                              {art.source_tier}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MULTIMODAL EVIDENCE INTAKE TAB (PHASE 10) */}
              {activeTab === "inbox" && (
                <MultimodalInbox
                  caseId={activeCaseId}
                  onEvidenceAdmitted={() => loadCaseData(activeCaseId)}
                  onSelectArtifact={(aid) => {
                    setSelectedVisualArtifactId(aid);
                    setActiveTab("visual");
                  }}
                />
              )}

              {/* VISUAL FORENSICS & ELA VIEWER TAB (PHASE 10) */}
              {activeTab === "visual" && (
                <VisualForensicsViewer
                  caseId={activeCaseId}
                  artifactId={selectedVisualArtifactId}
                />
              )}

              {/* COMPETING HYPOTHESES & GAPS TAB (PHASE 10) */}
              {activeTab === "hypotheses" && (
                <HypothesesWorkspace caseId={activeCaseId} />
              )}

              {/* EVIDENCE LEDGER TAB */}
              {activeTab === "evidence" && (
                <EvidenceRegister
                  caseId={activeCaseId}
                  artifacts={artifacts}
                  onRefresh={() => loadCaseData(activeCaseId)}
                  onSelectArtifact={(art) => {
                    setSelectedArtifact(art);
                    setInspectorTab("context");
                    if (!isInspectorOpen) setIsInspectorOpen(true);
                  }}
                  selectedArtifactId={selectedArtifact?.artifact_id}
                />
              )}

              {/* TIMELINE TAB */}
              {activeTab === "timeline" && (
                <ForensicTimeline
                  events={timelineEvents}
                  onSelectEvent={(evt) => {
                    setSelectedEvent(evt);
                    setInspectorTab("context");
                    if (!isInspectorOpen) setIsInspectorOpen(true);
                  }}
                  selectedEventId={selectedEvent?.event_id}
                />
              )}

              {/* CONTRADICTIONS TAB */}
              {activeTab === "contradictions" && (
                <ContradictionPanel
                  caseId={activeCaseId}
                  contradictions={contradictions}
                  gaps={gaps}
                  onReviewAction={() => loadCaseData(activeCaseId)}
                />
              )}

              {/* PROVENANCE DAG TAB */}
              {activeTab === "provenance" && (
                <div data-testid="provenance-dag-container">
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                      Bidirectional traceability connecting raw preserved bytes to facts, Z3 SMT constraints, and statutory findings.
                    </p>
                  </div>
                  <ProvenanceDAGView
                    dag={provenanceDag}
                    selectedNodeId={selectedDagNodeId || undefined}
                    onSelectNode={(nodeId) => {
                      setSelectedDagNodeId(nodeId);
                      setInspectorTab("context");
                      if (!isInspectorOpen) setIsInspectorOpen(true);
                    }}
                  />
                </div>
              )}

              {/* EVIDENCE GAPS TAB */}
              {activeTab === "gaps" && (
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                      Absence of evidence is not proof of absence. Formal requisition notices under Section 94 BNSS / Section 91 CrPC.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {gaps.map((g, i) => (
                      <div
                        key={i}
                        className="lg-card"
                        style={{ borderLeft: "4px solid #F59E0B" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ fontWeight: 600, fontSize: "14px", color: "#FDE68A" }}>{g.title}</div>
                          <span className="lg-badge lg-badge-amber">
                            {g.category}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#E5E7EB", marginTop: "8px", lineHeight: 1.5 }}>
                          {g.why_it_matters}
                        </div>
                        {g.suggested_remedy && (
                          <div style={{ marginTop: "12px", fontSize: "12px", color: "#93C5FD", backgroundColor: "rgba(18, 24, 38, 0.8)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                            <strong>Recommended Statutory Requisition:</strong> {g.suggested_remedy}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ROBUSTNESS LAB TAB */}
              {activeTab === "robustness" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="lg-card">
                    <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#F3F4F6", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FlaskConical size={16} strokeWidth={2} color="#60A5FA" />
                      <span>Evidence Robustness Lab: Counterfactual Artifact Exclusion</span>
                    </h2>
                    <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "6px", lineHeight: 1.5 }}>
                      Test whether detected contradictions dissolve or survive when a disputed artifact (e.g. unverified payment receipt screenshot) is excluded. Recomputes dependencies via the Z3 SMT solver without modifying the canonical case record.
                    </p>

                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF", marginBottom: "8px", fontFamily: "'IBM Plex Mono', monospace" }}>
                        SELECT ARTIFACTS TO EXCLUDE IN COUNTERFACTUAL CHALLENGE:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {artifacts.map((art) => {
                          const isSelected = selectedExclusions.includes(art.artifact_id);
                          return (
                            <button
                              key={art.artifact_id}
                              onClick={() => {
                                setSelectedExclusions((prev) =>
                                  isSelected ? prev.filter((id) => id !== art.artifact_id) : [...prev, art.artifact_id]
                                );
                              }}
                              className={`lg-btn ${isSelected ? "lg-btn-primary" : "lg-btn-secondary"}`}
                              style={{
                                backgroundColor: isSelected ? "rgba(239, 68, 68, 0.2)" : undefined,
                                borderColor: isSelected ? "#EF4444" : undefined,
                                color: isSelected ? "#FEE2E2" : undefined,
                                fontSize: "11px",
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {isSelected ? <X size={11} strokeWidth={2.5} /> : <Plus size={11} strokeWidth={2.5} />}
                                <span>{isSelected ? "Exclude" : "Keep"}</span>
                              </span>
                              <span>{art.filename}</span>
                              <span style={{ fontSize: "10px", opacity: 0.7, fontFamily: "'IBM Plex Mono', monospace" }}>({art.artifact_id})</span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                        <button
                          id="btn-execute-challenge"
                          data-testid="btn-execute-challenge"
                          onClick={runRobustnessChallenge}
                          disabled={runningChallenge}
                          className="lg-btn lg-btn-primary"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <Zap size={13} strokeWidth={2} />
                          <span>{runningChallenge ? "Solving Counterfactual Z3 SMT Graph..." : "Execute Robustness Challenge"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {challengeResult && (
                    <div className="lg-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                        Counterfactual Challenge Findings (Run: {challengeResult.challenge_run_id})
                      </h3>
                      {challengeResult.dissolved_contradictions?.map((f) => (
                        <ChallengeDiffCard key={f.finding_id} changeType="REMOVED_CONTRADICTION" finding={f} />
                      ))}
                      {challengeResult.surviving_findings?.map((f) => (
                        <ChallengeDiffCard key={f.finding_id} changeType="SURVIVING" finding={f} />
                      ))}
                      {challengeResult.removed_findings?.map((f) => (
                        <ChallengeDiffCard key={f.finding_id} changeType="REMOVED" finding={f} />
                      ))}
                      {challengeResult.new_findings?.map((f) => (
                        <ChallengeDiffCard key={f.finding_id} changeType="NEW" finding={f} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* REPORTS TAB */}
              {activeTab === "reports" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
                      Official forensic certificates generated in compliance with Section 63 Bharatiya Sakshya Adhiniyam, 2023.
                    </p>
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="lg-btn lg-btn-primary"
                    >
                      + Generate New Section 63 Report
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {reportsList.length === 0 ? (
                      <div className="lg-card" style={{ textAlign: "center", padding: "40px 0", color: "#6B7280", fontSize: "13px" }}>
                        No statutory reports recorded for this case yet. Click "Generate New Section 63 Report" above.
                      </div>
                    ) : (
                      reportsList.map((rep, idx) => {
                        const repMeta = (rep.metadata || rep.report_metadata || {}) as Record<string, unknown>;
                        const repId = String(rep.report_id || repMeta.report_id || `REP-${idx + 1}`);
                        const fingerprint = String(rep.fingerprint || repMeta.fingerprint || "N/A");
                        const genAtRaw = rep.generated_at_iso || repMeta.generated_at_iso;
                        const genAt = genAtRaw ? String(genAtRaw) : null;

                        return (
                          <div
                            key={idx}
                            className="lg-card"
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontWeight: 600, fontSize: "14px", color: "#F3F4F6" }}>{repId}</span>
                                <span className="lg-badge lg-badge-emerald">BSA § 63 COMPLIANT</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px", fontFamily: "'IBM Plex Mono', monospace" }}>
                                Fingerprint: <span style={{ color: "#A7F3D0" }}>{fingerprint}</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                                Generated: {genAt ? new Date(genAt).toLocaleString() : "Unknown"}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={async () => {
                                  const blob = await forensicsApi.exportReport(activeCaseId, repId, "pdf");
                                  const url = URL.createObjectURL(blob as Blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `tarka_bsa63_${activeCaseId}_${repId}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="lg-btn lg-btn-primary"
                                style={{ padding: "5px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                <FileDown size={12} strokeWidth={2} />
                                <span>Download PDF</span>
                              </button>
                              <button
                                onClick={async () => {
                                  const blob = await forensicsApi.exportReport(activeCaseId, repId, "html");
                                  const url = URL.createObjectURL(blob as Blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `tarka_bsa63_${activeCaseId}_${repId}.html`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="lg-btn lg-btn-secondary"
                                style={{ padding: "5px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                              >
                                <Globe size={12} strokeWidth={2} />
                                <span>View HTML</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SYSTEM STATUS TAB */}
              {activeTab === "system" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                    <div className="lg-card">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#60A5FA", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Cpu size={14} strokeWidth={2} />
                        <span>Z3 SMT Solver & Forensics Engine</span>
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.8 }}>
                        <div>Status: <span style={{ color: "#34D399", fontWeight: 600 }}>{String(engineHealth?.status || "HEALTHY").toUpperCase()}</span></div>
                        <div>Engine: {String(engineHealth?.engine || "TARKA Digital Forensics Engine")}</div>
                        <div>Solver: {String(engineHealth?.solver || "Z3 SMT v5.1.0")}</div>
                        <div>Data Authority: Content-Addressed Storage (CAS) with SHA-256 Bitstream Fidelity</div>
                      </div>
                    </div>

                    <div className="lg-card">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#34D399", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mic size={14} strokeWidth={2} />
                        <span>Sarvam AI Speech & Indic Orchestrator</span>
                      </div>
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#D1D5DB", lineHeight: 1.8 }}>
                        <div>STT Model: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>{String(sarvamStatus?.stt_model || "saaras:v4")}</code></div>
                        <div>TTS Model: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>{String(sarvamStatus?.tts_model || "bulbul:v4-flash")}</code></div>
                        <div>Mode: <span style={{ color: sarvamStatus?.api_configured ? "#34D399" : "#F59E0B", fontWeight: 600 }}>{String(sarvamStatus?.mode || "OFFLINE_LOCAL_FALLBACK")}</span></div>
                        <div>Boundary: Zero raw evidence transmitted to cloud models</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 4. Floating Distinctive Voice Interaction Control */}
          <div
            id="btn-voice-capsule"
            onClick={() => setIsVoiceOpen(true)}
            className="glass-voice-capsule lg-floating-voice"
            style={{
              right: isInspectorOpen ? "384px" : "28px",
            }}
            title="Open TARKA Voice Interrogation Agent"
          >
            <div className={`lg-voice-pulse ${sarvamStatus?.api_configured ? "active" : ""}`} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", display: "flex", alignItems: "center", gap: "6px" }}>
              <Mic size={14} strokeWidth={2} />
              <span>TARKA Voice</span>
            </span>
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.1)", color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>
              {sarvamStatus?.api_configured ? "Saaras v4" : "Local Mode"}
            </span>
          </div>
        </main>

        {/* 5. Contextual Right-Side Inspector */}
        <aside className={`glass-inspector lg-right-inspector ${isInspectorOpen ? "" : "collapsed"}`}>
          <div className="lg-inspector-header">
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setInspectorTab("context")}
                className={`lg-btn ${inspectorTab === "context" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                Context
              </button>
              <button
                onClick={() => setInspectorTab("assistant")}
                className={`lg-btn ${inspectorTab === "assistant" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                Assistant
              </button>
              <button
                onClick={() => setInspectorTab("statutory")}
                className={`lg-btn ${inspectorTab === "statutory" ? "lg-btn-primary" : "lg-btn-subtle"}`}
                style={{ padding: "3px 8px", fontSize: "11px" }}
              >
                Statutory
              </button>
            </div>

            <button
              onClick={() => setIsInspectorOpen(false)}
              style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
              title="Close Inspector"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="lg-inspector-body">
            {inspectorTab === "context" && (
              <>
                {/* Selected Contradiction Detail */}
                {selectedContradiction ? (
                  <div className="lg-card" style={{ padding: "14px", borderLeft: "3px solid #F43F5E" }}>
                    <div style={{ fontSize: "10px", color: "#F43F5E", fontWeight: 700, textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
                      Z3 SMT Contradiction
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedContradiction.title}
                    </div>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px", lineHeight: 1.4 }}>
                      {selectedContradiction.why_it_matters}
                    </p>
                    <div style={{ marginTop: "10px", padding: "8px", backgroundColor: "rgba(0, 0, 0, 0.4)", borderRadius: "4px", fontSize: "10px", fontFamily: "'IBM Plex Mono', monospace", color: "#FDA4AF" }}>
                      Rule: {selectedContradiction.rule_firing_reason}
                    </div>
                  </div>
                ) : null}

                {/* Selected Artifact Detail */}
                {selectedArtifact ? (
                  <div className="lg-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#60A5FA", fontWeight: 700, textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
                      Preserved Artifact
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedArtifact.filename}
                    </div>
                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#9CA3AF", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>ID: <code style={{ color: "#93C5FD", fontFamily: "'IBM Plex Mono', monospace" }}>{selectedArtifact.artifact_id}</code></div>
                      <div>Tier: <strong style={{ color: "#34D399" }}>{selectedArtifact.source_tier}</strong></div>
                      <div>Size: {((selectedArtifact.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
                      <div>Custody Seq: #{selectedArtifact.custody_chain_sequence}</div>
                    </div>
                    <div style={{ marginTop: "8px", padding: "6px", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "4px", fontSize: "9px", fontFamily: "'IBM Plex Mono', monospace", color: "#E5E7EB", wordBreak: "break-all" }}>
                      {selectedArtifact.sha256}
                    </div>
                  </div>
                ) : null}

                {/* Selected Timeline Event Detail */}
                {selectedEvent ? (
                  <div className="lg-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
                      Timeline Anchor
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "4px" }}>
                      {selectedEvent.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>
                      Timestamp: {selectedEvent.timestamp}
                    </div>
                    <p style={{ fontSize: "11px", color: "#D1D5DB", marginTop: "6px", lineHeight: 1.4 }}>
                      {selectedEvent.description}
                    </p>
                  </div>
                ) : null}

                {!selectedContradiction && !selectedArtifact && !selectedEvent && (
                  <div style={{ textAlign: "center", padding: "40px 10px", color: "#6B7280", fontSize: "12px" }}>
                    Click any artifact, contradiction finding, or timeline event to inspect forensic details here.
                  </div>
                )}
              </>
            )}

            {inspectorTab === "assistant" && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <ForensicAssistantPanel caseId={activeCaseId} />
              </div>
            )}

            {inspectorTab === "statutory" && (
              <div className="lg-card" style={{ padding: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginBottom: "8px" }}>
                  Section 63 BSA 2023 Statutory Criteria
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "11px", color: "#9CA3AF" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Cryptographic SHA-256 Bitstream Hash</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Append-Only Dual-Tier Storage Custody</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Deterministic Z3 SMT Constraint Verification</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#34D399" }}>
                    <CheckCircle2 size={12} strokeWidth={2} />
                    <span>Human Statutory Officer Sign-off Gate</span>
                  </div>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "10px", color: "#6B7280", lineHeight: 1.5 }}>
                  Section 63 requires proof that electronic records were produced by an authorized device in lawful custody without unauthorized alteration.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Tactile Capsule Dock (Skeuomorphic Bottom Dock Spec) */}
      <nav className="floating-capsule-dock" aria-label="Investigation Fast Dock">
        {[
          { id: "overview", label: "Overview" },
          { id: "inbox", label: "Intake" },
          { id: "evidence", label: "Evidence" },
          { id: "visual", label: "Visual TRACE" },
          { id: "timeline", label: "Timeline" },
          { id: "contradictions", label: "Contradictions" },
          { id: "hypotheses", label: "Hypotheses" },
          { id: "reports", label: "Reports" },
        ].map((dockItem) => (
          <button
            key={dockItem.id}
            onClick={() => setActiveTab(dockItem.id as WorkstationTab)}
            className={`floating-dock-item ${activeTab === dockItem.id ? "active" : ""}`}
          >
            <span>{dockItem.label}</span>
          </button>
        ))}
        <button
          onClick={() => setIsIntakeOpen(true)}
          className="floating-dock-item"
          style={{ color: "#60A5FA", borderLeft: "1px solid rgba(255, 255, 255, 0.14)", paddingLeft: "12px", marginLeft: "4px" }}
          title="Quick Intake Multimodal Evidence"
        >
          <Plus size={13} />
          <span>Ingest</span>
        </button>
      </nav>

      {/* Floating Modals */}
      <EvidenceIntakeModal
        caseId={activeCaseId}
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onIngestSuccess={() => loadCaseData(activeCaseId)}
      />

      <SarvamVoiceModal
        caseId={activeCaseId}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onActionExecuted={() => loadCaseData(activeCaseId)}
        onNavigateView={(view) => {
          if (["landing", "overview", "evidence", "timeline", "contradictions", "provenance", "gaps", "robustness", "reports", "system"].includes(view)) {
            setActiveTab(view as WorkstationTab);
          }
        }}
      />

      <ForensicReportModal
        caseId={activeCaseId}
        runId={baselineRunId}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onReportGenerated={() => loadCaseData(activeCaseId)}
      />

      {/* Demo Director Guided Tour Overlay & Preflight Modal in Workstation */}
      {demo.currentScene && (demo.state === "RUNNING" || demo.state === "PAUSED") && (
        <DemoArrowOverlay
          scene={demo.currentScene}
          sceneIndex={demo.currentSceneIndex}
          totalScenes={demo.totalScenes}
          controls={demo}
        />
      )}

      <DemoDirectorModal
        isOpen={isDemoDirectorOpen}
        onClose={() => setIsDemoDirectorOpen(false)}
        preflight={demo.preflight}
        onRunPreflight={demo.runPreflight}
        onStartDemo={async () => {
          setIsDemoDirectorOpen(false);
          await demo.startDemo();
        }}
        demoState={demo.state}
      />
    </div>
  );
};

export default TarkaForensicWorkstation;
