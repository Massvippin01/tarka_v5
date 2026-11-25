import type { FreezeAction } from '../../selectors/caseSelectors';
import { formatInr } from '../../lib/formatInr';
import { upiHandleOf } from '../../lib/upiHandles';

export type NoticeStatus = 'SENT' | 'ACKNOWLEDGED' | 'FROZEN' | 'RELEASED' | 'REFUSED';

export interface FreezeNotice {
  id: string;
  bank: string;
  ifscPrefix: string;
  sections: string[];
  accountIds: string[];
  referenceNo: string;
  status: NoticeStatus;
  sentAt: string;
  acknowledgedAt: string | null;
  frozenAt: string | null;
  releasedAt?: string | null;
  refusedAt: string | null;
  /** Amount the bank reported holding (may be less than asked); null = the amounts asked for. */
  frozenInr?: number | null;
  note?: string | null;
  reminders?: string[];
  networkId?: string | null;
}

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface BankKey {
  key: string;
  label: string;
  /** false when only the UPI handle is known: the notice goes out with an honest "bank not known". */
  known: boolean;
}

/**
 * Which bank a notice goes to. IFSC when the data has a valid one; otherwise the UPI handle (e.g. @ybl),
 * labelled "bank not known" because a handle can belong to several banks. Never guesses a bank name.
 */
export function bankKeyOf(r: { ifsc: string; bank: string; holderName: string; accountMasked: string }): BankKey {
  const ifsc = (r.ifsc || '').trim().toUpperCase();
  if (IFSC.test(ifsc)) return { key: ifsc.slice(0, 4), label: r.bank || `Bank code ${ifsc.slice(0, 4)}`, known: true };
  const handle = upiHandleOf(r.holderName) ?? upiHandleOf(r.accountMasked);
  if (handle?.bank) return { key: `@${handle.handle}`.slice(0, 11), label: handle.bank, known: true };
  if (handle) {
    const h = `@${handle.handle}`;
    return { key: h.slice(0, 11), label: `UPI handle ${h} (bank not known)`, known: false };
  }
  if (r.bank) return { key: r.bank.trim().slice(0, 11).toUpperCase(), label: r.bank, known: true };
  return { key: 'UNKNOWN', label: 'Bank not known', known: false };
}

export interface QueueRow extends FreezeAction {
  /** §106 = police lien on a merchant's tainted credit; §107 = court attachment of a mule balance. */
  section: '106' | '107';
  /** Still to secure: 0 once a bank has confirmed the freeze. */
  recoverableInr: number;
  status: NoticeStatus | 'NOT_SENT';
  notice: FreezeNotice | null;
}

const STATUS_ORDER: Record<QueueRow['status'], number> = { NOT_SENT: 0, REFUSED: 1, SENT: 2, ACKNOWLEDGED: 3, FROZEN: 4, RELEASED: 5 };

/**
 * Accounts holding the victim's money, most urgent first.
 * Inside the golden hour, anything not yet confirmed frozen outranks what is, and
 * not-yet-sent / refused accounts come before ones already waiting on a bank.
 * Then by amount still recoverable. After the golden hour, amount alone decides.
 * shortcut: golden-hour time is case-level in the bundle; rank per account once accounts carry their own clock.
 */
export function rankFreezeQueue(freezes: FreezeAction[], notices: FreezeNotice[], goldenHourMins: number): QueueRow[] {
  const latest = new Map<string, FreezeNotice>();
  for (const n of [...notices].sort((a, b) => a.sentAt.localeCompare(b.sentAt))) {
    for (const id of n.accountIds) latest.set(id, n);
  }
  const rows: QueueRow[] = freezes
    .filter((f) => f.kind !== 'CASHOUT_REQUISITION' && f.amountInr > 0)
    .map((f) => {
      const notice = latest.get(f.nodeId) ?? null;
      const status = notice?.status ?? 'NOT_SENT';
      return { ...f, section: f.kind === 'MERCHANT_LIEN' ? '106' : '107', recoverableInr: status === 'FROZEN' || status === 'RELEASED' ? 0 : f.amountInr, status, notice };
    });
  const live = goldenHourMins > 0;
  return rows.sort((a, b) => {
    if (live) {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
    }
    return b.recoverableInr - a.recoverableInr || b.amountInr - a.amountInr || a.nodeId.localeCompare(b.nodeId);
  });
}

/**
 * What a bank confirmed holding for this account. When the bank reported one amount for the whole notice,
 * it is split across the notice's accounts in proportion to what was asked of each.
 */
export function rowFrozenInr(r: QueueRow, all: QueueRow[]): number {
  if (r.status !== 'FROZEN' || !r.notice) return 0;
  const reported = r.notice.frozenInr;
  if (reported == null) return r.amountInr;
  const asked = all.filter((x) => r.notice!.accountIds.includes(x.nodeId)).reduce((s, x) => s + x.amountInr, 0);
  return asked > 0 ? (reported * r.amountInr) / asked : 0;
}

/** accountId -> amount for every account a bank has confirmed frozen. Feeds selectCaseActionFinancials. */
export function selectNoticeFrozen(freezes: FreezeAction[], notices: FreezeNotice[]): Map<string, number> {
  const rows = rankFreezeQueue(freezes, notices, 0);
  return new Map(rows.filter((r) => r.status === 'FROZEN').map((r) => [r.nodeId, rowFrozenInr(r, rows)]));
}

export interface BankGroup {
  key: string;
  bank: string;
  ifscPrefix: string;
  sections: ('106' | '107')[];
  rows: QueueRow[];
  totalInr: number;
  /** false = only the UPI handle is known; the nodal officer must be found via NPCI. */
  known: boolean;
}

/** One notice per bank: rows grouped by IFSC bank code, else by UPI handle ("bank not known"); biggest amount first. */
export function groupByBank(rows: QueueRow[]): BankGroup[] {
  const groups = new Map<string, BankGroup>();
  for (const r of rows) {
    const bk = bankKeyOf(r);
    const ifscPrefix = bk.key;
    const g = groups.get(ifscPrefix) ?? { key: ifscPrefix, bank: bk.label, ifscPrefix, sections: [], rows: [], totalInr: 0, known: bk.known };
    g.rows.push(r);
    g.totalInr += r.amountInr;
    if (!g.sections.includes(r.section)) g.sections.push(r.section);
    groups.set(ifscPrefix, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, sections: [...g.sections].sort() }))
    .sort((a, b) => b.totalInr - a.totalInr || a.key.localeCompare(b.key));
}

export interface NoticeCaseContext {
  caseId: string;
  firNumber: string;
  policeStation: string;
  officer: string;
  complainantName: string;
  complainantAccount: string;
}

export function noticeReference(ctx: NoticeCaseContext, g: BankGroup, issuedAt: Date): string {
  const d = issuedAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `${ctx.caseId}/BNSS-${g.sections.join('-')}/${g.ifscPrefix}/${d}`;
}

/** Plain-text notice for one bank, ready to print or download. */
export function buildBankNotice(ctx: NoticeCaseContext, g: BankGroup, referenceNo: string, issuedAt: Date): string {
  const secLine = g.sections.map((s) => (s === '106' ? 'Section 106(1)' : 'Section 107')).join(' and ');
  const lines = g.rows.map(
    (r, i) =>
      `${i + 1}. ${r.holderName} | A/c ${r.accountMasked}${r.ifsc ? ` | IFSC ${r.ifsc}` : ''} | ${
        r.section === '106' ? 'Specific debit lien (do not freeze the whole account)' : 'Debit freeze'
      }: ${formatInr(r.amountInr)}`
  );
  return `NOTICE TO FREEZE PROCEEDS OF CRIME
[Under ${secLine} of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023]

Ref: ${referenceNo}
Date: ${issuedAt.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
From: ${ctx.officer}, ${ctx.policeStation}
To: ${g.known ? `The Nodal Officer, ${g.bank} (IFSC code ${g.ifscPrefix}…)` : `The Nodal Officer of the bank operating ${g.bank} — bank to be confirmed through NPCI before dispatch`}

Case: ${ctx.firNumber}
Victim: ${ctx.complainantName} | Account: ${ctx.complainantAccount}

You are directed to immediately place the following holds and confirm compliance to this office:
${lines.join('\n')}

Total to hold at ${g.bank}: ${formatInr(g.totalInr)}

Please acknowledge receipt at once and report the amount actually held within 2 hours, as per the MHA golden-hour SOP.
${g.sections.includes('106') ? 'A report of the §106 lien will be sent forthwith to the jurisdictional Magistrate.\n' : ''}${g.sections.includes('107') ? 'An application for attachment under §107 is being filed before the jurisdictional Magistrate.\n' : ''}
Investigating Officer
${ctx.officer}, ${ctx.policeStation}`;
}
