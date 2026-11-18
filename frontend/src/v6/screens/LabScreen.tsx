import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PageHead } from '../ui/PageHead';
import { Skeleton } from '../ui/Skeleton';
import { useCaseStore } from '../../store/useCaseStore';

const CourtProofScreen = lazy(() =>
  import('../../pages/v5/CourtProofScreen').then((m) => ({ default: m.CourtProofScreen }))
);
const ScaleLabScreen = lazy(() => import('./ScaleLabScreen').then((m) => ({ default: m.ScaleLabScreen })));
const CaseTimelineScreen = lazy(() => import('./CaseTimelineScreen').then((m) => ({ default: m.CaseTimelineScreen })));
const PrivacyLabScreen = lazy(() => import('./PrivacyLabScreen').then((m) => ({ default: m.PrivacyLabScreen })));

export type LabTab = 'court-proof' | 'privacy-crypto' | 'workstation' | 'benchmarks';

interface LabScreenProps {
  initialTab?: LabTab;
}

export const LabScreen: React.FC<LabScreenProps> = ({ initialTab }) => {
  const { activeView } = useCaseStore();

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

  const fallback = (
    <div className="space-y-4 p-4">
      <Skeleton height={60} />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
      <Skeleton height={380} />
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      {activeTab === 'court-proof' && (
        <div className="v6-enter space-y-6" data-testid="v6-lab-screen">
          <PageHead
            kicker="Court"
            title="Can the evidence stand up in court?"
            subtitle="Check each piece of evidence is intact and complete before it goes into the charge sheet."
          />
          <CourtProofScreen />
        </div>
      )}
      {activeTab === 'privacy-crypto' && <PrivacyLabScreen />}
      {activeTab === 'workstation' && <CaseTimelineScreen />}
      {activeTab === 'benchmarks' && <ScaleLabScreen />}
    </Suspense>
  );
};
