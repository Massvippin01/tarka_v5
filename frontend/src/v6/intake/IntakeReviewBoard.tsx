import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ExternalLink, FilePlus2, Link2, X } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { formatInr } from '../../lib/formatInr';
import { Button, Chip, PageHead, type ChipVariant } from '../ui';
import type { FraudNetwork, NetworksResponse } from '../triage/triage';
import type { JobStatus } from '../upload/uploadPlanner';
import {
  buildCreateRequest,
  intakeCounts,
  intakeHeadline,
  isOpenProposal,
  pruneSelection,
  toggleAll,
  toggleId,
  type CreateCasesResponse,
} from './intake';

const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    if (!e.response || [502, 503, 504].includes(e.response.status)) return 'Could not reach the TARKA server — is it running?';
    if (e.response.status === 404) return 'This TARKA server cannot create cases from intake yet.';
    const d = e.response?.data?.detail;
    if (typeof d === 'string') return d;
    return e.response ? `Server replied ${e.response.status}` : 'Could not reach the TARKA server';
  }
  return e instanceof Error ? e.message : String(e);
};

const card = 'rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)]';
const num = (n: number) => (n || 0).toLocaleString('en-IN');

const openCase = (caseId: string) => {
  const s = useCaseStore.getState();
  s.setActiveCaseId(caseId);
  s.setActiveView('triage');
};

function actionChip(p: NonNullable<FraudNetwork['proposal']>): { label: string; variant: ChipVariant; tip: string } {
  if (p.action === 'ATTACH') {
    const ids = p.shared_identifiers ?? [];
    return {
      label: `Add to ${p.attach_case_id ?? 'existing case'}`,
      variant: 'frozen',
      tip: ids.length
        ? `Shares ${ids.length} identifier${ids.length === 1 ? '' : 's'} with ${p.attach_case_id}: ${ids.slice(0, 8).join(', ')}${ids.length > 8 ? ` and ${ids.length - 8} more` : ''}. Its rows are copied into that case.`
        : `Linked to ${p.attach_case_id}. Its rows are copied into that case.`,
    };
  }
  if (p.action === 'MINOR') return { label: 'Minor', variant: 'muted', tip: 'A very small network. Creating it opens a case of its own; you can also dismiss it.' };
  return { label: 'New case', variant: 'flow', tip: 'Opens a new case (its own FIR record) in this project with this gang’s rows.' };
}

export const IntakeReviewBoard: React.FC<{ caseId: string; networks: FraudNetwork[] }> = ({ caseId, networks }) => {
  const qc = useQueryClient();
  const jobs = useQuery({
    queryKey: ['ingestion-jobs', caseId],
    queryFn: async () => (await apiClient.get<JobStatus[]>('/api/v1/ingestion/jobs', { params: { case_id: caseId } })).data,
  });
  const files = (jobs.data ?? []).filter((j) => !j.is_cancelled).length;

  const rows = useMemo(
    () =>
      networks
        .filter((n) => n.proposal)
        .sort((a, b) => Number(isOpenProposal(b)) - Number(isOpenProposal(a)) || (b.amount_inr || 0) - (a.amount_inr || 0)),
    [networks]
  );
  const openIds = useMemo(() => rows.filter(isOpenProposal).map((n) => n.network_id), [rows]);
  const counts = intakeCounts(files, networks);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CreateCasesResponse | null>(null);
  useEffect(() => setSelected((s) => pruneSelection(s, openIds)), [openIds]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['networks', caseId] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
    void qc.invalidateQueries({ queryKey: ['cases-list'] });
  };
  const create = useMutation({
    mutationFn: async (ids: string[]) =>
      (await apiClient.post<CreateCasesResponse>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks/create-cases`, buildCreateRequest(ids, edits, networks), { timeout: 0 })).data,
    onSuccess: (r) => {
      setResult(r);
      // Close the filed rows now: recomputing networks on a big batch takes a while, and a stale open row invites a second click.
      const filed = new Map([...r.created, ...r.attached].map((x) => [x.network_id, x.case_id]));
      qc.setQueryData<NetworksResponse>(['networks', caseId], (d) =>
        d && {
          ...d,
          networks: d.networks.map((nw) =>
            filed.has(nw.network_id)
              ? { ...nw, triage: { ...(nw.triage ?? { network_id: nw.network_id, decision: null, reason: null, updated_by: null, updated_at: null }), status: 'CASE_OPENED', target_case_id: filed.get(nw.network_id)! } }
              : nw
          ),
        }
      );
      setSelected(new Set());
      refresh();
      const done = r.created.length + r.attached.length;
      if (r.failed.length) toast.warning(`${done} done, ${r.failed.length} failed — see the summary.`);
      else toast.success(`${done} ${done === 1 ? 'network' : 'networks'} filed.`);
    },
    onError: (e) => toast.error(errText(e)),
  });

  const allSel = openIds.length > 0 && openIds.every((id) => selected.has(id));

  return (
    <div className="v6-enter space-y-4" data-testid="intake-board">
      <PageHead
        kicker="Intake review"
        title={jobs.isLoading ? 'Reading the batch…' : intakeHeadline(counts)}
        subtitle="TARKA grouped the uploaded rows into gangs. Nothing becomes a case until you confirm it here."
        actions={
          <>
            <Button size="sm" variant="ghost" disabled={!selected.size || create.isPending} onClick={() => create.mutate([...selected])} data-testid="create-selected">
              Create selected{selected.size ? ` (${num(selected.size)})` : ''}
            </Button>
            <Button size="sm" variant="primary" disabled={!openIds.length || create.isPending} isLoading={create.isPending} onClick={() => create.mutate(openIds)} data-testid="create-all">
              <FilePlus2 className="w-3.5 h-3.5 mr-1" /> Create all {num(openIds.length)}
            </Button>
          </>
        }
      />

      {create.isError && (
        <div role="alert" className="rounded-xl border border-[var(--risk)]/30 bg-[var(--risk-bg)] px-3 py-2.5 text-[12.5px] text-[var(--fg-1)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--risk)] flex-none" />
          <span className="min-w-0 flex-1 break-words">Nothing was created: {errText(create.error)}</span>
        </div>
      )}

      <AnimatePresence>{result && <ResultSummary key="result" r={result} rows={rows} onClose={() => setResult(null)} />}</AnimatePresence>

      {openIds.length === 0 && rows.length > 0 && !result && (
        <div className={`${card} px-4 py-3 flex items-center gap-2 text-[13px] text-[var(--fg-1)]`}>
          <CheckCircle2 className="w-4 h-4 text-[var(--safe)] flex-none" /> Every proposed case in this batch has been created, added or dismissed.
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="max-h-[calc(100vh-260px)] overflow-auto">
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-[var(--surface-1)]/95 backdrop-blur-md">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--fg-3)]">
                <th className="pl-4 pr-1 py-2 w-8">
                  <input type="checkbox" checked={allSel} disabled={!openIds.length} onChange={() => setSelected((s) => toggleAll(s, openIds))} aria-label="Select every proposed case" className="accent-[var(--accent)]" />
                </th>
                <th className="px-2 py-2 font-semibold" title="Each new case is registered as its own FIR record.">
                  Proposed case
                </th>
                <th className="px-2 py-2 font-semibold text-right" title="Accounts that received and passed on victims’ money">Mules</th>
                <th className="px-2 py-2 font-semibold text-right">Victims</th>
                <th className="px-2 py-2 font-semibold text-right" title="Money paid in by victims to this gang">Amount</th>
                <th className="px-2 py-2 font-semibold">What TARKA suggests</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <Row
                  key={n.network_id}
                  caseId={caseId}
                  n={n}
                  checked={selected.has(n.network_id)}
                  onCheck={() => setSelected((s) => toggleId(s, n.network_id))}
                  title={edits[n.network_id] ?? n.proposal!.suggested_title}
                  onTitle={(t) => setEdits((e) => ({ ...e, [n.network_id]: t }))}
                  onDismissed={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{
  caseId: string;
  n: FraudNetwork;
  checked: boolean;
  onCheck: () => void;
  title: string;
  onTitle: (t: string) => void;
  onDismissed: () => void;
}> = ({ caseId, n, checked, onCheck, title, onTitle, onDismissed }) => {
  const open = isOpenProposal(n);
  const chip = actionChip(n.proposal!);
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState('');
  const dismiss = useMutation({
    mutationFn: () =>
      apiClient.put(`/api/v1/cases/${encodeURIComponent(caseId)}/networks/${encodeURIComponent(n.network_id)}/status`, { decision: 'DISMISS', reason: reason.trim() }),
    onSuccess: () => {
      setDismissing(false);
      toast.success('Network dismissed');
      onDismissed();
    },
    onError: (e) => toast.error(errText(e)),
  });
  const netHref = `?view=network&case=${encodeURIComponent(caseId)}&net=${encodeURIComponent(n.network_id)}`;

  return (
    <tr className={`border-t border-[var(--line)] ${open ? '' : 'opacity-60'} ${checked ? 'bg-[var(--accent-bg)]' : ''}`} data-testid="intake-row" data-open={open}>
      <td className="pl-4 pr-1 py-2">
        <input type="checkbox" checked={checked} disabled={!open} onChange={onCheck} aria-label={`Select ${title}`} className="accent-[var(--accent)]" />
      </td>
      <td className="px-2 py-1.5 max-w-0 w-[38%]">
        {dismissing ? (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim()) dismiss.mutate();
            }}
          >
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Why dismiss? e.g. salary transfers, not fraud"
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              aria-label="Reason for dismissing"
            />
            <Button size="sm" type="submit" disabled={!reason.trim()} isLoading={dismiss.isPending}>
              Dismiss
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setDismissing(false)}>
              Cancel
            </Button>
          </form>
        ) : open ? (
          <input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            maxLength={200}
            title={title}
            aria-label="Case title"
            className="w-full truncate rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold text-[var(--fg-1)] hover:border-[var(--line)] focus:border-[var(--line)] focus:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        ) : (
          <div className="px-2 py-1 min-w-0">
            <div className="font-semibold text-[var(--fg-1)] truncate" title={title}>
              {title}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] truncate" title={n.triage?.reason ?? undefined}>
              {n.triage?.status === 'CLOSED' ? `Dismissed${n.triage.reason ? ` — ${n.triage.reason}` : ''}` : 'Case opened'}
              {n.triage?.target_case_id && (
                <>
                  {' · '}
                  <button type="button" className="text-[var(--accent)] font-semibold" onClick={() => openCase(n.triage!.target_case_id!)}>
                    {n.triage.target_case_id}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{num(n.mule_count)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{num(n.victim_count)}</td>
      <td className="px-2 py-2 text-right tabular-nums font-semibold text-[var(--fg-1)] whitespace-nowrap" title={formatInr(n.amount_inr || 0)}>
        {formatInr(n.amount_inr || 0, { compact: true })}
      </td>
      <td className="px-2 py-2 max-w-[220px]">
        <span title={chip.tip} className="inline-flex max-w-full">
          <Chip variant={chip.variant} icon={n.proposal!.action === 'ATTACH' ? <Link2 className="w-3 h-3" /> : undefined} className="max-w-full truncate">
            {chip.label}
          </Chip>
        </span>
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <a href={netHref} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline" title="Open this gang on the Fraud Network page">
          Network <ExternalLink className="w-3 h-3" />
        </a>
        {open && !dismissing && (
          <Button size="sm" variant="ghost" className="ml-1" onClick={() => setDismissing(true)} aria-label={`Dismiss ${title}`} title="Dismiss — not a case">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
};

const ResultSummary: React.FC<{ r: CreateCasesResponse; rows: FraudNetwork[]; onClose: () => void }> = ({ r, rows, onClose }) => {
  const titleOf = (id: string) => rows.find((n) => n.network_id === id)?.proposal?.suggested_title ?? id;
  const line = (key: string, icon: React.ReactNode, text: React.ReactNode, caseId?: string) => (
    <li key={key} className="flex items-center gap-2 min-w-0 py-1">
      {icon}
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {caseId && (
        <Button size="sm" variant="ghost" onClick={() => openCase(caseId)}>
          Open {caseId}
        </Button>
      )}
    </li>
  );
  return (
    <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`${card} px-4 py-3`} data-testid="intake-result" role="status">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-[13.5px] font-semibold text-[var(--fg-1)] flex-1">
          {num(r.created.length)} created · {num(r.attached.length)} added to existing cases{r.failed.length ? ` · ${num(r.failed.length)} failed` : ''}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close summary">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ul className="text-[12.5px] text-[var(--fg-1)] divide-y divide-[var(--line)] max-h-64 overflow-auto">
        {r.failed.map((f) =>
          line(`f-${f.network_id}`, <AlertTriangle className="w-4 h-4 text-[var(--risk)] flex-none" />, <span title={f.reason}><b>{titleOf(f.network_id)}</b> — not created: {f.reason}</span>)
        )}
        {r.created.map((c) =>
          line(`c-${c.network_id}`, <CheckCircle2 className="w-4 h-4 text-[var(--safe)] flex-none" />, <span title={c.title}><b>{c.title}</b> · {num(c.rows_copied)} rows</span>, c.case_id)
        )}
        {r.attached.map((a) =>
          line(`a-${a.network_id}`, <Link2 className="w-4 h-4 text-[var(--accent)] flex-none" />, <span><b>{titleOf(a.network_id)}</b> added · {num(a.rows_copied)} rows</span>, a.case_id)
        )}
      </ul>
    </motion.section>
  );
};
