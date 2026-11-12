const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '../../docs/SUTRAM_PS04_DOCUMENTATION/17_COMPETITION_AND_PILOT_READINESS/screenshots/phase_15_2');
const APP_BASE = 'http://127.0.0.1:4173';

const VIEWPORTS = [
  { name: 'mobile_390x844', width: 390, height: 844, isMobile: true },
  { name: 'mobile_360x800', width: 360, height: 800, isMobile: true },
  { name: 'tablet_768x1024', width: 768, height: 1024, isMobile: false },
  { name: 'laptop_1366x768', width: 1366, height: 768, isMobile: false },
  { name: 'desktop_1440x900', width: 1440, height: 900, isMobile: false },
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

async function dispatchAltKey(page, key) {
  await page.evaluate((k) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(k), altKey: true, bubbles: true }));
  }, key);
  await page.waitForTimeout(600);
}

async function setMode(page, targetMode) {
  try {
    await page.evaluate((mode) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const targetBtn = buttons.find(b => {
        const text = b.textContent || '';
        const title = b.getAttribute('title') || '';
        if (mode === 'guided') return text.includes('Guided') || title.includes('Guided');
        if (mode === 'review') return text.includes('Review') || title.includes('Review');
        if (mode === 'analyst') return text.includes('Analyst') || title.includes('Analyst');
        return false;
      });
      if (targetBtn) {
        targetBtn.click();
      }
    }, targetMode);
    await page.waitForTimeout(400);
  } catch (e) {
    console.warn(`  ! Could not set mode to ${targetMode}: ${e.message}`);
  }
}

async function runPhase152Audit() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const auditManifest = {
    audit_phase: 'Phase 15.2 Performance, Accessibility & Mobile Excellence',
    executed_at: new Date().toISOString(),
    theme: 'obsidian-glass (Midnight Navy #060B14 / Ocean Blue #0F1B2E / Cyan #06B6D4)',
    modes_validated: ['guided', 'analyst', 'review'],
    app_base_url: APP_BASE,
    viewports: VIEWPORTS,
    captures: [],
    overflow_audits: {},
  };

  console.log(`\n======================================================`);
  console.log(`Starting Phase 15.2 Comprehensive Multi-Viewport Visual Audit`);
  console.log(`Target: ${APP_BASE}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`======================================================\n`);

  for (const vp of VIEWPORTS) {
    console.log(`\n>>> Testing Viewport: ${vp.name} (${vp.width}x${vp.height}, mobile=${vp.isMobile}) <<<`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    // Abort external Google Fonts to prevent offline hang
    await context.route('**fonts.googleapis.com**', route => route.abort());
    await context.route('**fonts.gstatic.com**', route => route.abort());

    const page = await context.newPage();

    try {
      await page.goto(APP_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      console.error(`  ✗ Failed to navigate to ${APP_BASE} on ${vp.name}:`, e.message);
      await context.close();
      continue;
    }

    // Measure horizontal scroll containment
    const overflowReport = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const bodyScrollW = document.body.scrollWidth;
      return {
        clientWidth: docW,
        scrollWidth: scrollW,
        bodyScrollWidth: bodyScrollW,
        isContained: scrollW <= docW + 2 && bodyScrollW <= docW + 2,
      };
    });
    auditManifest.overflow_audits[vp.name] = overflowReport;
    console.log(`  [Scroll Containment] ${vp.name}: client=${overflowReport.clientWidth}px, scroll=${overflowReport.scrollWidth}px -> Contained: ${overflowReport.isContained ? 'YES (No Horizontal Spill)' : 'NO'}`);

    // Set Analyst Mode
    await setMode(page, 'analyst');

    // 1. Capture core stages in Analyst mode
    for (const stage of STAGES) {
      const filename = `${stage.id}_${vp.name}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        await dispatchAltKey(page, stage.key);
        await page.waitForTimeout(400);

        await page.screenshot({ path: filepath, timeout: 10000 });
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
    try {
      await setMode(page, 'guided');
      await dispatchAltKey(page, '1'); // Intake in guided mode
      const guidedFilename = `guided_01_intake_${vp.name}.png`;
      const guidedFilepath = path.join(OUTPUT_DIR, guidedFilename);
      await page.screenshot({ path: guidedFilepath, timeout: 10000 });
      const guidedStats = fs.statSync(guidedFilepath);
      console.log(`  ✓ [guided] 01 Intake (Guided HUD) -> ${guidedFilename} (${Math.round(guidedStats.size / 1024)} KB)`);
      auditManifest.captures.push({
        stage_id: 'guided_01_intake',
        stage_title: '01 Evidence Intake & Gate (Guided Mode HUD)',
        mode: 'guided',
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        filename: guidedFilename,
        size_bytes: guidedStats.size,
        status: 'SUCCESS',
      });
    } catch (e) {
      console.warn(`  ! Guided capture warning for ${vp.name}:`, e.message);
    }

    // 3. Capture Review Mode HUD
    try {
      await setMode(page, 'review');
      await dispatchAltKey(page, '6'); // Court proof in review mode
      const reviewFilename = `review_06_court_proof_${vp.name}.png`;
      const reviewFilepath = path.join(OUTPUT_DIR, reviewFilename);
      await page.screenshot({ path: reviewFilepath, timeout: 10000 });
      const reviewStats = fs.statSync(reviewFilepath);
      console.log(`  ✓ [review] 06 Court Proof (Review HUD) -> ${reviewFilename} (${Math.round(reviewStats.size / 1024)} KB)`);
      auditManifest.captures.push({
        stage_id: 'review_06_court_proof',
        stage_title: '06 BSA §63 Court Proof (Forensic Review HUD)',
        mode: 'review',
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        filename: reviewFilename,
        size_bytes: reviewStats.size,
        status: 'SUCCESS',
      });
    } catch (e) {
      console.warn(`  ! Review capture warning for ${vp.name}:`, e.message);
    }

    // 4. Capture Mobile Navigation Drawer if mobile
    if (vp.isMobile) {
      try {
        await page.evaluate(() => {
          const drawerBtn = Array.from(document.querySelectorAll('button')).find(b =>
            b.getAttribute('title')?.includes('Toggle Forensic Navigation Drawer') ||
            b.getAttribute('title')?.includes('Navigation')
          );
          if (drawerBtn) drawerBtn.click();
        });
        await page.waitForTimeout(500);

        const drawerFilename = `mobile_drawer_${vp.name}.png`;
        const drawerFilepath = path.join(OUTPUT_DIR, drawerFilename);
        await page.screenshot({ path: drawerFilepath, timeout: 10000 });
        const drawerStats = fs.statSync(drawerFilepath);
        console.log(`  ✓ [mobile-drawer] Navigation Drawer -> ${drawerFilename} (${Math.round(drawerStats.size / 1024)} KB)`);
        auditManifest.captures.push({
          stage_id: 'mobile_drawer',
          stage_title: 'Mobile Navigation Drawer (Collapsible Overlay)',
          mode: 'mobile',
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          filename: drawerFilename,
          size_bytes: drawerStats.size,
          status: 'SUCCESS',
        });

        // Close drawer
        await page.evaluate(() => {
          const backdrop = document.querySelector('div[style*="position: fixed"][style*="inset: 0"]');
          if (backdrop) backdrop.click();
        });
        await page.waitForTimeout(300);
      } catch (e) {
        console.warn(`  ! Drawer capture warning for ${vp.name}:`, e.message);
      }
    }

    // 5. Capture Sarvam Voice Modal
    try {
      const voiceClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b =>
          b.getAttribute('title')?.includes('Voice AI') ||
          (b.textContent && b.textContent.includes('Voice'))
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (voiceClicked) {
        await page.waitForTimeout(700);
        const voiceFilename = `sarvam_voice_modal_${vp.name}.png`;
        const voiceFilepath = path.join(OUTPUT_DIR, voiceFilename);
        await page.screenshot({ path: voiceFilepath, timeout: 10000 });
        const voiceStats = fs.statSync(voiceFilepath);
        console.log(`  ✓ [voice] Sarvam Voice Modal -> ${voiceFilename} (${Math.round(voiceStats.size / 1024)} KB)`);

        auditManifest.captures.push({
          stage_id: 'sarvam_voice_modal',
          stage_title: 'Sarvam Voice Assistant Modal (Phase 15.2 Glass)',
          mode: 'modal',
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          filename: voiceFilename,
          size_bytes: voiceStats.size,
          status: 'SUCCESS',
        });

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.warn(`  ! Voice modal capture notice for ${vp.name}:`, e.message);
    }

    await context.close();
  }

  await browser.close();

  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, 'phase_15_2_audit_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(auditManifest, null, 2), 'utf-8');
  const successCount = auditManifest.captures.filter(c => c.status === 'SUCCESS').length;
  console.log(`\n======================================================`);
  console.log(`Phase 15.2 Multi-Viewport Audit Complete!`);
  console.log(`Total Captures: ${successCount} / ${auditManifest.captures.length} SUCCESS`);
  console.log(`Manifest written to: ${manifestPath}`);
  console.log(`======================================================\n`);
}

runPhase152Audit().catch(err => {
  console.error('Fatal error in Phase 15.2 audit:', err);
  process.exit(1);
});
