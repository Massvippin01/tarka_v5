const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const url = 'http://127.0.0.1:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0&view=taint-engine';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const outDir = 'E:/Tarka_v3/tarka/frontend/e2e/screens';
  const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';

  // 1. Standard view screenshot
  const standardPath = path.join(outDir, 'v55_screen3_taint_standard.png');
  await page.screenshot({ path: standardPath });
  fs.copyFileSync(standardPath, path.join(artifactDir, 'v55_screen3_taint_standard.png'));
  console.log('Saved v55_screen3_taint_standard.png');

  // 2. Click "+ Inject Clean Deposit"
  const injectBtn = await page.getByRole('button', { name: /Inject Clean Deposit/i }).first();
  if (injectBtn) {
    await injectBtn.click();
    await page.waitForTimeout(400);
    const cleanPath = path.join(outDir, 'v55_screen3_taint_clean_injected.png');
    await page.screenshot({ path: cleanPath });
    fs.copyFileSync(cleanPath, path.join(artifactDir, 'v55_screen3_taint_clean_injected.png'));
    console.log('Saved v55_screen3_taint_clean_injected.png');
  }

  // 3. Click K=1 button
  const k1Btn = await page.getByRole('button', { name: /K=1/i }).first();
  if (k1Btn) {
    await k1Btn.click();
    await page.waitForTimeout(400);
    const k1Path = path.join(outDir, 'v55_screen3_taint_k1_leakage.png');
    await page.screenshot({ path: k1Path });
    fs.copyFileSync(k1Path, path.join(artifactDir, 'v55_screen3_taint_k1_leakage.png'));
    console.log('Saved v55_screen3_taint_k1_leakage.png');
  }

  // Reset back to K=3
  const k3Btn = await page.getByRole('button', { name: /K=3/i }).first();
  if (k3Btn) {
    await k3Btn.click();
    await page.waitForTimeout(400);
  }

  // 4. Test Small View toggle
  const smallViewRadio = await page.getByText('Small View').first();
  if (smallViewRadio) {
    await smallViewRadio.click();
    await page.waitForTimeout(400);
    const smallPath = path.join(outDir, 'v55_screen3_taint_small_view.png');
    await page.screenshot({ path: smallPath });
    fs.copyFileSync(smallPath, path.join(artifactDir, 'v55_screen3_taint_small_view.png'));
    console.log('Saved v55_screen3_taint_small_view.png');

    const smallMetrics = await page.evaluate(() => {
      const scrollContainer = document.getElementById('tarka-workspace-body');
      return {
        scrollContainerClient: scrollContainer ? scrollContainer.clientHeight : null,
        scrollContainerScroll: scrollContainer ? scrollContainer.scrollHeight : null,
        hasScrollbar: scrollContainer ? scrollContainer.scrollHeight > scrollContainer.clientHeight : null,
      };
    });
    console.log('Small View Metrics:', JSON.stringify(smallMetrics, null, 2));
  }

  // 5. Test 1920x1080
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(400);
  const p1920Path = path.join(outDir, 'v55_screen3_taint_1920.png');
  await page.screenshot({ path: p1920Path });
  fs.copyFileSync(p1920Path, path.join(artifactDir, 'v55_screen3_taint_1920.png'));
  console.log('Saved v55_screen3_taint_1920.png');

  // 6. Test 1366x768
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(400);
  const p1366Path = path.join(outDir, 'v55_screen3_taint_1366.png');
  await page.screenshot({ path: p1366Path });
  fs.copyFileSync(p1366Path, path.join(artifactDir, 'v55_screen3_taint_1366.png'));
  console.log('Saved v55_screen3_taint_1366.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED AND COPIED SUCCESSFULLY.');
})();
