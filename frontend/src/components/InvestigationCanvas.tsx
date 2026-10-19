import React, { useState } from "react";
import { useInvestigation, type WorkspaceLens } from "../context/InvestigationContext";
import { LeftNavRail } from "./LeftNavRail";
import { BreadcrumbBar } from "./BreadcrumbBar";
import { EntityDossier } from "./EntityDossier";
import { RelationshipInspector } from "./RelationshipInspector";
import { EvidenceGapPanel } from "./EvidenceGapPanel";
import { EvidenceSpine } from "./EvidenceSpine";
import { GISMap } from "./GISMap";
import { Network3D } from "./Network3D";
import { AICopilotDrawer } from "./AICopilotDrawer";
import { GlobalCommandSearch } from "./GlobalCommandSearch";
import { AnalyticalContextPanel } from "./AnalyticalContextPanel";
import { AuthModal } from "./AuthModal";
import { EvidenceLens } from "./EvidenceLens";
import { EntitiesLens } from "./EntitiesLens";
import { CommandCenter } from "./CommandCenter";
import { InvestigationStatePanel } from "./investigation/InvestigationStatePanel";
import { EvidenceGraph } from "./investigation/EvidenceGraph";
import { ContradictionCenter } from "./investigation/ContradictionCenter";
import { EvidenceGapCenter } from "./investigation/EvidenceGapCenter";
import { LiveProofDrawer } from "./investigation/LiveProofDrawer";
import { InvestigationTimeline } from "./investigation/InvestigationTimeline";
import { InvestigationDelta } from "./investigation/InvestigationDelta";
import { ClaimInspector } from "./investigation/ClaimInspector";
import { EvidenceImpactPanel } from "./investigation/EvidenceImpactPanel";
import { GovernedIntelligenceSentinel } from "./investigation/GovernedIntelligenceSentinel";
import { FirstOpenController } from "./onboarding/FirstOpenController";
import { CommandFirstSurface } from "./command/CommandFirstSurface";
import { InvestigationFocusSurface } from "./command/InvestigationFocusSurface";
import { ForensicDetailSurface } from "./command/ForensicDetailSurface";
import { AuditGovernanceSurface } from "./command/AuditGovernanceSurface";
import { ForensicWorkspacePage } from "../pages/ForensicWorkspacePage";

export const InvestigationCanvas: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);

  const {
    activeCaseId,
    activeNav,
    activeLens,
    activeWorkspaceView,
    setActiveWorkspaceView,
    selectedEntityId,
    selectedRelationshipId,
    canvasMode,
    activeRightTab,
    copilotOpen,
    copilotQuery,
    newEvidenceAlert,
    isOnboarding,
    operatingContext,
    experienceLevel,
    setExperienceLevel,
    returnToCommandSurface,
    dismissOnboarding,
    selectCase,
    selectEntity,
    selectRelationship,
    setCanvasMode,
    setActiveRightTab,
    setActiveLens,
    toggleCopilot,
    runCopilotQuery,
    dismissNewEvidenceAlert,
  } = useInvestigation();

  // Global Keyboard Shortcuts for Progressive Disclosure (Esc -> L0, Alt+0..4 -> Levels)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isAuthOpen && !isCommandSearchOpen && !copilotOpen) {
        returnToCommandSurface();
      }
      if (e.altKey && ["0", "1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setExperienceLevel(parseInt(e.key, 10) as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthOpen, isCommandSearchOpen, copilotOpen, returnToCommandSurface, setExperienceLevel]);

  const LENSES: { id: WorkspaceLens; label: string; icon: string }[] = [
    { id: "Overview", label: "OVERVIEW", icon: "" },
    { id: "Network", label: "NETWORK", icon: "" },
    { id: "Timeline", label: "TIMELINE", icon: "" },
    { id: "Map", label: "MAP", icon: "" },
    { id: "Evidence", label: "EVIDENCE", icon: "" },
    { id: "Entities", label: "ENTITIES", icon: "" },
    { id: "Findings", label: "FINDINGS", icon: "" },
    { id: "Forensics", label: "FORENSICS", icon: "" },
  ];

  return (
    <div style={styles.appShell}>
      {/* Progressive Disclosure Rendering: Level 0 (Command), Level 1 (Focus), Level 2 (Analytical Workspace), Level 3 (Forensic Detail), Level 4 (Audit & Governance) */}
      {experienceLevel === 0 ? (
        <CommandFirstSurface />
      ) : experienceLevel === 1 ? (
        <InvestigationFocusSurface />
      ) : experienceLevel === 3 ? (
        <ForensicDetailSurface />
      ) : experienceLevel === 4 ? (
        <AuditGovernanceSurface />
      ) : (
        <>
          {/* Top Breadcrumb & Orientation Bar */}
          <BreadcrumbBar
            onOpenCommandSearch={() => setIsCommandSearchOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* Non-Blocking Realtime Evidence Alert Banner */}
          {newEvidenceAlert && (
            <div style={styles.alertBanner}>
              <span>
                <strong>REALTIME EVIDENCE INGESTION:</strong> New CAS artifact validated. Existing analysis remained immutable.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={styles.alertActionBtn}
                  onClick={() => runCopilotQuery(`Re-analyze case ${activeCaseId} with latest evidence`)}
                >
                  RUN DELTA REASONING
                </button>
                <button style={styles.alertDismissBtn} onClick={dismissNewEvidenceAlert}>
                  DISMISS
                </button>
              </div>
            </div>
          )}

          {/* Main Workspace Body */}
          <div style={styles.workspaceBody}>
            {/* Compact Navigation Rail (Left) */}
            <LeftNavRail />

            {/* State Telemetry Panel (Left of Center) */}
            <InvestigationStatePanel />

        {/* Central Dominant Analytical Surface */}
        <div style={styles.centerSection}>
          {/* Lenses Filter Bar */}
          <div style={styles.lensBar}>
            <div style={{ display: "flex", gap: "4px" }}>
              {LENSES.map((lens) => (
                <button
                  key={lens.id}
                  onClick={() => {
                    setActiveLens(lens.id);
                    if (lens.id === "Network") setActiveWorkspaceView("graph");
                    else if (lens.id === "Timeline") setActiveWorkspaceView("timeline");
                  }}
                  style={{
                    ...styles.lensBtn,
                    ...(activeLens === lens.id ? styles.lensActive : {}),
                  }}
                >
                  <span>{lens.icon}</span> {lens.label}
                </button>
              ))}
            </div>

            {/* Projection Mode Controls (2D / 3D / GIS) */}
            {activeLens === "Network" && (
              <div style={styles.modeGroup}>
                <button
                  onClick={() => setCanvasMode("2D")}
                  style={{ ...styles.modeBtn, ...(canvasMode === "2D" ? styles.modeActive : {}) }}
                >
                  2D GRAPH
                </button>
                <button
                  onClick={() => setCanvasMode("3D")}
                  style={{ ...styles.modeBtn, ...(canvasMode === "3D" ? styles.modeActive : {}) }}
                >
                  3D NETWORK
                </button>
                <button
                  onClick={() => setCanvasMode("GIS")}
                  style={{ ...styles.modeBtn, ...(canvasMode === "GIS" ? styles.modeActive : {}) }}
                >
                  GIS MAP
                </button>
              </div>
            )}
          </div>

          {/* Central Analytical Canvas Container */}
          <div style={styles.canvasContainer}>
            {activeNav === "command" ? (
              <CommandCenter />
            ) : activeNav === "forensics" || activeLens === "Forensics" ? (
              <ForensicWorkspacePage />
            ) : activeNav === "contradictions" || activeWorkspaceView === "contradictions" ? (
              <ContradictionCenter />
            ) : activeNav === "gaps" || activeWorkspaceView === "gaps" ? (
              <EvidenceGapCenter />
            ) : activeNav === "timeline" || activeWorkspaceView === "timeline" || activeLens === "Timeline" ? (
              <InvestigationTimeline />
            ) : activeNav === "evidence" || activeLens === "Evidence" ? (
              <EvidenceLens />
            ) : activeNav === "entities" || activeLens === "Entities" ? (
              <EntitiesLens />
            ) : activeWorkspaceView === "delta" ? (
              <InvestigationDelta />
            ) : activeWorkspaceView === "graph" || activeLens === "Network" ? (
              canvasMode === "2D" ? (
                <EvidenceGraph />
              ) : canvasMode === "3D" ? (
                <Network3D onSelectEntity={selectEntity} onToggle2D={() => setCanvasMode("2D")} />
              ) : (
                <GISMap onSelectEntity={selectEntity} />
              )
            ) : activeLens === "Map" ? (
              <GISMap onSelectEntity={selectEntity} />
            ) : (
              <AnalyticalContextPanel caseId={activeCaseId} onSelectEntity={selectEntity} />
            )}
          </div>
        </div>

        {/* Contextual Sentinel Inspector (Right Rail) */}
        <aside style={styles.rightRail}>
          {/* Right Rail Sub-Tabs */}
          <div style={styles.rightNav}>
            <button
              onClick={() => setActiveRightTab("signals")}
              style={{
                ...styles.rTabBtn,
                ...(activeRightTab === "signals" ? styles.rTabActiveSentinel : {}),
              }}
            >
               SENTINEL
            </button>
            <button
              onClick={() => setActiveRightTab("dossier")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "dossier" ? styles.rTabActive : {}) }}
            >
              DOSSIER
            </button>
            <button
              onClick={() => setActiveRightTab("inspector")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "inspector" ? styles.rTabActive : {}) }}
            >
              RELATION
            </button>
            <button
              onClick={() => setActiveRightTab("claim")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "claim" ? styles.rTabActive : {}) }}
            >
              CLAIM
            </button>
            <button
              onClick={() => setActiveRightTab("impact")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "impact" ? styles.rTabActive : {}) }}
            >
              IMPACT
            </button>
            <button
              onClick={() => setActiveRightTab("gaps")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "gaps" ? styles.rTabActive : {}) }}
            >
              GAPS
            </button>
          </div>

          {/* Dynamic Inspector Content */}
          <div style={styles.rightBody}>
            {activeRightTab === "signals" ? (
              <GovernedIntelligenceSentinel />
            ) : activeRightTab === "dossier" && selectedEntityId ? (
              <EntityDossier entityId={selectedEntityId} onSelectEntity={selectEntity} />
            ) : activeRightTab === "inspector" ? (
              <RelationshipInspector
                relId={selectedRelationshipId || "rel-p1-p2"}
                onClose={() => setActiveRightTab("dossier")}
                onSelectEntity={selectEntity}
              />
            ) : activeRightTab === "claim" ? (
              <ClaimInspector />
            ) : activeRightTab === "impact" ? (
              <EvidenceImpactPanel />
            ) : activeRightTab === "gaps" ? (
              <EvidenceGapPanel caseId={activeCaseId} onSelectEntity={selectEntity} />
            ) : (
              <GovernedIntelligenceSentinel />
            )}
          </div>
        </aside>
      </div>

      {/* Persistent Bottom Evidence Spine */}
      <EvidenceSpine
        onSelectEvent={(ev) => selectEntity(ev.entityId)}
        onInspectRelationship={() => selectRelationship("rel-p1-p2")}
      />
        </>
      )}

      {/* LiveProof Lineage Drawer Overlay */}
      <LiveProofDrawer />

      {/* Contextual AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={copilotOpen}
        onClose={() => toggleCopilot(false)}
        onSelectEntity={selectEntity}
        initialQuery={copilotQuery}
      />

      {/* Global Command Palette (⌘K) */}
      <GlobalCommandSearch
        isOpen={isCommandSearchOpen}
        onClose={() => setIsCommandSearchOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => setIsAuthOpen(false)}
      />

      {/* First-Open Operating Context & Onboarding Controller (Active on Level 2 when onboarding) */}
      {isOnboarding && operatingContext && experienceLevel === 2 && (
        <FirstOpenController
          operatingContext={operatingContext}
          onSelectCase={(caseId, route) => selectCase(caseId, route)}
          onDismissOnboarding={dismissOnboarding}
          onRunGoal={(goal) => runCopilotQuery(goal)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0D111A",
    color: "#E6EDF8",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
  },
  alertBanner: {
    background: "#ECE8DF",
    borderBottom: "1px solid #D8D2C7",
    color: "#AE2D30",
    padding: "6px 14px",
    fontSize: "11px",
    fontFamily: "'IBM Plex Mono', monospace",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertActionBtn: {
    background: "#AE2D30",
    border: "none",
    color: "#FAF8F3",
    padding: "3px 8px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
  },
  alertDismissBtn: {
    background: "transparent",
    border: "1px solid #D8D2C7",
    color: "#625E57",
    padding: "3px 8px",
    borderRadius: "2px",
    fontSize: "11px",
    fontWeight: 500,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
  },
  workspaceBody: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    background: "#F4F1EA",
  },
  centerSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#F4F1EA",
  },
  lensBar: {
    height: "36px",
    background: "#FAF8F3",
    borderBottom: "1px solid #D8D2C7",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
  },
  lensBtn: {
    background: "transparent",
    border: "none",
    color: "#625E57",
    fontSize: "11px",
    fontWeight: 500,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "4px 8px",
    cursor: "pointer",
    borderRadius: "2px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  lensActive: {
    background: "#ECE8DF",
    color: "#1E1D1A",
    borderBottom: "2px solid #AE2D30",
    fontWeight: 600,
  },
  modeGroup: {
    display: "flex",
    gap: "4px",
  },
  modeBtn: {
    background: "#FAF8F3",
    border: "1px solid #D8D2C7",
    color: "#625E57",
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "10px",
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
  },
  modeActive: {
    background: "#ECE8DF",
    color: "#1E1D1A",
    borderColor: "#AE2D30",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: "#F4F1EA",
  },
  rightRail: {
    width: "360px",
    background: "#FAF8F3",
    borderLeft: "1px solid #D8D2C7",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  rightNav: {
    display: "flex",
    borderBottom: "1px solid #D8D2C7",
    background: "#ECE8DF",
  },
  rTabBtn: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#625E57",
    fontSize: "10px",
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "7px 2px",
    cursor: "pointer",
    textAlign: "center",
  },
  rTabActive: {
    color: "#1E1D1A",
    borderBottom: "2px solid #AE2D30",
    background: "#FAF8F3",
    fontWeight: 700,
  },
  rTabActiveSentinel: {
    color: "#AE2D30",
    borderBottom: "2px solid #AE2D30",
    background: "#FAF8F3",
    fontWeight: 700,
  },
  rightBody: {
    flex: 1,
    overflowY: "auto",
    padding: "0",
    background: "#FAF8F3",
  },
};
