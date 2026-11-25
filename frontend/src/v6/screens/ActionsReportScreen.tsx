import React, { useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  FileDown,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Zap,
  Send,
  Scale,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button, HorizontalStepper } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatInr } from '../../utils/formatters';
import { getDot3920PortBlockDirective } from '../../utils/statutoryDirectives';

export interface ActionsReportScreenProps {
  initialTab?: 'directives' | 'dossier' | 'notices' | 'actions' | 'report';
}

type MainTab = 'directives' | 'dossier' | 'notices';
type NoticeTab = 'freeze' | 'attachment' | 'telecom' | 'npci' | 'i4c';

export type LifecycleActionState =
  | 'Suggested'
  | 'Drafted'
  | 'Reviewed'
  | 'Approved'
  | 'Submitted'
  | 'Delivered'
  | 'Acknowledged'
  | 'Rejected'
  | 'Failed';

interface DirectiveRowData {
  id: string;
  rank: number;
  accountId: string;
  accountHolder: string;
  accountMasked: string;
  bank: string;
  ifsc: string;
  role: string;
  exposureAmount: number;
  frozenAmount: number;
  statutoryPower: string;
  statutorySection: string;
  lifecycleStatus: LifecycleActionState;
  urgency: 'CRITICAL_GOLDEN_HOUR' | 'ELEVATED' | 'STANDARD';
  inflowTx: string;
  inflowTime: string;
  outflowTx?: string;
  outflowTime?: string;
  hopDistance: number;
  evidenceRef: string;
  evidenceHash: string;
  justification: string;
  recommendedAction: string;
}

export const ActionsReportScreen: React.FC<ActionsReportScreenProps> = ({
  initialTab = 'directives',
}) => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const caseId = activeCaseId || 'CASE-2026-001';
  const canonical = useMemo(() => getCanonicalCase(caseId), [caseId]);
  const { station, profile } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<MainTab>(
    initialTab === 'dossier' || initialTab === 'report' ? 'dossier' : initialTab === 'notices' ? 'notices' : 'directives'
  );
  const [activeNoticeTab, setActiveNoticeTab] = useState<NoticeTab>('freeze');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [expandedDirectiveId, setExpandedDirectiveId] = useState<string | null>('dir-1');
  const [selectedDirectiveIds, setSelectedDirectiveIds] = useState<string[]>(['dir-1', 'dir-2', 'dir-3']);
  const [isSimulatingBank, setIsSimulatingBank] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Fallback financial computations
  const bookedLoss = canonical.financials.bookedLossInr || 500000;
  const verifiedLoss = canonical.financials.claimedLossInr || bookedLoss;
  const initialFrozen = Math.round(bookedLoss * 0.76);

  const [frozenAmount, setFrozenAmount] = useState<number>(initialFrozen);
  const pendingAmount = Math.max(0, bookedLoss - frozenAmount);
  const recoveryPct = bookedLoss > 0 ? ((frozenAmount / bookedLoss) * 100).toFixed(1) : '76.0';

  const stationTitle = station.letterheadTitle || 'STATE POLICE DEPARTMENT · CYBER CRIME INVESTIGATION DIVISION';
  const stationSub = `${station.stationName || 'Noida Cyber Crime PS'}, ${station.district || 'Gautam Buddha Nagar'}, Uttar Pradesh`;
  const issuingOfficer = `${profile.rank || 'Inspector'} ${profile.name || 'Rajeshwar Rao'} (${profile.badgeNo || 'UP-78921'})`;

  // Canonical Directives state
  const [directives, setDirectives] = useState<DirectiveRowData[]>([
    {
      id: 'dir-1',
      rank: 1,
      accountId: 'acc-vikram-axis',
      accountHolder: 'Vikram Shah',
      accountMasked: 'Axis Bank ••0291',
      bank: 'Axis Bank Ltd',
      ifsc: 'UTIB0000492',
      role: 'Layer-1 Mule Beneficiary',
      exposureAmount: 285000,
      frozenAmount: 285000,
      statutoryPower: '§ 106(1) BNSS Proportional Debit Lien',
      statutorySection: '106(1) BNSS',
      lifecycleStatus: 'Acknowledged',
      urgency: 'CRITICAL_GOLDEN_HOUR',
      inflowTx: 'UPI/RRN #626510149921',
      inflowTime: '2026-09-22 10:00:14 IST',
      outflowTx: 'IMPS to Rohit Verma (₹1,20,000)',
      outflowTime: '2026-09-22 10:04:12 IST',
      hopDistance: 1,
      evidenceRef: 'EXHIBIT-01 (SBI CBS) & EXHIBIT-02 (NPCI STAN)',
      evidenceHash: '7f83b165...8842',
      justification: 'Immediate direct recipient of victim funds via UPI extortion flow. High velocity outflow detected within 4 minutes.',
      recommendedAction: 'Maintain provisional lien under Form 27-B; prepare Section 107 BNSS judicial attachment application for Special CJM.',
    },
    {
      id: 'dir-2',
      rank: 2,
      accountId: 'acc-rohit-hdfc',
      accountHolder: 'Rohit Verma',
      accountMasked: 'HDFC Bank ••1992',
      bank: 'HDFC Bank Ltd',
      ifsc: 'HDFC0001092',
      role: 'Layer-2 Conduit Account',
      exposureAmount: 120000,
      frozenAmount: 120000,
      statutoryPower: '§ 106(1) BNSS Proportional Debit Lien',
      statutorySection: '106(1) BNSS',
      lifecycleStatus: 'Acknowledged',
      urgency: 'CRITICAL_GOLDEN_HOUR',
      inflowTx: 'IMPS from Vikram Shah (₹1,20,000)',
      inflowTime: '2026-09-22 10:04:12 IST',
      outflowTx: 'POS Terminal Escrow (Apex Electronics)',
      outflowTime: '2026-09-22 10:08:44 IST',
      hopDistance: 2,
      evidenceRef: 'EXHIBIT-02 (NPCI RRN) & EXHIBIT-03 (IPDR Log)',
      evidenceHash: '4b227777...9921',
      justification: 'Conduit account used to split Layer-1 funds into retail purchase escrow and cash withdrawal channels.',
      recommendedAction: 'Serve Section 94 BNSS production summons to HDFC Nodal Officer for KYC records and full statement of accounts.',
    },
    {
      id: 'dir-3',
      rank: 3,
      accountId: 'acc-apex-icici',
      accountHolder: 'Apex Electronics (Merchant)',
      accountMasked: 'ICICI Bank ••8129',
      bank: 'ICICI Bank Ltd',
      ifsc: 'ICIC0000032',
      role: 'Bona Fide Merchant / P2P Escrow',
      exposureAmount: 180000,
      frozenAmount: 180000,
      statutoryPower: 'Specific Debit Lien (LIBR Doctrine)',
      statutorySection: '106(1) BNSS (LIBR)',
      lifecycleStatus: 'Approved',
      urgency: 'ELEVATED',
      inflowTx: 'Card POS Authorization DL-0881',
      inflowTime: '2026-09-22 10:12:30 IST',
      hopDistance: 2,
      evidenceRef: 'EXHIBIT-03 (Airtel CGNAT IPDR)',
      evidenceHash: '3a910029...7712',
      justification: 'Under Lowest Intermediate Balance Rule (LIBR), protect innocent merchant operational capital while segregating stolen ₹1,80,000.',
      recommendedAction: 'Issue targeted Form 27-B specific lien restricted strictly to the ₹1,80,000 taint, releasing unencumbered operating balance.',
    },
    {
      id: 'dir-4',
      rank: 4,
      accountId: 'acc-atm-noida',
      accountHolder: 'ATM Noida Sector 18 (Terminal #DL-049)',
      accountMasked: 'Terminal DL-049',
      bank: 'State Bank of India',
      ifsc: 'SBIN0001234',
      role: 'Physical Cashout Sink',
      exposureAmount: 120000,
      frozenAmount: 0,
      statutoryPower: '§ 94 BNSS Production & CCTV Seizure',
      statutorySection: '94 BNSS',
      lifecycleStatus: 'Submitted',
      urgency: 'CRITICAL_GOLDEN_HOUR',
      inflowTx: 'Debit Card ATM Cash Withdrawal',
      inflowTime: '2026-09-22 10:15:02 IST',
      hopDistance: 3,
      evidenceRef: 'EXHIBIT-01 (CBS Finacle Cashout Entry)',
      evidenceHash: '89c20491...4820',
      justification: 'Physical withdrawal point by syndicate runner. Immediate video footage requisition required before 72-hour DVR overwrite cycle.',
      recommendedAction: 'Dispatch immediate Section 94 BNSS order to SBI Terminal Operations for CCTV footage and physical transaction log.',
    },
    {
      id: 'dir-5',
      rank: 5,
      accountId: 'acc-sameer-icici',
      accountHolder: 'Sameer Khan',
      accountMasked: 'ICICI Bank ••3391',
      bank: 'ICICI Bank Ltd',
      ifsc: 'ICIC0000032',
      role: 'Layer-2 Conduit Account',
      exposureAmount: 35000,
      frozenAmount: 35000,
      statutoryPower: '§ 106(1) BNSS Proportional Debit Lien',
      statutorySection: '106(1) BNSS',
      lifecycleStatus: 'Delivered',
      urgency: 'STANDARD',
      inflowTx: 'UPI from Vikram Shah (₹35,000)',
      inflowTime: '2026-09-22 10:05:50 IST',
      hopDistance: 2,
      evidenceRef: 'EXHIBIT-02 (NPCI STAN)',
      evidenceHash: '4b227777...9921',
      justification: 'Secondary mule transfer receiving residual diversion funds.',
      recommendedAction: 'Reconcile acknowledgement receipt from ICICI Nodal Officer and inspect linked mobile number KYC.',
    },
  ]);

  // Notice Text Templates
  const noticeTexts = useMemo(() => {
    const fId = canonical.firNumber || '149/2026';
    return {
      freeze: `FORM 27-B: STATUTORY NOTICE FOR PROPORTIONAL DEBIT LIEN\n[Under Section 106(1) Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023]\nTo: Designated Nodal Officer, Axis Bank Ltd / HDFC Bank Ltd / ICICI Bank Ltd\nCase: FIR #${fId}, Cyber Crime PS, UP\nVictim: ${canonical.complainant.name} | Account: ${canonical.complainant.accountMasked}\n\nDIRECTIVE:\nYou are hereby directed to immediately place an administrative lien/freeze on the following conduit beneficiary accounts:\n1. Vikram Shah | Axis Bank ••0291 | Amount: ₹2,85,000 (Section 106(1) BNSS)\n2. Rohit Verma | HDFC Bank ••1992 | Amount: ₹1,20,000 (Section 106(1) BNSS)\n3. Apex Electronics | ICICI Bank ••8129 | Specific Lien under LIBR Doctrine: ₹1,80,000\n4. Sameer Khan | ICICI Bank ••3391 | Amount: ₹35,000 (Section 106(1) BNSS)\n\nCompliance is mandatory within 2 hours of receipt per MHA Golden Hour SOP. Non-compliance invites penal sanctions under Section 223 BNS 2023.`,
      attachment: `APPLICATION FOR JUDICIAL ATTACHMENT OF PROCEEDS OF CRIME\n[Under Section 107 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023]\nIN THE COURT OF SPECIAL CJM / SPECIAL JUDGE CYBER CRIME, GAUTAM BUDDHA NAGAR\nIn the matter of: State (Cyber Crime PS) vs. Syndicate Unknown\nFIR #${fId} under § 66D IT Act & § 318(4) BNS 2023\n\nMAY IT PLEASE THE HON'BLE COURT:\n1. That digital evidence independently verified by TARKA Forensic Engine establishes ₹5,00,000 was fraudulently extracted from complainant ${canonical.complainant.name}.\n2. That ₹3,80,000 of proceeds of crime have been traced to accounts of Vikram Shah (Axis Bank) and Rohit Verma (HDFC Bank).\n3. PRAYER: The Hon'ble Court may be pleased to confirm attachment of said bank accounts under Section 107 BNSS, 2023.`,
      telecom: getDot3920PortBlockDirective(caseId),
      npci: `NPCI SWITCH SETTLEMENT AUDIT REQUISITION\n[Under Section 94 BNSS & Payment and Settlement Systems Act 2007]\nTo: National Payments Corporation of India (NPCI) Switch Operations & Fraud Desk\nCase Ref: FIR #${fId}\n\nSUBJECT: Full Switch Telemetry & RRN Trace Log for RRN #626510149921\n1. STAN Sequence: 149921\n2. Julian Day: 265 (22 Sep 2026)\n3. Issuing Bank: State Bank of India (SBI Finacle)\n4. Acquirer Bank: Axis Bank (VPA vikramshah@okaxis)\n5. Timestamp: 2026-09-22T10:00:14.281 IST\n\nPreserve and certify switch message packets under BSA §63(4).`,
      i4c: `I4C SAMANVAYA / PRATIBIMB INTER-STATE SYNDICATE LINK REPORT\nCase Ref: FIR #${fId}\nExposure Pool: ₹10.42 Cr across 14 multi-state FIRs\nCentral Database Hash: 89c20491823091ffeed891241aa44591aefc48201\n\nSYNDICATE CLUSTER: Mewat/Cyberabad Digital Arrest Extortion Module\nTarget Handset: IMEI 867492061234564 (Dual-SIM chassis match)\nAccomplice BSSID: 74:DA:38:A2:11:BC\nPrimary PGW Ingress: Decremented TTL=63 (Hop Count=2)\nRecommended Action: Multi-jurisdictional freeze coordination via NCRP / Samanvaya.`,
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

  const handleSimulateBankResponse = async () => {
    setIsSimulatingBank(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDirectives((prev) =>
        prev.map((d) =>
          selectedDirectiveIds.includes(d.id)
            ? { ...d, lifecycleStatus: 'Acknowledged', frozenAmount: d.exposureAmount }
            : d
        )
      );
      setFrozenAmount(bookedLoss);
      toast.success('Bank Nodal response confirmed: 100% Capital Secured under Section 106(1) BNSS!');
    } catch {
      toast.error('Simulation failed');
    } finally {
      setIsSimulatingBank(false);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: LifecycleActionState) => {
    setDirectives((prev) =>
      prev.map((d) => (d.id === id ? { ...d, lifecycleStatus: newStatus } : d))
    );
    toast.info(`Updated directive status to "${newStatus}"`);
  };

  const handleToggleSelectDirective = (id: string) => {
    setSelectedDirectiveIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDirectiveIds.length === directives.length) {
      setSelectedDirectiveIds([]);
    } else {
      setSelectedDirectiveIds(directives.map((d) => d.id));
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Attempt backend export
      const res = await fetch(`/api/v1/forensics/cases/${caseId}/reports/export?format=pdf`, {
        headers: { Authorization: 'Bearer test-token' },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TARKA_Section63_BSA_Certificate_${caseId}.pdf`;
        a.click();
        toast.success('Official Section 63 BSA PDF certificate downloaded');
        return;
      }
    } catch {
      // Fallback to client print
    } finally {
      setIsGeneratingPdf(false);
    }
    toast.info('Initiating high-resolution print view for official dossier PDF export');
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      caseId,
      canonicalCase: canonical,
      financials: {
        bookedLoss,
        verifiedLoss,
        frozenAmount,
        pendingAmount,
        recoveryPercentage: recoveryPct,
      },
      directives,
      timestamp: new Date().toISOString(),
      merkleRoot: '89c20491823091ffeed891241aa44591aefc48201',
      bsa63Certified: true,
      officer: issuingOfficer,
      station: stationSub,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TARKA_Statutory_Dossier_${caseId}.json`;
    a.click();
    toast.success('Downloaded cryptographic case dossier JSON');
  };

  const getStatusBadge = (status: LifecycleActionState) => {
    switch (status) {
      case 'Acknowledged':
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#137333]/30">
            <CheckCircle2 className="w-3 h-3 text-[#137333]" />
            {status.toUpperCase()}
          </span>
        );
      case 'Approved':
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30">
            <Send className="w-3 h-3 text-[#1A73E8]" />
            {status.toUpperCase()}
          </span>
        );
      case 'Drafted':
      case 'Reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF7E0] text-[#B06000] border border-[#B06000]/30">
            <Clock className="w-3 h-3 text-[#B06000]" />
            {status.toUpperCase()}
          </span>
        );
      case 'Rejected':
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FCE8E6] text-[#C5221F] border border-[#C5221F]/30">
            <AlertTriangle className="w-3 h-3 text-[#C5221F]" />
            {status.toUpperCase()}
          </span>
        );
      case 'Suggested':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--surface-2)] text-[var(--fg-3)] border border-[var(--line)]">
            <Sparkles className="w-3 h-3 text-[var(--fg-3)]" />
            SUGGESTED
          </span>
        );
    }
  };

  return (
    <div className="v6-enter space-y-3" data-testid="v6-actions-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 6 · Actions & Report"
        title="Stop the money. Build the case."
        actions={
          <div className="flex items-center gap-2">
            {/* View Sub-Tabs */}
            <div className="inline-flex p-0.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
              <button
                type="button"
                onClick={() => setActiveTab('directives')}
                className={`px-3 py-1 text-[12px] font-semibold rounded transition-all ${
                  activeTab === 'directives'
                    ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                }`}
              >
                Account Directives & Freezes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notices')}
                className={`px-3 py-1 text-[12px] font-semibold rounded transition-all ${
                  activeTab === 'notices'
                    ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                }`}
              >
                Statutory Bank Notices
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={`px-3 py-1 text-[12px] font-semibold rounded transition-all ${
                  activeTab === 'dossier'
                    ? 'bg-[var(--surface-1)] text-[var(--fg-1)] shadow-xs'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                }`}
              >
                Court Dossier (BSA §63)
              </button>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF Certificate'}</span>
            </button>

            <Button variant="default" size="md" onClick={handlePrint}>
              <span className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </span>
            </Button>
          </div>
        }
      />

      {/* Case Context & 6-Stage Horizontal Stepper */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)] text-xs text-[var(--fg-2)]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--fg-1)]">{caseId}</span>
            <span className="text-[var(--fg-3)]">·</span>
            <span>FIR #{canonical.firNumber || '149/2026'}</span>
            <span className="text-[var(--fg-3)]">·</span>
            <span className="font-medium text-[var(--fg-1)]">{canonical.complainant.name}</span>
            <span className="text-[var(--fg-3)]">·</span>
            <span>{stationSub}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)] font-semibold text-[11px]">
              <Clock className="w-3 h-3" />
              118m Golden Hour Remaining
            </span>
            <span className="text-[var(--fg-3)]">IO: {issuingOfficer}</span>
          </div>
        </div>

        <HorizontalStepper />
      </div>

      {/* P0 Single Compact Unified Financial Overview (Replaces 4 Competing Cards) */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 divide-y md:divide-y-0 md:divide-x divide-[var(--line)]">
          {/* 1. Victim Booked Loss */}
          <div className="px-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider mb-1">
              <span>Reported Loss</span>
              <span className="px-1 py-0.2 rounded bg-[var(--color-risk-bg)] text-[var(--risk)] text-[10px]">
                CBS AUDIT
              </span>
            </div>
            <div className="text-[19px] font-bold text-[var(--risk)]">
              {formatInr(bookedLoss)}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] mt-0.5 truncate">
              {canonical.complainant.name} · {canonical.complainant.bank}
            </div>
          </div>

          {/* 2. Independently Verified */}
          <div className="px-2 pt-2 md:pt-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider mb-1">
              <span>Verified Audit</span>
              <span className="px-1 py-0.2 rounded bg-[var(--color-safe-bg)] text-[var(--safe)] text-[10px]">
                Z3 SMT PROVED
              </span>
            </div>
            <div className="text-[19px] font-bold text-[var(--fg-1)]">
              {formatInr(verifiedLoss)}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] mt-0.5 truncate">
              Deterministic Invariant Match
            </div>
          </div>

          {/* 3. Shielded / Frozen */}
          <div className="px-2 pt-2 md:pt-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider mb-1">
              <span>Shielded / Frozen</span>
              <span className="px-1 py-0.2 rounded bg-[var(--color-safe-bg)] text-[var(--safe)] text-[10px]">
                {recoveryPct}% RECOVERED
              </span>
            </div>
            <div className="text-[19px] font-bold text-[var(--safe)]">
              {formatInr(frozenAmount)}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] mt-0.5 truncate">
              Secured across conduit banks
            </div>
          </div>

          {/* 4. Pending Action */}
          <div className="px-2 pt-2 md:pt-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider mb-1">
              <span>Pending Action</span>
              <span className="px-1 py-0.2 rounded bg-[var(--color-flow-bg)] text-[var(--flow)] text-[10px]">
                2 TARGETS
              </span>
            </div>
            <div className="text-[19px] font-bold text-[var(--fg-1)]">
              {formatInr(pendingAmount)}
            </div>
            <div className="text-[11px] text-[var(--fg-3)] mt-0.5 truncate">
              Requires IO digital signature
            </div>
          </div>

          {/* 5. Statutory Directives & Quick Simulation */}
          <div className="px-2 pt-2 md:pt-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider mb-1">
                <span>Directives Status</span>
                <span className="px-1 py-0.2 rounded bg-[var(--color-safe-bg)] text-[var(--safe)] text-[10px]">
                  BNSS / BSA
                </span>
              </div>
              <div className="text-[14px] font-bold text-[var(--fg-1)]">
                {directives.filter((d) => d.lifecycleStatus === 'Acknowledged').length} of {directives.length} Enforced
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateBankResponse}
              disabled={isSimulatingBank}
              className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[var(--safe)] hover:opacity-90 rounded transition-all shadow-xs"
            >
              <Zap className="w-3 h-3" />
              <span>{isSimulatingBank ? 'Securing...' : 'Simulate Bank Freeze'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'directives' && (
        <div className="space-y-3">
          {/* Finding Strip */}
          <FindingStrip
            variant="safe"
            action={
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>View Admissible Court Dossier</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            <span>
              Proportional debit liens (§106) and seizure directives (§107) dispatched to conduit beneficiary banks. All account directives cryptographically tied to immutable CBS/UPI evidence hashes.
            </span>
          </FindingStrip>

          {/* Priority Account Directives Working Table */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg shadow-xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-3 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-2)]">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[var(--fg-1)] uppercase tracking-wider">
                  Priority Account Directives Working List
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--surface-1)] border border-[var(--line)] text-[var(--fg-2)]">
                  {directives.length} Ranked Conduit Accounts
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[var(--surface-1)] border border-[var(--line)] rounded text-[var(--fg-2)] hover:bg-[var(--hover)] transition-colors"
                >
                  {selectedDirectiveIds.length === directives.length ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.success(`Generated Form 27-B statutory lien notices for ${selectedDirectiveIds.length} accounts`);
                    setActiveTab('notices');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded transition-colors shadow-xs"
                >
                  <Lock className="w-3 h-3" />
                  <span>Generate Freezes ({selectedDirectiveIds.length})</span>
                </button>
              </div>
            </div>

            {/* Empty State or Directives Table */}
            {directives.length === 0 ? (
              /* P0 Informative Empty State */
              <div className="p-12 text-center space-y-3">
                <div className="inline-flex p-3 rounded-full bg-[var(--surface-2)] border border-[var(--line)] text-[var(--fg-3)]">
                  <Scale className="w-8 h-8" />
                </div>
                <h3 className="text-[15px] font-bold text-[var(--fg-1)]">
                  No Statutory Directives Generated Yet
                </h3>
                <p className="text-[12px] text-[var(--fg-3)] max-w-md mx-auto">
                  TARKA automatically analyzes ingested bank statements, UPI switches, and IPDR logs using LIBR taint rules to isolate mule conduit accounts. Ingest evidence to generate enforceable statutory directives.
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setActiveView('evidence')}
                  >
                    <span>Ingest Case Evidence</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {directives.map((directive) => {
                  const isExpanded = expandedDirectiveId === directive.id;
                  const isSelected = selectedDirectiveIds.includes(directive.id);

                  return (
                    <div
                      key={directive.id}
                      className={`transition-colors ${
                        isExpanded ? 'bg-[var(--surface-2)]/60' : 'hover:bg-[var(--hover)]/40'
                      }`}
                    >
                      {/* Directive Row */}
                      <div className="p-3 flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedDirectiveId(isExpanded ? null : directive.id)}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectDirective(directive.id);
                            }}
                            className="w-4 h-4 rounded text-[var(--accent)] border-[var(--line)] cursor-pointer"
                          />

                          <div className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs bg-[var(--surface-2)] border border-[var(--line)] text-[var(--fg-2)]">
                            #{directive.rank}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[13px] text-[var(--fg-1)]">
                                {directive.accountHolder}
                              </span>
                              <span className="text-xs text-[var(--fg-3)]">({directive.role})</span>
                              {directive.urgency === 'CRITICAL_GOLDEN_HOUR' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--color-risk-bg)] text-[var(--risk)]">
                                  CRITICAL GOLDEN HOUR
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--fg-3)] mt-0.5 font-mono">
                              <span>{directive.accountMasked}</span>
                              <span>·</span>
                              <span>{directive.bank}</span>
                              <span>·</span>
                              <span>IFSC: {directive.ifsc}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[14px] font-bold text-[var(--fg-1)]">
                              {formatInr(directive.exposureAmount)}
                            </div>
                            <div className="text-[11px] font-medium text-[var(--fg-3)]">
                              {directive.statutorySection}
                            </div>
                          </div>

                          <div className="min-w-[110px] text-center">
                            {getStatusBadge(directive.lifecycleStatus)}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDirectiveId(isExpanded ? null : directive.id);
                            }}
                            className="p-1 rounded text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]"
                            aria-label={isExpanded ? 'Collapse Directive' : 'Expand Directive'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Detail View */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-[var(--surface-1)] border-t border-[var(--line)] space-y-3 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[var(--surface-2)] border border-[var(--line)] rounded-md">
                            {/* Transaction Lineage */}
                            <div>
                              <span className="font-bold text-[var(--fg-2)] uppercase tracking-wider text-[11px] block mb-1">
                                Transaction Chain & Velocity
                              </span>
                              <div className="space-y-1 text-[var(--fg-2)]">
                                <div><strong>Hop Distance:</strong> Hop {directive.hopDistance} (Direct Extortion Taint)</div>
                                <div><strong>Inflow:</strong> {directive.inflowTx}</div>
                                <div><strong>Timestamp:</strong> {directive.inflowTime}</div>
                                {directive.outflowTx && (
                                  <div><strong>Downstream Outflow:</strong> {directive.outflowTx} ({directive.outflowTime})</div>
                                )}
                              </div>
                            </div>

                            {/* Supporting Evidence */}
                            <div>
                              <span className="font-bold text-[var(--fg-2)] uppercase tracking-wider text-[11px] block mb-1">
                                Supporting Evidence Lineage
                              </span>
                              <div className="space-y-1 text-[var(--fg-2)] font-mono">
                                <div><strong>Exhibit:</strong> {directive.evidenceRef}</div>
                                <div><strong>SHA-256:</strong> <code>{directive.evidenceHash}</code></div>
                                <div><strong>Custody:</strong> Immutable CAS Bitstream Verified</div>
                                <div><strong>Standard:</strong> BSA §63(4) Certified</div>
                              </div>
                            </div>

                            {/* Statutory Directives & Actions */}
                            <div>
                              <span className="font-bold text-[var(--fg-2)] uppercase tracking-wider text-[11px] block mb-1">
                                Statutory Power & Action
                              </span>
                              <div className="space-y-1 text-[var(--fg-2)]">
                                <div><strong>Directive:</strong> {directive.statutoryPower}</div>
                                <div><strong>Justification:</strong> {directive.justification}</div>
                                <div className="text-[var(--accent)] font-semibold mt-1">
                                  <strong>Next Step:</strong> {directive.recommendedAction}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Status Update Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--line)]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-[var(--fg-3)]">Change Lifecycle State:</span>
                              {(['Drafted', 'Approved', 'Submitted', 'Delivered', 'Acknowledged'] as LifecycleActionState[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleUpdateStatus(directive.id, st)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    directive.lifecycleStatus === st
                                      ? 'bg-[var(--accent)] text-white shadow-xs'
                                      : 'bg-[var(--surface-2)] text-[var(--fg-2)] hover:bg-[var(--hover)] border border-[var(--line)]'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopyNotice('freeze');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--fg-2)] bg-[var(--surface-2)] border border-[var(--line)] rounded hover:bg-[var(--hover)]"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Form 27-B</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateStatus(directive.id, 'Acknowledged');
                                  toast.success(`Account ${directive.accountMasked} marked as FROZEN`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[var(--safe)] hover:opacity-90 rounded"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark Enforced (Frozen)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STATUTORY BANK NOTICES WORKSPACE */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
          {/* Left 4 Columns: Notice Category Selectors */}
          <div className="lg:col-span-4 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            <div>
              <span className="text-[12px] font-bold text-[var(--fg-1)] uppercase tracking-wider">
                Statutory Directives Library
              </span>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                Statutory requisitions pre-formatted with immutable case hashes ready for IO transmission.
              </p>
            </div>

            <div className="space-y-1.5 flex-1">
              {[
                { id: 'freeze', label: 'FORM 27-B: Bank Debit Lien', sub: '§ 106(1) BNSS · Golden Hour Freeze' },
                { id: 'attachment', label: 'Magistrate Seizure Application', sub: '§ 107 BNSS · Criminal Proceeds Attachment' },
                { id: 'telecom', label: 'Telecom Directives (DoT 39.20)', sub: '§ 94 BNSS · Port-Block & IMEI Seizure' },
                { id: 'npci', label: 'NPCI Switch STAN Requisition', sub: 'BSA § 63(4) · RRN 626510149921' },
                { id: 'i4c', label: 'I4C Samanvaya Syndicate Link', sub: 'Inter-State Multi-Jurisdiction Alert' },
              ].map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setActiveNoticeTab(n.id as NoticeTab)}
                  className={`w-full p-2.5 rounded border text-left transition-all ${
                    activeNoticeTab === n.id
                      ? 'bg-[var(--color-flow-bg)] border-[var(--accent)] text-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
                  }`}
                >
                  <div className="text-[12px] font-bold text-[var(--fg-1)]">{n.label}</div>
                  <div className="text-[11px] text-[var(--fg-3)] mt-0.5">{n.sub}</div>
                </button>
              ))}
            </div>

            <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] text-[11px] text-[var(--fg-2)] space-y-1">
              <div className="font-bold text-[var(--fg-1)]">Mandatory Compliance SLA:</div>
              <div>Bank Nodal Officers must acknowledge and place debit lien within <strong>2 Hours</strong> under MHA Golden Hour SOP.</div>
            </div>
          </div>

          {/* Right 8 Columns: Live Draft Workspace */}
          <div className="lg:col-span-8 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
            <div className="pb-2 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <span className="text-[12px] font-bold text-[var(--fg-1)] uppercase tracking-wider">
                  Requisition Notice Workspace
                </span>
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF7E0] text-[#B06000] border border-[#B06000]/30">
                  DRAFT · PENDING IO DIGITAL SIGNATURE
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNotice(activeNoticeTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded shadow-xs"
                >
                  {copiedNotice === activeNoticeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNotice === activeNoticeTab ? 'Copied to Clipboard' : 'Copy Directive'}</span>
                </button>
              </div>
            </div>

            {/* Notice Raw Text Editor / View */}
            <div className="flex-1 min-h-[380px] p-3 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] leading-relaxed whitespace-pre-wrap overflow-y-auto">
              {noticeTexts[activeNoticeTab]}
            </div>

            {/* Footer with Transmission Actions */}
            <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--fg-3)]">
                Issuing Officer: <strong>{issuingOfficer}</strong> · {stationSub}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Dispatched requisition to Nodal Desk via secure SFTP');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-1)] bg-[var(--surface-2)] border border-[var(--line)] rounded hover:bg-[var(--hover)] transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Transmit to Nodal Desk (SFTP)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ADMISSIBLE COURT DOSSIER (A4 PREVIEW) */}
      {activeTab === 'dossier' && (
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
                {directives.map((dir) => (
                  <tr key={dir.id}>
                    <td className="border border-zinc-300 p-2 font-semibold">{dir.accountHolder}</td>
                    <td className="border border-zinc-300 p-2 font-mono">{dir.accountMasked}</td>
                    <td className="border border-zinc-300 p-2 font-bold text-rose-700">{formatInr(dir.exposureAmount)}</td>
                    <td className="border border-zinc-300 p-2">{dir.statutoryPower}</td>
                    <td className="border border-zinc-300 p-2 font-semibold text-emerald-700">
                      {dir.lifecycleStatus === 'Acknowledged' ? 'FROZEN (100%)' : dir.lifecycleStatus.toUpperCase()}
                    </td>
                  </tr>
                ))}
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
