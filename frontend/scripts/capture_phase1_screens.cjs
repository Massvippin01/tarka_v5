const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Screen 01 - Ledger / Intake
  console.log('Capturing Screen 01 (Intake & Ledger)...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen01_ledger_intake.png'), fullPage: false });

  // Screen 02 - Entity Resolution
  console.log('Capturing Screen 02 (Entity Resolution)...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=entities', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen02_entity_resolution.png'), fullPage: false });

  // Screen 08 - Forensic Workstation (Timeline & Flight Recorder)
  console.log('Capturing Screen 08 (Timeline & Workstation)...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=workstation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen08_workstation_timeline.png'), fullPage: false });

  // Click "Verify Audit Chain" button to show Merkle verification dialog
  try {
    const verifyBtn = page.getByRole('button', { name: /Verify Audit Chain/i }).first();
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen08_merkle_verified_modal.png'), fullPage: false });
    }
  } catch (e) {
    console.log('Note on modal verify:', e.message);
  }

  await browser.close();
  console.log('Done capturing all screens!');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
