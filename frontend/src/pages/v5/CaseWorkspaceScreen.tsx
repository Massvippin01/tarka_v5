import React, { useState, useMemo } from "react";
import {
  Shield,
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
import { queryClient } from "../../queryClient";

import { SaaSMetricBanner } from "../../components/tarka/workspace/SaaSMetricBanner";
import { CaseTableView } from "../../components/tarka/workspace/CaseTableView";
import { CaseBoardView } from "../../components/tarka/workspace/CaseBoardView";
import { CaseTimelineView } from "../../components/tarka/workspace/CaseTimelineView";
import { BulkIngestionHubView } from "../../components/tarka/workspace/BulkIngestionHubView";
import { BulkIngestionModal } from "../../components/tarka/workspace/BulkIngestionModal";
import { CrossCaseComparatorDrawer } from "../../components/tarka/workspace/CrossCaseComparatorDrawer";
import { CreateCaseWizard } from "../../components/tarka/cases/CreateCaseWizard";
import { EditCaseSheet } from "../../components/tarka/cases/EditCaseSheet";
import { LinkCaseModal } from "../../components/tarka/cases/LinkCaseModal";

export const CaseWorkspaceScreen: React.FC = () => {
  const {
    caseWorkspaces,
    setCaseWorkspaces,
    activeCaseId,
    selectCaseWorkspace,
  } = useTarkaGlobal();

  const { setActivePage, setReconstructedInvestigation } = useTarkaUiStore();
  const { setActiveCaseId } = useCaseWorkbenchStore();

  // SaaS Workspace View Mode: table (default) | board | timeline | bulk
  const [viewMode, setViewMode] = useState<"table" | "board" | "timeline" | "bulk">("table");

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<
    "ALL" | "GOLDEN_HOUR" | "SYNDICATE" | "ACTION_PENDING" | "COURT_READY" | "CLOSED" | "ARCHIVED"
  >("ALL");

  // Wizard & Sheet states
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseWorkspace | null>(null);
  const [linkingCase, setLinkingCase] = useState<CaseWorkspace | null>(null);

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
          (c.ncrpAckNo && c.ncrpAckNo.toLowerCase().includes(q)) ||
          c.title.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          (c.leadInvestigator && c.leadInvestigator.toLowerCase().includes(q));
        if (!matches) return false;
      }

      const statusKey = ((c as any).status || "INVESTIGATING").toUpperCase();

      if (filterMode === "GOLDEN_HOUR") {
        return c.goldenHourRemainingMins > 0;
      }
      if (filterMode === "SYNDICATE") {
        return c.syndicateLinks && c.syndicateLinks.length > 0;
      }
      if (filterMode === "ACTION_PENDING") {
        return statusKey === "ACTION_PENDING";
      }
      if (filterMode === "COURT_READY") {
        return statusKey === "COURT_READY" || c.priority === "COURT_FILING_READY" || c.gatesPassed >= 4;
      }
      if (filterMode === "CLOSED") {
        return statusKey === "CLOSED";
      }
      if (filterMode === "ARCHIVED") {
        return statusKey === "ARCHIVED";
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

  const handleArchiveCase = async (caseId: string) => {
    const confirmArchive = window.confirm(`Archive case ${caseId}? It will become read-only.`);
    if (!confirmArchive) return;
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/archive`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCaseWorkspaces((prev: CaseWorkspace[]) =>
        prev.map((c: CaseWorkspace) => (c.caseId === caseId ? { ...c, status: "ARCHIVED" as any } : c))
      );
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(`Case ${caseId} archived (read-only)`);
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    }
  };

  const handleDeleteDraft = async (caseId: string) => {
    const confirmDel = window.confirm(`Permanently delete DRAFT case ${caseId}?`);
    if (!confirmDel) return;
    try {
      const res = await fetch(`/api/v1/cases/${caseId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setCaseWorkspaces((prev: CaseWorkspace[]) => prev.filter((c: CaseWorkspace) => c.caseId !== caseId));
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(`Draft case ${caseId} deleted`);
    } catch (err: any) {
      toast.error(`Deletion failed: ${err.message}`);
    }
  };

  const handleBulkAssign = (caseIds: string[]) => {
    const io = window.prompt("Assign Lead IO to selected cases:", "Insp. R. K. Sharma (IO-409)");
    if (!io) return;
    setCaseWorkspaces((prev: CaseWorkspace[]) =>
      prev.map((c: CaseWorkspace) => (caseIds.includes(c.caseId) ? { ...c, leadInvestigator: io } : c))
    );
    toast.success(`Assigned ${io} to ${caseIds.length} case(s)`);
  };

  const handleBulkArchive = async (caseIds: string[]) => {
    const confirmArchive = window.confirm(`Archive ${caseIds.length} selected cases?`);
    if (!confirmArchive) return;
    for (const cid of caseIds) {
      await fetch(`/api/v1/cases/${cid}/archive`, { method: "POST" }).catch(() => {});
    }
    setCaseWorkspaces((prev: CaseWorkspace[]) =>
      prev.map((c: CaseWorkspace) => (caseIds.includes(c.caseId) ? { ...c, status: "ARCHIVED" as any } : c))
    );
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    toast.success(`Archived ${caseIds.length} cases`);
  };

  return (
    <div
      id="tarka-workspace-body"
      data-case-id={activeCaseId || "CASE-2026-001"}
      style={{
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        overflow: "hidden",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* STATION COMMAND TOPBAR */}
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
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {/* Left: Station Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={15} color="#4F46E5" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.01em" }}>
                Multi-Case Command Hub
              </span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 800,
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: "#ECFDF5",
                  color: "#059669",
                  border: "1px solid #A7F3D0",
                }}
              >
                PROD-ACTIVE
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "#64748B" }}>
              Cyber Crime PS Noida · State Jurisdiction UP-West
            </div>
          </div>
        </div>

        {/* Center: Search & Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 380px", maxWidth: "600px" }}>
          {/* Quick Search Input */}
          <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#94A3B8" style={{ position: "absolute", left: "9px", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Case, FIR, Ack, Suspect, Bank..."
              style={{
                width: "100%",
                padding: "5px 24px 5px 28px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                fontSize: "11px",
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
                  right: "6px",
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Saved Filter Pills */}
          <div
            style={{
              display: "inline-flex",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "2px",
              flexShrink: 0,
              gap: "2px",
            }}
          >
            {[
              { id: "ALL", label: `All (${caseWorkspaces.length})` },
              { id: "GOLDEN_HOUR", label: "SLA Active", icon: Zap },
              { id: "SYNDICATE", label: "Syndicates" },
              { id: "ACTION_PENDING", label: "Action Pending" },
              { id: "COURT_READY", label: "Court Ready" },
              { id: "CLOSED", label: "Closed" },
              { id: "ARCHIVED", label: "Archived" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id as any)}
                style={{
                  border: "none",
                  borderRadius: "4px",
                  padding: "3px 6px",
                  fontSize: "10px",
                  fontWeight: filterMode === f.id ? 800 : 500,
                  background: filterMode === f.id ? "#FFFFFF" : "transparent",
                  color: filterMode === f.id ? "#0F172A" : "#64748B",
                  boxShadow: filterMode === f.id ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                {f.icon && <f.icon size={10} color="#D97706" />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: SaaS View Mode Switcher & Primary Action Buttons */}
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
                gap: "3px",
                fontSize: "10.5px",
                fontWeight: viewMode === "table" ? 800 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "table" ? "#FFFFFF" : "transparent",
                color: viewMode === "table" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              <List size={11} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "10.5px",
                fontWeight: viewMode === "board" ? 800 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "board" ? "#FFFFFF" : "transparent",
                color: viewMode === "board" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "board" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              <LayoutGrid size={11} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "10.5px",
                fontWeight: viewMode === "timeline" ? 800 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "timeline" ? "#FFFFFF" : "transparent",
                color: viewMode === "timeline" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "timeline" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              <Calendar size={11} />
              <span>Roadmap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("bulk")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontSize: "10.5px",
                fontWeight: viewMode === "bulk" ? 800 : 500,
                padding: "3px 8px",
                borderRadius: "4px",
                border: "none",
                background: viewMode === "bulk" ? "#FFFFFF" : "transparent",
                color: viewMode === "bulk" ? "#0F172A" : "#64748B",
                boxShadow: viewMode === "bulk" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
              }}
            >
              <FileUp size={11} />
              <span>Bulk Ingest</span>
            </button>
          </div>

          <div style={{ width: "1px", height: "18px", background: "#E2E8F0" }} />

          {/* Action: New Case Wizard */}
          <button
            type="button"
            data-testid="create-case-button"
            onClick={() => setIsCreateWizardOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 11px",
              borderRadius: "6px",
              border: "1px solid #0284C7",
              background: "#0284C7",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(2, 132, 199, 0.25)",
            }}
          >
            <Plus size={12} />
            <span>New Case</span>
          </button>

          {/* Action: Bulk Upload Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid #4338CA",
              background: "#4F46E5",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
            }}
          >
            <FileUp size={12} />
            <span>Bulk Upload</span>
          </button>

          {/* Action: Load Benchmark Pack */}
          <button
            type="button"
            onClick={handleLoadIndianCasePack}
            title="Load 5-File Indian Case Pack (Finacle, Switch, KYC, CGNAT, 1930)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 9px",
              borderRadius: "6px",
              border: "1px solid #10B981",
              background: "#ECFDF5",
              color: "#065F46",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Sparkles size={11} color="#059669" />
            <span>5-File Case Pack</span>
          </button>

          {/* Action: Benchmark Lab */}
          <button
            type="button"
            onClick={() => setActivePage("benchmark")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 9px",
              borderRadius: "6px",
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

      {/* EXECUTIVE SAAS 5-METRIC KPI BANNER */}
      <SaaSMetricBanner cases={caseWorkspaces} />

      {/* ACTIVE WORKSPACE VIEW */}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {viewMode === "table" && (
          <CaseTableView
            cases={filteredCases}
            activeCaseId={activeCaseId}
            onSelectCase={handleSelectCase}
            onOpenCompare={handleOpenCompare}
            onEditCase={(caseItem) => setEditingCase(caseItem)}
            onLinkCase={(caseItem) => setLinkingCase(caseItem)}
            onArchiveCase={handleArchiveCase}
            onDeleteDraft={handleDeleteDraft}
            onBulkAssign={handleBulkAssign}
            onBulkArchive={handleBulkArchive}
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

      {/* DRAWERS & MODALS */}
      <CreateCaseWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
      />

      <EditCaseSheet
        caseData={editingCase}
        isOpen={Boolean(editingCase)}
        onClose={() => setEditingCase(null)}
      />

      <LinkCaseModal
        sourceCase={linkingCase}
        isOpen={Boolean(linkingCase)}
        onClose={() => setLinkingCase(null)}
      />

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
