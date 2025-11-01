/**
 * Example Scraper Template
 *
 * This template demonstrates how to use the staff utilities
 * to automatically register and anonymize staff names.
 */

import { processStaffNames } from '../utils/staff-utils';
import type { ReportCard, Activity } from '../types';

/**
 * Example: Process a scraped report card
 */
async function exampleScrapeReportCard(date: string): Promise<ReportCard> {
  // 1. Scrape the report card (pseudo-code)
  const scrapedData = {
    date: date,
    grade: 'A' as const,
    staffNotes: 'Pepper had a great day!',
    activities: ['playtime', 'nap', 'outdoor'] as Activity[],
    // Real staff names from the website
    realStaffNames: ['Jane Smith', 'John Doe'],
    friends: ['Max', 'Luna'],
    photos: ['2024-11-15-001.jpg'],
  };

  // 2. Process staff names (auto-registers + anonymizes)
  const anonymizedStaffNames = processStaffNames(scrapedData.realStaffNames);

  // 3. Build report card with anonymized names
  const reportCard: ReportCard = {
    date: scrapedData.date,
    grade: scrapedData.grade,
    staffNotes: scrapedData.staffNotes,
    activities: scrapedData.activities,
    staffNames: anonymizedStaffNames, // ← Anonymized!
    friends: scrapedData.friends,
    photos: scrapedData.photos,
  };

  console.log('✓ Report card processed');
  console.log(`  Real names: ${scrapedData.realStaffNames.join(', ')}`);
  console.log(`  Anonymized: ${anonymizedStaffNames.join(', ')}`);

  return reportCard;
}

/**
 * Example: Backfill with verbose logging
 */
async function exampleBackfill() {
  const dates = ['2024-11-01', '2024-11-02', '2024-11-03'];

  for (const date of dates) {
    console.log(`\nProcessing ${date}...`);

    // Use verbose mode to see when new staff are discovered
    const realNames = ['Jane Smith']; // From scraping

    const anonymized = processStaffNames(realNames, {
      autoRegister: true,
      verbose: true,
    });

    console.log(`  Staff: ${anonymized.join(', ')}`);
  }
}

export { exampleScrapeReportCard, exampleBackfill };
