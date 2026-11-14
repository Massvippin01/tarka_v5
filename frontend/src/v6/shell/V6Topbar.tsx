import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';
import { ProgressRing } from '../ui/ProgressRing';
import { Chip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { NotificationCenterPopover } from '../../components/tarka/notifications/NotificationCenterPopover';
import { UpgradedCaseSwitcher } from '../../components/shell/UpgradedCaseSwitcher';

interface V6TopbarProps {
  onOpenCommandPalette?: () => void;
  onOpenNewCase?: () => void;
}

export const V6Topbar: React.FC<V6TopbarProps> = ({
  onOpenCommandPalette,
  onOpenNewCase,
}) => {
  const { activeCaseId, setActiveCaseId, setActiveView } = useCaseStore();
  const { caseWorkspaces, activeCase } = useTarkaGlobal();

  const caseId = activeCaseId || 'CASE-2026-001';
  const canonicalCase = getCanonicalCase(caseId);
  const financials = selectCaseActionFinancials(caseId);

  // Status mapping
  const statusConfig = useMemo(() => {
    const rawStatus = (activeCase as any)?.status || 'INVESTIGATING';
    switch (rawStatus.toUpperCase()) {
      case 'INVESTIGATING':
        return { variant: 'urgent' as const, label: 'Investigating', live: true };
      case 'ACTION_PENDING':
        return { variant: 'flow' as const, label: 'Action pending', live: false };
      case 'FROZEN':
        return { variant: 'frozen' as const, label: 'Frozen ❄', live: false };
      case 'COURT_READY':
        return { variant: 'safe' as const, label: 'Court ready', live: false };
      case 'CLOSED':
        return { variant: 'muted' as const, label: 'Closed', live: false };
      case 'ARCHIVED':
        return { variant: 'muted' as const, label: 'Archived', live: false };
      default:
        return { variant: 'urgent' as const, label: 'Investigating', live: true };
    }
  }, [activeCase]);

  // Golden hour format
  const ghMins = financials.goldenHourRemainingMins;
  const ghHours = Math.floor(ghMins / 60);
  const ghMinsRemainder = ghMins % 60;
  const ghText = ghMins <= 0 ? 'Expired' : `${ghHours > 0 ? `${ghHours}h ` : ''}${ghMinsRemainder}m`;
  const ghPercent = Math.max(0, Math.min(100, (ghMins / 180) * 100));

  const casePillTrigger = (
    <button
      type="button"
      className="flex items-center gap-3 p-1.5 pr-3 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] hover:border-[var(--line-2)] transition-colors cursor-pointer text-left"
      aria-label="Switch active case"
    >
      <div className="w-9 h-9 rounded-lg bg-[var(--risk-bg)] text-[var(--risk)] flex items-center justify-center flex-none">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div>
        <div className="font-bold text-sm text-[var(--fg-1)] leading-tight">
          {canonicalCase.complainant.name} · {canonicalCase.title || canonicalCase.typology}
        </div>
        <div className="text-xs text-[var(--fg-3)] flex items-center gap-1.5 mt-0.5">
          <span className="v6-mono font-semibold text-[var(--fg-2)]">{canonicalCase.caseId}</span>
          <span>·</span>
          <span>{canonicalCase.firNumber}</span>
          <span>·</span>
          <span>{canonicalCase.policeStation.split(',')[0]}</span>
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

      {/* Case Status Chip */}
      <Chip
        variant={statusConfig.variant}
        withDot
        live={statusConfig.live}
      >
        {statusConfig.label}
      </Chip>

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
        onClick={onOpenCommandPalette}
        className="border border-[var(--line)] bg-[var(--surface-1)]"
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
        onOpenAuditTrail={() => {}}
      />
    </header>
  );
};
