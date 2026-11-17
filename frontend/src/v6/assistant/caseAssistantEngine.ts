/**
 * Deterministic, case-isolated answer engine for the TARKA assistant.
 * Every fact comes from ONE canonical case fixture; nothing is hard-coded per case.
 * If a question cannot be answered from that data we say so plainly.
 */
import { getCanonicalCase, type CanonicalCaseFixture } from '../../fixtures/cases';

import { formatInr } from '../../lib/formatInr';
const inr = (n: number): string => formatInr(n);

export type AssistantIntent = 'mules' | 'recoverable' | 'timeline' | 'summary' | 'unknown';

export interface EngineAnswer {
  intent: AssistantIntent;
  text: string;
  observedFacts: string[];
  suggestedAction?: { label: string; action: string; targetView?: string };
}

const MULE_TYPES = ['LAYER_1_MULE', 'LAYER_2_CONDUIT', 'LAYER_3_SINK'] as const;
const TYPE_LABEL: Record<string, string> = {
  LAYER_1_MULE: 'Layer 1 mule',
  LAYER_2_CONDUIT: 'Layer 2 conduit',
  LAYER_3_SINK: 'Layer 3 cash-out',
};

export function detectIntent(question: string): AssistantIntent {
  const q = question.toLowerCase();
  if (/(mule|conduit|which accounts?|receiv|inflow|layer|म्यूल|खच्चर|खाते|மியூல்|கணக்கு)/.test(q)) return 'mules';
  if (/(recover|freeze|frozen|libr|lien|get back|shield|wapas|वसूल|वापस|फ्रीज़|மீட்|முடக்)/.test(q)) return 'recoverable';
  if (/(timeline|sequence|when|what happened|chronolog|kab|क्या हुआ|समयरेखा|कब|காலவரிசை|என்ன நடந்த)/.test(q)) return 'timeline';
  if (/(summary|summari[sz]e|overview|explain (the )?case|about this case|loss|सारांश|नुकसान|சுருக்கம்|இழப்பு)/.test(q)) return 'summary';
  return 'unknown';
}

export function accountInflows(fx: CanonicalCaseFixture): Map<string, number> {
  const byAccount = new Map<string, number>();
  for (const tx of fx.transactions) {
    byAccount.set(tx.toAccount, (byAccount.get(tx.toAccount) ?? 0) + tx.amount);
  }
  return byAccount;
}

export function getCaseWelcome(caseId: string, view: string, investigator: string): { text: string; observedFacts: string[] } {
  const fx = getCanonicalCase(caseId);
  const mules = fx.accounts.filter((a) => (MULE_TYPES as readonly string[]).includes(a.holderType));
  return {
    text:
      `Hello ${investigator}. I am **TARKA Assistant**.\n\n` +
      `I am looking at **${fx.caseId}** (${fx.title}) on the **${view}** screen. ` +
      `I only use this case's data and will say so when I cannot answer from it.`,
    observedFacts: [
      `Complainant: ${fx.complainant.name} (${fx.complainant.bank}).`,
      `Reported loss: ${inr(fx.financials.bookedLossInr)} across ${fx.transactions.length} recorded transactions.`,
      `${mules.length} accounts flagged as mule / conduit / cash-out.`,
    ],
  };
}

export function getSuggestedQuestions(caseId: string, view: string): { q: string; specialist: string }[] {
  const fx = getCanonicalCase(caseId);
  const layer1 = fx.accounts.find((a) => a.holderType === 'LAYER_1_MULE');
  const victim = fx.complainant.name;
  const base = [
    { q: 'Which accounts are mules and how much did each receive?', specialist: 'Financial Analyst' },
    { q: `How much of ${victim}'s money is recoverable?`, specialist: 'Financial Analyst' },
    { q: 'Show me the timeline of what happened', specialist: 'Temporal Analyst' },
  ];
  if (view === 'network' && layer1) {
    return [{ q: `Where did the money go after ${layer1.holderName}?`, specialist: 'Entity and Network Analyst' }, ...base.slice(0, 2)];
  }
  return base;
}

export type AnswerLang = 'en' | 'hi' | 'ta';

/** Map a BCP-47 code (en-IN, hi-IN, ta-IN, …) to an answer language; others fall back to English. */
export function answerLangFor(code: string): AnswerLang {
  return code.startsWith('hi') ? 'hi' : code.startsWith('ta') ? 'ta' : 'en';
}

// Sentence templates only; every figure and name is filled from the case data.
const T = {
  noEvidence: {
    en: "I don't have evidence in this case to answer that.",
    hi: 'इस केस में इसका उत्तर देने के लिए मेरे पास सबूत नहीं है।',
    ta: 'இந்த வழக்கில் இதற்கு பதிலளிக்க என்னிடம் ஆதாரம் இல்லை.',
  },
  unknownHint: {
    en: ' I can answer about mule accounts and amounts received, recoverable funds, and the timeline.',
    hi: ' मैं म्यूल खातों और उनमें आई राशि, वसूली योग्य राशि और घटनाक्रम के बारे में बता सकता हूँ।',
    ta: ' மியூல் கணக்குகள், அவை பெற்ற தொகை, மீட்கக்கூடிய தொகை மற்றும் காலவரிசை பற்றி பதிலளிக்க முடியும்.',
  },
  mules: {
    en: (id: string, n: number) => `In ${id}, ${n} accounts are flagged as part of the mule chain. Amounts are the sum of recorded transfers into each account.`,
    hi: (id: string, n: number) => `${id} में ${n} खाते म्यूल चेन का हिस्सा चिह्नित हैं। राशि हर खाते में दर्ज ट्रांसफ़र का योग है।`,
    ta: (id: string, n: number) => `${id} இல் ${n} கணக்குகள் மியூல் சங்கிலியின் பகுதியாகக் குறிக்கப்பட்டுள்ளன. தொகை ஒவ்வொரு கணக்கிற்கும் பதிவான பரிமாற்றங்களின் கூட்டுத்தொகை.`,
  },
  recoverable: {
    en: (name: string, loss: string, rec: string) => `For ${name}, the booked loss is ${loss}. About ${rec} is recoverable.`,
    hi: (name: string, loss: string, rec: string) => `${name} का दर्ज नुकसान ${loss} है। लगभग ${rec} वसूल किया जा सकता है।`,
    ta: (name: string, loss: string, rec: string) => `${name} அவர்களின் பதிவான இழப்பு ${loss}. சுமார் ${rec} மீட்கக்கூடியது.`,
  },
  timeline: {
    en: (n: number, id: string) => `${n} events are recorded for ${id}, oldest first.`,
    hi: (n: number, id: string) => `${id} के लिए ${n} घटनाएँ दर्ज हैं, सबसे पुरानी पहले।`,
    ta: (n: number, id: string) => `${id} க்கு ${n} நிகழ்வுகள் பதிவாகியுள்ளன, பழையது முதலில்.`,
  },
  complainant: { en: 'Complainant', hi: 'शिकायतकर्ता', ta: 'புகார்தாரர்' },
};

export function answerCaseQuestion(caseId: string, question: string, lang: AnswerLang = 'en'): EngineAnswer {
  const fx = getCanonicalCase(caseId);
  const intent = detectIntent(question);

  if (intent === 'mules') {
    const inflow = accountInflows(fx);
    const rows = fx.accounts
      .filter((a) => (MULE_TYPES as readonly string[]).includes(a.holderType))
      .map((a) => ({ a, amount: inflow.get(a.accountNumber) ?? 0 }));
    if (rows.length === 0) {
      return { intent, text: T.noEvidence[lang], observedFacts: [] };
    }
    return {
      intent,
      text: T.mules[lang](fx.caseId, rows.length),
      observedFacts: rows.map(
        ({ a, amount }) => `${a.holderName} (${TYPE_LABEL[a.holderType]}, ${a.bank}): received ${inr(amount)}`,
      ),
      suggestedAction: { label: 'Open Money Trail', action: 'OPEN_VIEW', targetView: 'money' },
    };
  }

  if (intent === 'recoverable') {
    const f = fx.financials;
    return {
      intent,
      text: T.recoverable[lang](fx.complainant.name, inr(f.bookedLossInr), inr(f.recoverableLibrInr)),
      observedFacts: [
        `Booked loss: ${inr(f.bookedLossInr)}`,
        `Recoverable: ${inr(f.recoverableLibrInr)}`,
        `Still sitting in mule accounts (frozen): ${inr(f.frozenMuleBalanceInr)}`,
        `Protected commercial payments: ${inr(f.shieldedCommercialInr)}`,
        `Already cashed out (unrecoverable): ${inr(f.unrecoverableCashoutInr)}`,
      ],
      suggestedAction: { label: 'Open Money Trail', action: 'OPEN_VIEW', targetView: 'money' },
    };
  }

  if (intent === 'timeline') {
    const events = [...fx.timelineEvents].sort((x, y) => x.timestampUtc.localeCompare(y.timestampUtc));
    if (events.length === 0) {
      return { intent, text: T.noEvidence[lang], observedFacts: [] };
    }
    return {
      intent,
      text: T.timeline[lang](events.length, fx.caseId),
      observedFacts: events.map((e) => `${e.timestampIst}: ${e.title}`),
      suggestedAction: { label: 'Open Evidence', action: 'OPEN_VIEW', targetView: 'evidence' },
    };
  }

  if (intent === 'summary') {
    return {
      intent,
      text: `**${fx.title}** (${fx.caseId}, ${fx.typology.replace(/_/g, ' ').toLowerCase()}). ${T.complainant[lang]}: ${fx.complainant.name}.`,
      observedFacts: [
        `Booked loss: ${inr(fx.financials.bookedLossInr)}`,
        `${fx.accounts.length} accounts and ${fx.transactions.length} transactions on record.`,
        `FIR ${fx.firNumber}, ${fx.policeStation}.`,
      ],
    };
  }

  return {
    intent: 'unknown',
    text: T.noEvidence[lang] + T.unknownHint[lang],
    observedFacts: [],
  };
}
