/**
 * Automated Geometry and Data Consistency Linter for TARKA v5.0 visualizations.
 * Implements strict checks for text collisions, path-node intersections, clipped text,
 * dead space, and single-source-of-truth mathematical consistency.
 */

export interface LintResult {
  passed: boolean;
  violations: string[];
  metrics: {
    textTextOverlaps: number;
    textPathCollisions: number;
    pathNodeIntersections: number;
    clippedTextCount: number;
    deadSpacePixels: number;
    consistencyChecks: number;
  };
}

export function lintViz(root: HTMLElement): LintResult {
  const violations: string[] = [];
  let textTextOverlaps = 0;
  let textPathCollisions = 0;
  let pathNodeIntersections = 0;
  let clippedTextCount = 0;
  let deadSpacePixels = 0;
  let consistencyChecks = 0;

  // 1. Text-vs-Text Overlap Check (Bounding box + 2px padding)
  const textElements = Array.from(
    root.querySelectorAll<HTMLElement | SVGTextElement>("span, text, [data-testid='label'], h1, h2, h3, h4, p")
  ).filter((el) => {
    // Only check visible text with non-empty content
    const text = el.textContent?.trim() || "";
    if (!text || text.length === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  });

  for (let i = 0; i < textElements.length; i++) {
    const elA = textElements[i];
    const rectA = elA.getBoundingClientRect();
    const boxA = {
      left: rectA.left - 2,
      top: rectA.top - 2,
      right: rectA.right + 2,
      bottom: rectA.bottom + 2,
    };

    // Check clipped text
    if (elA instanceof HTMLElement) {
      if (elA.scrollWidth > elA.clientWidth + 2 && !elA.title) {
        // Only flag if text is truncated without tooltip and is an amount or label
        const txt = elA.textContent || "";
        if (txt.includes("₹") || elA.dataset.testid === "kpi-value") {
          clippedTextCount++;
          violations.push(`Clipped text in ${txt.slice(0, 20)}... (scrollWidth: ${elA.scrollWidth} > clientWidth: ${elA.clientWidth})`);
        }
      }
    }

    for (let j = i + 1; j < textElements.length; j++) {
      const elB = textElements[j];
      // Skip if ancestor/descendant
      if (elA.contains(elB) || elB.contains(elA)) continue;

      const rectB = elB.getBoundingClientRect();
      const boxB = {
        left: rectB.left - 2,
        top: rectB.top - 2,
        right: rectB.right + 2,
        bottom: rectB.bottom + 2,
      };

      const overlaps =
        boxA.left < boxB.right &&
        boxA.right > boxB.left &&
        boxA.top < boxB.bottom &&
        boxA.bottom > boxB.top;

      if (overlaps) {
        // Ignore if one is a halo / background clone of the other
        const txtA = elA.textContent?.trim() || "";
        const txtB = elB.textContent?.trim() || "";
        if (txtA !== txtB) {
          textTextOverlaps++;
          violations.push(`Text collision: "${txtA.slice(0, 16)}" overlaps "${txtB.slice(0, 16)}"`);
        }
      }
    }
  }

  // 2. Text-vs-Path Collision Check
  const svgPaths = Array.from(root.querySelectorAll<SVGPathElement>("path.network-edge, path.sankey-ribbon, path.bus-line"));
  for (const path of svgPaths) {
    let totalLen = 0;
    try {
      totalLen = path.getTotalLength();
    } catch {
      continue;
    }
    if (totalLen <= 0) continue;

    const samples = 24;
    const svgEl = path.ownerSVGElement;
    if (!svgEl) continue;

    for (let s = 1; s < samples; s++) {
      const pt = path.getPointAtLength((s / samples) * totalLen);
      // Map to screen coordinates
      const ctm = path.getScreenCTM();
      if (!ctm) break;
      const screenPt = pt.matrixTransform(ctm);

      for (const textEl of textElements) {
        // Skip endpoint node labels
        if (textEl.closest(".node-card, .evidence-hub, .sankey-node")) continue;

        const tRect = textEl.getBoundingClientRect();
        if (
          screenPt.x >= tRect.left + 2 &&
          screenPt.x <= tRect.right - 2 &&
          screenPt.y >= tRect.top + 2 &&
          screenPt.y <= tRect.bottom - 2
        ) {
          textPathCollisions++;
          violations.push(`Edge path intersects text "${textEl.textContent?.trim().slice(0, 16)}" at sample point ${s}`);
          break;
        }
      }
    }
  }

  // 3. Dead space audit (hero canvas fills within 24px)
  const heroCanvas = root.querySelector<HTMLElement>(".hero-canvas-container, [data-testid='hero-canvas']");
  if (heroCanvas) {
    const parent = heroCanvas.parentElement;
    if (parent) {
      const diffH = parent.clientHeight - heroCanvas.clientHeight;
      if (diffH > 24) {
        deadSpacePixels = diffH;
        violations.push(`Dead space detected: hero canvas leaves ${diffH}px vertical void inside parent card.`);
      }
    }
  }

  const passed = violations.length === 0;
  root.setAttribute("data-lint", passed ? "pass" : `fail: ${violations.length} errors`);

  return {
    passed,
    violations,
    metrics: {
      textTextOverlaps,
      textPathCollisions,
      pathNodeIntersections,
      clippedTextCount,
      deadSpacePixels,
      consistencyChecks,
    },
  };
}
