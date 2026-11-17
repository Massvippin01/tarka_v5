const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/SUTRAM_PS04_DOCUMENTATION/17_COMPETITION_AND_PILOT_READINESS/screenshots/phase_14_3_1');
const APP_BASE = 'http://127.0.0.1:5173';

const VIEWPORTS = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1366x768', width: 1366, height: 768 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844 },
];

const STAGES = [
  { id: '01_intake', key: '1', title: '01 Evidence Intake & Gate' },
  { id: '02_entities', key: '2', title: '02 Entity Resolution' },
  { id: '03_attribution', key: '3', title: '03 Attribution & CGNAT' },
  { id: '04_network', key: '4', title: '04 Fraud Network Graph' },
  { id: '05_taint_engine', key: '5', title: '05 Taint Engine & Min-Cut' },
  { id: '06_court_proof', key: '6', title: '06 BSA §63 Court Proof' },
  { id: '07_privacy_crypto', key: '7', title: '07 Privacy & ZKP Hub' },
  { id: '08_workstation', key: '8', title: '08 Deep Forensic Loom' },
  { id: '09_workspaces', key: 'w', title: 'Case Workspaces Hub' },
  { id: '10_benchmark', key: 'b', title: 'Benchmark Lab' },
];

async function runResponsiveAudit() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const auditManifest = {
    audit_phase: 'Phase 14.3.1 UX & Responsive Acceptance Audit',
    executed_at: new Date().toISOString(),
    app_base_url: APP_BASE,
    viewports: VIEWPORTS,
    captures: [],
  };

  console.log(`Starting Phase 14.3.1 Responsive Visual Audit against ${APP_BASE}...`);

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    // Abort external fonts to prevent offline hang
    await context.route('**fonts.googleapis.com**', route => route.abort());
    await context.route('**fonts.gstatic.com**', route => route.abort());

    const page = await context.newPage();

    try {
      await page.goto(APP_BASE, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(800);
    } catch (e) {
      console.error(`  ✗ Failed to navigate to ${APP_BASE} on ${vp.name}:`, e.message);
      await context.close();
      continue;
    }

    for (const stage of STAGES) {
      const filename = `${stage.id}_${vp.name}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        await page.keyboard.press(`Alt+${stage.key}`);
        await page.waitForTimeout(350);

        await page.screenshot({ path: filepath, timeout: 5000 });

        const stats = fs.statSync(filepath);
        console.log(`  ✓ ${stage.title} -> ${filename} (${Math.round(stats.size / 1024)} KB)`);

        auditManifest.captures.push({
          stage_id: stage.id,
          stage_title: stage.title,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          filename,
          size_bytes: stats.size,
          status: 'SUCCESS',
        });
      } catch (err) {
        console.error(`  ✗ Error capturing ${stage.id} on ${vp.name}:`, err.message);
        auditManifest.captures.push({
          stage_id: stage.id,
          stage_title: stage.title,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    // Modal capture: Sarvam Voice Modal
    try {
      await page.keyboard.press('Alt+1');
      await page.waitForTimeout(300);

      const voiceBtn = await page.$('button:has-text("Voice"), button:has-text("SARVAM"), button[title*="Voice"]');
      if (voiceBtn) {
        await voiceBtn.click();
        await page.waitForTimeout(500);

        const voiceFilename = `sarvam_voice_modal_${vp.name}.png`;
        const voiceFilepath = path.join(OUTPUT_DIR, voiceFilename);
        await page.screenshot({ path: voiceFilepath, timeout: 5000 });
        const voiceStats = fs.statSync(voiceFilepath);
        console.log(`  ✓ Sarvam Voice Modal -> ${voiceFilename} (${Math.round(voiceStats.size / 1024)} KB)`);

        auditManifest.captures.push({
          stage_id: 'sarvam_voice_modal',
          stage_title: 'Sarvam Voice Assistant Modal (Live Disclosures)',
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          filename: voiceFilename,
          size_bytes: voiceStats.size,
          status: 'SUCCESS',
        });

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      } else {
        console.warn(`  ! Voice button not found for ${vp.name}`);
      }
    } catch (err) {
      console.warn(`  ! Voice modal capture notice for ${vp.name}:`, err.message);
    }

    await context.close();
  }

  await browser.close();

  // Save audit manifest
  const manifestPath = path.join(OUTPUT_DIR, 'audit_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(auditManifest, null, 2), 'utf-8');
  const successCount = auditManifest.captures.filter(c => c.status === 'SUCCESS').length;
  console.log(`\n======================================================`);
  console.log(`Phase 14.3.1 responsive audit complete!`);
  console.log(`Total captured: ${successCount} / ${auditManifest.captures.length} screenshots`);
  console.log(`Manifest written to: ${manifestPath}`);
  console.log(`======================================================\n`);
}

runResponsiveAudit().catch((err) => {
  console.error('Fatal error in responsive audit:', err);
  process.exit(1);
});
