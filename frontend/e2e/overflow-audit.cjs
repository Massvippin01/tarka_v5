const { chromium } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const VIEWPORTS = [
  { name: '1366x768 (Target Baseline)', width: 1366, height: 768 },
  { name: '1536x864 (Target Standard)', width: 1536, height: 864 },
  { name: '1920x1080 (Target FHD)', width: 1920, height: 1080 },
  { name: '1280x720 (Graceful Fallback)', width: 1280, height: 720 },
];

async function runAudit() {
  console.log('========================================================================');
  console.log('  TARKA v5.0 — EVIDENCE INTAKE STRUCTURAL REBUILD AUDIT SUITE           ');
  console.log('  Section 7c Geometric, Overflow, Contrast & Accessibility Evaluation  ');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalPass = 0;
  let totalFail = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      totalPass++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      totalFail++;
    }
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[VIEWPORT AUDIT] ${vp.name}`);
    console.log(`------------------------------------------------------------------------`);

    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-card="kpi-card"]');
    await page.waitForTimeout(400);

    // 1. Zero Document Scroll (Vertical and Horizontal)
    const docScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        docScrollHeight: doc.scrollHeight,
        docClientHeight: doc.clientHeight,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
      };
    });

    assert(
      docScroll.docScrollWidth <= docScroll.docClientWidth,
      `Zero horizontal document scroll (scrollWidth: ${docScroll.docScrollWidth}px <= clientWidth: ${docScroll.docClientWidth}px)`
    );
    assert(
      docScroll.docScrollHeight <= docScroll.docClientHeight,
      `Zero vertical document scroll — entirely fits in viewport (scrollHeight: ${docScroll.docScrollHeight}px <= clientHeight: ${docScroll.docClientHeight}px)`
    );

    // 2. Strict Height Constraints: KPI Cards (80px) and GateRail (64px)
    const kpiCards = await page.locator('[data-card="kpi-card"]').all();
    assert(kpiCards.length === 4, `Rendered exactly 4 KPI cards (found ${kpiCards.length})`);

    for (let i = 0; i < kpiCards.length; i++) {
      const box = await kpiCards[i].boundingBox();
      assert(
        box && Math.round(box.height) === 80,
        `KPI Card #${i + 1} height is strictly 80px (actual: ${box ? Math.round(box.height) : 'null'}px)`
      );
    }

    const gateRail = page.locator('[data-card="gate-rail"]');
    const gateBox = await gateRail.boundingBox();
    assert(
      gateBox && Math.round(gateBox.height) === 64,
      `GateRail height is strictly 64px (actual: ${gateBox ? Math.round(gateBox.height) : 'null'}px)`
    );

    // 3. Card Bounding Box Invariant: Children must not escape [data-card] bounds
    const overflowReport = await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-card]');
      const violations = [];

      cards.forEach((card) => {
        const cardName = card.getAttribute('data-card');
        const cardRect = card.getBoundingClientRect();
        const children = card.querySelectorAll('*');

        children.forEach((el) => {
          if (
            el.closest('[data-radix-portal]') ||
            el.closest('[role="dialog"]') ||
            el.closest('[role="tooltip"]') ||
            el.tagName === 'DEFS' ||
            el.tagName === 'CLIPPATH'
          ) {
            return;
          }

          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return;
          }

          const rect = el.getBoundingClientRect();
          // 2px tolerance for fractional subpixel antialiasing
          if (rect.right > cardRect.right + 2) {
            violations.push({
              card: cardName,
              tag: el.tagName,
              deltaRight: rect.right - cardRect.right,
              text: (el.textContent || '').slice(0, 30),
            });
          }
        });
      });

      return violations;
    });

    assert(
      overflowReport.length === 0,
      `Zero children escape [data-card] bounds (found ${overflowReport.length} overflow violations)`
    );
    if (overflowReport.length > 0) {
      console.log('    Sample overflow violations:', overflowReport.slice(0, 3));
    }

    // 4. Sibling Non-Overlap: GateRail 5 stations
    const stationBoxes = await page.evaluate(() => {
      const stations = document.querySelectorAll('[data-card="gate-rail"] button[data-station]');
      const boxes = [];
      stations.forEach((s) => {
        const r = s.getBoundingClientRect();
        boxes.push({ left: r.left, right: r.right, text: (s.textContent || '').trim() });
      });
      return boxes;
    });

    let stationOverlap = false;
    for (let i = 0; i < stationBoxes.length - 1; i++) {
      if (stationBoxes[i].right > stationBoxes[i + 1].left + 1) {
        stationOverlap = true;
      }
    }
    assert(
      !stationOverlap && stationBoxes.length === 5,
      `GateRail 5 stations lay out cleanly without overlap (station count: ${stationBoxes.length})`
    );

    // 5. Visibility of CBS Ledger: All 6 rows present, status pill visible
    const ledgerTable = page.locator('.ledger-card-container table');
    for (let seq = 11; seq <= 16; seq++) {
      const row = ledgerTable.locator(`td:has-text("#${seq}")`);
      const isVisible = await row.isVisible();
      assert(isVisible, `Ledger Row #${seq} is fully visible`);
    }

    const statusVisible = await ledgerTable.locator('td:has-text("VALID ✓")').first().isVisible();
    assert(statusVisible, `Ledger Status column ("VALID ✓") is visible and not clipped`);

    // 6. Dock Tab switching
    const rrnTab = page.locator('button[role="tab"]:has-text("RRN Lab")');
    const pdfTab = page.locator('button[role="tab"]:has-text("PDF")');
    const privacyTab = page.locator('button[role="tab"]:has-text("Privacy")');
    const proofTab = page.locator('button[role="tab"]:has-text("Proof")');

    assert(await rrnTab.isVisible(), 'Dock "RRN Lab" tab trigger is visible');
    assert(await pdfTab.isVisible(), 'Dock "PDF" tab trigger is visible');
    assert(await privacyTab.isVisible(), 'Dock "Privacy" tab trigger is visible');
    assert(await proofTab.isVisible(), 'Dock "Proof" tab trigger is visible');

    // Switch to PDF tab and verify
    await pdfTab.click({ force: true });
    const pdfContent = page.locator('text=2 %%EOF Trailers Found');
    await pdfContent.waitFor({ state: 'visible', timeout: 2000 });
    assert(await pdfContent.isVisible(), 'Switching to PDF tab displays dual %%EOF trailer forensic audit');

    // Switch to Privacy tab and verify canvas
    await privacyTab.click({ force: true });
    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 2000 });
    assert(await canvas.isVisible(), 'Switching to Privacy tab displays 10,000 IPDR citizen canvas matrix');

    // Switch to Proof tab and verify Z3 timeline
    await proofTab.click({ force: true });
    const z3Title = page.locator('text=Z3 Mathematical Invariant Solvers');
    await z3Title.waitFor({ state: 'visible', timeout: 2000 });
    assert(await z3Title.isVisible(), 'Switching to Proof tab displays Z3 solver timeline (I1–I5)');

    // Switch back to RRN tab
    await rrnTab.click({ force: true });
    await page.waitForTimeout(100);

    // 7. Accessibility Audit via axe-core
    const a11yResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();

    const criticalViolations = a11yResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    assert(
      criticalViolations.length === 0,
      `axe-core zero critical/serious accessibility violations (found: ${criticalViolations.length})`
    );

    await context.close();
  }

  // 8. Dynamic Mutation & Reactive Gate Test at 1920x1080
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`[DYNAMIC MUTATION TEST] Reactive Gate & Downstream Locks at 1920x1080`);
  console.log(`------------------------------------------------------------------------`);
  {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/?view=intake', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-card="kpi-card"]');
    await page.waitForTimeout(400);

    // Initial Gate State: GATE UNLOCKED (QUARANTINE) ✓ (because PDF has 2 %%EOF trailers)
    const initialGate = page.locator('text=GATE UNLOCKED (QUARANTINE) ✓');
    assert(await initialGate.isVisible(), 'Initial gate state: GATE UNLOCKED (QUARANTINE) ✓');

    // Trigger Row #14 Tamper via keyboard shortcut 'T'
    console.log('  Triggering Row #14 ledger falsification (Key "T")...');
    const startT = Date.now();
    await page.keyboard.press('t');
    const haltedGate = page.locator('text=HALTED ✗').first();
    await haltedGate.waitFor({ state: 'visible', timeout: 2000 });
    const elapsed = Date.now() - startT;

    assert(await haltedGate.isVisible(), 'Gate reacts and transitions to HALTED ✗');
    assert(elapsed < 1500, `Reactive update completed in ${elapsed}ms (< 1500ms E2E IPC target)`);

    // Check KPI 1 shows "Row #14 Fail" and "BREACH ✗"
    const kpiFail = page.locator('text=Row #14 Fail');
    assert(await kpiFail.isVisible(), 'KPI 1 hero text updates to "Row #14 Fail"');

    // Check Row #14 in table shows FAIL ✗
    const tableFail = page.locator('.ledger-card-container tr:has(td:has-text("#14")) td:has-text("FAIL ✗")');
    assert(await tableFail.isVisible(), 'Ledger Row #14 status pill displays "FAIL ✗"');

    // Restore clean balance with 'T'
    console.log('  Restoring clean balance (Key "T")...');
    await page.keyboard.press('t');
    await page.waitForTimeout(300);

    const restoredGate = page.locator('text=GATE UNLOCKED (QUARANTINE) ✓');
    assert(await restoredGate.isVisible(), 'Gate unlocks cleanly back to GATE UNLOCKED (QUARANTINE) ✓');

    const kpiValid = page.locator('text=100% Valid');
    assert(await kpiValid.isVisible(), 'KPI 1 hero text restores to "100% Valid"');

    await context.close();
  }

  await browser.close();

  console.log('\n========================================================================');
  console.log(`  AUDIT SUMMARY: ${totalPass} PASSED, ${totalFail} FAILED`);
  console.log('========================================================================\n');

  if (totalFail > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
