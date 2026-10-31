const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('--- 1. Testing Density Slide Button (Standard vs Small View) ---');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });

  // Check initial Standard view heights
  const standardHeights = await page.evaluate(() => {
    const kpi = document.querySelector('section[aria-label="Key Forensic Metrics"]');
    const gate = document.querySelector('section[aria-label="Falsification Gate Pipeline"]');
    return {
      kpiHeight: kpi?.getBoundingClientRect().height,
      gateHeight: gate?.getBoundingClientRect().height,
    };
  });
  console.log('Standard Mode Heights:', standardHeights);

  // Take screenshot in Standard mode
  await page.screenshot({ path: 'e2e/final_intake_standard.png' });

  // Click Small View slide button
  await page.click('button[role="radio"]:has-text("Small View")');
  await page.waitForTimeout(300);

  const smallViewHeights = await page.evaluate(() => {
    const kpi = document.querySelector('section[aria-label="Key Forensic Metrics"]');
    const gate = document.querySelector('section[aria-label="Falsification Gate Pipeline"]');
    const root = document.querySelector('.tarka-intake-root');
    return {
      kpiHeight: kpi?.getBoundingClientRect().height,
      gateHeight: gate?.getBoundingClientRect().height,
      isCompactClass: document.getElementById('tarka-workspace-body')?.classList.contains('tarka-density-compact'),
    };
  });
  console.log('Small View Mode Heights:', smallViewHeights);

  // Take screenshot in Small View mode
  await page.screenshot({ path: 'e2e/final_intake_small_view.png' });

  // Switch back to Standard
  await page.click('button[role="radio"]:has-text("Standard")');
  await page.waitForTimeout(200);

  console.log('--- 2. Testing All Dock Tabs & Empty Space Elimination ---');
  // RRN Lab screenshot
  await page.screenshot({ path: 'e2e/final_tab_rrn.png' });

  // PDF Tab
  await page.click('button[role="tab"]:has-text("PDF")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/final_tab_pdf.png' });

  // Privacy Tab
  await page.click('button[role="tab"]:has-text("Privacy")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/final_tab_privacy.png' });

  // Proof Tab
  await page.click('button[role="tab"]:has-text("Proof")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'e2e/final_tab_proof.png' });

  // Test Proof Tab Tamper Row 14 button
  const tamperBtn = page.locator('button:has-text("Tamper Row #14 Balance")');
  console.log('Proof Tamper Button Visible:', await tamperBtn.isVisible());
  await tamperBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/final_tab_proof_tampered.png' });

  // Reset mutations
  await page.click('button:has-text("Reset Invariants")');
  await page.waitForTimeout(200);

  console.log('--- 3. Testing Scrollbar & Scrolling Across All 4 Pages ---');
  const routes = ['intake', 'attribution', 'taint-engine', 'court-proof'];
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:5173/?view=${route}`, { waitUntil: 'networkidle' });

    const scrollMetrics = await page.evaluate(() => {
      const el = document.getElementById('tarka-workspace-body');
      return {
        scrollHeight: el?.scrollHeight,
        clientHeight: el?.clientHeight,
        canScroll: el ? el.scrollHeight > el.clientHeight : false,
        overflowY: el ? window.getComputedStyle(el).overflowY : null,
      };
    });

    if (scrollMetrics.canScroll) {
      await page.mouse.move(300, 250);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(200);
      const scrolledTop = await page.evaluate(() => document.getElementById('tarka-workspace-body')?.scrollTop);
      console.log(`Route [${route}] Scrollable: YES (scrolled ${scrolledTop}px)`, scrollMetrics);
    } else {
      console.log(`Route [${route}] Cockpit Fits Viewport: YES (scrollHeight == clientHeight: ${scrollMetrics.scrollHeight}px)`, scrollMetrics);
    }
  }

  await page.close();
  await browser.close();
  console.log('--- ALL VERIFICATIONS COMPLETE ---');
})();
