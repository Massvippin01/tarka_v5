import React, { useMemo } from 'react';
import { ArrowRight, UploadCloud, Users } from 'lucide-react';
import { PageHead, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { CANONICAL_CASES } from '../../fixtures/cases';
import { useFocus, focusLevel } from '../../lib/focusUrl';
import {
  partyKey,
  peopleFromFixture,
  peopleFromNetworks,
  plural,
  reviewFromFixture,
  reviewFromNetworks,
  roleCounts,
} from '../../selectors/peopleSelectors';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';
import { FocusBar } from '../evidence/IntegrityPanel';
import { useNetworks } from '../people/usePeopleData';
import { PeopleTable } from '../people/PeopleTable';
import { ReviewQueue } from '../people/ReviewQueue';
import { AccountDossier } from '../people/AccountDossier';

const PeopleAccountsScreenInner: React.FC<ActiveCaseProps> = ({ fixture }) => {
  const { setActiveView } = useCaseStore();
  const caseId = fixture.caseId;
  const demo = CANONICAL_CASES[caseId] ?? null;
  const nets = useNetworks(caseId);
  const networks = nets.data?.networks ?? null;
  // Uploaded statements win; a demo case without uploads shows its fixture accounts.
  const fromFixture = !networks?.length && !!demo;
  const rows = useMemo(
    () => (networks?.length ? peopleFromNetworks(nets.data) : demo ? peopleFromFixture(demo) : []),
    [networks, nets.data, demo],
  );
  const pairs = useMemo(() => (networks?.length ? reviewFromNetworks(nets.data) : demo ? reviewFromFixture(demo) : []), [networks, nets.data, demo]);

  const urlFocus = useFocus();
  // A network id from another case or an old link falls back to the whole case, as on the Evidence and Network pages.
  const staleNet = !!networks && !!urlFocus.networkId && !networks.some((n) => n.network_id === urlFocus.networkId);
  const focus = staleNet ? { ...urlFocus, networkId: null } : urlFocus;
  const level = focusLevel(focus);
  const net = networks?.find((n) => n.network_id === focus.networkId);
  const loading = nets.isLoading && !demo;

  const scoped = focus.networkId ? rows.filter((r) => r.networks.includes(focus.networkId!)) : rows;
  const counts = roleCounts(scoped);
  const firHits = scoped.filter((r) => r.otherCases.length).length;
  const pending = pairs.filter((p) => !p.verdict).length;
  const scopeNote = net
    ? `Network ${net.network_id}${net.member_count > net.members.length ? ` (the ${net.members.length.toLocaleString('en-IN')} most mule-like of ${net.member_count.toLocaleString('en-IN')} accounts)` : ''}`
    : fromFixture ? 'Accounts in the case record (no statements uploaded yet)'
    : networks?.length ? `Whole case, ${plural(networks.length, 'network')}` : 'Whole case';

  return (
    <div className="v6-enter space-y-4" data-testid="v6-people-screen">
      <PageHead
        kicker="Step 2 · People & Accounts"
        title={level === 'account' ? 'Account dossier' : 'Who is involved, and are these the same person?'}
        actions={
          <Button variant="primary" size="md" onClick={() => setActiveView('money')}>
            <span className="flex items-center gap-1.5">Money trail <ArrowRight className="h-3.5 w-3.5" /></span>
          </Button>
        }
      />

      <FocusBar caseId={caseId} focus={focus} networks={networks} />

      {level === 'account' ? (
        <AccountDossier
          caseId={caseId}
          fixture={fixture}
          // exact party first; a bare phone / UPI id from ⌘K matches the party whose name contains it
          row={rows.find((r) => r.key === partyKey(focus.account!)) ?? rows.find((r) => r.key.includes(partyKey(focus.account!))) ?? null}
          accountParam={focus.account!}
          demo={fromFixture ? demo : null}
          pairs={pairs}
          networksLoading={nets.isLoading}
        />
      ) : nets.isError && !demo ? (
        <div className="v6-glass flex items-center justify-between gap-3 rounded-2xl p-5 text-[13px]" role="alert">
          <span className="text-[var(--risk)]">People could not be loaded from the server.</span>
          <Button size="sm" onClick={() => void nets.refetch()}>Try again</Button>
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="v6-glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center" data-testid="people-empty">
          <Users className="h-8 w-8 text-[var(--fg-3)]" />
          <div className="text-[16px] font-[650] text-[var(--fg-1)]">No one to show yet</div>
          <p className="max-w-[52ch] text-[13px] text-[var(--fg-2)]">
            {networks
              ? 'The uploaded statements have no account that looks like a mule, so no victims or networks either. Add more statements (the mule’s own bank statement helps most).'
              : 'Upload the victim’s and suspects’ bank or UPI statements. TARKA will list victims, suspected mules and cash-out points here.'}
          </p>
          <Button variant="primary" size="md" onClick={() => setActiveView('upload')}>
            <span className="flex items-center gap-1.5"><UploadCloud className="h-3.5 w-3.5" /> Upload statements</span>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-[13.5px] text-[var(--fg-2)]" aria-live="polite" data-testid="people-summary">
            {loading ? 'Reading the money flows…' : (
              <>
                <strong className="text-[var(--fg-1)]">{plural(counts.MULE, 'suspected mule')}</strong>, {plural(counts.VICTIM, 'victim')} and{' '}
                {plural(counts.CASH_OUT, 'cash-out point')}
                {counts.UNKNOWN ? `, plus ${plural(counts.UNKNOWN, 'account')} with an unclear role` : ''}.
                {firHits > 0 && <> <strong className="text-[var(--urgent)]">{plural(firHits, 'account')}</strong> also {firHits === 1 ? 'appears' : 'appear'} in other FIRs.</>}
                {pending > 0 && <> {plural(pending, 'pair')} may be the same person.</>}
              </>
            )}
          </p>
          <ReviewQueue caseId={caseId} pairs={pairs} />
          <PeopleTable rows={rows} focus={focus} loading={loading} scopeNote={scopeNote} />
        </>
      )}
    </div>
  );
};

export const PeopleAccountsScreen = withActiveCase(PeopleAccountsScreenInner);
