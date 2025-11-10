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

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Browser, chromium, type Page } from 'playwright';
import type { Grade, ReportCard, ReportListRow } from '../types';
import { getCredentials, login } from '../utils/auth-utils';
import { extractPhotosFromModal, uploadPhotosToR2 } from '../utils/photo-utils';
import { processStaffNames } from '../utils/staff-utils';

interface ScraperOptions {
  date?: string; // YYYY-MM-DD format
  dryRun?: boolean;
  headless?: boolean;
  verbose?: boolean;
  skipPhotos?: boolean;
  page?: Page; // Optional: reuse existing page (for backfill efficiency)
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

  writeFileSync(reportFile, `${JSON.stringify(reportCard, null, 2)}\n`, 'utf-8');
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
 * Input: "Oct 31, 2025, 2:11pm" (Mountain Time)
 * Output: "2025-10-31T20:11:00.000Z" (properly converted to UTC)
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
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
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

    const yearNum = parseInt(year, 10);
    const dayNum = parseInt(day, 10);
    const minuteNum = parseInt(minute, 10);

    // Determine if this date is in MDT (Mountain Daylight Time, UTC-6) or MST (Mountain Standard Time, UTC-7)
    // DST in Mountain Time: 2nd Sunday in March at 2am through 1st Sunday in November at 2am
    const isDST = (date: Date): boolean => {
      const year = date.getFullYear();

      // Find 2nd Sunday in March
      const marchFirst = new Date(Date.UTC(year, 2, 1)); // March 1
      const marchFirstDay = marchFirst.getUTCDay();
      const secondSundayMarch = 8 + ((7 - marchFirstDay) % 7); // 2nd Sunday
      const dstStart = new Date(Date.UTC(year, 2, secondSundayMarch, 2 + 6)); // 2am MT = 8am UTC

      // Find 1st Sunday in November
      const novFirst = new Date(Date.UTC(year, 10, 1)); // November 1
      const novFirstDay = novFirst.getUTCDay();
      const firstSundayNov = 1 + ((7 - novFirstDay) % 7); // 1st Sunday
      const dstEnd = new Date(Date.UTC(year, 10, firstSundayNov, 2 + 6)); // 2am MT = 8am UTC

      return date >= dstStart && date < dstEnd;
    };

    // Create a UTC date to check DST status (we'll use noon on the target date to avoid edge cases)
    const checkDate = new Date(Date.UTC(yearNum, month, dayNum, 12));
    const utcOffset = isDST(checkDate) ? 6 : 7; // MDT is UTC-6, MST is UTC-7

    // Create the date in Mountain Time by building a UTC string with the offset applied
    // If it's 2:11 PM MT and offset is 6 hours, the UTC time should be 20:11 (2:11 + 6)
    const utcHour = hour24 + utcOffset;
    const dateObj = new Date(Date.UTC(yearNum, month, dayNum, utcHour, minuteNum));

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
  const { date, headless = true, verbose = false, page: existingPage } = options;

  // Determine target date (default: today)
  const targetDate = date || new Date().toISOString().slice(0, 10);

  if (verbose) {
    console.log(`🔍 Scraping report card for ${targetDate}`);
  }

  // Determine if we need to manage our own browser or use provided page
  const shouldManageBrowser = !existingPage;
  let browser: Browser | undefined;
  let page: Page;

  if (shouldManageBrowser) {
    // Get credentials and URL from environment
    const daycareUrl = process.env.DAYCARE_REPORT_URL;
    const credentials = getCredentials();

    if (!daycareUrl) {
      throw new Error('Missing required environment variable:\n' + '  - DAYCARE_REPORT_URL');
    }

    browser = await chromium.launch({ headless });
    const context = await browser.newContext();
    page = await context.newPage();

    if (verbose) {
      console.log(`📡 Navigating to ${daycareUrl}`);
    }

    await page.goto(daycareUrl);

    // Login using shared utility
    await login(page, credentials, verbose);
  } else {
    // Reuse existing page (already logged in)
    page = existingPage;
  }

  try {
    if (shouldManageBrowser && verbose) {
      console.log('📋 Navigating to Forms page...');
    }

    // Navigate to Forms tab (or refresh if already there)
    if (shouldManageBrowser) {
      await page.click('a:has-text("Forms")');
      await page.waitForLoadState('networkidle');
    } else {
      // Already on Forms page, just refresh to see latest data
      await page.reload({ waitUntil: 'networkidle' });
    }

    // Wait for the table to exist in the DOM
    await page.waitForSelector('table tbody tr', {
      state: 'attached',
      timeout: 10000,
    });

    // Find the report in the table for the target date
    if (verbose) {
      console.log(`🔎 Looking for report card dated ${targetDate}...`);
    }

    // Parse target date for comparison (use string splitting to avoid timezone issues)
    const [year, month, day] = targetDate.split('-').map(Number);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
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
      // 5: Completed On, 6: Completed By, 7: Amended By, 8: Action
      const completedOnText = cellTexts[5];

      // Debug: print first actual data row
      if (verbose && i === 4) {
        console.log(
          `   First data row cells:`,
          cellTexts.map((c) => c.substring(0, 30)),
        );
      }

      if (completedOnText?.includes(expectedDateStr)) {
        if (verbose) {
          console.log(`   ✓ Found report for ${targetDate} at row ${i}`);
        }
        reportRow = row;

        // Extract metadata from this row using the cellTexts we already have
        // Column mapping: 0: (checkbox), 1: Form Name, 2: Source, 3: Added On, 4: Status,
        // 5: Completed On, 6: Completed By, 7: Amended By, 8: Action
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
          amendedBy: amendedByText?.trim() ? amendedByText.trim() : undefined,
          addedBy: addedByReal,
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

    // Wait for form data to load (look for trainer select or any form element to be populated)
    await page
      .waitForSelector('.css-quiz-question:has-text("Trainer")', {
        timeout: 5000,
      })
      .catch(() => {});

    // Give the form a moment to fully populate disabled fields
    await page.waitForTimeout(1000);

    if (verbose) {
      console.log('📄 Extracting data from modal...');
    }

    // Extract modal title (contains dog name and owners)
    const titleText = await modal.locator('.js-wl-quiz-process-header').textContent();
    // Example: "Dayschool Report Card for Pepper (John & Nadine)"
    const titleMatch = titleText?.match(/for\s+(.+?)\s+\((.+?)\)/i);
    const dogName = titleMatch ? titleMatch[1].trim() : 'Pepper';
    const owners = titleMatch ? titleMatch[2].trim() : 'Unknown';

    if (verbose && titleText) {
      console.log(`   Modal title: "${titleText}"`);
      console.log(`   Extracted dog: "${dogName}", owners: "${owners}"`);
    }

    // Extract all form data using JavaScript evaluation (more reliable than complex selectors)
    const formData = await page.evaluate(() => {
      const modal = document.querySelector('.css-popup-form-wrapper .css-wl-quiz-process-wrap');
      if (!modal) return null;

      // Helper to find answer container for a question
      const getAnswer = (questionText: string) => {
        const questions = Array.from(modal.querySelectorAll('.css-quiz-question'));
        const q = questions.find((el) => el.textContent?.includes(questionText));
        if (!q) return null;
        return q
          .closest('.css-core-quiz-element-wrap')
          ?.querySelector('.js-core-quiz-response-component');
      };

      // Field 2: Trainers (select with multiple)
      const trainersContainer = getAnswer('Trainer');
      const trainers = trainersContainer
        ? Array.from(trainersContainer.querySelectorAll('select option[selected]'))
            .map((o) => (o as HTMLOptionElement).textContent?.trim() || '')
            .filter((t) => t)
        : [];

      // Field 3: Behavior grade (radio button)
      const gradeContainer = getAnswer('behaviour');
      const gradeInput = gradeContainer?.querySelector(
        'input[name="a_radio"][checked]',
      ) as HTMLInputElement;
      const gradeLabel = gradeInput?.closest('label')?.textContent?.trim() || '';

      // Field 4: Best part (select single)
      const bestPartContainer = getAnswer('best part');
      const bestPart =
        (
          bestPartContainer?.querySelector('select option[selected]') as HTMLOptionElement
        )?.textContent?.trim() || '';

      // Field 5: What I did (checkboxes)
      const whatIDidContainer = getAnswer('What I did today');
      const whatIDid = whatIDidContainer
        ? Array.from(whatIDidContainer.querySelectorAll('input[type="checkbox"][checked]'))
            .map((cb) => cb.closest('label')?.textContent?.trim() || '')
            .filter((t) => t)
        : [];

      // Field 6: Training skills (checkboxes)
      const trainingContainer = getAnswer('Training skills');
      const training = trainingContainer
        ? Array.from(trainingContainer.querySelectorAll('input[type="checkbox"][checked]'))
            .map((cb) => cb.closest('label')?.textContent?.trim() || '')
            .filter((t) => t)
        : [];

      // Field 7: Caught being good (select multiple)
      const caughtContainer = getAnswer('Caught being good');
      const caught = caughtContainer
        ? Array.from(caughtContainer.querySelectorAll('select option[selected]'))
            .map((o) => (o as HTMLOptionElement).textContent?.trim() || '')
            .filter((t) => t)
        : [];

      // Field 8: Ooops (select multiple)
      const ooopsContainer = getAnswer('Ooops');
      const ooops = ooopsContainer
        ? Array.from(ooopsContainer.querySelectorAll('select option[selected]'))
            .map((o) => (o as HTMLOptionElement).textContent?.trim() || '')
            .filter((t) => t)
        : [];

      // Field 9: Noteworthy (text in .css-quiz-answer divs)
      const noteworthyContainers = Array.from(modal.querySelectorAll('.css-quiz-question'))
        .filter(
          (q) => q.textContent?.includes('Noteworthy') || q.textContent?.includes('continued'),
        )
        .map(
          (q) =>
            q
              .closest('.css-core-quiz-element-wrap')
              ?.querySelector('.css-quiz-answer')
              ?.textContent?.trim() || '',
        );
      const noteworthy = noteworthyContainers
        .filter((t) => t)
        .join(' ')
        .trim();

      return {
        trainers,
        gradeLabel,
        bestPart,
        whatIDid,
        training,
        caught,
        ooops,
        noteworthy,
      };
    });

    if (!formData) {
      throw new Error('Failed to extract form data from modal');
    }

    // Parse data from evaluation
    const realTrainerNames = formData.trainers;
    const gradeLabelText = formData.gradeLabel;
    const gradeMatch = gradeLabelText.match(/^([A-D])\s*=/);
    const grade = gradeMatch ? (gradeMatch[1] as Grade) : 'C';
    const bestPartOfDay = formData.bestPart;
    const whatIDidToday = formData.whatIDid;
    const trainingSkills = formData.training;
    const caughtBeingGood = formData.caught;
    const ooops = formData.ooops;
    const noteworthyComments = formData.noteworthy;

    if (verbose) {
      console.log(`   Trainers: ${realTrainerNames.length > 0 ? '*****' : '(none)'}`);
      console.log(`   Best part: ${bestPartOfDay || '(none)'}`);
      console.log(`   What I did: ${whatIDidToday.length} items`);
      console.log(`   Training: ${trainingSkills.length} items`);
      console.log(`   Caught being good: ${caughtBeingGood.join(', ') || '(none)'}`);
      console.log(`   Ooops: ${ooops.join(', ') || '(none)'}`);
      console.log(
        `   Noteworthy: ${noteworthyComments.substring(0, 50)}${noteworthyComments.length > 50 ? '...' : ''}`,
      );
    }

    // Extract photos from modal
    if (verbose) {
      console.log('📸 Extracting photos from modal...');
    }
    const photoData = await extractPhotosFromModal(page, targetDate);
    let photos: string[] = [];

    // Upload photos to R2 if not in dry-run mode and not skipping photos
    if (!options.skipPhotos && !options.dryRun && photoData.length > 0) {
      try {
        photos = await uploadPhotosToR2(photoData, targetDate, { verbose });
        if (verbose && photos.length > 0) {
          console.log(`   ✓ Uploaded ${photos.length} photo(s) to R2`);
        }
      } catch (error) {
        console.error('   ❌ Failed to upload photos to R2:', error);
        // Fall back to just using filenames
        photos = photoData.map((p) => p.filename);
      }
    } else {
      photos = photoData.map((p) => p.filename);
    }

    // Anonymize all staff names
    const allRealStaffNames = [
      ...realTrainerNames,
      rowMetadata.completedBy,
      rowMetadata.addedBy,
      ...(rowMetadata.amendedBy ? [rowMetadata.amendedBy] : []),
    ].filter((name) => name?.trim());

    const anonymizedMapping = processStaffNames(allRealStaffNames);

    // Get anonymized versions for each field
    const anonymizedTrainers = realTrainerNames.map(
      (name) => anonymizedMapping[allRealStaffNames.indexOf(name)],
    );
    const anonymizedCompletedBy =
      anonymizedMapping[allRealStaffNames.indexOf(rowMetadata.completedBy)];
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
      whatIDidToday,
      trainingSkills,
      caughtBeingGood,
      ooops,
      noteworthyComments,
      photos,
      metadata: {
        addedBy: anonymizedAddedBy,
        completedBy: anonymizedCompletedBy,
        amendedBy: anonymizedAmendedBy,
      },
    };

    if (verbose) {
      console.log(`\n📋 Report Card Summary:`);
      console.log(`   Date: ${reportCard.date}`);
      console.log(`   Dog: ${reportCard.dog.name} (${reportCard.dog.owners})`);
      console.log(`   Grade: ${reportCard.grade}`);
      console.log(`   Staff: ${anonymizedTrainers.join(', ') || '(none)'}`);
      console.log(`   Best Part: ${reportCard.bestPartOfDay || '(none)'}`);
      console.log(`   What I Did: ${reportCard.whatIDidToday.join(', ') || '(none)'}`);
      console.log(`   Training: ${reportCard.trainingSkills.join(', ') || '(none)'}`);
      console.log(`   Photos: ${reportCard.photos.length}`);
    }

    return reportCard;
  } finally {
    // Only close browser if we created it (not reusing existing page)
    if (shouldManageBrowser && browser) {
      await browser.close();
    }
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
