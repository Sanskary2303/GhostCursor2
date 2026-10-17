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

  console.log('1. Navigating to Settings (light mode default)...');
  await page.goto('http://localhost:3000/settings');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings-light.png') });
  console.log('   Saved settings-light.png');

  console.log('2. Toggling dark mode on...');
  await page.click('[data-ghost-id="settings.theme_toggle"]', { force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'settings-dark.png') });
  console.log('   Saved settings-dark.png');

  console.log('3. Navigating to Catalog in dark mode...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'catalog-dark.png') });
  console.log('   Saved catalog-dark.png');

  // Open Ghost Cursor chat widget and take screenshot
  console.log('3b. Opening Ghost Cursor chat widget...');
  await page.locator('ghost-cursor-widget').locator('.gc-toggle').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'widget-open.png') });
  console.log('   Saved widget-open.png');
  // Close it back
  await page.locator('ghost-cursor-widget').locator('.gc-close-btn').click();
  await page.waitForTimeout(300);

  console.log('4. Navigating to Product Detail in dark mode...');
  await page.goto('http://localhost:3000/product/air-max-90');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'product-dark.png') });
  console.log('   Saved product-dark.png');

  console.log('5. Navigating to Cart in dark mode...');
  await page.goto('http://localhost:3000/cart');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'cart-dark.png') });
  console.log('   Saved cart-dark.png');

  console.log('6. Navigating to Checkout in dark mode...');
  await page.goto('http://localhost:3000/checkout');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'checkout-dark.png') });
  console.log('   Saved checkout-dark.png');

  console.log('7. Navigating to Orders in dark mode...');
  await page.goto('http://localhost:3000/orders');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'orders-dark.png') });
  console.log('   Saved orders-dark.png');

  console.log('8. Verifying dark mode persistence after page reload...');
  await page.reload();
  await page.waitForTimeout(1000);

  const isDarkClassPresent = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const storedTheme = await page.evaluate(() => localStorage.getItem('shophive_theme_dark'));

  console.log('   isDarkClassPresent after reload:', isDarkClassPresent);
  console.log('   localStorage.shophive_theme_dark:', storedTheme);

  if (!isDarkClassPresent || storedTheme !== 'true') {
    throw new Error(`Dark mode failed persistence test: isDarkClassPresent=${isDarkClassPresent}, storedTheme=${storedTheme}`);
  }

  console.log('All tests passed successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

