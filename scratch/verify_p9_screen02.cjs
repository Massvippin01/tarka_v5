const { chromium } = require('F:/Main_Code/new_tarka/frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:/Users/massv/.gemini/antigravity/brain/285293fd-af45-419a-9453-484e5e3dc2e1';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function verifyScreen02() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const url = 'http://localhost:5173/?case=CASE-2026-001&view=entities';
  console.log(`Navigating to ${url} at 1440x900...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: Base Screen 02 at 1440x900
  const path1440 = path.join(outDir, 'p9_screen02_entities_1440.png');
  await page.screenshot({ path: path1440, fullPage: false });
  console.log(`Saved screenshot 1: ${path1440}`);

  // Test 1: Click "+ Mention" button
  console.log('Clicking "+ Mention" button...');
  const addMentionBtn = await page.waitForSelector('button:has-text("+ Mention")', { timeout: 5000 });
  await addMentionBtn.click();
  await page.waitForTimeout(500);

  // Fill in the mention form
  console.log('Filling in Name: "VIKRAM SHA", Phone: "98711-23941"...');
  const nameInput = await page.waitForSelector('input[placeholder*="VIKRAM SHA"]', { timeout: 5000 });
  await nameInput.fill('VIKRAM SHA');

  const phoneInput = await page.waitForSelector('input[placeholder*="98711-23941"]', { timeout: 5000 });
  await phoneInput.fill('98711-23941');

  // Submit
  console.log('Clicking "Resolve & Attach"...');
  const submitBtn = await page.waitForSelector('button:has-text("Resolve & Attach")', { timeout: 5000 });
  await submitBtn.click();
  await page.waitForTimeout(800);

  // Screenshot 2: After mention resolved & attached
  const pathAttached = path.join(outDir, 'p9_screen02_mention_attached_1440.png');
  await page.screenshot({ path: pathAttached, fullPage: false });
  console.log(`Saved screenshot 2 (Mention Attached): ${pathAttached}`);

  // Test 2: Click "Accept" on candidate link
  console.log('Clicking "Accept" on candidate merge link...');
  const acceptBtn = await page.waitForSelector('button:has-text("Accept")', { timeout: 5000 });
  await acceptBtn.click();
  await page.waitForTimeout(800);

  // Test 3: Click "Why?" button on profile to inspect feature contributions
  console.log('Clicking "Why?" button for attribution breakdown...');
  const whyBtn = await page.waitForSelector('button:has-text("Why?")', { timeout: 5000 });
  await whyBtn.click();
  await page.waitForTimeout(600);

  // Screenshot 3: Why Modal with waterfall contributions
  const pathModal = path.join(outDir, 'p9_screen02_why_modal_1440.png');
  await page.screenshot({ path: pathModal, fullPage: false });
  console.log(`Saved screenshot 3 (Why Modal): ${pathModal}`);

  // Close the modal
  const closeBtn = await page.waitForSelector('button:has-text("Dismiss")', { timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(500);

  // Test 4: Viewport 1366x768
  console.log('Switching to 1366x768...');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(600);

  const path1366 = path.join(outDir, 'p9_screen02_entities_1366.png');
  await page.screenshot({ path: path1366, fullPage: false });
  console.log(`Saved screenshot 4 (1366x768): ${path1366}`);

  await browser.close();
  console.log('All Prompt 9 browser verifications completed successfully!');
}

verifyScreen02().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
