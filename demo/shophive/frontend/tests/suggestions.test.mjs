import { chromium } from 'playwright';

async function testSuggestions() {
  console.log('🚀 Launching browser for suggestions test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to http://localhost:3000/...');
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Open chat
    const toggle = page.locator('ghost-cursor-widget').locator('.gc-toggle');
    await toggle.waitFor({ state: 'attached', timeout: 5000 });
    console.log('✓ Found ghost-cursor-widget toggle');
    await toggle.click();


    console.log('Opened chat panel. Waiting for suggestions chips to arrive from API...');
    const firstChip = page.locator('ghost-cursor-widget').locator('.gc-suggestion-chip').first();
    await firstChip.waitFor({ state: 'attached', timeout: 15000 });

    // Verify suggestions are populated inside shadow root
    const suggestions = await page.evaluate(() => {
      const host = document.querySelector('ghost-cursor-widget');
      const chips = host.shadowRoot.querySelectorAll('.gc-suggestion-chip');
      return Array.from(chips).map(c => c.textContent.trim());
    });

    console.log('Found suggestions on dashboard:', suggestions);
    if (suggestions.length === 0) {
      throw new Error('No suggestions chips found on dashboard!');
    }

    console.log('✓ Verified suggestions rendered successfully!');
    await page.screenshot({ path: 'demo/shophive/frontend/tests/screenshots/suggestions-chips.png' });
    console.log('   Saved suggestions-chips.png');


    // Test clicking a chip
    console.log(`Clicking suggestion chip: "${suggestions[0]}"`);
    await page.evaluate(() => {
      const host = document.querySelector('ghost-cursor-widget');
      const chip = host.shadowRoot.querySelector('.gc-suggestion-chip');
      chip.click();
    });

    await page.waitForTimeout(1500);

    // Verify user message appeared and suggestions cleared
    const state = await page.evaluate(() => {
      const host = document.querySelector('ghost-cursor-widget');
      const msgs = Array.from(host.shadowRoot.querySelectorAll('.gc-msg.user')).map(m => m.textContent.trim());
      const chipsVisible = host.shadowRoot.querySelector('.gc-suggestions')?.style.display !== 'none';
      return { userMsgs: msgs, chipsVisible };
    });

    console.log('User messages after chip click:', state.userMsgs);
    console.log('Chips visible after click:', state.chipsVisible);

    if (state.userMsgs.length === 0) {
      throw new Error('Clicking chip did not send message!');
    }
    if (state.chipsVisible) {
      throw new Error('Chips should be hidden after sending a message!');
    }

    console.log('✓ Verified chip click sent message and hid suggestion chips');
    console.log('🎉 All suggestion tests PASSED!');
  } finally {
    await browser.close();
  }
}

testSuggestions().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
