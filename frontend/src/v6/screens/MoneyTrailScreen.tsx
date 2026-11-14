import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  Building,
  Printer,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';
import { generateBnssDrafts } from '../../utils/taintLienEngine';
import { recoveryModel } from '../../utils/recoveryModel';
import { MoneyFlowSankeyGraph } from '../../components/tarka/taint/MoneyFlowSankeyGraph';
import { GoldenHourDecayChart } from '../../components/tarka/taint/GoldenHourDecayChart';
import { RecoveryModelPanel } from '../../components/tarka/taint/RecoveryModelPanel';

type TaintRule = 'LIBR' | 'FIFO' | 'PRO_RATA';
type WorkspaceMode = 'dag' | 'orders';

export const MoneyTrailScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { mutations, toggleMutation, setActiveRoute } = useTarkaGlobal();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = useMemo(() => getCanonicalCase(caseId), [caseId]);

  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<WorkspaceMode>('dag');
  const [selectedRule, setSelectedRule] = useState<TaintRule>('LIBR');
  const [freezeBudgetK, setFreezeBudgetK] = useState<number>(3);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNoticeType, setSelectedNoticeType] = useState<'106' | '107'>('106');
  const [isCopiedOrder, setIsCopiedOrder] = useState<boolean>(false);

  const isInjectClean = !!mutations.injectMerchantCleanDeposit;

  const recModel = useMemo(() => {
    return recoveryModel(isInjectClean, freezeBudgetK, caseId);
  }, [isInjectClean, freezeBudgetK, caseId]);

  const bnssDrafts = useMemo(() => {
    return generateBnssDrafts(
      '003201509821',
      'ICICI Bank Ltd',
      180000,
      `FIR #${canonicalCase.firNumber || '149/2026'}`
    );
  }, [canonicalCase]);

  const activeDraft = selectedNoticeType === '106' ? bnssDrafts.notice106 : bnssDrafts.application107;

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(activeDraft.draftText);
    setIsCopiedOrder(true);
    toast.success(`§ ${selectedNoticeType} BNSS Statutory Notice copied to clipboard`);
    setTimeout(() => setIsCopiedOrder(false), 2000);
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const victimLoss = canonicalCase.financials.bookedLossInr;
  const recoverableAmount = recModel.netRecoverableSum;
  const recoverablePct = Math.round((recoverableAmount / Math.max(victimLoss, 1)) * 100);

  return (
    <div className="v6-enter space-y-3" data-testid="v6-money-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 3 · Money Trail"
        title="Where did the funds go?"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveWorkspaceMode((m) => (m === 'dag' ? 'orders' : 'dag'))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{activeWorkspaceMode === 'dag' ? 'Draft §106/§107 Orders' : 'Back to Flow Graph'}</span>
            </button>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                setActiveView('network');
                setActiveRoute('network');
              }}
            >
              <span className="flex items-center gap-1.5">
                <span>Fraud Network</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="urgent"
        action={
          <button
            type="button"
            onClick={() => setActiveWorkspaceMode('orders')}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Execute §106 Freeze Orders</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          LIBR doctrine isolates <strong>{formatInr(recoverableAmount)} ({recoverablePct}%)</strong> in Layer-2 mule accounts & merchant lien, while protecting innocent commercial working capital.
        </span>
      </FindingStrip>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Victim booked loss</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
              CBS AUDIT
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">
            {formatInr(victimLoss)}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            {canonicalCase.complainant.name} · {canonicalCase.complainant.bank}
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Recoverable pool</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              {recoverablePct}% SECURED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--safe)]">
            {formatInr(recoverableAmount)}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Across 3 Layer-2 mule conduits & POS lien
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Min-cut freeze budget</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
              K = {freezeBudgetK} ACCOUNTS
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            K = {freezeBudgetK} optimal
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Stops 100% of onward multi-hop dispersal
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Innocent shielded</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              LIBR DOCTRINE
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--safe)]">
            {isInjectClean ? '₹4,50,000' : '₹2,50,000'}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Apex Traders clean turnover protected
          </div>
        </div>
      </div>

      {activeWorkspaceMode === 'orders' ? (
        /* MODE 2: STATUTORY BNSS ORDERS DRAFTER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
          {/* Left 7 Columns: Statutory Notice Drafter */}
          <div className="lg:col-span-7 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div>
                <h3 className="text-[14px] font-bold text-[var(--fg-1)]">
                  MHA 2026 SOP Statutory Order Drafter
                </h3>
                <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Dual-track statutory notices for specific debit liens (§106) vs full mule account attachment (§107).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveWorkspaceMode('dag')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-2)] border border-[var(--line)] rounded hover:bg-[var(--hover)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Flow</span>
              </button>
            </div>

            {/* Notice Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedNoticeType('106')}
                className={`p-2.5 rounded border text-left transition-all ${
                  selectedNoticeType === '106'
                    ? 'bg-[var(--color-flow-bg)] border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--surface-2)] border-[var(--line)] hover:bg-[var(--hover)]'
                }`}
              >
                <div className="text-[12px] font-bold text-[var(--fg-1)]">
                  § 106(1) BNSS Specific Lien Order
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Apex Electronics ICICI · ₹1,80,000 Specific Lien
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedNoticeType('107')}
                className={`p-2.5 rounded border text-left transition-all ${
                  selectedNoticeType === '107'
                    ? 'bg-[var(--color-safe-bg)] border-[var(--safe)] shadow-xs'
                    : 'bg-[var(--surface-2)] border-[var(--line)] hover:bg-[var(--hover)]'
                }`}
              >
                <div className="text-[12px] font-bold text-[var(--fg-1)]">
                  § 107 BNSS Provisional Seizure Application
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Vikram, Rohit & Sameer Mule Accounts
                </div>
              </button>
            </div>

            {/* Draft Content Box */}
            <div className="flex-1 min-h-[360px] p-3 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] leading-relaxed whitespace-pre-wrap overflow-y-auto">
              {activeDraft.draftText}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <span className="text-[12px] text-[var(--fg-3)]">
                Statutory Compliance Window: <strong>{activeDraft.statutoryDeadlineHours} Hours</strong> from receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintOrder}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded hover:bg-[var(--hover)]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Order</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyNotice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded shadow-xs"
                >
                  {isCopiedOrder ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedOrder ? 'Copied!' : 'Copy Order Draft'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: MHA 2026 SOP Statutory Schedule */}
          <div className="lg:col-span-5 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            <div className="pb-2 border-b border-[var(--line)]">
              <h3 className="text-[14px] font-bold text-[var(--fg-1)]">
                MHA 2026 Golden Hour SOP Schedule
              </h3>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                Statutory timelines binding Nodal Bank Officers under Sections 106 & 107 BNSS.
              </p>
            </div>

            <div className="space-y-2.5 text-[12px]">
              <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                <div className="font-bold text-[var(--fg-1)]">T+0 to T+2 Hours · Golden Hour SLA</div>
                <p className="text-[var(--fg-2)] mt-0.5">
                  1930 NCRP Portal acknowledgment requires automatic provisional freeze flag dispatch across all registered NPCI switch banks.
                </p>
              </div>

              <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                <div className="font-bold text-[var(--fg-1)]">T+2 to T+6 Hours · §106 Specific Lien Notice</div>
                <p className="text-[var(--fg-2)] mt-0.5">
                  Investigating Officer serves statutory notice to designated Nodal Bank Officer with SHA-256 evidence token.
                </p>
              </div>

              <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)]">
                <div className="font-bold text-[var(--fg-1)]">T+6 to T+24 Hours · Judicial Confirmation</div>
                <p className="text-[var(--fg-2)] mt-0.5">
                  Application to Chief Judicial Magistrate (CJM) for confirmation of provisional attachment under Section 107 BNSS.
                </p>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-[var(--line)]">
              <GoldenHourDecayChart height={160} />
            </div>
          </div>
        </div>
      ) : (
        /* MODE 1: INTERACTIVE SANKEY FLOW & RECOVERY ENGINE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
          {/* Left 7 Columns: Sankey Flow & Doctrine Comparison */}
          <div className="lg:col-span-7 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            {/* Toolbar: Freeze Budget K, Clean Deposit Injection, Accounting Doctrine */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-[var(--fg-3)]">Doctrine:</span>
                  {(['LIBR', 'FIFO', 'PRO_RATA'] as TaintRule[]).map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => setSelectedRule(rule)}
                      className={`px-2 py-0.5 text-[12px] font-semibold rounded transition-colors ${
                        selectedRule === rule
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-2)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-[var(--fg-3)]">Budget K:</span>
                  <select
                    value={freezeBudgetK}
                    onChange={(e) => setFreezeBudgetK(Number(e.target.value))}
                    className="px-2 py-0.5 text-[12px] font-semibold bg-[var(--surface-2)] border border-[var(--line)] rounded text-[var(--fg-1)]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <option key={k} value={k}>
                        K = {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMutation('injectMerchantCleanDeposit')}
                  className={`px-2.5 py-1 text-[12px] font-semibold rounded border transition-colors ${
                    isInjectClean
                      ? 'bg-[var(--color-safe-bg)] border-[var(--safe)] text-[var(--safe)]'
                      : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {isInjectClean ? '✓ Clean Deposit Active' : '+ Inject Clean Deposit'}
                </button>
              </div>
            </div>

            {/* Interactive D3 Sankey Graph */}
            <div className="flex-1 min-h-[380px] bg-[var(--surface-1)] border border-[var(--line)] rounded-lg overflow-hidden p-2">
              <MoneyFlowSankeyGraph
                freezeBudgetK={freezeBudgetK}
                onFreezeBudgetKChange={setFreezeBudgetK}
                isInjectClean={isInjectClean}
                onToggleInjectClean={() => toggleMutation('injectMerchantCleanDeposit')}
                selectedRule={selectedRule}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                victimName={canonicalCase.complainant.name}
                victimAccount={canonicalCase.complainant.accountMasked}
                lossAmount={victimLoss}
                primaryMuleName="Vikram Shah"
                primaryMuleAccount="Axis ••0291"
              />
            </div>

            {/* Accounting Doctrine Comparison Matrix */}
            <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-[var(--fg-1)] uppercase tracking-wider">
                  Accounting Doctrine Comparison
                </span>
                <span className="text-[var(--fg-3)]">Supreme Court & MHA Standard</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div
                  className={`p-2 rounded border ${
                    selectedRule === 'LIBR'
                      ? 'bg-[var(--surface-1)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-1)] border-[var(--line)]'
                  }`}
                >
                  <div className="font-bold text-[var(--fg-1)]">LIBR (Lowest Intermediate)</div>
                  <div className="text-[var(--safe)] font-semibold mt-0.5">₹3.80L Recoverable</div>
                  <div className="text-[var(--fg-3)] text-[12px] mt-0.5">
                    Shields ₹4.50L legitimate merchant capital under §106 specific lien.
                  </div>
                </div>

                <div
                  className={`p-2 rounded border ${
                    selectedRule === 'FIFO'
                      ? 'bg-[var(--surface-1)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-1)] border-[var(--line)]'
                  }`}
                >
                  <div className="font-bold text-[var(--fg-1)]">FIFO (First-In First-Out)</div>
                  <div className="text-[var(--urgent)] font-semibold mt-0.5">₹2.20L Recoverable</div>
                  <div className="text-[var(--fg-3)] text-[12px] mt-0.5">
                    Prematurely writes off tainted funds against earliest debits.
                  </div>
                </div>

                <div
                  className={`p-2 rounded border ${
                    selectedRule === 'PRO_RATA'
                      ? 'bg-[var(--surface-1)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-1)] border-[var(--line)]'
                  }`}
                >
                  <div className="font-bold text-[var(--fg-1)]">Pro-Rata Pooling</div>
                  <div className="text-[var(--risk)] font-semibold mt-0.5">₹1.85L Recoverable</div>
                  <div className="text-[var(--fg-3)] text-[12px] mt-0.5">
                    Dilutes victim recovery across unrelated commercial deposits.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Recovery Model Panel & Decay Chart */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {/* Recovery Model Panel */}
            <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs">
              <RecoveryModelPanel
                isInjectClean={isInjectClean}
                freezeBudgetK={freezeBudgetK}
                selectedNodeId={selectedNodeId}
                onCloseNodeDrawer={() => setSelectedNodeId(null)}
                onOpenOrders={() => setActiveWorkspaceMode('orders')}
                caseId={caseId}
                victimName={canonicalCase.complainant.name}
              />
            </div>

            {/* Golden Hour Decay Curve */}
            <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--line)] mb-2">
                <span className="text-[12px] font-bold text-[var(--fg-1)] uppercase tracking-wider">
                  Golden-Hour Recovery Curve
                </span>
                <span className="text-[12px] text-[var(--safe)] font-semibold">
                  T+2.5h Lien Locked
                </span>
              </div>
              <GoldenHourDecayChart height={175} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
