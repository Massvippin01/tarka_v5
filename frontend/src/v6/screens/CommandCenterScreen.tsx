import React from 'react';
import { PageHead } from '../ui';

export const CommandCenterScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-command-center">
      <PageHead
        kicker="Command Center"
        title="Good morning, Inspector"
        subtitle="4 active cases · 3 inside the golden hour · last sync just now"
      />
    </div>
  );
};
