import React, { lazy, Suspense } from 'react';
import { Skeleton } from '../ui';
import { ResetDemoPanel } from '../admin/ResetDemoPanel';

const V5SettingsScreen = lazy(() =>
  import('../../pages/v5/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);

export const SettingsScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-settings-screen">
      <ResetDemoPanel />
      <Suspense fallback={<Skeleton height={400} />}>
        <V5SettingsScreen />
      </Suspense>
    </div>
  );
};
