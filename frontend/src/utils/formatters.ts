/**
 * TARKA Forensic Formatters
 * Enforces Indian number formatting (en-IN) and Rupee symbol (₹) across all screens.
 */

export interface FormatInrOptions {
  showPaise?: boolean;
  compact?: boolean;
}

/**
 * Formats a monetary amount in Indian Rupees (en-IN format with ₹ symbol).
 * e.g., 500000 -> "₹5,00,000.00"
 * compact: 500000 -> "₹5.00 L", 12500000 -> "₹1.25 Cr"
 */
export function formatInr(amount: number, options?: FormatInrOptions): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "₹0.00";
  }

  const showPaise = options?.showPaise ?? true;

  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  if (options?.compact) {
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${(abs / 1000).toFixed(1)} K`;
    }
  }

  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  })}`;
}

/**
 * Formats standard numbers with Indian digit grouping (e.g., 100000 -> "1,00,000").
 */
export function formatIndianNumber(num: number): string {
  if (typeof num !== "number" || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString("en-IN");
}
