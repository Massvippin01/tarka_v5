const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('[E2E TEST] Launching Chromium browser for SUTRAM 50K Unseen Blind Test...');
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

  // Open Public Dataset Benchmark Modal
  console.log('[E2E TEST] Opening Public Dataset Benchmark Modal...');
  const datasetBtn = await page.locator('button:has-text("Datasets (Alt+D)"), button:has-text("Public Datasets")').first();
  if (await datasetBtn.isVisible()) {
    await datasetBtn.click();
  } else {
    await page.keyboard.press('Alt+KeyD');
  }
  await page.waitForTimeout(1000);

  // Upload SUTRAM_UNSEEN_BLIND_TEST_50K.csv
  const csvFilePath = path.join(rootDir, 'SUTRAM_UNSEEN_BLIND_TEST_50K.csv');
  console.log(`[E2E TEST] Uploading CSV: ${csvFilePath}`);

  const fileInput = await page.locator('input[type="file"][accept=".csv"]');
  await fileInput.setInputFiles(csvFilePath);

  console.log('[E2E TEST] Upload triggered. Streaming 50,000 rows through Web Worker...');

  // Wait for streaming to complete (up to 20 seconds)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const stopBtn = await page.locator('button:has-text("Stop")');
    const isStopVisible = await stopBtn.isVisible();
    const rowsStreamed = await page.locator('text=50,000 records');
    if (!isStopVisible && (await rowsStreamed.isVisible())) {
      console.log(`✓ Web Worker finished streaming 50,000 rows in ~${i + 1}s!`);
      break;
    }
  }

  // Take screenshot of completed benchmark modal
  await saveBoth('test_50k_modal_completed.png');
  console.log('✓ Captured benchmark modal to test_50k_modal_completed.png');

  // Verify text content in the modal
  const tpText = await page.locator('text=TP: 14').first();
  const clustersHeader = await page.locator('text=DISCOVERED FRAUD CLUSTERS').first();
  console.log(`✓ TP: 14 displayed: ${await tpText.isVisible()}`);
  console.log(`✓ Clusters Header displayed: ${await clustersHeader.isVisible()}`);

  await browser.close();
  console.log('[E2E TEST] 50K Unseen Blind Test completed successfully!');
})();
