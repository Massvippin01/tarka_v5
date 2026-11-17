/**
 * Shared Indian money / time formatters (single source for every screen).
 *
 *   formatInr(1250000)            -> "₹12,50,000"
 *   formatInrCompact(1250000)     -> "₹12.5 L"
 *   formatInrCompact(12000000)    -> "₹1.2 Cr"
 *
 * The older `utils/formatters.formatInr` (paise by default) is kept for legacy screens;
 * v6 screens should import from here.
 */

export interface FormatInrOptions {
  /** Show ₹12.5 L / ₹1.2 Cr instead of full digits. */
  compact?: boolean;
  /** Include paise (default false). */
  showPaise?: boolean;
}

function trim1(n: number): string {
  // 1 decimal, drop trailing ".0"
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function formatInrCompact(amount: number): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "₹0";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `${sign}₹${trim1(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trim1(abs / 1e5)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatInr(amount: number, options: FormatInrOptions = {}): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "₹0";
  if (options.compact) return formatInrCompact(amount);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const showPaise = options.showPaise ?? false;
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  })}`;
}

/** Percentage of `part` in `whole`, rounded to an integer (0 when whole is 0). */
export function pctOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Golden-hour label: "Expired" when the window has run out, otherwise "1h 58m" / "38m". */
export function formatGoldenHour(remainingMins: number): string {
  if (!Number.isFinite(remainingMins) || remainingMins <= 0) return "Expired";
  const h = Math.floor(remainingMins / 60);
  const m = Math.round(remainingMins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Human duration from seconds: "112 sec", "3 min 5 sec", "2 h 10 min". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s ? `${m} min ${s} sec` : `${m} min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
