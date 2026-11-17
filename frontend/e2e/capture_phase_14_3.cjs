const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/SUTRAM_PS04_DOCUMENTATION/17_COMPETITION_AND_PILOT_READINESS/screenshots');
const APP_BASE = 'http://127.0.0.1:5173';

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1366x768', width: 1366, height: 768 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
];

const STAGES = [
  { id: 'intake', key: '1', title: '01 Evidence Intake & Gate' },
  { id: 'entities', key: '2', title: '02 Entity Resolution' },
  { id: 'attribution', key: '3', title: '03 Attribution & CGNAT' },
  { id: 'network', key: '4', title: '04 Fraud Network Graph' },
  { id: 'taint-engine', key: '5', title: '05 Taint Engine & Min-Cut' },
  { id: 'court-proof', key: '6', title: '06 BSA §63 Court Proof' },
  { id: 'privacy-crypto', key: '7', title: '07 Privacy & ZKP Hub' },
  { id: 'workstation', key: '8', title: '08 Deep Forensic Loom' },
  { id: 'workspaces', key: 'w', title: 'Case Workspaces Hub' },
  { id: 'benchmark', key: 'b', title: 'Benchmark Lab' },
];

async function runAudit() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const auditLog = {
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS,
    screensCaptured: [],
  };

  console.log(`Starting Phase 14.3 Visual Audit against ${APP_BASE}...`);

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Initial load
    await page.goto(APP_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    for (const stage of STAGES) {
      try {
        // Trigger via Alt + key shortcut
        await page.keyboard.press(`Alt+${stage.key}`);
        await page.waitForTimeout(600);

        const filename = `${stage.id}_${vp.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, timeout: 5000 });
        console.log(`  ✓ ${stage.title} -> ${filename}`);

        auditLog.screensCaptured.push({
          stageId: stage.id,
          viewport: vp.name,
          filename,
        });
      } catch (err) {
        console.error(`  ✗ Error capturing ${stage.id} on ${vp.name}:`, err.message);
      }
    }

    // Modal Interaction State: Sarvam Voice Modal (Desktop & Tablet)
    if (vp.name === 'desktop_1440x900' || vp.name === 'tablet_768x1024') {
      try {
        await page.keyboard.press('Alt+1');
        await page.waitForTimeout(400);
        const voiceBtn = await page.$('button[title*="Voice"], button:has-text("Voice"), button:has-text("SARVAM")');
        if (voiceBtn) {
          await voiceBtn.click();
          await page.waitForTimeout(600);
          const voiceFile = `sarvam_voice_modal_${vp.name}.png`;
          await page.screenshot({ path: path.join(OUTPUT_DIR, voiceFile), timeout: 5000 });
          console.log(`  ✓ Sarvam Voice Modal -> ${voiceFile}`);
          auditLog.screensCaptured.push({
            stageId: 'sarvam-voice-modal',
            viewport: vp.name,
            filename: voiceFile,
          });
          // Close modal with Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } catch (e) {
        console.warn(`  ! Voice modal interaction note: ${e.message}`);
      }
    }

    await context.close();
  }

  await browser.close();

  const manifestPath = path.join(OUTPUT_DIR, 'audit_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(auditLog, null, 2));
  console.log(`\nAudit successfully captured ${auditLog.screensCaptured.length} screenshots. Manifest written to ${manifestPath}`);
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
