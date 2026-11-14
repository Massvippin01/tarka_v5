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
} from 'lucide-react';
import clsx from 'clsx';
import { useCaseStore } from '../../store/useCaseStore';
import { useTarkaGlobal } from '../../context/TarkaGlobalContext';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';

interface V6RailProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenDemoUser?: () => void;
}

export const V6Rail: React.FC<V6RailProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  onOpenDemoUser,
}) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { profile, station } = useSettingsStore();
  const { caseWorkspaces } = useTarkaGlobal();

  const isCanonical = ['CASE-2026-001', 'CASE-2026-002', 'CASE-2026-003', 'CASE-2026-004'].includes(activeCaseId || '');
  const matchedWorkspace = caseWorkspaces.find((c) => c.caseId === activeCaseId);
  const isCaseUnknown =
    Boolean(activeCaseId) &&
    !isCanonical &&
    !matchedWorkspace;

  const canonicalCase = getCanonicalCase(activeCaseId || 'CASE-2026-001');
  const displayFir = isCaseUnknown
    ? activeCaseId
    : matchedWorkspace
    ? matchedWorkspace.firNumber
    : isCanonical
    ? canonicalCase.firNumber
    : (activeCaseId || 'Active Case');

  const isCurrentView = (views: string[]) => views.includes(activeView);

  const navStep = (targetView: string) => {
    setActiveView(targetView);
  };

  const steps = [
    {
      num: 1,
      id: 'evidence',
      views: ['evidence', 'intake'],
      label: 'Evidence & Ledger',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      done: true,
    },
    {
      num: 2,
      id: 'people',
      views: ['people', 'entities'],
      label: 'People & Accounts',
      icon: <Users className="w-4 h-4" />,
      done: true,
    },
    {
      num: 3,
      id: 'money',
      views: ['money', 'taint-engine'],
      label: 'Money Trail',
      icon: <GitMerge className="w-4 h-4" />,
      done: true,
    },
    {
      num: 4,
      id: 'network',
      views: ['network'],
      label: 'Fraud Network',
      icon: <Network className="w-4 h-4" />,
      done: true,
    },
    {
      num: 5,
      id: 'device',
      views: ['device', 'handset-sim', 'attribution'],
      label: 'Device & SIM',
      icon: <Smartphone className="w-4 h-4" />,
      done: false,
    },
    {
      num: 6,
      id: 'actions',
      views: ['actions', 'report'],
      label: 'Actions & Report',
      icon: <Scale className="w-4 h-4" />,
      done: false,
    },
  ];

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
      className={clsx('v6-rail', isCollapsed && 'items-center px-1.5')}
      aria-label="Main navigation"
    >
      {/* Brand header */}
      <div className={clsx('flex items-center gap-2 px-1 pt-1 pb-3', isCollapsed ? 'justify-center' : 'justify-between')}>
        <div
          className="flex items-center gap-2 cursor-pointer min-w-0"
          onClick={() => setActiveView('workspace')}
          title="TARKA · Cyber Fraud Intelligence"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-none text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-extrabold text-[14px] tracking-wider text-[var(--fg-1)] leading-none">
                TARKA
              </div>
              <div className="text-[12px] text-[var(--fg-3)] tracking-tight truncate mt-0.5">
                Cyber Intelligence
              </div>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand sidebar (216px)' : 'Collapse sidebar (64px)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Top Hub Navigation */}
      <button
        type="button"
        onClick={() => setActiveView('workspace')}
        title="Command Center"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['dash', 'workspace', 'dashboard'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <LayoutDashboard className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span>Command Center</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveView('cases')}
        title="All Cases"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['cases'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <FolderKanban className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span>All Cases</span>}
        {!isCollapsed && <span className="ml-auto text-[12px] font-semibold text-[var(--fg-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--line)]">4</span>}
      </button>

      {/* Active Case Stepper Group */}
      {!isCollapsed && (
        <div className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider px-2 pt-2.5 pb-1">
          Case · {displayFir}
        </div>
      )}
      {isCollapsed && <div className="w-6 h-px bg-[var(--line)] my-1" />}

      {steps.map((s) => {
        const isCurrent = isCurrentView(s.views);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => navStep(s.views[0])}
            title={`${s.num}. ${s.label}`}
            className={clsx(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
              isCollapsed && 'justify-center px-0',
              isCurrent
                ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
                : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
            )}
          >
            <span
              className={clsx(
                'w-4 h-4 rounded-full flex items-center justify-center text-[12px] font-bold flex-none border',
                s.done && !isCurrent
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                  : isCurrent
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-blue-50'
                  : 'border-[var(--line-2)] text-[var(--fg-3)]'
              )}
            >
              {s.done && !isCurrent ? '✓' : s.num}
            </span>
            {!isCollapsed && <span className="truncate">{s.label}</span>}
          </button>
        );
      })}

      {/* Lab & System Navigation */}
      {!isCollapsed && (
        <div className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider px-2 pt-2.5 pb-1">
          Forensic Lab
        </div>
      )}
      {isCollapsed && <div className="w-6 h-px bg-[var(--line)] my-1" />}

      <button
        type="button"
        onClick={() => setActiveView('court')}
        title="Court Dossier"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['court', 'court-proof', 'court-dossier', 'lab'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Scale className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Court Dossier</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveView('privacy')}
        title="Privacy & ZKP"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['privacy', 'privacy-crypto'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <ShieldCheck className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Privacy & ZKP</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveView('workstation')}
        title="Workstation"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['workstation'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <FlaskConical className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Workstation</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveView('benchmarks')}
        title="Benchmarks"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['benchmarks', 'benchmark'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Zap className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Benchmarks</span>}
      </button>

      {!isCollapsed && (
        <div className="text-[12px] font-bold text-[var(--fg-3)] uppercase tracking-wider px-2 pt-2.5 pb-1">
          System
        </div>
      )}
      {isCollapsed && <div className="w-6 h-px bg-[var(--line)] my-1" />}

      <button
        type="button"
        onClick={() => setActiveView('settings')}
        title="Settings & Station"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['settings'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Settings className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Settings & Station</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveView('health')}
        title="Health & Diagnostics"
        className={clsx(
          'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[12.5px] font-medium transition-colors w-full cursor-pointer',
          isCollapsed && 'justify-center px-0',
          isCurrentView(['health'])
            ? 'bg-[var(--surface-2)] text-[var(--accent)] font-semibold'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Activity className="w-4 h-4 flex-none text-[var(--fg-3)]" />
        {!isCollapsed && <span className="truncate">Health & Diagnostics</span>}
      </button>

      {/* Rail Footer with IO Persona */}
      <div
        className={clsx(
          'mt-auto flex items-center gap-2 p-1.5 rounded-md border-t border-[var(--line)] cursor-pointer hover:bg-[var(--hover)] transition-colors',
          isCollapsed && 'justify-center'
        )}
        onClick={onOpenDemoUser}
        title={`${officerName} · ${officerStation}`}
        data-testid="sidebar-io-avatar"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center font-bold text-xs text-[var(--fg-1)] flex-none">
          {initials}
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-[var(--fg-1)] truncate">
              {officerName || 'Insp. R. K. Sharma'}
            </div>
            <div className="text-[12px] text-[var(--fg-3)] truncate">
              {officerStation || 'Cyber PS, Noida'}
            </div>
          </div>
        )}
        {!isCollapsed && <UserCheck className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />}
      </div>
    </aside>
  );
};
