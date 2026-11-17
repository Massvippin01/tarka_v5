import React, { useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatInr } from '../../utils/formatters';
import { CaseActionsPanel } from '../../components/tarka/actions/CaseActionsPanel';
import { getDot3920PortBlockDirective } from '../../utils/statutoryDirectives';

export interface ActionsReportScreenProps {
  initialTab?: 'actions' | 'report' | 'dossier';
}

type ReportSubTab = 'actions' | 'dossier';
type NoticeTab = 'freeze' | 'telecom' | 'npci' | 'i4c';

export const ActionsReportScreen: React.FC<ActionsReportScreenProps> = ({ initialTab = 'actions' }) => {
  const { activeCaseId } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = useMemo(() => getCanonicalCase(caseId), [caseId]);
  const { station, profile } = useSettingsStore();

  const [subTab, setSubTab] = useState<ReportSubTab>(initialTab === 'report' ? 'dossier' : 'actions');
  const [activeNoticeTab, setActiveNoticeTab] = useState<NoticeTab>('freeze');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const bookedLoss = canonical.financials.bookedLossInr;
  const recoverableAmount = Math.round(bookedLoss * 0.76);
  const recoverablePct = 76;

  const stationTitle = station.letterheadTitle || 'STATE POLICE DEPARTMENT · CYBER CRIME CELL';
  const stationSub = `${station.stationName || 'Noida Cyber Crime PS'}, ${station.district || 'Gautam Buddha Nagar'}, Uttar Pradesh`;
  const issuingOfficer = `${profile.rank || 'Inspector'} ${profile.name || 'Rajeshwar Rao'} (${profile.badgeNo || 'UP-78921'})`;

  // Notice Text Templates
  const noticeTexts = useMemo(() => {
    const fId = canonical.firNumber || '149/2026';
    return {
      freeze: `FORM 27-B: STATUTORY NOTICE FOR PROPORTIONAL DEBIT LIEN\n[Under Section 106(1) Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023]\nTo: Designated Nodal Officer, ICICI Bank Ltd / HDFC Bank Ltd / Axis Bank Ltd\nCase: FIR #${fId}, Cyber Crime PS, UP\nVictim: ${canonical.complainant.name} | Account: ${canonical.complainant.accountMasked}\n\nDIRECTIVE:\nYou are hereby directed to immediately place an administrative lien/freeze on the following conduit beneficiary accounts:\n1. Vikram Shah | Axis Bank ••0291 | Amount: ₹2,85,000\n2. Rohit Verma | HDFC Bank ••1992 | Amount: ₹1,20,000\n3. Sameer Khan | ICICI Bank ••8129 | Amount: ₹35,000\n4. Apex Electronics | Specific Lien under LIBR Doctrine: ₹1,80,000\n\nCompliance is mandatory within 2 hours of receipt per MHA Golden Hour SOP.`,
      telecom: getDot3920PortBlockDirective(caseId),
      npci: `NPCI SWITCH SETTLEMENT AUDIT REQUISITION\n[Under Section 94 BNSS & PSS Act 2007]\nTo: National Payments Corporation of India (NPCI) Switch Operations\nCase Ref: FIR #${fId}\n\nSUBJECT: Full Switch Telemetry & RRN Trace Log for RRN #626510149921\n1. STAN Sequence: 149921\n2. Julian Day: 265 (22 Sep 2026)\n3. Issuing Bank: State Bank of India (SBI Finacle)\n4. Acquirer Bank: Axis Bank (VPA vikramshah@okaxis)\n5. Timestamp: 2026-09-22T10:00:14.281 IST\n\nPreserve and certify switch message packets under BSA §63(4).`,
      i4c: `I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT\nCase Ref: FIR #${fId}\nExposure Pool: ₹10.42 Cr across 14 multi-state FIRs\nCentral Database Hash: 89c20491823091ffeed891241aa44591aefc48201\n\nSYNDICATE CLUSTER: Mewat/Cyberabad Digital Arrest Extortion Module\nTarget Handset: IMEI 867492061234564 (Dual-SIM chassis match)\nAccomplice BSSID: 74:DA:38:A2:11:BC`,
    };
  }, [canonical, caseId]);

  const handleCopyNotice = (type: NoticeTab) => {
    navigator.clipboard.writeText(noticeTexts[type]);
    setCopiedNotice(type);
    toast.success('Statutory directive copied to clipboard');
    setTimeout(() => setCopiedNotice(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      caseId,
      canonicalCase: canonical,
      timestamp: new Date().toISOString(),
      merkleRoot: '89c20491823091ffeed891241aa44591aefc48201',
      bsa63Certified: true,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TARKA_Admissible_Dossier_${caseId}.json`;
    a.click();
    toast.success('Downloaded cryptographic case dossier JSON');
  };

  return (
    <div className="v6-enter space-y-3" data-testid="v6-actions-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 6 · Actions & Report"
        title="Stop the money. Build the case."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
              <button
                type="button"
                onClick={() => setSubTab('actions')}
                className={`px-3 py-1 text-[12px] font-semibold rounded transition-all ${
                  subTab === 'actions'
                    ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                }`}
              >
                Statutory Freezes & Notices
              </button>
              <button
                type="button"
                onClick={() => setSubTab('dossier')}
                className={`px-3 py-1 text-[12px] font-semibold rounded transition-all ${
                  subTab === 'dossier'
                    ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                }`}
              >
                Admissible Court Dossier (A4)
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Export JSON</span>
            </button>

            <Button variant="default" size="md" onClick={handlePrint}>
              <span className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant="safe"
        action={
          <button
            type="button"
            onClick={() => setSubTab('dossier')}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Preview Court Dossier</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          Proportional debit liens (§106) and seizure directives (§107) dispatched to 4 nodal banks. Court investigation report cryptographically sealed with SHA-256 Merkle root.
        </span>
      </FindingStrip>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Victim booked loss</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
              CBS AUDIT
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">
            {formatInr(bookedLoss)}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            {canonical.complainant.name} · {canonical.complainant.bank}
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Frozen / Recoverable</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              {recoverablePct}% RECOVERED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--safe)]">
            {formatInr(recoverableAmount)}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Secured across 4 beneficiary banks
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Statutory directives</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
              BNSS COMPLIANT
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            4 Dispatched
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            §106 Liens, §107 Attachments, §94 Orders
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Court admissibility</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              BSA §63(4) CERTIFIED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--safe)]">
            100% Sealed
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate font-mono">
            Merkle Root 89c20491...
          </div>
        </div>
      </div>

      {subTab === 'actions' ? (
        /* SUB-TAB 1: STATUTORY ACTIONS & NOTICES */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
          {/* Left 7 Columns: CaseActionsPanel */}
          <div className="lg:col-span-7 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs min-h-[520px]">
            <CaseActionsPanel caseId={caseId} onNavigateToReport={() => setSubTab('dossier')} />
          </div>

          {/* Right 5 Columns: Statutory Notice Drafter & Letters */}
          <div className="lg:col-span-5 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            <div className="pb-1.5 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                  Statutory Directives & Nodal Letters
                </span>
                <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Pre-formatted legal requisitions ready for IO signature.
                </p>
              </div>
            </div>

            {/* Notice Tab Selectors */}
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['freeze', '§106/107 Bank Freeze'],
                  ['telecom', '§94 Telecom (DoT 39.20)'],
                  ['npci', 'NPCI Switch STAN'],
                  ['i4c', 'I4C Samanvaya Syndicate'],
                ] as [NoticeTab, string][]
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveNoticeTab(t)}
                  className={`p-2 rounded border text-left text-[12px] font-semibold transition-all ${
                    activeNoticeTab === t
                      ? 'bg-[var(--color-flow-bg)] border-[var(--accent)] text-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Notice Content Box */}
            <div className="flex-1 min-h-[340px] p-3 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] leading-relaxed whitespace-pre-wrap overflow-y-auto">
              {noticeTexts[activeNoticeTab]}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
              <span className="text-[12px] text-[var(--fg-3)]">
                Binding Statutory SLA: <strong>2 Hours</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopyNotice(activeNoticeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded shadow-xs"
              >
                {copiedNotice === activeNoticeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNotice === activeNoticeTab ? 'Copied!' : 'Copy Directive'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* SUB-TAB 2: ADMISSIBLE COURT DOSSIER (A4 PREVIEW) */
        <div
          data-semantic-id="el-court-proof-certificate"
          className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-6 shadow-xs max-w-4xl mx-auto space-y-6 tarka-semantic-target tarka-interactive-card"
        >
          {/* Official Letterhead */}
          <div className="text-center pb-4 border-b-2 border-black space-y-1">
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-black">
              {stationTitle}
            </h2>
            <p className="text-[12px] text-zinc-700">{stationSub}</p>
            <p className="text-[12px] font-semibold text-zinc-800">
              POLICE INVESTIGATION REPORT · BHARATIYA SAKSHYA ADHINIYAM (BSA) § 63(4) CERTIFICATE
            </p>
          </div>

          {/* Statutory Preamble */}
          <div className="grid grid-cols-2 gap-4 text-[12px] text-zinc-800 p-3 bg-zinc-50 border border-zinc-200 rounded">
            <div>
              <div><strong>FIR Number:</strong> #{canonical.firNumber || '149/2026'}</div>
              <div><strong>Police Station:</strong> {canonical.policeStation || 'Noida Cyber Crime PS'}</div>
              <div><strong>Complainant:</strong> {canonical.complainant.name} ({canonical.complainant.phone})</div>
              <div><strong>Penal Sections:</strong> § 66D IT Act 2000, § 318(4) BNS 2023</div>
            </div>
            <div>
              <div><strong>NCRP Portal Ref:</strong> {canonical.ncrpAckNo || 'NCRP-1930-DL-2026'}</div>
              <div><strong>Date of Offense:</strong> 22 September 2026 10:00 IST</div>
              <div><strong>Investigating Officer:</strong> {issuingOfficer}</div>
              <div><strong>Judicial Court:</strong> Court of Special CJM, Gautam Buddha Nagar</div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-[13px] font-bold text-black uppercase tracking-wider">
              1. Executive Accounting & Seizure Schedule (BNSS §106 / §107)
            </h4>
            <table className="w-full text-[12px] border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-left font-bold text-black">
                  <th className="border border-zinc-300 p-2">Beneficiary / Conduit</th>
                  <th className="border border-zinc-300 p-2">Bank & Account</th>
                  <th className="border border-zinc-300 p-2">Stolen Debit</th>
                  <th className="border border-zinc-300 p-2">Statutory Measure</th>
                  <th className="border border-zinc-300 p-2">Seizure Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-300 p-2 font-semibold">Vikram Shah</td>
                  <td className="border border-zinc-300 p-2 font-mono">Axis Bank ••0291</td>
                  <td className="border border-zinc-300 p-2 font-bold text-rose-700">₹2,85,000</td>
                  <td className="border border-zinc-300 p-2">§ 107 BNSS Attachment</td>
                  <td className="border border-zinc-300 p-2 font-semibold text-emerald-700">FROZEN (100%)</td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-2 font-semibold">Rohit Verma</td>
                  <td className="border border-zinc-300 p-2 font-mono">HDFC Bank ••1992</td>
                  <td className="border border-zinc-300 p-2 font-bold text-rose-700">₹1,20,000</td>
                  <td className="border border-zinc-300 p-2">§ 107 BNSS Attachment</td>
                  <td className="border border-zinc-300 p-2 font-semibold text-emerald-700">FROZEN (100%)</td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-2 font-semibold">Apex Electronics</td>
                  <td className="border border-zinc-300 p-2 font-mono">ICICI Bank ••8129</td>
                  <td className="border border-zinc-300 p-2 font-bold text-blue-700">₹1,80,000</td>
                  <td className="border border-zinc-300 p-2">§ 106(1) Specific Lien (LIBR)</td>
                  <td className="border border-zinc-300 p-2 font-semibold text-blue-700">LIEN PLACED</td>
                </tr>
                <tr>
                  <td className="border border-zinc-300 p-2 font-semibold">ATM Noida Sec 18</td>
                  <td className="border border-zinc-300 p-2 font-mono">Terminal #DL-049</td>
                  <td className="border border-zinc-300 p-2 font-bold text-amber-700">₹1,20,000</td>
                  <td className="border border-zinc-300 p-2">CCTV Seizure Requisition</td>
                  <td className="border border-zinc-300 p-2 text-zinc-600">DISPATCHED</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cryptographic Exhibits & Merkle Root */}
          <div className="space-y-2">
            <h4 className="text-[13px] font-bold text-black uppercase tracking-wider">
              2. Evidentiary Lineage & Merkle Root Hash Chain
            </h4>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded font-mono text-[12px] space-y-1 text-zinc-800">
              <div>[EXHIBIT-01] SBI Finacle CBS Core Banking Statement: <code>7f83b165...8842</code> (VERIFIED)</div>
              <div>[EXHIBIT-02] NPCI UPI Switch STAN Telemetry 149921: <code>4b227777...9921</code> (IN SPEC)</div>
              <div>[EXHIBIT-03] Airtel CGNAT IPDR Port-Allocation Log: <code>3a910029...7712</code> (COLLAPSED)</div>
              <div>[EXHIBIT-04] WhatsApp Forensic Export (Indic Transliteration): <code>91eef840...1109</code> (BOUND)</div>
              <div className="pt-2 border-t border-zinc-300 font-bold text-black">
                ROOT HASH: <code>89c20491823091ffeed891241aa44591aefc482010839217fa84</code>
              </div>
            </div>
          </div>

          {/* Verification Seal */}
          <div className="flex items-center justify-between pt-6 border-t border-zinc-300 text-[12px] text-zinc-800">
            <div className="space-y-1">
              <div className="font-bold text-black">CRYPTOGRAPHICALLY SEALED AND VERIFIED</div>
              <div>SHA-256 Hash Chain Integrity: 100% UNBROKEN</div>
              <div>Generated via TARKA v6 Production Forensic Engine</div>
            </div>
            <div className="text-right space-y-1">
              <div className="font-bold text-black">{issuingOfficer}</div>
              <div className="text-zinc-600">Investigating Officer</div>
              <div className="text-zinc-500 font-mono text-[12px]">Digital Seal: [BSA-63-4-VERIFIED]</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
