import React from 'react';
import { PageHead, Button } from '../ui';

export const EvidenceLedgerScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-evidence-screen">
      <PageHead
        kicker="Step 1 · Evidence & Ledger"
        title="Did the money really leave?"
        actions={
          <Button variant="default" size="md">
            + Add evidence
          </Button>
        }
      />
    </div>
  );
};
