/** Adaptive Triage layout: how many networks decide how they are shown. Pure, no I/O. */
import { crossCaseByMember, statusOf, type NetworkStatus } from '../network/networkFocus';
import type { CrossCaseHit, FraudNetwork } from './triage';

export type TriageLayout = 'empty' | 'single' | 'cards' | 'table';

/** Above this many networks a stack of tall cards is endless scrolling; a table scans better. */
export const TABLE_THRESHOLD = 20;

export const triageLayout = (count: number): TriageLayout =>
  count <= 0 ? 'empty' : count === 1 ? 'single' : count <= TABLE_THRESHOLD ? 'cards' : 'table';

export interface NetworkRow {
  net: FraudNetwork;
  id: string;
  mules: number;
  victims: number;
  moved: number;
  freezable: number;
  status: NetworkStatus;
  otherFirs: number;
  /** freezable ₹ × urgency; the default order. */
  priority: number;
}

/** Work still to do weighs more than work already handed on. */
const STATUS_WEIGHT: Record<NetworkStatus, number> = { NEW: 1, UNDER_REVIEW: 1, CASE_OPENED: 0.5, FREEZES_SENT: 0.25, CLOSED: 0.05 };
const DAY = 86400;

/** ₹ a freeze could still hold: the server's figure, else what the listed mule members hold. */
export const freezableOf = (n: FraudNetwork): number =>
  n.recoverable_inr ?? n.members.reduce((s, m) => s + (m.role === 'MULE' ? m.held_inr ?? 0 : 0), 0);

/** Newer activity (compared with the newest in the case) means more urgent. */
const recencyWeight = (n: FraudNetwork, newest: number): number => {
  const last = Math.max(0, ...n.members.map((m) => m.last_ts ?? 0));
  if (!last || !newest) return 0.8;
  const age = newest - last;
  return age <= 2 * DAY ? 1 : age <= 14 * DAY ? 0.8 : 0.6;
};

export function networkRows(networks: FraudNetwork[], hits: CrossCaseHit[] = []): NetworkRow[] {
  const newest = networks.reduce((m, n) => n.members.reduce((mm, x) => Math.max(mm, x.last_ts ?? 0), m), 0);
  return networks
    .map((net) => {
      const status = statusOf(net);
      const freezable = freezableOf(net);
      const firs = new Set([...crossCaseByMember(net.members, hits).values()].flat());
      return {
        net,
        id: net.network_id,
        mules: net.mule_count || 0,
        victims: net.victim_count || 0,
        moved: net.amount_inr || 0,
        freezable,
        status,
        otherFirs: firs.size,
        priority: freezable * STATUS_WEIGHT[status] * recencyWeight(net, newest),
      };
    })
    .sort((a, b) => b.priority - a.priority || b.moved - a.moved || a.id.localeCompare(b.id));
}

export type SortKey = 'priority' | 'id' | 'mules' | 'victims' | 'moved' | 'freezable' | 'status' | 'otherFirs';
const STATUS_RANK: NetworkStatus[] = ['NEW', 'UNDER_REVIEW', 'CASE_OPENED', 'FREEZES_SENT', 'CLOSED'];

export function sortRows(rows: NetworkRow[], key: SortKey, dir: 'asc' | 'desc'): NetworkRow[] {
  const val = (r: NetworkRow) => (key === 'status' ? STATUS_RANK.indexOf(r.status) : r[key]);
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const c = typeof x === 'string' ? x.localeCompare(y as string, undefined, { numeric: true }) : (x as number) - (y as number);
    return sign * c || b.priority - a.priority || a.id.localeCompare(b.id);
  });
}

export const filterByStatus = (rows: NetworkRow[], status: NetworkStatus | null): NetworkRow[] =>
  status ? rows.filter((r) => r.status === status) : rows;
