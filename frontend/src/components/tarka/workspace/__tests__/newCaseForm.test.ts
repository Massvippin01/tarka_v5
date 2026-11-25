import { describe, expect, it } from "vitest";
import { formatAmountInput, goldenHourPreview, parseAmount, toLocalInput, validateNewCase } from "../newCaseForm";

const now = new Date("2026-11-25T12:00:00").getTime();
const ok = { fir: "112/2026", ncrp: "", receivedAt: toLocalInput(new Date(now)), complainant: "A", phone: "", title: "T" };

describe("newCaseForm", () => {
  it("formats amounts with Indian grouping and parses them back", () => {
    expect(formatAmountInput("1250000")).toBe("12,50,000");
    expect(formatAmountInput("abc")).toBe("");
    expect(parseAmount("12,50,000")).toBe(1250000);
  });
  it("previews the golden hour from the complaint time", () => {
    expect(goldenHourPreview(toLocalInput(new Date(now - 122 * 60_000)), now)).toBe("Golden hour: 58m left");
    expect(goldenHourPreview(toLocalInput(new Date(now - 300 * 60_000)), now)).toBe("Golden hour: already passed");
    expect(goldenHourPreview(toLocalInput(new Date(now + 3600_000)), now)).toBeNull();
  });
  it("validates loosely", () => {
    expect(validateNewCase(ok, now)).toEqual({});
    const bad = validateNewCase({ ...ok, fir: "", complainant: " ", title: "", phone: "123", ncrp: "x" }, now);
    expect(Object.keys(bad).sort()).toEqual(["complainant", "fir", "ncrp", "phone", "title"]);
    expect(validateNewCase({ ...ok, newProjectName: " " }, now).newProject).toBeTruthy();
  });
});
