const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve('docs/progress/f3');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Intake screen...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Switch to Files / Evidence Exhibit Vault tab
  const filesTab = page.locator('text=Files: Evidence Exhibit Vault');
  if (await filesTab.isVisible()) {
    await filesTab.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(outDir, 'f3_01_evidence_manager_1440.png') });
  console.log('Captured f3_01_evidence_manager_1440.png');

  // 2. Open Artifact Preview Modal
  const previewBtn = page.locator('button:has-text("Preview")').first();
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'f3_02_artifact_preview_modal_1440.png') });
    console.log('Captured f3_02_artifact_preview_modal_1440.png');
    // Close modal
    const closeBtn = page.locator('button[aria-label="Close"]').or(page.locator('button:has(svg.lucide-x)'));
    if (await closeBtn.isVisible()) {
      await closeBtn.first().click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Switch to Taint Engine Screen to see dynamic progress in header
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=taint-engine', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'f3_03_investigation_progress_and_header_1440.png') });
  console.log('Captured f3_03_investigation_progress_and_header_1440.png');

  await browser.close();
  console.log('All F-3 screenshots captured successfully.');
})();
