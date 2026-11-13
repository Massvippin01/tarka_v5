const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\massv\\.gemini\\antigravity\\brain\\285293fd-af45-419a-9453-484e5e3dc2e1';
  const progressDir = path.resolve(__dirname, '../../docs/progress/f2');
  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to workspace...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const shot1 = path.join(progressDir, 'f2_01_case_workspace_1440.png');
  await page.screenshot({ path: shot1 });
  fs.copyFileSync(shot1, path.join(artifactDir, 'f2_01_case_workspace_1440.png'));
  console.log('Saved shot 1:', shot1);

  // Navigate to intake
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const shot2 = path.join(progressDir, 'f2_02_header_switcher_and_status_1440.png');
  await page.screenshot({ path: shot2 });
  fs.copyFileSync(shot2, path.join(artifactDir, 'f2_02_header_switcher_and_status_1440.png'));
  console.log('Saved shot 2:', shot2);

  // Open Create Case Wizard from workspace
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const newCaseBtn = page.locator('[data-testid="create-case-button"]');
  if (await newCaseBtn.isVisible()) {
    await newCaseBtn.click();
    await page.waitForTimeout(1000);
    const shot3 = path.join(progressDir, 'f2_03_create_case_wizard_1440.png');
    await page.screenshot({ path: shot3 });
    fs.copyFileSync(shot3, path.join(artifactDir, 'f2_03_create_case_wizard_1440.png'));
    console.log('Saved shot 3:', shot3);
  }

  await browser.close();
  console.log('F-2 Screenshots captured successfully.');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
