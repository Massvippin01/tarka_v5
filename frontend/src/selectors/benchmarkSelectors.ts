/** Shape returned by GET /api/v1/benchmarks/scale-runs (backend/app/api/scale_lab_api.py). */
export interface ScaleRun {
  rows: number;
  gangs: number;
  file_mb: number;
  ingest_s: number;
  ingest_rows_per_s: number;
  analyze_s: number;
  analyze_peak_mb: number;
  process_peak_mb?: number;
  mules_true: number;
  mules_flagged: number;
  true_positives: number;
  precision: number;
  recall: number;
  gangs_in_own_network: string;
  synthetic: boolean;
  ran_at: string;
  tool: string;
}

export interface ScaleRunsResponse {
  runs: ScaleRun[];
  running: boolean;
}

export interface ScaleSummary {
  latest: ScaleRun | null;
  /** Largest run, which is the most honest figure for "how it holds up at scale". */
  largest: ScaleRun | null;
  /** True when every run found every planted mule and flagged nothing else. */
  allPerfect: boolean;
}

export function summarizeRuns(runs: ScaleRun[]): ScaleSummary {
  if (!runs.length) return { latest: null, largest: null, allPerfect: false };
  const latest = runs.reduce((a, b) => (b.ran_at > a.ran_at ? b : a));
  const largest = runs.reduce((a, b) => (b.rows > a.rows ? b : a));
  return {
    latest,
    largest,
    allPerfect: runs.every((r) => r.precision === 1 && r.recall === 1),
  };
}

/** 0.983 → "98.3%"; 1 → "100%". */
export const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
