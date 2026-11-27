import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronRight, Check, Layers, Network, Search, UserRound, X, FileWarning } from 'lucide-react';
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

const NetworkPicker: React.FC<{
  networks: FraudNetwork[];
  selectedId: string | null;
  active: boolean;
  onSelect: (networkId: string | null) => void;
}> = ({ networks, selectedId, active, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => networks.find((x) => x.network_id === selectedId) ?? null, [networks, selectedId]);
  const totals = useMemo(
    () => ({
      mules: networks.reduce((s, x) => s + (x.mule_count || 0), 0),
      inr: networks.reduce((s, x) => s + (x.amount_inr || 0), 0),
    }),
    [networks]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return networks;
    return networks.filter(
      (x) =>
        x.network_id.toLowerCase().includes(q) ||
        `${x.mule_count} mules`.includes(q) ||
        formatInr(x.amount_inr, { compact: true }).toLowerCase().includes(q)
    );
  }, [networks, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    if (networks.length > 5) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open, networks.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="focus-network-picker"
        title={
          selected
            ? `${selected.network_id}: ${selected.mule_count} suspected mules, ${formatInr(selected.amount_inr)} paid in by victims`
            : 'Pick one network to narrow this view'
        }
        className={clsx(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          open || active
            ? 'border-[var(--accent)]/50 bg-[var(--surface-1)] text-[var(--fg-1)] shadow-[0_2px_10px_rgba(35,87,245,0.10)]'
            : 'border-[var(--line)] bg-[var(--surface-1)]/80 text-[var(--fg-2)] hover:border-[var(--accent)]/40 hover:text-[var(--fg-1)]'
        )}
      >
        <Network className={clsx('h-3.5 w-3.5 flex-none', (open || active) ? 'text-[var(--accent)]' : 'text-[var(--fg-3)]')} />
        {selected ? (
          <>
            <span className="v6-mono font-semibold text-[var(--fg-1)]">{selected.network_id}</span>
            <span className="inline-flex items-center rounded-full bg-[var(--risk-bg)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--risk)] tabular-nums">
              {selected.mule_count} {selected.mule_count === 1 ? 'mule' : 'mules'}
            </span>
            <span className="text-[12px] font-semibold text-[var(--fg-2)] tabular-nums">
              {formatInr(selected.amount_inr, { compact: true })}
            </span>
          </>
        ) : (
          <span className="font-medium">
            {networks.length === 1 ? 'Its 1 network' : `All ${n(networks.length)} networks`}
          </span>
        )}
        <ChevronDown className={clsx('h-3.5 w-3.5 text-[var(--fg-3)] transition-transform duration-150', open && 'rotate-180 text-[var(--accent)]')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Choose fraud network"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute left-0 top-full z-50 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-1)] shadow-2xl backdrop-blur-xl"
          >
            {networks.length > 5 && (
              <div className="border-b border-[var(--line)] p-2">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--fg-3)]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Filter ${n(networks.length)} networks by ID or amount…`}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] py-1.5 pl-8 pr-7 text-[12px] text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear filter"
                      className="absolute right-2 rounded p-0.5 text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="border-b border-[var(--line)] p-1.5">
              <button
                type="button"
                role="option"
                aria-selected={!selectedId}
                onClick={() => pick(null)}
                className={clsx(
                  'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer',
                  !selectedId ? 'bg-[var(--accent-bg)] text-[var(--fg-1)]' : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={clsx('flex h-6 w-6 flex-none items-center justify-center rounded-lg', !selectedId ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--fg-3)]')}>
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold leading-tight">
                      {networks.length === 1 ? 'Its 1 network' : `All ${n(networks.length)} networks`}
                    </span>
                    <span className="block text-[11px] text-[var(--fg-3)]">
                      {n(totals.mules)} total mules · whole case scope
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 flex-none">
                  <span className="text-[12px] font-semibold tabular-nums text-[var(--fg-1)]">
                    {formatInr(totals.inr, { compact: true })}
                  </span>
                  {!selectedId && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                </span>
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-[var(--fg-3)]">
                  No networks match “{query}”
                </div>
              ) : (
                filtered.map((x) => {
                  const rank = networks.indexOf(x) + 1;
                  const isSel = x.network_id === selectedId;
                  return (
                    <button
                      key={x.network_id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => pick(x.network_id)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer',
                        isSel
                          ? 'bg-[var(--accent-bg)] ring-1 ring-[var(--accent)]/30'
                          : 'hover:bg-[var(--hover)]'
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={clsx(
                            'flex h-5 min-w-[24px] flex-none items-center justify-center rounded-md px-1 text-[10.5px] font-bold tabular-nums',
                            rank <= 3
                              ? 'bg-[var(--risk-bg)] text-[var(--risk)]'
                              : 'bg-[var(--surface-2)] text-[var(--fg-3)]'
                          )}
                        >
                          #{rank}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate v6-mono text-[12.5px] font-semibold text-[var(--fg-1)] leading-tight">
                            {x.network_id}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                            <span className="font-medium text-[var(--risk)] tabular-nums">
                              {x.mule_count} {x.mule_count === 1 ? 'mule' : 'mules'}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {x.victim_count} {x.victim_count === 1 ? 'victim' : 'victims'}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2 flex-none">
                        <span className="text-[12.5px] font-semibold tabular-nums text-[var(--fg-1)]">
                          {formatInr(x.amount_inr, { compact: true })}
                        </span>
                        <span className="flex w-4 justify-center">
                          {isSel && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FocusBar: React.FC<{ caseId: string; focus: Focus; networks: FraudNetwork[] | null }> = ({ caseId, focus, networks }) => {
  const level = focusLevel(focus);
  const crumb = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors';
  return (
    <nav aria-label="Zoom level" className="flex flex-wrap items-center gap-1.5 text-[var(--fg-2)]">
      <button
        type="button"
        onClick={() => setFocus({ networkId: null, account: null })}
        className={clsx(
          crumb,
          'border cursor-pointer',
          level === 'project'
            ? 'border-[var(--accent)]/40 text-[var(--fg-1)] bg-[var(--surface-1)] shadow-xs'
            : 'border-transparent hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
        title="Every network in this case"
      >
        <Layers className="h-3.5 w-3.5" /> Whole case <span className="v6-mono text-[var(--fg-3)]">{caseId}</span>
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-3)]" />
      {networks && networks.length > 0 ? (
        <NetworkPicker
          networks={networks}
          selectedId={focus.networkId}
          active={level === 'network'}
          onSelect={(networkId) => setFocus({ networkId, account: null })}
        />
      ) : (
        <span className={clsx(crumb, 'text-[var(--fg-3)]')} title="No fraud networks found in the uploaded rows yet">
          <Network className="h-3.5 w-3.5" /> No networks yet
        </span>
      )}
      {focus.account && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-3)]" />
          <span className={clsx(crumb, 'max-w-[300px] border border-[var(--line)] text-[var(--fg-1)] bg-[var(--surface-1)] shadow-xs')}>
            <UserRound className="h-3.5 w-3.5 flex-none text-[var(--accent)]" />
            <span className="truncate v6-mono" title={focus.account}>{focus.account}</span>
            <button
              type="button"
              aria-label="Back to the network"
              onClick={() => setFocus({ networkId: focus.networkId, account: null })}
              className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--hover)] cursor-pointer"
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
