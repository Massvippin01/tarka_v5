import { describe, it, expect } from "vitest";
import { layoutNetwork } from "../layoutNetwork";

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
});

