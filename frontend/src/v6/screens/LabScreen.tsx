import React, { lazy, Suspense } from 'react';
import { Skeleton } from '../ui';

const CourtProofScreen = lazy(() =>
  import('../../pages/v5/CourtProofScreen').then((m) => ({ default: m.CourtProofScreen }))
);

export const LabScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-lab-screen">
      <Suspense fallback={<Skeleton height={400} />}>
        <CourtProofScreen />
      </Suspense>
    </div>
  );
};
