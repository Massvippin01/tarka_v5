import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  FileUp,
  LayoutGrid,
  List,
  Calendar,
  Sparkles,
  Database,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { useTarkaGlobal, type ActiveRoute, type CaseWorkspace } from "../../context/TarkaGlobalContext";
import { useCaseWorkbenchStore } from "../../store/useCaseWorkbenchStore";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";

import { SaaSMetricBanner } from "../../components/tarka/workspace/SaaSMetricBanner";
import { CaseTableView } from "../../components/tarka/workspace/CaseTableView";
import { CaseBoardView } from "../../components/tarka/workspace/CaseBoardView";
import { CaseTimelineView } from "../../components/tarka/workspace/CaseTimelineView";
import { BulkIngestionHubView } from "../../components/tarka/workspace/BulkIngestionHubView";
import { BulkIngestionModal } from "../../components/tarka/workspace/BulkIngestionModal";
import { CrossCaseComparatorDrawer } from "../../components/tarka/workspace/CrossCaseComparatorDrawer";

export const CaseWorkspaceScreen: React.FC = () => {
  const {
    caseWorkspaces,
    activeCaseId,
    selectCaseWorkspace,
    openNewCaseModal,
  } = useTarkaGlobal();

  const { setActivePage, setReconstructedInvestigation } = useTarkaUiStore();
  const { setActiveCaseId } = useCaseWorkbenchStore();

  // SaaS Workspace View Mode: table (default) | board | timeline | bulk
  const [viewMode, setViewMode] = useState<"table" | "board" | "timeline" | "bulk">("table");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "GOLDEN_HOUR" | "SYNDICATE" | "COURT_READY">("ALL");

  // Bulk Ingestion & Comparator Drawer states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [comparatorState, setComparatorState] = useState<{
    isOpen: boolean;
    caseA: CaseWorkspace | null;
    caseB: CaseWorkspace | null;
  }>({
    isOpen: false,
    caseA: null,
    caseB: null,
  });

  // Handle loading Indian Case Pack
  const handleLoadIndianCasePack = () => {
    const inv = reconstruct5FileInvestigation();
    setReconstructedInvestigation(inv);
    setActiveCaseId("CASE-2026-001");
    selectCaseWorkspace("CASE-2026-001");
    toast.success("🇮🇳 5-File Indian Case Pack Loaded: SBI Finacle + NPCI Switch + Nodal KYC + Airtel CGNAT + 1930 Intake successfully joined!");
  };

  // Filtered cases
  const filteredCases = useMemo(() => {
    return caseWorkspaces.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.caseId.toLowerCase().includes(q) ||
          c.firNumber.toLowerCase().includes(q) ||
          c.ncrpAckNo.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.leadInvestigator.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterMode === "GOLDEN_HOUR") {
        return c.goldenHourRemainingMins > 0;
      }
      if (filterMode === "SYNDICATE") {
        return c.syndicateLinks && c.syndicateLinks.length > 0;
      }
      if (filterMode === "COURT_READY") {
        return c.priority === "COURT_FILING_READY" || c.gatesPassed >= 4;
      }

      return true;
    });
  }, [caseWorkspaces, searchQuery, filterMode]);

  // Navigate to dedicated case workbench
  const handleSelectCase = async (caseId: string, stage?: ActiveRoute) => {
    const target = caseWorkspaces.find((c) => c.caseId === caseId);
    await setActiveCaseId(caseId, target);
    selectCaseWorkspace(caseId, stage || "network");
    setActivePage("workbench");
    toast.success(`Opened Dedicated Case Workbench for ${caseId}`);
  };

  // Open Cross-Case Comparator
  const handleOpenCompare = (caseAId: string, caseBId: string) => {
    const cA = caseWorkspaces.find((c) => c.caseId === caseAId) || null;
    const cB = caseWorkspaces.find((c) => c.caseId === caseBId) || null;
    if (cA && cB) {
      setComparatorState({
        isOpen: true,
        caseA: cA,
        caseB: cB,
      });
    }
  };

  return (
    <div
      id="tarka-workspace-body"
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F8FAFC",
        overflow: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* =========================================================================
          WORKSPACE CONTROL BAR (MINIMALIST & PROFESSIONAL TOOLBAR)
          ========================================================================= */}
      <div
        style={{
          flexShrink: 0,
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          zIndex: 20,
        }}
      >
        {/* Left: Search & Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 360px", maxWidth: "560px" }}>
          {/* Quick Search Input */}
          <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
            <Search size={14} color="#94A3B8" style={{ position: "absolute", left: "10px", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case title, FIR, Ack, suspect, bank..."
              style={{
                width: "100%",
                padding: "6px 28px 6px 32px",
                borderRadius: "6px",
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
                fontSize: "12px",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "2px",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setFilterMode("ALL")}
              style={{
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: filterMode === "ALL" ? 600 : 500,
                background: filterMode === "ALL" ? "#FFFFFF" : "transparent",
                color: filterMode === "ALL" ? "#0F172A" : "#64748B",
                boxShadow: filterMode === "ALL" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              All ({caseWorkspaces.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("GOLDEN_HOUR")}
              style={{
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: filterMode === "GOLDEN_HOUR" ? 600 : 500,
                background: filterMode === "GOLDEN_HOUR" ? "#FFFFFF" : "transparent",
                color: filterMode === "GOLDEN_HOUR" ? "#B45309" : "#64748B",
                boxShadow: filterMode === "GOLDEN_HOUR" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Zap size={11} color="#D97706" />
              <span>SLA</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("SYNDICATE")}
              style={{
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "11px",
                fontWeight: filterMode === "SYNDICATE" ? 600 : 500,
                background: filterMode === "SYNDICATE" ? "#FFFFFF" : "transparent",
                color: filterMode === "SYNDICATE" ? "#4338CA" : "#64748B",
                boxShadow: filterMode === "SYNDICATE" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              Syndicates
            </button>
          </div>
        </div>

        {/* Right: View Mode Switcher & Primary Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* View Mode Switcher: Table | Board | Timeline | Bulk */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              background: "#F1F5F9",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: viewMode === "table" ? 600 : 500,
                padding: "4px 9px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "table" ? "#FFFFFF" : "transparent",
                color: viewMode === "table" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              <List size={12} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: viewMode === "board" ? 600 : 500,
                padding: "4px 9px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "board" ? "#FFFFFF" : "transparent",
                color: viewMode === "board" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "board" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              <LayoutGrid size={12} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: viewMode === "timeline" ? 600 : 500,
                padding: "4px 9px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "timeline" ? "#FFFFFF" : "transparent",
                color: viewMode === "timeline" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "timeline" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              <Calendar size={12} />
              <span>Roadmap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bulk")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: viewMode === "bulk" ? 600 : 500,
                padding: "4px 9px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "bulk" ? "#FFFFFF" : "transparent",
                color: viewMode === "bulk" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "bulk" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                cursor: "pointer",
              }}
            >
              <FileUp size={12} />
              <span>Bulk Ingest</span>
            </button>
          </div>

          <div style={{ width: "1px", height: "18px", background: "#E2E8F0" }} />

          {/* Action: Load Benchmark Pack */}
          <button
            type="button"
            onClick={handleLoadIndianCasePack}
            title="Load 5-File Indian Case Pack (Finacle, Switch, KYC, CGNAT, 1930)"
            className="hover:bg-slate-50 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              color: "#334155",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <Sparkles size={13} color="#4F46E5" />
            <span>5-File Case Pack</span>
          </button>

          {/* Action: Bulk Upload Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="hover:bg-slate-50 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#0F172A",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <FileUp size={13} color="#475569" />
            <span>Bulk Upload</span>
          </button>

          {/* Action: New Case (Primary) */}
          <button
            type="button"
            onClick={openNewCaseModal}
            className="hover:bg-indigo-700 enabled:active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "6px",
              border: "1px solid #4338CA",
              background: "#4F46E5",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>New Case</span>
          </button>

          {/* Action: Benchmark Lab */}
          <button
            type="button"
            onClick={() => setActivePage("benchmark")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "5px",
              border: "1px solid #C7D2FE",
              background: "#EEF2FF",
              color: "#3730A3",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Database size={11} color="#4F46E5" />
            <span>Benchmarks</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE SAAS 5-METRIC KPI BANNER
          ========================================================================= */}
      <SaaSMetricBanner cases={caseWorkspaces} />

      {/* =========================================================================
          ACTIVE WORKSPACE VIEW (TABLE / BOARD / TIMELINE / BULK)
          ========================================================================= */}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {viewMode === "table" && (
          <CaseTableView
            cases={filteredCases}
            activeCaseId={activeCaseId}
            onSelectCase={handleSelectCase}
            onOpenCompare={handleOpenCompare}
          />
        )}

        {viewMode === "board" && (
          <CaseBoardView
            cases={filteredCases}
            activeCaseId={activeCaseId}
            onSelectCase={handleSelectCase}
            onOpenCompare={handleOpenCompare}
          />
        )}

        {viewMode === "timeline" && (
          <CaseTimelineView
            cases={filteredCases}
            activeCaseId={activeCaseId}
            onSelectCase={handleSelectCase}
          />
        )}

        {viewMode === "bulk" && (
          <BulkIngestionHubView
            cases={caseWorkspaces}
            onOpenUploadModal={() => setIsBulkModalOpen(true)}
          />
        )}
      </div>

      {/* =========================================================================
          DRAWERS & MODALS: BULK INGESTION & CROSS-CASE COMPARATOR
          ========================================================================= */}
      <BulkIngestionModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        targetCaseId={activeCaseId}
      />

      <CrossCaseComparatorDrawer
        isOpen={comparatorState.isOpen}
        onClose={() => setComparatorState((prev) => ({ ...prev, isOpen: false }))}
        caseA={comparatorState.caseA}
        caseB={comparatorState.caseB}
        onNavigateToCase={(caseId) => {
          setComparatorState((prev) => ({ ...prev, isOpen: false }));
          handleSelectCase(caseId);
        }}
      />
    </div>
  );
};
