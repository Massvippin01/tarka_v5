/** Pure helpers for bulk intake: combined upload progress, the review board headline, selection and the create-cases payload. No I/O. */
import type { FraudNetwork } from '../triage/triage';
import type { CardState, Processing } from '../upload/uploadPlanner';

export type ProposalAction = NonNullable<FraudNetwork['proposal']>['action'];

export interface CreateCasesRequest {
  network_ids: string[];
  titles?: Record<string, string>;
}
export interface CreateCasesResponse {
  created: { network_id: string; case_id: string; title: string; rows_copied: number }[];
  attached: { network_id: string; case_id: string; rows_copied: number }[];
  failed: { network_id: string; reason: string }[];
}
export interface IntakeStartResponse {
  project_id: string;
  case_id: string;
  name: string;
}

/* ---------- combined upload + processing progress ---------- */

const FINISHED: CardState[] = ['ready', 'attention', 'rejected'];

export interface ProgressItem {
  state: CardState;
  size: number;
  bytesSent: number;
  speedBps: number;
  status?: { processing?: Processing | null; analytics_summary?: Record<string, any> };
}

/** Where one file is in the pipeline, as shown in its step chips. */
export type FileStep = 'upload' | 'check' | 'waiting' | 'read' | 'networks' | 'ready' | 'attention' | 'rejected';
export const STEPS: { key: FileStep; label: string }[] = [
  { key: 'upload', label: 'Uploading' },
  { key: 'check', label: 'Checking' },
  { key: 'read', label: 'Reading rows' },
  { key: 'networks', label: 'Finding gangs' },
  { key: 'ready', label: 'Ready' },
];

export function fileStep(i: ProgressItem): FileStep {
  if (i.state === 'ready' || i.state === 'attention' || i.state === 'rejected') return i.state;
  if (i.state === 'queued' || i.state === 'uploading' || i.state === 'paused') return 'upload';
  switch (i.status?.processing?.step) {
    case 'WAITING':
      return 'waiting';
    case 'READING_ROWS':
      return 'read';
    case 'FINDING_NETWORKS':
      return 'networks';
    case 'DONE':
      return 'ready';
    default:
      return 'check';
  }
}

/** Rows read so far (live while reading, the accepted count once done). */
export function fileRows(i: ProgressItem): number {
  const p = i.status?.processing?.rows;
  if (typeof p === 'number') return p;
  const s = i.status?.analytics_summary ?? {};
  return typeof s.rows_accepted === 'number' ? s.rows_accepted : 0;
}

// shortcut: fallback speeds from a 1M-row / 74 MB run on a dev laptop (read ≈ 9 MB/s, find gangs ≈ 15 MB/s);
// the live read speed replaces the first as soon as any file reports one. Upgrade if servers differ a lot.
export const DEFAULT_READ_BPS = 9_000_000;
export const NETWORK_BPS = 15_000_000;

/** Read speed in file bytes per second, from whichever file is being read now. */
export function liveReadBps(items: ProgressItem[]): number {
  for (const i of items) {
    const p = i.status?.processing;
    if (p?.step === 'READING_ROWS' && p.bytes_done && p.elapsed_seconds && p.elapsed_seconds > 0) return p.bytes_done / p.elapsed_seconds;
  }
  return DEFAULT_READ_BPS;
}

/** Seconds of server processing still ahead for one file (reading rows + finding gangs). */
export function processingLeft(i: ProgressItem, readBps: number): number {
  const step = fileStep(i);
  const nets = i.size / NETWORK_BPS;
  if (step === 'ready' || step === 'attention' || step === 'rejected') return 0;
  if (step === 'networks') return nets;
  const p = i.status?.processing;
  if (step === 'read' && typeof p?.eta_seconds === 'number') return p.eta_seconds + nets;
  return i.size / readBps + nets; // not started: scale the live speed by file size
}

export interface OverallProgress {
  files: number;
  finished: number;
  ready: number;
  bytes: number;
  sent: number;
  rows: number;
  /** Seconds until every file is ready; null when nothing is left or the upload speed is unknown. */
  etaSeconds: number | null;
  /** Every file has stopped moving (ready, needs attention or rejected). */
  allDone: boolean;
}

/**
 * Files in one case are read one at a time, so processing time adds up across files. Upload time left is the bytes
 * still to send over the combined upload speed. shortcut: the two are summed (upper bound, ignores reading that
 * overlaps uploading); fine because reading is far faster than upload links in the field.
 */
export function overallProgress(items: ProgressItem[]): OverallProgress {
  const bytes = items.reduce((s, i) => s + i.size, 0);
  const sent = items.reduce((s, i) => s + Math.min(i.bytesSent, i.size), 0);
  const upSpeed = items.filter((i) => i.state === 'uploading').reduce((s, i) => s + i.speedBps, 0);
  const finished = items.filter((i) => FINISHED.includes(i.state)).length;
  const readBps = liveReadBps(items);
  const procLeft = items.reduce((s, i) => s + processingLeft(i, readBps), 0);
  const upLeft = sent < bytes ? (upSpeed > 0 ? (bytes - sent) / upSpeed : null) : 0;
  const total = upLeft === null ? null : upLeft + procLeft;
  return {
    files: items.length,
    finished,
    ready: items.filter((i) => fileStep(i) === 'ready').length,
    bytes,
    sent,
    rows: items.reduce((s, i) => s + fileRows(i), 0),
    etaSeconds: total && total > 0 ? total : null,
    allDone: items.length > 0 && finished === items.length,
  };
}

/* ---------- review board ---------- */

/** A network still waiting for the officer: it has a proposal and nobody opened, merged or dismissed it yet. */
export const isOpenProposal = (n: FraudNetwork) =>
  !!n.proposal && (!n.triage || n.triage.status === 'NEW' || n.triage.status === 'UNDER_REVIEW');

export const openProposals = (networks: FraudNetwork[]) => networks.filter(isOpenProposal);

export interface IntakeCounts {
  files: number;
  gangs: number;
  newCases: number;
  attach: number;
  minor: number;
  /** Proposed gangs already created, added or dismissed. */
  handled?: number;
}

export function intakeCounts(files: number, networks: FraudNetwork[]): IntakeCounts {
  const open = openProposals(networks);
  const by = (a: ProposalAction) => open.filter((n) => n.proposal!.action === a).length;
  return { files, gangs: open.length, newCases: by('NEW_CASE'), attach: by('ATTACH'), minor: by('MINOR'), handled: networks.filter((x) => x.proposal).length - open.length };
}

const n = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-IN')} ${count === 1 ? one : many}`;

/** "5 files · 12 gangs found · 7 new cases · 3 match existing cases · 2 minor" (zero parts after the gang count are left out). */
export function intakeHeadline(c: IntakeCounts): string {
  if (!c.gangs && c.handled) return `${n(c.files, 'file')} · all ${n(c.handled, 'gang')} filed`;
  const parts = [n(c.files, 'file'), `${n(c.gangs, 'gang')} found`];
  if (c.newCases) parts.push(n(c.newCases, 'new case'));
  if (c.attach) parts.push(`${c.attach.toLocaleString('en-IN')} ${c.attach === 1 ? 'matches an existing case' : 'match existing cases'}`);
  if (c.minor) parts.push(`${c.minor.toLocaleString('en-IN')} minor`);
  return parts.join(' · ');
}

/** "Intake — review 12 proposed cases" while a holding case still has open proposals; null once it is done. */
export function intakeLabel(networks: FraudNetwork[]): string | null {
  const k = openProposals(networks).length;
  return k ? `Intake — review ${n(k, 'proposed case')}` : null;
}

/* ---------- selection ---------- */

export function toggleId(sel: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(sel);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Header checkbox: select every open row, or clear when all are already selected. */
export function toggleAll(sel: ReadonlySet<string>, ids: string[]): Set<string> {
  return ids.length > 0 && ids.every((id) => sel.has(id)) ? new Set() : new Set(ids);
}

/** Drop selected ids that are no longer open rows (after a create or a refetch). */
export const pruneSelection = (sel: ReadonlySet<string>, ids: string[]) => new Set(ids.filter((id) => sel.has(id)));

/* ---------- request payload ---------- */

/**
 * Body for POST …/networks/create-cases. Only titles the officer actually changed are sent; blank edits fall back
 * to TARKA's suggestion. Ids that are not open proposals are dropped so nothing is created twice.
 */
export function buildCreateRequest(ids: Iterable<string>, edits: Record<string, string>, networks: FraudNetwork[]): CreateCasesRequest {
  const open = new Map(openProposals(networks).map((nw) => [nw.network_id, nw]));
  const network_ids = [...new Set(ids)].filter((id) => open.has(id));
  const titles: Record<string, string> = {};
  for (const id of network_ids) {
    const t = edits[id]?.trim();
    if (t && t !== open.get(id)!.proposal!.suggested_title) titles[id] = t;
  }
  return Object.keys(titles).length ? { network_ids, titles } : { network_ids };
}
