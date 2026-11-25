import type { ChipVariant } from '../ui';
import { MAX_PARALLEL, type CardState } from './uploadPlanner';

export const STATE_LABEL: Record<CardState, { label: string; variant: ChipVariant; tip: string }> = {
  queued: { label: 'Queued', variant: 'muted', tip: `Waiting for a free slot (${MAX_PARALLEL} files upload at once).` },
  uploading: { label: 'Uploading', variant: 'flow', tip: 'Sending the file in 8 MB pieces.' },
  paused: { label: 'Paused', variant: 'muted', tip: 'Upload stopped. It continues from the last saved piece.' },
  verifying: { label: 'Verifying', variant: 'flow', tip: 'Server is checking the file type and computing its SHA-256 fingerprint.' },
  processing: { label: 'Processing', variant: 'flow', tip: 'Reading rows and extracting accounts, UPI IDs and phone numbers.' },
  ready: { label: 'Ready', variant: 'safe', tip: 'Evidence is sealed and its rows are available to this case.' },
  attention: { label: 'Needs attention', variant: 'urgent', tip: 'The file is stored, but something needs your action.' },
  rejected: { label: 'Rejected', variant: 'risk', tip: 'The server refused this file.' },
};
