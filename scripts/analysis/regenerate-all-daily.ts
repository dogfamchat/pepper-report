#!/usr/bin/env bun

/**
 * Regenerate All Daily Analysis Files
 *
 * Force regeneration of all daily analysis files.
 * Use this when the DailyAnalysis interface changes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractDaily, saveDailyAnalysis } from './extract-daily';
import { readAllReportCards, readReportCard } from './report-reader';

async function main() {
  console.log('🔄 Regenerating All Daily Analysis Files\n');
  console.log('═══════════════════════════════════════\n');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ANTHROPIC_API_KEY environment variable not set');
    console.error('   Please set your Anthropic API key in .env file');
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });

  // Find all report cards
  const allReports = readAllReportCards();
  const reportFiles = allReports.map((r) => `${r.date}.json`);

  console.log(`📖 Found ${reportFiles.length} report cards to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of reportFiles) {
    const date = file.replace('.json', '');
    try {
      process.stdout.write(`   ${date}...`);

      const report = readReportCard(date);
      if (!report) {
        console.log(' ❌ (report not found)');
        errorCount++;
        continue;
      }

      const analysis = await extractDaily(report, anthropic, false);
      saveDailyAnalysis(analysis);

      console.log(' ✅');
      successCount++;

      // Small delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.log(` ❌ (${error})`);
      errorCount++;
    }
  }

  console.log('\n═══════════════════════════════════════\n');
  console.log(`✅ Regeneration complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('\n💡 Next: Run bun run scripts/analysis/aggregate.ts\n');
}

main();
