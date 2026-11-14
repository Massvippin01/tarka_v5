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
  Briefcase,
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
      'group relative flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      collapsed
        ? 'size-9 justify-center mx-auto rounded-lg my-0.5'
        : 'gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-medium w-full',
      active
        ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200/90 shadow-2xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
    )}
  >
    {!collapsed && active && (
      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[#2563EB]" />
    )}
    <span
      className={cn(
        'flex items-center justify-center size-4 shrink-0 transition-colors',
        active ? 'text-[#2563EB] font-bold' : 'text-[var(--fg-3)] group-hover:text-[var(--fg-1)]'
      )}
    >
      {icon}
    </span>
    {!collapsed && <span className="truncate text-[13px] leading-tight flex-1">{label}</span>}
    {!collapsed && badge && <span className="ml-auto shrink-0">{badge}</span>}
    {!collapsed && active && !badge && (
      <span className="ml-auto size-2 rounded-full bg-[#2563EB] shrink-0" />
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
  const ghMins = financials.goldenHourRemainingMins > 0
    ? financials.goldenHourRemainingMins
    : (matchedWorkspace?.goldenHourRemainingMins ?? 0);
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

  // Clean, non-duplicative officer credentials
  const displayOfficerName =
    profile.name.startsWith(profile.rank) || profile.name.startsWith('Insp')
      ? profile.name
      : `${profile.rank} ${profile.name}`;
  const displayOfficerStation = (station.stationName || 'Noida Cyber Crime PS').replace(/,\s*(UP|Uttar Pradesh)$/i, '');

  const initials = (profile.name || 'Insp. Rajeshwar Rao')
    .replace(/^Insp\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RR';

  return (
    <aside
      className={cn('v6-rail', isCollapsed ? 'items-center px-1.5' : 'px-2.5')}
      aria-label="Main navigation"
    >
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-1.5 pt-1 pb-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveView('workspace')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveView('workspace')}
            title="TARKA · Cyber Fraud Intelligence Platform"
            className="size-9 rounded-lg flex items-center justify-center text-white shadow-xs hover:scale-105 transition-transform cursor-pointer select-none"
            style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
          >
            <Shield className="size-5 stroke-[2.2] text-white" />
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="size-7 rounded-md text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)] flex items-center justify-center transition-colors cursor-pointer"
              title="Expand sidebar (260px)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-1 pt-1 pb-2">
          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0 group"
            onClick={() => setActiveView('workspace')}
            title="TARKA · Cyber Fraud Intelligence Platform"
          >
            <div
              className="size-8.5 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: '#2563EB', color: '#ffffff' }}
            >
              <Shield className="size-4.5 stroke-[2.2] text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[15px] font-mono tracking-wider text-[var(--fg-1)] leading-none">
                TARKA
              </div>
              <div className="text-[11.5px] text-[var(--fg-3)] font-medium tracking-tight truncate mt-1">
                Cyber Intelligence
              </div>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="size-7 rounded-md text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
              title="Collapse sidebar (64px)"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
      )}

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
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 tabular-nums">
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
        <div
          onClick={() => setActiveView('workspace')}
          title={`Active Case: ${displayCaseId} · ${victimName} (Click to open workspace)`}
          className="mx-0.5 my-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group space-y-1.5"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[12px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 leading-none whitespace-nowrap shadow-2xs">
              {displayCaseId}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  'size-1.5 rounded-full shrink-0',
                  isGoldenHourActive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums leading-none px-2 py-0.5 rounded-md border shadow-2xs',
                  isGoldenHourActive
                    ? 'text-amber-800 bg-amber-50 border-amber-300'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                )}
              >
                {isGoldenHourActive ? `${ghMins}m golden` : 'Active'}
              </span>
            </div>
          </div>
          <div className="text-[13px] font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
            {victimName}
          </div>
          <div className="text-[11.5px] text-slate-500 flex items-center justify-between gap-1 leading-tight">
            <span className="truncate text-slate-600 font-medium">{displayTypology}</span>
            <span className="text-slate-600 font-mono text-[11px] font-medium shrink-0 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
              {displayFir}
            </span>
          </div>
        </div>
      )}

      {isCollapsed && !isCaseUnknown && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveView('workspace')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveView('workspace')}
          title={`Active Case: ${displayCaseId} · ${victimName} (${displayTypology}) · ${displayFir}`}
          className="size-9 rounded-lg mx-auto my-1 flex items-center justify-center border border-blue-200 text-blue-700 cursor-pointer hover:scale-105 transition-transform shadow-xs relative select-none bg-blue-50"
        >
          <Briefcase className="size-4" />
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-white',
              isGoldenHourActive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            )}
          />
        </div>
      )}

      {/* Investigation Stepper Group */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-2 pt-2.5 pb-1">
          <span className="text-[11px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
            Investigation
          </span>
          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md tabular-nums">
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
                'group relative flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isCollapsed
                  ? 'size-9 justify-center mx-auto rounded-lg my-0.5'
                  : 'gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-medium w-full',
                isCurrent
                  ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              )}
            >
              {!isCollapsed && isCurrent && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-full bg-[#2563EB]" />
              )}
              <span
                className={cn(
                  'size-5.5 rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0 transition-colors border',
                  s.done && !isCurrent
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : isCurrent
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                    : 'bg-slate-100 text-slate-500 border-slate-300 group-hover:border-slate-400 group-hover:bg-slate-200/70'
                )}
              >
                {s.done && !isCurrent ? (
                  <Check className="size-3.5 stroke-[3] text-white" />
                ) : (
                  s.num
                )}
              </span>
              {!isCollapsed && <span className="truncate flex-1 font-semibold">{s.label}</span>}
              {!isCollapsed && isCurrent && (
                <span className="size-2 rounded-full bg-[#2563EB] ml-auto shrink-0 shadow-[0_0_6px_rgba(37,99,235,0.6)] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Forensic Lab Navigation */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-2 pt-3 pb-1">
          <span className="text-[11px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
            Forensic Lab
          </span>
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-[var(--line)] my-1.5 mx-auto" />}

      <div className="space-y-0.5">
        <RailItem
          icon={<Scale className="size-4" />}
          label="Court Dossier"
          badge={
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
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
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
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
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
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
            <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 tabular-nums">
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
        <div className="flex items-center justify-between px-2 pt-3 pb-1">
          <span className="text-[11px] font-bold text-[var(--fg-3)] uppercase tracking-wider">
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
            <span className="flex items-center gap-1.5 text-[11.5px] text-emerald-700 font-bold tabular-nums ml-auto shrink-0 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
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
          title={`${displayOfficerName} · ${displayOfficerStation} (Click to switch persona)`}
          aria-label={`Officer profile: ${displayOfficerName}, ${displayOfficerStation}`}
          data-testid="sidebar-io-avatar"
          className={cn(
            'group flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
            isCollapsed
              ? 'justify-center p-1'
              : 'gap-2.5 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs w-full text-left'
          )}
        >
          {/* Avatar with credential ring and online badge */}
          <div className="relative size-8.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-[12px] text-white shrink-0 shadow-2xs">
            {initials}
            <span
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-white"
              title="Authenticated IO Session Active"
            />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[12.5px] text-[var(--fg-1)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                {displayOfficerName}
              </div>
              <div className="text-[11.5px] text-[var(--fg-3)] truncate mt-0.5 leading-tight">
                {displayOfficerStation}
              </div>
            </div>
          )}

          {!isCollapsed && (
            <UserCheck className="size-4 text-[var(--fg-3)] group-hover:text-[var(--accent)] shrink-0 transition-colors ml-0.5" />
          )}
        </button>
      </div>
    </aside>
  );
};