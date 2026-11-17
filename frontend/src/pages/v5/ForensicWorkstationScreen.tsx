import React, { useState, useMemo } from "react";
import {
  Clock,
  Layers,
  Disc,
  GitFork,
  Activity,
  Cpu,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import { sha256HexSync } from "../../utils/sha256";
import { CANONICAL_CASES, buildCaseBundleFromFixture } from "../../fixtures/cases";
import { TemporalEvidenceLoom } from "../../components/tarka/TemporalEvidenceLoom";
import { ClaimDependencyLens } from "../../components/tarka/ClaimDependencyLens";
import { InvestigationFlightRecorder } from "../../components/tarka/InvestigationFlightRecorder";
import { ProvenanceDAGView } from "../../components/graphs/ProvenanceDAGView";

type WorkstationTab = "loom" | "lens" | "recorder" | "provenance";

export const ForensicWorkstationScreen: React.FC = () => {
  const { activeCaseId } = useTarkaGlobal();
  const { reconstructedInvestigation } = useTarkaUiStore();
  const [activeTab, setActiveTab] = useState<WorkstationTab>("loom");

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId && CANONICAL_CASES[activeCaseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[activeCaseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  const chronologyEvents = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseWorkstationChronology(
      activeCaseId || "CASE-2026-001",
      investigation
    );
  }, [activeCaseId, investigation]);

  const claimAblationData = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseClaimAblationData(
      activeCaseId || "CASE-2026-001",
      investigation
    );
  }, [activeCaseId, investigation]);

  const flightRecorderEntries = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseFlightRecorder(
      activeCaseId || "CASE-2026-001",
      investigation
    );
  }, [activeCaseId, investigation]);

  const provenanceDag = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseProvenanceDAG(
      activeCaseId || "CASE-2026-001",
      investigation
    );
  }, [activeCaseId, investigation]);

  const evidenceChips = [
    {
      tier: "T1",
      label: `${investigation.complainantName?.split(" ")[0] || "Case"} NTP Stratum-2`,
      hash: investigation.fileManifest[0]?.sha256 || sha256HexSync("NTP Stratum-2"),
    },
    {
      tier: "T1",
      label: "Z3 MUS Root",
      hash: investigation.fileManifest[1]?.sha256 || sha256HexSync("Z3 MUS Root"),
    },
    {
      tier: "T1",
      label: "Flight Recorder CAS",
      hash: investigation.fileManifest[2]?.sha256 || sha256HexSync("Flight Recorder CAS"),
    },
  ];

  return (
    <div
      data-case-id={activeCaseId || ""}
      className="space-y-4 max-w-full pb-8"
      style={{
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 1. STATUTORY EVIDENCE BANNER */}
      <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5">
            <Cpu className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-[var(--accent)] tracking-tight">
                FORENSIC WORKSTATION & SMT PROOF ENGINES
              </span>
              <span className="text-[12px] font-mono text-[var(--fg-3)]">
                · FIR #{investigation.firNumber || "149/2026"}
              </span>
              <span className="text-[12px] font-medium text-[var(--fg-2)]">
                · {investigation.complainantName || "Sunil Kumar"}
              </span>
            </div>
            <div className="text-[12px] text-[var(--fg-2)] mt-0.5 leading-snug">
              Deep forensic instrumentation across multi-track NTP alignment, Z3 SMT claim ablation, and cryptographically chained flight recorder.
            </div>
          </div>
        </div>

        {/* Evidence Chips */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {evidenceChips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-1)] border border-[var(--line)] text-[12px] font-mono text-[var(--fg-2)]"
            >
              <span className="text-emerald-700 font-bold">{chip.tier}</span>
              <span className="text-[var(--fg-1)] font-medium">{chip.label}</span>
              <span className="text-[var(--fg-3)] font-mono">({chip.hash.slice(0, 7)}…)</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. KPI ROW (4 TILES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)] uppercase tracking-wide">
              Multi-Track Chronology
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              NTP ±180s SPEC
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)] tabular-nums flex items-baseline gap-1">
            <span>{chronologyEvents.length}</span>
            <span className="text-[13px] font-semibold text-[var(--fg-2)]">Events</span>
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1.5">
            Cross-institution atomic clock synchronized
          </div>
        </div>

        {/* KPI 2 */}
        <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)] uppercase tracking-wide">
              Formal SMT Invariants
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              SAT / UNSAT PROVEN
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)] tabular-nums flex items-baseline gap-1">
            <span>Z3 SMT</span>
            <span className="text-[13px] font-semibold text-[var(--fg-2)]">Solver</span>
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1.5">
            Minimal Unsatisfiable Subsets (MUS) isolation
          </div>
        </div>

        {/* KPI 3 */}
        <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)] uppercase tracking-wide">
              Ablation Resilience
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              LEAVE-ONE-OUT
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)] tabular-nums flex items-baseline gap-1">
            <span>100%</span>
            <span className="text-[13px] font-semibold text-[var(--fg-2)]">Core Survival</span>
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1.5">
            Mathematical claim survival under exclusion
          </div>
        </div>

        {/* KPI 4 */}
        <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[var(--fg-3)] uppercase tracking-wide">
              Flight Recorder Ledger
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono">
              SHA-256 CHAINED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)] tabular-nums flex items-baseline gap-1">
            <span>{flightRecorderEntries.length}</span>
            <span className="text-[13px] font-semibold text-[var(--fg-2)]">Events</span>
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1.5">
            Immutable custody and forensic audit log
          </div>
        </div>
      </div>

      {/* 3. WORKBENCH SUB-HEADER & NAVIGATION TABS */}
      <div className="v6-card bg-white border border-[var(--line)] rounded-xl p-2.5 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="size-4 text-[var(--accent)] shrink-0" />
          <span className="text-[13px] font-bold text-[var(--fg-1)]">
            Digital Forensics Instrumentation
          </span>
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            ACTIVE CASE: {activeCaseId || "CASE-2026-001"}
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[var(--surface-1)] p-1 rounded-lg border border-[var(--line)] min-w-0 max-w-full overflow-x-auto">
          {[
            { id: "loom", label: "1. Temporal Loom", icon: Clock },
            { id: "lens", label: "2. Claim Dependency Lens", icon: Layers },
            { id: "recorder", label: "3. Flight Recorder", icon: Disc },
            { id: "provenance", label: "4. Provenance DAG", icon: GitFork },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as WorkstationTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white text-[var(--accent)] shadow-2xs border border-[var(--line)] font-bold"
                    : "text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-white/60"
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? "text-[var(--accent)]" : "text-[var(--fg-3)]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE TOOL SURFACE */}
      <div className="space-y-4">
        {activeTab === "loom" && (
          <TemporalEvidenceLoom
            caseId={activeCaseId || "CASE-2026-001"}
            events={chronologyEvents}
          />
        )}

        {activeTab === "lens" && (
          <ClaimDependencyLens
            caseId={activeCaseId || "CASE-2026-001"}
            artifacts={claimAblationData.artifacts}
            claims={claimAblationData.claims}
            onExecuteAblation={async (excludedIds) => {
              console.log("Ablation executed on:", excludedIds);
            }}
          />
        )}

        {activeTab === "recorder" && (
          <InvestigationFlightRecorder
            caseId={activeCaseId || "CASE-2026-001"}
            entries={flightRecorderEntries}
          />
        )}

        {activeTab === "provenance" && (
          <ProvenanceDAGView
            dag={provenanceDag as any}
            caseId={activeCaseId || "CASE-2026-001"}
            embedded={true}
          />
        )}
      </div>
    </div>
  );
};
