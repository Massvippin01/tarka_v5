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
import { WebGLGraphExplorer } from "./WebGLGraphExplorer";
import { GlobalCommandSearch } from "./GlobalCommandSearch";
import { AnalyticalContextPanel } from "./AnalyticalContextPanel";
import { LandingPage } from "./LandingPage";
import { AuthModal } from "./AuthModal";
import { TimelineLens } from "./TimelineLens";
import { EvidenceLens } from "./EvidenceLens";
import { EntitiesLens } from "./EntitiesLens";
import GraphExplorer from "../features/graph/GraphExplorer";

export const InvestigationCanvas: React.FC = () => {
  const [viewMode, setViewMode] = useState<"LANDING" | "WORKSPACE">("WORKSPACE");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "parchment">("dark");
  const [useReactFlowFallback, setUseReactFlowFallback] = useState(false);
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);

  const {
    activeCaseId,
    activeLens,
    selectedEntityId,
    selectedRelationshipId,
    canvasMode,
    activeRightTab,
    copilotOpen,
    copilotQuery,
    newEvidenceAlert,
    selectEntity,
    selectRelationship,
    setCanvasMode,
    setActiveRightTab,
    setActiveLens,
    toggleCopilot,
    runCopilotQuery,
    dismissNewEvidenceAlert,
  } = useInvestigation();

  if (viewMode === "LANDING") {
    return (
      <>
        <LandingPage
          onStartInvestigation={() => setViewMode("WORKSPACE")}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            setIsAuthOpen(false);
            setViewMode("WORKSPACE");
          }}
        />
      </>
    );
  }

  const LENSES: { id: WorkspaceLens; label: string; icon: string }[] = [
    { id: "Overview", label: "Overview", icon: "📊" },
    { id: "Network", label: "Network", icon: "🕸️" },
    { id: "Timeline", label: "Timeline", icon: "⏱️" },
    { id: "Map", label: "Map", icon: "🗺️" },
    { id: "Evidence", label: "Evidence", icon: "📋" },
    { id: "Entities", label: "Entities", icon: "👤" },
    { id: "Findings", label: "Findings", icon: "💡" },
  ];

  return (
    <div data-theme={theme} style={styles.appShell}>
      {/* Top Breadcrumb & Orientation Bar */}
      <BreadcrumbBar
        onOpenCommandSearch={() => setIsCommandSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onGoLanding={() => setViewMode("LANDING")}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "parchment" : "dark")}
      />

      {/* Non-Blocking Realtime Evidence Alert Banner */}
      {newEvidenceAlert && (
        <div style={styles.alertBanner}>
          <span>⚡ <strong>REALTIME EVIDENCE UPDATE:</strong> 1 new evidence record ingested. Existing Copilot analysis remains immutable.</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={styles.alertActionBtn} onClick={() => runCopilotQuery(`Re-analyze case ${activeCaseId} with latest evidence`)}>
              RE-RUN ANALYSIS
            </button>
            <button style={styles.alertDismissBtn} onClick={dismissNewEvidenceAlert}>
              KEEP CURRENT RESULT
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Layout Container */}
      <div style={styles.workspaceBody}>
        {/* Persistent Compact Left Navigation Rail */}
        <LeftNavRail />

        {/* Central Workspace Surface */}
        <div style={styles.centerSection}>
          {/* Investigation Workspace Lenses Bar */}
          <div style={styles.lensBar}>
            <div style={{ display: "flex", gap: "2px" }}>
              {LENSES.map((lens) => (
                <button
                  key={lens.id}
                  onClick={() => setActiveLens(lens.id)}
                  style={{
                    ...styles.lensBtn,
                    ...(activeLens === lens.id ? styles.lensActive : {}),
                  }}
                >
                  <span>{lens.icon}</span> {lens.label}
                </button>
              ))}
            </div>

            {/* Mode Controls when in Network lens */}
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

          {/* Active Workspace Lens Content */}
          <div style={styles.canvasContainer}>
            {activeLens === "Network" && (
              canvasMode === "2D" ? (
                useReactFlowFallback ? (
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <div style={{ position: "absolute", top: "8px", right: "12px", zIndex: 10 }}>
                      <button
                        onClick={() => setUseReactFlowFallback(false)}
                        style={{ background: "#0284c7", border: "none", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        ⚡ SWITCH TO WEBGL BOUNDED GRAPH
                      </button>
                    </div>
                    <GraphExplorer />
                  </div>
                ) : (
                  <WebGLGraphExplorer onToggleFallback={() => setUseReactFlowFallback(true)} />
                )
              ) : canvasMode === "3D" ? (
                <Network3D onSelectEntity={selectEntity} onToggle2D={() => setCanvasMode("2D")} />
              ) : (
                <GISMap onSelectEntity={selectEntity} />
              )
            )}

            {activeLens === "Timeline" && <TimelineLens />}
            {activeLens === "Evidence" && <EvidenceLens />}
            {activeLens === "Entities" && <EntitiesLens />}
            {activeLens === "Map" && <GISMap onSelectEntity={selectEntity} />}
            {(activeLens === "Overview" || activeLens === "Findings") && (
              <AnalyticalContextPanel caseId={activeCaseId} onSelectEntity={selectEntity} />
            )}
          </div>
        </div>

        {/* Contextual Intelligence & Slide-Over Rail */}
        <aside style={styles.rightRail}>
          {/* Right Rail Tabs */}
          <div style={styles.rightNav}>
            <button
              onClick={() => setActiveRightTab("signals")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "signals" ? styles.rTabActive : {}) }}
            >
              🧠 INTELLIGENCE
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
              WHY? INSPECTOR
            </button>
            <button
              onClick={() => setActiveRightTab("gaps")}
              style={{ ...styles.rTabBtn, ...(activeRightTab === "gaps" ? styles.rTabActive : {}) }}
            >
              GAPS & HYPOTHESES
            </button>
          </div>

          {/* Dynamic Panel Content */}
          <div style={styles.rightBody}>
            {activeRightTab === "signals" && (
              <AnalyticalContextPanel caseId={activeCaseId} onSelectEntity={selectEntity} />
            )}
            {activeRightTab === "dossier" && selectedEntityId && (
              <EntityDossier entityId={selectedEntityId} onSelectEntity={selectEntity} />
            )}
            {activeRightTab === "inspector" && (
              <RelationshipInspector
                relId={selectedRelationshipId || "rel-p1-p2"}
                onClose={() => setActiveRightTab("dossier")}
                onSelectEntity={selectEntity}
              />
            )}
            {activeRightTab === "gaps" && (
              <EvidenceGapPanel caseId={activeCaseId} onSelectEntity={selectEntity} />
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Persistent Evidence Spine */}
      <EvidenceSpine
        onSelectEvent={(ev) => selectEntity(ev.entityId)}
        onInspectRelationship={() => selectRelationship("rel-p1-p2")}
      />

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
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "var(--surface-primary)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    overflow: "hidden",
  },
  alertBanner: {
    background: "rgba(56, 189, 248, 0.12)",
    borderBottom: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#38bdf8",
    padding: "6px 16px",
    fontSize: "0.72rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertActionBtn: {
    background: "#0284c7",
    border: "none",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  alertDismissBtn: {
    background: "var(--surface-primary)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.65rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  workspaceBody: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  centerSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--surface-primary)",
  },
  lensBar: {
    height: "38px",
    background: "var(--surface-secondary)",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
  },
  lensBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "0.72rem",
    fontWeight: 600,
    padding: "6px 10px",
    cursor: "pointer",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.1s ease",
  },
  lensActive: {
    background: "var(--surface-selected)",
    color: "var(--text-accent)",
    fontWeight: 800,
  },
  modeGroup: {
    display: "flex",
    gap: "4px",
  },
  modeBtn: {
    background: "transparent",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "0.62rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  modeActive: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "var(--status-observed)",
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  canvasContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: "#030712",
  },
  rightRail: {
    width: "360px",
    background: "var(--surface-secondary)",
    borderLeft: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  rightNav: {
    display: "flex",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--surface-primary)",
  },
  rTabBtn: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "0.62rem",
    fontWeight: 700,
    padding: "8px 2px",
    cursor: "pointer",
  },
  rTabActive: {
    color: "var(--text-accent)",
    borderBottom: "2px solid var(--text-accent)",
    background: "var(--surface-selected)",
  },
  rightBody: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
};
