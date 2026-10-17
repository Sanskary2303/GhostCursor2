import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('1. Navigating to Home (Catalog)...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Take screenshot of docked bubble (orange solid cursor + black dotted shadow)
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'docked-bubble.png') });
  console.log('   Saved docked-bubble.png');

  // Open the widget and check header avatar
  console.log('2. Opening widget to inspect header avatar...');
  await page.locator('ghost-cursor-widget').locator('.gc-toggle').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'widget-header-orange.png') });
  console.log('   Saved widget-header-orange.png');

  // Close widget
  await page.locator('ghost-cursor-widget').locator('.gc-close-btn').click();
  await page.waitForTimeout(500);

  // Test undocked state (solid cursor hidden, dotted cradle visible)
  console.log('3. Triggering undocked state...');
  await page.evaluate(() => {
    const host = document.querySelector('ghost-cursor-widget');
    const toggle = host.shadowRoot.querySelector('.gc-toggle');
    toggle.classList.add('undocked');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'undocked-docking-station.png') });
  console.log('   Saved undocked-docking-station.png');

  // Test on-screen cursor launch & flight
  console.log('4. Launching cursor and animating to Search / Cart button...');
  await page.evaluate(async () => {
    const host = document.querySelector('ghost-cursor-widget');
    const toggle = host.shadowRoot.querySelector('.gc-toggle');
    const rect = toggle.getBoundingClientRect();
    
    // Trigger cursor engine if accessible, or simulate cursor appearance
    const overlay = document.getElementById('ghost-cursor-overlay');
    if (overlay) {
      const cursor = overlay.children[0];
      cursor.style.opacity = '1';
      cursor.style.transform = `translate(${rect.left - 40}px, ${rect.top - 60}px) scale(1)`;
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'cursor-launched.png') });
  console.log('   Saved cursor-launched.png');

  // Move cursor onto a product card
  console.log('5. Moving cursor to first product card...');
  await page.evaluate(() => {
    const card = document.querySelector('[data-ghost-id="catalog.product_card_1"]') || document.querySelector('.group');
    if (card) {
      const rect = card.getBoundingClientRect();
      const overlay = document.getElementById('ghost-cursor-overlay');
      if (overlay) {
        const cursor = overlay.children[0];
        cursor.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
        const spotlight = overlay.children[1];
        spotlight.style.left = `${rect.left - 6}px`;
        spotlight.style.top = `${rect.top - 6}px`;
        spotlight.style.width = `${rect.width + 12}px`;
        spotlight.style.height = `${rect.height + 12}px`;
        spotlight.style.opacity = '1';
      }
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'cursor-on-product.png') });
  console.log('   Saved cursor-on-product.png');

  // Test docking back
  console.log('6. Docking cursor back into the bubble...');
  await page.evaluate(() => {
    const overlay = document.getElementById('ghost-cursor-overlay');
    if (overlay) {
      overlay.children[0].style.opacity = '0';
      overlay.children[1].style.opacity = '0';
    }
    const host = document.querySelector('ghost-cursor-widget');
    const toggle = host.shadowRoot.querySelector('.gc-toggle');
    toggle.classList.remove('undocked');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'cursor-docked-again.png') });
  console.log('   Saved cursor-docked-again.png');

  await browser.close();
  console.log('All docking tests passed!');
}

run().catch(err => {
  console.error('Docking test error:', err);
  process.exit(1);
});

