const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = 'E:/Tarka_v3/tarka/frontend/e2e/screens';
  const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Loading Workstation...');
  await page.goto('http://127.0.0.1:5173/?case=CASE-2026-001', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // 1. Screen 1: Entities Tab
  console.log('Testing Screen 1: Entities Tab...');
  const entitiesTab = await page.getByRole('tab', { name: /Entities/i }).first();
  if (entitiesTab) {
    await entitiesTab.click();
    await page.waitForTimeout(400);
  }
  const s1Path = path.join(outDir, 'v60_screen1_entities_resolved.png');
  await page.screenshot({ path: s1Path });
  fs.copyFileSync(s1Path, path.join(artifactDir, 'v60_screen1_entities_resolved.png'));
  console.log('Saved v60_screen1_entities_resolved.png');

  // 2. Global Header: 1930 Golden Hour Popover
  console.log('Testing Global Header: 1930 Golden Hour Popover...');
  const goldenBtn = await page.getByRole('button', { name: /1930 Golden Hour/i }).first();
  if (goldenBtn) {
    await goldenBtn.click();
    await page.waitForTimeout(400);
    const goldenPath = path.join(outDir, 'v60_global_header_golden_hour.png');
    await page.screenshot({ path: goldenPath });
    fs.copyFileSync(goldenPath, path.join(artifactDir, 'v60_global_header_golden_hour.png'));
    console.log('Saved v60_global_header_golden_hour.png');
    // Close popover
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // 3. Navigate to Screen 2: Attribution via title locator
  console.log('Navigating to Screen 2: Attribution...');
  const b2Btn = await page.locator('button[title*="Attribution"]').first();
  if (b2Btn) {
    await b2Btn.click();
    await page.waitForTimeout(600);
    const s2Path = path.join(outDir, 'v60_screen2_attribution_upgraded.png');
    await page.screenshot({ path: s2Path });
    fs.copyFileSync(s2Path, path.join(artifactDir, 'v60_screen2_attribution_upgraded.png'));
    console.log('Saved v60_screen2_attribution_upgraded.png');
  }

  // 4. Navigate to Screen 3: Taint Engine via title locator
  console.log('Navigating to Screen 3: Taint Engine...');
  const b3Btn = await page.locator('button[title*="Taint"]').first();
  if (b3Btn) {
    await b3Btn.click();
    await page.waitForTimeout(600);
    const s3Path = path.join(outDir, 'v60_screen3_taint_typology.png');
    await page.screenshot({ path: s3Path });
    fs.copyFileSync(s3Path, path.join(artifactDir, 'v60_screen3_taint_typology.png'));
    console.log('Saved v60_screen3_taint_typology.png');
  }

  // 5. Navigate to Screen 4: Court Proof via title locator
  console.log('Navigating to Screen 4: Court Proof...');
  const b4Btn = await page.locator('button[title*="Proof"]').first();
  if (b4Btn) {
    await b4Btn.click();
    await page.waitForTimeout(600);

    // Click sentence 2 in STR Summary
    const sent2 = await page.getByText(/2\. Salted blind-index token/i).first();
    if (sent2) {
      await sent2.click();
      await page.waitForTimeout(300);
    }

    const s4Path = path.join(outDir, 'v60_screen4_court_proof_fips.png');
    await page.screenshot({ path: s4Path });
    fs.copyFileSync(s4Path, path.join(artifactDir, 'v60_screen4_court_proof_fips.png'));
    console.log('Saved v60_screen4_court_proof_fips.png');
  }

  // Verify scrollbar metrics on the workstation body
  const metrics = await page.evaluate(() => {
    const scrollContainer = document.getElementById('tarka-workspace-body');
    return {
      scrollContainerClient: scrollContainer ? scrollContainer.clientHeight : null,
      scrollContainerScroll: scrollContainer ? scrollContainer.scrollHeight : null,
      hasScrollbar: scrollContainer ? scrollContainer.scrollHeight > scrollContainer.clientHeight : null,
    };
  });
  console.log('Metrics on Screen 4:', JSON.stringify(metrics, null, 2));

  await browser.close();
  console.log('ALL V6.0 SCREENSHOTS CAPTURED AND COPIED SUCCESSFULLY.');
})();
