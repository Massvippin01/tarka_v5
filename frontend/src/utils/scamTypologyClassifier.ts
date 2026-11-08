/**
 * TARKA Indian Cyber Fraud Typology Engine (Browser-side Offline Classifier)
 *
 * Classifies suspicious communications into the 6 canonical Indian typologies:
 * 1. DIGITAL_ARREST (Fake CBI, ED, Police, Supreme Court, TRAI extortion)
 * 2. PART_TIME_JOB (Telegram YouTube liking, hotel rating, VIP prepaid tasks)
 * 3. KYC_EXPIRY (Bank account/SIM block warning, download malicious APK)
 * 4. ELECTRICITY_BILL (Tonight 9:30 PM power disconnect SMS trap)
 * 5. STOCK_TRADING (Institutional VIP WhatsApp syndicate, guaranteed upper-circuit IPO)
 * 6. LOAN_APP_EXTORTION (7-day predatory loan, contact harvesting, photo morphing)
 */

import type { IndianFraudTypology, TypologyClassification, StatutoryPenalty } from "../types/forensics";

export interface TypologyMeta {
  title: string;
  badgeColor: string;
  borderColor: string;
  statutoryBns: string;
  icon: string;
  description: string;
}

export const TYPOLOGY_METADATA: Record<IndianFraudTypology, TypologyMeta> = {
  DIGITAL_ARREST: {
    title: "Digital Arrest Extortion",
    badgeColor: "bg-red-500/15 text-red-700 dark:text-red-300",
    borderColor: "border-red-500/30",
    statutoryBns: "BNS §204 · §308 · IT Act §66D",
    icon: "ShieldAlert",
    description: "Impersonation of CBI, Police, ED, or Court officials via video call extortion.",
  },
  PART_TIME_JOB: {
    title: "Part-time Job / Task Scam",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500/30",
    statutoryBns: "BNS §318 · IT Act §66D",
    icon: "Briefcase",
    description: "Prepaid investment trap promising high returns for Telegram tasks or YouTube likes.",
  },
  KYC_EXPIRY: {
    title: "KYC Expiry / Banking Trap",
    badgeColor: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-500/30",
    statutoryBns: "BNS §336 · IT Act §66C · §66D",
    icon: "CreditCard",
    description: "Fake bank or SIM block warning coercing APK download or NetBanking credentials.",
  },
  ELECTRICITY_BILL: {
    title: "Electricity Power Cut SMS",
    badgeColor: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300",
    borderColor: "border-yellow-500/30",
    statutoryBns: "BNS §318(4) · IT Act §66D",
    icon: "Zap",
    description: "Imminent power disconnection warning coercing immediate payment to officer.",
  },
  STOCK_TRADING: {
    title: "VIP Stock Trading Syndicate",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-500/30",
    statutoryBns: "SEBI Act §12A · BNS §318(4)",
    icon: "TrendingUp",
    description: "Unregistered WhatsApp group offering guaranteed upper-circuit institutional IPOs.",
  },
  LOAN_APP_EXTORTION: {
    title: "Predatory Loan Extortion",
    badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    borderColor: "border-rose-500/30",
    statutoryBns: "BNS §351 · §79 · IT Act §66E",
    icon: "AlertOctagon",
    description: "7-day loan app harvesting contacts and morphing photos for criminal harassment.",
  },
  UNKNOWN_OR_BENIGN: {
    title: "Standard Utility / Unknown",
    badgeColor: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-500/30",
    statutoryBns: "No criminal indicators identified",
    icon: "HelpCircle",
    description: "No definitive Indian cyber fraud typology signature detected.",
  },
};

const TYPOLOGY_RULES: Record<
  Exclude<IndianFraudTypology, "UNKNOWN_OR_BENIGN">,
  { triggers: RegExp[]; weight: number; minMatches: number; statutory: StatutoryPenalty[]; actions: string[] }
> = {
  DIGITAL_ARREST: {
    triggers: [
      /\bdigital\s+arrest\b/i,
      /\bcbi\b/i,
      /\bed\s+directorate\b/i,
      /\btrai\b/i,
      /\bnarcotics\b/i,
      /\bcustoms\s+seizure\b/i,
      /\barrest\s+warrant\b/i,
      /\bsupreme\s+court\b/i,
      /\bdo\s+not\s+disconnect\b/i,
      /\bvideo\s+surveillance\b/i,
      /\bfedex\s+parcel\b/i,
    ],
    weight: 1.0,
    minMatches: 2,
    statutory: [
      { act: "BNS", section: "204", title: "Impersonating Public Servant", description: "Falsely pretending to hold office as CBI or Police." },
      { act: "BNS", section: "308", title: "Extortion", description: "Putting victim in fear of arrest to compel delivery of property." },
      { act: "IT_ACT", section: "66D", title: "Cheating by Personation", description: "Cheating over communication resources." },
    ],
    actions: [
      "Obtain VoIP and telecommunication CDR routing under BNSS §94.",
      "Issue 120-min Golden Hour debit freeze notice to nodal officer for primary mule.",
    ],
  },
  PART_TIME_JOB: {
    triggers: [
      /\bpart[\s-]time\s+job\b/i,
      /\btelegram\s+task\b/i,
      /\byoutube\s+like\b/i,
      /\bhotel\s+rating\b/i,
      /\bearn\s+(?:rs\.?|₹|\binr\b)?\s*\d{3,5}\b/i,
      /\bprepaid\s+task\b/i,
      /\bvip\s+(?:level|tier)\b/i,
      /\bcommission\s+recharge\b/i,
    ],
    weight: 0.9,
    minMatches: 2,
    statutory: [
      { act: "BNS", section: "318", title: "Cheating", description: "Deceiving victim with false task earnings." },
      { act: "IT_ACT", section: "66D", title: "Cheating by Personation", description: "Using Telegram channels to engineer prepaid traps." },
    ],
    actions: [
      "Map Telegram channel admin handles and linked UPI IDs.",
      "Cross-reference destination accounts across 1930 NCRP registry.",
    ],
  },
  KYC_EXPIRY: {
    triggers: [
      /\bkyc\s+(?:expired|expiry|suspended|blocked)\b/i,
      /\baccount\s+will\s+be\s+blocked\b/i,
      /\bupdate\s+pan\b/i,
      /\byono\b/i,
      /\bnetbanking\s+blocked\b/i,
      /\bsim\s+(?:deactivation|block)\b/i,
      /\bdownload\s+apk\b/i,
      /\banydesk\b/i,
      /\bquicksupport\b/i,
    ],
    weight: 0.9,
    minMatches: 2,
    statutory: [
      { act: "BNS", section: "336", title: "Forgery for Cheating", description: "Mimicking official banking portals." },
      { act: "IT_ACT", section: "66C", title: "Identity Theft", description: "Fraudulently obtaining banking passwords or OTPs." },
    ],
    actions: [
      "Check device for remote administration software (AnyDesk, QuickSupport).",
      "Request immediate net-banking and UPI credential revocation.",
    ],
  },
  ELECTRICITY_BILL: {
    triggers: [
      /\belectricity\s+(?:bill|power|officer)\b/i,
      /\bpower\s+will\s+be\s+disconnected\b/i,
      /\bdisconnected\s+tonight\b/i,
      /\b9:?30\s*pm\b/i,
      /\bprevious\s+month\s+bill\b/i,
      /\bcall\s+electricity\s+officer\b/i,
      /\bunpaid\b/i,
      /\bsmart\s+meter\b/i,
    ],
    weight: 1.0,
    minMatches: 2,
    statutory: [
      { act: "BNS", section: "318(4)", title: "Cheating", description: "Falsely claiming imminent power disconnection." },
      { act: "IT_ACT", section: "66D", title: "Cheating by Personation", description: "Spoofing utility SMS headers." },
    ],
    actions: [
      "Verify caller phone number against known DISCOM nodal helplines.",
      "Issue rapid lien notice for recipient UPI ID under BNSS §106.",
    ],
  },
  STOCK_TRADING: {
    triggers: [
      /\bstock\s+trading\b/i,
      /\bipo\s+(?:allotment|quota|institutional)\b/i,
      /\bupper\s+circuit\b/i,
      /\bsebi\s+registered\b/i,
      /\bguaranteed\s+(?:profit|return)\b/i,
      /\b500%\s+return\b/i,
      /\bwhatsapp\s+vip\s+group\b/i,
      /\bfii\s+institutional\b/i,
    ],
    weight: 0.95,
    minMatches: 2,
    statutory: [
      { act: "SEBI_ACT", section: "12A", title: "Deceptive Devices", description: "Soliciting public deposits without registration." },
      { act: "BNS", section: "318(4)", title: "Aggravated Cheating", description: "Fabricating institutional returns." },
    ],
    actions: [
      "Check SEBI intermediary registry to confirm unauthorized status.",
      "Submit WhatsApp group takedown request and freeze corporate conduits.",
    ],
  },
  LOAN_APP_EXTORTION: {
    triggers: [
      /\b7[\s-]day\s+loan\b/i,
      /\binstant\s+loan\s+app\b/i,
      /\bmorph(?:ed|ing)?\b/i,
      /\bcontacts?\s+list\b/i,
      /\bdefamation\s+message\b/i,
      /\bshare\s+with\s+(?:relatives|family)\b/i,
      /\bblackmail\b/i,
    ],
    weight: 1.0,
    minMatches: 2,
    statutory: [
      { act: "BNS", section: "351", title: "Criminal Intimidation", description: "Threatening harm to reputation." },
      { act: "BNS", section: "79", title: "Insulting Modesty", description: "Morphing photographs from device gallery." },
    ],
    actions: [
      "Instruct victim to cease payments and preserve contact numbers.",
      "Submit package signature to CERT-In for malicious app takedown.",
    ],
  },
};

/**
 * Fast client-side classifier for immediate offline investigative triage.
 */
export function classifyScamMessageClient(text: string): TypologyClassification {
  let bestTypology: IndianFraudTypology = "UNKNOWN_OR_BENIGN";
  let highestScore = 0.0;
  let bestMatches: string[] = [];
  let bestActions: string[] = [];

  for (const [typology, rule] of Object.entries(TYPOLOGY_RULES) as [
    Exclude<IndianFraudTypology, "UNKNOWN_OR_BENIGN">,
    (typeof TYPOLOGY_RULES)[Exclude<IndianFraudTypology, "UNKNOWN_OR_BENIGN">],
  ][]) {
    const matched: string[] = [];
    for (const pat of rule.triggers) {
      if (pat.test(text)) {
        matched.push(pat.source.replace(/\\b/g, "").replace(/\\s\+/g, " "));
      }
    }

    if (matched.length >= rule.minMatches) {
      const score = Math.min(0.99, rule.weight * (0.6 + 0.1 * Math.min(4, matched.length)));
      if (score > highestScore) {
        highestScore = score;
        bestTypology = typology;
        bestMatches = matched;
        bestActions = rule.actions;
      }
    }
  }

  if (bestTypology === "UNKNOWN_OR_BENIGN") {
    return {
      typology: "UNKNOWN_OR_BENIGN",
      confidence_score: 0.1,
      matched_triggers: [],
      statutory_provisions: [],
      investigative_rationale: "No recognized Indian cyber fraud typology signature detected.",
      suggested_actions: ["Gather additional payment receipts, SMS logs, or chat transcripts."],
      human_verified: false,
      disclaimer: "AI PROPOSED CLASSIFICATION ONLY (BSA §63). Requires independent human review.",
    };
  }

  const rule = TYPOLOGY_RULES[bestTypology];
  return {
    typology: bestTypology,
    confidence_score: Number(highestScore.toFixed(3)),
    matched_triggers: bestMatches,
    statutory_provisions: rule.statutory,
    investigative_rationale: `Identified ${TYPOLOGY_METADATA[bestTypology].title} pattern with triggers: ${bestMatches.slice(0, 3).join(", ")}.`,
    suggested_actions: bestActions,
    human_verified: false,
    disclaimer: "AI PROPOSED CLASSIFICATION ONLY (BSA §63). Requires independent human review.",
  };
}

