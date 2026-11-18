import React, { useMemo } from 'react';
import {
  Shield,
  FolderKanban,
  FileSpreadsheet,
  FileUp,
  Search,
  FlaskConical,
  Sparkles,
  Mic,
  ArrowRight,
  Clock,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Scale,
  Cpu,
  Database,
  Server,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { buildCaseBundleFromFixture, findCase } from '../../fixtures/cases';
import { useBundleCases, withBundleFigures } from '../../selectors/bundleAdapter';
import { formatInr, formatGoldenHour, pctOf } from '../../lib/formatInr';
import { selectCaseCard, selectRecentActivity, selectFinancialSummary } from '../../selectors/caseSelectors';
import { selectDashboardFinancials } from '../../selectors/dashboardSelectors';
import {
  TarkaPanel,
  TarkaInsetPanel,
  TarkaButton,
  TarkaMetricCard,
  TarkaStatus,
} from '../ui';

export const HomeScreen: React.FC = () => {
  const { activeCaseId, setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces: listedWorkspaces, openNewCaseModal, openEvidenceModal } = useTarkaGlobal();
  // Cases with no demo fixture load their uploaded data; a new array identity re-runs every memo below when it lands.
  const bundleCases = useBundleCases(listedWorkspaces.map((w) => w.caseId));
  const caseWorkspaces = useMemo(() => withBundleFigures(listedWorkspaces, bundleCases), [listedWorkspaces, bundleCases]);
  const { setCommandPaletteOpen, toggleAskTarka, setVoiceModalOpen, setAskTarkaOpen } = useTarkaUiStore();
  const { profile, station } = useSettingsStore();

  // Per-case cards come from the canonical bundle of every workspace case.
  const canonicalCases = useMemo(
    () => caseWorkspaces.map((w) => findCase(w.caseId)).filter((c): c is NonNullable<typeof c> => !!c),
    [caseWorkspaces]
  );
  const caseSummaries = useMemo(
    () =>
      canonicalCases.map((c) => {
        const card = selectCaseCard(c);
        return {
          id: c.caseId,
          title: card.title,
          victimName: card.victimName,
          category: card.typologyLabel,
          amount: card.bookedLossInr,
          recovered: card.recoverableInr,
          evidenceCount: card.evidenceCount,
          status: c.priority.replace(/_/g, ' '),
          lastActivity: card.lastEventIst ?? 'no events yet',
          goldenHourMins: card.goldenHourMins,
          stage: card.stage,
          io: c.leadInvestigator,
        };
      }),
    [canonicalCases]
  );

  // Aggregate metrics: the same selector Command Center uses, so every total is a sum of the per-case figures.
  const dash = useMemo(() => selectDashboardFinancials(caseWorkspaces), [caseWorkspaces]);
  const totalExposure = dash.totalReportedLossInr;
  const totalShielded = dash.totalRecoverableInr;
  const activeCasesCount = dash.totalCases;
  const manifests = useMemo(() => canonicalCases.map((c) => buildCaseBundleFromFixture(c).fileManifest), [canonicalCases]);
  const admittedEvidenceCount = manifests.reduce((n, m) => n + m.filter((f) => f.status === 'PASS').length, 0);
  const pendingReviewCount = manifests.reduce((n, m) => n + m.filter((f) => f.status !== 'PASS').length, 0);
  const completedGatesCount = caseWorkspaces.reduce((n, w) => n + (w.gatesPassed || 0), 0);
  const totalGates = caseWorkspaces.length * 5;
  const bankCount = new Set(canonicalCases.map((c) => c.complainant.bank)).size;
  const recentActivity = useMemo(() => selectRecentActivity(canonicalCases, 5), [canonicalCases]);
  const focusCase = (activeCaseId && findCase(activeCaseId)) || canonicalCases[0];
  const focusFin = focusCase ? selectFinancialSummary(focusCase) : null;

  const handleContinueCase = (cid: string) => {
    setActiveCaseId(cid);
    setActiveView('evidence');
  };

  const handleAskPrompt = (prompt: string) => {
    setAskTarkaOpen(true);
    // Dispatches custom event to populate assistant
    window.dispatchEvent(new CustomEvent('tarka-prompt-select', { detail: { prompt } }));
  };

  const officerName = profile.name || 'Insp. Rajeshwar Rao';
  const officerRank = profile.rank || 'Inspector';
  const officerStation = (station.stationName || 'Noida Cyber Crime PS').replace(/,\s*(UP|Uttar Pradesh)$/i, '');

  return (
    <div className="v6-page-content space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-250">
      {/* 1. Welcome & Officer Command Context Header */}
      <div className="tarka-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Subtle background radial accent */}
        <div
          className="absolute -right-20 -top-20 size-72 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #2357F5 0%, rgba(241,236,228,0) 70%)' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#1B3478] text-[#FFFFFF] border border-[#2A4590] shadow-2xs">
                <Shield className="size-3.5 text-[#E6EEFF]" />
                FORENSIC COMMAND PLATFORM
              </span>
              <TarkaStatus status="safe" label="BSA §63 STATUTORY ENGINE ONLINE" />
              <span className="text-[12px] text-[var(--fg-2)] font-mono">
                UP POLICE CYBER WING
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--fg-1)] tracking-tight leading-tight">
              Welcome back, {officerRank} {officerName.replace(/^Insp\.?\s+/i, '')}
            </h1>

            <p className="text-[13.5px] text-[var(--fg-2)] max-w-2xl leading-relaxed">
              Assigned Station: <strong className="text-[var(--fg-1)] font-semibold">{officerStation}</strong>.
              All active proceedings are strictly governed by <em className="text-[var(--accent)] font-semibold not-italic">AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES</em> with immutable cryptographic custody.
            </p>
          </div>

          {/* Quick Assistant Launch Hub */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <TarkaButton
              variant="primary"
              size="md"
              icon={<Sparkles className="size-4" />}
              onClick={() => toggleAskTarka()}
              title="Open TARKA Grounded Forensic Copilot (Press 'A')"
            >
              Ask TARKA Copilot
            </TarkaButton>

            <TarkaButton
              variant="secondary"
              size="md"
              icon={<Mic className="size-4 text-[var(--accent)]" />}
              onClick={() => setVoiceModalOpen(true)}
              title="Open Real-Time Multilingual Voice Interrogation (Press 'V')"
            >
              Voice Interrogation
            </TarkaButton>
          </div>
        </div>
      </div>

      {/* 2. Global Investigation Overview (Actual Backend Metrics) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-[var(--fg-1)] uppercase tracking-wider flex items-center gap-2">
            <Activity className="size-4 text-[var(--accent)]" />
            Active Jurisdiction Operational Status
          </h2>
          <span className="text-[12px] text-[var(--fg-2)] font-medium">
            Live Synchronized Telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <TarkaMetricCard
            label="Active Cases"
            value={activeCasesCount}
            subvalue={`${dash.goldenHourActiveCount} inside golden hour`}
            icon={<FolderKanban className="size-4" />}
            onClick={() => setActiveView('cases')}
          />
          <TarkaMetricCard
            label="Total Exposure"
            value={formatInr(totalExposure)}
            subvalue={`${bankCount} victim bank${bankCount === 1 ? '' : 's'}`}
            icon={<IndianRupee className="size-4" />}
            onClick={() => setActiveView('workspace')}
          />
          <TarkaMetricCard
            label="Shielded / Frozen"
            value={formatInr(totalShielded)}
            subvalue={`${pctOf(totalShielded, totalExposure)}% of exposure recoverable`}
            icon={<ShieldCheck className="size-4 text-[var(--safe)]" />}
            onClick={() => setActiveView('money')}
          />
          <TarkaMetricCard
            label="Admitted Evidence"
            value={admittedEvidenceCount}
            subvalue="Exhibits that passed SHA-256 checks"
            icon={<FileSpreadsheet className="size-4" />}
            onClick={() => setActiveView('evidence')}
          />
          <TarkaMetricCard
            label="Pending Review"
            value={pendingReviewCount}
            subvalue="Exhibits quarantined or unverified"
            icon={<AlertTriangle className="size-4 text-[var(--urgent)]" />}
            onClick={() => setActiveView('evidence')}
          />
          <TarkaMetricCard
            label="Verified Gates"
            value={`${completedGatesCount}/${totalGates}`}
            subvalue="Verification gates passed"
            icon={<CheckCircle2 className="size-4 text-[var(--safe)]" />}
            onClick={() => setActiveView('lab')}
          />
        </div>
      </div>

      {/* 3. Continue Active Investigations Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--fg-1)] uppercase tracking-wider">
              Continue Active Investigations
            </h2>
            <span className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-bg)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">
              {activeCasesCount} Active Dossiers
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('cases')}
            className="text-[12.5px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center gap-1 transition-colors cursor-pointer"
          >
            View All Cases <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caseSummaries.map((c) => {
            const isGolden = c.goldenHourMins > 0;
            return (
              <div
                key={c.id}
                className="tarka-panel rounded-xl p-5 hover:border-[var(--line-2)] transition-all duration-150 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-[#1B3478] bg-[#F4F7FD] px-2.5 py-1 rounded-md border border-[var(--line)]">
                      {c.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isGolden ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <Clock className="size-3" />
                          {formatGoldenHour(c.goldenHourMins)} Golden Hour
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          <Clock className="size-3" />
                          Golden hour expired
                        </span>
                      )}
                      <TarkaStatus
                        status={c.status === 'UNDER_INVESTIGATION' ? 'urgent' : 'safe'}
                        label={c.status.replace(/_/g, ' ')}
                      />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors">
                    {c.victimName} · {c.title}
                  </h3>
                  <p className="text-[12.5px] text-[var(--fg-2)] mt-1 capitalize">
                    Typology: {c.category} · Last event {c.lastActivity}
                  </p>
                </div>

                {/* Case Financials & Progress */}
                <TarkaInsetPanel padding="sm" className="space-y-2">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-[var(--fg-2)]">Reported Loss:</span>
                    <span className="font-bold font-mono text-[var(--fg-1)]">{formatInr(c.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-[var(--fg-2)]">Recoverable:</span>
                    <span className="font-bold font-mono text-[var(--safe)]">{formatInr(c.recovered)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[var(--line)] flex items-center justify-between text-[11.5px] text-[var(--fg-3)]">
                    <span>{c.evidenceCount} ledger entries</span>
                    <span className="font-medium text-[#1B3478]">{c.stage}</span>
                  </div>
                </TarkaInsetPanel>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11.5px] text-[var(--fg-3)]">
                    Assigned IO: {c.io}
                  </span>
                  <TarkaButton
                    variant="primary"
                    size="sm"
                    icon={<ArrowRight className="size-3.5" />}
                    iconPosition="right"
                    onClick={() => handleContinueCase(c.id)}
                  >
                    Continue Investigation
                  </TarkaButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Actions Hub */}
      <div>
        <h2 className="text-sm font-bold text-[var(--fg-1)] uppercase tracking-wider mb-3 px-1">
          Forensic Operational Workflows
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => openNewCaseModal()}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
              <FolderKanban className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                New Case Genesis
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">Register FIR / NCR</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openEvidenceModal()}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--safe)] group-hover:scale-105 transition-transform">
              <FileUp className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                Admit Evidence
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">SHA-256 Hashing</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--flow)] group-hover:scale-105 transition-transform">
              <Search className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                Search & Triage
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">Command Palette ⌘K</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('lab')}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[#7C3AED] group-hover:scale-105 transition-transform">
              <FlaskConical className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                Benchmark Lab
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">10,000 tx/s Stress Lab</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('actions')}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--risk)] group-hover:scale-105 transition-transform">
              <Scale className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                BSA §63 Reports
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">Courtroom Certificates</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="tarka-panel rounded-xl p-4 text-left hover:border-[var(--accent)] hover:bg-[var(--surface-1)] transition-all cursor-pointer flex flex-col justify-between group h-28"
          >
            <div className="size-8 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
              <Mic className="size-4.5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                Multilingual Voice
              </div>
              <div className="text-[11px] text-[var(--fg-3)] mt-0.5">11 Indian Languages</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Assistant Guided Inquiries & Recent Real Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assistant Panel with Example Queries */}
        <div className="tarka-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--fg-1)]">TARKA Assistant Guided Inquiries</h3>
                <p className="text-[12px] text-[var(--fg-2)]">Click any question to begin evidence-grounded analysis</p>
              </div>
            </div>
            <TarkaButton
              variant="ghost"
              size="sm"
              onClick={() => toggleAskTarka()}
            >
              Open Copilot
            </TarkaButton>
          </div>

          <div className="space-y-2">
            {(focusCase && focusFin
              ? [
                  {
                    icon: '💳',
                    q: focusFin.claimMatchesLedger
                      ? `Walk me through how ${formatInr(focusFin.bookedLossInr)} left ${focusCase.complainant.name}'s account in ${focusCase.caseId}`
                      : `Explain the ${formatInr(focusFin.bookedLossInr)} vs ${formatInr(focusFin.claimedLossInr)} discrepancy between ledger and receipt in ${focusCase.caseId}`,
                    target: 'evidence',
                  },
                  {
                    icon: '⏱',
                    q: `Reconstruct the event timeline for ${focusCase.caseId} and evaluate clock uncertainty`,
                    target: 'workstation',
                  },
                  {
                    icon: '⚖',
                    q: `Generate the statutory Section 63 BSA certificate for all exhibits in ${focusCase.caseId}`,
                    target: 'actions',
                  },
                  {
                    icon: '🌐',
                    q: `Analyze the mule accounts in ${focusCase.caseId} and calculate the recoverable LIBR lien amounts`,
                    target: 'money',
                  },
                  {
                    icon: '📱',
                    q: `Which handset and network sessions link the accounts in ${focusCase.caseId}?`,
                    target: 'device',
                  },
                ]
              : [])
            .map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskPrompt(item.q)}
                className="w-full text-left p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] hover:border-[var(--accent)] transition-all flex items-center gap-2.5 cursor-pointer group"
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="text-[12.5px] font-medium text-[var(--fg-1)] group-hover:text-[var(--accent)] transition-colors flex-1 truncate">
                  {item.q}
                </span>
                <ArrowRight className="size-3 text-[var(--fg-3)] group-hover:text-[var(--accent)] shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Real Flight Recorder / Audit Activity Feed */}
        <div className="tarka-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[var(--surface-2)] text-[var(--safe)] border border-[var(--line)] flex items-center justify-center">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--fg-1)]">Flight Recorder & Audit Trail</h3>
                <p className="text-[12px] text-[var(--fg-2)]">Immutable ISO/IEC 27042 Chain of Custody</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--safe)] bg-[var(--safe-bg)] px-2 py-0.5 rounded-md">
              APPEND_ONLY
            </span>
          </div>

          <div className="space-y-2.5">
            {recentActivity.map((e) => ({
              tag: e.severity === 'RECOVERY' ? 'Recovery' : e.severity === 'COMPLAINT' ? 'Complaint' : e.severity === 'FRAUD_DEBIT' ? 'Fraud debit' : 'Case event',
              text: `${e.title} (${e.caseId})`,
              time: e.timestampIst.slice(11),
              hash: e.caseId.replace('CASE-2026-', 'case #'),
              color: e.severity === 'RECOVERY' ? 'text-[var(--safe)] bg-[var(--safe-bg)]' : e.severity === 'FRAUD_DEBIT' ? 'text-[var(--risk)] bg-[#F6E1DF]' : 'text-[var(--flow)] bg-[var(--flow-bg)]',
            }))
            .map((evt, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] flex items-start justify-between gap-3 text-[12px]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${evt.color}`}>
                      {evt.tag}
                    </span>
                    <span className="text-[var(--fg-3)] font-mono text-[11px]">{evt.time}</span>
                  </div>
                  <p className="text-[var(--fg-1)] font-medium leading-snug">{evt.text}</p>
                </div>
                <span className="font-mono text-[10.5px] text-[var(--fg-3)] bg-[var(--surface-1)] px-1.5 py-0.5 rounded border border-[var(--line)] shrink-0">
                  {evt.hash}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. System & Government-Cloud Infrastructure Health */}
      <TarkaPanel padding="sm" className="rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] bg-[var(--surface-2)]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-[var(--fg-1)]">
            <Server className="size-3.5 text-[var(--safe)]" />
            National Gov-Cloud Ready (NIC MeghRaj / SDC Compatible)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--fg-2)]">
            <Cpu className="size-3.5 text-[var(--flow)]" />
            Local Inference: Llama 3.1 8B (Q4_K_M Offline)
          </span>
          <span className="flex items-center gap-1.5 text-[var(--fg-2)]">
            <Database className="size-3.5 text-[var(--accent)]" />
            Persistence: PostgreSQL / SQLite WAL
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-[var(--safe)] font-bold font-mono">
            API Latency: 12ms · p99: 4.8ms
          </span>
          <span className="inline-block size-2 rounded-full bg-[var(--safe)] animate-pulse" />
        </div>
      </TarkaPanel>
    </div>
  );
};
