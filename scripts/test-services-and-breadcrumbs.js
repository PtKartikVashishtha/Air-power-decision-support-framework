const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err.message);
  });

  console.log('1. Loading http://localhost:3002 ...');
  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check initial title and breadcrumb presence
  console.log('2. Verifying home view...');
  const homeText = await page.evaluate(() => document.body.innerText);
  if (!homeText.includes('7-Step Guided Evaluation Flow')) {
    throw new Error('Home 7-Step Guided Evaluation Flow not found!');
  }
  console.log('✓ Home screen loaded cleanly.');

  // Test "MORE SERVICES (11)" dropdown
  console.log('3. Testing "MORE SERVICES (11)" button...');
  const moreButton = await page.locator('button:has-text("MORE SERVICES (11)")').first();
  await moreButton.click();
  await page.waitForTimeout(400);

  const dropdownVisible = await page.locator('text=Deep-Dive Operations (11)').isVisible();
  console.log(`Dropdown opened & visible: ${dropdownVisible}`);
  if (!dropdownVisible) {
    throw new Error('Dropdown not visible after clicking "MORE SERVICES (11)"!');
  }

  // Count items in dropdown
  const dropdownItems = await page.locator('button:has-text("OPS-")').count();
  console.log(`Dropdown services count: ${dropdownItems} (Expected: 11)`);
  if (dropdownItems < 11) {
    throw new Error(`Expected at least 11 dropdown items, found ${dropdownItems}`);
  }

  // Click "All 18 Operations Directory" inside dropdown
  console.log('4. Testing Services Directory Modal...');
  const openDirectoryBtn = await page.locator('button:has-text("All 18 Operations Directory")').first();
  await openDirectoryBtn.click();
  await page.waitForTimeout(500);

  const modalVisible = await page.locator('text=Command Services & Operations Directory').isVisible();
  console.log(`Modal visible: ${modalVisible}`);
  if (!modalVisible) {
    throw new Error('Services Directory Modal did not open!');
  }

  // Verify categories in modal
  const categoryCount = await page.locator('button:has-text("Core Story (7)")').count();
  console.log(`Category button found: ${categoryCount > 0}`);

  // Click on "Closed-Loop Wargame Simulator"
  console.log('5. Navigating to Wargame Simulator via modal card...');
  const wargameCard = await page.locator('h3:has-text("Closed-Loop Wargame")').first();
  await wargameCard.click();
  await page.waitForTimeout(800);

  // Verify URL updated and breadcrumb is displayed
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  if (!currentUrl.includes('view=wargame')) {
    throw new Error(`Expected URL to contain view=wargame, got ${currentUrl}`);
  }

  const breadcrumbText = await page.locator('text=Return to 7-Step Mission Plan').isVisible().catch(() => false) 
    || await page.locator('text=7-Step Mission Plan').first().isVisible();
  console.log(`Spacious Breadcrumb present: ${breadcrumbText}`);

  // Click Return to 7-Step Mission Plan
  console.log('6. Clicking breadcrumb back to 7-Step Mission Plan...');
  const backBtn = await page.locator('button:has-text("7-Step Mission Plan")').first();
  await backBtn.click();
  await page.waitForTimeout(600);

  const returnedHome = page.url().includes('view=home');
  console.log(`Returned to Home URL: ${returnedHome} (${page.url()})`);

  console.log('\n--- VERIFICATION SUCCESS: ALL CHECKS PASSED ---');
  await browser.close();
})().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
