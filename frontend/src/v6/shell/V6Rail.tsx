import React from 'react';
import {
  Shield,
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  Users,
  GitMerge,
  Network,
  Smartphone,
  Scale,
  FlaskConical,
  ShieldCheck,
  Zap,
  Settings,
  Activity,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { selectCaseActionFinancials } from '../../selectors/actionSelectors';

interface V6RailProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenDemoUser?: () => void;
}

interface RailItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  title?: string;
  testId?: string;
}

const RailItem: React.FC<RailItemProps> = ({
  icon,
  label,
  badge,
  active,
  onClick,
  collapsed,
  title,
  testId,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title || label}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    data-testid={testId}
    className={cn(
      'relative group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-all duration-150 w-full cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
      collapsed && 'justify-center px-0 py-2',
      active
        ? 'bg-blue-50/80 dark:bg-blue-950/40 text-[var(--accent)] font-semibold border border-blue-200/70 dark:border-blue-800/50 shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[var(--accent)]'
        : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)] border border-transparent'
    )}
  >
    <span
      className={cn(
        'flex items-center justify-center size-4 shrink-0 transition-colors',
        active ? 'text-[var(--accent)]' : 'text-[var(--fg-3)] group-hover:text-[var(--fg-1)]'
      )}
    >
      {icon}
    </span>
    {!collapsed && <span className="truncate text-[13px] leading-tight">{label}</span>}
    {!collapsed && badge && <span className="ml-auto shrink-0">{badge}</span>}
    {!collapsed && active && !badge && (
      <span className="ml-auto size-1.5 rounded-full bg-[var(--accent)] shrink-0" />
    )}
  </button>
);

export const V6Rail: React.FC<V6RailProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  onOpenDemoUser,
}) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { profile, station } = useSettingsStore();
  const { caseWorkspaces } = useTarkaGlobal();

  const caseId = activeCaseId || 'CASE-2026-001';
  const isCanonical = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(caseId);
  const matchedWorkspace = caseWorkspaces.find((c) => c.caseId === caseId);
  const isCaseUnknown =
    Boolean(activeCaseId) &&
    !isCanonical &&
    !matchedWorkspace;

  const canonicalCase = getCanonicalCase(caseId);
  const displayCaseId = isCaseUnknown ? 'UNKNOWN' : caseId;
  const displayFir = isCaseUnknown
    ? 'Unassigned'
    : matchedWorkspace
    ? matchedWorkspace.firNumber
    : isCanonical
    ? canonicalCase.firNumber
    : `FIR #${caseId}`;

  const victimName = isCaseUnknown
    ? 'Unknown Complainant'
    : matchedWorkspace
    ? matchedWorkspace.complainantName
    : isCanonical
    ? canonicalCase.complainant.name
    : 'Active Victim';

  const rawTypology = isCaseUnknown
    ? 'Investigation'
    : matchedWorkspace
    ? matchedWorkspace.typology
    : isCanonical
    ? canonicalCase.typology
    : 'CYBER_FRAUD';

  const displayTypology = rawTypology
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const financials = selectCaseActionFinancials(caseId);
  const ghMins = matchedWorkspace?.goldenHourRemainingMins ?? financials.goldenHourRemainingMins ?? 0;
  const isGoldenHourActive = ghMins > 0;

  const isCurrentView = (views: string[]) => views.includes(activeView);

  const steps = [
    {
      num: 1,
      id: 'evidence',
      views: ['evidence', 'intake'],
      label: 'Evidence & Ledger',
      icon: <FileSpreadsheet className="size-4" />,
      done: true,
    },
    {
      num: 2,
      id: 'people',
      views: ['people', 'entities'],
      label: 'People & Accounts',
      icon: <Users className="size-4" />,
      done: true,
    },
    {
      num: 3,
      id: 'money',
      views: ['money', 'taint-engine'],
      label: 'Money Trail',
      icon: <GitMerge className="size-4" />,
      done: true,
    },
    {
      num: 4,
      id: 'network',
      views: ['network'],
      label: 'Fraud Network',
      icon: <Network className="size-4" />,
      done: true,
    },
    {
      num: 5,
      id: 'device',
      views: ['device', 'handset-sim', 'attribution'],
      label: 'Device & SIM',
      icon: <Smartphone className="size-4" />,
      done: false,
    },
    {
      num: 6,
      id: 'actions',
      views: ['actions', 'report'],
      label: 'Actions & Report',
      icon: <Scale className="size-4" />,
      done: false,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => isCurrentView(s.views));
  const activeStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  const officerName = `${profile.rank} ${profile.name}`;
  const officerStation = `${station.stationName}, ${station.district}`;

  const initials = (profile.name || 'R. K. Sharma')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn('v6-rail', isCollapsed && 'items-center px-1.5')}
      aria-label="Main navigation"
    >
      {/* Brand Header */}
      <div className={cn('flex items-center gap-2 px-1 pt-1 pb-2.5', isCollapsed ? 'justify-center' : 'justify-between')}>
        <div
          className="flex items-center gap-2.5 cursor-pointer min-w-0 group"
          onClick={() => setActiveView('workspace')}
          title="TARKA · Cyber Fraud Intelligence Platform"
        >
          <div className="size-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 text-white shadow-2xs transition-transform group-hover:scale-102">
            <Shield className="size-4.5 stroke-[2.2]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-extrabold text-[14.5px] font-mono tracking-wider text-[var(--fg-1)] leading-none">
                TARKA
              </div>
              <div className="text-[12px] text-[var(--fg-3)] font-medium tracking-tight truncate mt-0.5">
                Cyber Intelligence
              </div>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="size-7 rounded-md text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            title={isCollapsed ? 'Expand sidebar (216px)' : 'Collapse sidebar (64px)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {/* Top Hub Navigation */}
      <div className="space-y-0.5">
        <RailItem
          icon={<LayoutDashboard className="size-4" />}
          label="Command Center"
          active={isCurrentView(['dash', 'workspace', 'dashboard'])}
          onClick={() => setActiveView('workspace')}
          collapsed={isCollapsed}
          title="Command Center Overview"
        />

        <RailItem
          icon={<FolderKanban className="size-4" />}
          label="All Cases"
          badge={
            <span className="text-[12px] font-semibold text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)] tabular-nums">
              4
            </span>
          }
          active={isCurrentView(['cases'])}
          onClick={() => setActiveView('cases')}
          collapsed={isCollapsed}
          title="All Cases Registry"
        />
      </div>

      {/* Active Case Context Mini-Card */}
      {!isCollapsed && !isCaseUnknown && (
        <div className="mx-0.5 my-1.5 p-2 rounded-lg bg-[var(--surface-2)]/60 border border-[var(--line)] shadow-2xs space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="v6-mono text-[12px] font-bold text-[var(--accent)] bg-blue-50/90 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/60 leading-none">
              {displayCaseId}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  isGoldenHourActive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                )}
              />
              <span className="text-[12px] font-medium text-[var(--fg-3)] tabular-nums leading-none">
                {isGoldenHourActive ? `${ghMins}m golden` : 'Active'}
              </span>
            </div>
          </div>
          <div className="text-[12px] font-semibold text-[var(--fg-1)] truncate leading-tight pt-0.5">
            {victimName}
          </div>
          <div className="text-[12px] text-[var(--fg-3)] truncate flex items-center justify-between leading-tight">
            <span className="truncate">{displayTypology}</span>
            <span className="text-[var(--fg-3)] font-mono text-[12px] shrink-0 ml-1">{displayFir}</span>
          </div>
        </div>
      )}

      {/* Investigation Stepper Group */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <span className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
            Investigation
          </span>
          <span className="text-[12px] font-medium text-[var(--fg-3)] tabular-nums">
            Stage {activeStepNumber}/6
          </span>
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-[var(--line)] my-1.5 mx-auto" />}

      {/* The 6 Investigation Steps */}
      <div className="space-y-0.5">
        {steps.map((s) => {
          const isCurrent = isCurrentView(s.views);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveView(s.views[0])}
              title={`${s.num}. ${s.label}${s.done && !isCurrent ? ' (Complete)' : isCurrent ? ' (Active)' : ''}`}
              aria-label={`${s.num}. ${s.label}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'relative group flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[12.5px] font-medium transition-all duration-150 w-full cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
                isCollapsed && 'justify-center px-0 py-2',
                isCurrent
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 text-[var(--accent)] font-semibold border border-blue-200/70 dark:border-blue-800/50 shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[var(--accent)]'
                  : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)] border border-transparent'
              )}
            >
              <span
                className={cn(
                  'size-5 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0 transition-colors border',
                  s.done && !isCurrent
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700/50'
                    : isCurrent
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs'
                    : 'bg-[var(--surface-2)] text-[var(--fg-3)] border-[var(--line)] group-hover:border-[var(--line-2)]'
                )}
              >
                {s.done && !isCurrent ? (
                  <Check className="size-3 stroke-[2.5]" />
                ) : (
                  s.num
                )}
              </span>
              {!isCollapsed && <span className="truncate">{s.label}</span>}
              {!isCollapsed && isCurrent && (
                <span className="size-1.5 rounded-full bg-[var(--accent)] ml-auto shrink-0" />
              )}
              {!isCollapsed && !isCurrent && s.done && (
                <span className="text-[12px] font-semibold text-emerald-600/80 ml-auto tabular-nums">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Forensic Lab Navigation */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-2 pt-2.5 pb-1">
          <span className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
            Forensic Lab
          </span>
          <span className="text-[12px] font-mono text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">
            ZKP/PSI
          </span>
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-[var(--line)] my-1.5 mx-auto" />}

      <div className="space-y-0.5">
        <RailItem
          icon={<Scale className="size-4" />}
          label="Court Dossier"
          badge={
            <span className="text-[12px] font-medium text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">
              §63
            </span>
          }
          active={isCurrentView(['court', 'court-proof', 'court-dossier', 'lab'])}
          onClick={() => setActiveView('court')}
          collapsed={isCollapsed}
          title="Court Dossier & BSA §63 Certificate Generator"
        />

        <RailItem
          icon={<ShieldCheck className="size-4" />}
          label="Privacy & ZKP"
          badge={
            <span className="text-[12px] font-medium text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">
              PSI
            </span>
          }
          active={isCurrentView(['privacy', 'privacy-crypto'])}
          onClick={() => setActiveView('privacy')}
          collapsed={isCollapsed}
          title="Private Set Intersection & Merkle Blind Index"
        />

        <RailItem
          icon={<FlaskConical className="size-4" />}
          label="Workstation"
          badge={
            <span className="text-[12px] font-medium text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">
              Loom
            </span>
          }
          active={isCurrentView(['workstation'])}
          onClick={() => setActiveView('workstation')}
          collapsed={isCollapsed}
          title="Temporal Forensic Evidence Loom"
        />

        <RailItem
          icon={<Zap className="size-4" />}
          label="Benchmarks"
          badge={
            <span className="text-[12px] font-mono font-medium text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)] tabular-nums">
              10k/s
            </span>
          }
          active={isCurrentView(['benchmarks', 'benchmark'])}
          onClick={() => setActiveView('benchmarks')}
          collapsed={isCollapsed}
          title="Synthetic & Real Data Statistical Calibration Suite"
        />
      </div>

      {/* System Group */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-2 pt-2.5 pb-1">
          <span className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
            System
          </span>
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-[var(--line)] my-1.5 mx-auto" />}

      <div className="space-y-0.5">
        <RailItem
          icon={<Settings className="size-4" />}
          label="Settings & Station"
          active={isCurrentView(['settings'])}
          onClick={() => setActiveView('settings')}
          collapsed={isCollapsed}
          title="Station Letterhead & Governance Settings"
        />

        <RailItem
          icon={<Activity className="size-4" />}
          label="Health & Diagnostics"
          badge={
            <span className="flex items-center gap-1 text-[12px] text-emerald-600 font-medium tabular-nums">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              100%
            </span>
          }
          active={isCurrentView(['health'])}
          onClick={() => setActiveView('health')}
          collapsed={isCollapsed}
          title="System Diagnostic Health & Cryptographic Chain Status"
        />
      </div>

      {/* Rail Footer with IO Officer Card */}
      <div
        className={cn(
          'mt-auto pt-2 border-t border-[var(--line)]',
          isCollapsed ? 'px-0' : 'px-0.5'
        )}
      >
        <button
          type="button"
          onClick={onOpenDemoUser}
          title={`${officerName} · ${officerStation} (Click to switch persona)`}
          aria-label={`Officer profile: ${officerName}, ${officerStation}`}
          data-testid="sidebar-io-avatar"
          className={cn(
            'group flex items-center gap-2.5 p-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)] hover:border-[var(--line-2)] transition-all duration-150 cursor-pointer w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] select-none',
            isCollapsed && 'justify-center p-1.5'
          )}
        >
          {/* Avatar with credential ring and online badge */}
          <div className="relative size-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border border-[var(--line)] flex items-center justify-center font-bold text-[12px] text-[var(--fg-1)] shrink-0 shadow-2xs">
            {initials}
            <span
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-[var(--surface-1)]"
              title="Authenticated IO Session Active"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[12.5px] text-[var(--fg-1)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                {officerName || 'Insp. Rajeshwar Rao'}
              </div>
              <div className="text-[12px] text-[var(--fg-3)] truncate mt-0.5 leading-tight">
                {officerStation || 'Noida Cyber Crime PS, UP'}
              </div>
            </div>
          )}

          {!isCollapsed && (
            <UserCheck className="size-3.5 text-[var(--fg-3)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
          )}
        </button>
      </div>
    </aside>
  );
};
