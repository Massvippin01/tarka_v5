/**
 * Devices & SIMs: one model for the screen, built either from the server (`GET /ingestion/cases/{id}/devices`,
 * uploaded CDR / IPDR / bank login logs) or from a demo case's fixture. No figure here is invented: every count
 * is a count of rows, and every row can be listed.
 */
import type { CanonicalCaseFixture } from '../fixtures/cases';
import type { FraudNetwork } from '../v6/triage/triage';
import type { Focus } from '../lib/focusUrl';

export type DeviceKind = 'imei' | 'imsi' | 'ip' | 'bssid' | 'device_id';
/** Strongest evidence of "one person" first (same order as the server). */
export const DEVICE_KINDS: DeviceKind[] = ['imei', 'imsi', 'device_id', 'bssid', 'ip'];

/** Plain label first; the technical term goes in the tooltip. Strength = how strongly a shared value means "one person". */
export const KIND_META: Record<DeviceKind, { label: string; short: string; tip: string; strength: 'strong' | 'medium' | 'weak' }> = {
  imei: { label: 'Same phone', short: 'Phone', tip: 'IMEI: the 15-digit serial number of the handset.', strength: 'strong' },
  imsi: { label: 'Same SIM card', short: 'SIM', tip: 'IMSI: the identity stored on the SIM card.', strength: 'strong' },
  device_id: { label: 'Same app install', short: 'Device ID', tip: 'Device / app-install identifier reported by the bank or UPI app.', strength: 'strong' },
  bssid: { label: 'Same Wi-Fi router', short: 'Wi-Fi', tip: 'BSSID: the hardware address of the Wi-Fi access point.', strength: 'medium' },
  ip: { label: 'Same internet address', short: 'IP', tip: 'Public IP address. Mobile carriers share one IP among many users, so this alone is weaker evidence.', strength: 'weak' },
};

export interface DeviceAccount {
  key: string;
  label: string;
  phone: string | null;
  identifiers: Record<DeviceKind, string[]>;
  events: number;
  firstTs: number | null;
  lastTs: number | null;
}

export interface DeviceLink {
  kind: DeviceKind;
  value: string;
  accounts: string[];
  events: number;
  firstTs: number | null;
  lastTs: number | null;
}

export interface DeviceCluster {
  id: string;
  accounts: string[];
  links: DeviceLink[];
  strongestKind: DeviceKind;
  events: number;
}

export interface SimChange {
  account: string;
  ts: number | null;
  /** new_sim = the account's SIM identity changed between sightings; logged = the record itself says SIM swap / port. */
  kind: 'new_sim' | 'logged';
  from?: string | null;
  to?: string | null;
  event?: string | null;
  imei?: string | null;
  source: string | null;
}

export interface CommonIdentifier {
  kind: DeviceKind;
  value: string;
  accountCount: number;
  events: number;
}

export interface DeviceRow {
  key: string;
  ts: number | null;
  timeLabel: string;
  account: string;
  phone: string | null;
  imei: string | null;
  imsi: string | null;
  ip: string | null;
  bssid: string | null;
  deviceId: string | null;
  event: string | null;
  source: string;
}

export interface DeviceView {
  origin: 'upload' | 'demo';
  hasData: boolean;
  eventsTotal: number;
  accounts: DeviceAccount[];
  clusters: DeviceCluster[];
  common: CommonIdentifier[];
  simChanges: SimChange[];
  simChangesTotal: number;
}

/* ---------------- server ---------------- */

type ServerIds = Record<DeviceKind, string[]>;
export interface DevicesResponse {
  has_device_data: boolean;
  events_total: number;
  accounts_total: number;
  clusters: { cluster_id: string; accounts: string[]; strongest_kind: DeviceKind; events: number; links: { kind: DeviceKind; value: string; accounts: string[]; events: number; first_ts: number; last_ts: number }[] }[];
  common_identifiers: { kind: DeviceKind; value: string; account_count: number; events: number }[];
  sim_changes: { account: string; ts: number; kind: 'new_sim' | 'logged'; from?: string; to?: string | null; event?: string; imei?: string | null; job_id: string; line: number }[];
  sim_changes_total?: number;
  accounts: { key: string; phone: string | null; identifiers: ServerIds; events: number; first_ts: number; last_ts: number }[];
  rows: { job_id: string; line: number; ts: number; acct: string; phone: string | null; imei: string | null; imsi: string | null; ip: string | null; bssid: string | null; device_id: string | null; event: string | null; filename?: string }[] | null;
}

export const istTime = (ts: number | null): string =>
  ts === null
    ? '—'
    : new Date(ts * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export function viewFromServer(r: DevicesResponse): DeviceView {
  return {
    origin: 'upload',
    hasData: r.has_device_data,
    eventsTotal: r.events_total,
    accounts: r.accounts.map((a) => ({ key: a.key, label: a.key, phone: a.phone, identifiers: a.identifiers, events: a.events, firstTs: a.first_ts, lastTs: a.last_ts })),
    clusters: r.clusters.map((c) => ({
      id: c.cluster_id,
      accounts: c.accounts,
      strongestKind: c.strongest_kind,
      events: c.events,
      links: c.links.map((l) => ({ kind: l.kind, value: l.value, accounts: l.accounts, events: l.events, firstTs: l.first_ts, lastTs: l.last_ts })),
    })),
    common: r.common_identifiers.map((c) => ({ kind: c.kind, value: c.value, accountCount: c.account_count, events: c.events })),
    simChanges: r.sim_changes.map((s) => ({ account: s.account, ts: s.ts, kind: s.kind, from: s.from, to: s.to, event: s.event, imei: s.imei, source: `row ${s.line}` })),
    simChangesTotal: r.sim_changes_total ?? r.sim_changes.length,
  };
}

export function rowsFromServer(rows: NonNullable<DevicesResponse['rows']>): DeviceRow[] {
  return rows.map((r) => ({
    key: `${r.job_id}:${r.line}`,
    ts: r.ts,
    timeLabel: istTime(r.ts),
    account: r.acct,
    phone: r.phone,
    imei: r.imei,
    imsi: r.imsi,
    ip: r.ip,
    bssid: r.bssid,
    deviceId: r.device_id,
    event: r.event,
    source: `${r.filename ?? r.job_id} · row ${r.line}`,
  }));
}

/* ---------------- clustering (demo cases; the server does the same for uploads) ---------------- */

/** Values on more accounts than this are a carrier NAT / public Wi-Fi / kiosk, not one person (same as the server). */
export const COMMON_LIMIT = 25;
const kindRank = (k: DeviceKind) => DEVICE_KINDS.indexOf(k);

export function clusterAccounts(accounts: DeviceAccount[], commonLimit = COMMON_LIMIT): { clusters: DeviceCluster[]; common: CommonIdentifier[] } {
  const holders = new Map<string, DeviceLink>();
  for (const a of accounts)
    for (const k of DEVICE_KINDS)
      for (const v of a.identifiers[k]) {
        const h = holders.get(`${k}\u0000${v}`) ?? { kind: k, value: v, accounts: [], events: 0, firstTs: null, lastTs: null };
        if (!h.accounts.includes(a.key)) h.accounts.push(a.key);
        h.events += 1;
        holders.set(`${k}\u0000${v}`, h);
      }
  const shared = [...holders.values()].filter((h) => h.accounts.length > 1 && h.accounts.length <= commonLimit);
  const common = [...holders.values()]
    .filter((h) => h.accounts.length > commonLimit)
    .map((h) => ({ kind: h.kind, value: h.value, accountCount: h.accounts.length, events: h.events }));

  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p;
    parent.set(x, p);
    return p;
  };
  for (const h of shared) for (const o of h.accounts.slice(1)) parent.set(find(o), find(h.accounts[0]));

  const groups = new Map<string, { accounts: Set<string>; links: DeviceLink[] }>();
  for (const h of shared) {
    const root = find(h.accounts[0]);
    const g = groups.get(root) ?? { accounts: new Set<string>(), links: [] };
    h.accounts.forEach((a) => g.accounts.add(a));
    g.links.push({ ...h, accounts: [...h.accounts].sort() });
    groups.set(root, g);
  }
  const events = new Map(accounts.map((a) => [a.key, a.events]));
  const clusters = [...groups.values()]
    .map((g) => {
      const links = g.links.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || b.accounts.length - a.accounts.length);
      const accts = [...g.accounts].sort();
      return { id: '', accounts: accts, links, strongestKind: links[0].kind, events: accts.reduce((s, a) => s + (events.get(a) ?? 0), 0) };
    })
    .sort((a, b) => Number(kindRank(a.strongestKind) > 2) - Number(kindRank(b.strongestKind) > 2) || b.accounts.length - a.accounts.length || a.accounts[0].localeCompare(b.accounts[0]))
    .map((c, i) => ({ ...c, id: `DC-${String(i + 1).padStart(3, '0')}` }));
  return { clusters, common };
}

/* ---------------- demo fixtures ---------------- */

const placeholder = (v?: string) => !v || /unknown/i.test(v);
const SIM_RE = /sim.?swap|imsi|hlr|port.?out|duplicate sim/i;

/** Device sightings in a demo case: transactions that carry a handset / IP / Wi-Fi, plus devices bound to accounts. */
export function demoDeviceRows(c: CanonicalCaseFixture, keyOf: (name: string) => string): DeviceRow[] {
  const rows: DeviceRow[] = c.transactions
    .filter((t) => t.deviceImei || t.clientIp || t.bssidMac)
    .map((t) => ({
      key: t.id,
      ts: Date.parse(t.timestampUtc) / 1000,
      timeLabel: t.timestampIst.replace(' IST', ''),
      account: keyOf(t.fromName),
      phone: null,
      imei: placeholder(t.deviceImei) ? null : t.deviceImei!,
      imsi: null,
      ip: t.clientIp ?? null,
      bssid: t.bssidMac ?? null,
      deviceId: null,
      event: `${t.paymentRail} payment ${t.id}`,
      source: t.sourceFile ? `${t.sourceFile}${t.sourceRow ? ` · row ${t.sourceRow}` : ''}` : `Case record · ${t.id}`,
    }));
  for (const a of c.accounts) {
    const imei = placeholder(a.deviceImei) ? null : a.deviceImei!;
    if (imei || a.bssidHotspot)
      rows.push({
        key: `acct:${a.nodeId}`,
        ts: null,
        timeLabel: '—',
        account: keyOf(a.holderName),
        phone: null,
        imei,
        imsi: null,
        ip: null,
        bssid: a.bssidHotspot ?? null,
        deviceId: null,
        event: 'Device on the account record',
        source: `Case record · account ${a.accountMasked}`,
      });
  }
  return rows.sort((x, y) => (x.ts ?? 0) - (y.ts ?? 0));
}

export function viewFromRows(rows: DeviceRow[], labelOf: (key: string) => string, simChanges: SimChange[] = []): DeviceView {
  const byAcct = new Map<string, DeviceAccount>();
  for (const r of rows) {
    const a = byAcct.get(r.account) ?? {
      key: r.account,
      label: labelOf(r.account),
      phone: r.phone,
      identifiers: { imei: [], imsi: [], ip: [], bssid: [], device_id: [] },
      events: 0,
      firstTs: null,
      lastTs: null,
    };
    a.events += 1;
    if (r.ts !== null) {
      a.firstTs = a.firstTs === null ? r.ts : Math.min(a.firstTs, r.ts);
      a.lastTs = a.lastTs === null ? r.ts : Math.max(a.lastTs, r.ts);
    }
    const vals: Record<DeviceKind, string | null> = { imei: r.imei, imsi: r.imsi, ip: r.ip, bssid: r.bssid, device_id: r.deviceId };
    for (const k of DEVICE_KINDS) {
      const v = vals[k];
      if (v && !a.identifiers[k].includes(v)) a.identifiers[k].push(v);
    }
    byAcct.set(r.account, a);
  }
  const accounts = [...byAcct.values()].sort((a, b) => a.label.localeCompare(b.label));
  const { clusters, common } = clusterAccounts(accounts);
  // events per link = rows that carry the value on one of the linked accounts
  for (const cl of clusters)
    for (const l of cl.links) {
      const hits = rows.filter((r) => l.accounts.includes(r.account) && rowValue(r, l.kind) === l.value);
      l.events = hits.length;
      const ts = hits.map((r) => r.ts).filter((t): t is number => t !== null);
      l.firstTs = ts.length ? Math.min(...ts) : null;
      l.lastTs = ts.length ? Math.max(...ts) : null;
    }
  return { origin: 'demo', hasData: rows.length > 0, eventsTotal: rows.length, accounts, clusters, common, simChanges, simChangesTotal: simChanges.length };
}

export const rowValue = (r: DeviceRow, k: DeviceKind): string | null =>
  ({ imei: r.imei, imsi: r.imsi, ip: r.ip, bssid: r.bssid, device_id: r.deviceId })[k];

export function demoSimChanges(c: CanonicalCaseFixture): SimChange[] {
  return c.timelineEvents
    .filter((e) => SIM_RE.test(e.track) || SIM_RE.test(e.title))
    .map((e) => ({ account: '', ts: Date.parse(e.timestampUtc) / 1000, kind: 'logged' as const, event: `${e.title}${e.detail ? ` — ${e.detail}` : ''}`, source: `Case timeline · ${e.eventId}` }));
}

/* ---------------- zoom ---------------- */

export interface ScopedDevices {
  view: DeviceView;
  /** Accounts in scope (network members / the focused account); null = whole case. */
  scope: Set<string> | null;
}

/** Narrow the view to the focused network or account. Clusters that touch the scope keep all their accounts,
 *  so a phone that links this gang to an outside account still shows (marked "outside" by the screen). */
export function scopeDevices(view: DeviceView, focus: Focus, networks: FraudNetwork[] | null): ScopedDevices {
  let scope: Set<string> | null = null;
  if (focus.account) scope = new Set([focus.account.toLowerCase(), focus.account]);
  else if (focus.networkId) {
    const net = networks?.find((n) => n.network_id === focus.networkId);
    if (net) scope = new Set(net.members.map((m) => m.id));
  }
  if (!scope) return { view, scope: null };
  const inScope = (a: string) => scope!.has(a);
  return {
    scope,
    view: {
      ...view,
      accounts: view.accounts.filter((a) => inScope(a.key)),
      clusters: view.clusters.filter((c) => c.accounts.some(inScope)),
      simChanges: view.simChanges.filter((s) => !s.account || inScope(s.account)),
      simChangesTotal: view.simChanges.filter((s) => !s.account || inScope(s.account)).length,
    },
  };
}

/** Bipartite layout for the small cluster graph: identifiers on the left, accounts on the right. */
export function clusterGraph(c: DeviceCluster, maxAccounts = 24) {
  const accounts = c.accounts.slice(0, maxAccounts);
  const ids = c.links.filter((l) => l.accounts.some((a) => accounts.includes(a))).slice(0, 12);
  const edges = ids.flatMap((l, i) => l.accounts.filter((a) => accounts.includes(a)).map((a) => ({ from: i, to: accounts.indexOf(a), kind: l.kind })));
  return { ids, accounts, edges, hiddenAccounts: c.accounts.length - accounts.length };
}

/** One honest sentence for the top of the page. */
export function deviceHeadline(v: DeviceView, scopeLabel: string): string {
  if (!v.hasData) return '';
  const strong = v.clusters.filter((c) => KIND_META[c.strongestKind].strength === 'strong');
  if (v.clusters.length === 0)
    return `${v.accounts.length.toLocaleString('en-IN')} account${v.accounts.length === 1 ? '' : 's'} ${scopeLabel} have device records, and none shares a phone, SIM, Wi-Fi or internet address with another account.`;
  const g = v.clusters.length;
  return `${g.toLocaleString('en-IN')} group${g === 1 ? '' : 's'} of accounts ${scopeLabel} share${g === 1 ? 's' : ''} a device${strong.length ? `; ${strong.length.toLocaleString('en-IN')} by the same phone, SIM or app — usually one person` : ''}.`;
}

/** Per-account device identifiers keyed by party key (lower(trim(label))), for the People account page. */
export function deviceIdsByParty(v: DeviceView | null): Map<string, Record<DeviceKind, string[]>> {
  return new Map((v?.accounts ?? []).map((a) => [a.key.trim().toLowerCase(), a.identifiers]));
}
