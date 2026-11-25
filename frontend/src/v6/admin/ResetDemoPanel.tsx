import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseBackup } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Card } from '../ui';
import {
  CONFIRM_TEXT, doneSummary, elapsedSeconds, failureText, panelView, resetRequestBody,
  type ResetSize, type ResetStatus,
} from './resetDemoModel';

const URL = '/api/v1/system/demo-reset';

/** Demo-mode-only: move the current data to a backup folder and rebuild the demo case. */
export const ResetDemoPanel: React.FC = () => {
  const qc = useQueryClient();
  const demo = useQuery({
    queryKey: ['auth-mode'],
    queryFn: async () => (await apiClient.get<{ demo_auth_enabled?: boolean }>('/api/v1/investigation/auth/mode')).data,
    staleTime: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ResetSize>('quick');
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
    }, 1500);
    return () => clearInterval(id);
  }, [polling]);

  // Done: throw away everything cached from the old data and point the app at the new case (Projects opens on close).
  useEffect(() => {
    if (status?.state !== 'done' || finished.current) return;
    finished.current = true;
    qc.clear();
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
    // A full reload also resets in-memory app state (case list context) that still holds the old demo's cases.
    if (view === 'done') { window.location.assign(`/?view=projects${status?.summary?.demo_case_id ? `&case=${status.summary.demo_case_id}` : ''}`); return; }
    setOpen(false); if (view !== 'progress') setStatus(null); setErr(null); };

  return (
    <Card data-testid="reset-demo-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">Reset demo data</div>
          <div className="text-xs opacity-70">Rebuild the Operation Jamtara demo. The current data is kept in a backup folder.</div>
        </div>
        <Button className="shrink-0 whitespace-nowrap" variant="destructive" icon={<DatabaseBackup size={14} />} onClick={() => setOpen(true)} data-testid="reset-demo-open">
          Reset demo data
        </Button>
      </div>
      {open && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" data-testid="reset-demo-dialog">
          <div className="v6-card w-[480px] max-w-[92vw] space-y-4" style={{ background: 'var(--glass-3, #14181f)' }}>
            {view === 'confirm' && (<>
              <div className="text-base font-semibold">Reset demo data?</div>
              <p className="text-sm opacity-80">{CONFIRM_TEXT}</p>
              <div className="space-y-2 text-sm">
                {([['quick', 'Quick - 200k rows'], ['full', 'Full - 1M rows']] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2">
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
              <div className="text-base font-semibold">Rebuilding demo data...</div>
              <p className="text-sm" data-testid="reset-demo-step">{status?.step ?? 'Starting'}</p>
              <p className="text-xs opacity-70">{elapsedSeconds(status!, now)}s elapsed. Please keep this window open.</p>
            </>)}
            {view === 'done' && status && (<>
              <div className="text-base font-semibold">Demo data is ready</div>
              <p className="text-sm" data-testid="reset-demo-summary">{doneSummary(status)}</p>
              <p className="text-xs opacity-70 break-all">Previous data backup: {status.backup_path ?? 'none (nothing to back up)'}</p>
              <div className="flex justify-end"><Button variant="primary" onClick={close} data-testid="reset-demo-close">Open Projects</Button></div>
            </>)}
            {view === 'failed' && status && (<>
              <div className="text-base font-semibold text-red-400">Reset failed</div>
              <p className="text-sm break-all" role="alert">{failureText(status)}</p>
              <div className="flex justify-end"><Button onClick={close}>Close</Button></div>
            </>)}
          </div>
        </div>, document.body)}
    </Card>
  );
};
