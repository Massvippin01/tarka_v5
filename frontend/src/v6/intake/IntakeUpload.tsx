import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { create } from 'zustand';
import axios from 'axios';
import NumberFlow from '@number-flow/react';
import { ArrowRight, Check, FolderSearch, FolderInput, Layers, Pause, Play, RotateCcw, X } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Chip } from '../ui';
import { DropZone } from '../upload/DropZone';
import { STATE_LABEL } from '../upload/stateLabel';
import { useUploadStore, type UploadItem } from '../upload/useUploadStore';
import { formatBytes, formatEta } from '../upload/uploadPlanner';
import { STEPS, fileRows, fileStep, overallProgress, type FileStep, type IntakeStartResponse } from './intake';

/* ---------- mode (remembered per browser) ---------- */

export type UploadMode = 'known' | 'find';
const MODE_KEY = 'tarka_v6_upload_mode';
const readMode = (): UploadMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'find' ? 'find' : 'known';
  } catch {
    return 'known';
  }
};
export function useUploadMode(): [UploadMode, (m: UploadMode) => void] {
  const [mode, setMode] = useState<UploadMode>(readMode);
  return [
    mode,
    (m) => {
      setMode(m);
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {}
    },
  ];
}

export const ModeChoice: React.FC<{ mode: UploadMode; onChange: (m: UploadMode) => void; caseId: string }> = ({ mode, onChange, caseId }) => {
  const opt = (m: UploadMode, icon: React.ReactNode, title: string, desc: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      onClick={() => onChange(m)}
      data-testid={`upload-mode-${m}`}
      className={[
        'min-w-0 flex-1 text-left rounded-2xl border px-4 py-3 flex items-start gap-3 backdrop-blur-md transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        mode === m
          ? 'border-[var(--accent)] bg-[var(--accent-bg)] shadow-[var(--shadow)]'
          : 'border-[var(--line)] bg-[var(--surface-1)]/70 hover:border-[var(--accent)]/50',
      ].join(' ')}
    >
      <span className={`flex-none w-9 h-9 rounded-xl flex items-center justify-center ${mode === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-3)] text-[var(--fg-2)]'}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-[var(--fg-1)]">{title}</span>
        <span className="block text-[12px] text-[var(--fg-2)] mt-0.5">{desc}</span>
      </span>
    </button>
  );
  return (
    <div role="radiogroup" aria-label="How should TARKA file these uploads?" className="flex gap-3 flex-col md:flex-row">
      {opt('known', <FolderInput className="w-[18px] h-[18px]" />, 'Add to a case I know', `Files go straight into ${caseId}.`)}
      {opt(
        'find',
        <FolderSearch className="w-[18px] h-[18px]" />,
        "I don't know the cases yet — find them for me",
        'TARKA reads all the files together, finds each gang, and proposes cases for you to confirm.'
      )}
    </div>
  );
};

/* ---------- the running intake (survives navigation and reloads) ---------- */

const ACTIVE_KEY = 'tarka_v6_active_intake';
const loadActive = (): IntakeStartResponse | null => {
  try {
    const v = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
    return v && typeof v.case_id === 'string' ? v : null;
  } catch {
    return null;
  }
};
const saveActive = (v: IntakeStartResponse | null) => {
  try {
    if (v) localStorage.setItem(ACTIVE_KEY, JSON.stringify(v));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
};

interface IntakeState {
  active: IntakeStartResponse | null;
  starting: boolean;
  error: string | null;
  start: (name: string, files: File[]) => Promise<void>;
  finish: () => void;
}

const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    if (!e.response || [502, 503, 504].includes(e.response.status)) return 'Could not reach the TARKA server — is it running?';
    if (e.response.status === 404) return 'This TARKA server does not support "find the cases for me" yet.';
    const d = e.response?.data?.detail;
    if (typeof d === 'string') return d;
    return e.response ? `Server replied ${e.response.status}` : 'Could not reach the TARKA server';
  }
  return e instanceof Error ? e.message : String(e);
};

export const useIntakeStore = create<IntakeState>((set, get) => ({
  active: loadActive(),
  starting: false,
  error: null,
  start: async (name, files) => {
    let active = get().active;
    if (!active) {
      if (get().starting) return;
      set({ starting: true, error: null });
      try {
        active = (await apiClient.post<IntakeStartResponse>('/api/v1/projects/intake', name.trim() ? { name: name.trim() } : {})).data;
        saveActive(active);
        set({ active, starting: false });
      } catch (e) {
        set({ starting: false, error: errText(e) });
        return;
      }
    }
    await useUploadStore.getState().addFiles(files, active.case_id);
  },
  finish: () => {
    saveActive(null);
    set({ active: null, error: null });
  },
}));

/* ---------- panel ---------- */

export const IntakeUpload: React.FC = () => {
  const { active, starting, error, start, finish } = useIntakeStore();
  const [name, setName] = useState('');
  const items = useUploadStore((s) => s.items);
  const hydrate = useUploadStore((s) => s.hydrate);
  const holding = active?.case_id;

  useEffect(() => {
    if (holding) void hydrate(holding);
  }, [holding, hydrate]);

  const list = useMemo(() => Object.values(items).filter((i) => i.caseId === holding).sort((a, b) => a.addedAt - b.addedAt), [items, holding]);
  const p = useMemo(() => overallProgress(list), [list]);
  const anyReady = list.some((i) => i.state === 'ready');

  const openReview = () => {
    if (!holding) return;
    finish();
    const s = useCaseStore.getState();
    s.setActiveCaseId(holding);
    s.setActiveView('triage');
  };

  // Every file finished: go straight to the review board (once, and only if something was read).
  const moved = useRef(false);
  useEffect(() => {
    if (p.allDone && anyReady && !moved.current) {
      moved.current = true;
      const t = setTimeout(openReview, 900); // let the last bar fill before the page changes
      return () => clearTimeout(t);
    }
  }, [p.allDone, anyReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3" data-testid="intake-upload">
      {!active && (
        <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/70 backdrop-blur-md px-4 py-2.5">
          <span className="text-[12.5px] text-[var(--fg-2)] flex-none">Name this batch</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Optional, e.g. SBI mule statements, Nov 2026"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:outline-none"
            data-testid="intake-name"
          />
        </label>
      )}

      <DropZone
        disabled={starting}
        onFiles={(files) => void start(name, files)}
        title={active ? 'Drop more files into this batch' : 'Drop all the statements here — TARKA sorts them into cases'}
        hint={
          active ? (
            <>
              Holding case <span className="font-mono text-[var(--fg-2)]">{active.case_id}</span> · nothing becomes a case until you confirm it.
            </>
          ) : (
            <>Shared accounts, UPI IDs and phone numbers are joined across files. Nothing becomes a case until you confirm it.</>
          )
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-[var(--risk)]/30 bg-[var(--risk-bg)] px-3 py-2.5 text-[12.5px] text-[var(--fg-1)] flex items-center gap-2">
          <X className="w-4 h-4 text-[var(--risk)] flex-none" />
          <span className="min-w-0 flex-1 break-words">Could not start the batch: {error}</span>
        </div>
      )}

      {active && list.length > 0 && (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)] overflow-hidden" data-testid="intake-progress">
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            <Layers className="w-4 h-4 text-[var(--accent)] flex-none" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-[var(--fg-1)] truncate" title={active.name}>
                {active.name}
              </div>
              <div className="text-[12px] text-[var(--fg-2)] tabular-nums" data-testid="intake-overall">
                <NumberFlow value={p.ready} /> of {p.files} files ready · <NumberFlow value={p.rows} locales="en-IN" /> rows
                {!p.allDone && (p.etaSeconds !== null ? <> · about {formatEta(p.etaSeconds)} left</> : <> · working out time left…</>)}
              </div>
            </div>
            {p.allDone ? (
              anyReady ? (
                <Button size="sm" variant="primary" onClick={openReview} data-testid="intake-review">
                  Review proposed cases <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ) : (
                <>
                  <span className="text-[12px] text-[var(--urgent)]">No new rows to sort — every file needs attention (see each row).</span>
                  <Button size="sm" variant="ghost" onClick={finish} data-testid="intake-new-batch">
                    Start a new batch
                  </Button>
                </>
              )
            ) : (
              <span className="text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                <NumberFlow value={Math.floor(overallPct(list))} />%
              </span>
            )}
          </div>
          <div className="h-1 bg-[var(--surface-3)]">
            <motion.div className="h-full bg-[var(--accent)]" animate={{ width: `${overallPct(list)}%` }} transition={{ ease: 'easeOut', duration: 0.6 }} />
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--fg-3)]">
                <th className="px-4 py-2 font-semibold">File</th>
                <th className="px-2 py-2 font-semibold w-[48%]">Progress</th>
                <th className="px-2 py-2 font-semibold text-right">Rows</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <FileRow key={i.id} item={i} />
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

const STEP_INDEX: Record<FileStep, number> = { upload: 0, check: 1, waiting: 2, read: 2, networks: 3, ready: 4, attention: -1, rejected: -1 };

/** Size-weighted share of the whole job (upload ≈ 40 %, reading ≈ 55 %, finding gangs the rest). */
function overallPct(items: UploadItem[]): number {
  const total = items.reduce((s, i) => s + i.size, 0);
  return total ? items.reduce((s, i) => s + filePct(i) * i.size, 0) / total : 0;
}
function filePct(i: UploadItem): number {
  switch (fileStep(i)) {
    case 'upload':
      return i.size ? (40 * Math.min(i.bytesSent, i.size)) / i.size : 40;
    case 'check':
    case 'waiting':
      return 42;
    case 'read':
      return 42 + 0.53 * (i.status?.processing?.pct ?? 0);
    case 'networks':
      return 97;
    default:
      return 100;
  }
}

const StepChips: React.FC<{ step: FileStep }> = ({ step }) => {
  const at = STEP_INDEX[step];
  return (
    <ol className="flex items-center gap-1 text-[11px] whitespace-nowrap" aria-label="Steps">
      {STEPS.map((s, k) => {
        const done = at > k || step === 'ready';
        const now = at === k && step !== 'ready';
        return (
          <li key={s.key} className="flex items-center gap-1" aria-current={now ? 'step' : undefined}>
            {k > 0 && <span className={`w-2.5 h-px ${done || now ? 'bg-[var(--accent)]' : 'bg-[var(--line-2)]'}`} />}
            <span
              className={[
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-px border transition-colors duration-300',
                now
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] font-semibold'
                  : done
                    ? 'border-transparent text-[var(--fg-2)]'
                    : 'border-transparent text-[var(--fg-3)]',
              ].join(' ')}
            >
              {done && <Check className="w-3 h-3 text-[var(--safe)]" />}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const Bar: React.FC<{ pct?: number }> = ({ pct }) => (
  <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden relative">
    {pct === undefined ? (
      <motion.div
        className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--accent)]"
        initial={{ left: '-33%' }}
        animate={{ left: '100%' }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      />
    ) : (
      <motion.div className="h-full rounded-full bg-[var(--accent)]" animate={{ width: `${Math.min(100, pct)}%` }} transition={{ ease: 'easeOut', duration: 0.5 }} />
    )}
  </div>
);

const FileRow: React.FC<{ item: UploadItem }> = ({ item }) => {
  const { pause, resume, retryProcessing } = useUploadStore();
  const step = fileStep(item);
  const proc = item.status?.processing;
  const rows = fileRows(item);
  const dup = item.status?.stage === 'DUPLICATE' ? (item.status.analytics_summary?.duplicate_of as { case_id?: string } | undefined) : undefined;
  const problem =
    step === 'attention' || step === 'rejected'
      ? item.status?.stage === 'NEEDS_MAPPING'
        ? 'Columns need matching — Inbox links to this file.'
        : item.status?.stage === 'DUPLICATE'
          ? undefined
          : item.reason || STATE_LABEL[item.state].tip
      : item.reason;
  const openDup = () => {
    if (!dup?.case_id) return;
    const s = useCaseStore.getState();
    s.setActiveCaseId(dup.case_id);
    s.setActiveView('triage');
  };

  let pct: number | undefined = 100;
  let detail: React.ReactNode = null;
  if (step === 'upload') {
    pct = item.size ? (item.bytesSent / item.size) * 100 : 0;
    detail = (
      <>
        {formatBytes(item.bytesSent)} of {formatBytes(item.size)}
        {item.state === 'uploading' && item.speedBps > 0 && (
          <>
            {' '}
            · {formatBytes(item.speedBps)}/s · about {formatEta((item.size - item.bytesSent) / item.speedBps)} left
          </>
        )}
        {item.state === 'queued' && <> · waiting for a free upload slot</>}
        {item.state === 'paused' && <> · paused</>}
      </>
    );
  } else if (step === 'check') {
    detail = <>Uploaded {formatBytes(item.size)} · checking file type and fingerprint</>;
  } else if (step === 'waiting') {
    pct = 0;
    detail = <>Queued — another file is being read</>;
  } else if (step === 'read') {
    pct = proc?.pct ?? 0;
    detail = (
      <>
        <NumberFlow value={rows} locales="en-IN" /> rows
        {proc?.rows_per_sec ? <> · {Math.round(proc.rows_per_sec).toLocaleString('en-IN')} rows/s</> : null} · <NumberFlow value={Math.floor(pct)} />%
        {typeof proc?.eta_seconds === 'number' && proc.eta_seconds > 0 && <> · about {formatEta(proc.eta_seconds)} left</>}
      </>
    );
  } else if (step === 'networks') {
    pct = undefined;
    detail = <>Finding gangs across all files</>;
  } else if (step === 'ready') {
    detail = <>Ready{proc?.elapsed_seconds ? <> · rows read in {formatEta(proc.elapsed_seconds)}</> : null}</>;
  }

  return (
    <tr className="border-t border-[var(--line)] align-middle" data-testid="intake-file" data-state={item.state} data-step={step}>
      <td className="px-4 py-2.5 max-w-0 w-[30%]">
        <div className="font-semibold text-[var(--fg-1)] truncate" title={item.name}>
          {item.name}
        </div>
        <div className="text-[11px] text-[var(--fg-3)] truncate" title={problem}>
          {formatBytes(item.size)}
          {problem && <> · {problem}</>}
        </div>
        {dup && (
          <div className="text-[11.5px] text-[var(--urgent)] truncate">
            Already in {dup.case_id ?? 'another case'}
            {dup.case_id && (
              <>
                :{' '}
                <button type="button" onClick={openDup} className="font-semibold text-[var(--accent)] hover:underline" data-testid="intake-dup-open">
                  open that case
                </button>
              </>
            )}
          </div>
        )}
      </td>
      <td className="px-2 py-2.5 max-w-0">
        {step === 'attention' || step === 'rejected' ? (
          <span title={STATE_LABEL[item.state].tip}>
            <Chip variant={STATE_LABEL[item.state].variant} withDot>
              {item.status?.stage === 'DUPLICATE' ? 'Already uploaded' : STATE_LABEL[item.state].label}
            </Chip>
          </span>
        ) : (
          <>
            <StepChips step={step} />
            <div className="mt-1.5">
              <Bar pct={pct} />
            </div>
            <div className="mt-1 text-[11px] text-[var(--fg-3)] tabular-nums whitespace-nowrap truncate">{detail}</div>
          </>
        )}
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums text-[var(--fg-1)] whitespace-nowrap">
        {rows ? (
          <NumberFlow value={rows} locales="en-IN" />
        ) : item.sniff?.estimatedRows !== undefined ? (
          <span title="Estimated from the first 64 KB">~{item.sniff.estimatedRows.toLocaleString('en-IN')}</span>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        {item.state === 'uploading' && (
          <Button size="sm" variant="ghost" onClick={() => pause(item.id)} aria-label="Pause upload" title="Pause">
            <Pause className="w-3.5 h-3.5" />
          </Button>
        )}
        {item.state === 'paused' && item.file && (
          <Button size="sm" variant="ghost" onClick={() => resume(item.id)} aria-label="Resume upload" title="Resume">
            <Play className="w-3.5 h-3.5" />
          </Button>
        )}
        {item.state === 'attention' && item.status?.stage !== 'NEEDS_MAPPING' && item.status?.stage !== 'DUPLICATE' && item.jobId && (
          <Button size="sm" variant="ghost" onClick={() => void retryProcessing(item.id)} aria-label="Try processing again" title="Try again">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
};
