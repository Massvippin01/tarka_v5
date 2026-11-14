import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHead, FindingStrip, Card, CardHeader, Button, Chip } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';

interface LedgerRowItem {
  id: string;
  time: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number;
  isSuspect?: boolean;
}

export const EvidenceLedgerScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = getCanonicalCase(caseId);

  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5]));

  // Ledger rows derived from case transactions & balance progression
  const ledgerRows = useMemo<LedgerRowItem[]>(() => {
    if (caseId === 'CASE-2026-001') {
      return [
        { id: '1', time: '09:15', desc: 'Opening balance', debit: 0, credit: 0, balance: 529140 },
        { id: '2', time: '09:42', desc: 'UPI · Retail store', debit: 3450, credit: 0, balance: 525690 },
        { id: '3', time: '09:55', desc: 'NEFT · Salary credit', debit: 0, credit: 125000, balance: 650690 },
        { id: '4', time: '10:00', desc: 'UPI · vikramshah@okaxis', debit: 285000, credit: 0, balance: 365690, isSuspect: true },
        { id: '5', time: '10:14', desc: 'UPI · Municipal utilities', debit: 4200, credit: 0, balance: 361490 },
        { id: '6', time: '10:28', desc: 'UPI · vikramshah@okaxis', debit: 215000, credit: 0, balance: 146490, isSuspect: true },
      ];
    }

    // Generic fallback computation for other cases
    const op = canonical.complainant.openingBalance || 500000;
    const loss = canonical.financials.bookedLossInr;
    return [
      { id: '1', time: '09:00', desc: 'Opening balance', debit: 0, credit: 0, balance: op },
      { id: '2', time: '09:30', desc: 'Core banking interest credit', debit: 0, credit: 2500, balance: op + 2500 },
      { id: '3', time: '10:15', desc: 'Unauthorized layer-1 transfer', debit: Math.round(loss * 0.6), credit: 0, balance: op + 2500 - Math.round(loss * 0.6), isSuspect: true },
      { id: '4', time: '10:30', desc: 'Unauthorized conduit drain', debit: Math.round(loss * 0.4), credit: 0, balance: op + 2500 - loss, isSuspect: true },
    ];
  }, [caseId, canonical]);

  // Re-run check animation
  const handleRerunCheck = () => {
    setCheckedIndices(new Set());
    setScanningIndex(0);

    ledgerRows.forEach((_, idx) => {
      setTimeout(() => {
        setScanningIndex(idx);
        setCheckedIndices((prev) => new Set([...prev, idx]));
        if (idx === ledgerRows.length - 1) {
          setTimeout(() => setScanningIndex(null), 300);
        }
      }, 250 + idx * 220);
    });
  };

  const bookedLoss = canonical.financials.bookedLossInr;
  const claimedLoss = canonical.receiptClaim.claimedAmount || 15000;
  const deltaLoss = bookedLoss - claimedLoss;

  const checks = [
    { title: 'Balances add up', sub: `${ledgerRows.length} of ${ledgerRows.length} rows reconcile`, status: 'ok' },
    { title: 'Transaction IDs valid', sub: 'RRN format + date match NPCI', status: 'ok' },
    { title: 'Settled by NPCI', sub: 'Switch timestamps within ±3 min', status: 'ok' },
    {
      title: 'Receipt PDF untouched',
      sub: caseId === 'CASE-2026-001' ? '14.2 KB appended after signing' : 'PDF structure clean',
      status: caseId === 'CASE-2026-001' ? 'warn' : 'ok',
    },
    { title: 'Evidence sealed', sub: 'SHA-256 recorded at intake', status: 'ok' },
  ];

  return (
    <div className="v6-enter space-y-4" data-testid="v6-evidence-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 1 · Evidence & Ledger"
        title="Did the money really leave?"
        actions={
          <Button
            variant="default"
            size="md"
            icon={<Plus className="w-4 h-4" />}
          >
            Add evidence
          </Button>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant={caseId === 'CASE-2026-001' ? 'safe' : 'safe'}
        action={
          <Button
            variant="safe"
            size="sm"
            onClick={() => setActiveView('people')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            iconPosition="right"
          >
            Who received it?
          </Button>
        }
      >
        Bank ledger proves <b>{formatInr(bookedLoss, { showPaise: false })}</b> left{' '}
        {canonical.complainant.name}'s {canonical.complainant.bank.split(' ')[0]} account in 2 transfers.{' '}
        {caseId === 'CASE-2026-001' ? (
          <>
            The receipt he was shown is <b>forged</b>.
          </>
        ) : (
          'All transactions are confirmed in core banking.'
        )}
      </FindingStrip>

      {/* Claim vs Proof 3-Column Hero Card */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left Column: T3 Unverified Claim */}
          <div className="md:col-span-5 p-5 rounded-2xl border-2 border-dashed border-rose-500/40 bg-rose-500/5 flex flex-col justify-between">
            <div>
              <Chip variant="risk">T3 · Unverified claim</Chip>
              <div className="v6-mono text-3xl font-extrabold text-[#fda4af] my-2">
                {formatInr(claimedLoss, { showPaise: false })}
              </div>
              <div className="text-sm text-[var(--fg-2)] font-medium">
                Payment receipt PDF shown to the victim
              </div>
            </div>
            <div className="text-xs text-[var(--fg-3)] mt-2">
              {caseId === 'CASE-2026-001'
                ? 'Edited after creation (+14.2 KB appended)'
                : 'Declared unverified intake voucher'}
            </div>
          </div>

          {/* Middle Column: Delta Discrepancy */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-2">
            <svg width="56" height="56" viewBox="0 0 64 64" className="overflow-visible">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="var(--risk)"
                strokeWidth="2.5"
                strokeDasharray="176"
                strokeDashoffset="0"
                className="transition-all duration-700"
              />
              <path
                d="M20 28h24M20 36h24M38 18L26 46"
                stroke="var(--risk)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="v6-mono text-sm font-bold text-[#fda4af] mt-2">
              Δ {formatInr(deltaLoss, { showPaise: false })}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] uppercase tracking-wider font-semibold">
              Discrepancy
            </div>
          </div>

          {/* Right Column: T1 Verified Core Banking Record */}
          <div className="md:col-span-5 p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 flex flex-col justify-between">
            <div>
              <Chip variant="safe">T1 · Verified bank record</Chip>
              <div className="v6-mono text-3xl font-extrabold text-[#6ee7b7] my-2">
                {formatInr(bookedLoss, { showPaise: false })}
              </div>
              <div className="text-sm text-[var(--fg-2)] font-medium">
                {canonical.complainant.bank} core banking ledger · 2 debits
              </div>
            </div>
            <div className="text-xs text-[var(--fg-3)] mt-2">
              Every balance reconciles · SHA-256 sealed
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid: Ledger Table (7 cols) + Integrity Checks (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bank Ledger Table Card */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader
              title={`${canonical.complainant.bank.split(' ')[0]} ledger · A/C ••${canonical.complainant.accountMasked.slice(-4)}`}
              subtitle="Each row checked: previous balance + credit − debit = balance"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={handleRerunCheck}
                  id="rerunCheck"
                >
                  Re-run check
                </Button>
              }
            />

            <div className="v6-table-wrap flex-1">
              <table className="v6-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Transaction</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((r, i) => {
                    const isScanning = scanningIndex === i;
                    const isChecked = checkedIndices.has(i);
                    const prevRow = i > 0 ? ledgerRows[i - 1] : null;
                    const isOk = !prevRow || prevRow.balance + r.credit - r.debit === r.balance;

                    return (
                      <tr
                        key={r.id}
                        className={clsx(
                          'row',
                          r.isSuspect && 'suspect',
                          isScanning && 'scanning'
                        )}
                      >
                        <td className="v6-mono text-xs text-[var(--fg-3)]">{r.time}</td>
                        <td>
                          <div className={clsx('text-xs', r.isSuspect ? 'font-bold text-[var(--fg-1)]' : 'font-medium text-[var(--fg-2)]')}>
                            {r.desc}
                          </div>
                          {r.isSuspect && (
                            <span className="v6-chip risk text-[10.5px] px-1.5 py-0.5 mt-1">
                              To suspect account
                            </span>
                          )}
                        </td>
                        <td className="amt text-xs font-semibold" style={{ color: r.debit ? '#fda4af' : 'var(--fg-3)' }}>
                          {r.debit ? `−${formatInr(r.debit, { showPaise: false })}` : '—'}
                        </td>
                        <td className="amt text-xs font-semibold" style={{ color: r.credit ? '#6ee7b7' : 'var(--fg-3)' }}>
                          {r.credit ? `+${formatInr(r.credit, { showPaise: false })}` : '—'}
                        </td>
                        <td className="amt text-xs font-bold text-[var(--fg-1)]">
                          {formatInr(r.balance, { showPaise: false })}
                        </td>
                        <td className="text-center">
                          <span
                            className={clsx(
                              'w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold transition-all',
                              isChecked
                                ? isOk
                                  ? 'bg-[var(--safe-bg)] text-[var(--safe)]'
                                  : 'bg-[var(--risk-bg)] text-[var(--risk)]'
                                : 'bg-[var(--surface-3)] text-[var(--fg-3)]'
                            )}
                          >
                            {isChecked ? (isOk ? '✓' : '✗') : '·'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Integrity Checks Card */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Integrity checks"
              subtitle="Automated forensic validations executed at ingestion"
            />
            <div className="space-y-3 flex-1">
              {checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'p-3.5 rounded-xl border bg-[var(--surface-2)] flex items-center gap-3 transition-colors',
                    chk.status === 'ok'
                      ? 'border-emerald-500/30'
                      : 'border-amber-500/40 bg-amber-500/5'
                  )}
                >
                  <div
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-none font-bold text-xs',
                      chk.status === 'ok'
                        ? 'bg-[var(--safe-bg)] text-[var(--safe)]'
                        : 'bg-[var(--urgent-bg)] text-[var(--urgent)]'
                    )}
                  >
                    {chk.status === 'ok' ? '✓' : '!'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[var(--fg-1)]">
                      {chk.title}
                    </div>
                    <div className="text-[11.5px] text-[var(--fg-3)] mt-0.5">
                      {chk.sub}
                    </div>
                  </div>
                  <FileCheck className="w-4 h-4 text-[var(--fg-3)] flex-none" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
