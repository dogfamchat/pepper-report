#!/usr/bin/env bun
/**
 * Schedule Backfill Script
 *
 * Imports historical daycare schedule data by scraping multiple months.
 * Should be run locally (not in GitHub Actions) for initial data import.
 *
 * Usage:
 *   bun run scripts/backfill-schedule.ts --start 2025-08-01 --end 2025-10-31
 *   bun run scripts/backfill-schedule.ts --start 2025-08 --end 2025-10  # Month format also supported
 *   bun run scripts/backfill-schedule.ts --months 2025-08,2025-09,2025-10
 */

import { loadSchedule, saveSchedule, scrapeSchedule } from './scrapers/scrape-schedule';

interface BackfillOptions {
  startDate?: string; // YYYY-MM or YYYY-MM-DD
  endDate?: string; // YYYY-MM or YYYY-MM-DD
  months?: string[]; // Array of YYYY-MM
  delayMs?: number; // Delay between requests (default: 3000ms)
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    delayMs: 3000, // 3 seconds between requests
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
      case '--months':
        options.months = args[++i].split(',').map((m) => m.trim());
        break;
      case '--delay':
        options.delayMs = parseInt(args[++i], 10);
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
Schedule Backfill - Import historical schedule data

Usage:
  bun run scripts/backfill-schedule.ts [options]

Options:
  --start YYYY-MM[-DD]    Start date or month
  --end YYYY-MM[-DD]      End date or month
  --months YYYY-MM,...    Comma-separated list of months
  --delay MS              Delay between requests in ms (default: 3000)
  --dry-run               Preview without saving
  --verbose, -v           Verbose logging (default: true)
  --quiet, -q             Minimal logging
  --help, -h              Show this help message

Examples:
  # Backfill August through October 2025
  bun run scripts/backfill-schedule.ts --start 2025-08 --end 2025-10

  # Backfill specific months
  bun run scripts/backfill-schedule.ts --months 2025-08,2025-09,2025-10

  # Preview without saving
  bun run scripts/backfill-schedule.ts --start 2025-08 --end 2025-10 --dry-run
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Generate list of months between start and end dates
 */
function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const startMonth = start.slice(0, 7); // YYYY-MM
  const endMonth = end.slice(0, 7);

  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  const [endYear, endMonthNum] = endMonth.split('-').map(Number);

  let currentYear = startYear;
  let currentMonth = startMonthNum;

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonthNum)) {
    months.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return months;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backfill schedule data for multiple months
 */
async function backfillSchedule(options: BackfillOptions): Promise<void> {
  const { delayMs = 3000, verbose = true, dryRun = false } = options;

  // Determine which months to scrape
  let months: string[];

  if (options.months) {
    months = options.months;
  } else if (options.startDate && options.endDate) {
    months = generateMonthRange(options.startDate, options.endDate);
  } else {
    console.error('❌ Must specify either --start/--end or --months');
    console.log('   Run with --help for usage examples');
    process.exit(1);
  }

  console.log('📅 Schedule Backfill\n');
  console.log(`Months to scrape: ${months.length}`);
  console.log(`Delay between requests: ${delayMs}ms`);
  console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

  const results: { month: string; count: number; success: boolean }[] = [];
  let totalDays = 0;

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const [year] = month.split('-');

    console.log(`\n[${i + 1}/${months.length}] Processing ${month}...`);

    try {
      // Scrape schedule for this month
      const dates = await scrapeSchedule({
        month,
        headless: true,
        verbose,
      });

      if (dates.length === 0) {
        console.warn(`   ⚠️  No attendance days found for ${month}`);
        results.push({ month, count: 0, success: true });
        continue;
      }

      console.log(`   ✓ Found ${dates.length} attendance days`);
      totalDays += dates.length;

      if (!dryRun) {
        // Load existing schedule and merge
        const schedule = loadSchedule(year);
        schedule[month] = dates;
        saveSchedule(year, schedule);
      }

      results.push({ month, count: dates.length, success: true });

      // Rate limiting: wait before next request (except for last month)
      if (i < months.length - 1) {
        if (verbose) {
          console.log(`   ⏱️  Waiting ${delayMs}ms before next request...`);
        }
        await sleep(delayMs);
      }
    } catch (error) {
      console.error(`   ❌ Failed to scrape ${month}:`, error);
      results.push({ month, count: 0, success: false });

      // Continue with next month despite error
      if (i < months.length - 1) {
        console.log(`   ⏱️  Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Backfill Summary\n');

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`Total months processed: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Total attendance days: ${totalDays}\n`);

  if (dryRun) {
    console.log('🔍 Dry run complete - no data was saved');
    console.log('   Run without --dry-run to save schedules\n');
  } else {
    console.log('✅ Backfill complete!\n');
  }

  // Show month-by-month breakdown
  if (verbose && results.length > 0) {
    console.log('Month-by-month breakdown:');
    for (const result of results) {
      const status = result.success ? '✓' : '✗';
      const count = result.count > 0 ? `${result.count} days` : 'no data';
      console.log(`  ${status} ${result.month}: ${count}`);
    }
    console.log();
  }

  // Exit with error code if any failures
  if (failureCount > 0) {
    console.warn(`⚠️  ${failureCount} month(s) failed to scrape`);
    console.log('   Review errors above and consider re-running for failed months\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  try {
    await backfillSchedule(options);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { backfillSchedule, generateMonthRange };
