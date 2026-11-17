import { describe, expect, it } from 'vitest';
import { CANONICAL_CASES } from '../../fixtures/cases';
import {
  clusterAccounts, demoDeviceRows, deviceIdsByParty, scopeDevices, viewFromRows, viewFromServer, type DeviceAccount, type DevicesResponse,
} from '../deviceSelectors';
import type { FraudNetwork } from '../../v6/triage/triage';

const acct = (key: string, ids: Partial<DeviceAccount['identifiers']>): DeviceAccount => ({
  key, label: key, phone: null, events: 1, firstTs: null, lastTs: null,
  identifiers: { imei: [], imsi: [], ip: [], bssid: [], device_id: [], ...ids },
});

describe('clusterAccounts', () => {
  it('joins accounts through chains of shared identifiers, strongest link first', () => {
    const { clusters } = clusterAccounts([
      acct('a', { imei: ['111'] }),
      acct('b', { imei: ['111'], ip: ['1.1.1.1'] }),
      acct('c', { ip: ['1.1.1.1'] }),
      acct('d', { ip: ['9.9.9.9'] }),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ id: 'DC-001', accounts: ['a', 'b', 'c'], strongestKind: 'imei' });
  });

  it('leaves out identifiers used by too many accounts (carrier NAT, public Wi-Fi)', () => {
    const many = Array.from({ length: 5 }, (_, i) => acct(`m${i}`, { ip: ['100.64.0.1'] }));
    const { clusters, common } = clusterAccounts(many, 3);
    expect(clusters).toHaveLength(0);
    expect(common).toEqual([{ kind: 'ip', value: '100.64.0.1', accountCount: 5, events: 5 }]);
  });

  it('ranks phone / SIM groups above IP-only groups', () => {
    const { clusters } = clusterAccounts([
      acct('x1', { ip: ['2.2.2.2'] }), acct('x2', { ip: ['2.2.2.2'] }), acct('x3', { ip: ['2.2.2.2'] }),
      acct('y1', { imsi: ['404'] }), acct('y2', { imsi: ['404'] }),
    ]);
    expect(clusters.map((c) => c.strongestKind)).toEqual(['imsi', 'ip']);
  });
});

describe('demo case', () => {
  it('CASE-2026-001: the shared handset links four accounts; placeholder IMEIs are ignored', () => {
    const c = CANONICAL_CASES['CASE-2026-001'];
    const rows = demoDeviceRows(c, (n) => n);
    const v = viewFromRows(rows, (k) => k);
    expect(v.hasData).toBe(true);
    const phone = v.clusters.find((cl) => cl.strongestKind === 'imei')!;
    expect(phone.accounts).toEqual(expect.arrayContaining(['Sunil Kumar', 'Vikram Shah', 'Rohit Verma', 'Sameer Khan']));
    expect(rows.some((r) => r.imei && /unknown/i.test(r.imei))).toBe(false);
    // link record counts are real row counts
    const link = phone.links.find((l) => l.kind === 'imei')!;
    expect(link.events).toBe(rows.filter((r) => r.imei === link.value).length);
  });
});

describe('server view + zoom', () => {
  const resp: DevicesResponse = {
    has_device_data: true, events_total: 6, accounts_total: 3,
    clusters: [{ cluster_id: 'DC-001', accounts: ['m1@ybl', 'm2@ybl', 'out@ybl'], strongest_kind: 'imei', events: 5,
      links: [{ kind: 'imei', value: '352099001761481', accounts: ['m1@ybl', 'm2@ybl', 'out@ybl'], events: 5, first_ts: 1, last_ts: 2 }] }],
    common_identifiers: [],
    sim_changes: [{ account: 'm1@ybl', ts: 5, kind: 'new_sim', from: 'A', to: 'B', job_id: 'J', line: 7 }, { account: 'zz@ybl', ts: 6, kind: 'logged', event: 'SIM SWAP', job_id: 'J', line: 8 }],
    accounts: ['m1@ybl', 'm2@ybl', 'out@ybl'].map((key) => ({ key, phone: null, identifiers: { imei: ['352099001761481'], imsi: [], ip: [], bssid: [], device_id: [] }, events: 2, first_ts: 1, last_ts: 2 })),
    rows: null,
  };
  const nets = [{ network_id: 'NET-1', members: [{ id: 'm1@ybl' }, { id: 'm2@ybl' }] }] as unknown as FraudNetwork[];

  it('network zoom keeps groups that touch the network, with their outside accounts', () => {
    const s = scopeDevices(viewFromServer(resp), { networkId: 'NET-1', account: null }, nets);
    expect(s.view.accounts.map((a) => a.key)).toEqual(['m1@ybl', 'm2@ybl']);
    expect(s.view.clusters[0].accounts).toContain('out@ybl');
    expect(s.view.simChanges.map((x) => x.account)).toEqual(['m1@ybl']);
    expect(s.view.simChanges[0].source).toBe('row 7');
  });

  it('deviceIdsByParty gives each account its identifiers by party key', () => {
    const m = deviceIdsByParty(viewFromServer(resp));
    expect(m.get('m1@ybl')?.imei).toEqual(['352099001761481']);
    expect(deviceIdsByParty(null).size).toBe(0);
  });

  it('account zoom narrows to one account; unknown network falls back to the whole case', () => {
    expect(scopeDevices(viewFromServer(resp), { networkId: null, account: 'M2@ybl' }, nets).view.accounts.map((a) => a.key)).toEqual(['m2@ybl']);
    expect(scopeDevices(viewFromServer(resp), { networkId: 'NET-404', account: null }, nets).scope).toBeNull();
  });
});
