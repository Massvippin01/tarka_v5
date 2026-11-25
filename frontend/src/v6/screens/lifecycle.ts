import type { ChipVariant } from '../ui';

export type Lifecycle = 'INTAKE' | 'PROCESSING' | 'INVESTIGATING' | 'ACTION_PENDING' | 'COURT_READY' | 'CLOSED';

export const LIFECYCLE: { key: Lifecycle; label: string; variant: ChipVariant }[] = [
  { key: 'INTAKE', label: 'Intake', variant: 'muted' },
  { key: 'PROCESSING', label: 'Processing', variant: 'flow' },
  { key: 'INVESTIGATING', label: 'Investigating', variant: 'flow' },
  { key: 'ACTION_PENDING', label: 'Action pending', variant: 'urgent' },
  { key: 'COURT_READY', label: 'Court ready', variant: 'safe' },
  { key: 'CLOSED', label: 'Closed', variant: 'muted' },
];
