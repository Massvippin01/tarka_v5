import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, ChevronDown, Copy, FileText, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { PageHead } from '../ui';
import { formatInr } from '../../lib/formatInr';
import { useFocus } from '../../lib/focusUrl';
import { selectDeviceFacts, selectLedgerFacts, selectSyndicate } from '../../selectors/caseSelectors';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';
import { CaseActionsPanel } from '../../components/tarka/actions/CaseActionsPanel';
import { getDot3920PortBlockDirective } from '../../utils/statutoryDirectives';
import { FocusBar } from '../evidence/IntegrityPanel';
import { FreezeQueuePanel, NoticeList } from '../freeze/FreezeQueuePanel';
import { CourtChecklist, ProgressHeader } from '../freeze/ActionSummary';
import { useActionData } from '../freeze/useActionData';
import { ReportBuilder } from '../report/ReportBuilder';

export interface ActionsReportScreenProps {
  initialTab?: 'actions' | 'report' | 'dossier';
}

type Tab = 'freeze' | 'report';
type LetterTab = 'telecom' | 'npci' | 'i4c';

/** ?sel=a,b from the Money trail's "Freeze these first": pre-ticks those accounts once, then leaves the URL. */
function takeSelection(): string[] {
  const p = new URLSearchParams(window.location.search);
  const sel = p.get('sel');
  if (!sel) return [];
  p.delete('sel');
  const qs = p.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  return sel.split(',').filter(Boolean);
}

const OtherLetters: React.FC<ActiveCaseProps> = ({ fixture: c }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LetterTab>('telecom');
  const ledger = useMemo(() => selectLedgerFacts(c), [c]);
  const devices = useMemo(() => selectDeviceFacts(c), [c]);
  const syndicate = useMemo(() => selectSyndicate(c), [c]);
  const texts: Record<LetterTab, string> = useMemo(() => {
    const dev = devices.devices[0];
    return {
      telecom: getDot3920PortBlockDirective(c.caseId),
      npci: `NPCI SWITCH SETTLEMENT AUDIT REQUISITION\n[Under Section 94 BNSS & PSS Act 2007]\nTo: National Payments Corporation of India (NPCI) Switch Operations\nCase Ref: ${c.firNumber}\n\nSUBJECT: Switch log and RRN trace for RRN #${ledger.firstDrainRrn ?? 'n/a'}\n1. STAN: ${ledger.stan ?? 'n/a'}\n2. Julian day: ${ledger.julianDay ?? 'n/a'}\n3. Issuing bank: ${ledger.victimBank}\n4. Acquirer bank: ${ledger.acquirerBank ?? 'n/a'} (VPA ${ledger.acquirerVpa ?? 'n/a'})\n5. Time: ${ledger.firstDrainIst ?? 'n/a'}\n\nPlease preserve and certify the switch message packets under BSA §63(4).`,
      i4c: `I4C SAMANVAYA LINKED-CASE REPORT\nCase Ref: ${c.firNumber}\nCombined exposure: ${formatInr(syndicate.combinedExposureInr)} across ${syndicate.combinedCases.length} linked case${syndicate.combinedCases.length === 1 ? '' : 's'} (${syndicate.combinedCases.map((x) => x.caseId).join(', ') || 'none'})\n\nHandset: ${dev ? `IMEI ${dev.imei}` : 'none recorded'}\nShared identifiers: ${syndicate.anchors.map((a) => `${a.type} ${a.value}`).join('; ') || 'none'}\nWi-Fi BSSIDs: ${devices.bssids.join(', ') || 'none recorded'}`,
    };
  }, [c, ledger, devices, syndicate]);
  const label: Record<LetterTab, string> = { telecom: 'Telecom (block SIM / port)', npci: 'NPCI switch log', i4c: 'I4C linked cases' };
  return (
    <section className="v6-glass rounded-2xl">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-[var(--fg-1)]">
          <FileText className="h-4 w-4 text-[var(--fg-3)]" /> Other letters and case tasks
        </span>
        <ChevronDown className={clsx('h-4 w-4 text-[var(--fg-3)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-[var(--line)] p-4">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(label) as LetterTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx('rounded-lg border px-2.5 py-1 text-[12px] font-medium', tab === t ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--color-flow-bg)]' : 'border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]')}
              >
                {label[t]}
              </button>
            ))}
          </div>
          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[11.5px] leading-relaxed text-[var(--fg-1)]">{texts[tab]}</pre>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(texts[tab]).then(() => toast.success('Letter copied'), () => toast.error('Copy blocked by the browser'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[12px] font-medium text-[var(--fg-2)] hover:bg-[var(--hover)]"
          >
            <Copy className="h-3.5 w-3.5" /> Copy letter
          </button>
          <div className="min-h-[200px] border-t border-[var(--line)] pt-3">
            <CaseActionsPanel caseId={c.caseId} />
          </div>
        </div>
      )}
    </section>
  );
};

const ActionsReportScreenInner: React.FC<ActionsReportScreenProps & ActiveCaseProps> = ({ initialTab = 'actions', fixture }) => {
  const data = useActionData(fixture);
  const focus = useFocus();
  const [tab, setTab] = useState<Tab>(initialTab === 'actions' ? 'freeze' : 'report');
  const [initialSelection] = useState(takeSelection);
  const seg = 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors';

  return (
    <div className="v6-enter space-y-4" data-testid="v6-actions-screen">
      <PageHead
        kicker="Step 6 · Actions & Report"
        title="What to do now, and is the case ready for court?"
        actions={
          <div role="tablist" aria-label="Actions or report" className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--glass-1)] p-0.5">
            <button type="button" role="tab" aria-selected={tab === 'freeze'} onClick={() => setTab('freeze')} className={clsx(seg, tab === 'freeze' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]')}>
              <Snowflake className="h-3.5 w-3.5" /> Freeze & banks
            </button>
            <button type="button" role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')} className={clsx(seg, tab === 'report' ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]')}>
              <FileText className="h-3.5 w-3.5" /> Court report
            </button>
          </div>
        }
      />

      <FocusBar caseId={data.caseId} focus={focus} networks={data.fromServer ? data.networks : null} />

      {data.networksError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--color-risk-bg)] px-3 py-2 text-[12.5px] text-[var(--risk)]">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Could not load this case’s networks, so the queue is not split by network. Reload the page; if it persists, check that the server is running.
        </div>
      )}

      <ProgressHeader data={data} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {tab === 'freeze' ? (
            <>
              <FreezeQueuePanel key={`${focus.networkId}|${focus.account}`} data={data} fixture={fixture} initialSelection={initialSelection} />
              <NoticeList data={data} />
            </>
          ) : (
            <ReportBuilder data={data} />
          )}
        </div>
        <aside className="min-w-0 space-y-4">
          <div className="xl:sticky xl:top-4 space-y-4">
            <CourtChecklist data={data} />
            <OtherLetters fixture={fixture} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export const ActionsReportScreen = withActiveCase(ActionsReportScreenInner);
