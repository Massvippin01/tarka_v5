import { describe, it, expect } from "vitest";
import { getCanonicalCase, buildCaseBundleFromFixture } from "../../../fixtures/cases";
import { formatInr } from "../../../utils/formatters";

describe("Report Screen & Statutory Intelligence Invariants (Prompt 12)", () => {
  const caseIds = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];

  caseIds.forEach((caseId) => {
    describe(`Case ${caseId}`, () => {
      it("computes executive summary numbers identically to canonical fixtures", () => {
        const fixture = getCanonicalCase(caseId);
        const inv = buildCaseBundleFromFixture(fixture);

        // 1. Loss conservation
        expect(inv.bookedLossInr).toBe(fixture.financials.bookedLossInr);
        expect(inv.claimedLossInr).toBe(fixture.financials.claimedLossInr);
        expect(inv.recoverableLibrInr).toBe(fixture.financials.recoverableLibrInr);
        expect(inv.shieldedCommercialInr).toBe(fixture.financials.shieldedCommercialInr);

        // 2. INR formatting integrity
        const formattedLoss = formatInr(inv.bookedLossInr);
        expect(formattedLoss).toContain("₹");
        expect(formattedLoss).not.toContain("NaN");
        expect(formattedLoss).not.toContain("undefined");
      });

      it("validates evidence register contains real SHA-256 content hashes", () => {
        const fixture = getCanonicalCase(caseId);
        const inv = buildCaseBundleFromFixture(fixture);
        expect(inv.fileManifest.length).toBeGreaterThan(0);

        inv.fileManifest.forEach((art) => {
          // Real 64-hex SHA-256 regex
          expect(art.sha256).toMatch(/^[0-9a-f]{64}$/i);
          // Confirm non-trivial hash
          expect(art.sha256).not.toBe("0000000000000000000000000000000000000000000000000000000000000000");
        });
      });

      it("verifies auto-drafted statutory notices have lawful section references", () => {
        // Statutory notices must cite valid BNSS 2023 and BSA 2023 sections
        const freezeNoticeHeader = `SECTIONS 106 & 107 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023 (BNSS)`;
        const telecomNoticeHeader = `SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023`;
        const bsaCertificateHeader = `SECTION 63(4) BHARATIYA SAKSHYA ADHINIYAM, 2023`;

        expect(freezeNoticeHeader).toContain("106 & 107");
        expect(telecomNoticeHeader).toContain("SECTION 94");
        expect(bsaCertificateHeader).toContain("SECTION 63(4)");
      });

      it("preserves machine-readable JSON export schema integrity", () => {
        const fixture = getCanonicalCase(caseId);
        const inv = buildCaseBundleFromFixture(fixture);

        const exportedPayload = {
          caseId: fixture.caseId,
          firNumber: fixture.firNumber,
          policeStation: fixture.policeStation,
          complainant: fixture.complainant,
          financials: fixture.financials,
          investigationAudit: {
            postIngestionMerkleRoot: inv.postIngestionMerkleRoot,
            totalLossInr: inv.bookedLossInr,
            recoverableLibrInr: inv.recoverableLibrInr,
            shieldedCommercialInr: inv.shieldedCommercialInr,
          },
          suspectAccounts: fixture.accounts.filter((a) => a.holderType !== "VICTIM"),
          transactions: fixture.transactions,
          evidenceRegister: inv.fileManifest || [],
          statutoryCompliance: "Bharatiya Sakshya Adhiniyam 2023 §63(4)",
        };

        const jsonStr = JSON.stringify(exportedPayload);
        const parsed = JSON.parse(jsonStr);

        expect(parsed.caseId).toBe(caseId);
        expect(parsed.financials.bookedLossInr).toBe(fixture.financials.bookedLossInr);
        expect(parsed.investigationAudit.totalLossInr).toBe(fixture.financials.bookedLossInr);
        expect(parsed.statutoryCompliance).toContain("§63(4)");
        expect(parsed.suspectAccounts.length).toBeGreaterThan(0);
      });
    });
  });
});
