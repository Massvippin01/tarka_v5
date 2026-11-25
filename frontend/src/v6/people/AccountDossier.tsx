import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Copy, Files, Network, ShieldCheck, ShieldX, Snowflake, Undo2, Wallet, Smartphone, Wifi, History, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import type { CanonicalCaseFixture } from '../../fixtures/cases';
import { formatInr } from '../../lib/formatInr';
import { setFocus } from '../../lib/focusUrl';
import { selectAccountFlows } from '../../selectors/caseSelectors';
import { ROLE_GROUPS, partyKey, plural, type PersonRow, type ReviewPair } from '../../selectors/peopleSelectors';
import { useCaseStore } from '../../store/useCaseStore';
import { Button, Skeleton } from '../ui';
import { fmtIst } from '../evidence/EvidenceRegister';
import { ROLE_TONE, ScoreBar, VerdictTag } from './PeopleTable';
import { ReasonDialog } from './ReviewQueue';
import { useAccountFreeze, useAccountTimeline, useAccountVerdict, useDeviceIds, useNetworks, useVerdictHistory } from './usePeopleData';

const VERDICT_WORD = { CONFIRMED_MULE: 'Confirmed mule', NOT_MULE: 'Not a mule' } as const;

const Ident: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode; tip?: string }> = ({ label, value, icon, tip }) =>
  value ? (
    <div className="min-w-0" title={tip}>
      <div className="flex items-center gap-1 text-[11.5px] text-[var(--fg-3)]">{icon}{label}</div>
      <button
        type="button"
        onClick={() => { void navigator.clipboard?.writeText(value); toast.success(`${label} copied`); }}
        className="group flex max-w-full items-center gap-1 v6-mono text-[13px] font-medium text-[var(--fg-1)]"
        title={`${value}\nClick to copy`}
      >
        <span className="truncate">{value}</span>
        <Copy className="h-3 w-3 flex-none opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    </div>
  ) : null;

interface Props {
  caseId: string;
  fixture: CanonicalCaseFixture;
  /** null when the account in the URL is not in this case's networks or accounts. */
  row: PersonRow | null;
  accountParam: string;
  /** Demo fixture (no uploaded statements) → no backend verdicts, timeline from the fixture. */
  demo: CanonicalCaseFixture | null;
  pairs: ReviewPair[];
  networksLoading: boolean;
}

export const AccountDossier: React.FC<Props> = ({ caseId, fixture, row, accountParam, demo, pairs, networksLoading }) => {
  const { setActiveView } = useCaseStore();
  const label = row?.label ?? accountParam;
  const timeline = useAccountTimeline(caseId, label, demo);
  const verdict = useAccountVerdict(caseId);
  const history = useVerdictHistory(caseId, label, !demo && !!row);
  const freeze = useAccountFreeze(fixture, label);
  const [askNotMule, setAskNotMule] = useState(false);
  const device = useMemo(() => selectAccountFlows(fixture).find((a) => partyKey(a.holderName) === partyKey(label)), [fixture, label]);
  // Uploaded login / device logs win; demo cases carry IMEI / Wi-Fi in the case record.
  const uploaded = useDeviceIds(caseId, !demo).get(partyKey(label));
  const netsQ = useNetworks(caseId);
  const controllerGroup = useMemo(() => {
    const key = partyKey(label);
    for (const n of netsQ.data?.networks ?? []) {
      const hit = (n.controllers ?? []).find((cg) => cg.accounts.includes(key));
      if (hit) return hit;
    }
    return null;
  }, [netsQ.data, label]);
  const moneyPaths = useMemo(() => {
    const key = partyKey(label);
    return (netsQ.data?.networks ?? [])
      .flatMap((n) => n.traces ?? [])
      .flatMap((vt) => vt.paths.filter((p) => p.hops.includes(key)))
      .slice(0, 6);
  }, [netsQ.data, label]);
  const ids = (list: string[] | undefined, fallback?: string) => (list?.length ? list.join(', ') : fallback);
  const imei = ids(uploaded?.imei, device?.deviceImei);
  const sim = ids(uploaded?.imsi);
  const wifi = ids(uploaded?.bssid, device?.bssidHotspot);
  const myPairs = pairs.filter((p) => partyKey(p.a) === partyKey(label) || partyKey(p.b) === partyKey(label));

  const toLedger = () => setActiveView('evidence'); // the ?acct= focus is already set: the ledger opens scoped to this account
  const otherCase = (c: string) => {
    useCaseStore.getState().setActiveCaseId(c);
    setFocus({ networkId: null, account: label });
  };

  if (networksLoading && !row) {
    return <div className="v6-glass space-y-4 rounded-2xl p-6"><Skeleton height={40} width={360} /><div className="grid grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} />)}</div><Skeleton height={240} /></div>;
  }
  if (!row) {
    return (
      <div className="v6-glass flex flex-col items-center gap-2 rounded-2xl p-10 text-center" data-testid="dossier-missing">
        <div className="text-[15px] font-semibold text-[var(--fg-1)]">{accountParam} is not in this case</div>
        <p className="max-w-[52ch] text-[12.5px] text-[var(--fg-2)]">It may belong to another case, or it is not linked to any suspected mule. Search the whole case list with ⌘K, or go back to everyone in this case.</p>
        <Button size="sm" onClick={() => setFocus({ networkId: null, account: null })}>Back to everyone</Button>
      </div>
    );
  }

  const tone = ROLE_TONE[row.role];
  const reasons = row.why.split('; ').filter(Boolean);
  const busy = verdict.isPending;
  const canJudge = !demo && (row.role === 'MULE' || row.role === 'UNKNOWN' || !!row.verdict);
  const money: { label: string; value: number; icon: React.ReactNode; tip: string }[] = [
    { label: 'Money in', value: row.inInr, icon: <ArrowDownLeft className="h-3.5 w-3.5" />, tip: 'Everything paid into this account in the uploaded statements' },
    { label: 'Money out', value: row.outInr, icon: <ArrowUpRight className="h-3.5 w-3.5" />, tip: 'Everything this account paid on' },
    { label: 'Still in account', value: row.heldInr, icon: <Wallet className="h-3.5 w-3.5" />, tip: row.verdict === 'NOT_MULE' ? 'Not counted: marked “not a mule”, so this balance is no longer recoverable money' : 'What a freeze can still hold (money in minus money out)' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4" data-testid="account-dossier">
      {/* Identity */}
      <section className="v6-glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md px-2 py-0.5 text-[12px] font-semibold" style={{ color: tone.fg, background: tone.bg }}>
                {ROLE_GROUPS.find((g) => g.role === row.role)!.label.replace(/s$/, '')}
              </span>
              <VerdictTag verdict={row.verdict} />
              {row.hop !== null && row.hop > 0 && <span className="text-[12px] text-[var(--fg-3)]" title="Payments between the victim and this account">{plural(row.hop, 'step')} from a victim</span>}
            </div>
            <h2 className="mt-1.5 truncate v6-mono text-[22px] font-[650] text-[var(--fg-1)]" title={row.label}>{row.label}</h2>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] text-[var(--fg-3)]" title="Computed from the uploaded statements. The same score shows on Triage and the Network page.">Mule score</div>
            <div className="mt-1 flex justify-end"><ScoreBar score={row.muleScore} why={row.why} /></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--line)] pt-4 md:grid-cols-3 xl:grid-cols-6">
          <Ident label="UPI ID" value={row.ids.upi} />
          <Ident label="Phone" value={row.ids.phone} />
          <Ident label="Bank account" value={row.ids.account} />
          <Ident label="IFSC" value={row.ids.ifsc} tip="Branch code of the bank" />
          <Ident label={uploaded && uploaded.imei.length > 1 ? `Handsets (${uploaded.imei.length})` : 'Handset (IMEI)'} value={imei} icon={<Smartphone className="h-3 w-3" />} tip="Phone handset(s) seen logging into this account (from device / login records). More than one is a warning sign." />
          <Ident label={uploaded && uploaded.imsi.length > 1 ? `SIM cards (${uploaded.imsi.length})` : 'SIM (IMSI)'} value={sim} icon={<CreditCard className="h-3 w-3" />} tip="SIM card(s) used with this account. A SIM change just before the fraud can mean a SIM swap." />
          <Ident label="Wi-Fi hotspot" value={wifi} icon={<Wifi className="h-3 w-3" />} tip="Wi-Fi network(s) (BSSID) this account was used from" />
          {!row.ids.upi && !row.ids.phone && !row.ids.account && !row.ids.ifsc && !imei && !sim && !wifi && (
            <div className="col-span-full text-[12.5px] text-[var(--fg-3)]">No UPI ID, phone or account number could be read from this name.</div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Money */}
          <section className="grid grid-cols-3 gap-3">
            {money.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={toLedger}
                className="v6-glass rounded-2xl p-4 text-left transition-shadow hover:shadow-[var(--glass-shadow)]"
                title={`${m.tip}\n${formatInr(m.value)}. Click to see the payments behind it.`}
              >
                <div className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]">{m.icon}{m.label}</div>
                <div className={clsx('mt-1 v6-mono text-[20px] font-[650] tabular-nums underline decoration-dotted decoration-[var(--fg-3)]/40 underline-offset-4', row.verdict === 'NOT_MULE' && m.label === 'Still in account' ? 'text-[var(--fg-3)]' : 'text-[var(--fg-1)]')}>
                  {formatInr(m.value, { compact: true })}
                </div>
              </button>
            ))}
          </section>

          {/* Why flagged */}
          <section className="v6-glass rounded-2xl p-4">
            <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Why it is flagged</h3>
            <ul className="mt-2 space-y-1.5">
              {reasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13px] text-[var(--fg-2)]">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: tone.fg }} />
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {controllerGroup && (
            <section className="v6-glass rounded-2xl p-4 space-y-2.5" data-testid="dossier-controller-attribution">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-[650] text-[var(--fg-1)] flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-[var(--accent)]" /> Controller attribution
                </h3>
                <span className="rounded-md bg-[var(--accent-bg)] text-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold">
                  CONTROLLER_GROUP
                </span>
              </div>
              <p className="text-[13px] font-medium text-[var(--fg-1)]">{controllerGroup.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {controllerGroup.devices.map((d) => (
                  <span
                    key={`${d.kind}:${d.value}`}
                    title={`${d.kind.toUpperCase()} shared across ${d.accounts.length} accounts (${d.events} device events)`}
                    className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 v6-mono text-[11.5px] text-[var(--fg-1)]"
                  >
                    {d.kind.toUpperCase()}: {d.value}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {controllerGroup.accounts.map((acct) => (
                  <button
                    key={acct}
                    type="button"
                    onClick={() => setFocus({ networkId: null, account: acct })}
                    className={clsx(
                      'rounded-md px-2 py-0.5 v6-mono text-[11.5px] border transition-colors',
                      acct === row.key
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--surface-2)] text-[var(--fg-2)] border-[var(--line)] hover:text-[var(--accent)]',
                    )}
                  >
                    {acct}
                  </button>
                ))}
              </div>
              {controllerGroup.evidence_rows.length > 0 && (
                <div className="border-t border-[var(--line)] pt-2">
                  <div className="text-[11.5px] font-medium text-[var(--fg-3)] mb-1">Device sighting evidence</div>
                  <ul className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] v6-mono text-[var(--fg-2)]">
                    {controllerGroup.evidence_rows.slice(0, 6).map((ev, i) => (
                      <li key={i}>
                        {fmtIst(ev.ts)} · {ev.account} · {ev.kind}={ev.value} (line {ev.line})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {moneyPaths.length > 0 && (
            <section className="v6-glass rounded-2xl p-4 space-y-2" data-testid="dossier-money-paths">
              <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Time-aware victim money paths</h3>
              <ul className="space-y-1.5 text-[12.5px]">
                {moneyPaths.map((p, idx) => (
                  <li key={idx} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="v6-mono text-[var(--fg-1)] break-all">{p.hop_labels.join(' → ')}</span>
                    <span className="font-semibold tabular-nums text-[var(--fg-1)]">
                      {formatInr(p.amount_inr)} ·{' '}
                      <span className="font-normal text-[var(--fg-3)]">
                        {p.outcome === 'HELD' ? 'still held' : p.outcome === 'CASHED_OUT' ? 'cashed out' : 'moved elsewhere'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Timeline */}
          <section className="v6-glass rounded-2xl">
            <header className="flex items-baseline justify-between border-b border-[var(--line)] px-4 py-3">
              <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Payments, oldest first</h3>
              {timeline.data && (
                <button type="button" onClick={toLedger} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">
                  {timeline.data.total > timeline.data.rows.length ? `See all ${timeline.data.total.toLocaleString('en-IN')} in the ledger` : 'Open in the ledger'}
                </button>
              )}
            </header>
            <div className="max-h-[340px] overflow-auto">
              {timeline.isLoading ? (
                <div className="space-y-1.5 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={28} />)}</div>
              ) : timeline.isError ? (
                <div className="p-4 text-[12.5px] text-[var(--risk)]">Payments could not be loaded. <button type="button" className="font-semibold underline" onClick={() => void timeline.refetch()}>Try again</button></div>
              ) : !timeline.data?.rows.length ? (
                <div className="p-4 text-[12.5px] text-[var(--fg-3)]">No payments to or from this account in the statements.</div>
              ) : (
                <ol>
                  {timeline.data.rows.map((t) => {
                    const incoming = partyKey(t.payee) === partyKey(label);
                    const other = incoming ? t.payer : t.payee;
                    return (
                      <li key={t.key} className="grid grid-cols-[140px_20px_minmax(0,1fr)_112px] items-center gap-2 border-b border-[var(--line)]/60 px-4 py-2 text-[12.5px]">
                        <span className="tabular-nums text-[var(--fg-3)]" title={`${fmtIst(t.ts, true)} IST`}>{fmtIst(t.ts)}</span>
                        {incoming ? <ArrowDownLeft className="h-3.5 w-3.5 text-[var(--safe)]" aria-label="received" /> : <ArrowUpRight className="h-3.5 w-3.5 text-[var(--risk)]" aria-label="paid" />}
                        <button type="button" onClick={() => setFocus({ networkId: null, account: other })} className="truncate text-left v6-mono text-[var(--fg-2)] hover:text-[var(--accent)] hover:underline" title={`${incoming ? 'From' : 'To'} ${other}\n${t.filename}${t.line ? `, line ${t.line}` : ''}`}>
                          {incoming ? 'from ' : 'to '}{other}
                        </button>
                        <span className="text-right v6-mono font-semibold tabular-nums text-[var(--fg-1)]" title={formatInr(t.amount, { showPaise: true })}>{formatInr(t.amount)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {/* Actions */}
          <section className="v6-glass rounded-2xl p-4">
            <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Your decision</h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-2)]">A verdict changes the mule and recoverable totals on every screen.</p>
            <div className="mt-3 grid gap-2">
              <Button
                variant="primary"
                onClick={() => freeze.send.mutate()}
                disabled={!freeze.row || freeze.row.status !== 'NOT_SENT' && freeze.row.status !== 'REFUSED' || freeze.send.isPending || row.verdict === 'NOT_MULE'}
                isLoading={freeze.send.isPending}
                title={!freeze.row ? 'Nothing left in this account for a freeze to hold' : 'Record a freeze notice to the bank for this account (§107 BNSS attachment of a mule balance)'}
              >
                <span className="flex items-center gap-1.5">
                  <Snowflake className="h-3.5 w-3.5" />
                  {!freeze.row ? 'Nothing to freeze' : freeze.row.status === 'NOT_SENT' ? `Freeze ${formatInr(freeze.row.recoverableInr, { compact: true })}` : freeze.row.status === 'REFUSED' ? 'Bank refused: send again' : `Freeze notice ${freeze.row.status.toLowerCase()}`}
                </span>
              </Button>
              {canJudge ? (
                row.verdict ? (
                  <Button onClick={() => verdict.mutate({ account: row.label, verdict: null })} disabled={busy} isLoading={busy}>
                    <span className="flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Undo “{VERDICT_WORD[row.verdict]}”</span>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="destructive" onClick={() => verdict.mutate({ account: row.label, verdict: 'CONFIRMED_MULE' })} disabled={busy} isLoading={busy} title="You have checked the evidence: this is a mule account">
                      <span className="flex items-center gap-1.5"><ShieldX className="h-3.5 w-3.5" /> Confirm mule</span>
                    </Button>
                    <Button onClick={() => setAskNotMule(true)} disabled={busy} title="It is a genuine account (e.g. salary, merchant). You will be asked why.">
                      <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Not a mule</span>
                    </Button>
                  </div>
                )
              ) : (
                <p className="text-[12px] text-[var(--fg-3)]">
                  {demo ? 'Demo case: verdicts are saved once bank statements are uploaded.' : 'Verdicts apply to suspected mules and unclear accounts, not to victims or cash-out points.'}
                </p>
              )}
            </div>
            {!!history.data?.length && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="flex items-center gap-1 text-[12px] font-medium text-[var(--fg-3)]"><History className="h-3.5 w-3.5" /> Audit log</div>
                <ol className="mt-1.5 space-y-1">
                  {[...history.data].reverse().map((h) => (
                    <li key={h.seq} className="text-[12px] text-[var(--fg-2)]">
                      <span className="tabular-nums text-[var(--fg-3)]">{fmtIst(h.at)}</span> · {h.actor}:{' '}
                      <span className="font-medium text-[var(--fg-1)]">{h.after ? VERDICT_WORD[h.after.verdict] : 'verdict cleared'}</span>
                      {h.after?.reason && <span className="block truncate text-[var(--fg-3)]" title={h.after.reason}>“{h.after.reason}”</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* Networks + FIRs */}
          <section className="v6-glass rounded-2xl p-4">
            <h3 className="text-[14px] font-[650] text-[var(--fg-1)]">Where else it appears</h3>
            <div className="mt-2 space-y-3 text-[12.5px]">
              <div>
                <div className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]"><Network className="h-3.5 w-3.5" /> Networks in this case</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {row.networks.length ? row.networks.map((n) => (
                    <button key={n} type="button" onClick={() => setFocus({ networkId: n, account: null })} className="rounded-md bg-[var(--glass-2)] px-2 py-0.5 v6-mono text-[12px] text-[var(--fg-1)] hover:text-[var(--accent)]" title="Zoom out to this network">{n}</button>
                  )) : <span className="text-[var(--fg-3)]">Not part of a detected network.</span>}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]"><Files className="h-3.5 w-3.5" /> Other FIRs / cases</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {row.otherCases.length ? row.otherCases.map((c) => (
                    <button key={c} type="button" onClick={() => otherCase(c)} className="rounded-md bg-[var(--color-urgent-bg)] px-2 py-0.5 v6-mono text-[12px] font-semibold text-[var(--urgent)] hover:underline" title={`Open ${c} at this account`}>{c}</button>
                  )) : <span className="text-[var(--fg-3)]">Not seen in any other case you can open.</span>}
                </div>
              </div>
              {myPairs.length > 0 && (
                <div>
                  <div className="text-[12px] text-[var(--fg-3)]">Probably the same person as</div>
                  <ul className="mt-1 space-y-1">
                    {myPairs.map((p) => {
                      const other = partyKey(p.a) === partyKey(label) ? p.b : p.a;
                      return (
                        <li key={p.key} className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => setFocus({ networkId: null, account: other })} className="truncate v6-mono text-[var(--fg-1)] hover:text-[var(--accent)] hover:underline" title={`${other}: ${p.why}`}>{other}</button>
                          <span className="flex-none text-[11.5px] text-[var(--fg-3)]">{p.verdict === 'MERGE' ? 'same person' : p.verdict === 'NOT_SAME' ? 'not the same' : 'to check'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <ReasonDialog
        open={askNotMule}
        title="Not a mule"
        hint={`Why is ${row.label} a genuine account? Its balance will stop counting as recoverable.`}
        confirm="Save: not a mule"
        busy={busy}
        onClose={() => setAskNotMule(false)}
        onSave={(reason) => verdict.mutate({ account: row.label, verdict: 'NOT_MULE', reason }, { onSuccess: () => setAskNotMule(false) })}
      />
    </motion.div>
  );
};
