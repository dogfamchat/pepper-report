#!/usr/bin/env bun
/**
 * Report Card Scraper
 *
 * Scrapes Pepper's daily report card from the daycare website.
 * Includes grade, staff notes, activities, friends, and photos.
 * Automatically discovers and anonymizes staff names.
 *
 * Usage:
 *   bun run scripts/scrapers/scrape-report.ts --date 2024-11-15
 *   bun run scripts/scrapers/scrape-report.ts  # Uses today's date
 *   bun run scripts/scrapers/scrape-report.ts --date 2024-11-15 --dry-run
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { processStaffNames } from '../utils/staff-utils';
// import { uploadPhotosToR2 } from '../storage/r2-uploader'; // TODO: Uncomment when R2 uploader is ready
import type { ReportCard, Grade, Activity } from '../types';

interface ScraperOptions {
  date?: string; // YYYY-MM-DD format
  dryRun?: boolean;
  headless?: boolean;
  verbose?: boolean;
  skipPhotos?: boolean;
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
    skipPhotos: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--date':
        options.date = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--headed':
        options.headless = false;
        break;
      case '--skip-photos':
        options.skipPhotos = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Report Card Scraper - Extract Pepper's daily report card

Usage:
  bun run scripts/scrapers/scrape-report.ts [options]

Options:
  --date YYYY-MM-DD   Scrape report for specific date (default: today)
  --dry-run           Run scraper without saving data
  --skip-photos       Skip photo downloading/upload
  --headed            Show browser window (for debugging)
  --verbose, -v       Verbose logging
  --help, -h          Show this help message

Examples:
  bun run scripts/scrapers/scrape-report.ts
  bun run scripts/scrapers/scrape-report.ts --date 2024-11-15
  bun run scripts/scrapers/scrape-report.ts --headed --verbose
  bun run scripts/scrapers/scrape-report.ts --date 2024-11-15 --dry-run
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Check if report card already exists
 */
function reportExists(date: string): boolean {
  const [year] = date.split('-');
  const reportFile = join(process.cwd(), 'data', 'reports', year, `${date}.json`);
  return existsSync(reportFile);
}

/**
 * Save report card
 */
function saveReport(reportCard: ReportCard): void {
  const [year] = reportCard.date.split('-');
  const reportDir = join(process.cwd(), 'data', 'reports', year);
  const reportFile = join(reportDir, `${reportCard.date}.json`);

  // Ensure directory exists
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  writeFileSync(reportFile, JSON.stringify(reportCard, null, 2) + '\n', 'utf-8');
  console.log(`✅ Saved report card to ${reportFile}`);
}

/**
 * Map scraped grade text to Grade type
 */
function parseGrade(gradeText: string): Grade {
  const cleaned = gradeText.trim().toUpperCase();

  // Handle various grade formats
  if (cleaned.includes('A') || cleaned.includes('EXCELLENT')) return 'A';
  if (cleaned.includes('B') || cleaned.includes('GOOD')) return 'B';
  if (cleaned.includes('C') || cleaned.includes('AVERAGE')) return 'C';
  if (cleaned.includes('D') || cleaned.includes('BELOW')) return 'D';
  if (cleaned.includes('F') || cleaned.includes('POOR')) return 'F';

  console.warn(`⚠️  Unknown grade format: "${gradeText}", defaulting to C`);
  return 'C';
}

/**
 * Map scraped activity text to Activity types
 */
function parseActivities(activityTexts: string[]): Activity[] {
  const activities: Activity[] = [];
  const activityMap: Record<string, Activity> = {
    'play': 'playtime',
    'nap': 'nap',
    'sleep': 'nap',
    'rest': 'nap',
    'outdoor': 'outdoor',
    'outside': 'outdoor',
    'walk': 'outdoor',
    'training': 'training',
    'groom': 'grooming',
    'bath': 'grooming',
    'feed': 'feeding',
    'meal': 'feeding',
    'social': 'socialization',
    'enrich': 'enrichment',
    'puzzle': 'enrichment',
    'special': 'special-event',
    'event': 'special-event',
  };

  for (const text of activityTexts) {
    const cleaned = text.toLowerCase().trim();
    for (const [keyword, activity] of Object.entries(activityMap)) {
      if (cleaned.includes(keyword) && !activities.includes(activity)) {
        activities.push(activity);
        break;
      }
    }
  }

  return activities;
}

/**
 * Scrape report card for a specific date
 */
async function scrapeReportCard(options: ScraperOptions): Promise<ReportCard | null> {
  const { date, headless = true, verbose = false } = options;

  // Determine target date (default: today)
  const targetDate = date || new Date().toISOString().slice(0, 10);

  if (verbose) {
    console.log(`🔍 Scraping report card for ${targetDate}`);
  }

  // Get credentials and URL from environment
  const daycareUrl = process.env.DAYCARE_URL;
  const username = process.env.DAYCARE_USERNAME;
  const password = process.env.DAYCARE_PASSWORD;

  if (!daycareUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  - DAYCARE_URL\n' +
      '  - DAYCARE_USERNAME\n' +
      '  - DAYCARE_PASSWORD'
    );
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (verbose) {
      console.log(`📡 Navigating to ${daycareUrl}`);
    }

    await page.goto(daycareUrl);

    // TODO: Fill in actual login selectors
    // Login flow
    if (verbose) {
      console.log('🔐 Logging in...');
    }

    await page.fill('input[name="username"]', username); // TODO: Update selector
    await page.fill('input[name="password"]', password); // TODO: Update selector

    // Wait for navigation after login
    await Promise.all([
      page.waitForURL('**/*', { waitUntil: 'networkidle' }), // TODO: Update URL pattern
      page.click('button[type="submit"]'), // TODO: Update selector
    ]);

    if (verbose) {
      console.log('✓ Logged in successfully');
    }

    // TODO: Navigate to report card for target date
    // await page.goto(`${DAYCARE_URL}/reports/${targetDate}`);
    // OR: await page.click(`.date-selector[data-date="${targetDate}"]`);

    // TODO: Wait for report card to load
    // await page.waitForSelector('.report-card'); // TODO: Update selector

    // TODO: Check if report exists for this date
    // const noReportMessage = await page.$('.no-report-message');
    // if (noReportMessage) {
    //   if (verbose) {
    //     console.log(`ℹ️  No report card found for ${targetDate}`);
    //   }
    //   return null;
    // }

    // TODO: Extract grade
    // const gradeElement = await page.$('.grade'); // TODO: Update selector
    // const gradeText = await gradeElement?.textContent() || 'C';
    // const grade = parseGrade(gradeText);

    // TODO: Extract staff notes
    // const notesElement = await page.$('.staff-notes'); // TODO: Update selector
    // const staffNotes = await notesElement?.textContent() || '';

    // TODO: Extract activities
    // const activityElements = await page.$$('.activity'); // TODO: Update selector
    // const activityTexts = await Promise.all(
    //   activityElements.map(el => el.textContent())
    // );
    // const activities = parseActivities(activityTexts.filter(Boolean) as string[]);

    // TODO: Extract staff names (REAL names from website)
    // const staffElements = await page.$$('.staff-member'); // TODO: Update selector
    // const realStaffNames = await Promise.all(
    //   staffElements.map(el => el.textContent())
    // );

    // TODO: Extract friend names
    // const friendElements = await page.$$('.friend-name'); // TODO: Update selector
    // const friends = await Promise.all(
    //   friendElements.map(el => el.textContent())
    // );

    // TODO: Download photos
    // let photoFilenames: string[] = [];
    // if (!skipPhotos) {
    //   const photoElements = await page.$$('.photo img'); // TODO: Update selector
    //   const photoUrls = await Promise.all(
    //     photoElements.map(el => el.getAttribute('src'))
    //   );
    //   photoFilenames = await uploadPhotosToR2(photoUrls.filter(Boolean) as string[], targetDate);
    // }

    // TEMPORARY: Mock data for testing structure
    // Remove this when implementing actual scraping
    console.warn('⚠️  Using mock report card data - implement actual scraping logic!');

    const mockRealStaffNames = ['Jane Smith', 'John Doe']; // TODO: Extract from page
    const anonymizedStaffNames = processStaffNames(mockRealStaffNames);

    const reportCard: ReportCard = {
      date: targetDate,
      grade: 'A', // TODO: Extract from page
      staffNotes: 'Pepper had a great day today! She played with her friends and took a good nap.', // TODO: Extract
      activities: ['playtime', 'nap', 'outdoor'], // TODO: Extract
      staffNames: anonymizedStaffNames, // ← Already anonymized!
      friends: ['Max', 'Luna'], // TODO: Extract
      photos: [], // TODO: Download and upload to R2
    };

    if (verbose) {
      console.log(`\n📋 Report Card Summary:`);
      console.log(`   Date: ${reportCard.date}`);
      console.log(`   Grade: ${reportCard.grade}`);
      console.log(`   Staff: ${anonymizedStaffNames.join(', ')}`);
      console.log(`   Friends: ${reportCard.friends.join(', ')}`);
      console.log(`   Activities: ${reportCard.activities.join(', ')}`);
      console.log(`   Photos: ${reportCard.photos.length}`);
    }

    return reportCard;
  } finally {
    await browser.close();
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  const targetDate = options.date || new Date().toISOString().slice(0, 10);

  console.log('📝 Pepper Report Card Scraper\n');

  try {
    // Check if report already exists
    if (reportExists(targetDate) && !options.dryRun) {
      console.log(`ℹ️  Report card for ${targetDate} already exists`);
      console.log('   Use --dry-run to scrape anyway without overwriting\n');
      return;
    }

    // Scrape the report card
    const reportCard = await scrapeReportCard(options);

    if (!reportCard) {
      console.warn(`⚠️  No report card found for ${targetDate}`);
      process.exit(0);
    }

    console.log(`\n✅ Scraped report card for ${targetDate}`);

    if (options.dryRun) {
      console.log('\n🔍 Dry run - would save:');
      console.log(JSON.stringify(reportCard, null, 2));
      console.log('\n(Use without --dry-run to save)');
    } else {
      saveReport(reportCard);

      // Output success indicator for GitHub Actions
      console.log('\n::set-output name=report_found::true');
      console.log(`::set-output name=report_date::${targetDate}`);
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

export { scrapeReportCard, parseGrade, parseActivities, reportExists, saveReport };
