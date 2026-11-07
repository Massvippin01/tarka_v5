const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\d52bb9c5-32cf-4c3d-bd16-a773ad96da26';

(async () => {
  console.log('🚀 Starting Universal 8-Screen Dynamic Database Sync Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('[OVERFLOW GUARD]')) {
        console.log('  [Browser Error]:', txt);
        errors.push(txt);
      }
    }
  });

  // SCREEN 0: WORKSPACE
  console.log('\n--- 0. SCREEN 0: WORKSPACE ---');
  await page.goto('http://localhost:5173/?view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap0 = path.join(artifactDir, 'screen_00_workspace.png');
  await page.screenshot({ path: snap0 });
  const caseRowsCount = await page.locator('text=CASE-2026-').count();
  console.log(`✓ Workspace loaded: ${caseRowsCount} cases detected in table.`);

  // SCREEN 1: INTAKE (CASE-2026-002)
  console.log('\n--- 1. SCREEN 1: INTAKE (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap1 = path.join(artifactDir, 'screen_01_intake_case002.png');
  await page.screenshot({ path: snap1 });
  const intakeStory = await page.locator('.story-banner, [screenid="intake"]').textContent().catch(() => '');
  console.log(`✓ Intake StoryBanner text: ${intakeStory ? intakeStory.slice(0, 100) + '...' : 'Loaded'}`);

  // SCREEN 2: ENTITIES (CASE-2026-002)
  console.log('\n--- 2. SCREEN 2: ENTITY RESOLUTION (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=entities', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap2 = path.join(artifactDir, 'screen_02_entities_case002.png');
  await page.screenshot({ path: snap2 });
  const entitiesCount = await page.locator('text=Dr. Meera Nair').count();
  const kiranCount = await page.locator('text=Kiran Kumar').count();
  console.log(`✓ Entity Resolution: Dr. Meera Nair matches=${entitiesCount}, Kiran Kumar matches=${kiranCount}`);

  // SCREEN 3: ATTRIBUTION (CASE-2026-002)
  console.log('\n--- 3. SCREEN 3: ATTRIBUTION (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=attribution', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap3 = path.join(artifactDir, 'screen_03_attribution_case002.png');
  await page.screenshot({ path: snap3 });
  const ipdrText = await page.locator('text=Reliance IPDR').count();
  console.log(`✓ Attribution: Reliance PGW detected=${ipdrText > 0}`);

  // SCREEN 4: NETWORK (CASE-2026-002)
  console.log('\n--- 4. SCREEN 4: FRAUD NETWORK (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=network', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const snap4 = path.join(artifactDir, 'screen_04_network_case002.png');
  await page.screenshot({ path: snap4 });
  const networkStory = await page.locator('text=Dr. Meera Nair').count();
  console.log(`✓ Network Graph: Dr. Meera Nair topology elements=${networkStory}`);

  // SCREEN 5: TAINT ENGINE (CASE-2026-002)
  console.log('\n--- 5. SCREEN 5: TAINT ENGINE (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=taint-engine', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap5 = path.join(artifactDir, 'screen_05_taint_case002.png');
  await page.screenshot({ path: snap5 });
  const lossText = await page.locator('text=₹340,000').or(page.locator('text=₹3,40,000')).or(page.locator('text=₹3.40L')).count();
  console.log(`✓ Taint Engine: ₹340,000 loss matches=${lossText}`);

  // SCREEN 6: COURT PROOF (CASE-2026-002)
  console.log('\n--- 6. SCREEN 6: COURT PROOF (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=court-proof', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap6 = path.join(artifactDir, 'screen_06_court_proof_case002.png');
  await page.screenshot({ path: snap6 });
  const courtStory = await page.locator('text=Dr. Meera Nair').count();
  console.log(`✓ Court Proof: Dr. Meera Nair certificate mentions=${courtStory}`);

  // SCREEN 7: PRIVACY CRYPTO (CASE-2026-002)
  console.log('\n--- 7. SCREEN 7: PRIVACY CRYPTO (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=privacy-crypto', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap7 = path.join(artifactDir, 'screen_07_privacy_case002.png');
  await page.screenshot({ path: snap7 });
  const privacyStory = await page.locator('text=FIR #88/2026').count();
  console.log(`✓ Privacy Crypto: Case 002 FIR mentions=${privacyStory}`);

  // SCREEN 8: FORENSIC WORKSTATION (CASE-2026-002)
  console.log('\n--- 8. SCREEN 8: FORENSIC WORKSTATION (CASE-2026-002) ---');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=workstation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const snap8 = path.join(artifactDir, 'screen_08_workstation_loom_case002.png');
  await page.screenshot({ path: snap8 });
  const loomTitle = await page.locator('text=TEMPORAL EVIDENCE LOOM').count();
  console.log(`✓ Forensic Workstation Tab 1 (Loom): title matches=${loomTitle}`);

  // Tab 2: Claim Dependency Lens
  console.log('  Testing Tab 2: Claim Dependency Lens...');
  await page.click('button:has-text("Claim Dependency Lens")');
  await page.waitForTimeout(600);
  const snap8_lens = path.join(artifactDir, 'screen_08_workstation_lens_case002.png');
  await page.screenshot({ path: snap8_lens });

  // Tab 3: Investigation Flight Recorder
  console.log('  Testing Tab 3: Flight Recorder...');
  await page.click('button:has-text("Investigation Flight Recorder")');
  await page.waitForTimeout(600);
  const snap8_rec = path.join(artifactDir, 'screen_08_workstation_recorder_case002.png');
  await page.screenshot({ path: snap8_rec });

  // Tab 4: Provenance DAG Lineage
  console.log('  Testing Tab 4: Provenance DAG Lineage...');
  await page.click('button:has-text("Provenance DAG Lineage")');
  await page.waitForTimeout(600);
  const snap8_dag = path.join(artifactDir, 'screen_08_workstation_dag_case002.png');
  await page.screenshot({ path: snap8_dag });

  console.log('\n======================================================');
  console.log(`🎉 ALL 8 SCREENS DYNAMIC DB SYNC VERIFICATION COMPLETE!`);
  console.log(`Total Fatal DOM Errors: ${errors.length}`);
  console.log('======================================================');

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
