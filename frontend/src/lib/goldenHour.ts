import { selectCaseActionFinancials } from '../selectors/actionSelectors';

export interface GoldenHour {
  mins: number;
  expired: boolean;
  /** "Expired", "2h 52m" or "45m" */
  text: string;
}

export function formatGoldenHour(mins: number): GoldenHour {
  const m = Math.max(0, Math.floor(mins));
  const text = m <= 0 ? 'Expired' : `${m >= 60 ? `${Math.floor(m / 60)}h ` : ''}${m % 60}m`;
  return { mins: m, expired: m <= 0, text };
}

/** The one golden-hour source: the top bar clock and the sidebar case card both call this. */
export function selectGoldenHour(caseId: string): GoldenHour {
  return formatGoldenHour(selectCaseActionFinancials(caseId).goldenHourRemainingMins);
}
