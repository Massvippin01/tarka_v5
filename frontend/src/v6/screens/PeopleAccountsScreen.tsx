import React from 'react';
import { PageHead } from '../ui';

export const PeopleAccountsScreen: React.FC = () => {
  return (
    <div className="v6-enter space-y-4" data-testid="v6-people-screen">
      <PageHead
        kicker="Step 2 · People & Accounts"
        title="Who is who?"
      />
    </div>
  );
};
