import { test, expect } from '@playwright/test';

const V6_ROUTES = [
  'workspace',
  'cases',
  'evidence',
  'people',
  'money',
  'network',
  'device',
  'actions',
  'settings',
  'health',
  'lab',
];

test.describe('V6 Presentation Layer Automated "Is It Styled" Gate', () => {
  for (const route of V6_ROUTES) {
    test(`route view=${route} is properly styled with valid layout and bounds`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`http://localhost:5173/?case=CASE-2026-001&view=${route}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(800);

      // (a) Rail computed width is 200-260px
      const railWidth = await page.evaluate(() => {
        const rail = document.querySelector('.v6-rail') || document.querySelector('aside');
        return rail ? parseFloat(window.getComputedStyle(rail).width) : 0;
      });
      expect(railWidth).toBeGreaterThanOrEqual(200);
      expect(railWidth).toBeLessThanOrEqual(260);

      // (b) At least one element with display:grid exists in main content area
      const hasGridInMain = await page.evaluate(() => {
        const main = document.querySelector('.v6-main') || document.querySelector('main');
        if (!main) return false;
        const els = main.querySelectorAll('*');
        for (const el of els) {
          const display = window.getComputedStyle(el).display;
          if (display === 'grid') return true;
        }
        return false;
      });
      expect(hasGridInMain).toBe(true);

      // (c) No text node < 12px
      const smallTextElements = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        const bad: string[] = [];
        for (const el of els) {
          if (el.childElementCount === 0 && (el.textContent || '').trim().length > 0) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs < 11.9) {
              bad.push(`${el.tagName}: ${(el.textContent || '').trim().slice(0, 30)} (${fs}px)`);
            }
          }
        }
        return bad;
      });
      expect(smallTextElements).toEqual([]);

      // (d) Main page does not exceed 3x viewport height (unstyled stacks become huge)
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(scrollHeight).toBeLessThanOrEqual(2700);

      // (e) No console/page errors
      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
});
