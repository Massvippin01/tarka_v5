import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Sparkles, History, UploadCloud, FolderOpen, AlertTriangle } from 'lucide-react';
import { PageHead, Button, EmptyState, Skeleton } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { selectLedgerFacts, selectFinancialSummary, selectMoneyFigure } from '../../selectors/caseSelectors';
import {
  EMPTY_FILTERS,
  integritySummary,
  inventoryFromFixture,
  inventoryFromJobs,
  type EvidenceFile,
  type LedgerFilters,
} from '../../selectors/evidenceSelectors';
import { formatInr } from '../../lib/formatInr';
import { useFocus, focusLevel } from '../../lib/focusUrl';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { decodeRailReference } from '../../utils/intakeFalsifier';
import { CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import { GateRail } from '../../components/tarka/intake/GateRail';
import { InspectorDock } from '../../components/tarka/intake/InspectorDock';
import { EndToEndReconstructionStrip } from '../../components/tarka/investigation/EndToEndReconstructionStrip';
import { InvestigationIntelligenceBrief } from '../../components/tarka/investigation/InvestigationIntelligenceBrief';
import { TransformationAuditLog } from '../../components/tarka/investigation/TransformationAuditLog';
import { useEvidenceData } from '../evidence/useEvidenceData';
import { FocusBar, IntegrityPanel } from '../evidence/IntegrityPanel';
import { CustodyTimeline, EvidenceInventory, InventorySkeleton, RejectedRowsDialog } from '../evidence/EvidenceRegister';
import { LedgerTable } from '../evidence/LedgerTable';

const EvidenceLedgerScreenInner: React.FC<ActiveCaseProps> = ({ fixture: canonicalCase }) => {
  const { setActiveView } = useCaseStore();
  const caseId = canonicalCase.caseId;
  const demo = CANONICAL_CASES[caseId] ?? null; // demo cases carry their own exhibits; uploaded cases read the server
  const urlFocus = useFocus();

  const { jobs, custody, networks } = useEvidenceData(caseId, !demo);
  const files: EvidenceFile[] = useMemo(
    () => (demo ? inventoryFromFixture(buildCaseBundleFromFixture(demo).fileManifest, demo) : inventoryFromJobs(jobs.data ?? [])),
    [demo, jobs.data],
  );
  const summary = useMemo(() => integritySummary(files), [files]);
  const lossFigure = useMemo(() => selectMoneyFigure(canonicalCase, 'loss'), [canonicalCase]);

  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_FILTERS);
  const [rejectedFor, setRejectedFor] = useState<EvidenceFile | null>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<HTMLDivElement>(null);
  const jump = (id: 'inventory' | 'ledger') => (id === 'inventory' ? inventoryRef : ledgerRef).current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const showFileRows = (f: EvidenceFile | null) => {
    setFilters({ ...EMPTY_FILTERS, jobId: f?.jobId ?? '' });
    jump('ledger');
  };

  const nets = networks.data?.networks ?? null;
  // A network id that is not in this case (stale link, other case) falls back to the whole case, as on the Network page.
  const staleNet = !!nets && !!urlFocus.networkId && !nets.some((x) => x.network_id === urlFocus.networkId);
  const focus = staleNet ? { ...urlFocus, networkId: null } : urlFocus;
  const net = nets?.find((x) => x.network_id === focus.networkId);
  const level = focusLevel(focus);
  const scopeNote =
    level === 'account' ? `Only payments to or from ${focus.account}.`
    : level === 'network' && net
      ? `Network ${net.network_id}: payments touching its ${net.members.length.toLocaleString('en-IN')} accounts${net.member_count > net.members.length ? ` (the most mule-like of ${net.member_count.toLocaleString('en-IN')})` : ''}.`
    : level === 'network' ? `Network ${focus.networkId}.`
    : nets?.length ? `Whole case: ${nets.length === 1 ? 'its network' : `all ${nets.length.toLocaleString('en-IN')} networks`} and every other payment in the statements.`
    : 'Whole case: every payment in the uploaded statements.';

  const loadingFiles = !demo && jobs.isLoading;
  const noFiles = !demo && jobs.isSuccess && files.length === 0;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-evidence-screen">
      <PageHead
        kicker="Step 1 · Evidence & Ledger"
        title="What evidence do we have, and can we trust it?"
        actions={
          <div className="flex items-center gap-2">
            <Button size="md" onClick={() => setActiveView('upload')}>
              <span className="flex items-center gap-1.5"><UploadCloud className="h-3.5 w-3.5" /> Add evidence</span>
            </Button>
            <Button variant="primary" size="md" onClick={() => setActiveView('people')}>
              <span className="flex items-center gap-1.5">People & accounts <ArrowRight className="h-3.5 w-3.5" /></span>
            </Button>
          </div>
        }
      />

      <FocusBar caseId={caseId} focus={focus} networks={nets} />

      {loadingFiles ? (
        <div className="v6-glass rounded-2xl p-5"><Skeleton height={64} /><div className="mt-4 grid grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={44} />)}</div></div>
      ) : jobs.isError ? (
        <div className="v6-glass flex items-center gap-3 rounded-2xl p-5 text-[13px]">
          <AlertTriangle className="h-5 w-5 flex-none text-[var(--risk)]" />
          <span className="text-[var(--fg-1)]">The list of uploaded files could not be loaded, so TARKA cannot say yet whether the evidence is complete.</span>
          <Button size="sm" onClick={() => void jobs.refetch()}>Try again</Button>
        </div>
      ) : noFiles ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title="No evidence uploaded yet"
          description="Upload the bank or UPI statements for this case. TARKA fingerprints each file, reads every row and shows here what it could and could not read."
          action={<Button variant="primary" size="sm" onClick={() => setActiveView('upload')}>Open Upload Center</Button>}
        />
      ) : (
        <IntegrityPanel summary={summary} files={files} lossFigure={lossFigure} onShowRejected={setRejectedFor} onShowFileRows={showFileRows} onJump={jump} />
      )}

      {!noFiles && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section ref={inventoryRef} aria-label="Evidence files" className="v6-glass scroll-mt-4 rounded-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Evidence files</h3>
                <p className="truncate text-[12px] text-[var(--fg-3)]">
                  {demo ? 'Exhibits that came with this demo case.' : 'Everything uploaded to this case, newest first. Files belong to the case, whatever you are zoomed into.'}
                </p>
              </div>
            </header>
            <div className="max-h-[420px] overflow-y-auto px-1 py-1">
              {loadingFiles ? <InventorySkeleton /> : (
                <EvidenceInventory files={files} onShowRejected={setRejectedFor} onShowFileRows={showFileRows} onOpenUpload={() => setActiveView('upload')} />
              )}
            </div>
          </section>
          {demo ? (
            <section className="v6-glass rounded-2xl p-4 text-[13px] text-[var(--fg-2)]">
              <h3 className="mb-1 text-[14px] font-[650] text-[var(--fg-1)]">Who handled the files</h3>
              These exhibits were loaded with the demo case, not uploaded, so there is no custody log to show. Uploaded files get one automatically.
            </section>
          ) : (
            <CustodyTimeline caseId={caseId} events={custody.data} isLoading={loadingFiles || custody.isLoading} isError={custody.isError} onRetry={() => void custody.refetch()} />
          )}
        </div>
      )}

      {!noFiles && (
        <div ref={ledgerRef} className="scroll-mt-4">
          <LedgerTable caseId={caseId} demo={demo} focus={focus} filters={filters} onFilters={setFilters} files={files} scopeNote={scopeNote} />
        </div>
      )}

      <AdvancedChecks fixture={canonicalCase} />

      <RejectedRowsDialog file={rejectedFor} onClose={() => setRejectedFor(null)} />
    </div>
  );
};

/** Forensic detail kept out of the main view: bank-reference decoder, claim vs. statement, processing log. */
const AdvancedChecks: React.FC<ActiveCaseProps> = ({ fixture: canonicalCase }) => {
  const { mutations, toggleMutation } = useTarkaGlobal();
  const { intelligenceBriefOpen, setIntelligenceBriefOpen, transformationAuditModalOpen, setTransformationAuditModalOpen } = useTarkaUiStore();
  const fin = useMemo(() => selectFinancialSummary(canonicalCase), [canonicalCase]);
  const ledger = useMemo(() => selectLedgerFacts(canonicalCase), [canonicalCase]);
  const investigation = useMemo(() => buildCaseBundleFromFixture(canonicalCase), [canonicalCase]);
  const [open, setOpen] = useState(false);
  const defaultRrn = ledger.firstDrainRrn ?? canonicalCase.transactions.find((t) => t.rrn)?.rrn ?? '';
  const [rrnInput, setRrnInput] = useState(defaultRrn);
  const isForgedRrn = !!mutations.forgeRrnTimestamp;
  const isRow14Tampered = !!mutations.alterBankRow14;

  const decodedRrn = useMemo(() => {
    const iso = (ledger.firstDrainIst || '').replace(' IST', '').replace(' ', 'T');
    const d = new Date(`${iso}Z`);
    if (iso && !Number.isNaN(d.getTime()) && isForgedRrn) d.setUTCMinutes(d.getUTCMinutes() + 50);
    const claimed = iso && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 19) : '';
    return decodeRailReference(rrnInput, claimed || undefined);
  }, [rrnInput, isForgedRrn, ledger.firstDrainIst]);

  return (
    <section className="v6-glass rounded-2xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Advanced checks</h3>
          <p className="truncate text-[12px] text-[var(--fg-3)]">Decode a bank reference, compare the complaint with the statements, see how the data was processed.</p>
        </div>
        <ChevronDown className={`h-4 w-4 flex-none text-[var(--fg-3)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-[var(--line)] p-4">
          <p className="text-[13px] text-[var(--fg-2)]">
            {!fin.claimedLossInr
              ? <>No complaint amount has been entered, so there is nothing to compare the statements' {formatInr(fin.bookedLossInr)} against.</>
              : fin.claimMatchesLedger
                ? <>The complaint says {formatInr(fin.claimedLossInr)}; the statements agree.</>
                : <>The complaint says {formatInr(fin.claimedLossInr)}, but the statements show {formatInr(fin.bookedLossInr)}, a difference of {formatInr(Math.abs(fin.claimGapInr))}.</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setIntelligenceBriefOpen(true)}><span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> 7-question brief</span></Button>
            <Button size="sm" onClick={() => setTransformationAuditModalOpen(true)}><span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Processing log</span></Button>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-2"><EndToEndReconstructionStrip /></div>
          <div className="rounded-xl border border-[var(--line)] p-2.5">
            <GateRail isRow14Valid={!isRow14Tampered} isRrnValid={decodedRrn.admissibilityVerdict === 'ADMISSIBLE'} isReceiptConflicted={!fin.claimMatchesLedger} isPdfAppended={investigation.preIngestionTamper?.hasTamper ?? false} isMerkleCompliant />
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--line)]">
            <InspectorDock
              rrnInput={rrnInput}
              onRrnChange={setRrnInput}
              onResetRrn={() => setRrnInput(defaultRrn)}
              decodedRrn={decodedRrn}
              isForgedRrn={isForgedRrn}
              onToggleForgeRrn={() => toggleMutation('forgeRrnTimestamp')}
              isRow14Tampered={isRow14Tampered}
              onToggleRow14Tamper={() => toggleMutation('alterBankRow14')}
            />
          </div>
        </div>
      )}
      <InvestigationIntelligenceBrief isOpen={intelligenceBriefOpen} onClose={() => setIntelligenceBriefOpen(false)} />
      <TransformationAuditLog isOpen={transformationAuditModalOpen} onClose={() => setTransformationAuditModalOpen(false)} />
    </section>
  );
};

export const EvidenceLedgerScreen = withActiveCase(EvidenceLedgerScreenInner);
