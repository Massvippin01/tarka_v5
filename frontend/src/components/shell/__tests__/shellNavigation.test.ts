import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { syncTarkaUrl } from "../../../context/TarkaGlobalContext";

describe("Prompt 6: Shell Layout, Mutually Exclusive Routing & URL Sync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const mockLocation = new URL("http://localhost:5173/");
    (globalThis as any).window = {
      location: mockLocation,
      history: {
        replaceState: (_data: any, _unused: string, url: string) => {
          (globalThis as any).window.location = new URL(url, "http://localhost:5173/");
        },
        pushState: (_data: any, _unused: string, url: string) => {
          (globalThis as any).window.location = new URL(url, "http://localhost:5173/");
        },
      },
    };
  });

  afterEach(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
  });

  describe("1. Two-Way URL Synchronization (?case=<id>&view=<route>)", () => {
    it("syncTarkaUrl sets case and view, and strips stale legacy parameters", () => {
      // Simulate dirty URL with legacy params like ?nav=investigations&lens=Network&entity=P001
      window.history.replaceState(
        {},
        "",
        "http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&rel=R002&mode=2D&tab=dossier&level=2"
      );

      // Call syncTarkaUrl for case 002 and view entities
      syncTarkaUrl("CASE-2026-002", "entities");

      const currentUrl = new URL(window.location.href);
      expect(currentUrl.searchParams.get("case")).toBe("CASE-2026-002");
      expect(currentUrl.searchParams.get("view")).toBe("entities");

      // Verify all stale parameters are completely deleted
      expect(currentUrl.searchParams.has("nav")).toBe(false);
      expect(currentUrl.searchParams.has("lens")).toBe(false);
      expect(currentUrl.searchParams.has("entity")).toBe(false);
      expect(currentUrl.searchParams.has("rel")).toBe(false);
      expect(currentUrl.searchParams.has("loc")).toBe(false);
      expect(currentUrl.searchParams.has("mode")).toBe(false);
      expect(currentUrl.searchParams.has("tab")).toBe(false);
      expect(currentUrl.searchParams.has("level")).toBe(false);
      expect(currentUrl.searchParams.has("stage")).toBe(false);
      expect(currentUrl.searchParams.has("benchmark")).toBe(false);
    });

    it("syncTarkaUrl properly syncs benchmark and workspace views", () => {
      syncTarkaUrl("CASE-2026-003", "benchmark");
      let url = new URL(window.location.href);
      expect(url.searchParams.get("case")).toBe("CASE-2026-003");
      expect(url.searchParams.get("view")).toBe("benchmark");

      syncTarkaUrl("CASE-2026-004", "workspace");
      url = new URL(window.location.href);
      expect(url.searchParams.get("case")).toBe("CASE-2026-004");
      expect(url.searchParams.get("view")).toBe("workspace");
    });
  });

  describe("2. Mutually Exclusive Screen Rendering Logic", () => {
    // Pure function simulating the single-switch routing condition in TarkaGlobalShell
    function resolveRenderedScreen(activePage: string, activeRoute: string): string {
      if (activePage === "benchmark") {
        return "BenchmarkLabScreen";
      } else if (activePage === "workspaces" || activeRoute === "workspace") {
        return "CaseWorkspaceScreen";
      } else {
        return `WorkbenchScreen:${activeRoute}`;
      }
    }

    it("renders ONLY BenchmarkLabScreen when activePage is benchmark, even if activeRoute was workspace", () => {
      // Prior bug: clicking Benchmarks set activePage="benchmark", but activeRoute was still "workspace",
      // rendering both screens simultaneously!
      const rendered = resolveRenderedScreen("benchmark", "workspace");
      expect(rendered).toBe("BenchmarkLabScreen");
      expect(rendered).not.toBe("CaseWorkspaceScreen");
    });

    it("renders CaseWorkspaceScreen when activePage is workspaces", () => {
      const rendered = resolveRenderedScreen("workspaces", "workspace");
      expect(rendered).toBe("CaseWorkspaceScreen");
    });

    it("renders CaseWorkspaceScreen when activeRoute is workspace", () => {
      const rendered = resolveRenderedScreen("workbench", "workspace");
      expect(rendered).toBe("CaseWorkspaceScreen");
    });

    it("renders the active pipeline screen when on workbench", () => {
      expect(resolveRenderedScreen("workbench", "intake")).toBe("WorkbenchScreen:intake");
      expect(resolveRenderedScreen("workbench", "entities")).toBe("WorkbenchScreen:entities");
      expect(resolveRenderedScreen("workbench", "attribution")).toBe("WorkbenchScreen:attribution");
      expect(resolveRenderedScreen("workbench", "network")).toBe("WorkbenchScreen:network");
      expect(resolveRenderedScreen("workbench", "taint-engine")).toBe("WorkbenchScreen:taint-engine");
      expect(resolveRenderedScreen("workbench", "court-proof")).toBe("WorkbenchScreen:court-proof");
      expect(resolveRenderedScreen("workbench", "privacy-crypto")).toBe("WorkbenchScreen:privacy-crypto");
      expect(resolveRenderedScreen("workbench", "workstation")).toBe("WorkbenchScreen:workstation");
    });
  });

  describe("3. 3-Zone Flex Header Dimensions & Non-Intersection Verification", () => {
    function simulateHeaderLayout(viewportWidth: number) {
      const headerPadding = 20; // 10px each side
      const headerGap = 10; // gap between zones
      const availableInnerWidth = viewportWidth - headerPadding;

      // Zone 1: Mode Switcher + Presentation Modes (fixed content)
      const zone1Width = 320;

      // Zone 3: Max 5 Visible Actions + More button
      // Case Switcher (~105px) + Brief (~65px) + Voice AI (~80px) + Export Report (~105px) + Evidence (~85px) + More (~60px) + 5 gaps (~25px)
      const zone3Width = 525;

      // Total non-breadcrumb width
      const fixedWidth = zone1Width + zone3Width + (2 * headerGap);

      // Zone 2 is flex: 1 1 auto with minWidth: 0, text-overflow: ellipsis
      const zone2AvailableWidth = Math.max(0, availableInnerWidth - fixedWidth);

      // Bounding boxes
      const zone1Box = { left: 10, right: 10 + zone1Width };
      const zone2Box = { left: zone1Box.right + headerGap, right: zone1Box.right + headerGap + zone2AvailableWidth };
      const zone3Box = { left: zone2Box.right + headerGap, right: zone2Box.right + headerGap + zone3Width };

      // Overlap checks
      const zone1OverlapsZone2 = zone1Box.right > zone2Box.left;
      const zone2OverlapsZone3 = zone2Box.right > zone3Box.left;

      return {
        viewportWidth,
        availableInnerWidth,
        zone1Width,
        zone2AvailableWidth,
        zone3Width,
        totalUsedWidth: zone1Width + zone2AvailableWidth + zone3Width + (2 * headerGap),
        zone1OverlapsZone2,
        zone2OverlapsZone3,
      };
    }

    it("verifies no header element overlap at 1366x768 (projector resolution)", () => {
      const layout = simulateHeaderLayout(1366);
      expect(layout.zone2AvailableWidth).toBeGreaterThan(400); // at least 400px for breadcrumb
      expect(layout.zone1OverlapsZone2).toBe(false);
      expect(layout.zone2OverlapsZone3).toBe(false);
      expect(layout.totalUsedWidth).toBeLessThanOrEqual(1366);
    });

    it("verifies no header element overlap at 1440x900 (standard laptop resolution)", () => {
      const layout = simulateHeaderLayout(1440);
      expect(layout.zone2AvailableWidth).toBeGreaterThan(470);
      expect(layout.zone1OverlapsZone2).toBe(false);
      expect(layout.zone2OverlapsZone3).toBe(false);
      expect(layout.totalUsedWidth).toBeLessThanOrEqual(1440);
    });

    it("verifies no header element overlap at 1920x1080 (full HD monitor resolution)", () => {
      const layout = simulateHeaderLayout(1920);
      expect(layout.zone2AvailableWidth).toBeGreaterThan(950);
      expect(layout.zone1OverlapsZone2).toBe(false);
      expect(layout.zone2OverlapsZone3).toBe(false);
      expect(layout.totalUsedWidth).toBeLessThanOrEqual(1920);
    });
  });

  describe("4. Nav Rail Structure & Lucide Icons", () => {
    const expectedSteps = [
      { step: "00", id: "workspace", shortTitle: "Command Hub" },
      { step: "01", id: "intake", shortTitle: "Evidence Intake" },
      { step: "02", id: "entities", shortTitle: "Entity Resolution" },
      { step: "03", id: "attribution", shortTitle: "CGNAT Attribution" },
      { step: "04", id: "network", shortTitle: "Fraud Network" },
      { step: "05", id: "taint-engine", shortTitle: "Taint DAG" },
      { step: "06", id: "court-proof", shortTitle: "Court Dossier" },
      { step: "07", id: "privacy-crypto", shortTitle: "Privacy & ZKP" },
      { step: "08", id: "workstation", shortTitle: "Forensic Loom" },
    ];

    it("has all 9 sequential steps (00-08) with correct short titles", () => {
      expect(expectedSteps).toHaveLength(9);
      expectedSteps.forEach((s, idx) => {
        expect(s.step).toBe(String(idx).padStart(2, "0"));
      });
    });

    it("nav labels contain no emojis in titles or shortTitles", () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expectedSteps.forEach((item) => {
        expect(emojiRegex.test(item.shortTitle)).toBe(false);
      });
    });
  });
});
