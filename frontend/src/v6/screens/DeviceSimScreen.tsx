import React from 'react';
import { PageHead } from '../ui';

export const DeviceSimScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-device-screen">
      <PageHead
        kicker="Step 5 · Device & SIM"
        title="Which hardware moved the funds?"
      />
    </div>
  );
};
