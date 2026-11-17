import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ChevronRight, Layers, Network, UserRound, X, FileWarning } from 'lucide-react';
import clsx from 'clsx';
import { BorderBeam } from '../../components/magicui/border-beam';
import { SourceNumber } from '../ui';
import type { MoneyFigure } from '../../selectors/caseSelectors';
import { STATUS_HELP, STATUS_LABEL, type EvidenceFile, type EvidenceStatus, type IntegritySummary } from '../../selectors/evidenceSelectors';
import { setFocus, focusLevel, type Focus } from '../../lib/focusUrl';
import type { FraudNetwork } from '../triage/triage';
import { formatInr } from '../../lib/formatInr';

export const STATUS_TONE: Record<EvidenceStatus, { fg: string; bg: string }> = {
  READY: { fg: 'var(--safe)', bg: 'var(--safe-bg)' },
  NEEDS_MAPPING: { fg: 'var(--urgent)', bg: 'var(--urgent-bg)' },
  DUPLICATE: { fg: 'var(--fg-2)', bg: 'var(--surface-3)' },
  REJECTED: { fg: 'var(--risk)', bg: 'var(--risk-bg)' },
  FAILED: { fg: 'var(--risk)', bg: 'var(--risk-bg)' },
  PROCESSING: { fg: 'var(--flow)', bg: 'var(--flow-bg)' },
};

export const StatusPill: React.FC<{ status: EvidenceStatus }> = ({ status }) => (
  <span
    title={STATUS_HELP[status]}
    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap"
    style={{ color: STATUS_TONE[status].fg, background: STATUS_TONE[status].bg }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
    {STATUS_LABEL[status]}
  </span>
);

const n = (x: number) => x.toLocaleString('en-IN');

// ── Zoom: Case › Network › Account ─────────────────────────────────────────

export const FocusBar: React.FC<{ caseId: string; focus: Focus; networks: FraudNetwork[] | null }> = ({ caseId, focus, networks }) => {
  const level = focusLevel(focus);
  const net = networks?.find((x) => x.network_id === focus.networkId);
  const crumb = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium transition-colors';
  return (
    <nav aria-label="Zoom level" className="flex flex-wrap items-center gap-1 text-[var(--fg-2)]">
      <button
        type="button"
        onClick={() => setFocus({ networkId: null, account: null })}
        className={clsx(crumb, level === 'project' ? 'text-[var(--fg-1)] bg-[var(--glass-2)] shadow-[var(--glass-shadow)]' : 'hover:bg-[var(--hover)]')}
        title="Every network in this case"
      >
        <Layers className="h-3.5 w-3.5" /> Whole case <span className="v6-mono text-[var(--fg-3)]">{caseId}</span>
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-3)]" />
      {networks && networks.length > 0 ? (
        <label className={clsx(crumb, 'relative', level === 'network' && 'text-[var(--fg-1)] bg-[var(--glass-2)] shadow-[var(--glass-shadow)]')}>
          <Network className="h-3.5 w-3.5" />
          <span className="sr-only">Network</span>
          <select
            value={focus.networkId ?? ''}
            onChange={(e) => setFocus({ networkId: e.target.value || null, account: null })}
            className="max-w-[320px] cursor-pointer truncate bg-transparent pr-1 outline-none"
            title={net ? `${net.network_id}: ${net.mule_count} suspected mules, ${formatInr(net.amount_inr)} paid in by victims` : 'Pick one network to narrow the ledger'}
          >
            <option value="">{networks.length === 1 ? 'Its 1 network' : `All ${networks.length} networks`}</option>
            {networks.map((x) => (
              <option key={x.network_id} value={x.network_id}>
                {`${x.network_id} (${x.mule_count} mule${x.mule_count === 1 ? '' : 's'}, ${formatInr(x.amount_inr, { compact: true })})`}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span className={clsx(crumb, 'text-[var(--fg-3)]')} title="No fraud networks found in the uploaded rows yet">
          <Network className="h-3.5 w-3.5" /> No networks yet
        </span>
      )}
      {focus.account && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-3)]" />
          <span className={clsx(crumb, 'max-w-[300px] text-[var(--fg-1)] bg-[var(--glass-2)] shadow-[var(--glass-shadow)]')}>
            <UserRound className="h-3.5 w-3.5 flex-none" />
            <span className="truncate v6-mono" title={focus.account}>{focus.account}</span>
            <button
              type="button"
              aria-label="Back to the network"
              onClick={() => setFocus({ networkId: focus.networkId, account: null })}
              className="ml-0.5 rounded p-0.5 hover:bg-[var(--hover)]"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </>
      )}
    </nav>
  );
};

// ── Integrity verdict ──────────────────────────────────────────────────────

interface IntegrityPanelProps {
  summary: IntegritySummary;
  files: EvidenceFile[];
  lossFigure: MoneyFigure;
  onShowRejected: (file: EvidenceFile) => void;
  onShowFileRows: (file: EvidenceFile | null) => void;
  onJump: (id: 'inventory' | 'ledger') => void;
}

export const IntegrityPanel: React.FC<IntegrityPanelProps> = ({ summary, files, lossFigure, onShowRejected, onShowFileRows, onJump }) => {
  const reduce = useReducedMotion();
  const safe = summary.tone === 'safe';
  const worst = [...files].sort((a, b) => (b.rowsRejected ?? 0) - (a.rowsRejected ?? 0))[0];
  const Icon = safe ? ShieldCheck : ShieldAlert;
  const tone = safe ? 'var(--safe)' : 'var(--urgent)';

  const stat = (label: string, value: React.ReactNode, help: string, onClick?: () => void, emphasis?: boolean) => (
    <div className="min-w-0">
      <div className="text-[12px] text-[var(--fg-3)] truncate" title={help}>{label}</div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          title={help}
          className={clsx(
            'mt-0.5 rounded text-left underline decoration-dotted decoration-1 underline-offset-4 decoration-current/30 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]',
            emphasis ? 'text-[var(--urgent)]' : 'text-[var(--fg-1)]',
          )}
        >
          <span className="whitespace-nowrap text-[21px] font-[650] tracking-tight v6-mono tabular-nums">{value}</span>
        </button>
      ) : (
        <div className="mt-0.5 whitespace-nowrap text-[21px] font-[650] tracking-tight v6-mono tabular-nums text-[var(--fg-1)]">{value}</div>
      )}
    </div>
  );

  return (
    <section aria-label="Can we trust the evidence?" className="v6-glass rounded-2xl p-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="flex items-start gap-4 min-w-0"
        >
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full" style={{ background: safe ? 'var(--safe-bg)' : 'var(--urgent-bg)', color: tone }}>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[21px] font-[650] leading-snug tracking-tight text-[var(--fg-1)]" data-testid="integrity-headline">
              {summary.headline}
            </h2>
            <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-[var(--fg-2)]">
              Each file was fingerprinted when it arrived and sealed read-only, so any later change would show.{' '}
              {summary.rowsRejected > 0 && worst?.jobId ? (
                <button type="button" onClick={() => onShowRejected(worst)} className="font-semibold text-[var(--accent)] hover:underline">
                  See why rows were rejected
                </button>
              ) : null}
              {summary.attention.length > 0 && (
                <span className="mt-1 flex items-center gap-1.5 text-[var(--urgent)]">
                  <FileWarning className="h-3.5 w-3.5 flex-none" />
                  <span className="truncate" title={summary.attention.map((f) => `${f.filename}: ${STATUS_LABEL[f.status]}`).join('\n')}>
                    {summary.attention.length === 1
                      ? `${summary.attention[0].filename} is ${STATUS_LABEL[summary.attention[0].status].toLowerCase()}`
                      : `${summary.attention.length} files need a look`}
                  </span>
                </span>
              )}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4 xl:border-l xl:border-[var(--line)] xl:pl-6">
          {stat('Files', n(summary.files), 'Every file uploaded to this case. Click to see the list.', () => onJump('inventory'))}
          {stat('Rows read', n(summary.rowsAccepted), 'Statement rows that were read and are searchable below. Click to open them.', () => onShowFileRows(null))}
          {stat(
            'Rows rejected',
            n(summary.rowsRejected),
            summary.rowsRejected ? 'Rows that could not be read. Click to see each one with the reason.' : 'No row was rejected.',
            summary.rowsRejected && worst?.jobId ? () => onShowRejected(worst) : undefined,
            summary.rowsRejected > 0,
          )}
          <div className="min-w-0">
            <div className="text-[12px] text-[var(--fg-3)] truncate" title="Money that left victims' accounts into suspected mule accounts. Same figure as Money trail and Triage.">
              Victims' loss
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[21px] font-[650] tracking-tight v6-mono tabular-nums text-[var(--fg-1)]">
              <SourceNumber figure={lossFigure}>{formatInr(lossFigure.totalInr, { compact: true })}</SourceNumber>
            </div>
          </div>
        </div>
      </div>

      {files.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4" aria-label="Files at a glance">
          {files.slice(0, 14).map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => (f.jobId && f.rowsAccepted ? onShowFileRows(f) : onJump('inventory'))}
                title={`${f.filename}\n${STATUS_LABEL[f.status]}: ${STATUS_HELP[f.status]}`}
                className="relative inline-flex max-w-[240px] items-center gap-2 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--glass-1)] py-1 pl-1.5 pr-2.5 text-[12px] text-[var(--fg-2)] hover:border-[var(--line-2)] hover:text-[var(--fg-1)]"
              >
                <span className="h-5 w-1 flex-none rounded-full" style={{ background: STATUS_TONE[f.status].fg }} />
                <span className="truncate">{f.filename}</span>
                {f.status === 'PROCESSING' && <BorderBeam size={36} duration={3} colorFrom="var(--accent)" colorTo="var(--flow)" />}
              </button>
            </li>
          ))}
          {files.length > 14 && (
            <li>
              <button type="button" onClick={() => onJump('inventory')} className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)] hover:underline">
                {`${files.length - 14} more`}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
};
