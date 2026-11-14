import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Scale,
  ShieldCheck,
  Cpu,
  Zap,
} from 'lucide-react';
import { PageHead } from '../ui/PageHead';
import { Skeleton } from '../ui/Skeleton';
import { useCaseStore } from '../../store/useCaseStore';

const CourtProofScreen = lazy(() =>
  import('../../pages/v5/CourtProofScreen').then((m) => ({ default: m.CourtProofScreen }))
);
const PrivacyCryptoWorkbench = lazy(() =>
  import('../../components/tarka/privacy/PrivacyCryptoWorkbench').then((m) => ({
    default: m.PrivacyCryptoWorkbench,
  }))
);
const ForensicWorkstationScreen = lazy(() =>
  import('../../pages/v5/ForensicWorkstationScreen').then((m) => ({
    default: m.ForensicWorkstationScreen,
  }))
);
const BenchmarkLabScreen = lazy(() =>
  import('../../pages/v5/BenchmarkLabScreen').then((m) => ({ default: m.BenchmarkLabScreen }))
);

export type LabTab = 'court-proof' | 'privacy-crypto' | 'workstation' | 'benchmarks';

interface LabScreenProps {
  initialTab?: LabTab;
}

export const LabScreen: React.FC<LabScreenProps> = ({ initialTab }) => {
  const { activeView, setActiveView } = useCaseStore();

  const getActiveTabFromView = (view: string): LabTab => {
    if (view === 'court-proof' || view === 'court' || view === 'court-dossier') return 'court-proof';
    if (view === 'privacy-crypto' || view === 'privacy') return 'privacy-crypto';
    if (view === 'workstation') return 'workstation';
    if (view === 'benchmarks' || view === 'benchmark') return 'benchmarks';
    return initialTab || 'court-proof';
  };

  const [activeTab, setActiveTab] = useState<LabTab>(() => getActiveTabFromView(activeView));

  useEffect(() => {
    if (['court-proof', 'court', 'court-dossier', 'privacy-crypto', 'privacy', 'workstation', 'benchmarks', 'benchmark'].includes(activeView)) {
      setActiveTab(getActiveTabFromView(activeView));
    }
  }, [activeView]);

  const handleTabChange = (tab: LabTab) => {
    setActiveTab(tab);
    setActiveView(tab);
  };

  const tabs: Array<{ id: LabTab; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'court-proof',
      label: 'Court Dossier & Admissibility',
      icon: <Scale className="w-4 h-4" />,
      badge: 'BSA §63',
    },
    {
      id: 'privacy-crypto',
      label: 'Privacy & Cryptography',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'ECDH-PSI',
    },
    {
      id: 'workstation',
      label: 'Forensic Workstation',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'Loom & Flight',
    },
    {
      id: 'benchmarks',
      label: 'Benchmark & Stress Lab',
      icon: <Zap className="w-4 h-4" />,
      badge: '100k CGNAT',
    },
  ];

  return (
    <div className="v6-enter space-y-6" data-testid="v6-lab-screen">
      <PageHead
        kicker="Forensic Labs & Mathematical Proof Engines"
        title="Can the evidence withstand cross-examination in court?"
        subtitle="Zero-knowledge private intersection, tamper falsification, temporal evidence loom, and synthetic stress calibration."
      />

      {/* Lab Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--fg-1)] border border-[var(--line-2)] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-2)] hover:bg-[var(--surface-1)]'
              }`}
            >
              <span className={isActive ? 'text-[var(--flow-2)]' : 'text-[var(--fg-3)]'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-[var(--flow-bg)] text-[var(--flow-2)] border border-cyan-500/20'
                      : 'bg-[var(--surface-3)] text-[var(--fg-3)]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      <div className="min-h-[600px]">
        <Suspense
          fallback={
            <div className="space-y-4 p-4">
              <Skeleton height={60} />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton height={140} />
                <Skeleton height={140} />
                <Skeleton height={140} />
              </div>
              <Skeleton height={420} />
            </div>
          }
        >
          {activeTab === 'court-proof' && <CourtProofScreen />}
          {activeTab === 'privacy-crypto' && <PrivacyCryptoWorkbench />}
          {activeTab === 'workstation' && <ForensicWorkstationScreen />}
          {activeTab === 'benchmarks' && <BenchmarkLabScreen />}
        </Suspense>
      </div>
    </div>
  );
};
