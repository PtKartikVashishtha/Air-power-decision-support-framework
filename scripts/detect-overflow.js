const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'bugs', 'overflow-report');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1536x864', width: 1536, height: 864 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 }
];

const ZOOM_LEVELS = [1.0, 1.1, 1.25, 1.5];

const TABS = [
  { index: 0, name: 'TacticalMap' },
  { index: 1, name: 'ResourceBoard' },
  { index: 2, name: 'MissionPlanner' },
  { index: 3, name: 'PlannerStudio' },
  { index: 4, name: 'CoaComparison' },
  { index: 5, name: 'Retasking' },
  { index: 6, name: 'Deconfliction' },
  { index: 7, name: 'Wargame' },
  { index: 8, name: 'AtoExport' },
  { index: 9, name: 'Benchmark' },
  { index: 10, name: 'Predictive' },
  { index: 11, name: 'WhatIf' },
  { index: 12, name: 'Audit' }
];

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const findings = [];

  for (const vp of VIEWPORTS) {
    for (const zoom of [1.0, 1.25]) { // Sample nominal and 125% zoom for quick audit sweep
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: zoom
      });
      const page = await context.newPage();

      try {
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        console.error('Failed to load page:', e.message);
        await context.close();
        continue;
      }

      // Check header overflow first
      const headerIssues = await page.evaluate(() => {
        const issues = [];
        const header = document.querySelector('header');
        if (header) {
          if (header.scrollWidth > header.clientWidth) {
            issues.push({
              location: 'header',
              scrollWidth: header.scrollWidth,
              clientWidth: header.clientWidth,
              diff: header.scrollWidth - header.clientWidth,
              message: 'Header container overflows horizontally'
            });
          }
          // Check nav tabs
          const nav = header.querySelector('nav');
          if (nav && nav.scrollWidth > nav.clientWidth) {
            issues.push({
              location: 'header-nav-tabs',
              scrollWidth: nav.scrollWidth,
              clientWidth: nav.clientWidth,
              diff: nav.scrollWidth - nav.clientWidth,
              message: 'Navigation tabs overflow parent without pagination/indicators'
            });
          }
          // Check header buttons wrapping
          const buttons = header.querySelectorAll('button');
          buttons.forEach((b) => {
            const rect = b.getBoundingClientRect();
            if (b.scrollHeight > 36 || b.clientHeight > 36) {
              issues.push({
                location: `header-button-${b.textContent.trim().slice(0, 20)}`,
                text: b.textContent.trim(),
                scrollHeight: b.scrollHeight,
                message: 'Button wrapped into multiple lines or overflowed height'
              });
            }
          });
        }
        return issues;
      });

      if (headerIssues.length > 0) {
        findings.push({ viewport: vp.name, zoom, tab: 'Header', issues: headerIssues });
      }

      // Loop through key tabs
      for (const tab of TABS) {
        // Click tab
        try {
          const tabBtn = page.locator('nav button').nth(tab.index);
          await tabBtn.click({ timeout: 2000 });
          await page.waitForTimeout(300);

          const tabIssues = await page.evaluate((tabName) => {
            const issues = [];
            const main = document.querySelector('main');
            if (!main) return issues;

            // Check if document horizontal scroll is triggered
            if (document.documentElement.scrollWidth > window.innerWidth) {
              issues.push({
                location: `${tabName}-document`,
                message: `Horizontal window scrollbar triggered (${document.documentElement.scrollWidth} > ${window.innerWidth})`
              });
            }

            // Check all children in main for non-scrollable overflow
            const allElements = main.querySelectorAll('*');
            allElements.forEach((el) => {
              const style = window.getComputedStyle(el);
              const hasScroll = style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll';
              
              if (!hasScroll && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 8) {
                // Ignore small subpixel differences
                issues.push({
                  tag: el.tagName,
                  className: el.className ? el.className.toString().slice(0, 40) : '',
                  textSnippet: (el.textContent || '').trim().slice(0, 30),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  overflow: el.scrollWidth - el.clientWidth
                });
              }
            });

            return issues.slice(0, 10); // Top 10 issues per screen
          }, tab.name);

          if (tabIssues.length > 0) {
            findings.push({ viewport: vp.name, zoom, tab: tab.name, issues: tabIssues });
          }
        } catch (err) {
          // tab click fail
        }
      }

      await context.close();
    }
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, 'overflow_audit_raw.json');
  fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2));
  console.log(`Scan completed. Total issue reports: ${findings.length}. Written to ${reportPath}`);
}

run().catch(console.error);
