/**
 * Pure selectors for the Actions & Report page: what is in scope for the URL focus, how urgent each freeze is,
 * which bank gets the notice, overall progress and what is still missing before the case is court ready.
 * No I/O. Money comes from the case bundle (freeze rows) and the server's per-network split; nothing is invented here.
 */
import type { FraudNetwork } from '../triage/triage';
import type { NetworkMoney, NetworkTriage } from '../network/networkFocus';
import { partyKey } from '../../selectors/peopleSelectors';
import { bankKeyOf, rowFrozenInr, type BankKey, type FreezeNotice, type QueueRow } from './freezeQueue';

export { bankKeyOf, type BankKey };

export type ActionNetwork = FraudNetwork & NetworkMoney & { triage?: NetworkTriage };
export type ScopeLevel = 'project' | 'network' | 'account';

export interface ActionScope {
  level: ScopeLevel;
  network: ActionNetwork | null;
  /** partyKey of the focused account. */
  account: string | null;
  /** Networks the scope covers. */
  networks: ActionNetwork[];
  /** partyKeys of accounts in scope; null = the whole case. */
  keys: Set<string> | null;
}

/** Resolve the URL focus (?net= / ?acct=) against the loaded networks; unknown ids fall back a level. */
export function resolveActionScope(networks: ActionNetwork[], focus: { networkId: string | null; account: string | null }): ActionScope {
  const acct = focus.account ? partyKey(focus.account) : null;
  const memberKeys = (n: ActionNetwork) => n.members.flatMap((m) => [partyKey(m.id), partyKey(m.label)]);
  const network =
    networks.find((n) => n.network_id === focus.networkId) ??
    (acct ? networks.find((n) => memberKeys(n).includes(acct)) : undefined) ??
    null;
  if (acct && (!network || memberKeys(network).includes(acct))) {
    return { level: 'account', network, account: acct, networks: network ? [network] : [], keys: new Set([acct]) };
  }
  if (network) return { level: 'network', network, account: null, networks: [network], keys: new Set(memberKeys(network)) };
  return { level: 'project', network: null, account: null, networks, keys: null };
}

export const inScope = (scope: ActionScope, holderName: string) => !scope.keys || scope.keys.has(partyKey(holderName));

/* ---------- urgency ---------- */

/** A bank should acknowledge a freeze notice within 2 h (MHA golden-hour SOP) and confirm the hold within a day. */
export const ACK_SLA_MS = 2 * 3600_000;
export const OUTCOME_SLA_MS = 24 * 3600_000;

export type Overdue = 'ack' | 'outcome' | null;

export function noticeOverdue(n: FreezeNotice, nowMs: number): Overdue {
  if (n.status === 'SENT' && nowMs - Date.parse(n.sentAt) > ACK_SLA_MS) return 'ack';
  if (n.status === 'ACKNOWLEDGED' && n.acknowledgedAt && nowMs - Date.parse(n.acknowledgedAt) > OUTCOME_SLA_MS) return 'outcome';
  return null;
}

const STATUS_WEIGHT: Record<QueueRow['status'], number> = { NOT_SENT: 1, REFUSED: 0.9, SENT: 0.5, ACKNOWLEDGED: 0.3, FROZEN: 0 };

export interface RankedRow extends QueueRow {
  bankKey: BankKey;
  networkId: string | null;
  /** 0..1: how pressing this account is, apart from its amount. */
  urgency: number;
  /** recoverable ₹ × urgency: the sort key. */
  score: number;
  why: string;
}

/**
 * Freeze rows for the scope, ranked by recoverable ₹ × urgency.
 * Urgency = where the notice stands (not sent > refused > overdue > waiting > acknowledged > frozen)
 *         × freshness (1 / (1 + days between this account's last movement and the newest movement in scope)):
 * a mule that moved money recently is likelier to empty out next.
 */
export function rankActionQueue(rows: QueueRow[], scope: ActionScope, nowMs: number): RankedRow[] {
  const member = new Map<string, { net: string; lastTs: number | null }>();
  for (const n of scope.networks)
    for (const m of n.members) {
      const v = { net: n.network_id, lastTs: m.last_ts ?? null };
      member.set(partyKey(m.label), v);
      member.set(partyKey(m.id), v);
    }
  const scoped = rows.filter((r) => inScope(scope, r.holderName));
  const newest = Math.max(0, ...scoped.map((r) => member.get(partyKey(r.holderName))?.lastTs ?? 0));
  return scoped
    .map((r) => {
      const m = member.get(partyKey(r.holderName));
      const overdue = r.notice ? noticeOverdue(r.notice, nowMs) : null;
      const statusW = overdue ? Math.min(0.8, STATUS_WEIGHT[r.status] + 0.3) : STATUS_WEIGHT[r.status];
      const staleDays = m?.lastTs && newest ? Math.max(0, (newest - m.lastTs) / 86400) : 0;
      const fresh = 1 / (1 + staleDays);
      const urgency = statusW * fresh;
      const stand =
        r.status === 'NOT_SENT' ? 'No notice sent yet' : r.status === 'REFUSED' ? 'Bank refused: re-issue or escalate'
        : overdue === 'ack' ? 'Bank has not acknowledged in 2 h' : overdue === 'outcome' ? 'Bank has not confirmed the hold in 24 h'
        : r.status === 'SENT' ? 'Waiting for the bank' : r.status === 'ACKNOWLEDGED' ? 'Bank acknowledged' : 'Frozen';
      const activity = m?.lastTs ? (staleDays < 0.05 ? 'moved money most recently' : `last moved money ${staleDays.toFixed(1)} days before the newest movement`) : 'no activity time in the data';
      return { ...r, bankKey: bankKeyOf(r), networkId: m?.net ?? null, urgency, score: r.recoverableInr * urgency, why: `${stand}; ${activity}.` };
    })
    .sort((a, b) => b.score - a.score || b.recoverableInr - a.recoverableInr || a.nodeId.localeCompare(b.nodeId));
}

/* ---------- progress ---------- */

const DECIDED: NetworkTriage['status'][] = ['CASE_OPENED', 'FREEZES_SENT', 'CLOSED'];
export const isDecided = (n: ActionNetwork) => !!n.triage && (DECIDED.includes(n.triage.status) || !!n.triage.decision);

export interface ActionProgress {
  /** Sum of freeze amounts already put to a bank (any notice status). */
  requestedInr: number;
  /** What banks confirmed holding (bank-reported amount when given). */
  frozenInr: number;
  refusedInr: number;
  /** Freezable money with no notice yet. */
  notSentInr: number;
  networksDecided: number;
  networksTotal: number;
}

export function actionProgress(rows: RankedRow[], scope: ActionScope): ActionProgress {
  const p: ActionProgress = { requestedInr: 0, frozenInr: 0, refusedInr: 0, notSentInr: 0, networksDecided: 0, networksTotal: scope.networks.length };
  for (const r of rows) {
    if (r.status === 'NOT_SENT') p.notSentInr += r.amountInr;
    else p.requestedInr += r.amountInr;
    if (r.status === 'REFUSED') p.refusedInr += r.amountInr;
    p.frozenInr += rowFrozenInr(r, rows);
  }
  p.networksDecided = scope.networks.filter(isDecided).length;
  return p;
}

/** Notices that touch an account in scope, newest first. */
export const scopeNotices = (notices: FreezeNotice[], rows: RankedRow[], scope: ActionScope): FreezeNotice[] => {
  if (!scope.keys) return [...notices].reverse();
  const ids = new Set(rows.map((r) => r.nodeId));
  return notices.filter((n) => n.accountIds.some((id) => ids.has(id))).reverse();
};

/* ---------- court readiness ---------- */

export interface ChecklistItem {
  id: 'evidence' | 'decided' | 'notices' | 'acks' | 'outcomes' | 'refused' | 'money';
  ok: boolean;
  /** Plain-English line, e.g. "2 bank acknowledgements pending". */
  text: string;
  hint: string;
  /** Screen that fixes it. */
  view?: 'evidence' | 'network' | 'money';
}

export interface EvidenceState {
  files: number;
  fingerprinted: number;
}

export interface MoneySplit {
  paidIn: number;
  recoverable: number;
  cashedOut: number;
  unaccounted: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

export function courtChecklist(
  rows: RankedRow[],
  notices: FreezeNotice[],
  scope: ActionScope,
  evidence: EvidenceState,
  money: MoneySplit,
  fmt: (inr: number) => string,
  nowMs: number,
): ChecklistItem[] {
  const count = (s: FreezeNotice['status']) => notices.filter((n) => n.status === s);
  const sent = count('SENT');
  const acked = count('ACKNOWLEDGED');
  const refused = count('REFUSED');
  const lateAcks = sent.filter((n) => noticeOverdue(n, nowMs)).length;
  const notSent = rows.filter((r) => r.status === 'NOT_SENT');
  const undecided = scope.networks.filter((n) => !isDecided(n)).length;
  const gap = money.paidIn - money.recoverable - money.cashedOut - money.unaccounted;
  const items: ChecklistItem[] = [
    {
      id: 'evidence',
      ok: evidence.files > 0 && evidence.fingerprinted >= evidence.files,
      text: evidence.files === 0 ? 'No evidence files uploaded' : evidence.fingerprinted >= evidence.files ? `${plural(evidence.files, 'evidence file')} fingerprinted (SHA-256)` : `${plural(evidence.files - evidence.fingerprinted, 'file')} without a fingerprint`,
      hint: 'Each file needs a SHA-256 fingerprint and a custody trail for the BSA §63(4) certificate.',
      view: 'evidence',
    },
    {
      id: 'decided',
      ok: undecided === 0,
      text: undecided === 0 ? (scope.networks.length ? 'Every network has a decision' : 'No networks to decide') : `${plural(undecided, 'network')} still waiting for a decision`,
      hint: 'Open the network and choose: investigate, make a case, merge into an FIR, or dismiss.',
      view: 'network',
    },
    {
      id: 'notices',
      ok: notSent.length === 0,
      text: notSent.length === 0 ? 'Every account holding money has a freeze notice' : `${plural(notSent.length, 'account')} holding ${fmt(notSent.reduce((s, r) => s + r.amountInr, 0))} with no freeze notice`,
      hint: 'Select them in the freeze queue and prepare one notice per bank.',
    },
    {
      id: 'acks',
      ok: sent.length === 0,
      text: sent.length === 0 ? 'No bank acknowledgement pending' : `${plural(sent.length, 'bank acknowledgement')} pending${lateAcks ? ` (${lateAcks} overdue)` : ''}`,
      hint: 'Banks should acknowledge within 2 hours. Send a reminder from the notice list.',
    },
    {
      id: 'outcomes',
      ok: acked.length === 0,
      text: acked.length === 0 ? 'No bank still has to confirm a hold' : `${plural(acked.length, 'bank')} acknowledged but not yet confirmed the hold`,
      hint: 'Record the amount the bank says it froze when its reply comes in.',
    },
    {
      id: 'refused',
      ok: refused.length === 0,
      text: refused.length === 0 ? 'No refusals' : `${plural(refused.length, 'bank')} refused, so re-issue or escalate`,
      hint: 'A refusal needs a fresh notice or an attachment order from the Magistrate (BNSS §107).',
    },
    {
      id: 'money',
      ok: money.unaccounted <= 0 && Math.abs(gap) < 1,
      text: Math.abs(gap) >= 1 ? `Money does not add up: ${fmt(Math.abs(gap))} gap` : money.unaccounted > 0 ? `${fmt(money.unaccounted)} paid in is not yet traced` : 'Every rupee is traced: recoverable + cashed out = paid in',
      hint: 'Recoverable + cashed out + not yet traced must equal what victims paid in.',
      view: 'money',
    },
  ];
  return items;
}

export const isCourtReady = (items: ChecklistItem[]) => items.every((i) => i.ok);
