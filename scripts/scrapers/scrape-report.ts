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
import { getCurrentDate, parseCompletedDateTime } from '../utils/date-utils';
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
  bun run scrape:report [options]

Options:
  --date YYYY-MM-DD   Scrape report for specific date (default: today)
  --dry-run           Run scraper without saving data
  --skip-photos       Skip photo downloading/upload
  --headed            Show browser window (for debugging)
  --verbose, -v       Verbose logging
  --help, -h          Show this help message

Examples:
  bun run scrape:report
  bun run scrape:report --date 2024-11-15
  bun run scrape:report --headed --verbose
  bun run scrape:report --date 2024-11-15 --dry-run

Note: On Windows, this uses 'bun tsx --env-file=.env' internally due to a Bun/Playwright bug.
      On Linux/macOS (including GitHub Actions), it uses 'bun run' normally.
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
 * Scrape report card for a specific date
 */
async function scrapeReportCard(options: ScraperOptions): Promise<ReportCard | null> {
  const { date, headless = true, verbose = false, page: existingPage } = options;

  // Determine target date (default: today)
  const targetDate = date || getCurrentDate();

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

    // Helper function to get answer container locator for a question
    const getAnswerContainer = (questionText: string) => {
      return modal
        .locator('.css-quiz-question', { hasText: questionText })
        .locator('..')
        .locator('..')
        .locator('.js-core-quiz-response-component')
        .first();
    };

    // Field 2: Trainers (select with multiple)
    const trainersContainer = getAnswerContainer('Trainer');
    const trainerSelect = trainersContainer.locator('select').first();
    const trainerOptions = trainerSelect.locator('option');
    const trainerOptionsCount = await trainerOptions.count();
    const realTrainerNames: string[] = [];
    for (let i = 0; i < trainerOptionsCount; i++) {
      const option = trainerOptions.nth(i);
      const isSelected = await option.evaluate((el: HTMLOptionElement) => el.selected);
      if (isSelected) {
        const text = await option.textContent();
        if (text?.trim()) {
          realTrainerNames.push(text.trim());
        }
      }
    }

    // Field 3: Behavior grade (radio button)
    const gradeContainer = getAnswerContainer('behaviour');
    const gradeRadios = gradeContainer.locator('input[name="a_radio"]');
    const radioCount = await gradeRadios.count();
    let gradeLabelText = '';
    for (let i = 0; i < radioCount; i++) {
      const radio = gradeRadios.nth(i);
      if (await radio.isChecked()) {
        const label = radio.locator('..');
        gradeLabelText = (await label.textContent())?.trim() || '';
        break;
      }
    }

    // Field 4: Best part (select single)
    const bestPartContainer = getAnswerContainer('best part');
    const bestPartSelect = bestPartContainer.locator('select').first();
    const bestPartOptions = bestPartSelect.locator('option');
    const bestPartOptionsCount = await bestPartOptions.count();
    let bestPartOfDay = '';
    for (let i = 0; i < bestPartOptionsCount; i++) {
      const option = bestPartOptions.nth(i);
      const isSelected = await option.evaluate((el: HTMLOptionElement) => el.selected);
      if (isSelected) {
        bestPartOfDay = (await option.textContent())?.trim() || '';
        break;
      }
    }

    // Field 5: What I did (checkboxes)
    const whatIDidContainer = getAnswerContainer('What I did today');
    const whatIDidCheckboxes = whatIDidContainer.locator('input[type="checkbox"]');
    const whatIDidCount = await whatIDidCheckboxes.count();
    const whatIDidToday: string[] = [];
    for (let i = 0; i < whatIDidCount; i++) {
      const checkbox = whatIDidCheckboxes.nth(i);
      if (await checkbox.isChecked()) {
        const label = checkbox.locator('..');
        const text = await label.textContent();
        if (text?.trim()) {
          whatIDidToday.push(text.trim());
        }
      }
    }

    // Field 6: Training skills (checkboxes)
    const trainingContainer = getAnswerContainer('Training skills');
    const trainingCheckboxes = trainingContainer.locator('input[type="checkbox"]');
    const trainingCount = await trainingCheckboxes.count();
    const trainingSkills: string[] = [];
    for (let i = 0; i < trainingCount; i++) {
      const checkbox = trainingCheckboxes.nth(i);
      if (await checkbox.isChecked()) {
        const label = checkbox.locator('..');
        const text = await label.textContent();
        if (text?.trim()) {
          trainingSkills.push(text.trim());
        }
      }
    }

    // Field 7: Caught being good (select multiple)
    const caughtContainer = getAnswerContainer('Caught being good');
    const caughtSelect = caughtContainer.locator('select').first();
    const caughtOptions = caughtSelect.locator('option');
    const caughtOptionsCount = await caughtOptions.count();
    const caughtBeingGood: string[] = [];
    for (let i = 0; i < caughtOptionsCount; i++) {
      const option = caughtOptions.nth(i);
      const isSelected = await option.evaluate((el: HTMLOptionElement) => el.selected);
      if (isSelected) {
        const text = await option.textContent();
        if (text?.trim()) {
          caughtBeingGood.push(text.trim());
        }
      }
    }

    // Field 8: Ooops (select multiple)
    const ooopsContainer = getAnswerContainer('Ooops');
    const ooopsSelect = ooopsContainer.locator('select').first();
    const ooopsOptions = ooopsSelect.locator('option');
    const ooopsOptionsCount = await ooopsOptions.count();
    const ooops: string[] = [];
    for (let i = 0; i < ooopsOptionsCount; i++) {
      const option = ooopsOptions.nth(i);
      const isSelected = await option.evaluate((el: HTMLOptionElement) => el.selected);
      if (isSelected) {
        const text = await option.textContent();
        if (text?.trim()) {
          ooops.push(text.trim());
        }
      }
    }

    // Field 9: Noteworthy (text in .css-quiz-answer divs)
    const noteworthyQuestions = modal.locator('.css-quiz-question').filter({
      hasText: /Noteworthy|continued/,
    });
    const noteworthyCount = await noteworthyQuestions.count();
    const noteworthyParts: string[] = [];
    for (let i = 0; i < noteworthyCount; i++) {
      const question = noteworthyQuestions.nth(i);
      const answerDiv = question.locator('..').locator('..').locator('.css-quiz-answer').first();
      const text = await answerDiv.textContent();
      if (text?.trim()) {
        noteworthyParts.push(text.trim());
      }
    }
    const noteworthyComments = noteworthyParts.join(' ').trim();

    // Parse grade from label text
    const gradeMatch = gradeLabelText.match(/^([A-D])\s*=/);
    const grade = gradeMatch ? (gradeMatch[1] as Grade) : 'C';

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
  const targetDate = options.date || getCurrentDate();

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
