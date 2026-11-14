const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const artifactDir = path.resolve('C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1');

  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=settings', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1000);

  const sections = [
    { name: 'profile', text: 'Officer Profile & Role' },
    { name: 'station', text: 'Station & Letterhead' },
    { name: 'appearance', text: 'Display & Language' },
    { name: 'investigation', text: 'Statutory Thresholds & SLA' },
    { name: 'ai', text: 'AI Engine & Scoring' },
    { name: 'data', text: 'Data & Demo Controls' },
    { name: 'notifications', text: 'Urgency Alerts' },
    { name: 'shortcuts', text: 'Keyboard Shortcuts' },
  ];

  let totalBadCount = 0;

  for (const sec of sections) {
    console.log(`\nTesting section: ${sec.name} (${sec.text})`);
    const btn = page.locator(`button:has-text("${sec.text}")`).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(400);
    } else {
      console.warn(`Button for ${sec.text} not visible!`);
    }

    // Typography check
    const badNodes = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      const bad = [];
      for (const el of els) {
        if (el.childElementCount === 0 && (el.textContent || '').trim().length > 0) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          if (fs < 11.9) {
            bad.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 40),
              fs: fs,
              parentClass: el.parentElement?.className || '',
            });
          }
        }
      }
      return bad;
    });

    if (badNodes.length > 0) {
      console.log(`  FAILED: Found ${badNodes.length} nodes with fs < 11.9px:`, badNodes.slice(0, 5));
      totalBadCount += badNodes.length;
    } else {
      console.log(`  PASSED: 0 nodes with fs < 11.9px in section ${sec.name}`);
    }

    // Capture screenshot
    const shotPath = path.join(artifactDir, `settings_section_${sec.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`  Captured: ${shotPath}`);
  }

  // Also capture the reset confirmation modal
  console.log('\nTesting Reset Confirm Modal...');
  const dataBtn = page.locator('button:has-text("Data & Demo Controls")').first();
  await dataBtn.click();
  await page.waitForTimeout(300);

  const resetModalTrigger = page.locator('button:has-text("Reset Demo Data")').first();
  if (await resetModalTrigger.isVisible()) {
    await resetModalTrigger.click();
    await page.waitForTimeout(300);

    const badNodesModal = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      const bad = [];
      for (const el of els) {
        if (el.childElementCount === 0 && (el.textContent || '').trim().length > 0) {
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          if (fs < 11.9) {
            bad.push({
              tag: el.tagName,
              text: (el.textContent || '').trim().slice(0, 40),
              fs: fs,
            });
          }
        }
      }
      return bad;
    });
    console.log(`  Modal bad nodes count: ${badNodesModal.length}`);
    totalBadCount += badNodesModal.length;

    const modalShot = path.join(artifactDir, 'settings_section_reset_modal.png');
    await page.screenshot({ path: modalShot, fullPage: false });
    console.log(`  Captured: ${modalShot}`);

    // Close modal
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  console.log(`\nTOTAL SUB-12PX VIOLATIONS ACROSS ALL SECTIONS & MODALS: ${totalBadCount}`);

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
