import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import { bundleCaseQueryKey } from '../../selectors/bundleAdapter';
import { rawBundleKey } from '../../api/caseQueries';
import type { NetworksResponse } from '../triage/triage';
import type { PairVerdict, Verdict } from '../../selectors/peopleSelectors';
import { EMPTY_FILTERS, filterFixtureLedger, type LedgerRow } from '../../selectors/evidenceSelectors';
import { partyKey } from '../../selectors/peopleSelectors';
import { selectFinancialSummary, selectFreezeActions } from '../../selectors/caseSelectors';
import { groupByBank, noticeReference, rankFreezeQueue, type FreezeNotice, type QueueRow } from '../freeze/freezeQueue';
import { useFreezeNotices } from '../freeze/FreezeQueuePanel';
import { deviceIdsByParty, viewFromServer, type DevicesResponse } from '../../selectors/deviceSelectors';

const enc = encodeURIComponent;

/** The server's own words ("Say why…") instead of "Request failed with status code 422". */
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail?.toString() ?? (e as Error).message;

/** Same query key as Triage / Network / Evidence, so a verdict refreshes every screen at once. */
export function useNetworks(caseId: string) {
  return useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)).data,
  });
}

function useRefreshTotals(caseId: string) {
  const qc = useQueryClient();
  // Networks (roles, recoverable) and the case bundle (every money figure) both change with a verdict.
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['networks', caseId] }),
      qc.invalidateQueries({ queryKey: rawBundleKey(caseId) }), // before the fixture query re-reads it
      qc.invalidateQueries({ queryKey: bundleCaseQueryKey(caseId) }),
      qc.invalidateQueries({ queryKey: ['account-verdict-history', caseId] }),
    ]);
}

export function useAccountVerdict(caseId: string) {
  const qc = useQueryClient();
  const refresh = useRefreshTotals(caseId);
  return useMutation({
    mutationFn: async (v: { account: string; verdict: Verdict | null; reason?: string }) =>
      (await apiClient.put(`/api/v1/cases/${enc(caseId)}/accounts/verdict`, { reason: '', ...v })).data,
    onSuccess: (_d, v) => {
      const target = partyKey(v.account);
      qc.setQueryData<NetworksResponse>(['networks', caseId], (prev) =>
        prev
          ? {
              ...prev,
              networks: prev.networks.map((nw) => ({
                ...nw,
                members: nw.members.map((m) => (partyKey(m.id) === target ? { ...m, verdict: v.verdict } : m)),
              })),
            }
          : prev,
      );
      toast.success(v.verdict === null ? 'Verdict cleared' : v.verdict === 'NOT_MULE' ? 'Marked “not a mule”. Totals recalculating…' : 'Confirmed as mule');
      void refresh();
    },
    onError: (e) => toast.error(`Not saved: ${errMsg(e)}`),
  });
}

export function usePairVerdict(caseId: string) {
  const refresh = useRefreshTotals(caseId);
  return useMutation({
    mutationFn: async (v: { a: string; b: string; verdict: PairVerdict | null; reason?: string }) =>
      (await apiClient.put(`/api/v1/cases/${enc(caseId)}/review/verdict`, { reason: '', ...v })).data,
    onSuccess: (_d, v) => {
      toast.success(v.verdict === 'MERGE' ? 'Recorded: same person' : v.verdict === 'NOT_SAME' ? 'Recorded: not the same person' : 'Decision cleared');
      void refresh();
    },
    onError: (e) => toast.error(`Not saved: ${errMsg(e)}`),
  });
}

export interface VerdictHistoryRow {
  seq: number;
  actor: string;
  at: number;
  after: { verdict: Verdict; reason: string | null } | null;
}

export function useVerdictHistory(caseId: string, account: string, enabled: boolean) {
  return useQuery({
    queryKey: ['account-verdict-history', caseId, account],
    queryFn: async () =>
      (await apiClient.get<VerdictHistoryRow[]>(`/api/v1/cases/${enc(caseId)}/accounts/history`, { params: { account } })).data,
    enabled,
  });
}

/** First payments touching one account: server ledger for uploaded cases, fixture rows for demo cases. */
export function useAccountTimeline(caseId: string, account: string, demo: CanonicalCaseFixture | null) {
  return useQuery({
    queryKey: ['ledger', caseId, { account, limit: 60 }],
    queryFn: async (): Promise<{ total: number; rows: LedgerRow[] }> => {
      if (demo) {
        const p = filterFixtureLedger(demo, EMPTY_FILTERS, { networkId: null, account }, null);
        return { total: p.total, rows: p.rows.slice(0, 60) };
      }
      const { data } = await apiClient.get<{ total: number; rows: (Omit<LedgerRow, 'key'> & { job_id: string })[] }>(
        `/api/v1/ingestion/cases/${enc(caseId)}/txns`,
        { params: { account, offset: 0, limit: 60 } },
      );
      return { total: data.total, rows: data.rows.map((r) => ({ ...r, key: `${r.job_id}:${r.line}` })) };
    },
  });
}

/** Device / login-log identifiers per party key for uploaded cases (query key shared with the Devices page). */
export function useDeviceIds(caseId: string, enabled: boolean) {
  const q = useQuery({
    queryKey: ['devices', caseId],
    queryFn: async () => (await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/devices`)).data,
    enabled,
  });
  return deviceIdsByParty(q.data ? viewFromServer(q.data) : null);
}

const FREEZE_AUTH = { Authorization: 'Bearer test-token' }; // same as the freeze queue panel

/** This account's row in the freeze queue (null when it holds nothing a freeze can catch) + "send notice". */
export function useAccountFreeze(fixture: CanonicalCaseFixture, label: string) {
  const caseId = fixture.caseId;
  const qc = useQueryClient();
  const notices = useFreezeNotices(caseId);
  const action = selectFreezeActions(fixture).find((a) => partyKey(a.holderName) === partyKey(label) && a.kind !== 'CASHOUT_REQUISITION');
  const row: QueueRow | null = action
    ? rankFreezeQueue([action], notices.data?.notices ?? [], selectFinancialSummary(fixture).goldenHourRemainingMins)[0] ?? null
    : null;
  const send = useMutation({
    mutationFn: async () => {
      if (!row) throw new Error('Nothing to freeze in this account');
      const g = groupByBank([row])[0];
      const ctx = { caseId, firNumber: fixture.firNumber, policeStation: fixture.policeStation, officer: fixture.leadInvestigator,
        complainantName: fixture.complainant.name, complainantAccount: fixture.complainant.accountMasked };
      const res = await fetch(`/api/v1/cases/${enc(caseId)}/freeze-notices`, {
        method: 'POST',
        headers: { ...FREEZE_AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notices: [{ bank: g.bank, ifscPrefix: g.ifscPrefix, sections: g.sections, accountIds: [row.nodeId], referenceNo: noticeReference(ctx, g, new Date()) }] }),
      });
      if (!res.ok) throw new Error(`Could not record the notice (${res.status})`);
      return res.json() as Promise<{ notices: FreezeNotice[] }>;
    },
    onSuccess: (d) => {
      qc.setQueryData(['case', caseId, 'freeze-notices'], { notices: d.notices });
      toast.success('Freeze notice recorded. Print or send it from Actions & report.');
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { row, send, loading: notices.isLoading };
}
