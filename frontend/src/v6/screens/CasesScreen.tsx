import React from 'react';
import { PageHead, Button } from '../ui';

export const CasesScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-cases-screen">
      <PageHead
        kicker="Case Registry"
        title="All Cyber Fraud Cases"
        subtitle="Active police inquiries, statutory liens, and judicial dossiers"
        actions={
          <Button variant="primary" size="md">
            + New Case
          </Button>
        }
      />
    </div>
  );
};
