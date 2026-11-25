import React, { useState } from 'react';
import {
  Inbox,
  Shield,
  LayoutDashboard,
  FolderKanban,
  FileText,
  UploadCloud,
  ShieldAlert,
  FileSpreadsheet,
  Users,
  GitMerge,
  Network,
  Smartphone,
  Scale,
  Settings,
  Activity,
  Gauge,
  CalendarClock,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCaseStore } from '../../store/useCaseStore';
import { useBundleCaseStore } from '../../store/useBundleCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatInr } from '../../lib/formatInr';
import { selectGoldenHour } from '../../lib/goldenHour';
import { setFocus, useFocus } from '../../lib/focusUrl';
import { useRailCounts } from './useRailCounts';

interface V6RailProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenDemoUser?: () => void;
}

interface Count {
  text: string;
  /** Red only when something is urgent. */
  urgent?: boolean;
}

interface RailItemProps {
  icon: React.ReactNode;
  label: string;
  count?: Count | null;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  title?: string;
  testId?: string;
  /** Replaces the icon (step markers). */
  marker?: React.ReactNode;
}

const RailItem: React.FC<RailItemProps> = ({ icon, label, count, active, onClick, collapsed, title, testId, marker }) => (
  <button
    type="button"
    onClick={onClick}
    title={count ? `${title || label} · ${count.text}` : title || label}
    aria-label={count ? `${label}, ${count.text}` : label}
    aria-current={active ? 'page' : undefined}
    data-testid={testId}
    className={cn(
      'group relative flex items-center shrink-0 cursor-pointer select-none rounded-lg border transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
      collapsed ? 'size-9 justify-center mx-auto' : 'w-full gap-2.5 h-8 px-2.5 text-left text-[12.5px]',
      active
        ? 'v6-rail-active text-[var(--fg-1)] font-semibold'
        : 'border-transparent text-[var(--fg-2)] font-medium hover:bg-[var(--glass-2)] hover:text-[var(--fg-1)]'
    )}
  >
    {!collapsed && active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--accent)]" />}
    <span className={cn('flex items-center justify-center size-[18px] shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--fg-3)] group-hover:text-[var(--fg-1)]')}>
      {marker ?? icon}
    </span>
    {!collapsed && <span className="truncate flex-1 leading-tight">{label}</span>}
    {count && (
      <span
        className={cn(
          'shrink-0 tabular-nums font-semibold leading-none',
          collapsed
            ? cn(
                'absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center border border-[var(--bg)]',
                count.text.length <= 2 ? 'min-w-[15px] h-[15px] px-1 text-[9px]' : 'size-2.5 text-[0px]' // long text (₹ amounts) becomes a dot; the tooltip has the figure
              )
            : 'text-[10.5px] px-1.5 py-[3px] rounded-md',
          count.urgent ? 'bg-[var(--risk)] text-white' : collapsed ? 'bg-[var(--fg-3)] text-[var(--bg)]' : 'bg-[var(--glass-1)] text-[var(--fg-3)] border border-[var(--line)]'
        )}
      >
        {count.text}
      </span>
    )}
  </button>
);

const SectionLabel: React.FC<{ collapsed: boolean; children: React.ReactNode; right?: React.ReactNode }> = ({ collapsed, children, right }) =>
  collapsed ? (
    <div className="w-6 h-px bg-[var(--line)] my-2 mx-auto shrink-0" />
  ) : (
    <div className="flex items-center justify-between px-2.5 pt-3 pb-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fg-3)]">
      <span>{children}</span>
      {right}
    </div>
  );

const num = (n: number | undefined, urgent = false): Count | null => (n === undefined || n <= 0 ? null : { text: n.toLocaleString('en-IN'), urgent });

export const V6Rail: React.FC<V6RailProps> = ({ isCollapsed = false, onToggleCollapse, onOpenDemoUser }) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { profile, station } = useSettingsStore();
  const { caseWorkspaces } = useTarkaGlobal();
  const focus = useFocus();
  const [moreOpen, setMoreOpen] = useState(false);

  const caseId = activeCaseId || 'CASE-2026-001';
  const isCanonical = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(caseId);
  const matchedWorkspace = caseWorkspaces.find((c) => c.caseId === caseId);
  const isCaseUnknown = Boolean(activeCaseId) && !isCanonical && !matchedWorkspace;
  const canonicalCase = getCanonicalCase(caseId);
  const victimName = isCaseUnknown
    ? 'Unknown complainant'
    : matchedWorkspace
    ? matchedWorkspace.complainantName
    : isCanonical
    ? canonicalCase.complainant.name
    : 'Active victim';

  useBundleCaseStore((s) => s.cases[caseId]); // re-render when this case's uploaded data loads
  const gh = selectGoldenHour(caseId); // same function as the top bar clock
  const c = useRailCounts(caseId);

  const isCurrentView = (views: string[]) => views.includes(activeView);

  const steps = [
    { id: 'triage', views: ['triage'], label: 'Triage', icon: ShieldAlert, count: num(c.undecided, true), tip: 'Networks nobody has decided on yet' },
    { id: 'evidence', views: ['evidence', 'intake'], label: 'Evidence', icon: FileSpreadsheet, count: null, tip: 'Uploaded files and the ledger' },
    { id: 'people', views: ['people', 'entities'], label: 'People & accounts', icon: Users, count: num(c.mules), tip: 'Suspected mule accounts' },
    {
      id: 'money',
      views: ['money', 'taint-engine'],
      label: 'Money trail',
      icon: GitMerge,
      count: c.freezableInr ? { text: formatInr(c.freezableInr, { compact: true }) } : null,
      tip: 'Still freezable',
    },
    { id: 'network', views: ['network'], label: 'Network', icon: Network, count: num(c.networks), tip: 'Fraud networks found' },
    { id: 'device', views: ['device', 'handset-sim', 'attribution'], label: 'Devices & SIMs', icon: Smartphone, count: num(c.deviceGroups), tip: 'Shared-device groups' },
    { id: 'actions', views: ['actions', 'report'], label: 'Actions & report', icon: Scale, count: num(c.toFreeze, !gh.expired), tip: 'Accounts still to freeze' },
  ];
  const currentStepIndex = steps.findIndex((s) => isCurrentView(s.views));

  const more = [
    { label: 'Case timeline', views: ['workstation'], icon: CalendarClock, view: 'workstation', tip: 'Contact, money, complaint and police action on one clock' },
    { label: 'Scale check', views: ['benchmarks', 'benchmark'], icon: Gauge, view: 'benchmarks', tip: 'How TARKA behaves on very large uploads' },
    { label: 'Settings & Station', views: ['settings'], icon: Settings, view: 'settings', tip: 'Station governance and configuration' },
    { label: 'Health', views: ['health'], icon: Activity, view: 'health', tip: 'System diagnostics' },
  ];
  const moreActive = more.some((m) => isCurrentView(m.views));
  const showMore = moreOpen || moreActive;

  const displayOfficerName = profile.name || 'Insp. Rajeshwar Rao';
  const displayOfficerStation = (station.stationName || 'Noida Cyber Crime PS').replace(/,\s*(UP|Uttar Pradesh)$/i, '');
  const initials =
    displayOfficerName.replace(/^Insp\.?\s+/i, '').split(' ').filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'RR';

  const crumb = 'truncate min-w-0 rounded px-1 -mx-1 hover:bg-[var(--glass-2)] hover:text-[var(--fg-1)] transition-colors text-left';

  return (
    <aside className={cn('v6-rail', isCollapsed ? 'items-center px-1.5' : 'px-3')} aria-label="Main navigation">
      {/* Header (pinned) */}
      <div className={cn('shrink-0 pb-2 border-b border-[var(--line)] w-full', isCollapsed ? 'flex flex-col items-center gap-1.5' : 'flex items-center justify-between px-1')}>
        <button
          type="button"
          onClick={() => setActiveView('home')}
          title="TARKA"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span className="size-8 rounded-lg flex items-center justify-center text-white bg-[#2357F5] shadow-sm">
            <Shield className="size-4 stroke-[2.2]" />
          </span>
          {!isCollapsed && <span className="font-extrabold text-[15px] font-mono tracking-widest text-[var(--fg-1)]">TARKA</span>}
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="size-7 rounded-lg text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--glass-2)] flex items-center justify-center transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {/* Middle (scrolls) */}
      <nav className={cn('v6-rail-scroll flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col gap-0.5 pb-2', isCollapsed && 'items-center')}>
        <SectionLabel collapsed={isCollapsed}>Work</SectionLabel>
        <RailItem icon={<Inbox className="size-4" />} label="Inbox" count={num(c.inbox, true)} active={isCurrentView(['desk'])} onClick={() => setActiveView('desk')} collapsed={isCollapsed} title="What needs you across your cases" testId="rail-nav-desk" />
        <RailItem icon={<LayoutDashboard className="size-4" />} label="Station dashboard" active={isCurrentView(['workspace', 'dash', 'dashboard'])} onClick={() => setActiveView('workspace')} collapsed={isCollapsed} title="Every active case at your station" />
        <RailItem icon={<FolderKanban className="size-4" />} label="Projects" active={isCurrentView(['projects'])} onClick={() => setActiveView('projects')} collapsed={isCollapsed} title="Group related cases into one operation" testId="rail-nav-projects" />
        <RailItem icon={<FileText className="size-4" />} label="All cases" active={isCurrentView(['cases'])} onClick={() => setActiveView('cases')} collapsed={isCollapsed} title="Every case you can access" />
        <RailItem icon={<UploadCloud className="size-4" />} label="Upload evidence" active={isCurrentView(['upload'])} onClick={() => setActiveView('upload')} collapsed={isCollapsed} title="Upload bank, telecom and device files" testId="rail-nav-upload" />

        {/* Focus: Project > Case > Network */}
        {!isCollapsed && !isCaseUnknown && (
          <div className="v6-rail-focus rounded-xl p-2.5 mt-3 mb-1 shrink-0 space-y-1.5" data-testid="rail-focus">
            <div className="flex items-center gap-1 text-[10.5px] text-[var(--fg-3)] min-w-0" aria-label="Focus">
              {c.project && (
                <>
                  <button type="button" className={cn(crumb, 'max-w-[40%]')} title={`Project: ${c.project.name}`} onClick={() => setActiveView('projects')}>
                    {c.project.name}
                  </button>
                  <ChevronRight className="size-3 shrink-0" />
                </>
              )}
              <button
                type="button"
                className={cn(crumb, 'font-mono font-semibold', !focus.networkId && 'text-[var(--fg-1)]')}
                title="Whole case"
                onClick={() => setFocus({ networkId: null, account: null })}
              >
                {caseId}
              </button>
              {focus.networkId && (
                <>
                  <ChevronRight className="size-3 shrink-0" />
                  <button
                    type="button"
                    className={cn(crumb, 'font-mono', !focus.account && 'text-[var(--fg-1)]')}
                    title={`Network ${focus.networkId}`}
                    onClick={() => setFocus({ networkId: focus.networkId, account: null })}
                  >
                    {focus.networkId}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => setActiveView('workspace')} className="text-[12px] font-semibold text-[var(--fg-1)] truncate text-left" title={`Complainant: ${victimName}`}>
                {victimName}
              </button>
              <span
                title="Golden hour left to freeze the money"
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-md border',
                  gh.expired ? 'text-[var(--risk)] border-[var(--risk)]/40 bg-[var(--risk)]/10' : 'text-[var(--urgent)] border-[var(--urgent)]/40 bg-[var(--urgent)]/10'
                )}
              >
                <span className={cn('size-1.5 rounded-full', gh.expired ? 'bg-[var(--risk)]' : 'bg-[var(--urgent)] animate-pulse')} />
                {gh.text}
              </span>
            </div>
          </div>
        )}

        <SectionLabel collapsed={isCollapsed} right={currentStepIndex >= 0 && <span className="normal-case tracking-normal font-semibold">Step {currentStepIndex + 1} of {steps.length}</span>}>
          This case
        </SectionLabel>
        {steps.map((s, idx) => {
          const isCurrent = isCurrentView(s.views);
          const isDone = currentStepIndex >= 0 && idx < currentStepIndex;
          const Icon = s.icon;
          return (
            <RailItem
              key={s.id}
              icon={<Icon className="size-4" />}
              label={s.label}
              count={s.count}
              active={isCurrent}
              onClick={() => setActiveView(s.views[0])}
              collapsed={isCollapsed}
              title={`${idx + 1}. ${s.label} — ${s.tip}`}
              testId={`rail-nav-${s.id}`}
              marker={
                isCollapsed ? undefined : isDone ? (
                  <span className="size-[18px] rounded-full bg-[#287653] text-white flex items-center justify-center">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="size-[18px] rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                    <span className="size-1.5 rounded-full bg-white" />
                  </span>
                ) : undefined
              }
            />
          );
        })}

        {/* More (collapsed by default) */}
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            title="More"
            aria-label="More"
            aria-expanded={showMore}
            className="size-9 mt-1 rounded-lg flex items-center justify-center text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--glass-2)] shrink-0"
          >
            <MoreHorizontal className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={showMore}
            className="flex items-center justify-between px-2.5 pt-3 pb-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors"
          >
            <span>More</span>
            {showMore ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        )}
        {showMore &&
          more.map((m) => {
            const Icon = m.icon;
            return <RailItem key={m.label} icon={<Icon className="size-4" />} label={m.label} active={isCurrentView(m.views)} onClick={() => setActiveView(m.view)} collapsed={isCollapsed} title={m.tip} />;
          })}
      </nav>

      {/* Profile (pinned) */}
      <div className="shrink-0 w-full pt-2 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onOpenDemoUser}
          title={`${displayOfficerName} · ${displayOfficerStation} (Click to switch persona)`}
          aria-label={`Officer profile: ${displayOfficerName}`}
          data-testid="sidebar-io-avatar"
          className={cn(
            'group flex items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl',
            isCollapsed ? 'justify-center p-1 mx-auto' : 'gap-2.5 p-2 w-full text-left border border-[var(--line)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)] transition-colors'
          )}
        >
          <div className="relative size-8 rounded-full bg-[var(--glass-3)] border border-[var(--line-2)] flex items-center justify-center font-bold text-xs text-[var(--fg-1)] shrink-0">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 border border-[var(--bg)]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-[var(--fg-1)] truncate leading-tight">{displayOfficerName}</div>
              <div className="text-[10.5px] text-[var(--fg-3)] truncate mt-0.5 leading-tight">{displayOfficerStation}</div>
            </div>
          )}
          {!isCollapsed && <UserCheck className="size-4 text-[var(--fg-3)] shrink-0" />}
        </button>
      </div>
    </aside>
  );
};
