import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRightLeft, History, ShieldCheck, UserCheck } from 'lucide-react';
import apiClient from '../../api/client';
import { Button, Chip } from '../ui';

interface HandoverEvent {
  seq: number;
  case_id: string;
  network_id: string | null;
  from_officer: string | null;
  to_officer: string;
  note: string;
  actor: string;
  at: number;
  hash: string;
}

interface HandoverResponse {
  case_id: string;
  assignee: string | null;
  network_assignees: Record<string, string>;
  history: HandoverEvent[];
}

export const HandoverPanel: React.FC<{ caseId: string; networkId?: string | null }> = ({ caseId, networkId = null }) => {
  const qc = useQueryClient();
  const [officer, setOfficer] = useState('');
  const [note, setNote] = useState('');
  const [openHistory, setOpenHistory] = useState(false);

  const q = useQuery({
    queryKey: ['case-handover', caseId, networkId ?? ''],
    queryFn: async () =>
      (
        await apiClient.get<HandoverResponse>(`/api/v1/projects/cases/${encodeURIComponent(caseId)}/handover`, {
          params: networkId ? { network_id: networkId } : undefined,
        })
      ).data,
    enabled: Boolean(caseId),
  });

  const mut = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<HandoverResponse>(`/api/v1/projects/cases/${encodeURIComponent(caseId)}/handover`, {
          to_officer: officer.trim(),
          note: note.trim(),
          ...(networkId ? { network_id: networkId } : {}),
        })
      ).data,
    onSuccess: (d) => {
      toast.success(networkId ? `${networkId} handed over to ${officer.trim()}` : `Case handed over to ${officer.trim()}`);
      setOfficer('');
      setNote('');
      qc.setQueryData(['case-handover', caseId, networkId ?? ''], d);
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Handover failed';
      toast.error(String(msg));
    },
  });

  const currentAssignee = networkId ? q.data?.network_assignees?.[networkId] : q.data?.assignee;
  const history = q.data?.history ?? [];

  return (
    <section className="v6-glass rounded-2xl p-4 space-y-3" data-testid="handover-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--fg-1)]">
          <ArrowRightLeft className="w-4 h-4 text-[var(--accent)]" />
          {networkId ? `Network handover (${networkId})` : 'Case handover'}
        </div>
        {currentAssignee ? (
          <Chip variant="safe">
            <UserCheck className="w-3 h-3 mr-1" /> {currentAssignee}
          </Chip>
        ) : (
          <Chip variant="muted">Unassigned</Chip>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (officer.trim()) mut.mutate();
        }}
        className="space-y-2"
      >
        <input
          value={officer}
          onChange={(e) => setOfficer(e.target.value)}
          placeholder="Receiving officer (e.g. Insp. A. Deshmukh)"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          data-testid="handover-officer-input"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Handover note (what was checked, next step)"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          data-testid="handover-note-input"
        />
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpenHistory((v) => !v)} data-testid="handover-history-toggle">
            <History className="w-3.5 h-3.5 mr-1" /> History ({history.length})
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={!officer.trim()} isLoading={mut.isPending} data-testid="handover-submit">
            Hand over
          </Button>
        </div>
      </form>

      {openHistory && (
        <div className="space-y-1.5 border-t border-[var(--line)] pt-2.5 max-h-56 overflow-y-auto" data-testid="handover-history-list">
          {history.length === 0 ? (
            <p className="text-[11.5px] text-[var(--fg-3)]">No handovers recorded yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.seq} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11.5px]">
                <div className="flex items-center justify-between gap-2 text-[var(--fg-1)] font-medium">
                  <span>
                    {h.from_officer || 'Unassigned'} → {h.to_officer}
                    {h.network_id ? ` (${h.network_id})` : ''}
                  </span>
                  <span className="text-[10.5px] text-[var(--fg-3)] tabular-nums">
                    {new Date(h.at * 1000).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {h.note && <div className="text-[var(--fg-2)] mt-0.5">{h.note}</div>}
                <div className="text-[10px] text-[var(--fg-3)] flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-[var(--safe)]" /> by {h.actor} · {h.hash.slice(0, 12)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};
