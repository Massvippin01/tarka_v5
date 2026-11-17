const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\d52bb9c5-32cf-4c3d-bd16-a773ad96da26';

(async () => {
  console.log('🚀 Starting Workspace SaaS & Sync Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  // 1. Navigate to workspace
  console.log('1. Navigating to Workspace view...');
  await page.goto('http://localhost:5173/?view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Take screenshot of default Table View
  const tableImgPath = path.join(artifactDir, 'workspace_table_view.png');
  await page.screenshot({ path: tableImgPath });
  console.log(`Saved Table View screenshot: ${tableImgPath}`);

  // Check KPI strip exists
  const kpiBanner = page.locator('text=GOLDEN HOUR RECOVERY WINDOW');
  const kpiCount = await kpiBanner.count();
  console.log(`KPI Banner detected: ${kpiCount > 0 ? 'PASS' : 'FAIL'}`);

  // 2. Switch to Board View (Kanban)
  console.log('2. Testing Board View (Kanban)...');
  await page.click('button:has-text("Board")');
  await page.waitForTimeout(500);
  const boardImgPath = path.join(artifactDir, 'workspace_board_view.png');
  await page.screenshot({ path: boardImgPath });
  console.log(`Saved Board View screenshot: ${boardImgPath}`);

  // 3. Switch to Timeline View
  console.log('3. Testing Timeline View...');
  await page.click('button:has-text("Roadmap")');
  await page.waitForTimeout(500);
  const timelineImgPath = path.join(artifactDir, 'workspace_timeline_view.png');
  await page.screenshot({ path: timelineImgPath });
  console.log(`Saved Timeline View screenshot: ${timelineImgPath}`);

  // 4. Switch to Bulk Ingestion Hub
  console.log('4. Testing Bulk Ingestion Hub...');
  await page.click('button:has-text("Bulk Ingest")');
  await page.waitForTimeout(500);
  const bulkImgPath = path.join(artifactDir, 'workspace_bulk_hub.png');
  await page.screenshot({ path: bulkImgPath });
  console.log(`Saved Bulk Hub screenshot: ${bulkImgPath}`);

  // 5. Open Bulk Ingestion Modal & Trigger Web Worker
  console.log('5. Testing Bulk Ingestion Web Worker simulation...');
  await page.click('button:has-text("Ingest New Bulk Dataset")');
  await page.waitForTimeout(600);
  const modalImgPath = path.join(artifactDir, 'workspace_bulk_modal.png');
  await page.screenshot({ path: modalImgPath });
  console.log(`Saved Bulk Modal screenshot: ${modalImgPath}`);

  // Click synthetic 10,000 row generator button
  const synthBtn = page.locator('button:has-text("10,000-Row Bank CBS Test Dataset")');
  if (await synthBtn.count() > 0) {
    console.log('Found synthetic dataset button, clicking...');
    await synthBtn.click();
    // Wait for worker progress & completion
    await page.waitForTimeout(2000);
    const workerCompleteImgPath = path.join(artifactDir, 'workspace_worker_complete.png');
    await page.screenshot({ path: workerCompleteImgPath });
    console.log(`Saved Worker Ingestion Complete screenshot: ${workerCompleteImgPath}`);
  }

  // Close modal
  await page.click('button[title="Close modal"], button:has-text("Cancel")');
  await page.waitForTimeout(500);

  // 6. Test Cross-Case Syndicate Comparator Drawer
  console.log('6. Testing Cross-Case Comparator Drawer...');
  await page.click('button:has-text("Table")');
  await page.waitForTimeout(500);

  const comparePills = page.locator('button[title*="Compare with"]');
  if (await comparePills.count() > 0) {
    console.log('Found syndicate compare pill, clicking first...');
    await comparePills.first().click();
    await page.waitForTimeout(600);
    const drawerImgPath = path.join(artifactDir, 'workspace_comparator_drawer.png');
    await page.screenshot({ path: drawerImgPath });
    console.log(`Saved Comparator Drawer screenshot: ${drawerImgPath}`);
  }

  await browser.close();
  console.log('✅ Workspace SaaS & Sync Verification successfully completed!');
})();
