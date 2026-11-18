import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, FlaskConical, Info, Loader2, Play } from 'lucide-react';
import apiClient from '../../api/client';
import { PageHead, Button, EmptyState, Skeleton, TechnicalDetails } from '../ui';
import { pct, summarizeRuns, type ScaleRun, type ScaleRunsResponse } from '../../selectors/benchmarkSelectors';

const n = (x: number) => x.toLocaleString('en-IN');
const SIZES = [50_000, 200_000, 500_000];
const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** Recorded 1M-row run of the same tool (too slow to start from the browser). Source cited on screen. */
const REFERENCE_1M = { rows: 1_000_000, gangs: 50, rowsPerS: 138_000, readS: 7.2, networksS: '5–6', networksMb: 6.5, precision: 1, recall: 1 };

const Stat: React.FC<{ label: string; tip: string; value: string; sub?: string }> = ({ label, tip, value, sub }) => (
  <div className="v6-card min-w-0">
    <span className="text-[12px] font-medium text-[var(--fg-3)] flex items-center gap-1 truncate" title={tip}>
      {label} <Info className="w-3 h-3 opacity-60 shrink-0" />
    </span>
    <span className="block text-[24px] leading-tight font-semibold text-[var(--fg-1)] mt-1 tabular-nums truncate" title={value}>{value}</span>
    {sub && <span className="block text-[12px] text-[var(--fg-3)] mt-0.5 truncate" title={sub}>{sub}</span>}
  </div>
);

export const ScaleLabScreen: React.FC = () => {
  const qc = useQueryClient();
  const [rows, setRows] = useState(SIZES[0]);
  const runsQ = useQuery({
    queryKey: ['scale-runs'],
    queryFn: async () => (await apiClient.get<ScaleRunsResponse>('/api/v1/benchmarks/scale-runs')).data,
  });
  const run = useMutation({
    mutationFn: async () => (await apiClient.post<ScaleRun>('/api/v1/benchmarks/scale-runs', null, { params: { rows, gangs: Math.max(5, Math.round(rows / 20_000)) } })).data,
    onSuccess: (r) => {
      toast.success(`Measured: ${n(r.ingest_rows_per_s)} rows/s, found ${r.true_positives} of ${r.mules_true} planted mules`);
      qc.invalidateQueries({ queryKey: ['scale-runs'] });
    },
    onError: () => toast.error('The measurement did not finish. Check that the backend is running.'),
  });

  const runs = runsQ.data?.runs ?? [];
  const s = summarizeRuns(runs);
  const busy = run.isPending || !!runsQ.data?.running;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-scale-lab">
      <PageHead
        kicker="Advanced"
        title="Scale check"
        subtitle="How fast TARKA reads big bank files and whether it still finds every mule — measured, not quoted."
        badge={<span className="text-[11.5px] px-2 py-0.5 rounded-full border border-[var(--line-2)] text-[var(--fg-2)]" title="Every figure here comes from generated test data with planted fraud gangs, not from a real case.">Synthetic test data</span>}
        actions={
          <>
            <label className="text-[12.5px] text-[var(--fg-2)] flex items-center gap-2">
              Rows
              <select value={rows} onChange={(e) => setRows(Number(e.target.value))} disabled={busy}
                className="h-8 rounded-lg border border-[var(--line-2)] bg-[var(--surface-1)] px-2 text-[12.5px] text-[var(--fg-1)]">
                {SIZES.map((x) => <option key={x} value={x}>{n(x)}</option>)}
              </select>
            </label>
            <Button variant="primary" size="sm" onClick={() => run.mutate()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {busy ? 'Measuring…' : 'Run a measurement'}
            </Button>
          </>
        }
      />

      {runsQ.isLoading ? (
        <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={96} />)}</div>
      ) : runsQ.isError ? (
        <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Could not reach the measurement service"
          description="The backend did not answer. Start it and reload this page." />
      ) : !s.latest ? (
        <EmptyState icon={<FlaskConical className="w-5 h-5" />} title="No measurements on this machine yet"
          description="Run one: TARKA generates a test bank file with planted mule gangs, reads it with the real pipeline and checks what it found. 50,000 rows take a few seconds." />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Reading speed" tip="Rows of bank statement read and stored per second, in the latest run." value={`${n(s.latest.ingest_rows_per_s)} rows/s`} sub={`${n(s.latest.rows)} rows in ${s.latest.ingest_s} s`} />
            <Stat label="Planted mules found" tip="How many of the mule accounts hidden in the test file TARKA flagged (recall)." value={`${s.latest.true_positives} of ${s.latest.mules_true}`} sub={pct(s.latest.recall)} />
            <Stat label="Wrong flags" tip="Accounts TARKA flagged that were not planted mules, such as salary earners paying rent. Lower is better (precision)." value={n(s.latest.mules_flagged - s.latest.true_positives)} sub={`${pct(s.latest.precision)} of flags correct`} />
            <Stat label="Gangs kept apart" tip="Planted gangs that ended up in their own network instead of merged with another." value={s.latest.gangs_in_own_network} sub={`Network step ${s.latest.analyze_s} s · ${s.latest.analyze_peak_mb} MB`} />
          </div>

          <div className="v6-card !p-0 overflow-hidden">
            <div className="px-4 pt-3 v6-card-t">Measurements on this machine</div>
            <div className="max-h-[300px] overflow-y-auto mt-2">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-[var(--surface-1)] text-[var(--fg-3)] text-right">
                  <tr><th className="px-4 py-2 font-medium text-left">When (IST)</th><th className="px-2 py-2 font-medium">Rows</th><th className="px-2 py-2 font-medium">Gangs</th><th className="px-2 py-2 font-medium">Rows/s</th><th className="px-2 py-2 font-medium">Network step</th><th className="px-2 py-2 font-medium">Mules found</th><th className="px-4 py-2 font-medium">Flags correct</th></tr>
                </thead>
                <tbody className="tabular-nums text-right text-[var(--fg-1)]">
                  {runs.map((r) => (
                    <tr key={r.ran_at} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2 text-left text-[var(--fg-2)]">{IST.format(new Date(r.ran_at))}</td>
                      <td className="px-2 py-2">{n(r.rows)}</td><td className="px-2 py-2">{r.gangs}</td>
                      <td className="px-2 py-2">{n(r.ingest_rows_per_s)}</td><td className="px-2 py-2">{r.analyze_s} s</td>
                      <td className="px-2 py-2">{pct(r.recall)}</td><td className="px-4 py-2">{pct(r.precision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="v6-card">
        <div className="v6-card-h">
          <div>
            <div className="v6-card-t">Recorded large run · {n(REFERENCE_1M.rows)} rows</div>
            <div className="v6-card-s">Recorded 18 Nov on the development machine with the same planted file (synthetic data, {REFERENCE_1M.gangs} planted gangs). Too large to start from here.</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-[12.5px]">
          <div><div className="text-[var(--fg-3)]">Reading</div><div className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]">{REFERENCE_1M.readS} s</div><div className="text-[var(--fg-3)]">≈ {n(REFERENCE_1M.rowsPerS)} rows/s</div></div>
          <div><div className="text-[var(--fg-3)]">Finding networks</div><div className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]">{REFERENCE_1M.networksS} s</div><div className="text-[var(--fg-3)]">{REFERENCE_1M.networksMb} MB working memory</div></div>
          <div><div className="text-[var(--fg-3)]">Planted mules found</div><div className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]">{pct(REFERENCE_1M.recall)}</div></div>
          <div><div className="text-[var(--fg-3)]">Flags correct</div><div className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]">{pct(REFERENCE_1M.precision)}</div></div>
        </div>
        <p className="mt-3 text-[12px] text-[var(--fg-3)]">
          Small runs read fewer rows per second because start-up cost dominates; large files are where speed shows.
        </p>
      </div>

      <TechnicalDetails>
        <p>Each run calls <code>backend/tools/validate_mule_scoring.py</code>: it generates a bank/UPI file with ordinary activity,
          planted gangs (victims → first-layer mule → second-layer mules → ATM or crypto cash-out) and deliberate look-alikes
          (salary earners who pay rent within a day, people using the same ATMs), then runs the real ingestion and network steps and compares the result with the answer key.</p>
        <p>"Planted mules found" is recall; "flags correct" is precision. Perfect scores here prove the pipeline works on these planted patterns, not that it will be perfect on real complaints.</p>
        <p>Memory figures are Python working memory only; the SQLite store adds its own. Runs started here are capped at 500,000 rows. Results are kept in <code>data/validation/scale_lab/runs.jsonl</code> on the server.</p>
      </TechnicalDetails>
    </div>
  );
};
