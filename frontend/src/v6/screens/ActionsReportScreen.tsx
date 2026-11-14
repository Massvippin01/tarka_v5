import React from 'react';
import { PageHead } from '../ui';

export interface ActionsReportScreenProps {
  initialTab?: 'actions' | 'report';
}

export const ActionsReportScreen: React.FC<ActionsReportScreenProps> = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-actions-screen">
      <PageHead
        kicker="Step 6 · Actions & Report"
        title="Stop the money. Build the case."
      />
    </div>
  );
};
