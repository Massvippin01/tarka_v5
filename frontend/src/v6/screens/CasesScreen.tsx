import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  FolderOpen,
} from 'lucide-react';
import { PageHead, Card, DataTable, Button, Chip, Gauge, type Column } from '../ui';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal, type CaseWorkspace } from '../../context/TarkaGlobalContext';
import { getCanonicalCase, CANONICAL_CASES } from '../../fixtures/cases';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';
import { formatInr } from '../../utils/formatters';
import { CreateCaseWizard } from '../../components/tarka/cases/CreateCaseWizard';
import { EditCaseSheet } from '../../components/tarka/cases/EditCaseSheet';

interface CaseDisplayItem {
  id: string;
  caseId: string;
  firNumber: string;
  policeStation: string;
  title: string;
  victimName: string;
  typology: string;
  status: string;
  statusVariant: 'urgent' | 'flow' | 'frozen' | 'safe' | 'muted';
  lossInr: number;
  recoveredInr: number;
  recoveryPct: number;
  goldenHourMins: number | null;
  ioName: string;
  workspaceRef?: CaseWorkspace;
}

export const CasesScreen: React.FC = () => {
  const { setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces } = useTarkaGlobal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'INVESTIGATING' | 'ACTION_PENDING' | 'FROZEN' | 'COURT_READY' | 'CLOSED' | 'ARCHIVED'>('ALL');
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseWorkspace | null>(null);

  // Compile full case list from caseWorkspaces and canonical baseline
  const allCases = useMemo<CaseDisplayItem[]>(() => {
    const canonicalIds = Object.keys(CANONICAL_CASES);
    const customCases = caseWorkspaces.filter((w) => !canonicalIds.includes(w.caseId));

    const canonicalItems: CaseDisplayItem[] = canonicalIds.map((cid) => {
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
          statusLabel = 'Action Pending';
          break;
        case 'FROZEN':
          statusVariant = 'frozen';
          statusLabel = 'Partially Frozen';
          break;
        case 'COURT_READY':
          statusVariant = 'safe';
          statusLabel = 'Court Ready';
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
        id: cid,
        caseId: cid,
        firNumber: canonical.firNumber,
        policeStation: canonical.policeStation,
        title: canonical.title || canonical.typology,
        victimName: canonical.complainant.name,
        typology: canonical.typology.replace(/_/g, ' '),
        status: statusLabel,
        statusVariant,
        lossInr: financials.bookedLossInr,
        recoveredInr: financials.recoverableLibrInr,
        recoveryPct: recPct,
        goldenHourMins: financials.goldenHourRemainingMins > 0 ? financials.goldenHourRemainingMins : null,
        ioName: canonical.leadInvestigator || 'Insp. R. K. Sharma',
        workspaceRef: ws,
      };
    });

    const customItems: CaseDisplayItem[] = customCases.map((w) => {
      const fin = selectCaseActionFinancials(w.caseId);
      const rawStatus = (w as any).status || 'INVESTIGATING';
      let statusVariant: 'urgent' | 'flow' | 'frozen' | 'safe' | 'muted' = 'urgent';
      let statusLabel = 'Investigating';

      switch (rawStatus.toUpperCase()) {
        case 'DRAFT':
          statusVariant = 'muted';
          statusLabel = 'Draft';
          break;
        case 'INTAKE':
        case 'INVESTIGATING':
          statusVariant = 'urgent';
          statusLabel = 'Investigating';
          break;
        case 'ACTION_PENDING':
          statusVariant = 'flow';
          statusLabel = 'Action Pending';
          break;
        case 'FROZEN':
          statusVariant = 'frozen';
          statusLabel = 'Partially Frozen';
          break;
        case 'COURT_READY':
          statusVariant = 'safe';
          statusLabel = 'Court Ready';
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

      const loss = fin.bookedLossInr || w.bookedLossInr || 0;
      const rec = fin.recoverableLibrInr || w.recoverableInr || 0;
      const recPct = loss > 0 ? Math.round((rec / loss) * 100) : 0;

      return {
        id: w.caseId,
        caseId: w.caseId,
        firNumber: w.firNumber,
        policeStation: w.policeStation || 'Noida Cyber Crime PS',
        title: w.title || w.firNumber,
        victimName: (w as any).victimName || 'Complainant',
        typology: (w.typology || 'CYBER_FRAUD').replace(/_/g, ' '),
        status: statusLabel,
        statusVariant,
        lossInr: loss,
        recoveredInr: rec,
        recoveryPct: recPct,
        goldenHourMins: w.goldenHourRemainingMins || null,
        ioName: w.leadInvestigator || 'Assigned Officer',
        workspaceRef: w,
      };
    });

    return [...canonicalItems, ...customItems];
  }, [caseWorkspaces]);

  // Filter & Search
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      // Status filter
      if (selectedFilter !== 'ALL') {
        const norm = c.status.toUpperCase().replace(/\s+/g, '_');
        if (selectedFilter === 'INVESTIGATING' && !norm.includes('INVESTIGATING')) return false;
        if (selectedFilter === 'ACTION_PENDING' && !norm.includes('ACTION_PENDING')) return false;
        if (selectedFilter === 'FROZEN' && !norm.includes('FROZEN')) return false;
        if (selectedFilter === 'COURT_READY' && !norm.includes('COURT_READY')) return false;
        if (selectedFilter === 'CLOSED' && !norm.includes('CLOSED')) return false;
        if (selectedFilter === 'ARCHIVED' && !norm.includes('ARCHIVED')) return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.caseId.toLowerCase().includes(q) ||
        c.firNumber.toLowerCase().includes(q) ||
        c.victimName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.ioName.toLowerCase().includes(q)
      );
    });
  }, [allCases, selectedFilter, searchQuery]);

  const columns: Column<CaseDisplayItem>[] = [
    {
      key: 'caseId',
      header: 'Case ID',
      width: '150px',
      render: (row) => <span className="v6-mono text-[12.5px] font-semibold text-[var(--fg-1)] whitespace-nowrap">{row.caseId}</span>,
    },
    {
      key: 'firNumber',
      header: 'FIR · Station',
      width: '150px',
      render: (row) => (
        <div className="min-w-0 max-w-[128px]">
          <div className="font-semibold text-[var(--fg-1)] truncate">{row.firNumber}</div>
          <div className="v6-card-s truncate">{row.policeStation.split(',')[0]}</div>
        </div>
      ),
    },
    {
      key: 'victimName',
      header: 'Victim · Typology',
      render: (row) => (
        <div className="min-w-0 max-w-[150px]">
          <div className="font-semibold text-[var(--fg-1)] truncate">{row.victimName}</div>
          <div className="v6-card-s capitalize truncate">{row.typology.toLowerCase().replace(/_/g, ' ')}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '124px',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Chip variant={row.statusVariant} withDot={row.statusVariant === 'urgent'}>
            {row.status}
          </Chip>
          <span
            className={row.goldenHourMins !== null && row.goldenHourMins >= 60 ? 'text-xs text-[var(--urgent)]' : 'text-xs text-[var(--risk)]'}
            title="Golden hour: time left to freeze money before it is withdrawn"
          >
            {row.goldenHourMins !== null ? `${row.goldenHourMins} min to freeze` : 'Golden hour over'}
          </span>
        </div>
      ),
    },
    {
      key: 'lossInr',
      header: 'Loss',
      isAmount: true,
      width: '112px',
      render: (row) => formatInr(row.lossInr, { showPaise: false }),
    },
    {
      key: 'recoveredInr',
      header: 'Recovered',
      width: '88px',
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
      key: 'ioName',
      header: 'IO',
      width: '140px',
      render: (row) => <span className="block truncate max-w-[100px] text-[var(--fg-2)] text-xs" title={row.ioName}>{row.ioName}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '84px',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Edit metadata"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => {
              if (row.workspaceRef) {
                setEditingCase(row.workspaceRef);
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Open Evidence"
            icon={<FolderOpen className="w-3.5 h-3.5" />}
            onClick={() => {
              setActiveCaseId(row.caseId);
              setActiveView('evidence');
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="v6-enter space-y-4" data-testid="v6-cases-screen">
      {/* Page Header */}
      <PageHead
        kicker="Case Registry"
        title="All Cyber Fraud Cases"
        subtitle="Active police inquiries, statutory liens, and judicial dossiers"
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

      <div className="grid grid-cols-1 gap-4">
        {/* Filter and Search Bar Card */}
        <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: `All (${allCases.length})` },
              { id: 'INVESTIGATING', label: 'Investigating' },
              { id: 'ACTION_PENDING', label: 'Action Pending' },
              { id: 'FROZEN', label: 'Frozen' },
              { id: 'COURT_READY', label: 'Court Ready' },
              { id: 'CLOSED', label: 'Closed' },
              { id: 'ARCHIVED', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedFilter === tab.id
                    ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] border border-[var(--flow)]/40'
                    : 'text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case, FIR, victim, IO..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-xs text-[var(--fg-1)] placeholder-[var(--fg-3)] outline-none focus:border-[var(--flow-2)] transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Cases Data Table Card */}
      <Card>
        <DataTable
          columns={columns}
          data={filteredCases}
          onRowClick={(row) => {
            setActiveCaseId(row.caseId);
            setActiveView('evidence');
          }}
          getRowId={(row) => row.caseId}
          emptyMessage={
            searchQuery ? `No cases match "${searchQuery}"` : 'No cases found in this category'
          }
        />
      </Card>
      </div>

      {/* Create Case Wizard Modal */}
      <CreateCaseWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
      />

      {/* Edit Case Metadata Sheet */}
      <EditCaseSheet
        isOpen={Boolean(editingCase)}
        caseData={editingCase}
        onClose={() => setEditingCase(null)}
      />
    </div>
  );
};
