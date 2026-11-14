const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENS = [
  { name: '01_command_center', view: 'workspace' },
  { name: '02_cases', view: 'cases' },
  { name: '03_evidence', view: 'evidence' },
  { name: '04_people', view: 'people' },
  { name: '05_money', view: 'money' },
  { name: '06_network', view: 'network' },
  { name: '07_device', view: 'device' },
  { name: '08_actions', view: 'actions' },
];

const CASES = ['CASE-2026-001', 'CASE-2026-003'];

async function main() {
  const outDir = path.resolve(__dirname, '../../docs/redesign/cases');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();

  for (const c of CASES) {
    for (const s of SCREENS) {
      for (const vp of [{ name: '1440', w: 1440, h: 900 }, { name: '1366', w: 1366, h: 768 }]) {
        const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
        const url = `http://localhost:5173/?case=${c}&view=${s.view}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);

        const outFile = path.join(outDir, `${c}_${s.name}_${vp.name}.png`);
        await page.screenshot({ path: outFile, fullPage: false });
        console.log(`Captured ${c} ${s.name} (${vp.name}) -> ${outFile}`);
        await page.close();
      }
    }
  }

  await browser.close();
  console.log('All case switch comparison screenshots captured!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

