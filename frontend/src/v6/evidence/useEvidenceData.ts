import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import type { NetworksResponse } from '../triage/triage';
import type { Focus } from '../../lib/focusUrl';
import {
  ledgerParams,
  type CustodyEvent,
  type IngestionJobRow,
  type LedgerFilters,
  type LedgerRow,
} from '../../selectors/evidenceSelectors';

const enc = encodeURIComponent;
export const LEDGER_PAGE = 200;

/** Jobs, custody log and networks for an uploaded case. Query keys shared with Upload Center / Triage / Desk. */
export function useEvidenceData(caseId: string, enabled: boolean) {
  const jobs = useQuery({
    queryKey: ['ingestion-jobs', caseId],
    queryFn: async () => (await apiClient.get<IngestionJobRow[]>('/api/v1/ingestion/jobs', { params: { case_id: caseId } })).data,
    enabled,
    // Keep polling while a file is still being read, so the page settles by itself.
    refetchInterval: (q) =>
      q.state.data?.some((j) => !j.is_cancelled && !j.error_message && !['EVIDENCE_AVAILABLE', 'NEEDS_MAPPING', 'DUPLICATE', 'REJECTED'].includes(j.stage))
        ? 4000
        : false,
  });
  const custody = useQuery({
    queryKey: ['custody', caseId, jobs.dataUpdatedAt],
    queryFn: async () => (await apiClient.get<CustodyEvent[]>(`/api/v1/ingestion/cases/${enc(caseId)}/custody`)).data,
    enabled: enabled && jobs.isSuccess,
  });
  const networks = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)).data,
    enabled,
  });
  return { jobs, custody, networks };
}

interface TxnsResponse {
  total: number;
  total_inr: number;
  rows: { job_id: string; line: number; ts: number; payer: string; payee: string; amount: number; ref: string; rail: string; filename: string }[];
}

/** Server-paged ledger (200 rows a page, fetched as the table scrolls). */
export function useServerLedger(caseId: string, filters: LedgerFilters, focus: Focus, enabled: boolean) {
  const params = ledgerParams(filters, focus);
  return useInfiniteQuery({
    queryKey: ['ledger', caseId, params],
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.get<TxnsResponse>(`/api/v1/ingestion/cases/${enc(caseId)}/txns`, {
        params: { ...params, offset: pageParam, limit: LEDGER_PAGE },
      });
      return {
        total: data.total,
        totalInr: data.total_inr,
        rows: data.rows.map((r): LedgerRow => ({ ...r, key: `${r.job_id}:${r.line}` })),
      };
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((s, p) => s + p.rows.length, 0);
      return loaded < last.total && last.rows.length ? loaded : undefined;
    },
    enabled,
    placeholderData: (prev) => prev, // keep the old rows on screen while a new filter loads
  });
}

export interface RejectedResponse {
  total: number;
  by_reason: { reason: string; count: number }[];
  rows: { line: number; raw: string; reason: string }[];
}

export function useRejectedRows(jobId: string | null) {
  return useInfiniteQuery({
    queryKey: ['rejected', jobId],
    queryFn: async ({ pageParam }) =>
      (await apiClient.get<RejectedResponse>(`/api/v1/ingestion/jobs/${enc(jobId!)}/rejected`, { params: { offset: pageParam, limit: 100 } })).data,
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((s, p) => s + p.rows.length, 0);
      return loaded < last.total && last.rows.length ? loaded : undefined;
    },
    enabled: !!jobId,
  });
}
