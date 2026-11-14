import React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Zap,
  Search,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';
import { ProgressRing } from '../ui/ProgressRing';
import { Button } from '../ui/Button';
import { CaseStatusControl } from '../../components/tarka/cases/CaseStatusControl';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
import { NotificationCenterPopover } from '../../components/tarka/notifications/NotificationCenterPopover';
import { UpgradedCaseSwitcher } from '../../components/shell/UpgradedCaseSwitcher';

interface V6TopbarProps {
  onOpenCommandPalette?: () => void;
  onOpenNewCase?: () => void;
  onOpenAuditTrail?: (caseId?: string) => void;
}

export const V6Topbar: React.FC<V6TopbarProps> = ({
  onOpenCommandPalette,
  onOpenNewCase,
  onOpenAuditTrail,
}) => {
  const { activeCaseId, setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces, activeCase } = useTarkaGlobal();
  const { toggleAskTarka } = useTarkaUiStore();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = getCanonicalCase(caseId);
  const financials = selectCaseActionFinancials(caseId);


  // Golden hour format
  const ghMins = financials.goldenHourRemainingMins;
  const ghHours = Math.floor(ghMins / 60);
  const ghMinsRemainder = ghMins % 60;
  const ghText = ghMins <= 0 ? 'Expired' : `${ghHours > 0 ? `${ghHours}h ` : ''}${ghMinsRemainder}m`;
  const ghPercent = Math.max(0, Math.min(100, (ghMins / 180) * 100));

  const isCaseUnknown =
    Boolean(activeCaseId) &&
    !['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(activeCaseId!) &&
    !caseWorkspaces.some((c) => c.caseId === activeCaseId);

  const isCanonical = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(caseId);
  const matchedWorkspace = caseWorkspaces.find((c) => c.caseId === caseId);

  const displayTitle = isCaseUnknown
    ? `Unknown Case (${activeCaseId})`
    : matchedWorkspace
    ? `${matchedWorkspace.complainantName} · ${matchedWorkspace.title}`
    : isCanonical
    ? `${canonicalCase.complainant.name} · ${canonicalCase.title || canonicalCase.typology}`
    : `Case ${caseId}`;

  const displayCaseId = isCaseUnknown ? activeCaseId : isCanonical ? canonicalCase.caseId : caseId;
  const displayFir = isCaseUnknown
    ? 'Unregistered'
    : matchedWorkspace
    ? matchedWorkspace.firNumber
    : isCanonical
    ? canonicalCase.firNumber
    : `FIR #${caseId}`;
  const displayStation = isCaseUnknown
    ? ''
    : matchedWorkspace
    ? matchedWorkspace.policeStation.split(',')[0]
    : isCanonical
    ? canonicalCase.policeStation.split(',')[0]
    : 'Cyber PS';

  const casePillTrigger = (
    <button
      type="button"
      className="flex items-center gap-3 p-1.5 pr-3 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-2)] transition-colors cursor-pointer text-left"
      aria-label={`Switch case · ${displayCaseId} · ${displayFir}`}
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--risk-bg)] text-[var(--risk)] flex items-center justify-center flex-none">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div>
        <div className="font-bold text-sm text-[var(--fg-1)] leading-tight">
          {displayTitle}
        </div>
        <div className="text-xs text-[var(--fg-3)] flex items-center gap-1.5 mt-0.5">
          <span className="v6-mono font-semibold text-[var(--fg-2)]">
            {displayCaseId}
          </span>
          <span>·</span>
          <span>{displayFir}</span>
          {displayStation && (
            <>
              <span>·</span>
              <span>{displayStation}</span>
            </>
          )}
        </div>
      </div>
      <ChevronDown className="w-4 h-4 text-[var(--fg-3)] ml-1 flex-none" />
    </button>
  );

  return (
    <header className="v6-topbar">
      {/* Upgraded Case Switcher Pill */}
      <UpgradedCaseSwitcher
        activeCase={activeCase}
        activeCaseId={caseId}
        caseWorkspaces={caseWorkspaces}
        onSelectCase={(id) => setActiveCaseId(id)}
        onOpenNewCase={onOpenNewCase || (() => {})}
        trigger={casePillTrigger}
      />

      {/* Interactive Case Lifecycle Status Control */}
      <CaseStatusControl
        caseId={caseId}
        currentStatus={(activeCase as any)?.status || 'INVESTIGATING'}
        isArchived={activeCase && (activeCase as any).status === 'ARCHIVED'}
      />

      {/* Quick Search / Command Palette Trigger */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-2)] text-[var(--fg-3)] hover:text-[var(--fg-1)] text-xs transition-colors cursor-pointer"
        aria-label="Open command palette"
        data-testid="v6-topbar-command-btn"
      >
        <Search className="w-3.5 h-3.5 flex-none" />
        <span className="hidden md:inline font-medium">Search or jump...</span>
        <kbd className="v6-mono text-[10px] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)] text-[var(--fg-3)]">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Golden Hour Countdown Ring */}
      <div
        className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-[var(--surface-1)] border border-[var(--line)]"
        title="Golden hour: critical legal containment window to freeze accounts"
      >
        <ProgressRing
          value={ghPercent}
          size={32}
          strokeWidth={3}
          color={ghMins < 45 ? 'var(--risk)' : 'var(--urgent)'}
        />
        <div className="text-left">
          <div className="text-[10.5px] font-medium text-[var(--fg-3)] leading-none mb-0.5">
            Golden hour left
          </div>
          <div
            className="text-[13px] font-bold v6-mono leading-none"
            style={{ color: ghMins < 45 ? '#fda4af' : '#fcd34d' }}
          >
            {ghText}
          </div>
        </div>
      </div>

      {/* Ask TARKA Command / AI */}
      <Button
        variant="ghost"
        size="md"
        icon={<Sparkles className="w-4 h-4 text-[var(--flow-2)]" />}
        onClick={() => toggleAskTarka()}
        data-testid="v6-topbar-ask-tarka-btn"
        className="border border-[var(--line)] bg-[var(--surface-1)] cursor-pointer"
      >
        Ask TARKA
      </Button>

      {/* Quick Action: Freeze accounts */}
      <Button
        variant="primary"
        size="md"
        icon={<Zap className="w-4 h-4" />}
        onClick={() => setActiveView('actions')}
        data-testid="v6-topbar-freeze-btn"
      >
        Freeze accounts
      </Button>

      {/* Notifications Popover */}
      <NotificationCenterPopover
        onNavigateToCase={(targetCaseId, route) => {
          setActiveCaseId(targetCaseId);
          setActiveView(route);
        }}
        onOpenAuditTrail={() => {
          if (onOpenAuditTrail) {
            onOpenAuditTrail(caseId);
          }
        }}
      />
    </header>
  );
};
