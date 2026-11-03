import { describe, it, expect } from "vitest";
import { reconstruct5FileInvestigation } from "../investigationReconstructor";

describe("TARKA v9.5 Multi-Artifact Investigation Reconstructor (5 Indian Files)", () => {
  it("reconstructs 5 authentic Indian files with exact deterministic conservation", () => {
    const inv = reconstruct5FileInvestigation();

    expect(inv.caseId).toBe("CASE-2026-001");
    expect(inv.firNumber).toBe("FIR #0149/2026");
    expect(inv.bookedLossInr).toBe(500000);
    expect(inv.nodes.length).toBe(7);
    expect(inv.edges.length).toBe(7);
    expect(inv.fileManifest.length).toBe(5);
  });

  it("detects pre-ingestion Canva incremental edit tamper in File 1", () => {
    const inv = reconstruct5FileInvestigation();

    expect(inv.preIngestionTamper.hasTamper).toBe(true);
    expect(inv.preIngestionTamper.finding).toContain("2 %%EOF");
    expect(inv.preIngestionTamper.technicalOffset).toContain("0x14209");
    expect(inv.fileManifest[0].status).toBe("QUARANTINED");
  });

  it("enforces INSUFFICIENT_EVIDENCE classification for Deepak Meena with 340 CGNAT candidates", () => {
    const inv = reconstruct5FileInvestigation();
    const deepakNode = inv.nodes.find((n) => n.id === "M2C-DEEPAK");
    const deepakEdge = inv.edges.find((e) => e.targetNodeId === "M2C-DEEPAK");

    expect(deepakNode).toBeDefined();
    expect(deepakNode?.evidenceStatus).toBe("INSUFFICIENT_EVIDENCE");

    expect(deepakEdge).toBeDefined();
    expect(deepakEdge?.matchClassification).toBe("INSUFFICIENT_EVIDENCE");
    expect(deepakEdge?.insufficientEvidenceAnalysis?.cgnatCandidateCount).toBe(340);
    expect(deepakEdge?.insufficientEvidenceAnalysis?.portStatus).toContain("Port 0");
    expect(deepakEdge?.recommendedAction.cautionNotice).toContain("DO NOT ISSUE SECTION 107 BNSS FREEZE");
  });

  it("enforces Bona-Fide Merchant Hard-Veto and LIBR proportional lien for Apex Electronics", () => {
    const inv = reconstruct5FileInvestigation();
    const apexNode = inv.nodes.find((n) => n.id === "M3A-APEX");
    const apexEdge = inv.edges.find((e) => e.targetNodeId === "M3A-APEX");

    expect(apexNode).toBeDefined();
    expect(apexNode?.evidenceStatus).toBe("EXCLUDED_COMMERCIAL");
    expect(apexNode?.gstin).toBe("07AAACA1234F1Z8");
    expect(apexNode?.mcaCin).toBe("U51909DL2018PTC334912");

    expect(apexEdge).toBeDefined();
    expect(apexEdge?.amount).toBe(180000);
    expect(apexEdge?.recommendedAction.legalSection).toContain("Section 106(1) BNSS");
    expect(apexEdge?.recommendedAction.statutoryAction).toContain("proportional lien on ₹1,80,000.00 while preserving ₹2,50,000.00 clean working capital");
  });

  it("generates a comprehensive 7-Question Explainable Investigation Intelligence Brief", () => {
    const inv = reconstruct5FileInvestigation();
    const brief = inv.sevenQuestionBrief;

    expect(brief.questions.length).toBe(7);
    expect(brief.questions[0].questionText).toContain("entry vector and true financial loss");
    expect(brief.questions[4].questionText).toContain("Deepak Meena");
    expect(brief.questions[4].headlineSummary).toContain("INSUFFICIENT_EVIDENCE");
    expect(brief.questions[6].questionText).toContain("statutory requisitions are prepared");
  });

  it("compiles a 10-step inspectable Transformation Audit Log with cryptographic hashes", () => {
    const inv = reconstruct5FileInvestigation();

    expect(inv.transformationSteps.length).toBe(10);
    expect(inv.transformationSteps[0].engine).toBe("Crypto Hash & Merkle Ingestion");
    expect(inv.transformationSteps[1].status).toBe("QUARANTINED");
    expect(inv.transformationSteps[7].status).toBe("INSUFFICIENT_FLAGGED");
    expect(inv.transformationSteps[9].mathematicalBasis).toContain("Strict segregation of Forensic Technical Facts");
  });
});
