import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  FolderOpen,
  Sparkles,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import {
  validateRunningBalance,
  decodeRailReference,
  type LedgerRowData,
} from '../../utils/intakeFalsifier';
import { GateRail } from '../../components/tarka/intake/GateRail';
import { LedgerCard } from '../../components/tarka/intake/LedgerCard';
import { InspectorDock } from '../../components/tarka/intake/InspectorDock';
import { EndToEndReconstructionStrip } from '../../components/tarka/investigation/EndToEndReconstructionStrip';
import { CaseSyncBridge } from '../../services/caseSyncBridge';
import { reconstruct5FileInvestigation } from '../../utils/investigationReconstructor';
import { getCanonicalCase, CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';
import { EvidenceFileManager } from '../../components/tarka/intake/EvidenceFileManager';
import { InvestigationIntelligenceBrief } from '../../components/tarka/investigation/InvestigationIntelligenceBrief';
import { TransformationAuditLog } from '../../components/tarka/investigation/TransformationAuditLog';

export const EvidenceLedgerScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { mutations, toggleMutation, setActiveRoute } = useTarkaGlobal();
  const {
    setActiveDockTab,
    activeDiscoveredCluster,
    reconstructedInvestigation,
    intelligenceBriefOpen,
    setIntelligenceBriefOpen,
    transformationAuditModalOpen,
    setTransformationAuditModalOpen,
  } = useTarkaUiStore();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = useMemo(() => getCanonicalCase(caseId), [caseId]);

  const fallbackInvestigation = useMemo(() => reconstruct5FileInvestigation(), []);

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === caseId) {
      return reconstructedInvestigation;
    }
    if (caseId && CANONICAL_CASES[caseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[caseId]);
    }
    return reconstructedInvestigation || fallbackInvestigation;
  }, [reconstructedInvestigation, caseId, fallbackInvestigation]);

  const isRow14Tampered = !!mutations.alterBankRow14;
  const isForgedRrn = !!mutations.forgeRrnTimestamp;

  const [sortPolarity, setSortPolarity] = useState<'ASC' | 'DESC'>('ASC');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [permuteActive, setPermuteActive] = useState<boolean>(false);
  const [activeSubView, setActiveSubView] = useState<'ledger' | 'files'>('ledger');
  const [isCopiedSection94, setIsCopiedSection94] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalRow14Bal = useMemo(() => {
    const bal0 = canonicalCase.complainant.openingBalance;
    const bal1 = bal0 - 3450;
    const salaryCredit = canonicalCase.complainant.salaryCredit || 125000;
    const bal2 = bal1 + salaryCredit;
    const drainTx = canonicalCase.transactions.find((t) => t.category === 'VICTIM_DRAIN');
    const drainAmount = drainTx ? drainTx.amount : (investigation.edges[0]?.amount || 285000);
    return bal2 - drainAmount;
  }, [canonicalCase, investigation]);

  const bookedLoss = canonicalCase.financials.bookedLossInr;
  const claimedLoss = canonicalCase.financials.claimedLossInr;
  const deltaLoss = Math.abs(bookedLoss - claimedLoss);
  const suppressionRatio = (bookedLoss / Math.max(claimedLoss, 1)).toFixed(1);

  const [customRow14Balance, setCustomRow14Balance] = useState<string>(
    isRow14Tampered ? (normalRow14Bal - 200000).toFixed(2) : normalRow14Bal.toFixed(2)
  );

  const [rrnInput, setRrnInput] = useState<string>('626510149921');

  useEffect(() => {
    if (activeDiscoveredCluster) {
      if (activeDiscoveredCluster.forgedRrnRows?.[0]?.rrn) {
        const nextRrn = activeDiscoveredCluster.forgedRrnRows[0].rrn;
        setRrnInput((prev) => (prev !== nextRrn ? nextRrn : prev));
      }
      if (activeDiscoveredCluster.doctoredBalanceRows?.[0]) {
        const d = activeDiscoveredCluster.doctoredBalanceRows[0];
        const errorVal = d.claimedBalError ?? (d as any).claimed_bal_error ?? 200000;
        const targetBal = isRow14Tampered ? (836550 - errorVal).toFixed(2) : '836550.00';
        setCustomRow14Balance((prev) => (prev !== targetBal ? targetBal : prev));
      }
    } else {
      const primaryTx = canonicalCase.transactions.find((t) => t.category === 'VICTIM_DRAIN');
      const nextRrn = primaryTx?.rrn || investigation.edges[0]?.rrn;
      if (nextRrn) {
        setRrnInput((prev) => (prev !== nextRrn ? nextRrn : prev));
      }
      const targetBal = isRow14Tampered ? (normalRow14Bal - 200000).toFixed(2) : normalRow14Bal.toFixed(2);
      setCustomRow14Balance((prev) => (prev !== targetBal ? targetBal : prev));
    }
  }, [isRow14Tampered, activeDiscoveredCluster, investigation, normalRow14Bal, canonicalCase]);

  // Base Raw CBS Ledger Rows
  const rawRows: LedgerRowData[] = useMemo(() => {
    if (activeDiscoveredCluster) {
      const victim = activeDiscoveredCluster.victimAccount || canonicalCase.complainant.name || 'Victim Source Account';
      const conduit = activeDiscoveredCluster.layer1Conduit || canonicalCase.accounts.find((a) => (a as any).muleLayer === 'L1')?.holderName || 'Layer 1 Mule';
      const doctored = activeDiscoveredCluster.doctoredBalanceRows?.[0];
      const forgedRrn = activeDiscoveredCluster.forgedRrnRows?.[0];
      const defaultTxnId = canonicalCase.transactions[0]?.id || 'TXN-PRIMARY-01';
      const defaultRrn = canonicalCase.transactions[0]?.rrn || 'RRN-UNRECORDED';

      const claimedError = doctored ? (doctored.claimedBalError ?? (doctored as any).claimed_bal_error ?? 200000) : 200000;
      const bookedDebit1 = doctored ? (doctored.bookedDebit ?? (doctored as any).booked_debit ?? 280000) : 280000;
      const stolenTotal = activeDiscoveredCluster.totalDrained || 840000;
      const bookedDebit2 = Math.max(0, stolenTotal - bookedDebit1);

      const bal0 = 1120000.0;
      const bal1 = bal0 - 3450.0;
      const bal2 = bal1 - bookedDebit1;
      const parsedCustom = parseFloat(String(customRow14Balance).replace(/,/g, ''));
      const validCustom = !isNaN(parsedCustom) ? parsedCustom : bal2;
      const rowTamperedBal = isRow14Tampered ? (bal2 - claimedError) : validCustom;
      const bal3 = Math.max(0, rowTamperedBal - bookedDebit2);

      const clusterRows: LedgerRowData[] = [
        {
          id: 'CBS-001',
          sequenceNo: 1,
          timestamp: '2026-09-22T09:15:02',
          description: `OPENING BALANCE B/F [${victim}]`,
          rrn: '—',
          debit: 0.0,
          credit: 0.0,
          balance: bal0,
        },
        {
          id: 'CBS-002',
          sequenceNo: 2,
          timestamp: '2026-09-22T09:42:18',
          description: 'UPI/DR/6265091148/GROCERY_STORE',
          rrn: '626509114820',
          debit: 3450.0,
          credit: 0.0,
          balance: bal1,
        },
        {
          id: doctored ? (doctored.txId ?? (doctored as any).tx_id ?? defaultTxnId) : defaultTxnId,
          sequenceNo: 3,
          timestamp: '2026-09-22T10:00:14',
          description: `UPI/DR/${forgedRrn ? forgedRrn.rrn : defaultRrn}/${conduit}`,
          rrn: forgedRrn ? forgedRrn.rrn : defaultRrn,
          debit: bookedDebit1,
          credit: 0.0,
          balance: rowTamperedBal,
        },
        {
          id: 'CBS-004',
          sequenceNo: 4,
          timestamp: '2026-09-22T10:14:32',
          description: `UPI/DR/626510149921/${conduit}`,
          rrn: '626510149921',
          debit: bookedDebit2,
          credit: 0.0,
          balance: bal3,
        },
      ];
      return sortPolarity === 'ASC' ? clusterRows : [...clusterRows].reverse();
    }

    return CaseSyncBridge.getInstance().deriveCaseLedgerRows(
      caseId,
      investigation,
      sortPolarity,
      isRow14Tampered,
      customRow14Balance,
      permuteActive
    );
  }, [activeDiscoveredCluster, caseId, investigation, sortPolarity, isRow14Tampered, customRow14Balance, permuteActive, canonicalCase]);

  // Conservation Solver
  const validationResult = useMemo(() => {
    return validateRunningBalance(rawRows, sortPolarity);
  }, [rawRows, sortPolarity]);

  // RRN Dissector
  const decodedRrn = useMemo(() => {
    const claimedTime = isForgedRrn ? '2026-09-22T10:50:14' : '2026-09-22T10:00:14';
    return decodeRailReference(rrnInput, claimedTime);
  }, [rrnInput, isForgedRrn]);

  // Display rows
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

  const isRow14Valid = validationResult.isValid;
  const isRrnValid = decodedRrn.admissibilityVerdict === 'ADMISSIBLE';

  const handleCopySection94 = () => {
    const text = `BNSS §94 DIRECTIVE: CBS Transaction Falsification & Forgery Exception Notice\nCase ID: ${caseId}\nComplainant: ${canonicalCase.complainant.name}\nBooked Outflow: ${formatInr(bookedLoss)}\nSuppressed Claim: ${formatInr(claimedLoss)}\nRRN Discrepancy: ${rrnInput} (STAN mismatch verified)`;
    navigator.clipboard.writeText(text);
    setIsCopiedSection94(true);
    toast.success('Copied §94 BNSS Order to clipboard');
    setTimeout(() => setIsCopiedSection94(false), 2000);
  };

  return (
    <div className="v6-enter space-y-3" data-testid="v6-evidence-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 1 · Evidence & Ledger"
        title="Did the money really leave?"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIntelligenceBriefOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>7-Question Brief</span>
            </button>
            <button
              type="button"
              onClick={() => setTransformationAuditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-[var(--fg-3)]" />
              <span>Transformation Log</span>
            </button>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                setActiveView('people');
                setActiveRoute('entities');
              }}
            >
              <span className="flex items-center gap-1.5">
                <span>People & Accounts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant={isRow14Tampered ? 'warn' : 'safe'}
        action={
          <button
            type="button"
            onClick={() => {
              setActiveView('people');
              setActiveRoute('entities');
            }}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Review People & Accounts</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          Genuine Finacle CBS statement proves <strong>{formatInr(bookedLoss)}</strong> loss; Canva PDF receipt is forged (+14.2KB append).
        </span>
      </FindingStrip>

      {/* 5-File Evidentiary Join Strip */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-2 shadow-xs">
        <EndToEndReconstructionStrip />
      </div>

      {/* Sub-View Switcher Tab Pills */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
          <button
            type="button"
            onClick={() => setActiveSubView('ledger')}
            className={`px-3 py-1 rounded text-[12px] font-semibold transition-all ${
              activeSubView === 'ledger'
                ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Core CBS Ledger & Double-Entry Invariants</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('files')}
            className={`px-3 py-1 rounded text-[12px] font-semibold transition-all ${
              activeSubView === 'files'
                ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[var(--fg-3)]" />
              <span>Evidence Exhibit Vault & Ingestion Pipeline</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySection94}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors"
          >
            {isCopiedSection94 ? (
              <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[var(--fg-3)]" />
            )}
            <span>Copy §94 Falsification Directive</span>
          </button>
        </div>
      </div>

      {activeSubView === 'files' ? (
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 min-h-[500px]">
          <EvidenceFileManager caseId={caseId} />
        </div>
      ) : (
        <>
          {/* 4 Key Forensic Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              onClick={() => toggleMutation('alterBankRow14')}
              className="v6-card cursor-pointer hover:border-[var(--accent)] transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[var(--fg-3)]">Ledger conservation</span>
                <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                  isRow14Tampered ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]' : 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
                }`}>
                  {isRow14Tampered ? 'BREACH ✗' : '6/6 RECONCILED'}
                </span>
              </div>
              <div className="text-[20px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors">
                {isRow14Tampered ? 'Row #14 Fail' : '100% Valid'}
              </div>
              <div className="text-[12px] text-[var(--fg-3)] mt-1 font-mono truncate">
                Bal[k] = Bal[k-1] + Cr - Dr
              </div>
            </div>

            <div
              onClick={() => {
                setActiveDockTab('rrn');
                toggleMutation('forgeRrnTimestamp');
              }}
              className="v6-card cursor-pointer hover:border-[var(--accent)] transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[var(--fg-3)]">NPCI RRN clock sync</span>
                <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                  isForgedRrn ? 'bg-[var(--color-risk-bg)] text-[var(--risk)]' : 'bg-[var(--color-flow-bg)] text-[var(--flow)]'
                }`}>
                  {isForgedRrn ? 'CLOCK SKEW' : 'Δ +14s (IN SPEC)'}
                </span>
              </div>
              <div className="text-[20px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors">
                {isForgedRrn ? '10:50:14 IST' : '10:00:14 IST'}
              </div>
              <div className="text-[12px] text-[var(--fg-3)] mt-1 font-mono truncate">
                Julian Day 265 · STAN #149921
              </div>
            </div>

            <div
              onClick={() => setActiveDockTab('pdf')}
              className="v6-card cursor-pointer hover:border-[var(--accent)] transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[var(--fg-3)]">Claim vs. booked</span>
                <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
                  {suppressionRatio}× SUPPRESSED
                </span>
              </div>
              <div className="text-[20px] font-bold text-[var(--risk)]">
                -₹{deltaLoss.toLocaleString('en-IN')}
              </div>
              <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
                Claim: {formatInr(claimedLoss, { compact: true })} vs CBS: {formatInr(bookedLoss, { compact: true })}
              </div>
            </div>

            <div
              onClick={() => setActiveDockTab('privacy')}
              className="v6-card cursor-pointer hover:border-[var(--accent)] transition-all group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[var(--fg-3)]">Civilian PII blinded</span>
                <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
                  99.96% BLINDED
                </span>
              </div>
              <div className="text-[20px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors">
                9,996 / 10,000
              </div>
              <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
                Air-Gap Zero External Calls
              </div>
            </div>
          </div>

          {/* Falsification Gate I1–I5 */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-2.5 shadow-xs">
            <GateRail
              isRow14Valid={isRow14Valid}
              isRrnValid={isRrnValid}
              isReceiptConflicted={true}
              isPdfAppended={true}
              isMerkleCompliant={true}
            />
          </div>

          {/* Discrepancy Hero Comparison Banner */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-[var(--color-risk-bg)] border border-[var(--risk)]/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[var(--risk)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--fg-1)]">
                      Falsified Canva PDF Receipt Discrepancy
                    </span>
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
                      {suppressionRatio}× Loss Suppression
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--fg-2)] mt-0.5">
                    Complainant reported <strong className="text-[var(--fg-1)]">{formatInr(claimedLoss)}</strong> based on doctored Canva PDF receipt. Finacle Core Banking double-entry proofs verify genuine unauthorized debit of <strong className="text-[var(--risk)]">{formatInr(bookedLoss)}</strong> across {displayRows.length} ledger transactions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveDockTab('pdf')}
                  className="px-2.5 py-1 text-[12px] font-medium text-[var(--fg-2)] bg-[var(--surface-2)] border border-[var(--line)] rounded hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors"
                >
                  View PDF Forensics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDockTab('rrn')}
                  className="px-2.5 py-1 text-[12px] font-medium text-[var(--accent)] bg-[var(--color-flow-bg)] border border-[var(--accent)]/30 rounded hover:bg-[var(--accent)]/15 transition-colors"
                >
                  Inspect RRN Digit
                </button>
              </div>
            </div>
          </div>

          {/* 12-Column Main Workbench: Left 7 Cols LedgerCard, Right 5 Cols InspectorDock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
            {/* Left 7 Cols: Full CBS Ledger */}
            <div className="lg:col-span-7 flex flex-col min-h-0 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg overflow-hidden shadow-xs">
              <LedgerCard
                rows={displayRows}
                isRow14Tampered={isRow14Tampered}
                customRow14Balance={customRow14Balance}
                onCustomBalanceChange={(val) => setCustomRow14Balance(val)}
                onResetRow14Balance={() => setCustomRow14Balance(normalRow14Bal.toFixed(2))}
                onSelectRrn={(rrn) => {
                  setRrnInput(rrn);
                  setActiveDockTab('rrn');
                  toast.info(`Loaded RRN #${rrn} into Forensic Inspector`);
                }}
                searchTerm={searchTerm}
                onSearchChange={(val) => setSearchTerm(val)}
                searchInputRef={searchInputRef}
                sortPolarity={sortPolarity}
                onTogglePolarity={() => setSortPolarity((p) => (p === 'ASC' ? 'DESC' : 'ASC'))}
                permuteActive={permuteActive}
                onTogglePermute={() =>
                  setPermuteActive((prev) => {
                    const next = !prev;
                    toast.info(next ? 'Same-Second Permutation: Active' : 'Same-Second Permutation: Reset');
                    return next;
                  })
                }
                claimedAmount={claimedLoss}
                cbsBookedAmount={bookedLoss}
                disputedRrn={rrnInput}
              />
            </div>

            {/* Right 5 Cols: Forensic Inspector Dock */}
            <div className="lg:col-span-5 flex flex-col min-h-0 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg overflow-hidden shadow-xs">
              <InspectorDock
                rrnInput={rrnInput}
                onRrnChange={(val) => setRrnInput(val)}
                onResetRrn={() => setRrnInput('626510149921')}
                decodedRrn={decodedRrn}
                isForgedRrn={isForgedRrn}
                onToggleForgeRrn={() => toggleMutation('forgeRrnTimestamp')}
                isRow14Tampered={isRow14Tampered}
                onToggleRow14Tamper={() => toggleMutation('alterBankRow14')}
              />
            </div>
          </div>
        </>
      )}

      {/* Intelligence Brief Modal */}
      <InvestigationIntelligenceBrief
        isOpen={intelligenceBriefOpen}
        onClose={() => setIntelligenceBriefOpen(false)}
      />

      {/* Transformation Audit Modal */}
      <TransformationAuditLog
        isOpen={transformationAuditModalOpen}
        onClose={() => setTransformationAuditModalOpen(false)}
      />
    </div>
  );
};
