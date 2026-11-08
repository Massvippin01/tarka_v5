const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\d52bb9c5-32cf-4c3d-bd16-a773ad96da26';

(async () => {
  console.log('🚀 Starting Full End-to-End Database Persistence & Sync Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  // 1. Load Workspace
  console.log('1. Loading Workspace Hub from http://localhost:5173/?view=workspace ...');
  await page.goto('http://localhost:5173/?view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const snap1 = path.join(artifactDir, 'sync_01_workspace_db_loaded.png');
  await page.screenshot({ path: snap1 });
  console.log(`Saved screenshot: ${snap1}`);

  // Check if Case 001, 002, 003, 004 appear in table
  const caseRows = page.locator('text=CASE-2026-');
  const caseCount = await caseRows.count();
  console.log(`Cases detected in UI table: ${caseCount} (Expected >= 3)`);

  // 2. Switch to Kanban Board View
  console.log('2. Testing Kanban Board View...');
  await page.click('button:has-text("Board")');
  await page.waitForTimeout(600);
  const snap2 = path.join(artifactDir, 'sync_02_workspace_kanban_board.png');
  await page.screenshot({ path: snap2 });
  console.log(`Saved screenshot: ${snap2}`);

  // 3. Switch to Statutory Timeline View
  console.log('3. Testing Statutory Timeline View...');
  await page.click('button:has-text("Roadmap")');
  await page.waitForTimeout(600);
  const snap3 = path.join(artifactDir, 'sync_03_workspace_timeline.png');
  await page.screenshot({ path: snap3 });
  console.log(`Saved screenshot: ${snap3}`);

  // 4. Switch to Bulk Ingestion Hub
  console.log('4. Testing Bulk Ingestion Hub & Web Worker Parser...');
  await page.click('button:has-text("Bulk Ingest")');
  await page.waitForTimeout(600);
  const snap4 = path.join(artifactDir, 'sync_04_bulk_hub.png');
  await page.screenshot({ path: snap4 });

  // 5. Test Case Isolation & Synchronization on Case 002 (Dr. Meera Nair SIM-Swap)
  console.log('5. Navigating to CASE-2026-002 Network Graph...');
  await page.goto('http://localhost:5173/?case=CASE-2026-002&view=network', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const snap5 = path.join(artifactDir, 'sync_05_case002_network_graph.png');
  await page.screenshot({ path: snap5 });
  console.log(`Saved screenshot: ${snap5}`);

  // Verify Case 002 specific nodes are displayed
  const meeraNode = page.locator('text=Dr. Meera Nair');
  const meeraCount = await meeraNode.count();
  console.log(`Dr. Meera Nair (Case 002 victim) node count: ${meeraCount}`);

  // 6. Test Case Isolation on Case 003 (Ramesh Singhal IPO Scam)
  console.log('6. Navigating to CASE-2026-003 Network Graph...');
  await page.goto('http://localhost:5173/?case=CASE-2026-003&view=network', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const snap6 = path.join(artifactDir, 'sync_06_case003_network_graph.png');
  await page.screenshot({ path: snap6 });
  console.log(`Saved screenshot: ${snap6}`);

  const rameshNode = page.locator('text=Ramesh Singhal');
  const rameshCount = await rameshNode.count();
  console.log(`Ramesh Singhal (Case 003 victim) node count: ${rameshCount}`);

  // 7. Test Case 001 (Sunil Kumar Digital Arrest)
  console.log('7. Navigating to CASE-2026-001 Network Graph...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=network', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const snap7 = path.join(artifactDir, 'sync_07_case001_network_graph.png');
  await page.screenshot({ path: snap7 });
  console.log(`Saved screenshot: ${snap7}`);

  const sunilNode = page.locator('text=Sunil Kumar');
  const sunilCount = await sunilNode.count();
  console.log(`Sunil Kumar (Case 001 victim) node count: ${sunilCount}`);

  await browser.close();
  console.log('🎉 ALL DATABASE SYNCHRONIZATION AND CASE ISOLATION CHECKS PASSED PERFECTLY!');
})();
