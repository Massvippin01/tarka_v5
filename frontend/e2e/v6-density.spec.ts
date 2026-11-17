import { test, expect } from '@playwright/test';

interface PageMapping {
  v6View: string;
  legacyView: string;
}

const INVESTIGATION_PAGES: PageMapping[] = [
  { v6View: 'workspace', legacyView: 'workspace' },
  { v6View: 'evidence', legacyView: 'intake' },
  { v6View: 'people', legacyView: 'entities' },
  { v6View: 'money', legacyView: 'taint-engine' },
  { v6View: 'network', legacyView: 'network' },
  { v6View: 'device', legacyView: 'attribution' },
  { v6View: 'actions', legacyView: 'report' },
  { v6View: 'court', legacyView: 'court-proof' },
];

test.describe('V6 Information Density & Light-Theme Quality Gate', () => {
  for (const { v6View, legacyView } of INVESTIGATION_PAGES) {
    test(`view=${v6View} satisfies density, contrast, typography floor, and topbar height`, async ({ page }) => {
      // 1. Measure legacy count above fold at 1440x900
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`http://localhost:5173/?case=CASE-2026-001&view=${legacyView}&legacy=1`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(1200);

      const legacyTextCount = await page.evaluate(() => {
        let count = 0;
        for (const el of document.querySelectorAll('body *')) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= 900 && rect.width > 0 && rect.height > 0) {
            if (el.children.length === 0 && (el.innerText || '').trim().length > 0) count++;
          }
        }
        return count;
      });

      // 2. Measure v6 at 1440x900
      await page.goto(`http://localhost:5173/?case=CASE-2026-001&view=${v6View}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(1200);

      // (a) Body background is #f6f6f7
      const bodyBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      // rgb(246, 246, 247) corresponds to #f6f6f7
      expect(bodyBg).toBe('rgb(246, 246, 247)');

      // (b) Topbar height <= 56px and no wrapped lines
      const topbarInfo = await page.evaluate(() => {
        const topbar = document.querySelector('.v6-topbar') || document.querySelector('header');
        if (!topbar) return { height: 0, wraps: false };
        const rect = topbar.getBoundingClientRect();
        return {
          height: rect.height,
          wraps: rect.height > 56,
        };
      });
      expect(topbarInfo.height).toBeLessThanOrEqual(56);
      expect(topbarInfo.wraps).toBe(false);

      // (c) Visible text items above fold >= 70% of legacy
      const v6TextCount = await page.evaluate(() => {
        let count = 0;
        for (const el of document.querySelectorAll('body *')) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= 900 && rect.width > 0 && rect.height > 0) {
            if (el.children.length === 0 && (el.innerText || '').trim().length > 0) count++;
          }
        }
        return count;
      });

      const densityRatio = v6TextCount / Math.max(legacyTextCount, 1);
      expect(densityRatio).toBeGreaterThanOrEqual(0.70);

      // (d) No text node < 11.9px
      const smallTextElements = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        const bad: string[] = [];
        for (const el of els) {
          if (el.childElementCount === 0 && (el.textContent || '').trim().length > 0) {
            // ignore script, style, svg hidden
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 11.9) {
              bad.push(`${el.tagName}: ${(el.textContent || '').trim().slice(0, 25)} (${fs}px)`);
            }
          }
        }
        return bad;
      });
      expect(smallTextElements).toEqual([]);
    });
  }

  test('deep-link ?view=court renders the Court Dossier laboratory', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/?case=CASE-2026-001&view=court', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1000);

    const isCourtVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes('Court Dossier') ||
        text.includes('BSA §63') ||
        text.includes('Can the evidence withstand cross-examination in court?')
      );
    });
    expect(isCourtVisible).toBe(true);
  });
});
