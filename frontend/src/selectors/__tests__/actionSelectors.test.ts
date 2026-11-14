import { describe, it, expect } from "vitest";
import { selectCaseActionFinancials } from "../actionSelectors";
import type { CaseActionRecord } from "../../types/actions";

describe("selectCaseActionFinancials pure selector", () => {
  it("defaults to canonical case numbers when no actions are frozen", () => {
    const fin = selectCaseActionFinancials("CASE-2026-001", []);
    expect(fin.bookedLossInr).toBe(500000);
    expect(fin.recoverableLibrInr).toBe(380000);
    expect(fin.frozenAmountInr).toBe(0);
    expect(fin.pendingFreezeInr).toBe(380000);
    expect(fin.isFullyFrozen).toBe(false);
    expect(fin.goldenHourRemainingMins).toBeGreaterThan(0);
    expect(fin.recoveryPercentage).toBe(0);
  });

  it("calculates frozen amount and recovery percentage accurately when 2 accounts are frozen", () => {
    const mockActions: CaseActionRecord[] = [
      {
        id: "ACT-01",
        caseId: "CASE-2026-001",
        accountId: "ACC-M1",
        accountMasked: "Axis ...1904",
        accountHolder: "Vikram Shah",
        bank: "Axis Bank",
        ifsc: "UTIB0000123",
        layer: "LAYER_1_MULE",
        urgency: "CRITICAL_GOLDEN_HOUR",
        status: "FROZEN",
        targetAmount: 200000,
        frozenAmount: 200000,
        referenceNo: "ACK-AXIS-01",
      },
      {
        id: "ACT-02",
        caseId: "CASE-2026-001",
        accountId: "ACC-M2A",
        accountMasked: "ICICI ...1944",
        accountHolder: "Rohit Sharma",
        bank: "ICICI Bank",
        ifsc: "ICIC0001048",
        layer: "LAYER_2_CONDUIT",
        urgency: "CRITICAL_GOLDEN_HOUR",
        status: "FROZEN",
        targetAmount: 120000,
        frozenAmount: 120000,
        referenceNo: "ACK-ICICI-02",
      },
      {
        id: "ACT-03",
        caseId: "CASE-2026-001",
        accountId: "ACC-M2B",
        accountMasked: "SBI ...8241",
        accountHolder: "Sameer Khan",
        bank: "SBI",
        ifsc: "SBIN0001928",
        layer: "LAYER_2_CONDUIT",
        urgency: "ELEVATED",
        status: "NOT_REQUESTED",
        targetAmount: 80000,
        frozenAmount: 0,
        referenceNo: "POLICE-03",
      },
    ];

    const fin = selectCaseActionFinancials("CASE-2026-001", mockActions);
    expect(fin.frozenAmountInr).toBe(320000);
    expect(fin.pendingFreezeInr).toBe(60000);
    expect(fin.recoveryPercentage).toBe(64); // 320,000 / 500,000 * 100
    expect(fin.frozenAccountIds.has("ACC-M1")).toBe(true);
    expect(fin.frozenAccountIds.has("ACC-M2A")).toBe(true);
    expect(fin.frozenAccountIds.has("ACC-M2B")).toBe(false);
  });

  it("stops golden hour timer and sets isFullyFrozen when all recoverable capital is secured", () => {
    const mockActions: CaseActionRecord[] = [
      {
        id: "ACT-01",
        caseId: "CASE-2026-001",
        accountId: "ACC-M1",
        accountMasked: "Axis ...1904",
        accountHolder: "Vikram Shah",
        bank: "Axis Bank",
        ifsc: "UTIB0000123",
        layer: "LAYER_1_MULE",
        urgency: "CRITICAL_GOLDEN_HOUR",
        status: "FROZEN",
        targetAmount: 200000,
        frozenAmount: 200000,
        referenceNo: "ACK-AXIS-01",
      },
      {
        id: "ACT-02",
        caseId: "CASE-2026-001",
        accountId: "ACC-M2A",
        accountMasked: "ICICI ...1944",
        accountHolder: "Rohit Sharma",
        bank: "ICICI Bank",
        ifsc: "ICIC0001048",
        layer: "LAYER_2_CONDUIT",
        urgency: "CRITICAL_GOLDEN_HOUR",
        status: "FROZEN",
        targetAmount: 180000,
        frozenAmount: 180000,
        referenceNo: "ACK-ICICI-02",
      },
    ];

    const fin = selectCaseActionFinancials("CASE-2026-001", mockActions);
    expect(fin.frozenAmountInr).toBe(380000);
    expect(fin.pendingFreezeInr).toBe(0);
    expect(fin.isFullyFrozen).toBe(true);
    expect(fin.goldenHourRemainingMins).toBe(0);
  });
});

