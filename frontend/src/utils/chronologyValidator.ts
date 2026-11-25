/**
 * Chronology and Causality Validation for Forensic Timelines
 * Enforces strict investigative invariants under BSA §63 / BNSS §106.
 */

export interface ChronologyEventInput {
  id: string;
  title: string;
  track?: string;
  sourceTimestamp: string;
  receivedTimestamp?: string;
  severity?: string;
  details?: Record<string, any>;
}

export interface ChronologyConflict {
  eventId: string;
  eventTitle: string;
  conflictType: "COMPLAINT_BEFORE_DEBIT" | "CASHOUT_BEFORE_FUNDING" | "HOP_BEFORE_INBOUND" | "OUT_OF_SEQUENCE";
  message: string;
  triggerTimestamp: string;
  violatingTimestamp: string;
}

export interface ChronologyValidationResult {
  isValid: boolean;
  conflicts: ChronologyConflict[];
  conflictCount: number;
}

/**
 * Format a UTC ISO-8601 string or epoch to display timezone ("IST" | "UTC").
 */
export function formatChronologyTimestamp(isoString: string, timezone: "IST" | "UTC"): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  if (timezone === "UTC") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    const mm = pad(date.getUTCMonth() + 1);
    const dd = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
  }

  // Format in IST: UTC + 5:30
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = istDate.getUTCFullYear();
  const mm = pad(istDate.getUTCMonth() + 1);
  const dd = pad(istDate.getUTCDate());
  const hh = pad(istDate.getUTCHours());
  const min = pad(istDate.getUTCMinutes());
  const ss = pad(istDate.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} IST`;
}

/**
 * Validates causal and temporal invariants across investigation events.
 * Invariant 1: Complaint must be strictly AFTER first victim debit.
 * Invariant 2: Cash-out must be strictly AFTER the funding transfer.
 * Invariant 3: Hop n must be strictly AFTER hop n-1.
 */
export function validateChronology(events: ChronologyEventInput[]): ChronologyValidationResult {
  const conflicts: ChronologyConflict[] = [];

  if (!events || events.length === 0) {
    return { isValid: true, conflicts: [], conflictCount: 0 };
  }

  // Find first victim fraudulent debit
  const debitEvents = events.filter((e) => {
    const title = (e.title || "").toLowerCase();
    const track = (e.track || "").toLowerCase();
    const sev = (e.severity || "").toLowerCase();
    return (
      sev === "fraud_debit" ||
      title.includes("debit") ||
      title.includes("extortion transfer") ||
      title.includes("fraudulent upi") ||
      title.includes("corporate rtgs wire") ||
      (track === "banking" && title.includes("primary"))
    );
  });

  let firstDebitEvent: ChronologyEventInput | null = null;
  let firstDebitTime = Infinity;

  for (const d of debitEvents) {
    const t = new Date(d.sourceTimestamp).getTime();
    if (!isNaN(t) && t < firstDebitTime) {
      firstDebitTime = t;
      firstDebitEvent = d;
    }
  }

  // Invariant 1: Complaint cannot happen before first debit
  const complaintEvents = events.filter((e) => {
    const title = (e.title || "").toLowerCase();
    const track = (e.track || "").toLowerCase();
    const sev = (e.severity || "").toLowerCase();
    return (
      track === "complaint" ||
      track === "ncrp_1930" ||
      sev === "complaint" ||
      title.includes("complaint") ||
      title.includes("1930") ||
      title.includes("ncrp")
    );
  });

  if (firstDebitEvent && firstDebitTime !== Infinity) {
    for (const comp of complaintEvents) {
      const compTime = new Date(comp.sourceTimestamp).getTime();
      if (!isNaN(compTime) && compTime < firstDebitTime) {
        conflicts.push({
          eventId: comp.id,
          eventTitle: comp.title,
          conflictType: "COMPLAINT_BEFORE_DEBIT",
          message: `Complaint timestamp (${comp.sourceTimestamp}) precedes the initial victim debit (${firstDebitEvent.sourceTimestamp}). A victim cannot report an extortion before funds are stolen.`,
          triggerTimestamp: comp.sourceTimestamp,
          violatingTimestamp: firstDebitEvent.sourceTimestamp,
        });
      }
    }
  }

  // Invariant 2: Cash-out cannot precede funding transfer
  const cashoutEvents = events.filter((e) => {
    const title = (e.title || "").toLowerCase();
    const track = (e.track || "").toLowerCase();
    const sev = (e.severity || "").toLowerCase();
    return (
      sev === "cashout" ||
      track === "atm_tower" ||
      title.includes("atm") ||
      title.includes("cash withdrawal") ||
      title.includes("cashout")
    );
  });

  if (firstDebitEvent && firstDebitTime !== Infinity) {
    for (const co of cashoutEvents) {
      const coTime = new Date(co.sourceTimestamp).getTime();
      if (!isNaN(coTime) && coTime < firstDebitTime) {
        conflicts.push({
          eventId: co.id,
          eventTitle: co.title,
          conflictType: "CASHOUT_BEFORE_FUNDING",
          message: `Cash-out timestamp (${co.sourceTimestamp}) precedes the funding transfer (${firstDebitEvent.sourceTimestamp}). Funds cannot be liquidated before arriving in the mule network.`,
          triggerTimestamp: co.sourceTimestamp,
          violatingTimestamp: firstDebitEvent.sourceTimestamp,
        });
      }
    }
  }

  // Invariant 3: Ordering between layering hops
  // Compare sequential banking / layering events
  const bankingLayerEvents = events.filter((e) => {
    const track = (e.track || "").toUpperCase();
    return track === "BANKING" || track === "MULE_LAYERING" || track === "NPCI_SWITCH" || track === "COMMERCIAL_ESCROW";
  });

  for (let i = 1; i < bankingLayerEvents.length; i++) {
    const prev = bankingLayerEvents[i - 1];
    const curr = bankingLayerEvents[i];
    const prevTime = new Date(prev.sourceTimestamp).getTime();
    const currTime = new Date(curr.sourceTimestamp).getTime();

    if (!isNaN(prevTime) && !isNaN(currTime) && currTime < prevTime) {
      conflicts.push({
        eventId: curr.id,
        eventTitle: curr.title,
        conflictType: "HOP_BEFORE_INBOUND",
        message: `Layering event (${curr.title}) occurs at ${curr.sourceTimestamp}, which is earlier than preceding hop (${prev.title}) at ${prev.sourceTimestamp}.`,
        triggerTimestamp: curr.sourceTimestamp,
        violatingTimestamp: prev.sourceTimestamp,
      });
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    conflictCount: conflicts.length,
  };
}
