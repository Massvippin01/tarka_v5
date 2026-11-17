/**
 * Translation table for the court report. Hindi is filled in only for plain labels whose wording is standard;
 * legal sentences and section wording are left null on purpose: they must come from a certified legal
 * translator, never from a machine. A null Hindi entry prints the English text with an [EN] marker.
 * REVIEWED stays false until a translator signs the table off; the report says so.
 */
export type Lang = 'en' | 'hi';

export const HINDI_REVIEWED = false;
export const UNTRANSLATED_MARK = '[EN]';

const T = {
  title: { en: 'Investigation report', hi: 'जाँच रिपोर्ट' },
  case: { en: 'Case', hi: 'मामला' },
  fir: { en: 'FIR number', hi: 'एफ़आईआर संख्या' },
  station: { en: 'Police station', hi: 'थाना' },
  officer: { en: 'Investigating officer', hi: 'जाँच अधिकारी' },
  complainant: { en: 'Complainant', hi: 'शिकायतकर्ता' },
  generated: { en: 'Prepared on', hi: 'तैयार करने की तिथि' },
  scope: { en: 'Covers', hi: 'दायरा' },
  scopeCase: { en: 'Whole case', hi: 'पूरा मामला' },
  scopeNetwork: { en: 'One network', hi: 'एक नेटवर्क' },
  scopeAccount: { en: 'One account', hi: 'एक खाता' },
  moneySummary: { en: 'Money summary', hi: 'धन का सारांश' },
  paidIn: { en: 'Paid in by victims', hi: 'पीड़ितों द्वारा भेजी गई राशि' },
  cashedOut: { en: 'Cashed out', hi: 'नकद निकाली गई राशि' },
  recoverable: { en: 'Still recoverable', hi: 'अभी भी वसूली योग्य' },
  unaccounted: { en: 'Not yet traced', hi: 'अभी तक पता नहीं चली राशि' },
  moneyIn: { en: 'Money into the account', hi: 'खाते में आई राशि' },
  moneyOut: { en: 'Money out of the account', hi: 'खाते से गई राशि' },
  held: { en: 'Still in the account', hi: 'खाते में शेष राशि' },
  requested: { en: 'Asked banks to freeze', hi: 'बैंकों से फ्रीज़ का अनुरोध' },
  frozen: { en: 'Frozen by banks', hi: 'बैंकों द्वारा फ्रीज़ की गई राशि' },
  freezeNotices: { en: 'Freeze notices', hi: 'फ्रीज़ नोटिस' },
  account: { en: 'Account', hi: 'खाता' },
  bank: { en: 'Bank', hi: 'बैंक' },
  amount: { en: 'Amount', hi: 'राशि' },
  status: { en: 'Status', hi: 'स्थिति' },
  section: { en: 'Legal basis', hi: null },
  sec106: { en: 'Lien on tainted credit (BNSS §106)', hi: null },
  sec107: { en: 'Debit freeze pending attachment (BNSS §107)', hi: null },
  NOT_SENT: { en: 'Not sent', hi: 'नहीं भेजा गया' },
  SENT: { en: 'Sent', hi: 'भेजा गया' },
  ACKNOWLEDGED: { en: 'Bank acknowledged', hi: 'बैंक ने पावती दी' },
  FROZEN: { en: 'Frozen', hi: 'फ्रीज़' },
  REFUSED: { en: 'Refused', hi: 'अस्वीकृत' },
  checklist: { en: 'Before court', hi: 'न्यायालय से पहले की जाँच-सूची' },
  done: { en: 'Done', hi: 'पूर्ण' },
  missing: { en: 'Missing', hi: 'बाकी' },
  courtReady: { en: 'Ready for court', hi: null },
  notCourtReady: { en: 'Not yet ready for court', hi: null },
  evidence: { en: 'Evidence files', hi: 'साक्ष्य फ़ाइलें' },
  file: { en: 'File', hi: 'फ़ाइल' },
  fingerprint: { en: 'SHA-256 fingerprint', hi: null },
  sourceRows: { en: 'Source rows for every figure', hi: 'हर आँकड़े की स्रोत पंक्तियाँ' },
  date: { en: 'Date', hi: 'तिथि' },
  from: { en: 'From', hi: 'से' },
  to: { en: 'To', hi: 'को' },
  reference: { en: 'Reference', hi: 'संदर्भ' },
  source: { en: 'Source file and row', hi: 'स्रोत फ़ाइल और पंक्ति' },
  moreRows: { en: 'more rows: open this figure in TARKA or the Evidence ledger for the full list', hi: null },
  noRows: { en: 'No transaction rows behind this figure in the case data.', hi: null },
  hashChain: { en: 'Hash chain', hi: null },
  hashNote: {
    en: 'Each section is fingerprinted with SHA-256 together with the previous section’s fingerprint. Changing any line changes every fingerprint after it, so the final fingerprint seals the whole report.',
    hi: null,
  },
  finalHash: { en: 'Final fingerprint', hi: null },
  signature: { en: 'Signature of the investigating officer', hi: 'जाँच अधिकारी के हस्ताक्षर' },
  hindiNote: {
    en: 'Hindi labels have not yet been reviewed by a certified translator. Text marked [EN] is shown in English because no checked translation exists.',
    hi: null,
  },
} as const satisfies Record<string, { en: string; hi: string | null }>;

export type TKey = keyof typeof T;

export function t(key: TKey, lang: Lang): string {
  const e = T[key] as { en: string; hi: string | null };
  if (lang === 'en') return e.en;
  return e.hi ?? `${e.en} ${UNTRANSLATED_MARK}`;
}

/** Free text that has no table entry (names, checklist lines) is marked in Hindi rather than invented. */
export const untranslated = (text: string, lang: Lang) => (lang === 'hi' ? `${text} ${UNTRANSLATED_MARK}` : text);

/** Keys with no checked Hindi yet: shown on screen so a translator knows what is left. */
export const missingHindi = (): TKey[] => (Object.keys(T) as TKey[]).filter((k) => (T[k] as { hi: string | null }).hi === null);
