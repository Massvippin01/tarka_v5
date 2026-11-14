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
  Settings,
  Activity,
  UserCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useCaseStore } from '../../store/useCaseStore';
import { getCanonicalCase } from '../../fixtures/cases';
import { useSettingsStore } from '../../store/useSettingsStore';

interface V6RailProps {
  onOpenDemoUser?: () => void;
}

export const V6Rail: React.FC<V6RailProps> = ({ onOpenDemoUser }) => {
  const { activeCaseId, activeView, setActiveView } = useCaseStore();
  const { profile, station } = useSettingsStore();

  const canonicalCase = getCanonicalCase(activeCaseId || 'CASE-2026-001');

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
      views: ['device', 'handset-sim'],
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
    <aside className="v6-rail" aria-label="Main navigation">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 cursor-pointer" onClick={() => setActiveView('workspace')}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--flow)] to-[var(--flow-2)] flex items-center justify-center shadow-[0_0_24px_rgba(99,102,241,0.45)] flex-none">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-extrabold text-[15px] tracking-wider text-[var(--fg-1)]">
            TARKA
          </div>
          <div className="text-[11px] text-[var(--fg-3)] tracking-tight">
            Cyber Fraud Intelligence
          </div>
        </div>
      </div>

      {/* Top Hub Navigation */}
      <button
        type="button"
        onClick={() => setActiveView('workspace')}
        className={clsx(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13.5px] font-medium transition-colors w-full',
          isCurrentView(['dash', 'workspace'])
            ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold relative before:content-[""] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-[var(--flow)] before:to-[var(--flow-2)]'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <LayoutDashboard className="w-4 h-4 flex-none opacity-90" />
        <span>Command Center</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveView('cases')}
        className={clsx(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[13.5px] font-medium transition-colors w-full',
          isCurrentView(['cases'])
            ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold relative before:content-[""] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-[var(--flow)] before:to-[var(--flow-2)]'
            : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <FolderKanban className="w-4 h-4 flex-none opacity-90" />
        <span>All Cases</span>
        <span className="ml-auto v6-chip muted text-[11px] px-1.5 py-0.5">4</span>
      </button>

      {/* Active Case Stepper Group */}
      <div className="text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider px-2.5 pt-3 pb-1.5">
        Investigation · {canonicalCase.firNumber}
      </div>

      {steps.map((s) => {
        const isCurrent = isCurrentView(s.views);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => navStep(s.views[0])}
            className={clsx(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors w-full',
              isCurrent
                ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold relative before:content-[""] before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-gradient-to-b before:from-[var(--flow)] before:to-[var(--flow-2)]'
                : 'text-[var(--fg-2)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
            )}
          >
            <span
              className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-none border',
                s.done && !isCurrent
                  ? 'bg-[var(--safe)] border-[var(--safe)] text-[#04130d]'
                  : isCurrent
                  ? 'border-[var(--flow-2)] text-[var(--flow-2)] shadow-[0_0_0_3px_rgba(34,211,238,0.12)]'
                  : 'border-[var(--line-2)] text-[var(--fg-3)]'
              )}
            >
              {s.done && !isCurrent ? '✓' : s.num}
            </span>
            <span className="truncate">{s.label}</span>
          </button>
        );
      })}

      {/* Lab & System Navigation */}
      <div className="text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-wider px-2.5 pt-3 pb-1.5">
        Lab & System
      </div>

      <button
        type="button"
        onClick={() => setActiveView('lab')}
        className={clsx(
          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors w-full',
          isCurrentView(['lab'])
            ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold'
            : 'text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <FlaskConical className="w-4 h-4 flex-none opacity-90" />
        <span className="truncate">Court · Privacy · Lab</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveView('settings')}
        className={clsx(
          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors w-full',
          isCurrentView(['settings'])
            ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold'
            : 'text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Settings className="w-4 h-4 flex-none opacity-90" />
        <span className="truncate">Settings & Station</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveView('health')}
        className={clsx(
          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors w-full',
          isCurrentView(['health'])
            ? 'bg-[var(--flow-bg)] text-[var(--fg-1)] font-semibold'
            : 'text-[var(--fg-3)] hover:bg-[var(--hover)] hover:text-[var(--fg-1)]'
        )}
      >
        <Activity className="w-4 h-4 flex-none opacity-90" />
        <span className="truncate">Health & Diagnostics</span>
      </button>

      {/* Rail Footer with IO Persona */}
      <div
        className="mt-auto flex items-center gap-2.5 p-2 rounded-lg border-t border-[var(--line)] cursor-pointer hover:bg-[var(--hover)] transition-colors"
        onClick={onOpenDemoUser}
        data-testid="sidebar-io-avatar"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center font-bold text-xs text-[var(--fg-1)] flex-none">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-xs text-[var(--fg-1)] truncate">
            {officerName || 'Insp. R. K. Sharma'}
          </div>
          <div className="text-[11px] text-[var(--fg-3)] truncate">
            {officerStation || 'Cyber Crime PS, Noida'}
          </div>
        </div>
        <UserCheck className="w-3.5 h-3.5 text-[var(--fg-3)] flex-none" />
      </div>
    </aside>
  );
};
