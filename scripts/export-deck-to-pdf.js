/**
 * Export 12-Slide HTML Deck to Presentation PDF
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportDeckToPdf() {
  console.log('📄 Exporting 12-Slide Defense Command Deck to PDF...');

  const htmlPath = path.join(__dirname, '..', 'docs', 'AIR_POWER_12_SLIDE_DECK.html');
  const pdfPath = path.join(__dirname, '..', 'docs', 'AIR_POWER_12_SLIDE_DECK.pdf');

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`File not found: ${htmlPath}`);
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
  });

  console.log(`✓ Deck exported to PDF: docs/AIR_POWER_12_SLIDE_DECK.pdf (${Math.round(fs.statSync(pdfPath).size / 1024)} KB)`);
  await browser.close();
}

exportDeckToPdf().catch(console.error);
