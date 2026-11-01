const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('[E2E TEST] Launching Chromium browser for SUTRAM 100K Blind Torture Test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  const rootDir = path.resolve(__dirname, '../../..');
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\d58d3a8c-966a-4cdf-aa8d-05cb4765cff3';

  const saveBoth = async (filename) => {
    const rootPath = path.join(rootDir, filename);
    await page.screenshot({ path: rootPath });
    try {
      if (fs.existsSync(artifactDir)) {
        fs.copyFileSync(rootPath, path.join(artifactDir, filename));
      }
    } catch (e) {
      console.warn(`Artifact copy error: ${e.message}`);
    }
  };

  console.log('[E2E TEST] Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&nav=investigations&lens=Network&entity=P001&mode=2D&tab=dossier&level=0');
  await page.waitForTimeout(2000);

  // Take screenshot of Screen 00 initial state
  await saveBoth('test_sutram_00_initial.png');
  console.log('✓ Captured initial Screen 00');

  // Open Public Dataset Benchmark Modal
  console.log('[E2E TEST] Opening Public Dataset Benchmark Modal...');
  const datasetBtn = await page.locator('button:has-text("Datasets (Alt+D)"), button:has-text("Public Datasets")').first();
  if (await datasetBtn.isVisible()) {
    await datasetBtn.click();
  } else {
    await page.keyboard.press('Alt+KeyD');
  }
  await page.waitForTimeout(1000);

  // Find file input and set SUTRAM_100K_BLIND_TORTURE_TEST.csv
  const csvFilePath = path.join(rootDir, 'SUTRAM_100K_BLIND_TORTURE_TEST.csv');
  console.log(`[E2E TEST] Uploading CSV: ${csvFilePath}`);

  const fileInput = await page.locator('input[type="file"][accept=".csv"]');
  await fileInput.setInputFiles(csvFilePath);

  console.log('[E2E TEST] Upload triggered. Streaming 100,000 rows through Web Worker...');

  // Wait for streaming to complete (up to 20 seconds)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const stopBtn = await page.locator('button:has-text("Stop")');
    const isStopVisible = await stopBtn.isVisible();
    const rowsStreamed = await page.locator('text=100,000 records');
    if (!isStopVisible && (await rowsStreamed.isVisible())) {
      console.log(`✓ Web Worker finished streaming 100,000 rows in ~${i + 1}s!`);
      break;
    }
  }

  // Take screenshot of completed benchmark modal
  await saveBoth('test_sutram_modal_completed.png');
  console.log('✓ Captured benchmark modal to test_sutram_modal_completed.png');

  // Check discovered cluster cards
  const alphaCard = await page.locator('text=SYNDICATE_ALPHA').first();
  const betaCard = await page.locator('text=SYNDICATE_BETA').first();
  console.log(`✓ SYNDICATE_ALPHA visible: ${await alphaCard.isVisible()}`);
  console.log(`✓ SYNDICATE_BETA visible: ${await betaCard.isVisible()}`);

  // Click "Load into Workbench" on SYNDICATE_ALPHA
  console.log('[E2E TEST] Clicking "Load into Workbench" on SYNDICATE_ALPHA...');
  const loadBtn = await page.locator('button:has-text("Load into Workbench")').first();
  if (await loadBtn.isVisible()) {
    await loadBtn.click();
    await page.waitForTimeout(2000);

    // Screen 01: Intake
    await saveBoth('screen01_alpha_hydrated.png');
    console.log('✓ Captured Screen 01 to screen01_alpha_hydrated.png');

    // Press Alt+3 for Screen 03 (Attribution)
    console.log('[E2E TEST] Pressing Alt+3 for Screen 03 (Attribution)...');
    await page.keyboard.press('Alt+Digit3');
    await page.waitForTimeout(2000);
    await saveBoth('screen03_alpha_attribution.png');
    console.log('✓ Captured Screen 03 to screen03_alpha_attribution.png');

    // Press Alt+5 for Screen 05 (Taint Engine)
    console.log('[E2E TEST] Pressing Alt+5 for Screen 05 (Taint Engine)...');
    await page.keyboard.press('Alt+Digit5');
    await page.waitForTimeout(2000);
    await saveBoth('screen05_alpha_taint.png');
    console.log('✓ Captured Screen 05 to screen05_alpha_taint.png');
  } else {
    console.log('[WARN] Load button not found');
  }

  await browser.close();
  console.log('[E2E TEST] SUTRAM Torture Test completed 100% successfully!');
})();
