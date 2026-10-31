import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileCheck,
  Zap,
  Split,
  Copy,
  Check,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import {
  validateRunningBalance,
  decodeRailReference,
  type LedgerRowData,
} from "../../utils/intakeFalsifier";
import { IntakeKpiCard } from "../../components/tarka/intake/IntakeKpiCard";
import { LedgerCard } from "../../components/tarka/intake/LedgerCard";
import { RrnDissectorCard } from "../../components/tarka/intake/RrnDissectorCard";
import { IntegrityShieldCard } from "../../components/tarka/intake/IntegrityShieldCard";
import { FalsificationGateCard } from "../../components/tarka/intake/FalsificationGateCard";

export const IntakeScreen: React.FC = () => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const isRow14Tampered = !!mutations.alterBankRow14;
  const isForgedRrn = !!mutations.forgeRrnTimestamp;

  // Sorting, search & tab states
  const [sortPolarity, setSortPolarity] = useState<"ASC" | "DESC">("ASC");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTabDissector, setActiveTabDissector] = useState<"pdf" | "cgnat">("pdf");
  const [permuteActive, setPermuteActive] = useState<boolean>(false);
  const [copiedAcc, setCopiedAcc] = useState<boolean>(false);

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

  // Copy Account Number
  const handleCopyAcc = () => {
    navigator.clipboard.writeText("30981140029");
    setCopiedAcc(true);
    toast.success("Account #30981140029 copied to clipboard", { duration: 2000 });
    setTimeout(() => setCopiedAcc(false), 2000);
  };

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

  // State checks for the 5 invariants
  const isRow14Valid = validationResult.isValid;
  const isRrnValid = decodedRrn.admissibilityVerdict === "ADMISSIBLE";

  return (
    <div
      className="tarka-intake-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        boxSizing: "border-box",
        padding: "12px 18px 20px 18px",
        background: "var(--bento-canvas, #F4F6FB)",
      }}
      role="region"
      aria-label="Evidence Intake and Ledger Falsification Workbench"
    >
      <Toaster position="bottom-right" richColors />

      {/* =========================================================================
          COMPACT 44PX PAGE HEADER: TITLE + CASE CHIPS + CONTROLS ON 1 ROW
          ========================================================================= */}
      <header
        style={{
          height: "44px",
          minHeight: "44px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexShrink: 0,
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {/* Left: Section Number + Screen Title + Case Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#4338CA",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                padding: "2px 7px",
                borderRadius: "5px",
              }}
            >
              01
            </span>
            <h1
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#09090B",
                letterSpacing: "-0.02em",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              Evidence Intake & Ledger Falsification
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#475569",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                padding: "2px 7px",
                borderRadius: "5px",
                fontFamily: "var(--font-mono)",
              }}
            >
              FIR #149/2026
            </span>
            <button
              type="button"
              onClick={handleCopyAcc}
              title="Click to copy SBI Account Number"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#475569",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                padding: "2px 7px",
                borderRadius: "5px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>SBI A/c ····0029</span>
              {copiedAcc ? <Check size={11} color="#059669" /> : <Copy size={11} color="#94A3B8" />}
            </button>
          </div>
        </div>

        {/* Right: Actions (ASC/DESC, Permute, Toggle Row 14 Tamper) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* ASC | DESC Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              padding: "1px",
              height: "30px",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => setSortPolarity("ASC")}
              style={{
                border: "none",
                background: sortPolarity === "ASC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "ASC" ? "#09090B" : "#64748B",
                fontWeight: sortPolarity === "ASC" ? 700 : 500,
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              ASC
            </button>
            <button
              type="button"
              onClick={() => setSortPolarity("DESC")}
              style={{
                border: "none",
                background: sortPolarity === "DESC" ? "#F1F5F9" : "transparent",
                color: sortPolarity === "DESC" ? "#09090B" : "#64748B",
                fontWeight: sortPolarity === "DESC" ? 700 : 500,
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              DESC
            </button>
          </div>

          {/* Permute Same-Second Toggle */}
          <button
            type="button"
            onClick={() => {
              setPermuteActive((prev) => !prev);
              toast.info(!permuteActive ? "Same-Second Permutation: Active" : "Same-Second Permutation: Reset");
            }}
            style={{
              height: "30px",
              padding: "0 9px",
              borderRadius: "6px",
              border: permuteActive ? "1px solid #C7D2FE" : "1px solid #E2E8F0",
              background: permuteActive ? "#EEF2FF" : "#FFFFFF",
              color: permuteActive ? "#4338CA" : "#334155",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
            title="Permute same-second timestamps to test sub-second arrival causality [P]"
          >
            <Split size={12} color={permuteActive ? "#4F46E5" : "#64748B"} />
            <span>Permute Same-Sec</span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "#94A3B8",
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              P
            </span>
          </button>

          {/* Toggle Row #14 Tamper Button */}
          <button
            type="button"
            onClick={() => {
              toggleMutation("alterBankRow14");
              toast(
                isRow14Tampered
                  ? "Row #14 Restored to ₹5,22,440.00 ✓"
                  : "Row #14 Tampered to ₹3,22,440.00 (-₹2.00L Deficit) ✗",
                {
                  description: isRow14Tampered
                    ? "All double-entry invariants satisfied."
                    : "Falsification gate halted downstream engines.",
                }
              );
            }}
            style={{
              height: "30px",
              padding: "0 10px",
              borderRadius: "6px",
              border: isRow14Tampered ? "1px solid #FECDD3" : "1px solid #E2E8F0",
              background: isRow14Tampered ? "#FFF1F2" : "#FFFFFF",
              color: isRow14Tampered ? "#BE123C" : "#09090B",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
            title="Simulate bank ledger tampering on Row #14 to test mathematical falsification [T]"
          >
            <Zap
              size={12}
              color={isRow14Tampered ? "#E11D48" : "#F59E0B"}
              fill={isRow14Tampered ? "#E11D48" : "#F59E0B"}
            />
            <span>{isRow14Tampered ? "Row #14 Tampered (-₹2.00L)" : "Toggle Row #14 Tamper"}</span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "var(--font-mono)",
                color: "#94A3B8",
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              T
            </span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          TOP 4 KPI CARDS: 96PX STANDARDIZED HEIGHT, #09090B HERO, SEMANTIC BADGES
          ========================================================================= */}
      <section
        aria-label="Key Forensic Metrics"
        className="bento-grid-4"
        style={{
          marginBottom: "10px",
          gap: "10px",
          flexShrink: 0,
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
          tooltipText="Mathematical conservation solver: 6 CBS rows reconciled in 0.4ms"
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
          onClick={() => toggleMutation("forgeRrnTimestamp")}
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
        />

        {/* KPI 4: PDF XRef & CGNAT Shield */}
        <IntakeKpiCard
          title="PDF XRef & Privacy Shield"
          heroText="9,996 / 10,000"
          pillText="99.96% Blinded"
          pillVariant="emerald"
          metaText="DoT Cl. 39.20 Safe · 2 %%EOF"
          icon={FileCheck}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
          tooltipText="Dual %%EOF trailers detected; 9,996 innocent citizens blinded in CGNAT pool"
          onClick={() => setActiveTabDissector((prev) => (prev === "pdf" ? "cgnat" : "pdf"))}
        />
      </section>

      {/* =========================================================================
          MAIN WORKBENCH: 2-COLUMN GRID (LEFT: LEDGER + GATE, RIGHT: RRN LAB + SHIELD)
          ========================================================================= */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 420px",
          gap: "10px",
          flex: 1,
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        {/* =======================================================================
            LEFT COLUMN: SBI CORE BANKING LEDGER + FALSIFICATION GATE
            ======================================================================= */}
        <section
          aria-label="Core Banking Ledger and Falsification Gate"
          style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <LedgerCard
            rows={displayRows}
            isRow14Tampered={isRow14Tampered}
            customRow14Balance={customRow14Balance}
            onCustomBalanceChange={(val) => setCustomRow14Balance(val)}
            onResetRow14Balance={() => setCustomRow14Balance("522440.00")}
            onSelectRrn={(rrn) => {
              setRrnInput(rrn);
              toast.info(`Loaded RRN #${rrn} into Dissector`, { duration: 2000 });
            }}
            searchTerm={searchTerm}
            onSearchChange={(val) => setSearchTerm(val)}
            searchInputRef={searchInputRef}
          />

          <FalsificationGateCard
            isRow14Valid={isRow14Valid}
            isRrnValid={isRrnValid}
            isReceiptConflicted={true}
            isPdfAppended={true}
            isMerkleCompliant={true}
            onJumpToLedger={() => {
              searchInputRef.current?.focus();
            }}
          />
        </section>

        {/* =======================================================================
            RIGHT COLUMN: STACKED RRN FORENSIC LAB & INTEGRITY SHIELD
            ======================================================================= */}
        <section
          aria-label="Forensic Dissectors and Shield"
          style={{
            width: "420px",
            minWidth: "420px",
            maxWidth: "420px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Card 1: NPCI RRN Dissector */}
          <RrnDissectorCard
            rrnInput={rrnInput}
            onRrnChange={(val) => setRrnInput(val)}
            onReset={() => setRrnInput("626510149921")}
            decoded={decodedRrn}
            isForgedRrn={isForgedRrn}
            onToggleForgeRrn={() => toggleMutation("forgeRrnTimestamp")}
          />

          {/* Card 2: PDF XRef & CGNAT Merkle Shield */}
          <IntegrityShieldCard
            activeTab={activeTabDissector}
            onTabChange={(tab) => setActiveTabDissector(tab)}
          />
        </section>
      </main>
    </div>
  );
};

export default IntakeScreen;
