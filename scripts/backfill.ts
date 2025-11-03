#!/usr/bin/env bun

/**
 * Report Card Backfill Script
 *
 * Imports historical report cards by scraping date ranges.
 * Should be run locally (not in GitHub Actions) for initial data import.
 *
 * Usage:
 *   bun run scripts/backfill.ts --start 2025-08-01 --end 2025-10-31
 *   bun run scripts/backfill.ts --dates 2025-08-05,2025-08-07,2025-08-12
 *   bun run scripts/backfill.ts --schedule data/schedule/2025.json
 */

import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { reportExists, saveReport, scrapeReportCard } from './scrapers/scrape-report';
import type { Schedule } from './types';
import { getCredentials, login } from './utils/auth-utils';

interface BackfillOptions {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  dates?: string[]; // Array of YYYY-MM-DD
  scheduleFile?: string; // Path to schedule JSON
  delayMs?: number; // Delay between requests (default: 4000ms)
  skipExisting?: boolean; // Skip dates that already have reports
  skipPhotos?: boolean; // Skip photo downloading
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    delayMs: 4000, // 4 seconds between requests
    skipExisting: true,
    skipPhotos: false,
    verbose: true,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--start':
        options.startDate = args[++i];
        break;
      case '--end':
        options.endDate = args[++i];
        break;
      case '--dates':
        options.dates = args[++i].split(',').map((d) => d.trim());
        break;
      case '--schedule':
        options.scheduleFile = args[++i];
        break;
      case '--delay':
        options.delayMs = parseInt(args[++i], 10);
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '--overwrite':
        options.skipExisting = false;
        break;
      case '--skip-photos':
        options.skipPhotos = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.verbose = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Report Card Backfill - Import historical report cards

Usage:
  bun run scripts/backfill.ts [options]

Options:
  --start YYYY-MM-DD      Start date
  --end YYYY-MM-DD        End date
  --dates YYYY-MM-DD,...  Comma-separated list of dates
  --schedule FILE         Use dates from schedule JSON file
  --delay MS              Delay between requests in ms (default: 4000)
  --skip-existing         Skip dates with existing reports (default: true)
  --overwrite             Overwrite existing reports
  --skip-photos           Skip photo downloading/upload
  --dry-run               Preview without saving
  --verbose, -v           Verbose logging (default: true)
  --quiet, -q             Minimal logging
  --help, -h              Show this help message

Examples:
  # Backfill August through October 2025
  bun run scripts/backfill.ts --start 2025-08-01 --end 2025-10-31

  # Backfill specific dates
  bun run scripts/backfill.ts --dates 2025-08-05,2025-08-07,2025-08-12

  # Use schedule file (only scrape attendance days)
  bun run scripts/backfill.ts --schedule data/schedule/2025.json

  # Skip photos for faster backfill
  bun run scripts/backfill.ts --start 2025-08 --end 2025-10 --skip-photos
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Generate list of dates between start and end
 */
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Load dates from schedule file
 */
function loadDatesFromSchedule(scheduleFile: string): string[] {
  if (!existsSync(scheduleFile)) {
    throw new Error(`Schedule file not found: ${scheduleFile}`);
  }

  try {
    const schedule: Schedule = JSON.parse(readFileSync(scheduleFile, 'utf-8'));
    const dates: string[] = [];

    // Extract all dates from all months (filter out non-array values like _comment)
    for (const monthDates of Object.values(schedule)) {
      if (Array.isArray(monthDates)) {
        dates.push(...monthDates);
      }
    }

    return dates.sort();
  } catch (error) {
    throw new Error(`Failed to parse schedule file: ${error}`);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backfill report cards for multiple dates
 */
async function backfillReports(options: BackfillOptions): Promise<void> {
  const {
    delayMs = 4000,
    verbose = true,
    dryRun = false,
    skipExisting = true,
    skipPhotos = false,
  } = options;

  // Determine which dates to scrape
  let dates: string[];

  if (options.dates) {
    dates = options.dates;
  } else if (options.scheduleFile) {
    console.log(`📅 Loading dates from schedule: ${options.scheduleFile}`);
    dates = loadDatesFromSchedule(options.scheduleFile);
  } else if (options.startDate && options.endDate) {
    dates = generateDateRange(options.startDate, options.endDate);
  } else {
    console.error('❌ Must specify either --start/--end, --dates, or --schedule');
    console.log('   Run with --help for usage examples');
    process.exit(1);
  }

  console.log('📝 Report Card Backfill\n');
  console.log(`Dates to scrape: ${dates.length}`);
  console.log(`Delay between requests: ${delayMs}ms`);
  console.log(`Skip existing: ${skipExisting ? 'Yes' : 'No'}`);
  console.log(`Skip photos: ${skipPhotos ? 'Yes' : 'No'}`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  // Create single browser session for all scrapes
  console.log('🌐 Launching browser and logging in...');
  const daycareUrl = process.env.DAYCARE_REPORT_URL;
  const credentials = getCredentials();

  if (!daycareUrl) {
    throw new Error('Missing required environment variable: DAYCARE_REPORT_URL');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login once
    await page.goto(daycareUrl);
    await login(page, credentials, verbose);
    console.log('✓ Logged in successfully');

    // Navigate to Forms page
    console.log('📋 Navigating to Forms page...');
    await page.click('a:has-text("Forms")');
    await page.waitForLoadState('networkidle');
    console.log('✓ Ready to scrape\n');

    const results: {
      date: string;
      status: 'success' | 'skipped' | 'not_found' | 'failed';
      error?: string;
    }[] = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];

      console.log(`\n[${i + 1}/${dates.length}] Processing ${date}...`);

      // Check if report already exists
      if (skipExisting && reportExists(date)) {
        console.log(`   ⏭️  Report already exists, skipping`);
        results.push({ date, status: 'skipped' });
        continue;
      }

      try {
        // Scrape report card (reusing same page/session)
        const reportCard = await scrapeReportCard({
          date,
          headless: true,
          verbose,
          skipPhotos,
          page, // Pass existing page to reuse session
        });

        if (!reportCard) {
          console.warn(`   ℹ️  No report card found for ${date}`);
          results.push({ date, status: 'not_found' });
          continue;
        }

        console.log(`   ✓ Scraped report card (Grade: ${reportCard.grade})`);

        if (!dryRun) {
          saveReport(reportCard);
        }

        results.push({ date, status: 'success' });

        // Rate limiting: wait before next request (except for last date)
        if (i < dates.length - 1) {
          if (verbose) {
            console.log(`   ⏱️  Waiting ${delayMs}ms before next request...`);
          }
          await sleep(delayMs);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Failed to scrape ${date}:`, errorMessage);
        results.push({ date, status: 'failed', error: errorMessage });

        // Continue with next date despite error
        if (i < dates.length - 1) {
          console.log(`   ⏱️  Waiting ${delayMs}ms before continuing...`);
          await sleep(delayMs);
        }
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('Backfill Summary\n');

    const successCount = results.filter((r) => r.status === 'success').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;
    const notFoundCount = results.filter((r) => r.status === 'not_found').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    console.log(`Total dates processed: ${results.length}`);
    console.log(`Successfully scraped: ${successCount}`);
    console.log(`Skipped (existing): ${skippedCount}`);
    console.log(`Not found: ${notFoundCount}`);
    console.log(`Failed: ${failedCount}\n`);

    if (dryRun) {
      console.log('🔍 Dry run complete - no data was saved');
      console.log('   Run without --dry-run to save reports\n');
    } else {
      console.log('✅ Backfill complete!\n');
    }

    // Show grade distribution for successful scrapes
    if (successCount > 0 && verbose) {
      console.log('Grade distribution:');
      // Note: We would need to re-read the saved reports to show actual grades
      // For now, just note that this could be added
      console.log('  (View individual reports for grade details)\n');
    }

    // Show failed dates for easy retry
    if (failedCount > 0) {
      console.warn(`⚠️  ${failedCount} date(s) failed to scrape:`);
      const failedDates = results.filter((r) => r.status === 'failed').map((r) => r.date);
      console.log(`   ${failedDates.join(', ')}\n`);
      console.log('   Consider re-running with:');
      console.log(`   bun run scripts/backfill.ts --dates ${failedDates.join(',')}\n`);
      process.exit(1);
    }
  } finally {
    // Close browser session
    await browser.close();
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  try {
    await backfillReports(options);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { backfillReports, generateDateRange, loadDatesFromSchedule };
