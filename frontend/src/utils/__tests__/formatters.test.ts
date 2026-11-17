import { describe, it, expect } from "vitest";
import { formatInr, formatIndianNumber } from "../formatters";

describe("formatInr", () => {
  it("formats standard amounts in en-IN with ₹ and 2 decimals", () => {
    expect(formatInr(500000)).toBe("₹5,00,000.00");
    expect(formatInr(15000)).toBe("₹15,000.00");
    expect(formatInr(285000)).toBe("₹2,85,000.00");
    expect(formatInr(12500000)).toBe("₹1,25,00,000.00");
  });

  it("handles zero and negative amounts", () => {
    expect(formatInr(0)).toBe("₹0.00");
    expect(formatInr(-200000)).toBe("-₹2,00,000.00");
  });

  it("handles showPaise=false", () => {
    expect(formatInr(500000, { showPaise: false })).toBe("₹5,00,000");
  });

  it("handles compact formatting", () => {
    expect(formatInr(500000, { compact: true })).toBe("₹5.00 L");
    expect(formatInr(12500000, { compact: true })).toBe("₹1.25 Cr");
    expect(formatInr(15000, { compact: true })).toBe("₹15.0 K");
  });

  it("formats non-monetary Indian numbers", () => {
    expect(formatIndianNumber(1000000)).toBe("10,00,000");
  });
});
