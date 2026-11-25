/**
 * UPI handle (the part after "@") -> the bank behind that handle. One shared map for freeze notices and the people table.
 * A handle names the bank that sponsors the app's UPI service (PSP bank); it is what the nodal officer is asked first.
 * Only handles whose bank is publicly documented are listed; anything else stays unknown (never guessed).
 * shortcut: not cross-checked against NPCI's live PSP list (not machine-readable); refresh when NPCI publishes handles.
 */
export const UPI_HANDLE_BANK: Record<string, string> = {
  // Google Pay
  okhdfcbank: 'HDFC Bank',
  okicici: 'ICICI Bank',
  oksbi: 'State Bank of India',
  okaxis: 'Axis Bank',
  // PhonePe
  ybl: 'Yes Bank',
  ibl: 'ICICI Bank',
  axl: 'Axis Bank',
  // Paytm, Amazon Pay
  paytm: 'Paytm Payments Bank',
  apl: 'Axis Bank',
  // Banks' own handles
  sbi: 'State Bank of India',
  hdfcbank: 'HDFC Bank',
  icici: 'ICICI Bank',
  axisbank: 'Axis Bank',
};

/** "name@okhdfcbank" (or just "@okhdfcbank") -> { handle, bank }; null when there is no handle at the end. */
export function upiHandleOf(text: string): { handle: string; bank: string | null } | null {
  const m = /@([a-z0-9._-]+)\s*$/i.exec(text || '');
  if (!m) return null;
  const handle = m[1].toLowerCase();
  return { handle, bank: UPI_HANDLE_BANK[handle] ?? null };
}
