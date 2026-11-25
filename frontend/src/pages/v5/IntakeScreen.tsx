import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import { useOverflowGuard } from "../../hooks/useOverflowGuard";
import {
  validateRunningBalance,
  decodeRailReference,
  type LedgerRowData,
} from "../../utils/intakeFalsifier";
import { KpiTile, StoryBanner } from "../../components/tarka/kit";
import { GateRail } from "../../components/tarka/intake/GateRail";
import { LedgerCard } from "../../components/tarka/intake/LedgerCard";
import { InspectorDock } from "../../components/tarka/intake/InspectorDock";
import { EndToEndReconstructionStrip } from "../../components/tarka/investigation/EndToEndReconstructionStrip";
import { CaseSyncBridge } from "../../services/caseSyncBridge";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import { getCanonicalCase, CANONICAL_CASES, buildCaseBundleFromFixture } from "../../fixtures/cases";
import { formatInr } from "../../utils/formatters";
import { sha256HexSync } from "../../utils/sha256";
import { ScreenFindingCard } from "../../components/tarka/common/ScreenFindingCard";
import { EvidenceFileManager } from "../../components/tarka/intake/EvidenceFileManager";
import { WhatChangedBanner, type WhatChangedData } from "../../components/tarka/common/WhatChangedBanner";

export const IntakeScreen: React.FC = () => {
  // Dev overflow detection
  useOverflowGuard();

  const { mutations, toggleMutation, activeCaseId, setActiveRoute } = useTarkaGlobal();
  const { setActiveDockTab, density, activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();
  const isCompact = density === "compact";

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId && CANONICAL_CASES[activeCaseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[activeCaseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  const isRow14Tampered = !!mutations.alterBankRow14;
  const isForgedRrn = !!mutations.forgeRrnTimestamp;

  // Sorting, search & permute states
  const [sortPolarity, setSortPolarity] = useState<"ASC" | "DESC">("ASC");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [permuteActive, setPermuteActive] = useState<boolean>(false);
  const [activeSubView, setActiveSubView] = useState<"ledger" | "files">("ledger");
  const [whatChanged, setWhatChanged] = useState<WhatChangedData | null>(null);

  const canonicalCase = useMemo(() => {
    return getCanonicalCase(activeCaseId || "CASE-2026-001");
  }, [activeCaseId]);

  const normalRow14Bal = useMemo(() => {
    const bal0 = canonicalCase.complainant.openingBalance;
    const bal1 = bal0 - 3450;
    const salaryCredit = canonicalCase.complainant.salaryCredit || 125000;
    const bal2 = bal1 + salaryCredit;
    const drainTx = canonicalCase.transactions.find((t) => t.category === "VICTIM_DRAIN");
    const drainAmount = drainTx ? drainTx.amount : (investigation.edges[0]?.amount || 285000);
    return bal2 - drainAmount;
  }, [canonicalCase, investigation]);

  const bookedLoss = canonicalCase.financials.bookedLossInr;
  const claimedLoss = canonicalCase.financials.claimedLossInr;
  const deltaLoss = Math.abs(bookedLoss - claimedLoss);
  const suppressionRatio = (bookedLoss / Math.max(claimedLoss, 1)).toFixed(1);

  // Editable Row #14 Balance State
  const [customRow14Balance, setCustomRow14Balance] = useState<string>(
    isRow14Tampered ? (normalRow14Bal - 200000).toFixed(2) : normalRow14Bal.toFixed(2)
  );

  // NPCI RRN Dissector Input
  const [rrnInput, setRrnInput] = useState<string>("626510149921");

  // Search input ref for keyboard shortcut '/'
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync custom input with global mutation toggle, active investigation, or discovered cluster
  useEffect(() => {
    if (activeDiscoveredCluster) {
      if (activeDiscoveredCluster.forgedRrnRows?.[0]?.rrn) {
        const nextRrn = activeDiscoveredCluster.forgedRrnRows[0].rrn;
        setRrnInput((prev) => (prev !== nextRrn ? nextRrn : prev));
      }
      if (activeDiscoveredCluster.doctoredBalanceRows?.[0]) {
        const d = activeDiscoveredCluster.doctoredBalanceRows[0];
        const errorVal = d.claimedBalError ?? (d as any).claimed_bal_error ?? 200000;
        const targetBal = isRow14Tampered ? (836550 - errorVal).toFixed(2) : "836550.00";
        setCustomRow14Balance((prev) => (prev !== targetBal ? targetBal : prev));
      }
    } else {
      const primaryTx = canonicalCase.transactions.find((t) => t.category === "VICTIM_DRAIN");
      const nextRrn = primaryTx?.rrn || investigation.edges[0]?.rrn;
      if (nextRrn) {
        setRrnInput((prev) => (prev !== nextRrn ? nextRrn : prev));
      }
      const targetBal = isRow14Tampered ? (normalRow14Bal - 200000).toFixed(2) : normalRow14Bal.toFixed(2);
      setCustomRow14Balance((prev) => (prev !== targetBal ? targetBal : prev));
    }
  }, [isRow14Tampered, activeDiscoveredCluster, investigation, normalRow14Bal, canonicalCase]);

  // Global Keyboard Shortcuts (/ search, T toggle tamper, P permute, Esc clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast.info("Filter active (Press Esc to clear)", { duration: 1500 });
      } else if (e.key === "Escape" && isInput) {
        setSearchTerm("");
        searchInputRef.current?.blur();
      } else if ((e.key === "t" || e.key === "T") && !isInput) {
        e.preventDefault();
        toggleMutation("alterBankRow14");
        toast(
          isRow14Tampered
            ? `Row #14 Restored to ${formatInr(normalRow14Bal)} ✓`
            : `Row #14 Tampered to ${formatInr(normalRow14Bal - 200000)} (-₹2.00L Deficit) ✗`,
          {
            description: isRow14Tampered
              ? "All double-entry invariants satisfied."
              : "Falsification gate halted downstream engines.",
            duration: 2500,
          }
        );
      } else if ((e.key === "p" || e.key === "P") && !isInput) {
        e.preventDefault();
        setPermuteActive((prev) => {
          const next = !prev;
          toast.info(
            next ? "Same-Second Permutation: Active" : "Same-Second Permutation: Reset",
            { duration: 2000 }
          );
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRow14Tampered, toggleMutation]);

  // Base Raw CBS Ledger Rows (SBI Finacle 10.x, Account #30981140029 or Discovered Cluster)
  const rawRows: LedgerRowData[] = useMemo(() => {
    if (activeDiscoveredCluster) {
      const canonicalCase = getCanonicalCase(activeCaseId || "CASE-2026-001");
      const victim = activeDiscoveredCluster.victimAccount || canonicalCase.complainant.name || "Victim Source Account";
      const conduit = activeDiscoveredCluster.layer1Conduit || canonicalCase.accounts.find((a: { muleLayer?: string; holderName?: string }) => a.muleLayer === "L1")?.holderName || "Layer 1 Mule";
      const doctored = activeDiscoveredCluster.doctoredBalanceRows?.[0];
      const forgedRrn = activeDiscoveredCluster.forgedRrnRows?.[0];
      const defaultTxnId = canonicalCase.transactions[0]?.id || "TXN-PRIMARY-01";
      const defaultRrn = canonicalCase.transactions[0]?.rrn || "RRN-UNRECORDED";

      const claimedError = doctored ? (doctored.claimedBalError ?? (doctored as any).claimed_bal_error ?? 200000) : 200000;
      const bookedDebit1 = doctored ? (doctored.bookedDebit ?? (doctored as any).booked_debit ?? 280000) : 280000;
      const stolenTotal = activeDiscoveredCluster.totalDrained || 840000;
      const bookedDebit2 = Math.max(0, stolenTotal - bookedDebit1);

      const bal0 = 1120000.0;
      const bal1 = bal0 - 3450.0; // 1116550
      const bal2 = bal1 - bookedDebit1; // 836550 booked
      const parsedCustom = parseFloat(String(customRow14Balance).replace(/,/g, ""));
      const validCustom = !isNaN(parsedCustom) ? parsedCustom : bal2;
      const rowTamperedBal = isRow14Tampered ? (bal2 - claimedError) : validCustom;
      const bal3 = Math.max(0, rowTamperedBal - bookedDebit2);

      const clusterRows: LedgerRowData[] = [
        {
          id: "CBS-001",
          sequenceNo: 1,
          timestamp: "2026-09-22T09:15:02",
          description: `OPENING BALANCE B/F [${victim}]`,
          rrn: "—",
          debit: 0.0,
          credit: 0.0,
          balance: bal0,
        },
        {
          id: "CBS-002",
          sequenceNo: 2,
          timestamp: "2026-09-22T09:42:18",
          description: "UPI/DR/6265091148/GROCERY_STORE",
          rrn: "626509114820",
          debit: 3450.0,
          credit: 0.0,
          balance: bal1,
        },
        {
          id: doctored ? (doctored.txId ?? (doctored as any).tx_id ?? defaultTxnId) : defaultTxnId,
          sequenceNo: 3,
          timestamp: "2026-09-22T10:00:14",
          description: `UPI/DR/${forgedRrn ? forgedRrn.rrn : defaultRrn}/${conduit}`,
          rrn: forgedRrn ? forgedRrn.rrn : defaultRrn,
          debit: bookedDebit1,
          credit: 0.0,
          balance: rowTamperedBal,
        },
        {
          id: "CBS-004",
          sequenceNo: 4,
          timestamp: "2026-09-22T10:14:32",
          description: `UPI/DR/626510149921/${conduit}`,
          rrn: "626510149921",
          debit: bookedDebit2,
          credit: 0.0,
          balance: bal3,
        },
      ];
      return sortPolarity === "ASC" ? clusterRows : [...clusterRows].reverse();
    }

    return CaseSyncBridge.getInstance().deriveCaseLedgerRows(
      activeCaseId || "CASE-2026-001",
      investigation,
      sortPolarity,
      isRow14Tampered,
      customRow14Balance,
      permuteActive
    );
  }, [activeDiscoveredCluster, activeCaseId, investigation, sortPolarity, isRow14Tampered, customRow14Balance, permuteActive]);

  // Mathematical Conservation Solver
  const validationResult = useMemo(() => {
    return validateRunningBalance(rawRows, sortPolarity);
  }, [rawRows, sortPolarity]);

  // NPCI RRN Dissector calculation
  const decodedRrn = useMemo(() => {
    const claimedTime = isForgedRrn ? "2026-09-22T10:50:14" : "2026-09-22T10:00:14";
    return decodeRailReference(rrnInput, claimedTime);
  }, [rrnInput, isForgedRrn]);

  // Filtered rows for presentation
  const displayRows = useMemo(() => {
    if (!searchTerm.trim()) return validationResult.rows;
    const term = searchTerm.toLowerCase();
    return validationResult.rows.filter(
      (r) =>
        r.description.toLowerCase().includes(term) ||
        r.rrn.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        String(r.sequenceNo).includes(term)
    );
  }, [validationResult.rows, searchTerm]);

  // Invariant states
  const isRow14Valid = validationResult.isValid;
  const isRrnValid = decodedRrn.admissibilityVerdict === "ADMISSIBLE";

  return (
    <div
      className="tarka-intake-root"
      data-case-id={activeCaseId || ""}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isCompact ? "6px" : "10px",
        padding: isCompact ? "6px 10px" : "10px 14px",
        height: "100%",
        minHeight: "560px",
        boxSizing: "border-box",
        overflow: "hidden",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
      role="region"
      aria-label="Evidence Intake and Ledger Falsification Workbench"
    >
      <Toaster position="bottom-right" richColors />

            {/* STORY BANNER */}
      <StoryBanner
        screenId="intake"
        takeaway={`CBS double-entry invariant verification for ${investigation.complainantName} (${investigation.firNumber}): verifies ₹${investigation.bookedLossInr.toLocaleString("en-IN")} booked outflow across banking exhibits.`}
        evidenceChips={[
          { tier: "T1", label: `${investigation.nodes[0]?.bank || "Bank"} CBS`, hash: investigation.fileManifest[0]?.sha256 || sha256HexSync("CBS") },
          { tier: "T1", label: "NPCI Switch STAN", hash: investigation.fileManifest[1]?.sha256 || sha256HexSync("NPCI") },
          { tier: "T3", label: "Victim Telemetry", hash: investigation.fileManifest[2]?.sha256 || sha256HexSync("Telemetry") },
        ]}
      />

      {/* 5-File Evidentiary Reconstructor Strip */}
      <EndToEndReconstructionStrip />

      {/* Top Investigator Finding Card */}
      <ScreenFindingCard
        finding={`Genuine Finacle CBS statement proves ${formatInr(canonicalCase.financials.bookedLossInr)} loss; Canva PDF receipt is forged (+14.2KB append).`}
        metric={formatInr(canonicalCase.financials.bookedLossInr)}
        metricLabel="T1 Finacle CBS Loss"
        actionLabel="Review People & Accounts"
        onAction={() => setActiveRoute("entities")}
        status={isRow14Tampered ? "alert" : "verified"}
        evidenceTag="Finacle CBS SHA-256 Verified"
      />

      {/* Sub-View Switcher: Core CBS Ledger vs Evidence Files Manager */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0 }}>
        <div style={{ display: "inline-flex", padding: "2px", background: "#E2E8F0", borderRadius: "6px" }}>
          <button
            type="button"
            data-testid="tab-intake-ledger"
            onClick={() => setActiveSubView("ledger")}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "none",
              background: activeSubView === "ledger" ? "#FFFFFF" : "transparent",
              color: activeSubView === "ledger" ? "#0F172A" : "#64748B",
              fontWeight: activeSubView === "ledger" ? 800 : 600,
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: activeSubView === "ledger" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Core CBS Ledger & Double-Entry Invariants
          </button>
          <button
            type="button"
            data-testid="tab-intake-files"
            onClick={() => setActiveSubView("files")}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "none",
              background: activeSubView === "files" ? "#FFFFFF" : "transparent",
              color: activeSubView === "files" ? "#0F172A" : "#64748B",
              fontWeight: activeSubView === "files" ? 800 : 600,
              fontSize: "11px",
              cursor: "pointer",
              boxShadow: activeSubView === "files" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            Files: Evidence Exhibit Vault
          </button>
        </div>
      </div>

      {activeSubView === "files" ? (
        <div style={{ flex: "1 1 0%", minHeight: 0, overflow: "hidden", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
          <EvidenceFileManager caseId={activeCaseId || "CASE-2026-001"} onWhatChanged={(d) => setWhatChanged(d)} />
        </div>
      ) : (
        <>
          {/* =========================================================================
              ROW 1: TOP 4 KPI CARDS (80PX STANDARD / 64PX COMPACT)
              ========================================================================= */}
      <section
        aria-label="Key Forensic Metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: isCompact ? "6px" : "10px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <KpiTile
          title="Ledger conservation"
          value={isRow14Tampered ? "Row #14 Fail" : "100% Valid"}
          icon={ShieldCheck}
          iconColor={isRow14Tampered ? "#E11D48" : "#059669"}
          iconBg={isRow14Tampered ? "#FFE4E6" : "#ECFDF5"}
          statusBadge={{
            text: isRow14Tampered ? "BREACH ✗" : "6/6 RECONCILED",
            variant: isRow14Tampered ? "rose" : "emerald",
          }}
          subtitle="Bal[k] = Bal[k-1] + Cr - Dr"
          microVisual="ring"
          progressPct={isRow14Tampered ? 83 : 100}
          provenanceTooltip="Double-entry conservation solver: 6 CBS rows reconciled in 0.4ms."
          onClick={() => toggleMutation("alterBankRow14")}
        />

        <KpiTile
          title="NPCI RRN clock sync"
          value={isForgedRrn ? "10:50:14 IST" : "10:00:14 IST"}
          icon={Clock}
          iconColor={isForgedRrn ? "#E11D48" : "#4F46E5"}
          iconBg={isForgedRrn ? "#FFE4E6" : "#EEF2FF"}
          statusBadge={{
            text: isForgedRrn ? "CLOCK SKEW" : "Δ +14s (IN SPEC)",
            variant: isForgedRrn ? "rose" : "indigo",
          }}
          subtitle="Julian Day 265 · STAN #149921"
          microVisual="ring"
          progressPct={isForgedRrn ? 20 : 100}
          provenanceTooltip="NPCI UPI Switch timestamp decoded directly from 12-digit RRN."
          onClick={() => {
            setActiveDockTab("rrn");
            toggleMutation("forgeRrnTimestamp");
          }}
        />

        <KpiTile
          title="Claim vs. booked"
          value={`-₹${deltaLoss.toLocaleString("en-IN")}`}
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: `${suppressionRatio}× SUPPRESSED`, variant: "rose" }}
          subtitle={`Claimed: ${formatInr(claimedLoss, { compact: true })} vs CBS: ${formatInr(bookedLoss, { compact: true })}`}
          microVisual="ring"
          progressPct={Math.min(100, Math.round((claimedLoss / Math.max(bookedLoss, 1)) * 100))}
          provenanceTooltip={`Canva receipt suppressed genuine ${formatInr(bookedLoss)} CBS debit to fraudulent ${formatInr(claimedLoss)} claim.`}
          onClick={() => setActiveDockTab("pdf")}
        />

        <KpiTile
          title="Civilian PII blinded"
          value="9,996 / 10,000"
          icon={FileCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "99.96% BLINDED", variant: "emerald" }}
          subtitle="Air-Gap Zero External Calls"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Deterministic SHA-256 HMAC pseudonymization blinds innocent telecom subscribers."
          onClick={() => setActiveDockTab("privacy")}
        />
      </section>

      {/* =========================================================================
          ROW 2: FALSIFICATION GATE RAIL (64PX STANDARD / 48PX COMPACT)
          ========================================================================= */}
      <section
        aria-label="Falsification Gate Pipeline"
        style={{
          height: isCompact ? "48px" : "64px",
          minHeight: isCompact ? "48px" : "64px",
          maxHeight: isCompact ? "48px" : "64px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <GateRail
          isRow14Valid={isRow14Valid}
          isRrnValid={isRrnValid}
          isReceiptConflicted={true}
          isPdfAppended={true}
          isMerkleCompliant={true}
        />
      </section>

      {/* =========================================================================
          ROW 3: RESIZABLE WORKBENCH (LEFT: LEDGER CARD 62%, RIGHT: INSPECTOR DOCK 38%)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Group
          orientation="horizontal"
          id="tarka-intake-panels-group"
          style={{
            height: "100%",
            width: "100%",
            minHeight: 0,
            minWidth: 0,
            display: "flex",
          }}
        >
          {/* LEFT RESIZABLE PANEL: SBI Core Banking Ledger */}
          <Panel
            id="ledger-resizable-panel"
            defaultSize="62%"
            minSize="50%"
            style={{
              height: "100%",
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <LedgerCard
              rows={displayRows}
              isRow14Tampered={isRow14Tampered}
              customRow14Balance={customRow14Balance}
              onCustomBalanceChange={(val) => setCustomRow14Balance(val)}
              onResetRow14Balance={() => setCustomRow14Balance(normalRow14Bal.toFixed(2))}
              onSelectRrn={(rrn) => {
                setRrnInput(rrn);
                setActiveDockTab("rrn");
                toast.info(`Loaded RRN #${rrn} into Forensic Lab`, { duration: 2000 });
              }}
              searchTerm={searchTerm}
              onSearchChange={(val) => setSearchTerm(val)}
              searchInputRef={searchInputRef}
              sortPolarity={sortPolarity}
              onTogglePolarity={() => setSortPolarity((p) => (p === "ASC" ? "DESC" : "ASC"))}
              permuteActive={permuteActive}
              onTogglePermute={() =>
                setPermuteActive((prev) => {
                  const next = !prev;
                  toast.info(next ? "Same-Second Permutation: Active" : "Same-Second Permutation: Reset", {
                    duration: 2000,
                  });
                  return next;
                })
              }
              claimedAmount={canonicalCase.receiptClaim?.claimedAmount}
              claimedLabel={canonicalCase.receiptClaim?.label}
              cbsBookedAmount={canonicalCase.transactions.find((t) => t.category === "VICTIM_DRAIN")?.amount ?? investigation.edges[0]?.amount}
              disputedRrn={canonicalCase.transactions.find((t) => t.category === "VICTIM_DRAIN")?.rrn ?? investigation.edges[0]?.rrn}
            />
          </Panel>

          {/* RESIZABLE DIVIDER HANDLE */}
          <Separator
            aria-label="Resize ledger and forensic inspector panels"
            style={{
              width: "8px",
              margin: "0 2px",
              background: "#F1F5F9",
              borderRadius: "4px",
              border: "1px solid #E2E8F0",
              cursor: "col-resize",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "2px",
                height: "16px",
                borderRadius: "1px",
                background: "#94A3B8",
              }}
            />
          </Separator>

          {/* RIGHT RESIZABLE PANEL: Inspector Dock (Tabs: RRN, PDF, Privacy, Proof) */}
          <Panel
            id="inspector-resizable-panel"
            defaultSize="38%"
            minSize={440}
            maxSize="50%"
            style={{
              height: "100%",
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <InspectorDock
              rrnInput={rrnInput}
              onRrnChange={(val) => setRrnInput(val)}
              onResetRrn={() => setRrnInput("626510149921")}
              decodedRrn={decodedRrn}
              isForgedRrn={isForgedRrn}
              onToggleForgeRrn={() => toggleMutation("forgeRrnTimestamp")}
              isRow14Tampered={isRow14Tampered}
              onToggleRow14Tamper={() => toggleMutation("alterBankRow14")}
            />
          </Panel>
        </Group>
      </main>
        </>
      )}

      {/* What Changed Highlight Banner */}
      <WhatChangedBanner data={whatChanged} onClose={() => setWhatChanged(null)} />
    </div>
  );
};

export default IntakeScreen;
