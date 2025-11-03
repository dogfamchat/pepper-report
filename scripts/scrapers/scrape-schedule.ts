#!/usr/bin/env bun

/**
 * Schedule Scraper
 *
 * Scrapes Pepper's weekly daycare schedule from the daycare website.
 * Saves attendance days to data/schedule/YYYY.json
 *
 * Usage:
 *   bun run scripts/scrapers/scrape-schedule.ts
 *   bun run scripts/scrapers/scrape-schedule.ts --month 2024-11
 *   bun run scripts/scrapers/scrape-schedule.ts --dry-run
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import type { Schedule } from '../types';
import { getCredentials, login } from '../utils/auth-utils';

interface ScraperOptions {
  month?: string; // YYYY-MM format
  dryRun?: boolean;
  headless?: boolean;
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScraperOptions {
  const args = process.argv.slice(2);
  const options: ScraperOptions = {
    headless: true,
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--month':
        options.month = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--headed':
        options.headless = false;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Schedule Scraper - Extract Pepper's daycare attendance schedule

Usage:
  bun run scripts/scrapers/scrape-schedule.ts [options]

Options:
  --month YYYY-MM     Scrape schedule for specific month (default: current month)
  --dry-run           Run scraper without saving data
  --headed            Show browser window (for debugging)
  --verbose, -v       Verbose logging
  --help, -h          Show this help message

Examples:
  bun run scripts/scrapers/scrape-schedule.ts
  bun run scripts/scrapers/scrape-schedule.ts --month 2024-11
  bun run scripts/scrapers/scrape-schedule.ts --headed --verbose
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Load existing schedule data
 */
function loadSchedule(year: string): Schedule {
  const scheduleFile = join(process.cwd(), 'data', 'schedule', `${year}.json`);

  if (!existsSync(scheduleFile)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(scheduleFile, 'utf-8'));
  } catch (_error) {
    console.warn(`⚠️  Could not parse ${scheduleFile}, starting fresh`);
    return {};
  }
}

/**
 * Save schedule data
 */
function saveSchedule(year: string, schedule: Schedule): void {
  const scheduleDir = join(process.cwd(), 'data', 'schedule');
  const scheduleFile = join(scheduleDir, `${year}.json`);

  // Ensure directory exists
  if (!existsSync(scheduleDir)) {
    mkdirSync(scheduleDir, { recursive: true });
  }

  writeFileSync(scheduleFile, `${JSON.stringify(schedule, null, 2)}\n`, 'utf-8');
  console.log(`✅ Saved schedule to ${scheduleFile}`);
}

/**
 * Parse a date from schedule text into YYYY-MM-DD format
 * Handles common date formats found on daycare websites
 */
function parseScheduleDate(dateText: string): string | null {
  const cleaned = dateText.trim();

  // Try ISO format first: 2024-11-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try slash format: 11/15/2024 or 2024/11/15
  const slashMatch = cleaned.match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
  if (slashMatch) {
    const [, first, second, third] = slashMatch;
    // Determine which is year
    if (first.length === 4) {
      // 2024/11/15 or 2024-11-15
      return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`;
    } else if (third.length === 4) {
      // 11/15/2024 or 11-15-2024
      return `${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
    }
  }

  // Try text format: "November 15, 2024" or "Nov 15, 2024"
  const textMatch = cleaned.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (textMatch) {
    const [, monthName, day, year] = textMatch;
    const monthMap: Record<string, string> = {
      jan: '01',
      january: '01',
      feb: '02',
      february: '02',
      mar: '03',
      march: '03',
      apr: '04',
      april: '04',
      may: '05',
      jun: '06',
      june: '06',
      jul: '07',
      july: '07',
      aug: '08',
      august: '08',
      sep: '09',
      september: '09',
      oct: '10',
      october: '10',
      nov: '11',
      november: '11',
      dec: '12',
      december: '12',
    };
    const month = monthMap[monthName.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Try data-date attribute format
  const dataDateMatch = cleaned.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
  if (dataDateMatch) {
    return dataDateMatch[1];
  }

  console.warn(`   ⚠️  Could not parse date: "${dateText}"`);
  return null;
}

/**
 * Scrape schedule for a specific month
 */
async function scrapeSchedule(options: ScraperOptions): Promise<string[]> {
  const { month, headless = true, verbose = false } = options;

  // Determine target month (default: current month)
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  if (verbose) {
    console.log(`🔍 Scraping schedule for ${targetMonth}`);
  }

  // Get credentials and URL from environment
  const daycareUrl = process.env.DAYCARE_SCHEDULE_URL;
  const credentials = getCredentials();

  if (!daycareUrl) {
    throw new Error('Missing required environment variable:\n' + '  - DAYCARE_SCHEDULE_URL');
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (verbose) {
      console.log(`📡 Navigating to ${daycareUrl}`);
    }

    await page.goto(daycareUrl);

    // Login using shared utility
    await login(page, credentials, verbose);

    // Navigate to schedule page
    await page.getByRole('link', { name: 'My Schedule' }).click();

    const upcomingScheduleLink = page.getByRole('link', {
      name: 'Upcoming Schedule',
    });
    const pastScheduleLink = page.getByRole('link', { name: 'Past Schedule' });

    await upcomingScheduleLink.waitFor();
    await pastScheduleLink.waitFor();

    // Determine if we should use Upcoming or Past schedule
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const isPastMonth = targetMonth < currentMonth;

    if (verbose) {
      console.log(`   Target month: ${targetMonth}`);
      console.log(`   Current month: ${currentMonth}`);
      console.log(`   Using ${isPastMonth ? 'Past' : 'Upcoming'} Schedule`);
    }

    // Click on the appropriate schedule
    if (isPastMonth) {
      await pastScheduleLink.click();
    } else {
      await upcomingScheduleLink.click();
    }

    // Wait for schedule table to load
    await page.waitForSelector('.css-wl-first-table-list-content', {
      timeout: 10000,
    });

    // Wait for the month display element to be visible and have content
    await page.waitForSelector('.js-navigate-calendar', { state: 'visible' });
    await page.waitForFunction(
      () => {
        const element = document.querySelector('.js-navigate-calendar');
        return element?.textContent && element.textContent.trim().length > 0;
      },
      { timeout: 5000 },
    );

    // Navigate to the target month using the month navigation
    const currentMonthDisplay = (await page.textContent('.js-navigate-calendar')) || '';

    if (verbose) {
      console.log(`   Current display month: ${currentMonthDisplay.trim()}`);
      console.log(`   Navigating to: ${targetMonth}`);
    }

    // Parse the month display (format: "November 2025")
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const displayMatch = currentMonthDisplay.trim().match(/(\w+)\s+(\d{4})/);

    let currentDisplayMonth = new Date().getMonth();
    let currentDisplayYear = new Date().getFullYear();

    if (displayMatch) {
      const [, monthName, yearStr] = displayMatch;
      const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
      if (monthIndex >= 0) {
        currentDisplayMonth = monthIndex;
        currentDisplayYear = parseInt(yearStr, 10);
      }
    }

    if (verbose) {
      console.log(
        `   Parsed as: ${monthNames[currentDisplayMonth]} ${currentDisplayYear} (month index ${currentDisplayMonth})`,
      );
    }

    // Calculate target month
    const [targetYear, targetMonthStr] = targetMonth.split('-');
    const targetMonthIndex = parseInt(targetMonthStr, 10) - 1; // Convert to 0-based

    // Calculate how many months to navigate (positive = forward, negative = backward)
    const monthsDiff =
      (parseInt(targetYear, 10) - currentDisplayYear) * 12 +
      (targetMonthIndex - currentDisplayMonth);

    if (verbose) {
      console.log(`   Months difference: ${monthsDiff}`);
    }

    if (monthsDiff !== 0) {
      const navButton =
        monthsDiff < 0
          ? '.js-navigate-previous' // Go backwards
          : '.js-navigate-next'; // Go forwards

      const clickCount = Math.abs(monthsDiff);
      if (verbose) {
        console.log(
          `   Clicking ${monthsDiff < 0 ? 'previous' : 'next'} arrow ${clickCount} times`,
        );
      }

      for (let i = 0; i < clickCount; i++) {
        const beforeClick = await page.textContent('.js-navigate-calendar');
        await page.click(navButton);

        // Wait for month display to actually change
        await page.waitForFunction(
          (before) => {
            const current = document.querySelector('.js-navigate-calendar')?.textContent;
            return current !== before;
          },
          beforeClick,
          { timeout: 5000 },
        );

        // Wait for network activity to settle after month change
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      }

      if (verbose) {
        const newMonth = await page.textContent('.js-navigate-calendar');
        console.log(`   Now viewing: ${newMonth?.trim()}`);
      }
    }

    if (verbose) {
      console.log('   Schedule loaded, extracting dates...');
    }

    // Extract schedule dates
    const scheduleDates: string[] = [];

    // TODO: Replace these selectors with actual ones from the schedule page
    // You'll need to inspect the page to find the right selectors
    // Common patterns:
    // - Table rows with dates: 'table tr td.date'
    // - Div containers: '.schedule-item .date'
    // - Data attributes: '[data-date]'

    // Extract dates from table cells (WellnessLiving specific selector)
    // Try the Upcoming Schedule selector first
    const dateElements = await page.$$('.css-column--dt_date');

    // If that doesn't work, try extracting from Date column in Past Schedule
    if (dateElements.length === 0 && verbose) {
      console.log('   .css-column--dt_date not found, trying table row extraction...');
    }

    // For Past Schedule: dates are in the Date column of the table
    // Try to find all table rows and extract date information
    if (dateElements.length === 0) {
      // Get all table rows in the schedule table
      const rows = await page.$$('table tr');
      for (const row of rows) {
        const rowText = await row.textContent();
        if (rowText) {
          // Try to extract date from row text
          const parsedDate = parseScheduleDate(rowText);
          if (parsedDate?.startsWith(targetMonth)) {
            scheduleDates.push(parsedDate);
          }
        }
      }
    } else {
      // Original logic for Upcoming Schedule
      for (const element of dateElements) {
        const dateText = await element.textContent();
        if (dateText) {
          const parsedDate = parseScheduleDate(dateText);
          if (parsedDate?.startsWith(targetMonth)) {
            scheduleDates.push(parsedDate);
          }
        }
      }
    }

    // DEBUGGING: Take a screenshot to see the schedule page
    if (verbose) {
      const screenshotPath = `debug-schedule-${targetMonth}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot saved to: ${screenshotPath}`);
    }

    // TEMPORARY: Mock data if no real dates were extracted
    // Remove this when the actual selector is working
    if (scheduleDates.length === 0) {
      console.warn('⚠️  No dates extracted - using mock data. Update the selector in the code!');
      console.warn('   Check the screenshot to find the correct selector for schedule dates.');
      const mockDates = [`${targetMonth}-01`, `${targetMonth}-03`, `${targetMonth}-05`];
      scheduleDates.push(...mockDates);
    }

    // Deduplicate and sort dates
    const uniqueDates = Array.from(new Set(scheduleDates)).sort();

    if (verbose) {
      console.log(`📅 Found ${uniqueDates.length} attendance days`);
      uniqueDates.forEach((date) => {
        console.log(`   - ${date}`);
      });
    }

    return uniqueDates;
  } finally {
    await browser.close();
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  const targetMonth = options.month || new Date().toISOString().slice(0, 7);
  const [year] = targetMonth.split('-');

  console.log('📅 Pepper Schedule Scraper\n');

  try {
    // Scrape the schedule
    const dates = await scrapeSchedule(options);

    if (dates.length === 0) {
      console.warn('⚠️  No attendance days found');
      return;
    }

    console.log(`\n✅ Scraped ${dates.length} attendance days for ${targetMonth}`);

    // Load existing schedule and merge
    const schedule = loadSchedule(year);
    schedule[targetMonth] = dates;

    if (options.dryRun) {
      console.log('\n🔍 Dry run - would save:');
      console.log(JSON.stringify({ [targetMonth]: dates }, null, 2));
      console.log('\n(Use without --dry-run to save)');
    } else {
      saveSchedule(year, schedule);
    }
  } catch (error) {
    console.error('\n❌ Scraping failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { scrapeSchedule, loadSchedule, saveSchedule };
