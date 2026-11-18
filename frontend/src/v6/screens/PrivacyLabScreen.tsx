import React from 'react';
import { EyeOff, FlaskConical, Info } from 'lucide-react';
import { PageHead, FindingStrip, TechnicalDetails } from '../ui';
import { withActiveCase, type ActiveCaseProps } from './shared/withActiveCase';

const SUSPECT = new Set(['LAYER_1_MULE', 'LAYER_2_CONDUIT', 'LAYER_3_SINK', 'UNRESOLVED_SUBSCRIBER']);

const PrivacyLabInner: React.FC<ActiveCaseProps> = ({ fixture }) => {
  const suspects = fixture.accounts.filter((a) => SUSPECT.has(a.holderType));
  const uniq = (xs: (string | undefined)[]) => new Set(xs.filter(Boolean)).size;
  const rows = [
    { label: 'Suspect bank accounts', tip: 'Account numbers of mule and conduit accounts in this case.', count: uniq(suspects.map((a) => a.accountNumber)) },
    { label: 'Suspect UPI IDs', tip: 'UPI handles that received money from the victim or from other mules.', count: uniq(fixture.transactions.filter((t) => suspects.some((a) => a.accountNumber === t.toAccount)).map((t) => t.toVpa)) },
    { label: 'Phone handsets (IMEI)', tip: 'Handset serial numbers linked to suspect accounts.', count: uniq(suspects.map((a) => a.deviceImei)) },
    { label: 'Wi-Fi hotspots', tip: 'Wi-Fi router addresses seen with suspect logins.', count: uniq(suspects.map((a) => a.bssidHotspot)) },
  ];
  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="v6-enter space-y-4" data-testid="v6-privacy-lab">
      <PageHead
        kicker="Labs"
        title="Private match with other banks"
        subtitle="Prototype: ask another bank or police unit whether it holds the same suspects, without either side handing over its full list."
        badge={<span className="text-[11.5px] px-2 py-0.5 rounded-full border border-[var(--line-2)] text-[var(--fg-2)] inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Prototype</span>}
      />

      <FindingStrip variant="warn" icon={<Info className="w-4 h-4" />}>
        Not connected to any bank or police unit yet. Nothing is sent from this screen; it shows what this case would contribute to a match.
      </FindingStrip>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="v6-card">
          <div className="v6-card-h">
            <div>
              <div className="v6-card-t">What this case would put into a match</div>
              <div className="v6-card-s">{fixture.caseId} only · {total.toLocaleString('en-IN')} identifiers</div>
            </div>
          </div>
          {total === 0 ? (
            <p className="text-[12.5px] text-[var(--fg-3)]">No suspect accounts, UPI IDs or devices are marked in this case yet. Mark suspects on People &amp; accounts first.</p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-[var(--fg-2)] flex items-center gap-1" title={r.tip}>{r.label} <Info className="w-3 h-3 opacity-60" /></span>
                  <span className="font-semibold tabular-nums text-[var(--fg-1)]">{r.count.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="v6-card">
          <div className="v6-card-t flex items-center gap-1.5"><EyeOff className="w-4 h-4 text-[var(--accent)]" /> What each side learns</div>
          <ul className="mt-3 space-y-2.5 text-[12.5px] text-[var(--fg-2)] leading-relaxed">
            <li><b className="text-[var(--fg-1)]">Both sides:</b> only the identifiers they have in common.</li>
            <li><b className="text-[var(--fg-1)]">The other bank:</b> nothing about suspects it does not already hold, and nothing about the victim.</li>
            <li><b className="text-[var(--fg-1)]">This case:</b> nothing about the other bank's customers who are not in the match.</li>
          </ul>
        </div>
      </div>

      <TechnicalDetails>
        <p><b>Private set intersection (ECDH-PSI).</b> Each side scrambles its list with a secret key, swaps the scrambled lists and scrambles them again;
          only values present on both sides end up identical, so only the overlap is revealed.</p>
        <p><b>Zero-knowledge proof (ZKP).</b> A way to prove a statement such as "the total moved exceeds the reported loss" without showing the underlying transactions.
          The backend has a prototype verifier (<code>backend/tarka/crypto/zkp_verifier.py</code>); it is not wired to this screen.</p>
        <p><b>Merkle root / SHA-256.</b> Fingerprints of the evidence files; any change to a file changes its fingerprint. Integrity checks for court
          (Section 63, Bharatiya Sakshya Adhiniyam certificate) live on Actions &amp; report.</p>
        <p>This screen is hidden unless Labs is switched on in the left rail, because it is not yet usable on a real case.</p>
      </TechnicalDetails>
    </div>
  );
};

export const PrivacyLabScreen = withActiveCase(PrivacyLabInner);
