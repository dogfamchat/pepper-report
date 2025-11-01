#!/usr/bin/env bun
/**
 * Interactive Schedule Explorer
 *
 * This script opens the schedule page and helps you identify the correct selectors
 * for extracting dates. It will pause at key points so you can inspect the page.
 *
 * Usage:
 *   bun run scripts/explore-schedule.ts
 */

import { chromium } from 'playwright';

async function exploreSchedule() {
  console.log('🔍 Schedule Selector Explorer\n');
  console.log('This will open the browser and navigate to the schedule page.');
  console.log('The browser will pause so you can inspect elements.\n');

  // Get credentials from environment
  const daycareUrl = process.env.DAYCARE_URL;
  const username = process.env.DAYCARE_USERNAME;
  const password = process.env.DAYCARE_PASSWORD;

  if (!daycareUrl || !username || !password) {
    console.error('❌ Missing environment variables!');
    console.log('   Make sure .env has: DAYCARE_URL, DAYCARE_USERNAME, DAYCARE_PASSWORD');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slow down actions by 1 second for visibility
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`📡 Navigating to ${daycareUrl}...`);
    await page.goto(daycareUrl);

    console.log('🔐 Logging in...');
    await page.fill("input#template-passport-login", username);
    await page.fill("input#template-passport-password", password);

    await Promise.all([
      page.waitForURL("**/*", { waitUntil: "networkidle" }),
      page.click('button[type="submit"]'),
    ]);

    console.log('✓ Logged in successfully\n');

    console.log('📅 Navigating to schedule page...');
    await page.getByRole("link", { name: "My Schedule" }).click();

    const upcomingScheduleLink = page.getByRole("link", { name: "Upcoming Schedule" });
    const pastScheduleLink = page.getByRole("link", { name: "Past Schedule" });

    await upcomingScheduleLink.waitFor();
    await pastScheduleLink.waitFor();

    console.log('\n✓ Schedule page loaded!\n');
    console.log('='.repeat(60));
    console.log('EXPLORATION MODE');
    console.log('='.repeat(60));

    // Click on Upcoming Schedule
    console.log('\n📌 Clicking "Upcoming Schedule"...');
    await upcomingScheduleLink.click();
    await page.waitForTimeout(2000);

    console.log('\n🔍 Analyzing page structure...\n');

    // Try to find common date patterns
    const strategies = [
      { name: 'Tables with date cells', selector: 'table td, table th' },
      { name: 'Divs with "date" in class', selector: '[class*="date"]' },
      { name: 'Divs with "schedule" in class', selector: '[class*="schedule"]' },
      { name: 'Elements with data-date attribute', selector: '[data-date]' },
      { name: 'List items', selector: 'li' },
      { name: 'Spans', selector: 'span' },
    ];

    for (const strategy of strategies) {
      const elements = await page.$$(strategy.selector);
      if (elements.length > 0) {
        console.log(`✓ Found ${elements.length} elements: ${strategy.name}`);
        console.log(`  Selector: ${strategy.selector}`);

        // Sample first few elements
        const sampleCount = Math.min(3, elements.length);
        for (let i = 0; i < sampleCount; i++) {
          const text = await elements[i].textContent();
          const trimmed = text?.trim().slice(0, 50);
          if (trimmed) {
            console.log(`    [${i}]: "${trimmed}${text && text.length > 50 ? '...' : ''}"`);
          }
        }
        console.log();
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('INTERACTIVE INSPECTION');
    console.log('='.repeat(60));
    console.log('\nThe browser will stay open for 5 minutes.');
    console.log('Use this time to:');
    console.log('  1. Right-click on a date → Inspect');
    console.log('  2. Look at the HTML structure in DevTools');
    console.log('  3. Find a unique selector for the date elements');
    console.log('  4. Test selectors in the Console:');
    console.log('     document.querySelectorAll("YOUR_SELECTOR")');
    console.log('\nTips:');
    console.log('  - Look for class names or data attributes');
    console.log('  - Check parent containers');
    console.log('  - Look for patterns that repeat for each date\n');

    // Take a screenshot for reference
    await page.screenshot({ path: 'schedule-exploration.png', fullPage: true });
    console.log('📸 Screenshot saved: schedule-exploration.png\n');

    // Get page HTML for analysis
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('schedule-page.html', html);
    console.log('💾 Full HTML saved: schedule-page.html\n');

    // Try to extract some potential date patterns
    console.log('🔍 Potential date patterns found in page:');
    const datePatterns = [
      /\d{4}-\d{2}-\d{2}/g,           // 2024-11-15
      /\d{1,2}\/\d{1,2}\/\d{4}/g,     // 11/15/2024
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}/gi, // Nov 15, 2024
    ];

    for (const pattern of datePatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        const unique = [...new Set(matches)].slice(0, 5);
        console.log(`  Format: ${pattern.toString()}`);
        console.log(`  Examples: ${unique.join(', ')}`);
      }
    }

    console.log('\n⏰ Keeping browser open for 5 minutes...');
    console.log('   Press Ctrl+C to exit early\n');

    // Keep browser open for inspection
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\nTaking error screenshot...');
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 Screenshot saved: error-screenshot.png\n');
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed. Check the output above for selector suggestions!');
  }
}

// Run the explorer
exploreSchedule();
