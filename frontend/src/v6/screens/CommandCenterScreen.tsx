import React, { useState, useMemo } from 'react';
import {
  Clock,
  IndianRupee,
  Snowflake,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Sparkles,
  FileUp,
  Zap,
  LayoutDashboard,
  List,
  LayoutGrid,
  Calendar,
  Database,
  Building,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHead, Card, CardHeader, KpiCard, Button, Chip, Gauge } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal, type CaseWorkspace, type ActiveRoute } from '../../context/TarkaGlobalContext';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { useCaseWorkbenchStore } from '../../store/useCaseWorkbenchStore';
import {
  selectDashboardFinancials,
  selectActNowQueue,
  selectNeedsDataCases,
  selectIndiaMuleFlows,
  selectTypologyDistribution,
  selectTopBanksByMules,
} from '../../selectors/dashboardSelectors';
import { formatInr, formatInrCompact, formatGoldenHour, pctOf } from '../../lib/formatInr';
import { CANONICAL_CASES, buildCaseBundleFromFixture, findCase } from '../../fixtures/cases';
import { useStationSummary, withSummaryFigures } from '../../selectors/bundleAdapter';
import { selectRecentActivity, selectFinancialSummary, selectPortfolioMoneyFigure } from '../../selectors/caseSelectors';
import { reconstruct5FileInvestigation } from '../../utils/investigationReconstructor';

import { CaseTableView } from '../../components/tarka/workspace/CaseTableView';
import { CaseBoardView } from '../../components/tarka/workspace/CaseBoardView';
import { CaseTimelineView } from '../../components/tarka/workspace/CaseTimelineView';
import { BulkIngestionHubView } from '../../components/tarka/workspace/BulkIngestionHubView';
import { BulkIngestionModal } from '../../components/tarka/workspace/BulkIngestionModal';
import { CreateCaseWizard } from '../../components/tarka/cases/CreateCaseWizard';
import { EditCaseSheet } from '../../components/tarka/cases/EditCaseSheet';
import { CrossCaseComparatorDrawer } from '../../components/tarka/workspace/CrossCaseComparatorDrawer';

export const CommandCenterScreen: React.FC = () => {
  const { activeCaseId, setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces: listedWorkspaces, selectCaseWorkspace } = useTarkaGlobal();
  // Uploaded-data cases take their figures from one station summary request (no per-case bundle/networks fetch).
  const summaryQuery = useStationSummary();
  const caseWorkspaces = useMemo(() => withSummaryFigures(listedWorkspaces, summaryQuery.data), [listedWorkspaces, summaryQuery.data]);
  const { setReconstructedInvestigation } = useTarkaUiStore();
  const { setActiveCaseId: setWorkbenchCaseId } = useCaseWorkbenchStore();

  const [viewMode, setViewMode] = useState<'dashboard' | 'table' | 'board' | 'timeline' | 'bulk'>('dashboard');
  const [filterMode, setFilterMode] = useState<
    'ALL' | 'GOLDEN_HOUR' | 'SYNDICATE' | 'ACTION_PENDING' | 'COURT_READY' | 'CLOSED' | 'ARCHIVED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals and Drawers
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseWorkspace | null>(null);
  const [comparatorState, setComparatorState] = useState<{
    isOpen: boolean;
    caseA: CaseWorkspace | null;
    caseB: CaseWorkspace | null;
  }>({
    isOpen: false,
    caseA: null,
    caseB: null,
  });

  // Derived pure dashboard analytics
  const dashboardMetrics = useMemo(() => {
    return selectDashboardFinancials(caseWorkspaces);
  }, [caseWorkspaces]);
  // Rows behind the portfolio KPIs; the figure stays the dashboard's, so any case without rows shows as a gap in the sheet.
  const portfolioFigs = useMemo(() => {
    const fixtures = caseWorkspaces.map((w) => findCase(w.caseId)).filter((f): f is NonNullable<typeof f> => !!f);
    return {
      loss: { ...selectPortfolioMoneyFigure(fixtures, 'loss'), totalInr: dashboardMetrics.totalReportedLossInr },
      recoverable: { ...selectPortfolioMoneyFigure(fixtures, 'recoverable'), totalInr: dashboardMetrics.totalRecoverableInr },
    };
  }, [caseWorkspaces, dashboardMetrics]);

  const actNowQueue = useMemo(() => {
    return selectActNowQueue(caseWorkspaces);
  }, [caseWorkspaces]);
  const needsDataCount = useMemo(() => selectNeedsDataCases(caseWorkspaces).length, [caseWorkspaces]);
  // Totals for uploaded cases arrive with the summary; say so instead of showing a partial sum as final.
  const bundlesLoading = summaryQuery.isFetching;

  const typologyData = useMemo(() => {
    return selectTypologyDistribution(caseWorkspaces);
  }, [caseWorkspaces]);

  const topBanksData = useMemo(() => {
    return selectTopBanksByMules(caseWorkspaces);
  }, [caseWorkspaces]);

  const muleArcs = useMemo(() => {
    return selectIndiaMuleFlows(caseWorkspaces);
  }, [caseWorkspaces]);

  const canonicalList = useMemo(
    () => caseWorkspaces.map((w) => findCase(w.caseId)).filter((c): c is NonNullable<typeof c> => !!c),
    [caseWorkspaces]
  );
  const activityFeed = useMemo(() => selectRecentActivity(canonicalList, 4), [canonicalList]);
  const nextSlaMins = useMemo(() => {
    const live = canonicalList.map((c) => c.financials.goldenHourRemainingMins).filter((m) => m > 0);
    return live.length ? Math.min(...live) : null;
  }, [canonicalList]);
  const evidenceIntegrityPct = useMemo(() => {
    let pass = 0;
    let total = 0;
    canonicalList.forEach((c) => {
      const files = buildCaseBundleFromFixture(c).fileManifest;
      total += files.length;
      pass += files.filter((f) => f.status === 'PASS').length;
    });
    return pctOf(pass, total);
  }, [canonicalList]);
  const STATE_NAMES: Record<string, string> = { UP: 'Uttar Pradesh', DL: 'Delhi', HR: 'Haryana', RJ: 'Rajasthan', MH: 'Maharashtra', KA: 'Karnataka', GJ: 'Gujarat', WB: 'West Bengal', JH: 'Jharkhand', TG: 'Telangana' };

  // Filtered cases for tables/views
  const filteredCases = useMemo(() => {
    return caseWorkspaces.filter((c) => {
      if (filterMode === 'GOLDEN_HOUR') {
        const gh = c.goldenHourRemainingMins ?? 180;
        if (gh <= 0 || c.status === 'CLOSED' || c.status === 'ARCHIVED') return false;
      } else if (filterMode === 'SYNDICATE') {
        if (c.priority !== 'HIGH_SYNDICATE') return false;
      } else if (filterMode === 'ACTION_PENDING') {
        if (c.status !== 'ACTION_PENDING' && c.status !== 'INVESTIGATING') return false;
      } else if (filterMode === 'COURT_READY') {
        if (c.status !== 'COURT_READY') return false;
      } else if (filterMode === 'CLOSED') {
        if (c.status !== 'CLOSED') return false;
      } else if (filterMode === 'ARCHIVED') {
        if (c.status !== 'ARCHIVED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.caseId.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.firNumber.toLowerCase().includes(q) ||
          c.policeStation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [caseWorkspaces, filterMode, searchQuery]);

  // Load Canonical 5-File Investigation Pack
  const handleLoadIndianCasePack = () => {
    const inv = reconstruct5FileInvestigation();
    setReconstructedInvestigation(inv);
    setWorkbenchCaseId('CASE-2026-001');
    selectCaseWorkspace('CASE-2026-001');
    setActiveCaseId('CASE-2026-001');
    const packCase = CANONICAL_CASES['CASE-2026-001'];
    const packFin = selectFinancialSummary(packCase);
    toast.success(`Loaded 5-file case pack (${packCase.caseId}: ${packCase.complainant.name})`, {
      description: `${formatInr(packFin.bookedLossInr)} booked loss · ${packCase.accounts.length} accounts · SHA-256 Merkle provenance`,
    });
  };

  const handleSelectCase = (caseId: string, stage?: ActiveRoute) => {
    setActiveCaseId(caseId);
    selectCaseWorkspace(caseId);
    setWorkbenchCaseId(caseId);
    if (stage) {
      setActiveView(stage);
    } else {
      setActiveView('evidence');
    }
  };

  const handleOpenCompare = (caseId: string, linkedCaseId: string) => {
    const cA = caseWorkspaces.find((c) => c.caseId === caseId) || null;
    const cB = caseWorkspaces.find((c) => c.caseId === linkedCaseId) || null;
    if (cA && cB) {
      setComparatorState({ isOpen: true, caseA: cA, caseB: cB });
    } else {
      toast.info(`Comparing Case ${caseId} with ${linkedCaseId}`);
    }
  };

  // State coordinate map for India cyber-fraud corridors
  const stateCoords: Record<string, [number, number]> = {
    UP: [180, 150],
    DL: [195, 110],
    HR: [165, 120],
    RJ: [130, 180],
    MH: [160, 290],
    KA: [175, 390],
    GJ: [95, 220],
    WB: [310, 200],
    JH: [265, 195],
    TG: [200, 310],
  };

  return (
    <div className="v6-enter space-y-3" data-testid="v6-command-center">
      {/* Page Header */}
      <PageHead
        kicker="Command Center · Station Command"
        title="Good morning, Inspector"
        subtitle={`${dashboardMetrics.totalCases} active cases · ${dashboardMetrics.goldenHourActiveCount} inside golden hour`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />}
              onClick={handleLoadIndianCasePack}
              title="Load full 5-file canonical investigation dataset"
              className="border border-[var(--line)] bg-[var(--surface-1)] text-xs h-8 px-2.5"
            >
              5-File Pack
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<FileUp className="w-3.5 h-3.5 text-[var(--fg-2)]" />}
              onClick={() => setIsBulkModalOpen(true)}
              className="border border-[var(--line)] bg-[var(--surface-1)] text-xs h-8 px-2.5"
            >
              Bulk Ingest
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={<Zap className="w-3.5 h-3.5 text-[var(--urgent)]" />}
              onClick={() => setActiveView('benchmarks')}
              className="border border-[var(--line)] bg-[var(--surface-1)] text-xs h-8 px-2.5"
            >
              Benchmarks
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateWizardOpen(true)}
              className="text-xs h-8 px-3"
            >
              New Case
            </Button>
          </div>
        }
      />

      {/* View Switcher Pills */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2 select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'dashboard'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>All Cases ({caseWorkspaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'board'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Roadmap</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('bulk')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'bulk'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Bulk Ingestion Hub</span>
          </button>
        </div>

        {/* Filter mode quick chips if table or dashboard */}
        <div className="flex items-center gap-1 text-[12px] overflow-x-auto">
          {(['ALL', 'GOLDEN_HOUR', 'SYNDICATE', 'ACTION_PENDING', 'COURT_READY'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === mode
                  ? 'bg-[var(--surface-3)] text-[var(--fg-1)] font-semibold'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD OVERVIEW MODE */}
      {viewMode === 'dashboard' && (
        <>
          {/* 5 KPI Tiles Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="saas-metric-banner">
            <KpiCard
              label="Cases in golden hour"
              value={dashboardMetrics.goldenHourActiveCount}
              icon={<Clock className="w-3.5 h-3.5 text-[var(--urgent)]" />}
              iconClass="bg-[var(--urgent-bg)]"
              foot={<span className={`font-semibold text-xs ${nextSlaMins === null ? 'text-[var(--risk)]' : 'text-[var(--urgent)]'}`}>{nextSlaMins === null ? 'All windows expired' : `Next SLA: ${formatGoldenHour(nextSlaMins)}`}</span>}
            />

            <KpiCard
              label="Cumulative exposure"
              value={dashboardMetrics.totalReportedLossInr}
              isInr
              figure={portfolioFigs.loss}
              icon={<IndianRupee className="w-3.5 h-3.5 text-[var(--risk)]" />}
              iconClass="bg-[var(--risk-bg)]"
              foot={<span className="text-[var(--fg-3)] text-xs">across {dashboardMetrics.totalCases} FIRs{bundlesLoading ? ' · still loading cases…' : ''}</span>}
            />

            <KpiCard
              label="Recoverable capital (§106/107)"
              value={dashboardMetrics.totalRecoverableInr}
              isInr
              figure={portfolioFigs.recoverable}
              icon={<Snowflake className="w-3.5 h-3.5 text-[var(--frozen)]" />}
              iconClass="bg-[var(--frozen-bg)]"
              foot={
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1">
                    <Gauge value={dashboardMetrics.recoveryPercentage} color="var(--frozen)" height={5} />
                  </div>
                  <span className="v6-mono text-xs text-[var(--frozen)] font-bold">
                    {dashboardMetrics.recoveryPercentage}%
                  </span>
                </div>
              }
            />

            <KpiCard
              label="Syndicate mule accounts"
              value={dashboardMetrics.totalSuspectAccounts}
              icon={<ShieldAlert className="w-3.5 h-3.5 text-[var(--accent)]" />}
              iconClass="bg-blue-50"
              foot={<span className="text-[var(--fg-3)] text-xs">{dashboardMetrics.totalCrossFirLinks} cross-FIR links</span>}
            />

            <KpiCard
              label="Evidence integrity"
              value={evidenceIntegrityPct}
              icon={<ShieldCheck className="w-3.5 h-3.5 text-[var(--safe)]" />}
              iconClass="bg-[var(--safe-bg)]"
              foot={<span className="text-[var(--safe)] font-semibold text-xs">{evidenceIntegrityPct}% of exhibits passed SHA-256 checks</span>}
            />
          </div>

          {/* 12-Column Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Column (7 cols): Map + Typology Breakdown */}
            <div className="lg:col-span-7 space-y-3">
              {/* National Cyber-Fraud Corridors Map */}
              <Card className="flex flex-col">
                <CardHeader
                  title="National Cyber-Fraud Corridors"
                  subtitle="Live interstate victim drain & syndicate transit routing (MHA Samanvaya)"
                  action={
                    <span className="text-[12px] font-semibold text-[var(--accent)] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Live Enclave
                    </span>
                  }
                />

                <div className="relative h-[280px] w-full rounded-md bg-[var(--surface-2)] border border-[var(--line)] overflow-hidden">
                  <svg viewBox="0 0 420 480" className="w-full h-full select-none">
                    {/* Simplified India boundary shape */}
                    <path
                      d="M 195 55 L 245 35 L 280 65 L 300 115 L 340 135 L 390 130 L 405 160 L 370 200 L 330 220 L 305 270 L 290 320 L 260 370 L 230 420 L 205 450 L 185 410 L 165 340 L 135 290 L 115 240 L 95 200 L 115 160 L 155 125 Z"
                      fill="#ffffff"
                      stroke="#d4d4d8"
                      strokeWidth="1.5"
                    />

                    {/* Corridor transit lines */}
                    {muleArcs.slice(0, 7).map((arc, i) => {
                      const from = stateCoords[arc.originState] || [180, 150];
                      const to = stateCoords[arc.targetState] || [160, 290];
                      const midX = (from[0] + to[0]) / 2 + (i % 2 === 0 ? 25 : -25);
                      const midY = (from[1] + to[1]) / 2 - 15;
                      const pathData = `M ${from[0]} ${from[1]} Q ${midX} ${midY} ${to[0]} ${to[1]}`;

                      return (
                        <g key={arc.id}>
                          <path
                            d={pathData}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            opacity="0.75"
                          />
                          <circle r="3" fill="#2563eb">
                            <animateMotion dur={`${2 + i * 0.4}s`} repeatCount="indefinite" path={pathData} />
                          </circle>
                        </g>
                      );
                    })}

                    {/* State pulse hubs */}
                    {Object.entries(stateCoords).map(([st, [x, y]]) => (
                      <g
                        key={st}
                        className="cursor-pointer"
                        onClick={() => {
                          const arc = muleArcs.find((a) => a.originState === STATE_NAMES[st] || a.targetState.includes(STATE_NAMES[st]));
                          if (arc) handleSelectCase(arc.caseId, 'network');
                        }}
                      >
                        <circle cx={x} cy={y} r="8" fill="rgba(37,99,235,0.12)" />
                        <circle cx={x} cy={y} r="3.5" fill="#2563eb" />
                        <text
                          x={x}
                          y={y + 12}
                          textAnchor="middle"
                          fontSize="12"
                          fontWeight="700"
                          fill="#52525b"
                          fontFamily="var(--font)"
                        >
                          {st}
                        </text>
                      </g>
                    ))}
                  </svg>

                  {/* Corridor Legend Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[12px] bg-white/95 px-2.5 py-1.5 rounded border border-[var(--line)] shadow-xs">
                    <div className="flex items-center gap-3">
                      {muleArcs.slice(0, 2).map((arc, i) => (
                        <span key={arc.id} className="flex items-center gap-1 font-medium text-[var(--fg-2)] truncate" title={`${arc.originCity} to ${arc.targetCity}`}>
                          <span className={`w-2 h-2 rounded-full inline-block ${i === 0 ? 'bg-[#2563eb]' : 'bg-[#0284c7]'}`} />
                          {arc.originCity.split(' ')[0]} → {arc.targetCity.split(' ')[0]} · {formatInrCompact(arc.amountInr)}
                        </span>
                      ))}
                    </div>
                    <span className="font-semibold text-[var(--accent)] v6-mono">{muleArcs.length} corridor{muleArcs.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </Card>

              {/* Cyber Typology Breakdown */}
              <Card>
                <CardHeader
                  title="Cyber Fraud Typologies"
                  subtitle="Active NCRP complaints categorized by extortion vector"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {typologyData.map((typ) => (
                    <div
                      key={typ.typology}
                      className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-[var(--fg-1)] truncate pr-2">{typ.typology}</span>
                        <span className="v6-mono font-semibold text-[var(--accent)]">
                          {formatInr(typ.lossInr, { showPaise: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Gauge
                            value={Math.round((typ.lossInr / (dashboardMetrics.totalReportedLossInr || 1)) * 100)}
                            color="#2563eb"
                            height={5}
                          />
                        </div>
                        <span className="text-[12px] text-[var(--fg-3)] font-medium">
                          {typ.count} {typ.count === 1 ? 'case' : 'cases'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column (5 cols): Act-Now Queue + Top Banks */}
            <div className="lg:col-span-5 space-y-3">
              {/* Act Now Priority Queue */}
              <Card className="flex flex-col">
                <CardHeader
                  title="Act Now · Priority Queue"
                  subtitle="Ranked by highest recoverable capital × least SLA remaining"
                />
                <div className="space-y-2">
                  {actNowQueue.map((item) => (
                    <div
                      key={item.caseId}
                      className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-[var(--fg-1)] truncate">
                          {item.urgentActionTitle}
                        </div>
                        <div className="text-[12px] text-[var(--fg-3)] flex items-center gap-1.5 mt-0.5">
                          <span className="v6-mono font-semibold text-[var(--accent)]">{item.caseId}</span>
                          <span>·</span>
                          <span className="truncate">{item.complainantName}</span>
                          <span>·</span>
                          <span className="v6-mono text-[var(--frozen)] font-semibold">
                            {formatInr(item.recoverableInr, { showPaise: false })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Chip variant={item.slaMinsRemaining < 60 ? 'risk' : 'urgent'} withDot>
                          {formatGoldenHour(item.slaMinsRemaining)}
                        </Chip>
                        <button
                          type="button"
                          onClick={() => handleSelectCase(item.caseId, item.targetRoute)}
                          className="px-2 py-1 rounded bg-[var(--accent)] text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          Act →
                        </button>
                      </div>
                    </div>
                  ))}
                  {needsDataCount > 0 && (
                    <div className="px-1 pt-1 text-[12px] text-[var(--fg-3)]" data-testid="act-now-needs-data">
                      Needs data: {needsDataCount} {needsDataCount === 1 ? 'case has' : 'cases have'} no amounts yet (see All cases).
                    </div>
                  )}
                </div>
              </Card>

              {/* Nodal Beneficiary Banks */}
              <Card>
                <CardHeader
                  title="Nodal Bank Mule Concentration"
                  subtitle="Beneficiary bank accounts receiving stolen victim drain"
                />
                <div className="space-y-2">
                  {topBanksData.map((b) => (
                    <div
                      key={b.bankName}
                      className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building className="w-3.5 h-3.5 text-[var(--fg-3)] shrink-0" />
                        <span className="font-semibold text-[var(--fg-1)] truncate">{b.bankName}</span>
                        <span className="text-[12px] text-[var(--fg-3)]">
                          ({b.muleAccountCount} {b.muleAccountCount === 1 ? 'mule' : 'mules'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="v6-mono font-semibold text-[var(--fg-1)]">
                          {formatInr(b.totalTraffickedInr, { showPaise: false })}
                        </span>
                        <span className="text-[12px] font-bold text-[var(--safe)] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {Math.round(b.frozenRatio * 100)}% frozen
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Live Enclave Activity Feed ticker */}
              <Card>
                <CardHeader
                  title="Enclave Activity"
                  subtitle="Immutable audit hash-chain events"
                />
                <div className="space-y-1.5 text-xs text-[var(--fg-2)]">
                  {activityFeed.length === 0 && <div className="text-[var(--fg-3)]">No events logged yet.</div>}
                  {activityFeed.map((e, i) => (
                    <div key={`${e.caseId}-${i}`} className="flex items-center gap-2 py-1 border-b border-[var(--line)] last:border-0">
                      {e.severity === 'RECOVERY' ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--safe)] shrink-0" /> : <Activity className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                      <span className="truncate" title={`${e.caseId}: ${e.detail}`}>{e.title}</span>
                      <span className="ml-auto text-[12px] text-[var(--fg-3)] shrink-0 v6-mono">{e.caseId.replace('CASE-2026-', '#')} · {e.timestampIst.slice(11, 16)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom Active Cases Registry Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-[var(--fg-1)]">
                Active Cases Registry ({filteredCases.length})
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter cases by name, FIR, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-[var(--line)] bg-[var(--surface-1)] text-[var(--fg-1)] focus:outline-none focus:border-[var(--accent)] w-56"
                />
              </div>
            </div>

            <CaseTableView
              cases={filteredCases}
              activeCaseId={activeCaseId ?? ""}
              onSelectCase={handleSelectCase}
              onOpenCompare={handleOpenCompare}
              onEditCase={(caseItem) => setEditingCase(caseItem)}
            />
          </div>
        </>
      )}

      {/* OTHER VIEW MODES */}
      {viewMode === 'table' && (
        <div className="space-y-2">
          <CaseTableView
            cases={filteredCases}
            activeCaseId={activeCaseId ?? ""}
            onSelectCase={handleSelectCase}
            onOpenCompare={handleOpenCompare}
            onEditCase={(caseItem) => setEditingCase(caseItem)}
          />
        </div>
      )}

      {viewMode === 'board' && (
        <CaseBoardView
          cases={filteredCases}
          activeCaseId={activeCaseId ?? ""}
          onSelectCase={handleSelectCase}
          onOpenCompare={handleOpenCompare}
        />
      )}

      {viewMode === 'timeline' && (
        <CaseTimelineView
          cases={filteredCases}
          activeCaseId={activeCaseId ?? ""}
          onSelectCase={handleSelectCase}
        />
      )}

      {viewMode === 'bulk' && (
        <BulkIngestionHubView
          cases={caseWorkspaces}
          onOpenUploadModal={() => setIsBulkModalOpen(true)}
        />
      )}

      {/* Modals & Drawers */}
      {isCreateWizardOpen && (
        <CreateCaseWizard
          isOpen={isCreateWizardOpen}
          onClose={() => setIsCreateWizardOpen(false)}
        />
      )}

      {isBulkModalOpen && (
        <BulkIngestionModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}

      {editingCase && (
        <EditCaseSheet
          isOpen={!!editingCase}
          caseData={editingCase}
          onClose={() => setEditingCase(null)}
        />
      )}

      {comparatorState.isOpen && comparatorState.caseA && comparatorState.caseB && (
        <CrossCaseComparatorDrawer
          isOpen={comparatorState.isOpen}
          caseA={comparatorState.caseA}
          caseB={comparatorState.caseB}
          onClose={() => setComparatorState({ isOpen: false, caseA: null, caseB: null })}
          onNavigateToCase={(cid) => handleSelectCase(cid)}
        />
      )}
    </div>
  );
};
