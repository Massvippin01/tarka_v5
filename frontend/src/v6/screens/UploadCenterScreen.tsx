import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  Copy,
  History,
  FileSpreadsheet,
  FileText,
  Pause,
  Play,
  RotateCcw,
  ShieldX,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { formatInr } from '../../lib/formatInr';
import { Button, Chip, EmptyState, PageHead, type ChipVariant } from '../ui';
import { useUploadStore, type UploadItem } from '../upload/useUploadStore';
import { formatBytes, formatEta, stateFromStatus, type CardState, type JobStatus } from '../upload/uploadPlanner';
import { ColumnMappingDialog } from '../upload/ColumnMappingDialog';
import { DropZone } from '../upload/DropZone';
import { STATE_LABEL } from '../upload/stateLabel';
import { IntakeUpload, ModeChoice, useUploadMode } from '../intake/IntakeUpload';
import { NcrpImportPanel } from '../components/NcrpImportPanel';
import { GoldenHourClockBar } from '../components/GoldenHourClockBar';
import { useCaseFixture } from '../../selectors/bundleAdapter';


const IDENTIFIER_LABEL: Record<string, string> = {
  account: 'Bank accounts',
  upi: 'UPI IDs',
  vpa: 'UPI IDs',
  phone: 'Phone numbers',
  ifsc: 'IFSC codes',
  utr: 'Transaction refs (UTR)',
  email: 'Email addresses',
};

const count = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '—');

export const UploadCenterScreen: React.FC = () => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const { items, addFiles, hydrate } = useUploadStore();
  const [mode, setMode] = useUploadMode();
  const { fixture } = useCaseFixture(caseId);

  useEffect(() => {
    void hydrate(caseId);
  }, [caseId, hydrate]);

  const list = useMemo(
    () => Object.values(items).filter((i) => i.caseId === caseId).sort((a, b) => b.addedAt - a.addedAt),
    [items, caseId]
  );
  const tally = useMemo(() => {
    const t: Partial<Record<CardState, number>> = {};
    list.forEach((i) => (t[i.state] = (t[i.state] ?? 0) + 1));
    return t;
  }, [list]);

  return (
    <div className="v6-enter space-y-4" data-testid="v6-upload-center">
      <PageHead
        kicker="Evidence"
        title="Upload Center"
        subtitle="Big files upload in 8 MB pieces and pick up where they stopped."
      />

      <ModeChoice mode={mode} onChange={setMode} caseId={caseId} />
      {mode === 'find' ? (
        <IntakeUpload />
      ) : (
        <>
      <DropZone
        onFiles={(files) => void addFiles(files, caseId)}
        title="Drop bank statements, call records or other evidence here"
        hint={
          <>
            or <span className="text-[var(--accent)] font-semibold">browse your computer</span>. We look at the first 64 KB
            before uploading so you can check the file.
          </>
        }
      />

      {list.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[12px] text-[var(--fg-2)]">
          <span className="font-semibold text-[var(--fg-1)]">{list.length.toLocaleString('en-IN')} file{list.length === 1 ? '' : 's'}</span>
          {(Object.keys(STATE_LABEL) as CardState[])
            .filter((s) => tally[s])
            .map((s) => (
              <Chip key={s} variant={STATE_LABEL[s].variant}>
                {tally[s]} {STATE_LABEL[s].label.toLowerCase()}
              </Chip>
            ))}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No uploads for this case yet"
          description="Files you add here are fingerprinted (SHA-256), stored with chain of custody and, for bank statements, read row by row."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <UploadCard item={item} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PastJobs caseId={caseId} hideJobIds={list.map((i) => i.jobId).filter(Boolean) as string[]} />
        </>
      )}

      <NcrpRow caseId={caseId} />
      <GoldenHourClockBar goldenHour={fixture?.goldenHour} />
    </div>
  );
};

/** NCRP import is a side task (Projects has the full panel): one quiet line that opens the form on demand. */
const NcrpRow: React.FC<{ caseId: string }> = ({ caseId }) => {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="ncrp-row">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" /> {open ? 'Hide NCRP import' : 'Import NCRP complaints'}
        <span className="font-normal text-[var(--fg-3)]">(CSV: matches complaints to the money flows)</span>
      </button>
      {open && <div className="mt-2"><NcrpImportPanel caseId={caseId} /></div>}
    </div>
  );
};

const UploadCard: React.FC<{ item: UploadItem }> = ({ item }) => {
  const { pause, resume, cancel, dismiss, retryProcessing } = useUploadStore();
  const meta = STATE_LABEL[item.state];
  const pct = item.size ? Math.min(100, (item.bytesSent / item.size) * 100) : 100;
  const active = item.state === 'uploading' || item.state === 'verifying' || item.state === 'processing';
  const finished = item.state === 'ready' || item.state === 'rejected' || item.state === 'attention';
  const summary = item.status?.analytics_summary ?? {};
  const isTable = item.sniff?.isTabular;

  return (
    <div
      className="rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)] px-4 py-3.5"
      data-testid="upload-card"
      data-state={item.state}
    >
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 flex-none rounded-lg flex items-center justify-center bg-[var(--surface-3)] text-[var(--fg-2)]">
          {isTable ? <FileSpreadsheet className="w-[18px] h-[18px]" /> : <FileText className="w-[18px] h-[18px]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-[var(--fg-1)] truncate" title={item.name}>
            {item.name}
          </div>
          <div className="text-[11.5px] text-[var(--fg-3)] truncate">
            {formatBytes(item.size)}
            {item.sniff && <> · {item.sniff.kind}</>}
            {item.sniff?.estimatedRows !== undefined && (
              <>
                {' '}
                · {item.sniff.rowsExact ? '' : 'about '}
                {item.sniff.estimatedRows.toLocaleString('en-IN')} row{item.sniff.estimatedRows === 1 ? '' : 's'}
              </>
            )}
          </div>
        </div>
        <span title={meta.tip}>
          <Chip variant={meta.variant} withDot live={active}>
            {meta.label}
          </Chip>
        </span>
        <div className="flex items-center gap-1 flex-none">
          {(item.state === 'uploading' || item.state === 'queued') && (
            <Button size="sm" variant="ghost" onClick={() => pause(item.id)} title="Pause" aria-label="Pause upload" disabled={item.state === 'queued'}>
              <Pause className="w-3.5 h-3.5" />
            </Button>
          )}
          {item.state === 'paused' && item.file && (
            <Button size="sm" variant="ghost" onClick={() => resume(item.id)} title="Resume" aria-label="Resume upload">
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          {finished ? (
            <Button size="sm" variant="ghost" onClick={() => dismiss(item.id)} title="Remove from this list (the evidence stays stored)" aria-label="Remove from list">
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => void cancel(item.id)} title="Cancel upload" aria-label="Cancel upload">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {!finished && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]"
              animate={{ width: `${pct}%` }}
              transition={{ ease: 'linear', duration: 0.2 }}
            />
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-[var(--fg-3)] tabular-nums">
            <span className="text-[var(--fg-2)] font-semibold">{pct.toFixed(pct < 10 ? 1 : 0)}%</span>
            <span>
              {formatBytes(item.bytesSent)} of {formatBytes(item.size)}
            </span>
            {item.state === 'uploading' && item.speedBps > 0 && (
              <>
                <span>{formatBytes(item.speedBps)}/s</span>
                <span>{formatEta((item.size - item.bytesSent) / item.speedBps)} left</span>
              </>
            )}
            {(item.state === 'verifying' || item.state === 'processing') && <span>{meta.tip}</span>}
          </div>
        </div>
      )}

      {item.reason && item.state !== 'attention' && item.state !== 'rejected' && (
        <div className="mt-2 text-[12px] text-[var(--fg-2)]">{item.reason}</div>
      )}

      {/* Pre-upload column preview */}
      {!finished && item.sniff?.headers && (
        <ColumnList label="Columns found" headers={item.sniff.headers} />
      )}

      {/* Results */}
      {item.state === 'ready' && <ReadyPanel summary={summary} sha={item.status?.sha256 ?? undefined} />}

      {item.state === 'attention' && (
        <div className="mt-3 rounded-xl border border-[var(--urgent)]/30 bg-[var(--urgent-bg)] px-3 py-2.5">
          <div className="flex items-start gap-2 text-[12.5px] text-[var(--fg-1)]">
            <AlertTriangle className="w-4 h-4 flex-none mt-0.5 text-[var(--urgent)]" />
            <div className="min-w-0">
              {item.status?.stage === 'NEEDS_MAPPING' ? (
                <>
                  <div className="font-semibold">TARKA could not tell which columns hold the date and amount.</div>
                  <div className="text-[var(--fg-2)] mt-0.5">
                    The file is sealed and safe. Match its columns once and its rows are read into the case.
                  </div>
                </>
              ) : item.status?.stage === 'DUPLICATE' ? (
                <DuplicateNote status={item.status} />
              ) : (
                <>
                  <div className="font-semibold">Processing stopped</div>
                  <div className="text-[var(--fg-2)] mt-0.5 break-words">{item.reason}</div>
                </>
              )}
            </div>
            {item.status?.stage === 'NEEDS_MAPPING' && <MapColumnsButton job={item.status} />}
            {item.status?.stage !== 'NEEDS_MAPPING' && item.status?.stage !== 'DUPLICATE' && item.jobId && (
              <Button size="sm" variant="default" className="ml-auto flex-none" onClick={() => void retryProcessing(item.id)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try again
              </Button>
            )}
          </div>
          {Array.isArray(summary.detected_headers) && (
            <ColumnList label="Columns in the file" headers={summary.detected_headers as string[]} />
          )}
        </div>
      )}

      {item.state === 'rejected' && (
        <div className="mt-3 rounded-xl border border-[var(--risk)]/30 bg-[var(--risk-bg)] px-3 py-2.5 flex items-start gap-2 text-[12.5px]">
          <ShieldX className="w-4 h-4 flex-none mt-0.5 text-[var(--risk)]" />
          <div className="min-w-0">
            <div className="font-semibold text-[var(--fg-1)]">File not accepted</div>
            <div className="text-[var(--fg-2)] mt-0.5 break-words">{item.reason || 'The server rejected this file.'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ColumnList: React.FC<{ label: string; headers: string[] }> = ({ label, headers }) => {
  const shown = headers.slice(0, 14);
  return (
    <div className="mt-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-3)] mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((h, i) => (
          <span
            key={`${h}-${i}`}
            title={h}
            className="max-w-[180px] truncate rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px] font-mono text-[var(--fg-2)]"
          >
            {h || '(blank)'}
          </span>
        ))}
        {headers.length > shown.length && (
          <span className="text-[11.5px] text-[var(--fg-3)] self-center" title={headers.slice(shown.length).join(', ')}>
            +{headers.length - shown.length} more
          </span>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; tone?: string; tip?: string }> = ({ label, value, tone, tip }) => (
  <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/70 px-3 py-2" title={tip}>
    <div className="text-[11px] text-[var(--fg-3)] truncate">{label}</div>
    <div className={`text-[15px] font-semibold tabular-nums truncate ${tone ?? 'text-[var(--fg-1)]'}`} title={value}>
      {value}
    </div>
  </div>
);

const ReadyPanel: React.FC<{ summary: Record<string, any>; sha?: string }> = ({ summary, sha }) => {
  const ids = Object.entries((summary.identifiers_by_kind ?? {}) as Record<string, number>).filter(([, n]) => n > 0);
  return (
    <div className="mt-3 space-y-2.5">
      {summary.parser ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Rows read" value={count(summary.rows_read)} />
          <Stat label="Rows accepted" value={count(summary.rows_accepted)} tone="text-[var(--safe)]" />
          <Stat
            label="Rows rejected"
            value={count(summary.rows_rejected)}
            tone={summary.rows_rejected ? 'text-[var(--urgent)]' : undefined}
            tip="Rows that could not be read (bad date or amount). They are kept for review, not dropped silently."
          />
          <Stat
            label="Total amount"
            value={typeof summary.total_amount_inr === 'number' ? formatInr(summary.total_amount_inr) : '—'}
            tip="Sum of all accepted transaction amounts in this file."
          />
          <Stat label="People / accounts seen" value={count(summary.unique_parties)} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--fg-2)]">
          <CheckCircle2 className="w-4 h-4 text-[var(--safe)] flex-none" />
          {summary.note || 'Stored as evidence.'}
        </div>
      )}
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map(([kind, n]) => (
            <Chip key={kind} variant="flow">
              {IDENTIFIER_LABEL[kind] ?? kind}: {n.toLocaleString('en-IN')}
            </Chip>
          ))}
        </div>
      )}
      {sha && (
        <div className="text-[11px] text-[var(--fg-3)] truncate font-mono" title={`SHA-256 fingerprint: ${sha}`}>
          Fingerprint {sha.slice(0, 16)}…{sha.slice(-8)}
          {summary.row_accounting === 'ALL_ROWS_ACCOUNTED' && <span className="font-sans"> · every row accounted for</span>}
          {summary.column_mapping && (
            <span className="font-sans">
              {' '}
              · columns {summary.column_mapping === 'manual' ? 'matched by hand' : `matched by template "${summary.column_mapping}"`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const DuplicateNote: React.FC<{ status: JobStatus }> = ({ status }) => {
  const d = status.analytics_summary?.duplicate_of as { job_id?: string; case_id?: string; filename?: string } | undefined;
  return (
    <>
      <div className="font-semibold">This exact file was uploaded before</div>
      <div className="text-[var(--fg-2)] mt-0.5 break-words">
        {d ? (
          <>
            Same fingerprint as <span className="font-semibold text-[var(--fg-1)]">{d.filename || 'an earlier file'}</span> in{' '}
            <span className="font-semibold text-[var(--fg-1)]">{d.case_id || 'another case'}</span>. Its rows were not read again, so
            nothing is counted twice.
          </>
        ) : (
          'Its rows were not read again, so nothing is counted twice.'
        )}
      </div>
    </>
  );
};

const MapColumnsButton: React.FC<{ job: JobStatus; onDone?: () => void }> = ({ job, onDone }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="primary" className="ml-auto flex-none" onClick={() => setOpen(true)} data-testid="map-columns">
        <Columns3 className="w-3.5 h-3.5 mr-1" /> Map columns
      </Button>
      <ColumnMappingDialog job={job} open={open} onOpenChange={setOpen} onDone={onDone} />
    </>
  );
};

const PAST_STAGE: Record<string, { label: string; variant: ChipVariant }> = {
  NEEDS_MAPPING: { label: 'Needs column match', variant: 'urgent' },
  DUPLICATE: { label: 'Duplicate', variant: 'urgent' },
};

/** Jobs the server already has for this case (from any browser or session), newest first. */
const PastJobs: React.FC<{ caseId: string; hideJobIds: string[] }> = ({ caseId, hideJobIds }) => {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['ingestion-jobs', caseId],
    queryFn: async () => (await apiClient.get<JobStatus[]>('/api/v1/ingestion/jobs', { params: { case_id: caseId } })).data,
    refetchInterval: 15000,
  });
  const hiddenKey = hideJobIds.join('|');
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ['ingestion-jobs', caseId] }); // a card was added, finished or dismissed
  }, [hiddenKey, caseId, qc]);
  const hidden = new Set(hideJobIds);
  const jobs = (q.data ?? []).filter((j) => !hidden.has(j.job_id) && !j.is_cancelled);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['ingestion-jobs', caseId] });

  return (
    <section className="pt-2" data-testid="past-jobs">
      <div className="flex items-center gap-2 mb-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--fg-3)]">
        <History className="w-3.5 h-3.5" /> Earlier uploads for {caseId}
      </div>
      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)]/70 px-3 py-2.5 text-[12.5px] text-[var(--fg-2)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--urgent)] flex-none" />
          Could not load earlier uploads from the server.
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => void q.refetch()}>
            Retry
          </Button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-[12.5px] text-[var(--fg-3)]">No earlier uploads on the server for this case.</div>
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)] divide-y divide-[var(--line)]">
          {jobs.map((j) => {
            const st = STATE_LABEL[stateFromStatus(j)];
            const chip = PAST_STAGE[j.stage] ?? st;
            const dup = j.stage === 'DUPLICATE' ? (j.analytics_summary?.duplicate_of as { case_id?: string; filename?: string } | undefined) : undefined;
            const s = j.analytics_summary ?? {};
            return (
              <div key={j.job_id} className="flex items-center gap-3 px-4 py-2.5 min-w-0" data-testid="past-job" data-stage={j.stage}>
                {j.stage === 'DUPLICATE' ? (
                  <Copy className="w-4 h-4 flex-none text-[var(--urgent)]" />
                ) : (
                  <FileText className="w-4 h-4 flex-none text-[var(--fg-3)]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[var(--fg-1)] truncate" title={j.filename}>
                    {j.filename || j.job_id}
                  </div>
                  <div className="text-[11.5px] text-[var(--fg-3)] truncate">
                    {formatBytes(j.total_size_bytes)}
                    {typeof s.rows_accepted === 'number' && <> · {count(s.rows_accepted)} rows read</>}
                    {typeof s.total_amount_inr === 'number' && <> · {formatInr(s.total_amount_inr)}</>}
                    {dup && (
                      <>
                        {' '}
                        · same file as {dup.filename || 'an earlier upload'} in {dup.case_id || 'another case'}
                      </>
                    )}
                    {j.error_message && <> · {j.error_message}</>}
                  </div>
                </div>
                <Chip variant={chip.variant}>{chip.label}</Chip>
                {j.stage === 'NEEDS_MAPPING' && <MapColumnsButton job={j} onDone={refresh} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
