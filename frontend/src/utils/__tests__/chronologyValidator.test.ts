import { describe, it, expect } from "vitest";
import {
  validateChronology,
  formatChronologyTimestamp,
  type ChronologyEventInput,
} from "../chronologyValidator";
import { CANONICAL_CASES } from "../../fixtures/cases";

describe("chronologyValidator", () => {
  it("formats timestamps correctly for UTC and IST", () => {
    const iso = "2026-09-22T03:44:22Z";
    const utcStr = formatChronologyTimestamp(iso, "UTC");
    const istStr = formatChronologyTimestamp(iso, "IST");

    expect(utcStr).toBe("2026-09-22 03:44:22 UTC");
    expect(istStr).toBe("2026-09-22 09:14:22 IST");
  });

  it("validates all 4 canonical case fixtures with zero chronology conflicts", () => {
    Object.values(CANONICAL_CASES).forEach((fixture) => {
      const inputs: ChronologyEventInput[] = fixture.timelineEvents.map((e) => ({
        id: e.eventId,
        title: e.title,
        track: e.track,
        sourceTimestamp: e.timestampUtc,
        severity: e.severity,
        details: { detail: e.detail },
      }));

      const result = validateChronology(inputs);
      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.conflictCount).toBe(0);
    });
  });

  it("detects conflict when complaint is deliberately set before victim debit", () => {
    const events: ChronologyEventInput[] = [
      {
        id: "EVT-COMPLAINT",
        title: "1930 NCRP Complaint Registered",
        track: "COMPLAINT",
        sourceTimestamp: "2026-09-22T03:15:00Z", // Precedes debit
        severity: "COMPLAINT",
      },
      {
        id: "EVT-DEBIT",
        title: "Primary UPI Debit: Sunil Kumar to Vikram Shah",
        track: "BANKING",
        sourceTimestamp: "2026-09-22T03:44:22Z", // Later than complaint
        severity: "FRAUD_DEBIT",
      },
    ];

    const result = validateChronology(events);
    expect(result.isValid).toBe(false);
    expect(result.conflictCount).toBe(1);
    expect(result.conflicts[0].conflictType).toBe("COMPLAINT_BEFORE_DEBIT");
    expect(result.conflicts[0].eventId).toBe("EVT-COMPLAINT");
  });

  it("detects conflict when cash-out is set before source debit", () => {
    const events: ChronologyEventInput[] = [
      {
        id: "EVT-CASHOUT",
        title: "ATM Cash Withdrawal",
        track: "ATM_TOWER",
        sourceTimestamp: "2026-09-22T03:10:00Z", // Precedes debit
        severity: "CASHOUT",
      },
      {
        id: "EVT-DEBIT",
        title: "Primary UPI Debit: Extortion Wire",
        track: "BANKING",
        sourceTimestamp: "2026-09-22T03:44:22Z",
        severity: "FRAUD_DEBIT",
      },
    ];

    const result = validateChronology(events);
    expect(result.isValid).toBe(false);
    expect(result.conflictCount).toBe(1);
    expect(result.conflicts[0].conflictType).toBe("CASHOUT_BEFORE_FUNDING");
  });

  it("detects out-of-order layering hops", () => {
    const events: ChronologyEventInput[] = [
      {
        id: "EVT-HOP-1",
        title: "Hop 1 Transfer to Layer 1 Mule",
        track: "BANKING",
        sourceTimestamp: "2026-09-22T03:45:00Z",
      },
      {
        id: "EVT-HOP-2",
        title: "Hop 2 Layering to Secondary Mule",
        track: "BANKING",
        sourceTimestamp: "2026-09-22T03:40:00Z", // Before Hop 1!
      },
    ];

    const result = validateChronology(events);
    expect(result.isValid).toBe(false);
    expect(result.conflicts[0].conflictType).toBe("HOP_BEFORE_INBOUND");
  });
});
