import { describe, it, expect } from "vitest";
import {
  computeSha256Hex,
  generateBip39Words,
  inspectFilePayload,
  generateCanvaPdfPreset,
  generateFinacleCsvPreset,
  generateCgnatCsvPreset,
  generateNpciXmlPreset,
} from "../forensicCrypto";

describe("Forensic Cryptography & Pre-Admission Engine (Air-Gap)", () => {
  it("computes deterministic SHA-256 hash using WebCrypto", async () => {
    const text = "TARKA_AIR_GAP_FORENSIC_SEED_2026";
    const buffer = new TextEncoder().encode(text).buffer;
    const hashHex = await computeSha256Hex(buffer);

    expect(hashHex).toBeDefined();
    expect(hashHex.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(hashHex)).toBe(true);

    // Recomputing must yield identical hash
    const hashHex2 = await computeSha256Hex(buffer);
    expect(hashHex2).toBe(hashHex);
  });

  it("derives deterministic 6-word and 24-word BIP-39 phonetic seals from hash", () => {
    const sampleHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const words6 = generateBip39Words(sampleHash, 6);
    expect(words6.length).toBe(6);
    expect(words6.every((w) => typeof w === "string" && w.length > 0)).toBe(true);

    const words24 = generateBip39Words(sampleHash, 24);
    expect(words24.length).toBe(24);
    expect(words24.slice(0, 6)).toEqual(words6);
  });

  it("flags tampered PDF with multiple %%EOF markers for quarantine", () => {
    const fakeCanvaPdf = generateCanvaPdfPreset();
    const result = inspectFilePayload("victim_receipt.pdf", fakeCanvaPdf.text, fakeCanvaPdf.size);

    expect(result.vectorType).toBe("PDF_RECEIPT");
    expect(result.tier).toBe("TIER_3_QUARANTINED");
    expect(result.gateStatus).toBe("QUARANTINED_EOF_TAMPER");
    expect(result.gateDetail).toContain("%%EOF");
  });

  it("certifies clean Finacle CBS double-entry ledger", () => {
    const cbs = generateFinacleCsvPreset(false);
    const result = inspectFilePayload("sbi_cbs_8821.csv", cbs.text, cbs.size);

    expect(result.vectorType).toBe("CBS_LEDGER");
    expect(result.tier).toBe("TIER_1_CERTIFIED");
    expect(result.gateStatus).toBe("PASS");
    expect(result.gateDetail).toContain("strictly satisfy");
  });

  it("quarantines tampered CBS ledger with balance deficit", () => {
    const cbsTampered = generateFinacleCsvPreset(true);
    const result = inspectFilePayload("sbi_cbs_tampered.csv", cbsTampered.text, cbsTampered.size);

    expect(result.vectorType).toBe("CBS_LEDGER");
    expect(result.tier).toBe("TIER_3_QUARANTINED");
    expect(result.gateStatus).toBe("QUARANTINED_BALANCE_DEFICIT");
    expect(result.gateDetail).toContain("deficit");
  });

  it("verifies and blinds PII in Telco CGNAT IPDR logs", () => {
    const cgnat = generateCgnatCsvPreset();
    const result = inspectFilePayload("airtel_cgnat.csv", cgnat.text, cgnat.size);

    expect(result.vectorType).toBe("TELCO_CGNAT");
    expect(result.tier).toBe("TIER_1_CERTIFIED");
    expect(result.gateStatus).toBe("PASS");
    expect(result.piiBlindedStats?.blinded).toBe(9996);
    expect(result.piiBlindedStats?.total).toBe(10000);
  });

  it("verifies NPCI UPI 2.0 XML transaction switch gateway payload", () => {
    const npci = generateNpciXmlPreset();
    const result = inspectFilePayload("npci_switch.xml", npci.text, npci.size);

    expect(result.vectorType).toBe("NPCI_XML");
    expect(result.tier).toBe("TIER_1_CERTIFIED");
    expect(result.gateStatus).toBe("PASS");
    expect(result.gateDetail).toContain("NPCI UPI 2.0 XML schema valid");
  });
});
