import React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Zap,
  Search,
  FileText,
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
  const { toggleAskTarka, setIntelligenceBriefOpen } = useTarkaUiStore();

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

  const victimName = isCaseUnknown
    ? 'Unknown Case'
    : matchedWorkspace
    ? matchedWorkspace.complainantName
    : isCanonical
    ? canonicalCase.complainant.name
    : `Case ${caseId}`;

  const typology = isCaseUnknown
    ? 'Unregistered'
    : matchedWorkspace
    ? matchedWorkspace.title
    : isCanonical
    ? canonicalCase.title || canonicalCase.typology
    : 'Cyber Fraud';

  const displayCaseId = isCaseUnknown ? activeCaseId : isCanonical ? canonicalCase.caseId : caseId;
  const displayFir = isCaseUnknown
    ? 'Unregistered'
    : matchedWorkspace
    ? matchedWorkspace.firNumber
    : isCanonical
    ? canonicalCase.firNumber
    : `FIR #${caseId}`;

  const fullCaseTooltip = `${displayCaseId} · ${victimName} · ${typology} · ${displayFir}`;

  const casePillTrigger = (
    <button
      type="button"
      className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-2)] transition-colors cursor-pointer text-left shrink-0 max-w-[280px]"
      aria-label={`Switch case · ${displayCaseId} · ${displayFir}`}
      title={fullCaseTooltip}
    >
      <div className="w-5 h-5 rounded bg-[var(--risk-bg)] text-[var(--risk)] flex items-center justify-center shrink-0">
        <AlertTriangle className="w-3 h-3" />
      </div>
      <div className="truncate text-xs font-semibold text-[var(--fg-1)]">
        <span className="v6-mono text-[var(--accent)] font-bold mr-1">{displayCaseId}</span>
        <span>·</span>
        <span className="mx-1 text-[var(--fg-1)]">{victimName}</span>
        <span>·</span>
        <span className="ml-1 text-[var(--fg-3)] font-normal truncate">{typology}</span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-[var(--fg-3)] shrink-0 ml-auto" />
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
      <div className="shrink-0">
        <CaseStatusControl
          caseId={caseId}
          currentStatus={(activeCase as any)?.status || 'INVESTIGATING'}
          isArchived={activeCase && (activeCase as any).status === 'ARCHIVED'}
        />
      </div>

      {/* Quick Search / Command Palette Trigger */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-2)] text-[var(--fg-3)] hover:text-[var(--fg-1)] text-xs transition-colors cursor-pointer shrink-0"
        aria-label="Open command palette"
        data-testid="v6-topbar-command-btn"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden lg:inline font-medium">Search or jump...</span>
        <kbd className="v6-mono text-[10px] bg-[var(--surface-2)] px-1 py-0.2 rounded border border-[var(--line)] text-[var(--fg-3)]">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 min-w-2" />

      {/* Golden Hour Countdown Ring */}
      <div
        className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-[var(--surface-1)] border border-[var(--line)] shrink-0"
        title="Golden hour: critical legal containment window to freeze accounts"
      >
        <ProgressRing
          value={ghPercent}
          size={22}
          strokeWidth={2.5}
          color={ghMins < 45 ? 'var(--risk)' : 'var(--urgent)'}
        />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-[var(--fg-3)] font-medium hidden sm:inline">Golden hour</span>
          <span
            className="text-xs font-bold v6-mono"
            style={{ color: ghMins < 45 ? 'var(--risk)' : 'var(--urgent)' }}
          >
            {ghText}
          </span>
        </div>
      </div>

      {/* 7-Question Brief Modal Button */}
      <Button
        variant="ghost"
        size="sm"
        icon={<FileText className="w-3.5 h-3.5 text-[var(--fg-2)]" />}
        onClick={() => setIntelligenceBriefOpen(true)}
        data-testid="v6-topbar-brief-btn"
        className="h-8 px-2.5 border border-[var(--line)] bg-[var(--surface-1)] text-xs shrink-0"
        title="7-Question Intelligence Brief"
      >
        <span className="hidden sm:inline">Brief</span>
      </Button>

      {/* Ask TARKA Command / AI */}
      <Button
        variant="ghost"
        size="sm"
        icon={<Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />}
        onClick={() => toggleAskTarka()}
        data-testid="v6-topbar-ask-tarka-btn"
        className="h-8 px-2.5 border border-[var(--line)] bg-[var(--surface-1)] text-xs shrink-0"
      >
        Ask TARKA
      </Button>

      {/* Quick Action: Freeze accounts */}
      <Button
        variant="primary"
        size="sm"
        icon={<Zap className="w-3.5 h-3.5" />}
        onClick={() => setActiveView('actions')}
        data-testid="v6-topbar-freeze-btn"
        className="h-8 px-3 text-xs shrink-0"
      >
        Freeze accounts
      </Button>

      {/* Notifications Popover */}
      <div className="shrink-0">
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
      </div>
    </header>
  );
};
