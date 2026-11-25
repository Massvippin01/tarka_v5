import React, { lazy, Suspense } from 'react';
import { Skeleton } from '../ui';
import { ResetDemoPanel } from '../admin/ResetDemoPanel';

const V5HealthDiagnosticsScreen = lazy(() =>
  import('../../pages/v5/HealthDiagnosticsScreen').then((m) => ({ default: m.HealthDiagnosticsScreen }))
);

export const HealthDiagnosticsScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-health-screen">
      <ResetDemoPanel />
      <Suspense fallback={<Skeleton height={400} />}>
        <V5HealthDiagnosticsScreen />
      </Suspense>
    </div>
  );
};
