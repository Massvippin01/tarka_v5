import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { LIFECYCLE, type Lifecycle } from '../screens/lifecycle';

interface CaseRow {
  case_id: string;
  lifecycle: Lifecycle | null;
  assignee: string | null;
}

/** The case's row in the projects store (lifecycle, assignee): the one authoritative source; undefined when not registered. */
export function useProjectCase(caseId: string): CaseRow | undefined {
  const q = useQuery({
    queryKey: ['projects-cases'],
    queryFn: async () => (await apiClient.get<CaseRow[]>('/api/v1/projects/cases')).data,
    staleTime: 30_000,
  });
  return q.data?.find((c) => c.case_id === caseId);
}

export const useProjectLifecycle = (caseId: string): Lifecycle | null => useProjectCase(caseId)?.lifecycle ?? null;

/** Topbar stage control for cases that live in the projects store; same values and labels as the Projects screen. */
export const ProjectLifecyclePill: React.FC<{ caseId: string; lifecycle: Lifecycle }> = ({ caseId, lifecycle }) => {
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: (next: Lifecycle) => apiClient.patch(`/api/v1/projects/cases/${encodeURIComponent(caseId)}`, { lifecycle: next }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: ['projects-cases'] });
    },
    onError: () => toast.error('Could not change the case stage'),
  });
  return (
    <select
      data-testid="case-status-trigger"
      aria-label="Case stage"
      value={lifecycle}
      disabled={patch.isPending}
      onChange={(e) => patch.mutate(e.target.value as Lifecycle)}
      className="h-8 rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs font-semibold text-[var(--fg-1)] cursor-pointer"
    >
      {LIFECYCLE.map((l) => (
        <option key={l.key} value={l.key}>
          {l.label}
        </option>
      ))}
    </select>
  );
};
