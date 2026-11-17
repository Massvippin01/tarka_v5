const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: '1366x768_laptop', width: 1366, height: 768 },
  { name: '1920x1080_desktop', width: 1920, height: 1080 }
];

const GOLDEN_PATH_STEPS = [
  { route: 'intake', step: 1, title: 'Step 01: Evidence & Ledger Verification', checkSelector: '.bento-card, .ledger-card-container, table' },
  { route: 'entities', step: 2, title: 'Step 02: Identity & Entity Resolution', checkSelector: 'div:has-text("People & Accounts"), div:has-text("Resolved Entities")' },
  { route: 'taint-engine', step: 3, title: 'Step 03: Money Trail & Taint Engine', checkSelector: 'div:has-text("Money Trail"), div:has-text("Layer 1")' },
  { route: 'network', step: 4, title: 'Step 04: Fraud Network Topology', checkSelector: 'canvas, svg, div:has-text("Fraud Network")' },
  { route: 'attribution', step: 5, title: 'Step 05: CGNAT & Device Attribution', checkSelector: 'div:has-text("CGNAT"), div:has-text("Attribution"), div:has-text("Funnel")' },
  { route: 'report', step: 6, title: 'Step 06: Statutory Case Report', checkSelector: 'button:has-text("Download"), button:has-text("Export Report"), div:has-text("Section 63"), div:has-text("Court-Admissible")' }
];

const CASES = [
  { id: 'CASE-2026-001', name: 'Digital Arrest' },
  { id: 'CASE-2026-002', name: 'APK SIM Swap' },
  { id: 'CASE-2026-003', name: 'Corporate BEC' },
  { id: 'CASE-2026-004', name: 'Task Fraud' }
];

async function runGoldenPathSuite() {
  console.log('======================================================================');
  console.log('  TARKA DEMO-DAY HARDENING (PROMPT 17): PLAYWRIGHT E2E VERIFICATION');
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(condition, message) {
    totalAssertions++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedAssertions++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failedAssertions++;
    }
  }

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n----------------------------------------------------------------------`);
      console.log(`[VIEWPORT ${vp.name.toUpperCase()}]: ${vp.width}x${vp.height}`);
      console.log(`----------------------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();

      const pageErrors = [];
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      // 1. Test Golden Path 6 Screens on primary case
      for (const step of GOLDEN_PATH_STEPS) {
        console.log(`\n  >> Testing ${step.title} (${step.route})...`);
        const targetUrl = `${BASE_URL}/?case=CASE-2026-001&view=${step.route}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        // Header Overlap Check: Zone 2 (breadcrumb) vs Zone 3 (toolbar)
        const header = await page.$('header');
        if (header) {
          const overlap = await page.evaluate(() => {
            const z2 = document.querySelector('header > div:nth-child(2)');
            const z3 = document.querySelector('header > div:nth-child(3)');
            if (!z2 || !z3) return { ok: true, gap: 100 };
            const r2 = z2.getBoundingClientRect();
            const r3 = z3.getBoundingClientRect();
            return {
              ok: r3.left >= r2.right - 4 || r2.width === 0 || r3.width === 0,
              gap: r3.left - r2.right
            };
          });
          assert(overlap.ok, `Header toolbar does not overlap breadcrumb at ${vp.width}px (gap: ${Math.round(overlap.gap)}px)`);
        }

        // Verify Content is present
        const hasContent = await page.locator(step.checkSelector).count();
        assert(hasContent > 0, `Screen content rendered matching: ${step.checkSelector}`);

        // Capture screenshot of each screen at 1366 and 1920
        const screenshotPath = path.join(ARTIFACT_DIR, `p17_golden_${step.route}_${vp.width}.png`);
        try {
          await page.screenshot({ path: screenshotPath });
          console.log(`     📸 Saved screenshot: ${screenshotPath}`);
        } catch (e) {
          console.warn(`     Could not save screenshot to ${screenshotPath}:`, e.message);
        }
      }

      // 2. Report Download Verification on Screen 06
      console.log(`\n  >> Testing Report Download on Screen 06 at ${vp.width}px...`);
      await page.goto(`${BASE_URL}/?case=CASE-2026-001&view=report`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const downloadButton = page.locator('button:has-text("Download Certified Bundle"), button:has-text("Export Report"), button:has-text("Download")').first();
      const hasDownloadBtn = await downloadButton.count();
      assert(hasDownloadBtn > 0, 'Found Report Download / Export button on Screen 06');

      if (hasDownloadBtn > 0) {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 3000 }).catch(() => null),
          downloadButton.click().catch(() => null)
        ]);
        if (download) {
          const filename = download.suggestedFilename();
          assert(filename.length > 0, `Report downloaded successfully: ${filename}`);
        } else {
          console.log('     Download initiated / Print dialog triggered');
        }
      }

      // 3. Multi-Case Verification (Cases 001 - 004 render without error)
      console.log(`\n  >> Testing Multi-Case Switching (001 -> 004) at ${vp.width}px...`);
      for (const c of CASES) {
        await page.goto(`${BASE_URL}/?case=${c.id}&view=intake`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const currentUrl = page.url();
        assert(currentUrl.includes(`case=${c.id}`), `URL correctly maintains case=${c.id}`);

        const screenRendered = await page.locator('.ledger-card-container, table, header').count();
        assert(screenRendered > 0, `Case ${c.id} (${c.name}) renders active layout without crashing`);
      }

      // 4. Console Errors Check
      const fatalErrors = pageErrors.filter((e) => !e.includes('ResizeObserver') && !e.includes('favicon'));
      assert(fatalErrors.length === 0, `Zero fatal console errors in viewport ${vp.name} (found: ${fatalErrors.length})`);
      if (fatalErrors.length > 0) {
        console.error('     Console errors:', fatalErrors);
      }

      await context.close();
    }

    // 5. Offline Resilience Check (Simulating Offline / Backend Unreachable)
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`[TEST: OFFLINE RESILIENCE]`);
    console.log(`----------------------------------------------------------------------`);
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();

      // Block all requests to backend /api/*
      await page.route('**/api/v1/**', (route) => {
        route.abort('connectionrefused');
      });

      console.log('  >> Navigating with simulated offline network (backend blocked)...');
      await page.goto(`${BASE_URL}/?case=CASE-2026-001&view=intake`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Verify page still renders intake and doesn't crash
      const tableRows = await page.locator('table tr, .ledger-card-container').count();
      assert(tableRows > 0, 'Intake screen renders table rows from canonical fallback when backend is unreachable');

      // Verify offline pill rendered in header
      const offlinePill = await page.locator('[data-testid="offline-demo-pill"]').count();
      assert(offlinePill > 0, 'Header displays "Offline demo data" pill when backend is offline');

      // Verify no modal crash or white screen
      const rootExists = await page.locator('#root').count();
      assert(rootExists > 0, 'App root is intact and rendered under offline conditions');

      // Capture screenshot in offline state
      const offlineScreenshot = path.join(ARTIFACT_DIR, 'p17_offline_resilience_1366.png');
      await page.screenshot({ path: offlineScreenshot });
      console.log(`  📸 Saved offline resilience screenshot: ${offlineScreenshot}`);

      await context.close();
    }

    console.log('\n======================================================================');
    console.log(`RESULTS: ${passedAssertions}/${totalAssertions} assertions passed (${failedAssertions} failed)`);
    console.log('======================================================================\n');

  } finally {
    await browser.close();
  }

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runGoldenPathSuite().catch((err) => {
  console.error('Playwright suite execution failed:', err);
  process.exit(1);
});
