import type { CanonicalCaseFixture } from '../fixtures/cases';

/** Plain-English lanes for the case timeline. Built only from the active case's own record. */
export type LaneId = 'contact' | 'money' | 'complaint' | 'police' | 'other';

export const LANES: { id: LaneId; label: string; tip: string }[] = [
  { id: 'contact', label: 'Contact with victim', tip: 'Calls, messages, apps or websites used to approach the victim.' },
  { id: 'money', label: 'Money moved', tip: 'Debits from the victim, transfers between mule accounts, and cash withdrawals.' },
  { id: 'complaint', label: 'Complaint', tip: 'When the complaint was filed (1930 helpline / NCRP portal).' },
  { id: 'police', label: 'Police action', tip: 'Freeze requests, notices and recoveries recorded for this case.' },
  { id: 'other', label: 'Other', tip: 'Events that did not fit the lanes above.' },
];

export interface LoomEvent {
  id: string;
  lane: LaneId;
  ts: number; // epoch ms
  title: string;
  detail: string;
  amount?: number;
  /** Severity keyword from the case record (FRAUD_DEBIT, CASHOUT, …) or the transaction category. */
  kind: string;
  source: string;
}

export interface LoomGap {
  id: 'contact-to-loss' | 'loss-to-complaint' | 'loss-to-cashout';
  label: string;
  tip: string;
  fromId: string;
  toId: string;
  ms: number;
}

export interface LoomView {
  events: LoomEvent[];
  lanes: { id: LaneId; label: string; tip: string; count: number }[];
  start: number;
  end: number;
  gaps: LoomGap[];
  /** Transactions dropped to keep the chart readable (uploaded cases can carry thousands). */
  hiddenTxns: number;
}

export const MAX_TXN_DOTS = 400;

const MONEY_KINDS = new Set(['FRAUD_DEBIT', 'LAYERING', 'ESCROW', 'CASHOUT']);

export function laneForTrack(track: string, severity: string): LaneId {
  if (severity === 'COMPLAINT' || /NCRP|1930|COMPLAINT/i.test(track)) return 'complaint';
  if (severity === 'RECOVERY' || /STATUTORY|FREEZE|NOTICE|POLICE/i.test(track)) return 'police';
  if (MONEY_KINDS.has(severity) || /CBS|FINACLE|NPCI|SWITCH|LAYERING|ESCROW|ATM|UPI|BANK/i.test(track)) return 'money';
  if (severity === 'ALERT' || /WHATSAPP|TELEGRAM|PHISH|TELCO|SIM|CALL|SMS|APK/i.test(track)) return 'contact';
  return 'other';
}

const isCashout = (e: LoomEvent) => e.kind === 'CASHOUT' || e.kind === 'ATM_CASHOUT';
const isLoss = (e: LoomEvent) => e.kind === 'FRAUD_DEBIT' || e.kind === 'VICTIM_DRAIN';

export function buildLoom(c: CanonicalCaseFixture): LoomView {
  const events: LoomEvent[] = c.timelineEvents
    .map((e) => ({
      id: e.eventId,
      lane: laneForTrack(e.track, e.severity),
      ts: Date.parse(e.timestampUtc),
      title: e.title,
      detail: e.detail,
      kind: e.severity,
      source: `Case timeline · ${e.eventId}`,
    }))
    .filter((e) => Number.isFinite(e.ts));

  // Curated timelines already narrate the money; uploaded cases only have transactions.
  const hasMoneyEvents = events.some((e) => e.lane === 'money');
  let hiddenTxns = 0;
  if (!hasMoneyEvents) {
    const txns = c.transactions
      .filter((t) => t.category !== 'SALARY_CREDIT' && Number.isFinite(Date.parse(t.timestampUtc)))
      .sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
    hiddenTxns = Math.max(0, txns.length - MAX_TXN_DOTS);
    for (const t of txns.slice(0, MAX_TXN_DOTS)) {
      events.push({
        id: t.id,
        lane: 'money',
        ts: Date.parse(t.timestampUtc),
        title: `${t.fromName || t.fromAccount} → ${t.toName || t.toAccount}`,
        detail: t.particulars || t.channel || t.paymentRail,
        amount: t.amount,
        kind: t.category,
        source: t.sourceFile ? `${t.sourceFile}${t.sourceRow ? ` · row ${t.sourceRow}` : ''}` : `Transaction ${t.rrn || t.id}`,
      });
    }
  }

  events.sort((a, b) => a.ts - b.ts);
  const first = (p: (e: LoomEvent) => boolean) => events.find(p);
  const contact = first((e) => e.lane === 'contact');
  const loss = first(isLoss) ?? first((e) => e.lane === 'money');
  const complaint = first((e) => e.lane === 'complaint');
  const cashout = first(isCashout);

  const gaps: LoomGap[] = [];
  const gap = (id: LoomGap['id'], label: string, tip: string, a?: LoomEvent, b?: LoomEvent) => {
    if (a && b && b.ts >= a.ts) gaps.push({ id, label, tip, fromId: a.id, toId: b.id, ms: b.ts - a.ts });
  };
  gap('contact-to-loss', 'First contact → first money lost', 'How long the fraudster worked on the victim before the first debit.', contact, loss);
  gap('loss-to-complaint', 'First money lost → complaint filed', 'Complaints filed within an hour of the loss (the "golden hour") have the best chance of a freeze.', loss, complaint);
  gap('loss-to-cashout', 'First money lost → cash withdrawn', 'How fast the money left the banking system. Freezes must land before this.', loss, cashout);

  return {
    events,
    lanes: LANES.map((l) => ({ ...l, count: events.filter((e) => e.lane === l.id).length })).filter((l) => l.count > 0),
    start: events[0]?.ts ?? 0,
    end: events[events.length - 1]?.ts ?? 0,
    gaps,
    hiddenTxns,
  };
}

/** "45 min", "3 h 10 min", "2 days 4 h". */
export function formatSpan(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) return mins % 60 ? `${h} h ${mins % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} days ${h % 24} h` : `${d} days`;
}
