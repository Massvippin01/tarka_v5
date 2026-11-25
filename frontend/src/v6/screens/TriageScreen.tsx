import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowRight, GitFork, Network, UploadCloud, RotateCcw, Scale, Share2, Users } from 'lucide-react';
import apiClient from '../../api/client';
import { useCaseStore } from '../../store/useCaseStore';
import { formatInr } from '../../lib/formatInr';
import { Button, Chip, EmptyState, PageHead } from '../ui';
import {
  ROLE_LABEL,
  headlineText,
  rankMembers,
  triageTotals,
  type FraudNetwork,
  type NetworkMember,
  type NetworksResponse,
} from '../triage/triage';
import { IntakeReviewBoard } from '../intake/IntakeReviewBoard';
import { ExportButtons } from '../triage/ExportButtons';
import { networkRows, triageLayout, type NetworkRow } from '../triage/layout';
import { NetworkTable, StatusPill } from '../triage/NetworkTable';
import { setFocus } from '../../lib/focusUrl';

const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 404) return 'The server has no network analysis for this case yet.';
    const d = e.response?.data?.detail;
    if (typeof d === 'string') return d;
    return e.response ? `Server replied ${e.response.status}` : 'Could not reach the TARKA server';
  }
  return e instanceof Error ? e.message : String(e);
};

const card = 'rounded-2xl border border-[var(--line)] bg-[var(--surface-1)]/80 backdrop-blur-md shadow-[var(--shadow)]';
const MEMBERS_SHOWN = 8;
const plural = (n: number, one: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : `${one}s`}`;

const NothingFound: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { setActiveView } = useCaseStore();
  const jobs = useQuery({
    queryKey: ['ingestion-jobs', caseId],
    queryFn: async () => (await apiClient.get<{ stage: string; is_cancelled?: boolean }[]>('/api/v1/ingestion/jobs', { params: { case_id: caseId } })).data,
  });
  const files = (jobs.data ?? []).filter((j) => !j.is_cancelled).length;
  return (
    <div className={`${card} p-8 text-center`} data-testid="triage-empty">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-[var(--accent)]"><Network className="w-6 h-6" /></div>
      <div className="text-[16px] font-semibold text-[var(--fg-1)]">No fraud network found in {caseId}</div>
      <p className="mx-auto mt-1.5 max-w-[60ch] text-[13px] text-[var(--fg-2)]">
        {files > 0 ? `TARKA read ${plural(files, 'uploaded file')}` : 'TARKA has no uploaded statements for this case'} and looked for accounts that receive money from victims and quickly pass it on to each other. None matched.
      </p>
      <ul className="mx-auto mt-3 max-w-[56ch] space-y-1 text-left text-[12.5px] text-[var(--fg-2)] list-disc pl-5">
        <li>The suspects’ own bank or UPI statements help most: they show where the money went next.</li>
        <li>Add the victims’ statements too, so the payments into the first account are visible.</li>
        <li>CSV or Excel with a date, an amount and who paid whom is enough.</li>
      </ul>
      <Button className="mt-4" variant="primary" size="md" onClick={() => setActiveView('upload')}>
        <span className="flex items-center gap-1.5"><UploadCloud className="w-3.5 h-3.5" /> Upload statements</span>
      </Button>
    </div>
  );
};

export const TriageScreen: React.FC = () => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const q = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks`)).data,
  });
  const networks = q.data?.networks ?? [];
  const totals = useMemo(() => triageTotals(networks), [networks]);
  const rows = useMemo(() => networkRows(networks, q.data?.cross_case_hits ?? []), [networks, q.data]);
  const layout = triageLayout(networks.length);
  // A bulk-intake holding case: show the review board instead of the network cards.
  if (networks.some((n) => n.proposal)) return <IntakeReviewBoard caseId={caseId} networks={networks} />;

  return (
    <div className="v6-enter space-y-4" data-testid="v6-triage">
      <PageHead kicker="Triage" title={q.data ? headlineText(totals) : 'Fraud networks'} subtitle={`Groups of linked accounts found in ${caseId}'s evidence, ranked by ₹ still freezable and urgency.`}
        actions={networks.length > 0 ? <ExportButtons caseId={caseId} /> : undefined} />

      {q.isLoading ? (
        <div className="grid md:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 rounded-2xl animate-pulse bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState
          icon={<Network className="w-6 h-6" />}
          title="Could not load networks"
          description={errText(q.error)}
          action={
            <Button size="sm" onClick={() => void q.refetch()}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try again
            </Button>
          }
        />
      ) : (
        <>
          {layout === 'empty' && <NothingFound caseId={caseId} />}
          {layout === 'single' && <NetworkCard caseId={caseId} row={rows[0]} index={0} wide />}
          {layout === 'cards' && (
            <div className="grid lg:grid-cols-2 gap-3">
              {rows.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: Math.min(i, 6) * 0.03 }}>
                  <NetworkCard caseId={caseId} row={r} index={i} />
                </motion.div>
              ))}
            </div>
          )}
          {layout === 'table' && <NetworkTable caseId={caseId} rows={rows} />}
          <div className="grid lg:grid-cols-2 gap-3">
            <ReviewQueue items={q.data?.review_queue ?? []} />
            <CrossCaseHits hits={q.data?.cross_case_hits ?? []} caseId={caseId} />
          </div>
        </>
      )}
    </div>
  );
};

const NetworkCard: React.FC<{ caseId: string; row: NetworkRow; index: number; wide?: boolean }> = ({ caseId, row, index, wide }) => {
  const n = row.net;
  const { setActiveView } = useCaseStore();
  const [showAll, setShowAll] = useState(!!wide);
  const [splitting, setSplitting] = useState(false);
  const ranked = useMemo(() => rankMembers(n.members), [n.members]);
  const shown = showAll ? ranked : ranked.slice(0, MEMBERS_SHOWN);

  return (
    <div className={`${card} p-4 ${index === 0 && !wide ? 'ring-1 ring-[var(--accent)]/40' : ''}`} data-testid="network-card">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 flex-none rounded-lg flex items-center justify-center bg-[var(--risk-bg)] text-[var(--risk)]">
          <Share2 className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[var(--fg-1)] truncate" title={n.network_id}>
            {wide ? n.network_id : `#${index + 1} · ${n.network_id}`}
          </div>
          <div className="text-[12px] text-[var(--fg-3)]">
            {n.member_count.toLocaleString('en-IN')} accounts · {plural(n.mule_count, 'mule')} · {plural(n.victim_count, 'victim')}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusPill status={row.status} />
            {row.freezable > 0 && <span className="text-[11.5px] font-semibold text-[var(--safe)]" title={formatInr(row.freezable)}>{formatInr(row.freezable, { compact: true })} still freezable</span>}
            {row.otherFirs > 0 && <span className="text-[11.5px] font-semibold text-[var(--urgent)]">Also in {plural(row.otherFirs, 'other FIR')}</span>}
          </div>
        </div>
        <div className="text-right flex-none">
          <div className="text-[16px] font-semibold tabular-nums text-[var(--fg-1)]" title={formatInr(n.amount_inr)}>
            {formatInr(n.amount_inr, { compact: true })}
          </div>
          <div className="text-[11px] text-[var(--fg-3)]">moved through it</div>
        </div>
      </div>

      <div className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50">
        {shown.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
        {ranked.length === 0 && <div className="px-3 py-2 text-[12px] text-[var(--fg-3)]">No members listed.</div>}
      </div>
      {ranked.length > MEMBERS_SHOWN && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1.5 text-[12px] font-semibold text-[var(--accent)]">
          {showAll ? 'Show fewer' : `Show all ${ranked.length.toLocaleString('en-IN')}`}
        </button>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {wide && (
          <Button size="sm" variant="primary" onClick={() => { setFocus({ networkId: n.network_id, account: null }); setActiveView('network'); }}>
            Open on network page <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
        {splitting ? (
          <SplitForm caseId={caseId} n={n} index={index} onClose={() => setSplitting(false)} />
        ) : (
          <Button size="sm" onClick={() => setSplitting(true)} title="Copy this network's rows into a new case linked to the same project.">
            <GitFork className="w-3.5 h-3.5 mr-1" /> Split into linked case
          </Button>
        )}
      </div>
    </div>
  );
};

const MemberRow: React.FC<{ m: NetworkMember }> = ({ m }) => {
  const role = ROLE_LABEL[m.role] ?? ROLE_LABEL.UNKNOWN;
  const pct = Math.round(Math.max(0, Math.min(1, m.mule_score ?? 0)) * 100);
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 min-w-0 cursor-help" title={m.why || 'No explanation given.'} data-testid="network-member">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[var(--fg-1)] truncate font-mono">{m.label}</div>
        <div className="text-[11px] text-[var(--fg-3)] truncate">
          {m.kind}
          {m.hop !== null && m.hop !== undefined && <> · {m.hop === 0 ? 'the victim' : `${m.hop} hop${m.hop === 1 ? '' : 's'} from a victim`}</>}
        </div>
      </div>
      <Chip variant={role.variant}>{role.label}</Chip>
      <div className="w-20 flex-none" title={`Mule likelihood ${pct}%`}>
        <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--risk)]" style={{ width: `${pct}%`, opacity: 0.35 + pct / 160 }} />
        </div>
        <div className="text-[10.5px] text-[var(--fg-3)] tabular-nums text-right mt-0.5">{pct}%</div>
      </div>
    </div>
  );
};

const SplitForm: React.FC<{ caseId: string; n: FraudNetwork; index: number; onClose: () => void }> = ({ caseId, n, index, onClose }) => {
  const [title, setTitle] = useState(`${caseId} · network ${index + 1}`);
  const { setActiveCaseId } = useCaseStore();
  const valid = title.trim().length > 0;
  const split = useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ case_id: string; rows_copied: number }>(
        `/api/v1/cases/${encodeURIComponent(caseId)}/networks/${encodeURIComponent(n.network_id)}/split`,
        { title: title.trim() } // the server picks a fresh case id owned by the officer
      )).data,
    onSuccess: (r) => {
      toast.success(`Created ${r.case_id} with ${r.rows_copied.toLocaleString('en-IN')} rows`, {
        action: { label: 'Open', onClick: () => setActiveCaseId(r.case_id) },
      });
      onClose();
    },
    onError: (e) => toast.error(`Split failed: ${errText(e)}`),
  });
  return (
    <form
      className="flex items-center gap-2 w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) split.mutate();
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        aria-label="New case title"
        title="TARKA gives the new case its own ID"
        className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-[12.5px] bg-[var(--surface-2)] text-[var(--fg-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${valid ? 'border-[var(--line)]' : 'border-[var(--risk)]'}`}
      />
      <Button type="button" size="sm" variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" size="sm" variant="primary" disabled={!valid} isLoading={split.isPending}>
        Create case
      </Button>
    </form>
  );
};

const ReviewQueue: React.FC<{ items: NetworksResponse['review_queue'] }> = ({ items }) => (
  <section className={`${card} p-4`} data-testid="review-queue">
    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--fg-1)]">
      <Scale className="w-4 h-4 text-[var(--urgent)]" /> Probably the same person — check these
      {items.length > 0 && <Chip variant="urgent">{items.length}</Chip>}
    </div>
    <div className="text-[12px] text-[var(--fg-3)] mt-0.5" title="Probable entity matches are not merged automatically; an officer confirms them.">
      Not merged until an officer confirms.
    </div>
    {items.length === 0 ? (
      <div className="mt-3 text-[12.5px] text-[var(--fg-3)]">Nothing to review.</div>
    ) : (
      <ul className="mt-3 space-y-2">
        {items.map((r, i) => (
          <li key={`${r.a}-${r.b}-${i}`} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 text-[12.5px] font-mono">
              <span className="truncate text-[var(--fg-1)]" title={r.a}>
                {r.a}
              </span>
              <span className="text-[var(--fg-3)] flex-none">≈</span>
              <span className="truncate text-[var(--fg-1)]" title={r.b}>
                {r.b}
              </span>
              <span className="ml-auto flex-none font-sans text-[11.5px] tabular-nums text-[var(--fg-2)]">{Math.round(r.confidence * 100)}% sure</span>
            </div>
            <div className="text-[12px] text-[var(--fg-2)] mt-0.5">{r.why}</div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const CrossCaseHits: React.FC<{ hits: NetworksResponse['cross_case_hits']; caseId: string }> = ({ hits, caseId }) => {
  const { setActiveCaseId } = useCaseStore();
  return (
    <section className={`${card} p-4`} data-testid="cross-case-hits">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--fg-1)]">
        <Users className="w-4 h-4 text-[var(--accent)]" /> Seen in other cases
        {hits.length > 0 && <Chip variant="flow">{hits.length}</Chip>}
      </div>
      <div className="text-[12px] text-[var(--fg-3)] mt-0.5">Accounts, UPI IDs or phones from this case that also appear elsewhere.</div>
      {hits.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-[var(--fg-3)]">No overlap with other cases.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.identifier}`} className="flex items-center gap-2 min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-mono font-semibold text-[var(--fg-1)] truncate" title={h.identifier}>
                  {h.identifier}
                </div>
                <div className="text-[11px] text-[var(--fg-3)]">{h.kind}</div>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {h.case_ids
                  .filter((c) => c !== caseId)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setActiveCaseId(c)}
                      title={`Open ${c}`}
                      className="rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[11.5px] font-mono text-[var(--accent)] hover:border-[var(--accent)]"
                    >
                      {c}
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
