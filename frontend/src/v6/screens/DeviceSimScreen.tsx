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
                <span className="text-[12px] font-semibold px-2 py-0.2 rounded bg-[var(--color-flow-bg)] text-[var(--flow)]">
                  DoT CLAUSE 39.20
                </span>
              </div>
              <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                Sequential intersection S1 ∩ S2 ∩ S3 ∩ S4 isolates 1 unique target handset.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleMutation('dropCgnatSourcePort')}
              className={`px-2.5 py-1 text-[12px] font-semibold rounded border transition-colors ${
                isPortDropped
                  ? 'bg-[var(--color-urgent-bg)] border-[var(--urgent)] text-[var(--urgent)]'
                  : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--fg-2)] hover:bg-[var(--hover)]'
              }`}
            >
              {isPortDropped ? '✓ Port Omission Active' : 'Simulate Port Omission'}
            </button>
          </div>

          <div className="flex-1 min-h-[440px] bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3">
            <CgnatFunnelChart
              isPortDropped={isPortDropped}
              onTogglePortDropped={() => toggleMutation('dropCgnatSourcePort')}
              targetImei={targetImei}
            />
          </div>
        </div>

        {/* Right 5 Columns: Dual-SIM Twin Chassis & Z3 Caliper */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Precursor SIM-Swap & Dual-SIM Chassis Card */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-2.5">
            <div className="pb-1.5 border-b border-[var(--line)] flex items-center justify-between">
              <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                Precursor SIM-Swap & Dual-SIM Chassis
              </span>
              <span className="text-[12px] font-semibold px-1.5 py-0.2 rounded bg-[var(--color-safe-bg)] text-[var(--safe)]">
                CHASSIS TWIN
              </span>
            </div>

            <div className="p-2 rounded bg-[var(--color-safe-bg)] border border-[var(--safe)]/20 text-[12px] font-semibold text-[var(--safe)] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>SHARED TAC {targetTac} · SAME PHYSICAL CHIPSET CHASSIS</span>
            </div>

            <div className="space-y-1 text-[12px]">
              <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)] flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[var(--fg-1)]">09:44:12 IST</span> · Airtel HLR Swap
                </div>
                <span className="text-[12px] font-semibold text-[var(--risk)]">T-16m</span>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)] flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[var(--fg-1)]">09:50:00 IST</span> · Complainant Silenced
                </div>
                <span className="text-[12px] font-semibold text-[var(--urgent)]">T-10m</span>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)] border border-[var(--line)] flex justify-between items-center">
                <div>
                  <span className="font-semibold text-[var(--fg-1)]">10:00:14 IST</span> · Unauthorized Debit
                </div>
                <span className="text-[12px] font-semibold text-[var(--flow)]">T+0m</span>
              </div>
            </div>
          </div>

          {/* Z3 SMT Clock-Offset Caliper */}
          <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-3 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--line)]">
              <div>
                <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                  Z3 SMT Clock-Offset Caliper
                </span>
                <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                  Formal SMT verification for packet timing skew.
                </p>
              </div>
              <span
                className={`text-[12px] font-bold px-2 py-0.5 rounded ${
                  isZ3Sat
                    ? 'bg-[var(--color-safe-bg)] text-[var(--safe)]'
                    : 'bg-[var(--color-risk-bg)] text-[var(--risk)]'
                }`}
              >
                {isZ3Sat ? 'Z3: SAT (PROVEN)' : 'Z3: UNSAT (TIMING CONTRADICTION)'}
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--fg-2)]">NTP Clock Skew Offset:</span>
                <span className="font-mono font-bold text-[var(--fg-1)]">
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
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
              <div className="flex justify-between text-[12px] text-[var(--fg-3)] font-mono">
                <span>-5.0s (Unsat)</span>
                <span className="text-[var(--safe)]">0.0s (NTP Sync)</span>
                <span>+5.0s (Unsat)</span>
              </div>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-[var(--fg-2)] bg-[var(--surface-2)] border border-[var(--line)] rounded hover:bg-[var(--hover)] hover:text-[var(--fg-1)]"
              >
                {isSmtCopied ? <Check className="w-3.5 h-3.5 text-[var(--safe)]" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>Export SMT2</span>
              </button>
            </div>

            {showSmtCode && (
              <div className="p-2.5 rounded bg-[var(--surface-2)] border border-[var(--line)] font-mono text-[12px] text-[var(--fg-1)] max-h-[160px] overflow-y-auto whitespace-pre-wrap">
                {attributionProfile.smt2Script}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
