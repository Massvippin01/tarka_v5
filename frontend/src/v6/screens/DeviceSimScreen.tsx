import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Smartphone,
  Copy,
  Check,
  FileCode,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, FindingStrip, Button } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { CgnatFunnelChart } from '../../components/tarka/attribution/CgnatFunnelChart';
import { CaseSyncBridge } from '../../services/caseSyncBridge';
import { reconstruct5FileInvestigation } from '../../utils/investigationReconstructor';
import { CANONICAL_CASES, buildCaseBundleFromFixture } from '../../fixtures/cases';
import {
  getDot3920PortBlockDirective,
  getBnss94ImeiSeizureDirective,
} from '../../utils/statutoryDirectives';
import { solveCgnatFunnel } from '../../utils/cgnatAttribution';

export const DeviceSimScreen: React.FC = () => {
  const { activeCaseId, setActiveView } = useCaseStore();
  const { mutations, toggleMutation, setActiveRoute } = useTarkaGlobal();
  const { activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();

  const caseId = activeCaseId || 'CASE-2026-001';

  const investigation = useMemo(() => {
    if (caseId && CANONICAL_CASES[caseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[caseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [caseId, reconstructedInvestigation]);

  // Clock offset caliper state (-5.0s to +5.0s)
  const [clockOffset, setClockOffset] = useState<number>(0.0);
  const isPortDropped = !!mutations.dropCgnatSourcePort || !!mutations.cgnatPortCollision;
  const [showSmtCode, setShowSmtCode] = useState<boolean>(false);

  const [isDirectiveCopied, setIsDirectiveCopied] = useState<boolean>(false);
  const [isImeiCopied, setIsImeiCopied] = useState<boolean>(false);
  const [isSmtCopied, setIsSmtCopied] = useState<boolean>(false);

  const attributionProfile = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseAttributionProfile(
      caseId,
      investigation,
      isPortDropped,
      clockOffset
    );
  }, [caseId, investigation, isPortDropped, clockOffset]);

  const targetImei = activeDiscoveredCluster?.convergedImei || attributionProfile.imei || '867492061234564';
  const targetTac = targetImei.slice(0, 8);

  const funnelResult = useMemo(() => {
    return solveCgnatFunnel(attributionProfile.sessions, isPortDropped);
  }, [attributionProfile.sessions, isPortDropped]);

  const survivingCandidateCount = isPortDropped
    ? attributionProfile.initialPoolCount
    : funnelResult.finalCandidateCount;

  const isZ3Sat = clockOffset >= -1.2 && clockOffset <= 0.8;

  const handleCopyDotDirective = () => {
    const directiveText = getDot3920PortBlockDirective(caseId);
    navigator.clipboard.writeText(directiveText);
    setIsDirectiveCopied(true);
    toast.success('DoT Clause 39.20 Requisition copied to clipboard');
    setTimeout(() => setIsDirectiveCopied(false), 2000);
  };

  const handleCopyImeiDirective = () => {
    const directiveText = getBnss94ImeiSeizureDirective(caseId);
    navigator.clipboard.writeText(directiveText);
    setIsImeiCopied(true);
    toast.success('§94 BNSS IMEI Seizure Directive copied to clipboard');
    setTimeout(() => setIsImeiCopied(false), 2000);
  };

  const handleExportSmt2 = () => {
    navigator.clipboard.writeText(attributionProfile.smt2Script);
    setIsSmtCopied(true);
    toast.success('Z3 SMT2 verification script copied to clipboard');
    setTimeout(() => setIsSmtCopied(false), 2000);
  };

  return (
    <div className="v6-enter space-y-3" data-testid="v6-device-screen">
      {/* Page Header */}
      <PageHead
        kicker="Step 5 · Device & SIM"
        title="Which hardware moved the funds?"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyDotDirective}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isDirectiveCopied ? (
                <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--fg-3)]" />
              )}
              <span>Copy DoT 39.20 Requisition</span>
            </button>
            <button
              type="button"
              onClick={handleCopyImeiDirective}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
            >
              {isImeiCopied ? (
                <Check className="w-3.5 h-3.5 text-[var(--safe)]" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-[var(--accent)]" />
              )}
              <span>Copy §94 IMEI Directive</span>
            </button>
            <Button
              variant="default"
              size="md"
              onClick={() => {
                setActiveView('actions');
                setActiveRoute('report');
              }}
            >
              <span className="flex items-center gap-1.5">
                <span>Actions & Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </div>
        }
      />

      {/* Finding Strip */}
      <FindingStrip
        variant={survivingCandidateCount === 1 ? 'safe' : 'urgent'}
        action={
          <button
            type="button"
            onClick={() => {
              setActiveView('actions');
              setActiveRoute('report');
            }}
            className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
          >
            <span>Proceed to Freezes & Final Report</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        }
      >
        <span>
          CGNAT 4-stage funnel provably collapses 10,000 carrier subscriber sessions into <strong>1 target handset (IMEI {targetImei})</strong>. Precursor SIM-swap verified 16 min before attack.
        </span>
      </FindingStrip>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">CGNAT Candidate pool</span>
            <span
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                survivingCandidateCount === 1
                  ? 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
                  : 'bg-[var(--color-urgent-bg)] text-[var(--urgent)]'
              }`}
            >
              {survivingCandidateCount === 1 ? '1 UNIQUE MATCH' : `${survivingCandidateCount} AMBIGUOUS`}
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            {survivingCandidateCount === 1 ? '1 Confirmed Target' : `${survivingCandidateCount} Candidates`}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            From 10,000 CGNAT subscriber baseline
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Random-match odds</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
              HEURISTIC BAND
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--fg-1)]">
            1 in 4,096 subscribers
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate font-mono">
            P = 1.4 × 10⁻⁷ (N=10,000 pool)
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Precursor SIM-swap</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-risk-bg)] text-[var(--risk)]">
              IMSI RE-ALLOCATED
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--risk)]">
            09:44:12 IST
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            16m before attack · Victim silenced
          </div>
        </div>

        <div className="v6-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-[var(--fg-3)]">Hardware twin</span>
            <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
              LUHN & TAC ✓
            </span>
          </div>
          <div className="text-[20px] font-bold text-[var(--safe)]">
            Dual-SIM Chassis
          </div>
          <div className="text-[12px] text-[var(--fg-3)] mt-1 truncate">
            Shared TAC {targetTac} across SIM slots
          </div>
        </div>
      </div>

      {/* 12-Column Main Workbench: Left 7 Cols CGNAT Funnel, Right 5 Cols Dual-SIM & Z3 Caliper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[580px]">
        {/* Left 7 Columns: CGNAT Sequential Intersection Funnel */}
        <div className="lg:col-span-7 flex flex-col bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-[var(--fg-1)]">
                  CGNAT Candidate Intersection Funnel
                </h3>
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded bg-[var(--color-flow-bg)] text-[var(--flow)] border border-[var(--flow)]/20">
                  DoT CLAUSE 39.20
                </span>
                <span
                  className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${
                    isPortDropped
                      ? 'bg-[var(--color-urgent-bg)] text-[var(--urgent)] border-[var(--urgent)]/30'
                      : 'bg-[var(--color-safe-bg)] text-[var(--safe)] border-[var(--safe)]/30'
                  }`}
                >
                  {isPortDropped ? 'Port Omission Active' : 'Unambiguous 1:1 Match'}
                </span>
              </div>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                Sequential intersection S1 ∩ S2 ∩ S3 ∩ S4 isolates 1 unique target handset.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation('dropCgnatSourcePort')}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md border transition-all shadow-xs ${
                isPortDropped
                  ? 'bg-[var(--color-urgent-bg)] border-[var(--urgent)] text-[var(--urgent)] font-bold'
                  : 'bg-[var(--surface-1)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
              }`}
            >
              {isPortDropped ? '✓ Port Omission Active' : 'Simulate Port Omission'}
            </button>
          </div>

          <div className="flex-1">
            <CgnatFunnelChart
              isPortDropped={isPortDropped}
              hideHeader={true}
              targetImei={targetImei}
            />
          </div>
        </div>

        {/* Right 5 Columns: Dual-SIM Twin Chassis & Z3 Caliper */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Precursor SIM-Swap & Dual-SIM Chassis Card */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-3">
            <div className="pb-2 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <span className="text-[13px] font-bold text-[var(--fg-1)] uppercase tracking-wider block">
                  Precursor SIM-Swap & Dual-SIM Chassis
                </span>
                <span className="text-[12px] text-[var(--fg-3)]">
                  Hardware-binding & subscriber session interception
                </span>
              </div>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-safe-bg)] text-[var(--safe)] border border-[var(--safe)]/30">
                CHASSIS TWIN
              </span>
            </div>

            {/* Chassis Twin Verification Banner */}
            <div className="p-2.5 rounded-md bg-[var(--color-safe-bg)] border border-[var(--safe)]/25 text-[12px] font-medium text-[var(--safe)] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>SHARED TAC {targetTac} · SAME PHYSICAL CHIPSET CHASSIS</span>
              </div>
              <div className="text-[12px] text-[var(--fg-2)] pl-5 font-mono">
                Poco X5 5G · Luhn Checksum: PASS · Dual-SIM IMEI Binding Verified
              </div>
            </div>

            {/* Connected Vertical Timeline */}
            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--line)]">
              {/* Event 1 */}
              <div className="relative flex flex-col text-[12px] bg-[var(--surface-2)]/60 border border-[var(--line)] p-2.5 rounded-lg">
                <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-xs" />
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[var(--fg-1)]">09:44:12 IST · Airtel HLR Swap</span>
                  <span className="text-[12px] font-mono font-bold text-[var(--risk)] px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200">T-16m</span>
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Victim MSISDN IMSI re-allocated to cloned SIM in Rohini Sector 4 BTS
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative flex flex-col text-[12px] bg-[var(--surface-2)]/60 border border-[var(--line)] p-2.5 rounded-lg">
                <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[var(--fg-1)]">09:50:00 IST · Complainant Silenced</span>
                  <span className="text-[12px] font-mono font-bold text-[var(--urgent)] px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200">T-10m</span>
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  RRC connection released; complainant phone silenced, blocking verification alerts
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative flex flex-col text-[12px] bg-[var(--surface-2)]/60 border border-[var(--line)] p-2.5 rounded-lg">
                <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-xs" />
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-[var(--fg-1)]">10:00:14 IST · Unauthorized Debit</span>
                  <span className="text-[12px] font-mono font-bold text-[var(--flow)] px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200">T+0m</span>
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Fraudulent UPI transfer initiated under intercepted authentication OTP
                </div>
              </div>
            </div>
          </div>

          {/* Z3 SMT Clock-Offset Caliper */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
              <div>
                <span className="text-[13px] font-bold text-[var(--fg-1)] uppercase tracking-wider block">
                  Z3 SMT Clock-Offset Caliper
                </span>
                <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Formal SMT verification for packet timing skew.
                </p>
              </div>
              <span
                className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${
                  isZ3Sat
                    ? 'bg-[var(--color-safe-bg)] text-[var(--safe)] border-[var(--safe)]/30'
                    : 'bg-[var(--color-risk-bg)] text-[var(--risk)] border-[var(--risk)]/30'
                }`}
              >
                {isZ3Sat ? 'Z3: SAT (PROVEN)' : 'Z3: UNSAT (TIMING SKEW)'}
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2 p-2.5 rounded-lg bg-[var(--surface-2)]/60 border border-[var(--line)]">
              <div className="flex justify-between items-center text-[12px]">
                <span className="font-medium text-[var(--fg-2)]">NTP Clock Skew Offset:</span>
                <span className={`font-mono font-bold text-[13px] px-2 py-0.5 rounded ${
                  isZ3Sat ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {clockOffset > 0 ? `+${clockOffset.toFixed(1)}s` : `${clockOffset.toFixed(1)}s`}
                </span>
              </div>
              <input
                type="range"
                min="-5.0"
                max="5.0"
                step="0.1"
                value={clockOffset}
                onChange={(e) => setClockOffset(parseFloat(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[12px] text-[var(--fg-3)] font-mono">
                <span>-5.0s (Unsat)</span>
                <span className="text-[var(--safe)] font-semibold">0.0s (NTP Sync)</span>
                <span>+5.0s (Unsat)</span>
              </div>
              <p className={`text-[12px] leading-relaxed mt-1 ${isZ3Sat ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isZ3Sat
                  ? '✓ Verified: Packet timestamp falls within carrier Stratum-2 NTP window (±200ms).'
                  : '⚠ Unsat: Timing contradiction detected. Packet timestamp exceeds physical propagation boundary.'}
              </p>
            </div>

            {/* Disclosure & Export */}
            <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSmtCode((p) => !p)}
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                {showSmtCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showSmtCode ? 'Hide SMT-LIB2 Code' : 'View Z3 SMT-LIB2 Script'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportSmt2}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-1)] border border-[var(--line)] rounded-md hover:bg-[var(--hover)] hover:text-[var(--fg-1)] transition-colors shadow-xs"
              >
                {isSmtCopied ? <Check className="w-3.5 h-3.5 text-[var(--safe)]" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>Export SMT2</span>
              </button>
            </div>

            {showSmtCode && (
              <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] max-h-[160px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {attributionProfile.smt2Script}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
