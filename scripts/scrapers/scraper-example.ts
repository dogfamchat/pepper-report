/**
 * Example Scraper Template
 *
 * This template demonstrates how to use the staff utilities
 * to automatically register and anonymize staff names.
 */

import type { ReportCard } from '../types';
import { processStaffNames } from '../utils/staff-utils';

/**
 * Example: Process a scraped report card
 */
async function exampleScrapeReportCard(date: string): Promise<ReportCard> {
  // 1. Scrape the report card (pseudo-code)
  const scrapedData = {
    date: date,
    completedDateTime: '2024-11-15T15:30:00Z',
    dog: {
      name: 'Pepper',
      owners: 'John & Nadine',
    },
    grade: 'A' as const,
    gradeDescription: 'Excellent behavior!',
    bestPartOfDay: 'playing with familiar friends.',
    whatIDidToday: ['playtime', 'nap', 'outdoor'],
    trainingSkills: ['recall', 'sit'],
    caughtBeingGood: ['sharing toys'],
    ooops: [],
    noteworthyComments: 'Pepper had a great day!',
    // Real staff names from the website
    realStaffNames: ['Jane Smith', 'John Doe'],
    photos: ['2024-11-15-001.jpg'],
    metadata: {
      addedBy: 'Jane Smith',
      completedBy: 'John Doe',
    },
  };

  // 2. Process staff names (auto-registers + anonymizes)
  const anonymizedStaffNames = processStaffNames(scrapedData.realStaffNames);
  const anonymizedMetadata = {
    addedBy: processStaffNames([scrapedData.metadata.addedBy])[0],
    completedBy: processStaffNames([scrapedData.metadata.completedBy])[0],
  };

  // 3. Build report card with anonymized names
  const reportCard: ReportCard = {
    date: scrapedData.date,
    completedDateTime: scrapedData.completedDateTime,
    dog: scrapedData.dog,
    grade: scrapedData.grade,
    gradeDescription: scrapedData.gradeDescription,
    bestPartOfDay: scrapedData.bestPartOfDay,
    whatIDidToday: scrapedData.whatIDidToday,
    trainingSkills: scrapedData.trainingSkills,
    caughtBeingGood: scrapedData.caughtBeingGood,
    ooops: scrapedData.ooops,
    noteworthyComments: scrapedData.noteworthyComments,
    staffNames: anonymizedStaffNames, // ← Anonymized!
    photos: scrapedData.photos,
    metadata: anonymizedMetadata, // ← Anonymized metadata!
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
