export type ResetSize = 'full' | 'quick';
export type ResetState = 'idle' | 'running' | 'done' | 'failed';

export interface ResetStatus {
  state: ResetState;
  step?: string | null;
  started_at?: number | null;
  finished_at?: number | null;
  backup_path?: string | null;
  summary?: { demo_case_id?: string; cases?: string[]; rows?: number; networks?: number; mules?: number; seconds?: number } | null;
  error?: string | null;
}

export const RESET_ROWS: Record<ResetSize, number> = { full: 1_000_000, quick: 200_000 };

export const CONFIRM_TEXT =
  'Current data is moved to a backup folder (not deleted). A fresh Operation Jamtara demo is built. ' +
  'Takes about a minute. Anyone using TARKA will see the new data.';

export const resetRequestBody = (size: ResetSize) => ({ rows: RESET_ROWS[size], small: size === 'quick' });

/** What the panel should show for a polled status (null before the first poll). */
export function panelView(s: ResetStatus | null): 'confirm' | 'progress' | 'done' | 'failed' {
  if (!s) return 'confirm';
  return s.state === 'running' ? 'progress' : s.state === 'done' ? 'done' : s.state === 'failed' ? 'failed' : 'confirm';
}

export const elapsedSeconds = (s: ResetStatus, nowMs: number): number =>
  Math.max(0, Math.round(((s.finished_at ? s.finished_at * 1000 : nowMs) - (s.started_at ?? nowMs / 1000) * 1000) / 1000));

export const failureText = (s: ResetStatus): string =>
  `${s.error ?? 'The reset failed.'} ${s.backup_path ? `Your old data is safe at ${s.backup_path}.` : 'Your old data was not changed.'}`;

export const doneSummary = (s: ResetStatus): string => {
  const m = s.summary ?? {};
  return [m.rows != null && `${m.rows.toLocaleString('en-IN')} rows`, m.networks != null && `${m.networks} networks`,
    m.mules != null && `${m.mules} mule accounts`, m.seconds != null && `built in ${m.seconds}s`].filter(Boolean).join(' · ');
};
