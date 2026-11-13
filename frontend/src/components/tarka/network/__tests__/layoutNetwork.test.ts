import { describe, it, expect } from "vitest";
import { layoutNetwork, type NetworkNodeLayout } from "../layoutNetwork";
import { getCanonicalCase, buildCaseBundleFromFixture } from "../../../../fixtures/cases";
import type { ReconstructedInvestigation } from "../../../../utils/investigationReconstructor";

describe("layoutNetwork geometry and port contract", () => {
  it("calculates exact node bounds and positions at 1536x864", () => {
    const layout = layoutNetwork(1536, 864, true, "all");
    expect(layout.nodes.length).toBe(10);

    const hero = layout.nodes.find((n) => n.id === "node-hero")!;
    expect(hero).toBeDefined();
    expect(hero.w).toBe(280);
    expect(hero.h).toBe(84);
    expect(hero.cy).toBe(Math.round(0.14 * 864));

    // Check account ports
    const accounts = layout.nodes.filter((n) => n.category === "account");
    expect(accounts.length).toBe(4);
    accounts.forEach((acc) => {
      expect(acc.ports.top.length).toBe(3);
      const [p0, p1, p2] = acc.ports.top;
      expect(p0.x).toBe(acc.cx - 44);
      expect(p1.x).toBe(acc.cx);
      expect(p2.x).toBe(acc.cx + 44);
      // Ports must be non-overlapping
      expect(p1.x - p0.x).toBe(44);
      expect(p2.x - p1.x).toBe(44);
    });
  });

  it("reserves 40px clear zone under hubs", () => {
    const H = 864;
    const yRowB = Math.round(0.50 * H);
    const hubSize = 56;
    const expectedClearZoneY = Math.round(yRowB + hubSize / 2 + 40);

    const layout = layoutNetwork(1536, H, true, "all");
    const hubDownEdges = layout.edges.filter((e) => e.sourceId.startsWith("hub-"));
    expect(hubDownEdges.length).toBeGreaterThan(0);

    hubDownEdges.forEach((edge) => {
      // Path format: M x1,y1 C ...
      const startMatch = edge.path.match(/^M\s+([\d.]+),([\d.]+)/);
      expect(startMatch).not.toBeNull();
      const startY = parseFloat(startMatch![2]);
      expect(startY).toBe(expectedClearZoneY);
    });
  });

  it("filters edges correctly by activeFilter and tether state", () => {
    // With hotspot off, no tether edges should be emitted
    const layoutNoHotspot = layoutNetwork(1536, 864, false, "all");
    const tetherEdgesNoHotspot = layoutNoHotspot.edges.filter((e) => e.type === "tether");
    expect(tetherEdgesNoHotspot.length).toBe(0);

    // With hotspot on and ja4 filter, only ja4 edges should be emitted
    const layoutJa4Only = layoutNetwork(1536, 864, true, "ja4");
    expect(layoutJa4Only.edges.every((e) => e.type === "ja4")).toBe(true);
    expect(layoutJa4Only.edges.length).toBe(5); // hero->hub + 4 accounts
  });

  it("guarantees non-overlapping collision-free clearance when cashflow nodes are included", () => {
    const layout = layoutNetwork(1200, 700, true, "cashflow", true);
    const victim = layout.nodes.find((n) => n.id === "node-victim")!;
    const tetherHub = layout.nodes.find((n) => n.id === "hub-tether")!;
    const ja4Hub = layout.nodes.find((n) => n.id === "hub-ja4")!;
    const cafHub = layout.nodes.find((n) => n.id === "hub-caf")!;
    const atm = layout.nodes.find((n) => n.id === "node-atm")!;

    expect(victim).toBeDefined();
    expect(atm).toBeDefined();

    // Check clearance between Victim right edge and Tether hub left edge
    const victimRight = victim.x + victim.w;
    const tetherLeft = tetherHub.x;
    expect(tetherLeft - victimRight).toBeGreaterThanOrEqual(40);

    // Check clearance between Tether hub and JA4 hub
    expect(ja4Hub.x - (tetherHub.x + tetherHub.w)).toBeGreaterThanOrEqual(40);

    // Check clearance between JA4 hub and CAF hub
    expect(cafHub.x - (ja4Hub.x + ja4Hub.w)).toBeGreaterThanOrEqual(40);

    // Check clearance between CAF hub right edge and ATM left edge
    const cafRight = cafHub.x + cafHub.w;
    const atmLeft = atm.x;
    expect(atmLeft - cafRight).toBeGreaterThanOrEqual(40);
  });

  it("renders Cases 001-004 and an uploaded case without any node collisions (Prompt 11)", () => {
    const caseIds = ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"];

    function doNodesOverlap(a: NetworkNodeLayout, b: NetworkNodeLayout): boolean {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    }

    caseIds.forEach((caseId) => {
      const fixture = getCanonicalCase(caseId);
      const inv = buildCaseBundleFromFixture(fixture);
      const layout = layoutNetwork(1440, 800, true, "all", true, inv);

      expect(layout.nodes.length).toBeGreaterThan(3);

      for (let i = 0; i < layout.nodes.length; i++) {
        for (let j = i + 1; j < layout.nodes.length; j++) {
          const n1 = layout.nodes[i];
          const n2 = layout.nodes[j];
          const overlaps = doNodesOverlap(n1, n2);
          if (overlaps) {
            console.error(
              `Collision in ${caseId}: [${n1.id}] (${n1.x},${n1.y},${n1.w},${n1.h}) and [${n2.id}] (${n2.x},${n2.y},${n2.w},${n2.h})`
            );
          }
          expect(overlaps).toBe(false);
        }
      }
    });

    // Uploaded live case with 6 heterogeneous nodes
    const uploadedInv: any = {
      caseId: "CASE-2026-LIVE-UPLOAD",
      firNumber: "FIR #999/2026",
      policeStation: "Cyber Cell HQ",
      complainantName: "Vipin Sharma",
      claimedLossInr: 1220000,
      bookedLossInr: 1220000,
      recoverableLibrInr: 950000,
      shieldedCommercialInr: 270000,
      nodes: [
        { id: "U-VICTIM", label: "Vipin Sharma (Victim)", entityType: "VICTIM", bank: "HDFC", accountMasked: "...1122" },
        { id: "U-MULE1", label: "Pooja Verma", entityType: "LAYER_1_MULE", bank: "Axis", accountMasked: "...3344" },
        { id: "U-MULE2", label: "Akash Deep", entityType: "LAYER_2_CONDUIT", bank: "ICICI", accountMasked: "...5566" },
        { id: "U-MULE3", label: "Suresh Rao", entityType: "LAYER_2_CONDUIT", bank: "SBI", accountMasked: "...7788" },
        { id: "U-MERCHANT", label: "QuickPay Merchant", entityType: "BONA_FIDE_MERCHANT", bank: "Kotak", accountMasked: "...9900" },
        { id: "U-SINK", label: "Cashpoint Sink", entityType: "LAYER_3_SINK", bank: "Paytm", accountMasked: "...2233" },
      ],
      edges: [
        { id: "UE1", sourceNodeId: "U-VICTIM", targetNodeId: "U-MULE1", amount: 1220000, rail: "IMPS", timestampIst: "10:00:00" },
        { id: "UE2", sourceNodeId: "U-MULE1", targetNodeId: "U-MULE2", amount: 600000, rail: "RTGS", timestampIst: "10:05:00" },
        { id: "UE3", sourceNodeId: "U-MULE1", targetNodeId: "U-MULE3", amount: 620000, rail: "IMPS", timestampIst: "10:06:00" },
        { id: "UE4", sourceNodeId: "U-MULE2", targetNodeId: "U-MERCHANT", amount: 300000, rail: "UPI", timestampIst: "10:10:00" },
        { id: "UE5", sourceNodeId: "U-MULE3", targetNodeId: "U-SINK", amount: 500000, rail: "ATM_CASH", timestampIst: "10:15:00" },
      ],
      muleScores: {
        "U-MULE1": { score: 92, riskBand: "CRITICAL", topReasons: ["High velocity outbound", "Zero dwell time"] },
        "U-MULE2": { score: 84, riskBand: "CRITICAL", topReasons: ["Immediate conduit hop"] },
        "U-MULE3": { score: 79, riskBand: "CRITICAL", topReasons: ["Large structured split"] },
        "U-MERCHANT": { score: 12, riskBand: "MERCHANT", topReasons: ["Bona fide merchant turnover"] },
        "U-SINK": { score: 88, riskBand: "CRITICAL", topReasons: ["Physical cash withdrawal point"] },
      },
    };

    const uploadedLayout = layoutNetwork(1440, 800, true, "all", true, uploadedInv as unknown as ReconstructedInvestigation);
    expect(uploadedLayout.nodes.length).toBeGreaterThan(5);

    for (let i = 0; i < uploadedLayout.nodes.length; i++) {
      for (let j = i + 1; j < uploadedLayout.nodes.length; j++) {
        const n1 = uploadedLayout.nodes[i];
        const n2 = uploadedLayout.nodes[j];
        const overlaps = doNodesOverlap(n1, n2);
        expect(overlaps).toBe(false);
      }
    }
  });
});

