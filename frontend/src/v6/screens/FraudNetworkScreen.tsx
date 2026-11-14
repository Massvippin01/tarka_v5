import React from 'react';
import { PageHead } from '../ui';

export const FraudNetworkScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-network-screen">
      <PageHead
        kicker="Step 4 · Fraud Network"
        title="Who is connected?"
      />
    </div>
  );
};
