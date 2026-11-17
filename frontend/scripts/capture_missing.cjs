const { chromium } = require('playwright');
const path = require('path');
const OUT_DIR = path.resolve(__dirname, '../../docs/platform_evolution/screenshots');

async function captureEvidenceIntake() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:5173/?view=workspace&case=CASE-2026-001", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const admitBtn = page.locator("button:has-text('Admit Evidence')").first();
  if (await admitBtn.count() > 0) {
    await admitBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "06_evidence_intake.png") });
    console.log("SUCCESS: Captured 06_evidence_intake.png");
  } else {
    console.log("Admit Evidence button not found");
  }

  await browser.close();
}

captureEvidenceIntake();
