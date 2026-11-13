import { describe, it, expect } from "vitest";

// Standard WCAG 2.1 relative luminance and contrast calculations
function sRGBtoLin(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG 2.1 Contrast Ratio Verification Suite (Phase 15.2)", () => {
  // Canonical background surfaces
  const canvasObsidian = "#060B14"; // Canvas base
  const cardGlass = "#0F1B2E";      // Surface primary
  const elevatedGlass = "#132238";  // Modal & popovers

  describe("Primary & Secondary Typography", () => {
    it("verifies Text Primary (#F8FAFC) exceeds WCAG AAA (7.0:1) on all dark surfaces", () => {
      const crCanvas = getContrastRatio("#F8FAFC", canvasObsidian);
      const crCard = getContrastRatio("#F8FAFC", cardGlass);
      const crElevated = getContrastRatio("#F8FAFC", elevatedGlass);

      expect(crCanvas).toBeGreaterThanOrEqual(18.0);
      expect(crCard).toBeGreaterThanOrEqual(15.0);
      expect(crElevated).toBeGreaterThanOrEqual(14.0);
    });

    it("verifies Text Secondary (#94A3B8) exceeds WCAG AA (4.5:1) on all surfaces and AAA for large text", () => {
      const crCanvas = getContrastRatio("#94A3B8", canvasObsidian);
      const crCard = getContrastRatio("#94A3B8", cardGlass);
      const crElevated = getContrastRatio("#94A3B8", elevatedGlass);

      expect(crCanvas).toBeGreaterThanOrEqual(7.0); // Meets AAA on canvas
      expect(crCard).toBeGreaterThanOrEqual(6.0);   // Meets AA
      expect(crElevated).toBeGreaterThanOrEqual(5.5); // Meets AA
    });
  });

  describe("Calibrated Muted & Disabled Typography (Defect Remediation)", () => {
    it("verifies Calibrated Muted Text (#8C9EB0) meets WCAG AA (>= 4.5:1) on all surfaces", () => {
      const crCanvas = getContrastRatio("#8C9EB0", canvasObsidian);
      const crCard = getContrastRatio("#8C9EB0", cardGlass);
      const crElevated = getContrastRatio("#8C9EB0", elevatedGlass);

      // Canvas exceeds AAA 7.0:1
      expect(crCanvas).toBeGreaterThanOrEqual(7.0);
      // Card and elevated exceed AA 4.5:1
      expect(crCard).toBeGreaterThanOrEqual(4.5);
      expect(crElevated).toBeGreaterThanOrEqual(4.5);
    });

    it("verifies Calibrated Disabled Text (#76889A) meets WCAG AA (>= 4.5:1) on canvas and card", () => {
      const crCanvas = getContrastRatio("#76889A", canvasObsidian);
      const crCard = getContrastRatio("#76889A", cardGlass);

      expect(crCanvas).toBeGreaterThanOrEqual(5.0);
      expect(crCard).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Semantic Status & Forensic Accents", () => {
    it("verifies Cyan Accent (#22D3EE) exceeds WCAG AAA (7.0:1) on dark glass cards", () => {
      const cr = getContrastRatio("#22D3EE", cardGlass);
      expect(cr).toBeGreaterThanOrEqual(7.0);
    });

    it("verifies Accessible Verified Emerald (#34D399) exceeds WCAG AAA (7.0:1)", () => {
      const cr = getContrastRatio("#34D399", cardGlass);
      expect(cr).toBeGreaterThanOrEqual(7.0);
    });

    it("verifies Accessible Amber Warning (#FBBF24) exceeds WCAG AAA (7.0:1)", () => {
      const cr = getContrastRatio("#FBBF24", cardGlass);
      expect(cr).toBeGreaterThanOrEqual(7.0);
    });

    it("verifies Accessible Rose Alert (#FB7185) meets WCAG AA (>= 4.5:1)", () => {
      const cr = getContrastRatio("#FB7185", cardGlass);
      expect(cr).toBeGreaterThanOrEqual(5.0);
    });
  });
});

