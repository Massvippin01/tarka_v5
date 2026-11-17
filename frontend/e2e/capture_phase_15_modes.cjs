const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/SUTRAM_PS04_DOCUMENTATION/17_COMPETITION_AND_PILOT_READINESS/screenshots/phase_15');
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

async function setMode(page, mode) {
  try {
    await page.evaluate((targetMode) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetBtn = buttons.find(b => {
        const text = b.textContent || '';
        const title = b.getAttribute('title') || '';
        if (targetMode === 'guided') return text.includes('Guided') || title.includes('Guided');
        if (targetMode === 'review') return text.includes('Review') || title.includes('Review');
        if (targetMode === 'analyst') return text.includes('Analyst') || title.includes('Analyst');
        return false;
      });
      if (targetBtn) {
        targetBtn.click();
      }
    }, mode);
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn(`  ! Could not set mode to ${mode}: ${e.message}`);
  }
}

async function runPhase15Capture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const auditManifest = {
    audit_phase: 'Phase 15 Adaptive Intelligence Workbench & UI/UX Transformation',
    executed_at: new Date().toISOString(),
    theme: 'obsidian-glass (Midnight Navy #060B14 / Ocean Blue #0F1B2E / Cyan #06B6D4)',
    modes_validated: ['guided', 'analyst', 'review'],
    app_base_url: APP_BASE,
    viewports: VIEWPORTS,
    captures: [],
  };

  console.log(`Starting Phase 15 Visual Audit against ${APP_BASE}...`);

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
      await page.goto(APP_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);
    } catch (e) {
      console.error(`  ✗ Failed to navigate to ${APP_BASE} on ${vp.name}:`, e.message);
      await context.close();
      continue;
    }

    // Default mode: Analyst
    await setMode(page, 'analyst');
    await page.waitForTimeout(300);

    // 1. Capture all 10 core stages in Analyst mode
    for (const stage of STAGES) {
      const filename = `${stage.id}_${vp.name}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        await page.keyboard.press(`Alt+${stage.key}`);
        await page.waitForTimeout(500);

        await page.screenshot({ path: filepath, timeout: 15000, animations: 'disabled' });

        const stats = fs.statSync(filepath);
        console.log(`  ✓ [analyst] ${stage.title} -> ${filename} (${Math.round(stats.size / 1024)} KB)`);

        auditManifest.captures.push({
          stage_id: stage.id,
          stage_title: stage.title,
          mode: 'analyst',
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
          mode: 'analyst',
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    // 2. Capture Guided Mode HUD
    if (vp.name === 'desktop_1440x900' || vp.name === 'laptop_1366x768' || vp.name === 'mobile_390x844') {
      await setMode(page, 'guided');
      const guidedStages = vp.name === 'desktop_1440x900' 
        ? [STAGES[0], STAGES[3], STAGES[5], STAGES[7]] 
        : [STAGES[0]];

      for (const stage of guidedStages) {
        const filename = `guided_${stage.id}_${vp.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        try {
          await page.keyboard.press(`Alt+${stage.key}`);
          await page.waitForTimeout(500);
          await page.screenshot({ path: filepath, timeout: 15000, animations: 'disabled' });
          const stats = fs.statSync(filepath);
          console.log(`  ✓ [guided] ${stage.title} -> ${filename} (${Math.round(stats.size / 1024)} KB)`);
          auditManifest.captures.push({
            stage_id: `guided_${stage.id}`,
            stage_title: `${stage.title} (Guided Mode HUD)`,
            mode: 'guided',
            viewport: vp.name,
            width: vp.width,
            height: vp.height,
            filename,
            size_bytes: stats.size,
            status: 'SUCCESS',
          });
        } catch (e) {
          console.warn(`  ! Guided capture error: ${e.message}`);
        }
      }
    }

    // 3. Capture Forensic Review Mode HUD
    if (vp.name === 'desktop_1440x900' || vp.name === 'laptop_1366x768') {
      await setMode(page, 'review');
      const reviewStages = vp.name === 'desktop_1440x900'
        ? [STAGES[0], STAGES[5], STAGES[6], STAGES[7]]
        : [STAGES[5]];

      for (const stage of reviewStages) {
        const filename = `review_${stage.id}_${vp.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        try {
          await page.keyboard.press(`Alt+${stage.key}`);
          await page.waitForTimeout(500);
          await page.screenshot({ path: filepath, timeout: 15000, animations: 'disabled' });
          const stats = fs.statSync(filepath);
          console.log(`  ✓ [review] ${stage.title} -> ${filename} (${Math.round(stats.size / 1024)} KB)`);
          auditManifest.captures.push({
            stage_id: `review_${stage.id}`,
            stage_title: `${stage.title} (Forensic Review HUD)`,
            mode: 'review',
            viewport: vp.name,
            width: vp.width,
            height: vp.height,
            filename,
            size_bytes: stats.size,
            status: 'SUCCESS',
          });
        } catch (e) {
          console.warn(`  ! Review capture error: ${e.message}`);
        }
      }
    }

    // Reset back to analyst
    await setMode(page, 'analyst');

    // 4. Modal capture: Sarvam Voice Assistant Modal in Phase 15 Glass
    try {
      await page.keyboard.press('Alt+1');
      await page.waitForTimeout(400);

      const voiceClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const voiceBtn = buttons.find(b => {
          const text = (b.textContent || '').toUpperCase();
          const title = (b.getAttribute('title') || '').toUpperCase();
          return text.includes('VOICE') || text.includes('SARVAM') || title.includes('VOICE');
        });
        if (voiceBtn) {
          voiceBtn.click();
          return true;
        }
        return false;
      });

      if (voiceClicked) {
        await page.waitForTimeout(600);

        const voiceFilename = `sarvam_voice_modal_${vp.name}.png`;
        const voiceFilepath = path.join(OUTPUT_DIR, voiceFilename);
        await page.screenshot({ path: voiceFilepath, timeout: 15000, animations: 'disabled' });
        const voiceStats = fs.statSync(voiceFilepath);
        console.log(`  ✓ Sarvam Voice Modal -> ${voiceFilename} (${Math.round(voiceStats.size / 1024)} KB)`);

        auditManifest.captures.push({
          stage_id: 'sarvam_voice_modal',
          stage_title: 'Sarvam Voice Assistant Modal (Phase 15 Glass)',
          mode: 'modal',
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          filename: voiceFilename,
          size_bytes: voiceStats.size,
          status: 'SUCCESS',
        });

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
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
  const manifestPath = path.join(OUTPUT_DIR, 'phase_15_audit_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(auditManifest, null, 2), 'utf-8');
  const successCount = auditManifest.captures.filter(c => c.status === 'SUCCESS').length;
  console.log(`\n======================================================`);
  console.log(`Phase 15 Adaptive Workbench Visual Audit complete!`);
  console.log(`Total captured: ${successCount} / ${auditManifest.captures.length} screenshots`);
  console.log(`Manifest written to: ${manifestPath}`);
  console.log(`======================================================\n`);
}

runPhase15Capture().catch((err) => {
  console.error('Fatal error in Phase 15 capture:', err);
  process.exit(1);
});
