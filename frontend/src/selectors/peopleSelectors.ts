/**
 * People & Accounts page: one row per party, grouped by role, from GET /cases/{id}/networks
 * (the backend's mule score is the only score shown anywhere). Demo cases without uploaded
 * statements fall back to the fixture accounts via selectAccountFlows (no score: none was computed).
 * Pure functions, no I/O.
 */
import type { CanonicalCaseFixture } from '../fixtures/cases';
import type { NetworksResponse, MemberRole } from '../v6/triage/triage';
import { selectAccountFlows } from './caseSelectors';

export type Verdict = 'CONFIRMED_MULE' | 'NOT_MULE';
export type PairVerdict = 'MERGE' | 'NOT_SAME';
export type RoleGroup = Exclude<MemberRole, 'CONTROLLER_GROUP'>; // VICTIM | MULE | CASH_OUT | UNKNOWN

export const ROLE_GROUPS: { role: RoleGroup; label: string; help: string }[] = [
  { role: 'MULE', label: 'Mules', help: 'Accounts that received victims’ money and passed most of it on quickly.' },
  { role: 'VICTIM', label: 'Victims', help: 'Accounts that paid money into a suspected mule account.' },
  { role: 'CASH_OUT', label: 'Cash-out', help: 'Where money left the banking system: ATM, cash, crypto, gold, POS.' },
  { role: 'UNKNOWN', label: 'Unclear', help: 'Linked to the money flow, but no pattern decides their role yet.' },
];

export interface Identifiers {
  upi: string | null;
  phone: string | null;
  account: string | null;
  ifsc: string | null;
}

export interface PersonRow {
  /** Party key: lower(trim(label)), same as the backend and the ?acct= URL param. */
  key: string;
  label: string;
  role: RoleGroup;
  ids: Identifiers;
  /** Backend mule score 0–1; null when no statements were scored (demo fixture). */
  muleScore: number | null;
  why: string;
  networks: string[];
  /** Other cases (FIRs) where one of this party's identifiers also appears. */
  otherCases: string[];
  inInr: number;
  outInr: number;
  /** Still in the account: what a freeze can catch (0 for a "Not a mule" verdict). */
  heldInr: number;
  freezeValueInr?: number;
  retentionLikelihood?: number;
  hoursSinceLastOutflow?: number;
  controllerId?: string | null;
  controllerSummary?: string | null;
  firstTs: number | null;
  lastTs: number | null;
  hop: number | null;
  verdict: Verdict | null;
}

export interface ReviewPair {
  key: string;
  a: string;
  b: string;
  why: string;
  confidence: number;
  verdict: PairVerdict | null;
  /** False on demo cases: the backend has no queue to save into. */
  savable: boolean;
}

export const partyKey = (label: string) => label.trim().toLowerCase();

const VPA_RE = /[a-z0-9._-]{2,}@[a-z][a-z0-9]{1,}/i;
const IFSC_RE = /\b[A-Z]{4}0[A-Z0-9]{6}\b/;
const PHONE_RE = /(?:\+?91[\s-]?)?\b([6-9]\d{9})\b/;
const ACCOUNT_RE = /\b\d{9,18}\b/;

/** Identifiers readable from a party label (a VPA's handle may itself be a phone number). */
export function extractIdentifiers(label: string): Identifiers {
  const upi = label.match(VPA_RE)?.[0].toLowerCase() ?? null;
  const ifsc = label.match(IFSC_RE)?.[0] ?? null;
  const phone = label.match(PHONE_RE)?.[1] ?? null;
  const rest = phone ? label.replace(phone, '') : label;
  const account = rest.match(ACCOUNT_RE)?.[0] ?? null;
  return { upi, phone, account, ifsc };
}

/** Rows from the networks response; a party in several networks (e.g. a shared ATM) is one row. */
export function peopleFromNetworks(res: NetworksResponse | null | undefined): PersonRow[] {
  if (!res) return [];
  const byKey = new Map<string, PersonRow>();
  for (const n of res.networks) {
    for (const m of n.members) {
      if (m.role === 'CONTROLLER_GROUP') continue;
      const role: RoleGroup = m.role;
      const key = partyKey(m.id || m.label);
      const seen = byKey.get(key);
      if (seen) {
        if (!seen.networks.includes(n.network_id)) seen.networks.push(n.network_id);
        continue;
      }
      byKey.set(key, {
        key,
        label: m.label,
        role,
        ids: extractIdentifiers(m.label),
        muleScore: m.mule_score,
        why: m.why,
        networks: [n.network_id],
        otherCases: [],
        inInr: m.in_inr ?? 0,
        outInr: m.out_inr ?? 0,
        heldInr: m.held_inr ?? 0,
        freezeValueInr: m.freeze_value_inr,
        retentionLikelihood: m.retention_likelihood,
        hoursSinceLastOutflow: m.hours_since_last_outflow,
        controllerId: m.controller_id ?? null,
        controllerSummary: m.controller_summary ?? null,
        firstTs: m.first_ts ?? null,
        lastTs: m.last_ts ?? null,
        hop: m.hop,
        verdict: (m.verdict as Verdict | undefined) ?? null,
      });
    }
  }
  const rows = [...byKey.values()];
  // Cross-case hits are keyed by identifier (VPA / phone / account) found inside a label.
  for (const h of res.cross_case_hits ?? []) {
    const id = h.identifier.toLowerCase();
    for (const r of rows) if (r.key.includes(id)) r.otherCases = [...new Set([...r.otherCases, ...h.case_ids])].sort();
  }
  return rows;
}

const FIXTURE_ROLE: Record<string, RoleGroup> = {
  VICTIM: 'VICTIM',
  MULE: 'MULE',
  CONDUIT: 'MULE',
  SINK: 'CASH_OUT',
};

/** Demo fixture accounts (no uploaded statements): roles and money from the one selector module. */
export function peopleFromFixture(c: CanonicalCaseFixture): PersonRow[] {
  return selectAccountFlows(c).map((a) => {
    const fromLabel = extractIdentifiers(`${a.holderName} ${a.accountNumber}`);
    return {
      key: partyKey(a.holderName),
      label: a.holderName,
      role: FIXTURE_ROLE[a.role] ?? 'UNKNOWN',
      ids: { ...fromLabel, account: a.accountNumber || fromLabel.account, ifsc: a.ifsc || fromLabel.ifsc },
      muleScore: null,
      why: a.roleLabel,
      networks: [],
      otherCases: [],
      inInr: a.inflowInr,
      outInr: a.outflowInr,
      heldInr: a.heldInr,
      firstTs: null,
      lastTs: null,
      hop: null,
      verdict: null,
    };
  });
}

/** Demo fixture: accounts that share a handset (IMEI) or Wi-Fi hotspot are probably one person (from Devices). */
export function reviewFromFixture(c: CanonicalCaseFixture): ReviewPair[] {
  const out: ReviewPair[] = [];
  const accts = c.accounts;
  for (let i = 0; i < accts.length; i++) {
    for (let j = i + 1; j < accts.length; j++) {
      const [x, y] = [accts[i], accts[j]];
      const why = x.deviceImei && x.deviceImei === y.deviceImei
        ? `they used the same phone handset (IMEI ${x.deviceImei})`
        : x.bssidHotspot && x.bssidHotspot === y.bssidHotspot
          ? `they logged in from the same Wi-Fi hotspot (${x.bssidHotspot})`
          : null;
      if (why) out.push({ key: [partyKey(x.holderName), partyKey(y.holderName)].sort().join('|'), a: x.holderName, b: y.holderName, why, confidence: 0.8, verdict: null, savable: false });
    }
  }
  return out;
}

export function reviewFromNetworks(res: NetworksResponse | null | undefined): ReviewPair[] {
  return (res?.review_queue ?? []).map((r) => ({
    key: r.key ?? [partyKey(r.a), partyKey(r.b)].sort().join('|'),
    a: r.a,
    b: r.b,
    // Backend says "both contain the same vpa x"; say it the investigator's way.
    why: r.why.replace(/^both contain the same (\w+)/, (_m, k: string) => `they share the same ${k === 'vpa' ? 'UPI ID' : k}`),
    confidence: r.confidence,
    verdict: (r.verdict as PairVerdict | undefined) ?? null,
    savable: true,
  }));
}

/** Undecided pairs first, then by confidence. */
export function sortReview(pairs: ReviewPair[]): ReviewPair[] {
  return [...pairs].sort((p, q) => Number(!!p.verdict) - Number(!!q.verdict) || q.confidence - p.confidence);
}

export interface PeopleFilter {
  role: RoleGroup | 'ALL';
  query: string;
  networkId: string | null;
}

export function filterPeople(rows: PersonRow[], f: PeopleFilter): PersonRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.role === 'ALL' || r.role === f.role) &&
      (!f.networkId || r.networks.includes(f.networkId)) &&
      (!q || r.key.includes(q) || Object.values(r.ids).some((v) => v?.toLowerCase().includes(q))),
  );
}

/** Mules first by score, then everyone else; stable by label. */
export function sortPeople(rows: PersonRow[]): PersonRow[] {
  const order: Record<RoleGroup, number> = { MULE: 0, CASH_OUT: 1, UNKNOWN: 2, VICTIM: 3 };
  return [...rows].sort((a, b) => order[a.role] - order[b.role] || (b.muleScore ?? 0) - (a.muleScore ?? 0) || a.label.localeCompare(b.label));
}

export function roleCounts(rows: PersonRow[]): Record<RoleGroup | 'ALL', number> {
  const c: Record<RoleGroup | 'ALL', number> = { ALL: rows.length, MULE: 0, VICTIM: 0, CASH_OUT: 0, UNKNOWN: 0 };
  for (const r of rows) c[r.role] += 1;
  return c;
}

/** "1 mule", "20 mules". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/** Score as investigators read it, with the band that drives colour. */
export function scoreBand(score: number | null): { text: string; band: 'high' | 'mid' | 'low' | 'none' } {
  if (score === null) return { text: '—', band: 'none' };
  const pct = Math.round(score * 100);
  return { text: `${pct}%`, band: score >= 0.7 ? 'high' : score >= 0.4 ? 'mid' : 'low' };
}
