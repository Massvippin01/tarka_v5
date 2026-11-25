import { describe, it, expect } from "vitest";
import { humanizeAuditEvent, formatTimeAgo, type AuditEventDto } from "../auditHumanizer";

describe("Forensic Audit Humanizer & Activity Feed (Prompt F-7)", () => {
  it("humanizes statutory freeze directive request into plain investigator prose", () => {
    const raw: AuditEventDto = {
      event_id: "evt-001",
      case_id: "CASE-2026-001",
      actor_id: "Insp. R. K. Sharma (IO-409)",
      action: "FREEZE_DIRECTIVE_REQUESTED",
      resource_type: "ACCOUNT",
      resource_id: "acc-991",
      payload_hash: "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
      timestamp: new Date().toISOString(),
      details: {
        target_frozen_amount: 180000,
        bank_name: "Axis Bank",
        target_account: "919010048201",
      },
    };

    const humanized = humanizeAuditEvent(raw);
    expect(humanized.category).toBe("ENFORCEMENT");
    expect(humanized.title).toContain("Issued Statutory §106/§107 BNSS Freeze Directive");
    expect(humanized.description).toContain("₹1,80,000");
    expect(humanized.description).toContain("Axis Bank");
    expect(humanized.payloadHash).toBe(raw.payload_hash);
  });

  it("humanizes bank response acknowledgement and lien confirmation", () => {
    const raw: AuditEventDto = {
      event_id: "evt-002",
      case_id: "CASE-2026-001",
      actor_id: "SYSTEM",
      action: "BANK_RESPONSE_RECORDED",
      resource_type: "ACTION",
      resource_id: "act-001",
      payload_hash: "b2c3d4e5f6a17890abcdef1234567890abcdef1234567890abcdef1234567890",
      timestamp: new Date().toISOString(),
      details: {
        frozen_amount: 180000,
        bank_ref_no: "NODAL-AXIS-77192",
      },
    };

    const humanized = humanizeAuditEvent(raw);
    expect(humanized.category).toBe("ENFORCEMENT");
    expect(humanized.title).toContain("Commercial Bank Lien Confirmed");
    expect(humanized.description).toContain("₹1,80,000");
    expect(humanized.description).toContain("NODAL-AXIS-77192");
  });

  it("humanizes case status lifecycle transitions with diff", () => {
    const raw: AuditEventDto = {
      event_id: "evt-003",
      case_id: "CASE-2026-002",
      actor_id: "usr-admin-01",
      action: "CASE_STATUS_TRANSITION",
      resource_type: "CASE",
      resource_id: "CASE-2026-002",
      payload_hash: "c3d4e5f6a1b27890abcdef1234567890abcdef1234567890abcdef1234567890",
      timestamp: new Date().toISOString(),
      details: {
        previous_status: "INVESTIGATING",
        new_status: "ACTION_PENDING",
        before: { status: "INVESTIGATING" },
        after: { status: "ACTION_PENDING" },
      },
    };

    const humanized = humanizeAuditEvent(raw);
    expect(humanized.category).toBe("LIFECYCLE");
    expect(humanized.title).toContain("Case Status Transitioned");
    expect(humanized.description).toContain("INVESTIGATING → ACTION_PENDING");
    expect(humanized.diff).toBeDefined();
    expect(humanized.diff?.after?.status).toBe("ACTION_PENDING");
  });

  it("computes relative time ago properly", () => {
    const now = new Date();
    expect(formatTimeAgo(now.toISOString())).toBe("Just now");

    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatTimeAgo(fiveMinsAgo.toISOString())).toBe("5m ago");

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoHoursAgo.toISOString())).toBe("2h ago");
  });
});

