/**
 * Everything the Actions & Report page needs for the current focus, from the active case only:
 * networks (server, or the demo case as one network), freeze notices, custody fingerprints, the ranked queue,
 * progress, the court checklist and the money figures (each with its source rows).
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import { CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import { selectFinancialSummary, selectFreezeActions, selectMoneyFigure, toMoneyRow, type MoneyFigure } from '../../selectors/caseSelectors';
import { formatInr } from '../../lib/formatInr';
import { useFocus } from '../../lib/focusUrl';
import { partyKey } from '../../selectors/peopleSelectors';
import { fixtureNetworks, memberFigure, networkFigure } from '../network/networkFocus';
import type { NetworksResponse } from '../triage/triage';
import { useProjectCase } from '../shell/ProjectLifecyclePill';
import { useFreezeNotices } from './FreezeQueuePanel';
import { groupByBank, noticeReference, rankFreezeQueue, type BankGroup, type FreezeNotice, type NoticeCaseContext, type NoticeStatus } from './freezeQueue';
import {
  actionProgress,
  courtChecklist,
  isCourtReady,
  rankActionQueue,
  resolveActionScope,
  scopeNotices,
  type ActionNetwork,
  type EvidenceState,
  type MoneySplit,
  type RankedRow,
} from './actionPlan';
import type { ReportFigure } from '../report/reportModel';

const enc = encodeURIComponent;
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail?.toString() ?? (e as Error).message;

interface CustodyEvent {
  job_id: string;
  action: string;
  detail: string;
  filename: string;
}

/** Ticks every minute so "overdue" flips without a reload. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Signed rows in / out of a set of accounts in one pass (internal moves between them net out). */
function heldRows(c: CanonicalCaseFixture, names: Set<string>, label: string, totalInr: number): MoneyFigure {
  const rows = c.transactions
    .filter((t) => t.category !== 'SALARY_CREDIT')
    .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc))
    .flatMap((t) => {
      const into = names.has(partyKey(t.toName));
      const outOf = names.has(partyKey(t.fromName));
      if (into === outOf) return [];
      return [toMoneyRow(c, t, into ? 1 : -1)];
    });
  return { label, totalInr, rows };
}

export function useActionData(fixture: CanonicalCaseFixture) {
  const caseId = fixture.caseId;
  const qc = useQueryClient();
  const now = useNow();
  const urlFocus = useFocus();

  const netsQ = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)).data,
  });
  const projectCase = useProjectCase(caseId);
  const noticesQ = useFreezeNotices(caseId);
  const custodyQ = useQuery({
    queryKey: ['custody', caseId, 'actions'],
    queryFn: async () => (await apiClient.get<CustodyEvent[]>(`/api/v1/ingestion/cases/${enc(caseId)}/custody`)).data,
  });

  const fromServer = (netsQ.data?.networks.length ?? 0) > 0;
  const networks = useMemo<ActionNetwork[]>(
    () => (fromServer ? (netsQ.data!.networks as ActionNetwork[]) : fixtureNetworks(fixture)),
    [fromServer, netsQ.data, fixture],
  );
  const scope = useMemo(() => resolveActionScope(networks, urlFocus), [networks, urlFocus]);
  const notices = useMemo(() => noticesQ.data?.notices ?? [], [noticesQ.data]);
  const fin = useMemo(() => selectFinancialSummary(fixture), [fixture]);
  const freezes = useMemo(() => selectFreezeActions(fixture), [fixture]);
  const allRows = useMemo(() => rankFreezeQueue(freezes, notices, fin.goldenHourRemainingMins), [freezes, notices, fin.goldenHourRemainingMins]);
  const rows = useMemo(() => rankActionQueue(allRows, scope, now), [allRows, scope, now]);
  const visibleNotices = useMemo(() => scopeNotices(notices, rows, scope), [notices, rows, scope]);
  const progress = useMemo(() => actionProgress(rows, scope), [rows, scope]);

  const evidence = useMemo(() => {
    const events = custodyQ.data ?? [];
    if (events.length) {
      const files = new Map<string, { name: string; sha256: string }>();
      // A cancelled upload never became evidence.
      const cancelled = new Set(events.filter((e) => /cancel/i.test(e.action)).map((e) => e.job_id));
      for (const e of events) {
        if (cancelled.has(e.job_id)) continue;
        const f = files.get(e.job_id) ?? { name: e.filename, sha256: '' };
        const h = /SHA-256\s+([0-9a-f]{64})/i.exec(e.detail);
        if (h) f.sha256 = h[1].toLowerCase();
        files.set(e.job_id, f);
      }
      return [...files.values()];
    }
    // Demo case with no uploads: its own exhibit list (status PASS = fingerprint verified).
    if (!CANONICAL_CASES[caseId]) return [];
    return buildCaseBundleFromFixture(fixture).fileManifest.map((f) => ({ name: f.fileName, sha256: f.status === 'PASS' ? f.sha256 : '' }));
  }, [custodyQ.data, caseId, fixture]);
  const evidenceState: EvidenceState = { files: evidence.length, fingerprinted: evidence.filter((e) => e.sha256).length };

  const money: MoneySplit = useMemo(() => {
    const n = scope.network;
    if (n) return { paidIn: n.amount_inr || 0, recoverable: n.recoverable_inr || 0, cashedOut: n.cashed_out_inr || 0, unaccounted: n.unaccounted_inr || 0 };
    return { paidIn: fin.bookedLossInr, recoverable: fin.recoverableInr, cashedOut: fin.unrecoverableCashoutInr, unaccounted: fin.unaccountedInr };
  }, [scope.network, fin]);

  const checklist = useMemo(
    () => courtChecklist(rows, visibleNotices, scope, evidenceState, money, (v) => formatInr(v, { compact: true }), now),
    // evidenceState is derived from `evidence`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, visibleNotices, scope, evidence, money, now],
  );

  /** At project zoom: how many networks pass every check on their own. */
  const networksReady = useMemo(() => {
    if (scope.level !== 'project') return null;
    return networks.filter((n) => {
      const s = resolveActionScope(networks, { networkId: n.network_id, account: null });
      const r = rankActionQueue(allRows, s, now);
      const m = { paidIn: n.amount_inr || 0, recoverable: n.recoverable_inr || 0, cashedOut: n.cashed_out_inr || 0, unaccounted: n.unaccounted_inr || 0 };
      return isCourtReady(courtChecklist(r, scopeNotices(notices, r, s), s, evidenceState, m, String, now));
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.level, networks, allRows, notices, evidence, now]);

  const figures = useMemo<ReportFigure[]>(() => {
    const n = scope.network;
    const member = scope.account && n ? n.members.find((m) => partyKey(m.id) === scope.account || partyKey(m.label) === scope.account) : undefined;
    const base: ReportFigure[] =
      scope.level === 'account' && member
        ? [
            { id: 'F1', label: 'moneyIn', figure: memberFigure(fixture, member, 'in') },
            { id: 'F2', label: 'moneyOut', figure: memberFigure(fixture, member, 'out') },
            { id: 'F3', label: 'held', figure: memberFigure(fixture, member, 'held') },
          ]
        : n
          ? [
              { id: 'F1', label: 'paidIn', figure: networkFigure(fixture, n, 'paidIn') },
              { id: 'F2', label: 'cashedOut', figure: networkFigure(fixture, n, 'cashedOut') },
              { id: 'F3', label: 'recoverable', figure: networkFigure(fixture, n, 'recoverable') },
              { id: 'F4', label: 'unaccounted', figure: { label: `Not yet traced in ${n.network_id}`, totalInr: n.unaccounted_inr || 0, rows: [] } },
            ]
          : [
              { id: 'F1', label: 'paidIn', figure: selectMoneyFigure(fixture, 'loss') },
              { id: 'F2', label: 'cashedOut', figure: selectMoneyFigure(fixture, 'cashout') },
              { id: 'F3', label: 'recoverable', figure: selectMoneyFigure(fixture, 'recoverable') },
              { id: 'F4', label: 'unaccounted', figure: { label: 'Not yet traced', totalInr: fin.unaccountedInr, rows: [] } },
            ];
    const asked = rows.filter((r) => r.status !== 'NOT_SENT');
    const frozen = rows.filter((r) => r.status === 'FROZEN');
    return [
      ...base,
      { id: `F${base.length + 1}`, label: 'requested', figure: heldRows(fixture, new Set(asked.map((r) => partyKey(r.holderName))), 'Asked banks to freeze', progress.requestedInr) },
      { id: `F${base.length + 2}`, label: 'frozen', figure: heldRows(fixture, new Set(frozen.map((r) => partyKey(r.holderName))), 'Frozen by banks', progress.frozenInr) },
    ];
  }, [scope, fixture, fin.unaccountedInr, rows, progress.requestedInr, progress.frozenInr]);

  const ctx: NoticeCaseContext = {
    caseId,
    firNumber: fixture.firNumber,
    policeStation: fixture.policeStation,
    officer: projectCase?.assignee || fixture.leadInvestigator, // the case assignee (Projects) wins
    complainantName: fixture.complainant.name,
    complainantAccount: fixture.complainant.accountMasked,
  };

  const noticeKey = ['case', caseId, 'freeze-notices'];
  const setNotices = (d: { notices: FreezeNotice[] }) => qc.setQueryData(noticeKey, { notices: d.notices });

  const issue = useMutation({
    mutationFn: async (groups: BankGroup[]) => {
      const at = new Date();
      const netOf = new Map(rows.map((r) => [r.nodeId, r.networkId]));
      const body = {
        notices: groups.map((g) => {
          const nets = [...new Set(g.rows.map((r) => netOf.get(r.nodeId)).filter(Boolean))];
          return {
            bank: g.bank,
            ifscPrefix: g.ifscPrefix,
            sections: g.sections,
            accountIds: g.rows.map((r) => r.nodeId),
            referenceNo: noticeReference(ctx, g, at),
            networkId: nets.length === 1 ? nets[0] : null,
          };
        }),
      };
      return (await apiClient.post<{ notices: FreezeNotice[]; created: FreezeNotice[] }>(`/api/v1/cases/${enc(caseId)}/freeze-notices`, body)).data;
    },
    onSuccess: async (d, groups) => {
      setNotices(d);
      toast.success(`${d.created.length} notice${d.created.length === 1 ? '' : 's'} prepared. Download or print each one in “Notices sent to banks”.`);
      // Move the networks these accounts belong to on to "Freezes sent" (never backwards).
      if (!fromServer) return;
      const ids = new Set(groups.flatMap((g) => g.rows.map((r) => r.nodeId)));
      const nets = new Set(rows.filter((r) => ids.has(r.nodeId) && r.networkId).map((r) => r.networkId!));
      const move = networks.filter((n) => nets.has(n.network_id) && ['NEW', 'UNDER_REVIEW', 'CASE_OPENED'].includes(n.triage?.status ?? 'NEW'));
      await Promise.allSettled(move.map((n) => apiClient.put(`/api/v1/cases/${enc(caseId)}/networks/${enc(n.network_id)}/status`, { status: 'FREEZES_SENT' })));
      qc.invalidateQueries({ queryKey: ['networks', caseId] });
    },
    onError: (e) => toast.error(`Notices not recorded: ${errMsg(e)}`),
  });

  const advance = useMutation({
    mutationFn: async (v: { id: string; status: NoticeStatus; frozenInr?: number | null }) =>
      (await apiClient.patch<{ notices: FreezeNotice[] }>(`/api/v1/cases/${enc(caseId)}/freeze-notices/${enc(v.id)}`, v.frozenInr == null ? { status: v.status } : v)).data,
    onSuccess: (d, v) => {
      setNotices(d);
      toast.success(v.status === 'FROZEN' ? 'Freeze recorded' : v.status === 'REFUSED' ? 'Refusal recorded' : 'Acknowledgement recorded');
    },
    onError: (e) => toast.error(`Not saved: ${errMsg(e)}`),
  });

  const remind = useMutation({
    mutationFn: async (id: string) => (await apiClient.post<{ notices: FreezeNotice[] }>(`/api/v1/cases/${enc(caseId)}/freeze-notices/${enc(id)}/reminders`)).data,
    onSuccess: (d) => {
      setNotices(d);
      toast.success('Reminder recorded. The letter has been downloaded.');
    },
    onError: (e) => toast.error(`Reminder not recorded: ${errMsg(e)}`),
  });

  return {
    caseId,
    ctx,
    now,
    networks,
    fromServer,
    scope,
    rows,
    allRows,
    notices: visibleNotices,
    progress,
    checklist,
    networksReady,
    evidence,
    figures,
    groupByBank,
    issue,
    advance,
    remind,
    loading: noticesQ.isLoading || (netsQ.isLoading && !CANONICAL_CASES[caseId]),
    noticesError: noticesQ.isError ? (noticesQ.error as Error) : null,
    retryNotices: () => noticesQ.refetch(),
    networksError: netsQ.isError && !CANONICAL_CASES[caseId],
  };
}

export type ActionData = ReturnType<typeof useActionData>;
export type { RankedRow };
