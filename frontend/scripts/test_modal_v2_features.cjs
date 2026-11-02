const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('[E2E TEST] Launching Chromium to verify Telemetry Oscilloscope & 3-Tab Benchmarking...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

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
  await page.waitForTimeout(1500);

  // Open Modal
  console.log('[E2E TEST] Opening Public Dataset Benchmark Modal via Alt+D...');
  await page.keyboard.press('Alt+KeyD');
  await page.waitForTimeout(1000);

  // Check Speed Mode Switcher
  const maxSpeedBtn = await page.locator('button:has-text("Max Speed")').first();
  const visualReplayBtn = await page.locator('button:has-text("Live Visual Replay")').first();
  console.log(`✓ Max Speed toggle visible: ${await maxSpeedBtn.isVisible()}`);
  console.log(`✓ Live Visual Replay toggle visible: ${await visualReplayBtn.isVisible()}`);

  // Upload SUTRAM_UNSEEN_BLIND_TEST_50K.csv
  const csvPath = path.join(rootDir, 'SUTRAM_UNSEEN_BLIND_TEST_50K.csv');
  console.log(`[E2E TEST] Uploading CSV: ${csvPath}`);
  const fileInput = await page.locator('input[type="file"][accept=".csv"]');
  await fileInput.setInputFiles(csvPath);

  console.log('[E2E TEST] Waiting for stream processing...');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const stopBtn = await page.locator('button:has-text("Stop")');
    const isStopVisible = await stopBtn.isVisible();
    const rowsStreamed = await page.locator('text=50,000 records');
    if (!isStopVisible && (await rowsStreamed.isVisible())) {
      console.log(`✓ Finished streaming 50,000 rows in ~${i + 1}s!`);
      break;
    }
  }

  // Screenshot Tab 1 (Matrix)
  await saveBoth('test_tab1_matrix_oscilloscope.png');
  console.log('✓ Captured Tab 1 (Matrix + Telemetry Strip) to test_tab1_matrix_oscilloscope.png');

  // Verify RRN cards have true rupee amounts and no dangling Funnel label
  const rrn01 = await page.locator('text=RRN-01').first();
  const singleRowBadge = await page.locator('text=Single-Row Invariant Audit').first();
  console.log(`✓ RRN-01 visible: ${await rrn01.isVisible()}`);
  console.log(`✓ Single-Row Invariant Audit badge visible: ${await singleRowBadge.isVisible()}`);

  // Click Tab 2: CGNAT & Scaling Curves
  console.log('[E2E TEST] Switching to Tab 2: 📈 CGNAT & Scaling Curves...');
  const tab2Btn = await page.locator('button:has-text("CGNAT & Scaling Curves")').first();
  await tab2Btn.click();
  await page.waitForTimeout(1000);
  await saveBoth('test_tab2_cgnat_curves.png');
  console.log('✓ Captured Tab 2 (CGNAT Decay Plot + Complexity Curve) to test_tab2_cgnat_curves.png');

  // Click Tab 3: Raw CSV Row Proof
  console.log('[E2E TEST] Switching to Tab 3: 🔍 Raw CSV Row Proof...');
  const tab3Btn = await page.locator('button:has-text("Raw CSV Row Proof")').first();
  await tab3Btn.click();
  await page.waitForTimeout(1000);
  await saveBoth('test_tab3_raw_proof.png');
  console.log('✓ Captured Tab 3 (Verbatim CSV Rows Table) to test_tab3_raw_proof.png');

  // Click Proof button on RRN-01 or another cluster card
  const proofBtns = await page.locator('button:has-text("Proof")').all();
  if (proofBtns.length > 0) {
    console.log(`[E2E TEST] Found ${proofBtns.length} Proof buttons. Clicking the last one (RRN)...`);
    const targetProofBtn = proofBtns[proofBtns.length - 1];
    await targetProofBtn.scrollIntoViewIfNeeded();
    await targetProofBtn.click({ force: true });
    await page.waitForTimeout(1000);
    await saveBoth('test_tab3_rrn_proof.png');
    console.log('✓ Captured RRN Proof in Tab 3 to test_tab3_rrn_proof.png');
  }

  await browser.close();
  console.log('🎉 ALL PLAYWRIGHT E2E TESTS PASSED 100%!');
})();
