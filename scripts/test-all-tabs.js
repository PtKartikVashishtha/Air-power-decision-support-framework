const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
      errors.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    console.error('PAGE ERROR ON ACTIVE TAB:', err.message);
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  console.log('Loading page http://localhost:3002 ...');
  await page.goto('http://localhost:3002', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__SET_ACTIVE_TAB === 'function', { timeout: 15000 });
  console.log('Page mounted and __SET_ACTIVE_TAB is ready.');

  const tabsToTest = [99, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  for (const tabIdx of tabsToTest) {
    console.log(`\nTesting Tab ${tabIdx} ...`);
    try {
      await page.evaluate((idx) => {
        window.__SET_ACTIVE_TAB(idx);
      }, tabIdx);
      await page.waitForTimeout(600);
      const text = await page.evaluate(() => document.body.innerText.slice(0, 150).replace(/\n/g, ' '));
      console.log(`Tab ${tabIdx} rendered: ${text.slice(0, 80)}`);
    } catch (err) {
      console.error(`Failed on tab ${tabIdx}:`, err.message);
    }
  }

  console.log('\n--- TOTAL CAUGHT PAGE ERRORS ---:', errors.filter(e => e.type === 'pageerror').length);
  for (const e of errors) {
    if (e.type === 'pageerror') console.log(e);
  }

  await browser.close();
})().catch(console.error);
