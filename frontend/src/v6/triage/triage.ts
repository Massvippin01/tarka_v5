/** Types and pure helpers for the Triage board (GET /cases/{id}/networks). No I/O here. */
import { formatInr } from '../../lib/formatInr';
import type { NetworkTriage } from '../network/networkFocus';

export type MemberRole = 'VICTIM' | 'MULE' | 'CASH_OUT' | 'UNKNOWN' | 'CONTROLLER_GROUP';

export interface NetworkMember {
  id: string;
  label: string;
  kind: string;
  role: MemberRole;
  mule_score: number;
  hop: number | null;
  why: string;
  /** ₹ still sitting in this account (what a freeze could hold). */
  held_inr?: number;
  /** Held ₹ × retention likelihood (decays with hours since last outflow). */
  freeze_value_inr?: number;
  retention_likelihood?: number;
  hours_since_last_outflow?: number;
  /** Money in / out of this account and first / last activity (epoch s). Older servers omit them. */
  in_inr?: number;
  out_inr?: number;
  first_ts?: number | null;
  last_ts?: number | null;
  /** Investigator's verdict on this account (People page); NOT_MULE accounts come back with role UNKNOWN. */
  verdict?: 'CONFIRMED_MULE' | 'NOT_MULE' | null;
  controller_id?: string | null;
  controller_summary?: string | null;
  subgroup_id?: string | null;
}

export interface ControllerDeviceLink {
  kind: string;
  value: string;
  accounts: string[];
  events: number;
  first_ts: number;
  last_ts: number;
}

export interface ControllerEvidenceRow {
  job_id: string;
  line: number;
  ts: number;
  account: string;
  kind: string;
  value: string;
  event?: string | null;
}

export interface ControllerGroup {
  controller_id: string;
  role: 'CONTROLLER_GROUP';
  accounts: string[];
  account_count: number;
  mule_count: number;
  device_count: number;
  strongest_kind: string;
  devices: ControllerDeviceLink[];
  evidence_rows: ControllerEvidenceRow[];
  summary: string;
  why: string;
}

export interface VictimTracePath {
  hops: string[];
  hop_labels: string[];
  timestamps: number[];
  amount_inr: number;
  outcome: 'HELD' | 'CASHED_OUT' | 'MOVED_OTHER';
  terminal_account: string;
}

export interface VictimTrace {
  victim_id: string;
  victim_label: string;
  paid_in_inr: number;
  paths: VictimTracePath[];
  where_now: {
    held: { account: string; label: string; amount_inr: number }[];
    cashed_out: { account: string; label: string; amount_inr: number }[];
    moved_elsewhere: { account: string; label: string; amount_inr: number }[];
  };
}

export interface NetworkSubgroup {
  subgroup_id: string;
  label: string;
  member_count: number;
  mule_count: number;
  victim_count: number;
  amount_inr: number;
  held_inr: number;
}

export interface ScoringMeta {
  mode: 'default' | 'calibrated';
  verdicts_used: number;
  last_tuned_at?: number | null;
  label: string;
}

export interface FraudNetwork {
  network_id: string;
  member_count: number;
  mule_count: number;
  victim_count: number;
  amount_inr: number;
  cashed_out_inr?: number;
  recoverable_inr?: number;
  unaccounted_inr?: number;
  controllers?: ControllerGroup[];
  traces?: VictimTrace[];
  subgroups?: NetworkSubgroup[];
  members: NetworkMember[];
  /** payer → payee money links between the listed members: [payer id, payee id, ₹]. Older servers omit it. */
  links?: [string, string, number][];
  /** Investigator's decision on this network (PUT …/status). */
  triage?: NetworkTriage;
  /** Bulk intake: what TARKA suggests doing with this network (holding cases only). */
  proposal?: {
    action: 'NEW_CASE' | 'ATTACH' | 'MINOR';
    suggested_title: string;
    attach_case_id?: string;
    shared_identifiers?: string[];
  };
}

export interface ReviewItem {
  a: string;
  b: string;
  confidence: number;
  why: string;
  /** Sorted party keys joined by "|"; verdict MERGE / NOT_SAME once decided. */
  key?: string;
  verdict?: 'MERGE' | 'NOT_SAME' | null;
}

export interface CrossCaseHit {
  identifier: string;
  kind: string;
  case_ids: string[];
}

export interface NetworksResponse {
  networks: FraudNetwork[];
  review_queue: ReviewItem[];
  cross_case_hits: CrossCaseHit[];
  scoring_meta?: ScoringMeta;
}

export interface TriageTotals {
  networks: number;
  mules: number;
  victims: number;
  amount: number;
}

export function triageTotals(networks: FraudNetwork[]): TriageTotals {
  return networks.reduce(
    (t, n) => ({
      networks: t.networks + 1,
      mules: t.mules + (n.mule_count || 0),
      victims: t.victims + (n.victim_count || 0),
      amount: t.amount + (n.amount_inr || 0),
    }),
    { networks: 0, mules: 0, victims: 0, amount: 0 }
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/** "3 networks — 5 mules, 2 victims, ₹1.2 L" */
export function headlineText(t: TriageTotals): string {
  return `${plural(t.networks, 'network')} — ${plural(t.mules, 'mule')}, ${plural(t.victims, 'victim')}, ${formatInr(t.amount, { compact: true })}`;
}

/** Most mule-like first; ties broken by distance from the victim, then label. */
export function rankMembers(members: NetworkMember[]): NetworkMember[] {
  return [...members].sort(
    (a, b) =>
      (b.mule_score ?? 0) - (a.mule_score ?? 0) ||
      (a.hop ?? Infinity) - (b.hop ?? Infinity) ||
      a.label.localeCompare(b.label)
  );
}

export const ROLE_LABEL: Record<MemberRole, { label: string; variant: 'risk' | 'safe' | 'urgent' | 'flow' | 'muted' }> = {
  VICTIM: { label: 'Victim', variant: 'safe' },
  MULE: { label: 'Mule', variant: 'risk' },
  CASH_OUT: { label: 'Cash-out', variant: 'urgent' },
  UNKNOWN: { label: 'Unclear', variant: 'muted' },
  CONTROLLER_GROUP: { label: 'Controller', variant: 'flow' },
};
