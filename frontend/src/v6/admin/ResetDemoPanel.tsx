import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Card } from '../ui';
import {
  CLEAN_DASHBOARD_KEY, CONFIRM_TEXT, doneSummary, elapsedSeconds, failureText, panelView, resetRequestBody,
  type ResetSize, type ResetStatus,
} from './resetDemoModel';

const URL = '/api/v1/system/demo-reset';

/** Demo-mode-only: move the current data to a backup folder and either clear to a clean dashboard or rebuild Operation Jamtara. */
export const ResetDemoPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const qc = useQueryClient();
  const demo = useQuery({
    queryKey: ['auth-mode'],
    queryFn: async () => (await apiClient.get<{ demo_auth_enabled?: boolean }>('/api/v1/investigation/auth/mode')).data,
    staleTime: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ResetSize>('empty');
  const [status, setStatus] = useState<ResetStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const finished = useRef(false);

  const view = panelView(status);
  const polling = open && view === 'progress';

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      setNow(Date.now());
      try {
        setStatus((await apiClient.get<ResetStatus>(`${URL}/status`)).data);
      } catch { /* the server may be busy for a moment; keep polling */ }
    }, 1000);
    return () => clearInterval(id);
  }, [polling]);

  // Done: throw away everything cached from the old data and update clean-dashboard mode.
  useEffect(() => {
    if (status?.state !== 'done' || finished.current) return;
    finished.current = true;
    qc.clear();
    try {
      window.localStorage.removeItem('tarka_v6_active_intake');
      if (status.summary?.empty) {
        window.localStorage.setItem(CLEAN_DASHBOARD_KEY, '1');
      } else {
        window.localStorage.removeItem(CLEAN_DASHBOARD_KEY);
      }
    } catch { /* ignore storage errors */ }
    const s = useCaseStore.getState();
    s.setActiveCaseId(status.summary?.demo_case_id ?? null);
  }, [status, qc]);

  if (!demo.data?.demo_auth_enabled) return null;

  const start = async () => {
    setErr(null);
    finished.current = false;
    try {
      const r = await apiClient.post<ResetStatus>(URL, resetRequestBody(size));
      setStatus(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Could not start the reset.');
    }
  };
  const close = () => {
    // A full reload also resets in-memory app state (case list context) that still holds the old cases.
    if (view === 'done') {
      if (status?.summary?.empty) {
        window.location.assign('/?view=workspace');
        return;
      }
      window.location.assign(`/?view=projects${status?.summary?.demo_case_id ? `&case=${status.summary.demo_case_id}` : ''}`);
      return;
    }
    setOpen(false); if (view !== 'progress') setStatus(null); setErr(null); };

  const dialog = open && createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" data-testid="reset-demo-dialog">
      <div className="v6-card w-[480px] max-w-[92vw] space-y-4" style={{ background: 'var(--glass-3, #14181f)' }}>
        {view === 'confirm' && (<>
          <div className="text-base font-semibold">Reset dashboard / demo data?</div>
          <p className="text-sm opacity-80">{CONFIRM_TEXT}</p>
          <div className="space-y-2 text-sm">
            {([
              ['empty', 'Clean dashboard — empty (ready for fresh upload)'],
              ['quick', 'Quick - 200k rows (Operation Jamtara)'],
              ['full', 'Full - 1M rows (Operation Jamtara)'],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="reset-size" checked={size === k} onChange={() => setSize(k)} data-testid={`reset-size-${k}`} /> {label}
              </label>
            ))}
          </div>
          {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="destructive" onClick={start} data-testid="reset-demo-confirm">Reset now</Button>
          </div>
        </>)}
        {view === 'progress' && (<>
          <div className="text-base font-semibold">{size === 'empty' ? 'Clearing dashboard...' : 'Rebuilding demo data...'}</div>
          <p className="text-sm" data-testid="reset-demo-step">{status?.step ?? 'Starting'}</p>
          <p className="text-xs opacity-70">{elapsedSeconds(status!, now)}s elapsed. Please keep this window open.</p>
        </>)}
        {view === 'done' && status && (<>
          <div className="text-base font-semibold">{status.summary?.empty ? 'Clean dashboard is ready' : 'Demo data is ready'}</div>
          <p className="text-sm" data-testid="reset-demo-summary">{doneSummary(status)}</p>
          <p className="text-xs opacity-70 break-all">Previous data backup: {status.backup_path ?? 'none (nothing to back up)'}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close} data-testid="reset-demo-close">
              {status.summary?.empty ? 'Open Clean Dashboard' : 'Open Projects'}
            </Button>
          </div>
        </>)}
        {view === 'failed' && status && (<>
          <div className="text-base font-semibold text-red-400">Reset failed</div>
          <p className="text-sm break-all" role="alert">{failureText(status)}</p>
          <div className="flex justify-end"><Button onClick={close}>Close</Button></div>
        </>)}
      </div>
    </div>, document.body);

  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          icon={<DatabaseBackup className="w-3.5 h-3.5 text-[var(--risk)]" />}
          onClick={() => setOpen(true)}
          title="Reset to clean empty dashboard or rebuild Operation Jamtara"
          className="border border-[var(--line)] bg-[var(--surface-1)] text-xs h-8 px-2.5"
          data-testid="reset-demo-open"
        >
          Reset
        </Button>
        {dialog}
      </>
    );
  }

  return (
    <Card data-testid="reset-demo-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Reset dashboard / demo data</div>
          <div className="text-xs opacity-70">Reset to a clean empty dashboard for a fresh upload, or rebuild Operation Jamtara. Current data is always backed up.</div>
        </div>
        <Button className="shrink-0 whitespace-nowrap" variant="destructive" icon={<DatabaseBackup size={14} />} onClick={() => setOpen(true)} data-testid="reset-demo-open">
          Reset
        </Button>
      </div>
      {dialog}
    </Card>
  );
};
