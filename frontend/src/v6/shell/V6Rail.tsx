import React, { useState } from 'react';
import {
  Shield,
  Home,
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
  ChevronDown,
  ChevronRight,
  MessageSquare,
  FileText,
  Lock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTarkaUiStore } from '../../store/useTarkaUiStore';
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
  isSubItem?: boolean;
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
  isSubItem = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title || label}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    data-testid={testId}
    className={cn(
      'group relative flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E08244] overflow-hidden',
      collapsed
        ? 'size-9 justify-center mx-auto rounded-lg my-0.5'
        : cn(
            'gap-2.5 px-3 py-2 rounded-xl text-left text-[12.5px] font-medium w-full',
            isSubItem && 'pl-7 py-1.5 text-[12px]'
          ),
      active
        ? 'bg-gradient-to-r from-[#4A3830] to-[#3A2C26] text-[#FFFDF8] font-semibold border border-white/15 shadow-sm'
        : 'text-[#D5CABE] hover:bg-[#342C28] hover:text-[#FFFDF8] border border-transparent'
    )}
  >
    {!collapsed && active && (
      <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-[#E08244] shadow-[0_0_8px_rgba(224,130,68,0.8)]" />
    )}
    <span
      className={cn(
        'flex items-center justify-center size-4 shrink-0 transition-colors',
        active ? 'text-[#F39A5D] font-bold' : 'text-[#A89C90] group-hover:text-[#FFFDF8]'
      )}
    >
      {icon}
    </span>
    {!collapsed && <span className="truncate flex-1 leading-tight">{label}</span>}
    {!collapsed && badge && <span className="ml-auto shrink-0">{badge}</span>}
    {!collapsed && active && !badge && (
      <span className="ml-auto size-2 rounded-full bg-[#E08244] shrink-0 shadow-[0_0_6px_rgba(224,130,68,0.8)]" />
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
  const { toggleAskTarka } = useTarkaUiStore();

  const [toolsOpen, setToolsOpen] = useState(true);

  const caseId = activeCaseId || 'CASE-2026-001';
  const isCanonical = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(caseId);
  const matchedWorkspace = caseWorkspaces.find((c) => c.caseId === caseId);
  const isCaseUnknown = Boolean(activeCaseId) && !isCanonical && !matchedWorkspace;

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
      icon: <FileSpreadsheet className="size-3.5" />,
      done: true,
    },
    {
      num: 2,
      id: 'people',
      views: ['people', 'entities'],
      label: 'People & Accounts',
      icon: <Users className="size-3.5" />,
      done: true,
    },
    {
      num: 3,
      id: 'money',
      views: ['money', 'taint-engine'],
      label: 'Money Trail (Reconstruction)',
      icon: <GitMerge className="size-3.5" />,
      done: true,
    },
    {
      num: 4,
      id: 'network',
      views: ['network'],
      label: 'Fraud Network Graph',
      icon: <Network className="size-3.5" />,
      done: true,
    },
    {
      num: 5,
      id: 'device',
      views: ['device', 'handset-sim', 'attribution'],
      label: 'Device, SIM & Claims',
      icon: <Smartphone className="size-3.5" />,
      done: false,
    },
    {
      num: 6,
      id: 'actions',
      views: ['actions', 'report'],
      label: 'Actions & Recovery',
      icon: <Scale className="size-3.5" />,
      done: false,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => isCurrentView(s.views));
  const activeStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  const displayOfficerName = profile.name || 'Insp. Rajeshwar Rao';
  const displayOfficerStation = (station.stationName || 'Noida Cyber Crime PS').replace(/,\s*(UP|Uttar Pradesh)$/i, '');

  const initials = displayOfficerName
    .replace(/^Insp\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RR';

  return (
    <aside
      className={cn('v6-rail', isCollapsed ? 'items-center px-1.5' : 'px-3')}
      aria-label="Main navigation"
    >
      {/* 1. Sculpted Top Header & Profile Section (Inspired by Curved Sidebar Reference) */}
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-2 pt-1 pb-3 border-b border-white/10 w-full">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            title="TARKA · Sovereign Cyber Intelligence"
            className="size-9 rounded-xl flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform bg-[#A85C2A]"
          >
            <Shield className="size-4.5 stroke-[2.2] text-white" />
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="size-7 rounded-lg text-[#A89C90] hover:text-[#FFFDF8] hover:bg-[#342C28] flex items-center justify-center transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="pt-1 pb-3 border-b border-white/10 w-full space-y-3">
          {/* Top Brand & Collapse Bar */}
          <div className="flex items-center justify-between px-1">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setActiveView('home')}
              title="TARKA · Home"
            >
              <div className="size-7.5 rounded-lg flex items-center justify-center text-white bg-[#A85C2A] shadow-sm">
                <Shield className="size-4 stroke-[2.2] text-white" />
              </div>
              <span className="font-extrabold text-[15px] font-mono tracking-widest text-[#FFFDF8]">
                TARKA
              </span>
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="size-7 rounded-lg text-[#A89C90] hover:text-[#FFFDF8] hover:bg-[#342C28] flex items-center justify-center transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </div>

          {/* Officer Profile Card (Matching "Nova PRO" in Reference Screenshot) */}
          <div
            onClick={onOpenDemoUser}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-gradient-to-b from-[#2B2420] to-[#221C19] border border-white/10 shadow-inner hover:border-amber-600/40 transition-colors cursor-pointer group"
            title="Active Officer Profile · Click to switch"
          >
            <div className="relative size-9 rounded-full bg-[#3D322B] border border-amber-600/30 flex items-center justify-center font-bold text-xs text-amber-200 shrink-0">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-[#221C19]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-[#FFFDF8] truncate leading-tight group-hover:text-amber-200">
                  {displayOfficerName.replace(/^Insp\.?\s+/i, '')}
                </span>
                <span className="text-[9.5px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                  PRO
                </span>
              </div>
              <div className="text-[10.5px] font-mono text-[#A89C90] truncate leading-tight mt-0.5">
                UID: 2026-IND-04
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Case Context Pill (If active case loaded) */}
      {!isCollapsed && !isCaseUnknown && (
        <div
          onClick={() => setActiveView('workspace')}
          className="my-2 p-2.5 rounded-xl bg-[#231E1B] border border-white/10 hover:border-amber-600/30 transition-all cursor-pointer group space-y-1.5"
          title={`Active Investigation: ${displayCaseId}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-800/60 leading-none">
              {displayCaseId}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold tabular-nums px-2 py-0.5 rounded-md border',
                isGoldenHourActive
                  ? 'text-amber-300 bg-amber-950/60 border-amber-700/60'
                  : 'text-emerald-300 bg-emerald-950/60 border-emerald-700/60'
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  isGoldenHourActive ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                )}
              />
              {isGoldenHourActive ? `${ghMins}m golden` : 'Active'}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-[#FFFDF8] truncate group-hover:text-amber-200">
            {victimName}
          </div>
          <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10.5px] text-[#A89C90]">
            <span className="truncate">{displayTypology}</span>
            <span className="font-mono shrink-0">{displayFir}</span>
          </div>
        </div>
      )}

      {/* 2. Group: PRIMARY */}
      {!isCollapsed && (
        <div className="px-2 pt-2.5 pb-1 text-[10.5px] font-mono font-bold text-[#8C7F73] uppercase tracking-wider">
          Primary
        </div>
      )}
      <div className="space-y-0.5">
        <RailItem
          icon={<Home className="size-4" />}
          label="Home (Orb Interface)"
          active={isCurrentView(['home'])}
          onClick={() => setActiveView('home')}
          collapsed={isCollapsed}
          title="TARKA Particle Intelligence Home"
          testId="rail-nav-home"
        />

        <RailItem
          icon={<LayoutDashboard className="size-4" />}
          label="Command Centre"
          active={isCurrentView(['workspace', 'dash', 'dashboard'])}
          onClick={() => setActiveView('workspace')}
          collapsed={isCollapsed}
          title="Skeuomorphic Operational Command Centre"
        />

        <RailItem
          icon={<FolderKanban className="size-4" />}
          label="Investigations (All Cases)"
          badge={
            <span className="text-[10px] font-bold text-amber-200 bg-[#3B2F28] px-1.5 py-0.2 rounded-full border border-white/10">
              4
            </span>
          }
          active={isCurrentView(['cases'])}
          onClick={() => setActiveView('cases')}
          collapsed={isCollapsed}
          title="All Cases Registry"
        />

        <RailItem
          icon={<FileSpreadsheet className="size-4" />}
          label="Evidence Ledger & Intake"
          active={isCurrentView(['evidence', 'intake'])}
          onClick={() => setActiveView('evidence')}
          collapsed={isCollapsed}
          title="Admitted Evidence Ledger & Streaming Intake"
        />

        <RailItem
          icon={<MessageSquare className="size-4" />}
          label="Universal AI Copilot"
          active={false}
          onClick={toggleAskTarka}
          collapsed={isCollapsed}
          title="Open Evidence-Grounded Assistant (Key: A)"
        />

        <RailItem
          icon={<FileText className="size-4" />}
          label="Statutory Reports"
          badge={
            <span className="text-[10px] font-mono font-semibold text-amber-200 bg-[#3B2F28] px-1.5 py-0.2 rounded-md border border-white/10">
              §63 BSA
            </span>
          }
          active={isCurrentView(['actions', 'report'])}
          onClick={() => setActiveView('actions')}
          collapsed={isCollapsed}
          title="Statutory Certificates & Court Proofs"
        />
      </div>

      {/* 3. Group: INVESTIGATION TOOLS (With Collapsible Subtree & Connectors) */}
      {!isCollapsed && (
        <div
          onClick={() => setToolsOpen(!toolsOpen)}
          className="flex items-center justify-between px-2 pt-3 pb-1 cursor-pointer select-none text-[#8C7F73] hover:text-[#FFFDF8] transition-colors"
        >
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider">
            Investigation Tools
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-amber-300 bg-[#3B2F28] px-1.5 py-0.2 rounded-md">
              Stage {activeStepNumber}/6
            </span>
            {toolsOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </div>
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-white/10 my-1.5 mx-auto" />}

      {toolsOpen && (
        <div className={cn('space-y-0.5', !isCollapsed && 'pl-1 border-l border-white/10 ml-2')}>
          {steps.map((s) => {
            const isCurrent = isCurrentView(s.views);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveView(s.views[0])}
                title={`${s.num}. ${s.label}`}
                aria-label={s.label}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E08244] overflow-hidden',
                  isCollapsed
                    ? 'size-9 justify-center mx-auto rounded-lg my-0.5'
                    : 'gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-[12px] font-medium w-full',
                  isCurrent
                    ? 'bg-gradient-to-r from-[#4A3830] to-[#3A2C26] text-[#FFFDF8] font-semibold border border-white/15 shadow-sm'
                    : 'text-[#D5CABE] hover:bg-[#342C28] hover:text-[#FFFDF8] border border-transparent'
                )}
              >
                {!isCollapsed && isCurrent && (
                  <span className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-[#E08244] shadow-[0_0_8px_rgba(224,130,68,0.8)]" />
                )}
                <span
                  className={cn(
                    'size-5 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 transition-colors border',
                    s.done && !isCurrent
                      ? 'bg-[#287653] text-white border-[#287653]'
                      : isCurrent
                      ? 'bg-[#E08244] text-white border-[#E08244]'
                      : 'bg-[#342C28] text-[#8C7F73] border-white/10'
                  )}
                >
                  {s.done && !isCurrent ? <Check className="size-3 stroke-[3]" /> : s.num}
                </span>
                {!isCollapsed && <span className="truncate flex-1 font-medium">{s.label}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Group: LABORATORY */}
      {!isCollapsed && (
        <div className="px-2 pt-3 pb-1 text-[10.5px] font-mono font-bold text-[#8C7F73] uppercase tracking-wider">
          Laboratory
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-white/10 my-1.5 mx-auto" />}

      <div className="space-y-0.5">
        <RailItem
          icon={<FlaskConical className="size-4" />}
          label="Temporal Evidence Loom"
          badge={
            <span className="text-[10px] font-mono text-amber-200 bg-[#3B2F28] px-1.5 py-0.2 rounded-md">
              Loom
            </span>
          }
          active={isCurrentView(['workstation'])}
          onClick={() => setActiveView('workstation')}
          collapsed={isCollapsed}
          title="Temporal Evidence Loom Analysis"
        />

        <RailItem
          icon={<Zap className="size-4" />}
          label="Benchmark & Scale Lab"
          badge={
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-700/40">
              10k/s
            </span>
          }
          active={isCurrentView(['benchmarks', 'benchmark'])}
          onClick={() => setActiveView('benchmarks')}
          collapsed={isCollapsed}
          title="Benchmarking & Scale Calibration"
        />

        <RailItem
          icon={<ShieldCheck className="size-4" />}
          label="Privacy & Cryptographic ZKP"
          active={isCurrentView(['privacy', 'privacy-crypto'])}
          onClick={() => setActiveView('privacy')}
          collapsed={isCollapsed}
          title="Private Set Intersection & Merkle Verification"
        />
      </div>

      {/* 5. Group: ADMINISTRATION */}
      {!isCollapsed && (
        <div className="px-2 pt-3 pb-1 text-[10.5px] font-mono font-bold text-[#8C7F73] uppercase tracking-wider">
          Administration
        </div>
      )}
      {isCollapsed && <div className="w-8 h-px bg-white/10 my-1.5 mx-auto" />}

      <div className="space-y-0.5">
        <RailItem
          icon={<Settings className="size-4" />}
          label="Settings & Station"
          active={isCurrentView(['settings'])}
          onClick={() => setActiveView('settings')}
          collapsed={isCollapsed}
          title="Station Governance & Configuration"
        />

        <RailItem
          icon={<Activity className="size-4" />}
          label="Health & Diagnostics"
          badge={
            <span className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-bold ml-auto shrink-0 bg-emerald-950/60 border border-emerald-700/60 px-1.5 py-0.2 rounded-md">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              100%
            </span>
          }
          active={isCurrentView(['health'])}
          onClick={() => setActiveView('health')}
          collapsed={isCollapsed}
          title="System Diagnostic Health"
        />
      </div>

      {/* 6. Bottom Bulletin / Notice Card (Directly from Reference Image 3) */}
      {!isCollapsed && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-[#2B231E] to-[#1C1714] border border-white/10 shadow-sm space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold font-mono uppercase tracking-wider">
            <Lock className="size-3" />
            <span>NOTICE</span>
          </div>
          <div className="text-[11.5px] text-slate-200 leading-snug">
            Section 63 BSA Hash Lockdown Active. All ingested artifacts cryptographically sealed.
          </div>
          <button
            type="button"
            onClick={() => setActiveView('actions')}
            className="text-[10.5px] text-amber-400 font-semibold hover:text-amber-300 transition-colors inline-flex items-center gap-1 pt-0.5"
          >
            <span>Verify Manifest</span>
            <ChevronRight className="size-3" />
          </button>
        </div>
      )}

      {/* 7. Bottom IO Officer Persona Action */}
      <div className={cn('mt-auto pt-2 border-t border-white/10', isCollapsed ? 'px-0' : 'px-0.5')}>
        <button
          type="button"
          onClick={onOpenDemoUser}
          title={`${displayOfficerName} · ${displayOfficerStation} (Click to switch persona)`}
          aria-label={`Officer profile: ${displayOfficerName}`}
          data-testid="sidebar-io-avatar"
          className={cn(
            'group flex items-center transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E08244]',
            isCollapsed
              ? 'justify-center p-1'
              : 'gap-2.5 p-2 rounded-xl border border-white/10 bg-[#221C19] hover:bg-[#342C28] shadow-sm w-full text-left'
          )}
        >
          <div className="relative size-8 rounded-full bg-[#3D322B] border border-amber-600/30 flex items-center justify-center font-bold text-xs text-amber-200 shrink-0">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 border border-[#221C19]" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-[#FFFDF8] truncate leading-tight group-hover:text-amber-200">
                {displayOfficerName}
              </div>
              <div className="text-[10.5px] text-[#A89C90] truncate mt-0.5 leading-tight">
                {displayOfficerStation}
              </div>
            </div>
          )}

          {!isCollapsed && (
            <UserCheck className="size-4 text-[#A89C90] group-hover:text-amber-200 shrink-0 ml-0.5" />
          )}
        </button>
      </div>
    </aside>
  );
};
