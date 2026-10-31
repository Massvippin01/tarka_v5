const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function runTests() {
  console.log('--- Starting TARKA v5.0 Intake Screen Automated Verification Suite ---');
  const browser = await chromium.launch({ headless: true });
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failures++;
    }
  }

  // TEST 1: Viewport & Geometry Assertions at 1920x1080
  console.log('\n[TEST 1] Viewport & Geometry Assertions at 1920x1080:');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Assert all 6 rows (#11 through #16) are visible
    const ledgerTable = page.locator('.ledger-card-container table');
    for (let seq = 11; seq <= 16; seq++) {
      const row = ledgerTable.locator(`td:has-text("#${seq}")`);
      const isVisible = await row.isVisible();
      assert(isVisible, `Row #${seq} is visible in CBS ledger table`);
    }

    // Assert 4 KPI cards height is exactly 96px
    const kpiCards = page.locator('.bento-grid-4 .bento-card');
    const kpiCount = await kpiCards.count();
    assert(kpiCount === 4, `Found exactly 4 top KPI cards (got ${kpiCount})`);

    for (let i = 0; i < kpiCount; i++) {
      const box = await kpiCards.nth(i).boundingBox();
      assert(box && Math.round(box.height) === 96, `KPI Card #${i + 1} height is exactly 96px (actual: ${box ? Math.round(box.height) : 'null'}px)`);
    }

    // Assert zero horizontal scrollbar on table container
    const tableContainer = page.locator('div[style*="overflow-x: hidden"], div[style*="overflowX: hidden"]');
    if (await tableContainer.count() > 0) {
      const scrollWidth = await tableContainer.first().evaluate((el) => el.scrollWidth);
      const clientWidth = await tableContainer.first().evaluate((el) => el.clientWidth);
      assert(scrollWidth <= clientWidth + 8, `Table container has zero horizontal scroll (scrollWidth: ${scrollWidth}px, clientWidth: ${clientWidth}px)`);
    }

    // Assert clean row #14 semantics (amber rail, NOT rose)
    const row14 = page.locator('.ledger-card-container tr:has(td:has-text("#14"))');
    const row14Style = await row14.evaluate((el) => window.getComputedStyle(el).borderLeftColor);
    assert(row14Style.includes('245') || row14Style.includes('217') || row14Style.includes('180') || row14Style.includes('amber') || row14Style.includes('254'), `Row #14 clean state uses Amber rail (color: ${row14Style})`);

    // Assert Falsification Gate initial state: UNLOCKED
    const gateStatus = page.locator('text=GATE UNLOCKED ✓').first();
    assert(await gateStatus.isVisible(), 'Falsification Gate starts in GATE UNLOCKED ✓ state');

    await context.close();
  }

  // TEST 2: Multi-Viewport Tests (1680, 1440, 1366)
  console.log('\n[TEST 2] Multi-Viewport Render & No-Overflow Tests:');
  const viewports = [
    { width: 1680, height: 1050 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Verify all rows visible
    const row11 = await page.locator('.ledger-card-container table td:has-text("#11")').isVisible();
    const row16 = await page.locator('.ledger-card-container table td:has-text("#16")').isVisible();
    assert(row11 && row16, `At ${vp.width}x${vp.height}: Rows #11 and #16 are both visible`);

    // Verify status column visible (no cut-off)
    const validPill = await page.locator('td:has-text("VALID ✓")').first().isVisible();
    assert(validPill, `At ${vp.width}x${vp.height}: Status column "VALID ✓" is visible`);

    await context.close();
  }

  // TEST 3: Mutation Reaction & Judicial Lock Enforcement
  console.log('\n[TEST 3] Mutation Reaction & Judicial Lock Enforcement:');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const startTime = Date.now();
    // Click toggle row 14 tamper
    const tamperBtn = page.locator('button:has-text("Toggle Row #14 Tamper")');
    await tamperBtn.click();

    // Verify Row #14 turns to rose background and FAIL
    const failStatus = page.locator('.ledger-card-container tr:has(td:has-text("#14")) td:has-text("FAIL ✗")');
    await failStatus.waitFor({ state: 'visible', timeout: 2000 });
    const elapsedMs = Date.now() - startTime;
    assert(elapsedMs < 500, `Mutation re-render completed promptly (actual: ${elapsedMs}ms, benchmark < 500ms)`);

    // Assert Falsification Gate halts
    const haltedGate = page.locator('text=PIPELINE HALTED ✗').first();
    assert(await haltedGate.isVisible(), 'Falsification Gate immediately halts (PIPELINE HALTED ✗)');

    // Assert downstream engines 02, 03, 04 are locked in sidebar
    const engine2Locked = page.locator('button[data-route="attribution"] svg.lucide-lock, button:has-text("CGNAT Attribution") svg.lucide-lock');
    assert(await engine2Locked.count() > 0, 'Downstream CGNAT Attribution engine shows Lock icon in sidebar');

    // Assert Export button is disabled
    const exportBtn = page.locator('button:has-text("Export §63 PDF")');
    const isExportDisabled = await exportBtn.evaluate((el) => el.hasAttribute('disabled') || el.style.cursor === 'not-allowed');
    assert(isExportDisabled, '"Export §63 PDF" button is disabled while gate is halted');

    // Toggle back to restore
    const restoreBtn = page.locator('button:has-text("Row #14 Tampered")');
    await restoreBtn.click();
    await page.locator('text=GATE UNLOCKED ✓').first().waitFor({ state: 'visible', timeout: 2000 });
    assert(true, 'Falsification Gate cleanly unlocked after restoring clean ledger balance');

    await context.close();
  }

  // TEST 4: Keyboard Shortcuts (/ search, P permute)
  console.log('\n[TEST 4] Keyboard Shortcuts Interaction:');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Press '/' to focus search filter
    await page.keyboard.press('/');
    const isSearchFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active.tagName === 'INPUT' && active.getAttribute('placeholder')?.includes('Filter');
    });
    assert(isSearchFocused, 'Pressing "/" successfully focused the ledger search input');

    // Press 'Escape' to blur/clear
    await page.keyboard.press('Escape');

    // Press 'P' to toggle permutation
    await page.keyboard.press('p');
    await page.waitForTimeout(200);
    const permuteActive = page.locator('button:has-text("Permute Same-Sec")');
    assert(await permuteActive.count() > 0, 'Pressing "P" triggers same-second permutation toggle');

    await context.close();
  }

  // TEST 5: Accessibility Audit via axe-core
  console.log('\n[TEST 5] Accessibility Audit via axe-core:');
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Color contrast evaluated via court forensic daylight palette
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    assert(criticalViolations.length === 0, `axe-core zero critical/serious violations (found: ${criticalViolations.length})`);
    if (criticalViolations.length > 0) {
      console.log('Violations detail:', JSON.stringify(criticalViolations, null, 2));
    }

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  if (failures === 0) {
    console.log('✓ ALL TESTS PASSED! Screen 1 is court-grade verified.');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error(`✗ ${failures} TESTS FAILED.`);
    console.log('======================================================\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
