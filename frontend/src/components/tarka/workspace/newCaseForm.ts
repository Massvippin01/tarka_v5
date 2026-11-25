/** Pure helpers for the New case form: amount typing, golden-hour preview and validation. */
import { formatGoldenHour } from "../../../lib/formatInr";

export const GOLDEN_WINDOW_MINS = 180; // same window the backend station summary uses

/** "1250000" -> "12,50,000" (digits only, Indian grouping). */
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits ? Number(digits).toLocaleString("en-IN") : "";
}
export const parseAmount = (shown: string): number => Number(shown.replace(/\D/g, "")) || 0;

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Live "Golden hour: ..." line for the complaint time; null when the time is not valid. */
export function goldenHourPreview(localInput: string, now = Date.now()): string | null {
  const t = new Date(localInput).getTime();
  if (!localInput || Number.isNaN(t) || t > now + 60_000) return null;
  const left = GOLDEN_WINDOW_MINS - (now - t) / 60_000;
  return left <= 0 ? "Golden hour: already passed" : `Golden hour: ${formatGoldenHour(Math.floor(left))} left`;
}

export interface NewCaseValues {
  fir: string;
  ncrp: string;
  receivedAt: string;
  complainant: string;
  phone: string;
  title: string;
  newProjectName?: string;
}

/** Loose checks only: a field is flagged when it is clearly wrong, not when it differs from one state's style. */
export function validateNewCase(v: NewCaseValues, now = Date.now()): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.fir.trim()) e.fir = "Enter the FIR number.";
  else if (!/\d/.test(v.fir)) e.fir = "An FIR number has digits in it, for example 112/2026.";
  if (v.ncrp.trim() && !/^[A-Za-z0-9\-/ ]{6,40}$/.test(v.ncrp.trim())) e.ncrp = "Use letters, digits and dashes only (at least 6 characters).";
  const t = new Date(v.receivedAt).getTime();
  if (!v.receivedAt || Number.isNaN(t)) e.receivedAt = "Pick the date and time the complaint was received.";
  else if (t > now + 60_000) e.receivedAt = "The complaint time cannot be in the future.";
  if (!v.complainant.trim()) e.complainant = "Enter the complainant's name.";
  if (v.phone.trim() && v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number.";
  if (!v.title.trim()) e.title = "Give the case a short title.";
  if (v.newProjectName !== undefined && !v.newProjectName.trim()) e.newProject = "Name the new project.";
  return e;
}
