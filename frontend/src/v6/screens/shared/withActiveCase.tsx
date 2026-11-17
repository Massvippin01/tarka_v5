import React from 'react';
import axios from 'axios';
import { FolderOpen, Upload } from 'lucide-react';
import { useCaseStore } from '../../../store/useCaseStore';
import { useCaseFixture } from '../../../selectors/bundleAdapter';
import type { CanonicalCaseFixture } from '../../../fixtures/cases';
import { Button, EmptyState, Skeleton } from '../../ui';

export interface ActiveCaseProps {
  fixture: CanonicalCaseFixture;
}

function GoToUpload() {
  const setActiveView = useCaseStore((s) => s.setActiveView);
  return (
    <Button variant="primary" size="sm" onClick={() => setActiveView('upload')}>
      <Upload className="w-4 h-4" /> Go to Upload Center
    </Button>
  );
}

/**
 * Case-isolation gate: renders the screen only with the active case's data — the demo fixture,
 * or the backend bundle built from uploaded statements (same shape, see selectors/bundleAdapter).
 * Unknown / missing case -> clear empty state (never falls back to another case).
 * The inner screen is keyed by case id so all local state resets on case switch.
 */
export function withActiveCase<P extends object>(Inner: React.ComponentType<P & ActiveCaseProps>): React.FC<P> {
  const Gated: React.FC<P> = (props) => {
    const activeCaseId = useCaseStore((s) => s.activeCaseId);
    const { fixture, isLoading, error } = useCaseFixture(activeCaseId);
    if (isLoading) {
      return (
        <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading case data">
          <Skeleton height={36} width="40%" />
          <Skeleton height={120} />
          <Skeleton height={320} />
        </div>
      );
    }
    if (error || !fixture) {
      const missing = axios.isAxiosError(error) && error.response?.status === 404;
      return (
        <EmptyState
          icon={<FolderOpen className="w-5 h-5" />}
          title={activeCaseId ? `No data for ${activeCaseId} yet` : 'Select a case to begin'}
          description={
            error && !missing
              ? 'Could not load this case from the server. Check the connection and try again.'
              : "This screen shows only the active case's evidence. Open a case from Command Center or upload evidence for this case."
          }
          action={activeCaseId ? <GoToUpload /> : undefined}
        />
      );
    }
    if (fixture.accounts.length === 0) {
      return (
        <EmptyState
          icon={<Upload className="w-5 h-5" />}
          title="No uploaded statements yet"
          description={`${fixture.caseId} has no processed bank or UPI statements. Upload one and its parties and amounts appear here.`}
          action={<GoToUpload />}
        />
      );
    }
    return <Inner key={fixture.caseId} {...props} fixture={fixture} />;
  };
  return Gated;
}
