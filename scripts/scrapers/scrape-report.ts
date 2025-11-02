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
import { login, getCredentials } from '../utils/auth-utils';
// import { uploadPhotosToR2 } from '../storage/r2-uploader'; // TODO: Uncomment when R2 uploader is ready
import type { ReportCard, Grade, ReportListRow } from '../types';

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

  console.warn(`⚠️  Unknown grade format: "${gradeText}", defaulting to C`);
  return 'C';
}

/**
 * Parse "Completed On" date/time to ISO format
 * Input: "Oct 31, 2025, 2:11pm"
 * Output: "2025-10-31T14:11:00.000Z"
 */
function parseCompletedDateTime(completedOnText: string, fallbackDate: string): string {
  try {
    // Parse "Oct 31, 2025, 2:11pm" format
    const match = completedOnText.match(/(\w+)\s+(\d+),\s+(\d+),\s+(\d+):(\d+)(am|pm)/i);
    if (!match) {
      console.warn(`⚠️  Could not parse completed date: "${completedOnText}"`);
      return new Date(fallbackDate).toISOString();
    }

    const [, monthStr, day, year, hour, minute, meridiem] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(monthStr);

    if (month === -1) {
      console.warn(`⚠️  Unknown month: "${monthStr}"`);
      return new Date(fallbackDate).toISOString();
    }

    let hour24 = parseInt(hour, 10);
    if (meridiem.toLowerCase() === 'pm' && hour24 !== 12) {
      hour24 += 12;
    } else if (meridiem.toLowerCase() === 'am' && hour24 === 12) {
      hour24 = 0;
    }

    const dateObj = new Date(parseInt(year), month, parseInt(day), hour24, parseInt(minute));
    return dateObj.toISOString();
  } catch (error) {
    console.warn(`⚠️  Error parsing date: ${error}`);
    return new Date(fallbackDate).toISOString();
  }
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
  const daycareUrl = process.env.DAYCARE_REPORT_URL;
  const credentials = getCredentials();

  if (!daycareUrl) {
    throw new Error(
      'Missing required environment variable:\n' +
      '  - DAYCARE_REPORT_URL'
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

    // Login using shared utility
    await login(page, credentials, verbose);

    if (verbose) {
      console.log('📋 Navigating to Forms page...');
    }

    // Click on "Forms" tab
    await page.click('a:has-text("Forms")');
    await page.waitForLoadState('networkidle');

    // Wait for the table to exist in the DOM
    await page.waitForSelector('table tbody tr', { state: 'attached', timeout: 10000 });

    // Find the report in the table for the target date
    if (verbose) {
      console.log(`🔎 Looking for report card dated ${targetDate}...`);
    }

    // Parse target date for comparison (use string splitting to avoid timezone issues)
    const [year, month, day] = targetDate.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expectedMonth = monthNames[month - 1]; // month is 1-indexed in YYYY-MM-DD format
    const expectedDay = day;
    const expectedYear = year;

    // Format: "Oct 31, 2025"
    const expectedDateStr = `${expectedMonth} ${expectedDay}, ${expectedYear}`;

    // Find all report rows
    const reportRows = page.locator('table tbody tr');
    const rowCount = await reportRows.count();

    if (verbose) {
      console.log(`   Found ${rowCount} report rows in table`);
      console.log(`   Looking for date string: "${expectedDateStr}"`);
    }

    let reportRow = null;
    let rowMetadata: ReportListRow | null = null;

    // Search for the report by matching the "Completed On" date
    // Skip first 4 rows (filters, year selector, and headers)
    for (let i = 4; i < rowCount; i++) {
      const row = reportRows.nth(i);

      // Get all cells in this row at once
      const cells = row.locator('td');
      const cellTexts = await cells.allTextContents();

      // Skip rows that don't have the expected number of columns
      if (cellTexts.length < 10) {
        continue;
      }

      // Column mapping (from row 2 headers):
      // 0: (checkbox), 1: Form Name, 2: Source, 3: Added On, 4: Status,
      // 5: Completed On, 6: Completed By, 7: Amended By, 8: IP Address, 9: Action
      const completedOnText = cellTexts[5];

      // Debug: print first actual data row
      if (verbose && i === 4) {
        console.log(`   First data row cells:`, cellTexts.map(c => c.substring(0, 30)));
      }

      if (completedOnText && completedOnText.includes(expectedDateStr)) {
        if (verbose) {
          console.log(`   ✓ Found report for ${targetDate} at row ${i}`);
        }
        reportRow = row;

        // Extract metadata from this row using the cellTexts we already have
        // Column mapping: 0: (checkbox), 1: Form Name, 2: Source, 3: Added On, 4: Status,
        // 5: Completed On, 6: Completed By, 7: Amended By, 8: IP Address, 9: Action
        const sourceText = cellTexts[2];
        const amendedByText = cellTexts[7];

        // Parse "Added by staff [Name]" from Source column
        const addedByMatch = sourceText?.match(/Added by staff (.+)/);
        const addedByReal = addedByMatch ? addedByMatch[1].trim() : '';

        rowMetadata = {
          formName: cellTexts[1] || '',
          addedOn: cellTexts[3] || '',
          status: cellTexts[4] || '',
          completedOn: completedOnText || '',
          completedBy: cellTexts[6] || '',
          amendedBy: amendedByText && amendedByText.trim() ? amendedByText.trim() : undefined,
          addedBy: addedByReal,
          ipAddress: cellTexts[8] || '',
        };

        break;
      }
    }

    if (!reportRow || !rowMetadata) {
      if (verbose) {
        console.log(`ℹ️  No report card found for ${targetDate}`);
      }
      return null;
    }

    // Click on the "Dayschool Report Card" link in this row
    if (verbose) {
      console.log('🖱️  Opening report card modal...');
    }

    const reportLink = reportRow.locator('a:has-text("Dayschool Report Card")');
    await reportLink.click();

    // Wait for modal to appear
    const modal = page.locator('.css-popup-form-wrapper .css-wl-quiz-process-wrap').first();
    await modal.waitFor({ state: 'visible', timeout: 10000 });

    if (verbose) {
      console.log('📄 Extracting data from modal...');
    }

    // Extract modal title (contains dog name and owners)
    const titleText = await modal.locator('.js-wl-quiz-process-header').textContent();
    // Example: "Dayschool Report Card for Pepper (John & Nadine)"
    const titleMatch = titleText?.match(/Dayschool Report Card for (.+?) \((.+?)\)/);
    const dogName = titleMatch ? titleMatch[1].trim() : 'Pepper';
    const owners = titleMatch ? titleMatch[2].trim() : 'Unknown';

    // Field 2: Trainers (multi-select)
    const trainerOptions = modal.locator('.css-quiz-question:has-text("Trainer")').locator('+ .css-col-100 select option[selected]');
    const trainerCount = await trainerOptions.count();
    const realTrainerNames: string[] = [];
    for (let i = 0; i < trainerCount; i++) {
      const trainerName = await trainerOptions.nth(i).textContent();
      if (trainerName) {
        realTrainerNames.push(trainerName.trim());
      }
    }

    // Field 3: Behavior grade (radio button)
    const gradeInput = modal.locator('input[name="a_radio"]:checked');
    const gradeLabel = await gradeInput.locator('..').textContent(); // Get parent label text
    const gradeLabelText = gradeLabel?.trim() || '';

    // Parse grade letter from the label text (e.g., "A = I excelled...")
    const gradeMatch = gradeLabelText.match(/^([A-D])\s*=/);
    const grade = gradeMatch ? (gradeMatch[1] as Grade) : 'C';

    // Field 4: Best part of day (dropdown)
    // Use case-insensitive search
    const bestPartOption = modal.locator('.css-quiz-question').filter({ hasText: /best part/i }).locator('+ .css-col-100 select option[selected]');
    const bestPartOfDay = (await bestPartOption.textContent({ timeout: 5000 }).catch(() => '')) || '';

    // Field 5: What I did today (textarea)
    const whatIDidTextarea = modal.locator('.css-quiz-question').filter({ hasText: /What I did/i }).locator('+ .css-col-100 textarea');
    const notes = (await whatIDidTextarea.inputValue({ timeout: 5000 }).catch(() => '')) || '';

    // Photos (TODO: implement photo extraction)
    const photos: string[] = [];
    // TODO: Check for photo gallery or attachment section in modal

    // Anonymize all staff names
    const allRealStaffNames = [
      ...realTrainerNames,
      rowMetadata.completedBy,
      rowMetadata.addedBy,
      ...(rowMetadata.amendedBy ? [rowMetadata.amendedBy] : []),
    ].filter(name => name && name.trim());

    const anonymizedMapping = processStaffNames(allRealStaffNames);

    // Get anonymized versions for each field
    const anonymizedTrainers = realTrainerNames.map(name => anonymizedMapping[allRealStaffNames.indexOf(name)]);
    const anonymizedCompletedBy = anonymizedMapping[allRealStaffNames.indexOf(rowMetadata.completedBy)];
    const anonymizedAddedBy = anonymizedMapping[allRealStaffNames.indexOf(rowMetadata.addedBy)];
    const anonymizedAmendedBy = rowMetadata.amendedBy
      ? anonymizedMapping[allRealStaffNames.indexOf(rowMetadata.amendedBy)]
      : undefined;

    // Parse completedDateTime from "Oct 31, 2025, 2:11pm"
    const completedDateTime = parseCompletedDateTime(rowMetadata.completedOn, targetDate);

    const reportCard: ReportCard = {
      date: targetDate,
      completedDateTime,
      dog: {
        name: dogName,
        owners: owners,
      },
      staffNames: anonymizedTrainers,
      grade,
      gradeDescription: gradeLabelText,
      bestPartOfDay: bestPartOfDay.trim(),
      notes: notes.trim(),
      photos,
      metadata: {
        addedBy: anonymizedAddedBy,
        completedBy: anonymizedCompletedBy,
        amendedBy: anonymizedAmendedBy,
        ipAddress: rowMetadata.ipAddress.trim(),
      },
    };

    if (verbose) {
      console.log(`\n📋 Report Card Summary:`);
      console.log(`   Date: ${reportCard.date}`);
      console.log(`   Dog: ${reportCard.dog.name} (${reportCard.dog.owners})`);
      console.log(`   Grade: ${reportCard.grade}`);
      console.log(`   Staff: ${anonymizedTrainers.join(', ')}`);
      console.log(`   Best Part: ${reportCard.bestPartOfDay}`);
      console.log(`   Notes: ${reportCard.notes.substring(0, 50)}...`);
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

export { scrapeReportCard, parseGrade, reportExists, saveReport };
