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
import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";
import { GateRail } from "../../components/tarka/intake/GateRail";
import { LedgerCard } from "../../components/tarka/intake/LedgerCard";
import { InspectorDock } from "../../components/tarka/intake/InspectorDock";

export const IntakeScreen: React.FC = () => {
  // Dev overflow detection
  useOverflowGuard();

  const { mutations, toggleMutation } = useTarkaGlobal();
  const { activeDockTab, setActiveDockTab, density } = useTarkaUiStore();
  const isCompact = density === "compact";

  const isRow14Tampered = !!mutations.alterBankRow14;
  const isForgedRrn = !!mutations.forgeRrnTimestamp;

  // Sorting, search & permute states
  const [sortPolarity, setSortPolarity] = useState<"ASC" | "DESC">("ASC");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [permuteActive, setPermuteActive] = useState<boolean>(false);

  // Editable Row #14 Balance State
  const [customRow14Balance, setCustomRow14Balance] = useState<string>(
    isRow14Tampered ? "322440.00" : "522440.00"
  );

  // NPCI RRN Dissector Input
  const [rrnInput, setRrnInput] = useState<string>("626510149921");

  // Search input ref for keyboard shortcut '/'
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync custom input with global mutation toggle
  useEffect(() => {
    setCustomRow14Balance(isRow14Tampered ? "322440.00" : "522440.00");
  }, [isRow14Tampered]);

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
            ? "Row #14 Restored to ₹5,22,440.00 ✓"
            : "Row #14 Tampered to ₹3,22,440.00 (-₹2.00L Deficit) ✗",
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

  // Base Raw CBS Ledger Rows (SBI Finacle 10.x, Account #30981140029)
  const rawRows: LedgerRowData[] = useMemo(() => {
    const row14Val = parseFloat(customRow14Balance) || (isRow14Tampered ? 322440.0 : 522440.0);
    const row15Bal = isRow14Tampered ? 318240.0 : 518240.0;
    const row16Bal = isRow14Tampered ? 308240.0 : 508240.0;

    const baseList: LedgerRowData[] = [
      {
        id: "CBS-011",
        sequenceNo: 11,
        timestamp: "2026-09-22T09:15:02",
        description: "OPENING BALANCE B/F",
        rrn: "—",
        debit: 0.0,
        credit: 0.0,
        balance: 615890.0,
      },
      {
        id: "CBS-012",
        sequenceNo: 12,
        timestamp: "2026-09-22T09:42:18",
        description: "UPI/DR/6265091148/GROCERY_STORE",
        rrn: "626509114820",
        debit: 3450.0,
        credit: 0.0,
        balance: 612440.0,
      },
      {
        id: "CBS-013",
        sequenceNo: 13,
        timestamp: permuteActive ? "2026-09-22T10:00:14" : "2026-09-22T09:55:00",
        description: "NEFT/CR/SBIN26265/SALARY_CREDIT",
        rrn: "SBIN260922123456",
        debit: 0.0,
        credit: 125000.0,
        balance: 737440.0,
      },
      {
        id: "CBS-014",
        sequenceNo: 14,
        timestamp: "2026-09-22T10:00:14",
        description: "UPI/DR/626510149921/VIKRAM_MULE",
        rrn: "626510149921",
        debit: 215000.0,
        credit: 0.0,
        balance: row14Val,
      },
      {
        id: "CBS-015",
        sequenceNo: 15,
        timestamp: "2026-09-22T10:14:32",
        description: "UPI/DR/6265118821/ELECTRICITY_BILL",
        rrn: "626511882194",
        debit: 4200.0,
        credit: 0.0,
        balance: row15Bal,
      },
      {
        id: "CBS-016",
        sequenceNo: 16,
        timestamp: "2026-09-22T10:28:45",
        description: "IMPS/DR/6265129940/CASH_ATM_SWEEP",
        rrn: "626512994031",
        debit: 10000.0,
        credit: 0.0,
        balance: row16Bal,
      },
    ];

    return sortPolarity === "ASC" ? baseList : [...baseList].reverse();
  }, [sortPolarity, isRow14Tampered, customRow14Balance, permuteActive]);

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

      {/* =========================================================================
          ROW 1: TOP 4 KPI CARDS (80PX STANDARD / 64PX COMPACT)
          ========================================================================= */}
      <section
        aria-label="Key Forensic Metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: isCompact ? "6px" : "10px",
          height: isCompact ? "64px" : "80px",
          minHeight: isCompact ? "64px" : "80px",
          maxHeight: isCompact ? "64px" : "80px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {/* KPI 1: Double-Entry Conservation */}
        <IntakeKpiCard
          title="Ledger Conservation"
          heroText={isRow14Tampered ? "Row #14 Fail" : "100% Valid"}
          pillText={isRow14Tampered ? "BREACH ✗" : "✓ 6/6 Reconciled"}
          pillVariant={isRow14Tampered ? "rose" : "emerald"}
          metaText="Bal[k] = Bal[k-1] + Cr - Dr"
          icon={ShieldCheck}
          iconColor={isRow14Tampered ? "#E11D48" : "#059669"}
          iconBg={isRow14Tampered ? "#FFF1F2" : "#ECFDF5"}
          tooltipText="Double-entry conservation solver: 6 CBS rows reconciled in 0.4ms"
          onClick={() => toggleMutation("alterBankRow14")}
        />

        {/* KPI 2: NPCI RRN Clock Sync */}
        <IntakeKpiCard
          title="NPCI RRN Clock Sync"
          heroText="10:00:14 IST"
          pillText={isForgedRrn ? "CLOCK SKEW" : "Δ +14s IST"}
          pillVariant={isForgedRrn ? "rose" : "indigo"}
          metaText="Julian Day 265 · STAN #149921"
          icon={Clock}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          tooltipText="NPCI UPI Switch timestamp decoded directly from 12-digit RRN"
          active={activeDockTab === "rrn"}
          onClick={() => {
            setActiveDockTab("rrn");
            toggleMutation("forgeRrnTimestamp");
          }}
        />

        {/* KPI 3: Claim vs CBS */}
        <IntakeKpiCard
          title="Claim vs CBS"
          heroText="-₹2,00,000.00"
          pillText="14.3× Suppressed"
          pillVariant="rose"
          metaText="Canva Superimposed Overwrite"
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFF1F2"
          tooltipText="Receipt claimed ₹15,000 vs actual SBI Finacle ledger debit of ₹2,15,000"
          active={activeDockTab === "pdf"}
          onClick={() => setActiveDockTab("pdf")}
        />

        {/* KPI 4: Evidence Integrity */}
        <IntakeKpiCard
          title="Evidence Integrity"
          heroText="9,996 / 10,000"
          pillText="99.96% Blinded"
          pillVariant="emerald"
          metaText="DoT Cl. 39.20 Safe · 2 %%EOF"
          icon={FileCheck}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          tooltipText="Dual %%EOF trailers detected; 9,996 innocent citizens blinded in CGNAT pool"
          active={activeDockTab === "privacy"}
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
              onResetRow14Balance={() => setCustomRow14Balance("522440.00")}
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
    </div>
  );
};

export default IntakeScreen;
