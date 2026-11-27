import { useQueries, useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import type { NetworksResponse } from '../triage/triage';
import type { DeskCase, DeskJob } from './desk';

interface ApiCase { id: string; title?: string }
interface ApiProject { archived?: boolean; cases: { case_id: string; lifecycle: string | null }[] }

/** Cases the user can access (backend list ∪ project links), each with its jobs and networks. Shares query keys with Upload/Triage. */
export function useDeskData() {
  const casesQ = useQuery({
    queryKey: ['cases-list'],
    queryFn: async () => (await apiClient.get<ApiCase[]>('/api/v1/cases')).data,
    retry: false,
    staleTime: 30_000,
  });
  const projectsQ = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await apiClient.get<ApiProject[]>('/api/v1/projects')).data,
    retry: false,
    staleTime: 30_000,
  });

  const lifecycle = new Map<string, string | null>();
  for (const p of projectsQ.data ?? []) for (const c of p.cases) lifecycle.set(c.case_id, c.lifecycle);
  const titles = new Map((casesQ.data ?? []).map((c) => [c.id, c.title ?? '']));
  const ids = casesQ.data || projectsQ.data ? [...new Set([...titles.keys(), ...lifecycle.keys()])].sort() : [];

  const jobsQ = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['ingestion-jobs', id],
      queryFn: async () => (await apiClient.get<DeskJob[]>('/api/v1/ingestion/jobs', { params: { case_id: id } })).data,
      retry: false,
      staleTime: 30_000,
    })),
  });
  const netQ = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['networks', id],
      queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${encodeURIComponent(id)}/networks`)).data,
      retry: false,
      staleTime: 30_000,
    })),
  });

  const cases: DeskCase[] = ids.map((id, i) => ({
    caseId: id,
    lifecycle: lifecycle.get(id),
    jobs: jobsQ[i]?.data,
    networks: netQ[i]?.data,
  }));
  const perCase = [...jobsQ, ...netQ];
  return {
    cases,
    titles,
    isLoading: casesQ.isLoading || projectsQ.isLoading || perCase.some((q) => q.isLoading),
    // Both lists failing is fatal; a single case failing is reported but the rest still shows.
    error: casesQ.isError && projectsQ.isError ? casesQ.error : null,
    failedCases: ids.filter((_, i) => jobsQ[i]?.isError || netQ[i]?.isError),
    refetch: () => {
      void casesQ.refetch();
      void projectsQ.refetch();
      perCase.forEach((q) => void q.refetch());
    },
  };
}
