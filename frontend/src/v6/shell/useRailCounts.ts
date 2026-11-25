import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { findCase } from '../../fixtures/cases';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';
import { selectFreezeActions } from '../../selectors/caseSelectors';
import { viewFromServer, type DevicesResponse } from '../../selectors/deviceSelectors';
import { useDeskData } from '../desk/useDeskData';
import { buildDeskItems } from '../desk/desk';
import { statusOf } from '../network/networkFocus';
import { rankFreezeQueue } from '../freeze/freezeQueue';
import { useFreezeNotices } from '../freeze/FreezeQueuePanel';
import { triageTotals, type NetworksResponse } from '../triage/triage';

export interface RailProject {
  project_id: string;
  name: string;
  archived?: boolean;
  cases: { case_id: string }[];
}

/**
 * Sidebar counts. Every number comes from the query/selector the matching screen uses (same query keys, so no extra
 * requests once those are cached). A count that is not loaded yet is `undefined` and the rail shows nothing.
 */
export function useRailCounts(caseId: string) {
  const desk = useDeskData();
  const inbox = desk.isLoading && !desk.cases.length ? undefined : buildDeskItems(desk.cases).length;

  const netsQ = useQuery({
    queryKey: ['networks', caseId],
    queryFn: async () => (await apiClient.get<NetworksResponse>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks`)).data,
  });
  const nets = netsQ.data?.networks;
  const totals = nets ? triageTotals(nets) : undefined;
  const undecided = nets ? nets.filter((n) => statusOf(n) === 'NEW').length : undefined;

  const demo = findCase(caseId);
  const devicesQ = useQuery({
    queryKey: ['devices', caseId],
    queryFn: async () => (await apiClient.get<DevicesResponse>(`/api/v1/ingestion/cases/${encodeURIComponent(caseId)}/devices`)).data,
    enabled: !demo, // demo cases build their device view from the fixture inside the screen
  });
  const deviceGroups = devicesQ.data ? viewFromServer(devicesQ.data).clusters.length : undefined;

  const fin = selectCaseActionFinancials(caseId);
  const noticesQ = useFreezeNotices(caseId);
  const toFreeze =
    demo && noticesQ.data
      ? rankFreezeQueue(selectFreezeActions(demo), noticesQ.data.notices, fin.goldenHourRemainingMins).filter((r) => r.status === 'NOT_SENT').length
      : undefined;

  const projectsQ = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await apiClient.get<RailProject[]>('/api/v1/projects')).data,
  });
  const project = projectsQ.data?.find((p) => !p.archived && p.cases.some((c) => c.case_id === caseId)) ?? null;

  return {
    inbox,
    undecided,
    networks: totals?.networks,
    mules: totals?.mules,
    freezableInr: fin.pendingFreezeInr > 0 ? fin.pendingFreezeInr : undefined,
    deviceGroups,
    toFreeze,
    project,
  };
}
