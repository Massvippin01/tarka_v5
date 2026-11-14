import React, { useState, useMemo } from 'react';
import {
  Clock,
  IndianRupee,
  Snowflake,
  ShieldAlert,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PageHead, Card, CardHeader, KpiCard, Button, Chip, Gauge, DataTable, type Column } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import {
  selectDashboardFinancials,
  selectActNowQueue,
} from '../../selectors/dashboardSelectors';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';
import { getCanonicalCase, CANONICAL_CASES } from '../../fixtures/cases';
import { formatInr } from '../../utils/formatters';
import { CreateCaseWizard } from '../../components/tarka/cases/CreateCaseWizard';

interface CaseTableRow {
  caseId: string;
  victimName: string;
  typology: string;
  status: string;
  statusVariant: 'urgent' | 'flow' | 'frozen' | 'safe' | 'muted';
  lossInr: number;
  recoveredInr: number;
  recoveryPct: number;
  goldenHourMins: number | null;
  ioName: string;
}

export const CommandCenterScreen: React.FC = () => {
  const { setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces } = useTarkaGlobal();
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [hoveredCorridor, setHoveredCorridor] = useState<string | null>(null);

  // Derive pure dashboard metrics
  const dashboardMetrics = useMemo(() => {
    return selectDashboardFinancials(caseWorkspaces);
  }, [caseWorkspaces]);

  // Derive pure Act-Now Queue
  const actNowQueue = useMemo(() => {
    return selectActNowQueue(caseWorkspaces);
  }, [caseWorkspaces]);

  // Derive active cases table rows
  const casesData = useMemo<CaseTableRow[]>(() => {
    const caseIds = Object.keys(CANONICAL_CASES);
    return caseIds.map((cid) => {
      const canonical = getCanonicalCase(cid);
      const financials = selectCaseActionFinancials(cid);
      const ws = caseWorkspaces.find((w) => w.caseId === cid);

      const rawStatus = (ws as any)?.status || 'INVESTIGATING';
      let statusVariant: 'urgent' | 'flow' | 'frozen' | 'safe' | 'muted' = 'urgent';
      let statusLabel = 'Investigating';

      switch (rawStatus.toUpperCase()) {
        case 'INVESTIGATING':
          statusVariant = 'urgent';
          statusLabel = 'Investigating';
          break;
        case 'ACTION_PENDING':
          statusVariant = 'flow';
          statusLabel = 'Action pending';
          break;
        case 'FROZEN':
          statusVariant = 'frozen';
          statusLabel = 'Partially frozen';
          break;
        case 'COURT_READY':
          statusVariant = 'safe';
          statusLabel = 'Court ready';
          break;
        case 'CLOSED':
          statusVariant = 'muted';
          statusLabel = 'Closed';
          break;
        case 'ARCHIVED':
          statusVariant = 'muted';
          statusLabel = 'Archived';
          break;
      }

      const recPct = Math.round(
        (financials.recoverableLibrInr / (financials.bookedLossInr || 1)) * 100
      );

      return {
        caseId: cid,
        victimName: canonical.complainant.name,
        typology: canonical.title || canonical.typology.replace(/_/g, ' '),
        status: statusLabel,
        statusVariant,
        lossInr: financials.bookedLossInr,
        recoveredInr: financials.recoverableLibrInr,
        recoveryPct: recPct,
        goldenHourMins: financials.goldenHourRemainingMins > 0 ? financials.goldenHourRemainingMins : null,
        ioName: canonical.leadInvestigator || 'Insp. R. K. Sharma',
      };
    });
  }, [caseWorkspaces]);

  // Corridor nodes & coordinates (State centers)
  const states: Record<string, [number, number]> = {
    UP: [110, 150],
    DL: [160, 70],
    MH: [150, 250],
    KA: [300, 262],
    GJ: [60, 230],
    WB: [420, 140],
    TG: [300, 190],
  };

  const corridors = [
    { from: 'UP', to: 'MH', amount: 380000, label: 'UP → MH · Mule syndicates' },
    { from: 'UP', to: 'KA', amount: 155000, label: 'UP → KA · Tech escrow' },
    { from: 'UP', to: 'DL', amount: 120000, label: 'UP → DL · ATM cashouts' },
    { from: 'MH', to: 'GJ', amount: 90000, label: 'MH → GJ · Hawala sinks' },
    { from: 'TG', to: 'WB', amount: 140000, label: 'TG → WB · Call center routing' },
    { from: 'DL', to: 'KA', amount: 60000, label: 'DL → KA · Merchant gateways' },
  ];

  // Cases table columns
  const columns: Column<CaseTableRow>[] = [
    {
      key: 'caseId',
      header: 'Case',
      width: '130px',
      render: (row) => <span className="v6-mono font-semibold text-[var(--fg-1)]">{row.caseId}</span>,
    },
    {
      key: 'victimName',
      header: 'Victim · Typology',
      render: (row) => (
        <div>
          <div className="font-semibold text-[var(--fg-1)]">{row.victimName}</div>
          <div className="v6-card-s capitalize">{row.typology.toLowerCase()}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Chip variant={row.statusVariant} withDot={row.statusVariant === 'urgent'}>
          {row.status}
        </Chip>
      ),
    },
    {
      key: 'lossInr',
      header: 'Loss',
      isAmount: true,
      width: '130px',
      render: (row) => formatInr(row.lossInr, { showPaise: false }),
    },
    {
      key: 'recoveredInr',
      header: 'Recovered',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <Gauge value={row.recoveryPct} color="var(--frozen)" height={7} />
          </div>
          <span className="v6-mono text-xs text-[var(--fg-2)] w-9 text-right font-medium">
            {row.recoveryPct}%
          </span>
        </div>
      ),
    },
    {
      key: 'goldenHourMins',
      header: 'Golden Hour',
      width: '120px',
      render: (row) =>
        row.goldenHourMins !== null ? (
          <Chip variant={row.goldenHourMins < 60 ? 'risk' : 'urgent'}>
            {row.goldenHourMins} min
          </Chip>
        ) : (
          <Chip variant="muted">Closed</Chip>
        ),
    },
    {
      key: 'ioName',
      header: 'IO',
      width: '160px',
      render: (row) => <span className="text-[var(--fg-2)] text-xs">{row.ioName}</span>,
    },
  ];

  return (
    <div className="v6-enter space-y-4" data-testid="v6-command-center">
      {/* Page Header */}
      <PageHead
        kicker="Command Center"
        title="Good morning, Inspector"
        subtitle="4 active cases · 3 inside the golden hour · last sync just now"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateWizardOpen(true)}
          >
            New Case
          </Button>
        }
      />

      {/* Metric KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="saas-metric-banner">
        <KpiCard
          label="Cases in golden hour"
          value={dashboardMetrics.goldenHourActiveCount}
          icon={<Clock className="w-4 h-4" />}
          iconClass="bg-[var(--urgent-bg)] text-[var(--urgent)]"
          foot={<Chip variant="urgent">Next: 42 min</Chip>}
        />

        <KpiCard
          label="Reported loss"
          value={dashboardMetrics.totalReportedLossInr}
          isInr
          icon={<IndianRupee className="w-4 h-4" />}
          iconClass="bg-[var(--risk-bg)] text-[var(--risk)]"
          foot={<span className="text-[var(--fg-3)] text-xs">across 4 FIRs</span>}
        />

        <KpiCard
          label="Frozen / recoverable"
          value={dashboardMetrics.totalRecoverableInr}
          isInr
          icon={<Snowflake className="w-4 h-4" />}
          iconClass="bg-[var(--frozen-bg)] text-[var(--frozen)]"
          foot={
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <Gauge value={dashboardMetrics.recoveryPercentage} color="var(--frozen)" height={7} />
              </div>
              <span className="v6-mono text-xs text-[var(--fg-2)] font-semibold">
                {dashboardMetrics.recoveryPercentage}%
              </span>
            </div>
          }
        />

        <KpiCard
          label="Mule accounts found"
          value={dashboardMetrics.totalSuspectAccounts}
          icon={<ShieldAlert className="w-4 h-4" />}
          iconClass="bg-[var(--flow-bg)] text-[#a5b4fc]"
          foot={<span className="text-[var(--fg-3)] text-xs">{dashboardMetrics.totalCrossFirLinks} linked across FIRs</span>}
        />
      </div>

      {/* Act Now Queue & Money Corridors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Act Now Card (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Act now"
              subtitle="Highest recoverable amount × least time left"
            />
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {actNowQueue.map((item) => (
                <div
                  key={item.caseId}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-semibold text-sm text-[var(--fg-1)] truncate">
                      {item.urgentActionTitle}
                    </div>
                    <div className="text-xs text-[var(--fg-3)] flex items-center gap-1.5 mt-0.5">
                      <span className="v6-mono font-semibold text-[var(--fg-2)]">{item.caseId}</span>
                      <span>·</span>
                      <span>{item.complainantName}</span>
                      <span>·</span>
                      <span className="v6-mono text-[var(--frozen)] font-semibold">
                        {formatInr(item.recoverableInr, { showPaise: false })} recoverable
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-none">
                    <Chip variant={item.slaMinsRemaining < 60 ? 'risk' : 'urgent'} withDot>
                      {item.slaMinsRemaining} min
                    </Chip>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setActiveCaseId(item.caseId);
                        setActiveView(item.targetRoute === 'intake' ? 'evidence' : item.targetRoute);
                      }}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                      iconPosition="right"
                    >
                      Act
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Money Corridors Map (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col">
            <CardHeader
              title="Money corridors"
              subtitle="Where victims' money is flowing (state → state)"
            />
            <div className="flex-1 relative flex items-center justify-center p-2 min-h-[220px]">
              <svg viewBox="0 0 500 300" className="w-full h-full max-h-[260px] overflow-visible">
                <defs>
                  <linearGradient id="v6CorridorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>

                {/* Flow Arcs */}
                {corridors.map((c, i) => {
                  const [x1, y1] = states[c.from];
                  const [x2, y2] = states[c.to];
                  const mx = (x1 + x2) / 2;
                  const my = Math.min(y1, y2) - 50;
                  const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
                  const strokeWidth = Math.max(2, c.amount / 70000);
                  const isHovered = hoveredCorridor === `${c.from}-${c.to}`;

                  return (
                    <g
                      key={`${c.from}-${c.to}`}
                      onMouseEnter={() => setHoveredCorridor(`${c.from}-${c.to}`)}
                      onMouseLeave={() => setHoveredCorridor(null)}
                      className="cursor-pointer"
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke="url(#v6CorridorGrad)"
                        strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                        strokeOpacity={isHovered ? 0.9 : 0.45}
                        strokeLinecap="round"
                        className="transition-all duration-200"
                      />
                      {/* Animated traveling particle */}
                      <circle r={3.5} fill="#fde68a" className="drop-shadow-[0_0_4px_#fbbf24]">
                        <animateMotion
                          dur={`${2.2 + i * 0.3}s`}
                          repeatCount="indefinite"
                          path={d}
                        />
                      </circle>
                    </g>
                  );
                })}

                {/* State Hub Nodes */}
                {Object.entries(states).map(([code, [x, y]]) => (
                  <g key={code} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={y}
                      r={15}
                      fill="rgba(99, 102, 241, 0.14)"
                      stroke="rgba(148, 163, 184, 0.35)"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={700}
                      fill="#eef2f8"
                      fontFamily="var(--font)"
                    >
                      {code}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Corridor Details Overlay */}
              {hoveredCorridor && (
                <div className="absolute bottom-2 left-4 right-4 p-2 rounded-lg bg-[var(--surface-3)]/90 border border-[var(--line-2)] backdrop-blur text-xs text-[var(--fg-1)] flex items-center justify-between">
                  <span>{corridors.find((c) => `${c.from}-${c.to}` === hoveredCorridor)?.label}</span>
                  <span className="v6-mono font-bold text-[var(--flow-2)]">
                    {formatInr(corridors.find((c) => `${c.from}-${c.to}` === hoveredCorridor)?.amount || 0, { showPaise: false })}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Active Cases Table Card */}
      <Card>
        <CardHeader
          title="Active cases"
          subtitle="Real-time multi-FIR surveillance and recovery monitoring"
          action={
            <Button
              variant="default"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateWizardOpen(true)}
            >
              New case
            </Button>
          }
        />
        <DataTable
          columns={columns}
          data={casesData}
          onRowClick={(row) => {
            setActiveCaseId(row.caseId);
            setActiveView('evidence');
          }}
          getRowId={(row) => row.caseId}
        />
      </Card>

      {/* Create Case Wizard Modal */}
      <CreateCaseWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
      />
    </div>
  );
};
