import { describe, it, expect } from "vitest";
import { selectActNowQueue, selectNeedsDataCases } from "../dashboardSelectors";

describe("Act-now queue skips cases with no amounts", () => {
  it("lists a no-money, no-clock case under needs-data instead of the queue", () => {
    const empty = { caseId: "CASE-EMPTY-1", firNumber: "", policeStation: "", complainantName: "", status: "INTAKE", bookedLossInr: 0, recoverableInr: 0, goldenHourRemainingMins: 0 } as any;
    expect(selectActNowQueue([empty])).toEqual([]);
    expect(selectNeedsDataCases([empty]).map((c) => c.caseId)).toEqual(["CASE-EMPTY-1"]);
    const funded = { ...empty, caseId: "CASE-FUNDED-1", recoverableInr: 5000 };
    expect(selectActNowQueue([empty, funded]).map((i) => i.caseId)).toEqual(["CASE-FUNDED-1"]);
  });
});
