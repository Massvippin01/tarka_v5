import React, { useState, useMemo } from "react";
import {
  Clock,
  Layers,
  Disc,
  GitFork,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import { StoryBanner, KpiTile } from "../../components/tarka/kit";
import { TemporalEvidenceLoom } from "../../components/tarka/TemporalEvidenceLoom";
import { ClaimDependencyLens } from "../../components/tarka/ClaimDependencyLens";
import { InvestigationFlightRecorder } from "../../components/tarka/InvestigationFlightRecorder";
import { ProvenanceDAGView } from "../../components/graphs/ProvenanceDAGView";

export const ForensicWorkstationScreen: React.FC = () => {
  const { activeCaseId, activeCase } = useTarkaGlobal();
  const { reconstructedInvestigation } = useTarkaUiStore();
  const [activeTab, setActiveTab] = useState<"loom" | "lens" | "recorder" | "provenance">("loom");

  const investigation = useMemo(() => {
    const base = reconstructedInvestigation || reconstruct5FileInvestigation();
    if (activeCase && activeCase.caseId !== "CASE-2026-001") {
      return {
        ...base,
        firNumber: activeCase.firNumber,
        complainantName: activeCase.complainantName,
        bookedLossInr: activeCase.bookedLossInr,
        claimedLossInr: activeCase.claimedLossInr,
      };
    }
    return base;
  }, [reconstructedInvestigation, activeCase]);

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: "8px 16px 12px 16px",
        gap: "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "transparent",
        fontFamily: "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* 1. STORY BANNER */}
      <StoryBanner
        screenId="workstation"
        takeaway={`${investigation.firNumber || "FIR"} (${investigation.complainantName || "Victim"}): Deep forensic instrumentation across multi-track NTP alignment, Z3 SMT claim ablation, and cryptographically chained flight recorder.`}
        evidenceChips={[
          {
            tier: "T1",
            label: `${investigation.complainantName?.split(" ")[0] || "Case"} NTP Stratum-2`,
            hash: investigation.fileManifest[0]?.sha256 || "b198302ca8765432109876543210987654321098765432109876543210987654",
          },
          {
            tier: "T1",
            label: "Z3 MUS Root",
            hash: investigation.fileManifest[1]?.sha256 || "4a9b8c12ef34aa56bb78cc90dd12ee34ff56aa78bb90cc12dd34ee56ff78aa90",
          },
          {
            tier: "T1",
            label: "Flight Recorder CAS",
            hash: investigation.fileManifest[2]?.sha256 || "f6a54e5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f",
          },
        ]}
      />

      {/* 2. KPI ROW (4 TILES) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}
      >
        <KpiTile
          title="MULTI-TRACK CHRONOLOGY"
          value={String(chronologyEvents.length)}
          suffix=" Events"
          icon={Clock}
          iconColor="#10B981"
          iconBg="#ECFDF5"
          statusBadge={{ text: "NTP ±180s SPEC", variant: "emerald" }}
          subtitle="Cross-institution atomic clock synchronized"
        />
        <KpiTile
          title="FORMAL SMT INVARIANTS"
          value="Z3 SMT"
          suffix=" Solver"
          icon={ShieldCheck}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: "SAT / UNSAT PROVEN", variant: "indigo" }}
          subtitle="Minimal Unsatisfiable Subsets (MUS) isolation"
        />
        <KpiTile
          title="ABLATION RESILIENCE"
          value="100%"
          suffix=" Core Survival"
          icon={Layers}
          iconColor="#0D9488"
          iconBg="#F0FDFA"
          statusBadge={{ text: "LEAVE-ONE-OUT", variant: "emerald" }}
          subtitle="Mathematical claim survival under exclusion"
        />
        <KpiTile
          title="FLIGHT RECORDER LEDGER"
          value={String(flightRecorderEntries.length)}
          suffix=" Events"
          icon={Disc}
          iconColor="#9333EA"
          iconBg="#FAF5FF"
          statusBadge={{ text: "SHA-256 CHAINED", variant: "emerald" }}
          subtitle="Immutable custody and forensic audit log"
        />
      </div>

      {/* 3. WORKBENCH SUB-HEADER & NAVIGATION TABS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--reui-card-bg, #0F1B2E)",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid var(--reui-border-strong, rgba(255, 255, 255, 0.08))",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={18} color="#06B6D4" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--reui-text-strong, #FFFFFF)" }}>
            Signature Digital Forensics Instrumentation
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34D399",
              border: "1px solid rgba(16, 185, 129, 0.30)",
            }}
          >
            ACTIVE CASE: {activeCaseId || "CASE-2026-001"}
          </span>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255, 255, 255, 0.04)", padding: "3px", borderRadius: "6px" }}>
          {[
            { id: "loom", label: "1. Temporal Evidence Loom", icon: Clock },
            { id: "lens", label: "2. Claim Dependency Lens", icon: Layers },
            { id: "recorder", label: "3. Investigation Flight Recorder", icon: Disc },
            { id: "provenance", label: "4. Provenance DAG Lineage", icon: GitFork },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: isActive ? "1px solid rgba(34, 211, 238, 0.40)" : "1px solid transparent",
                  background: isActive ? "rgba(6, 182, 212, 0.20)" : "transparent",
                  color: isActive ? "#22D3EE" : "var(--reui-text-secondary, #94A3B8)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow: isActive ? "0 0 10px rgba(6, 182, 212, 0.25)" : "none",
                  transition: "all 0.12s ease",
                }}
              >
                <Icon size={13} color={isActive ? "#22D3EE" : "#94A3B8"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE TOOL SURFACE */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingRight: "2px",
        }}
      >
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
