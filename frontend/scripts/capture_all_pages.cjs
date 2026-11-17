const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', '..', 'docs', 'audit_ui');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const views = [
  'workspace',
  'cases',
  'evidence',
  'people',
  'money',
  'network',
  'device',
  'actions',
  'lab',
  'court',
  'settings',
  'health'
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const v of views) {
    const url = `http://localhost:5173/?case=CASE-2026-001&view=${v}`;
    console.log(`Capturing ${v} from ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const dest = path.join(outDir, `${v}.png`);
    await page.screenshot({ path: dest, fullPage: false });
  }

  await browser.close();
  console.log('Finished capturing all views to docs/audit_ui/');
})();
