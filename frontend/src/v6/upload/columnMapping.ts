/** Pure helpers for matching a bank file's columns to the fields TARKA needs. No I/O here. */

export type MapField = 'date' | 'amount' | 'payer' | 'payee' | 'time' | 'ref';
export type MappingColumns = Partial<Record<MapField, string>>;

export const MAP_FIELDS: { key: MapField; label: string; required: boolean; tip: string }[] = [
  { key: 'date', label: 'Date', required: true, tip: 'Transaction or value date.' },
  { key: 'amount', label: 'Amount', required: true, tip: 'Amount in rupees for the transaction.' },
  { key: 'payer', label: 'Paid by', required: false, tip: 'Sender account, UPI ID (VPA) or name.' },
  { key: 'payee', label: 'Paid to', required: false, tip: 'Receiver account, UPI ID (VPA) or name.' },
  { key: 'time', label: 'Time', required: false, tip: 'Time of day, if the bank puts it in its own column.' },
  { key: 'ref', label: 'Reference', required: false, tip: 'UTR / RRN / transaction reference number.' },
];

const HINTS: Record<MapField, RegExp> = {
  date: /date|dt\b|txn.?on|posted/i,
  amount: /amount|amt|inr|rupee|rs\b|value|debit|withdraw/i,
  payer: /payer|sender|from|remitter|debtor/i,
  payee: /payee|receiver|beneficiary|\bto\b|creditor|merchant/i,
  time: /time/i,
  ref: /utr|rrn|ref|txn.?id|transaction.?id|cheque/i,
};

/** Best first guess per field from the header names; each header used at most once. */
export function guessMapping(headers: string[]): MappingColumns {
  const used = new Set<string>();
  const out: MappingColumns = {};
  // time before date so "Txn Time" is not taken as the date column
  for (const f of ['time', 'date', 'amount', 'ref', 'payer', 'payee'] as MapField[]) {
    const h = headers.find((x) => x && !used.has(x) && HINTS[f].test(x) && !(f === 'date' && /time/i.test(x) && !/date/i.test(x)));
    if (h) {
      out[f] = h;
      used.add(h);
    }
  }
  return out;
}

/** Plain-English problems with a mapping; empty means it can be sent. */
export function validateMapping(cols: MappingColumns, headers: string[]): string[] {
  const errors: string[] = [];
  for (const f of MAP_FIELDS) {
    const v = cols[f.key];
    if (f.required && !v) errors.push(`Choose the column that holds the ${f.label.toLowerCase()}.`);
    if (v && !headers.includes(v)) errors.push(`"${v}" is not a column in this file.`);
  }
  const seen = new Map<string, string>();
  for (const f of MAP_FIELDS) {
    const v = cols[f.key];
    if (!v) continue;
    if (seen.has(v)) errors.push(`"${v}" is used for both ${seen.get(v)} and ${f.label.toLowerCase()}.`);
    else seen.set(v, f.label.toLowerCase());
  }
  return errors;
}

/** Body for POST /ingestion/jobs/{id}/mapping: blank fields dropped, template name trimmed. */
export function mappingBody(cols: MappingColumns, templateName?: string) {
  const columns = Object.fromEntries(Object.entries(cols).filter(([, v]) => v)) as MappingColumns;
  const name = templateName?.trim();
  return name ? { columns, template_name: name } : { columns };
}
