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
    const notice = getBnss106PoliceSpecificLienNotice();
    expect(notice).toContain("SECTION 106 BNSS, 2023");
    expect(notice).toContain("₹1,80,000.00 IN A/C 001405008129");
    expect(notice).toContain("Apex Electronics Pvt Ltd");
    expect(notice).toContain("DO NOT FREEZE THE ENTIRE ACCOUNT");
    expect(notice).toContain("Roscoe v. Winder");
    expect(notice).toContain("Section 106(3) BNSS");

    const cbs = getBnss94CbsDirective();
    expect(cbs).toContain("SECTION 94 BNSS");

    const dot = getDot3920PortBlockDirective();
    expect(dot).toContain("DOT CLAUSE 39.20");
  });

  it("formats Section 107 BNSS Judicial Attachment with DSP concurrence and victim restitution", () => {
    const app = getBnss107JudicialAttachmentApplication();
    expect(app).toContain("SECTION 107 BNSS, 2023");
    expect(app).toContain("₹3,80,000.00");
    expect(app).toContain("COUNTERSIGNATURE OF SUPERINTENDENT OF POLICE");
    expect(app).toContain("14-day Show Cause Notice under Section 107(2) BNSS");
    expect(app).toContain("Section 107(6) and 107(7) BNSS");
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
