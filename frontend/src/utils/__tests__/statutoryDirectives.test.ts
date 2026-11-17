import { describe, it, expect } from "vitest";
import {
  getBnss106PoliceSpecificLienNotice,
  getBnss107JudicialAttachmentApplication,
  getBnss94CbsDirective,
  getDot3920PortBlockDirective,
} from "../statutoryDirectives";
import { generateBsa63SplitSchedules, getCanonicalPaperAnchor, generateOfflineVerifyHtml } from "../courtProofEngine";

describe("Statutory Directives & Statutory Precision", () => {
  it("formats Section 106 BNSS Specific Lien with mandatory §106(3) Magistrate report", () => {
    const notice = getBnss106PoliceSpecificLienNotice("CASE-2026-001");
    expect(notice).toContain("SECTION 106 BNSS, 2023");
    expect(notice).toContain("₹1,80,000 IN A/C 004205001192");
    expect(notice).toContain("Apex Electronics Pvt Ltd");
    expect(notice).toContain("DO NOT FREEZE THE ENTIRE ACCOUNT");
    expect(notice).toContain("Roscoe v. Winder");
    expect(notice).toContain("Section 106(3) BNSS");

    const cbs = getBnss94CbsDirective("CASE-2026-001");
    expect(cbs).toContain("SECTION 94 BNSS");

    const dot = getDot3920PortBlockDirective("CASE-2026-001");
    expect(dot).toContain("DOT CLAUSE 39.20");
  });

  it("formats Section 107 BNSS Judicial Attachment with DSP concurrence and victim restitution", () => {
    const app = getBnss107JudicialAttachmentApplication("CASE-2026-001");
    expect(app).toContain("SECTION 107 BNSS, 2023");
    expect(app).toContain("₹3,80,000");
    expect(app).toContain("prior written concurrence of the Superintendent of Police");
    expect(app).toContain("14-day Show Cause Notice under Section 107(2) BNSS");
    expect(app).toContain("Section 107(6) and 107(7) BNSS");
  });

  it("never leaks Case 001 identifiers into another case's directives", () => {
    const all = [
      getBnss106PoliceSpecificLienNotice("CASE-2026-003"),
      getBnss94CbsDirective("CASE-2026-003"),
      getDot3920PortBlockDirective("CASE-2026-003"),
      getBnss107JudicialAttachmentApplication("CASE-2026-003"),
    ].join(" ");
    expect(all).not.toContain("Vikram");
    expect(all).not.toContain("Apex Electronics");
    expect(all).not.toContain("626510149921");
    expect(all).toContain("Cloud VPS");
  });

  it("generates BSA §63(4) Part A & Part B schedules", () => {
    const schedules = generateBsa63SplitSchedules("CASE-2026-001");
    expect(schedules.partA_BankNodal).toContain("SCHEDULE 'A'");
    expect(schedules.partA_BankNodal).toContain("Finacle 10.x");
    expect(schedules.partB_ForensicExpert).toContain("SCHEDULE 'B'");
    expect(schedules.partB_ForensicExpert).toContain("SHA-256 (FIPS 180-4 standard)");
    expect(schedules.puneBarCompliance.isCompliant).toBe(true);
  });

  it("generates offline verify.html with Step 1 Out-of-Band Trust Anchor", () => {
    const anchor = getCanonicalPaperAnchor("CASE-2026-001");
    expect(anchor.phoneticReadout).toBeTruthy();
    const html = generateOfflineVerifyHtml(anchor);
    expect(html).toContain("STEP 1 (Out-of-Band Trust Anchor)");
    expect(html).toContain(anchor.merkleRootSha256);
    expect(html).toContain(anchor.phoneticReadout);
  });
});
