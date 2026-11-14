import React from 'react';
import { PageHead } from '../ui';

export const MoneyTrailScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-money-screen">
      <PageHead
        kicker="Step 3 · Money Trail"
        title="Where did the money go?"
      />
    </div>
  );
};
