#!/usr/bin/env bun

/**
 * Main Analysis Orchestrator (Incremental)
 *
 * Processes report cards incrementally:
 * 1. Extract daily analysis for NEW report cards (with Claude API)
 * 2. Aggregate all daily files into trends and statistics (no API calls)
 *
 * Default behavior: Only process new reports (reports without daily analysis)
 *
 * Usage:
 *   bun run scripts/analysis/analyze-all.ts           # Process new reports only
 *   bun run scripts/analysis/analyze-all.ts --full    # Re-process all reports
 *   bun run scripts/analysis/analyze-all.ts --date 2025-08-08  # Process specific date
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import {
  analyzeActivityBreakdown,
  analyzeFriendStats,
  analyzeGradeTrends,
  generateActivityCategoryViz,
  generateActivityFrequencyViz,
  generateFriendNetworkViz,
  generateGradeTimeline,
  generateTrainingCategoryViz,
  generateTrainingFrequencyViz,
} from './aggregate';
import type { DailyAnalysis } from './extract-daily';
import { dailyAnalysisExists, extractDaily, saveDailyAnalysis } from './extract-daily';
import { readAllReportCards, readReportCard } from './report-reader';

interface AnalyzeOptions {
  verbose?: boolean;
  full?: boolean;
  date?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AnalyzeOptions {
  const args = process.argv.slice(2);
  const options: AnalyzeOptions = {
    verbose: false,
    full: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--full':
      case '-f':
        options.full = true;
        break;
      case '--date':
        options.date = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Analysis Orchestrator - Incremental Analysis Pipeline

Usage:
  bun run scripts/analysis/analyze-all.ts [options]

Options:
  --verbose, -v       Verbose logging (show API responses)
  --full, -f          Re-process all reports (force re-extract with API)
  --date YYYY-MM-DD   Process specific date only
  --help, -h          Show this help message

Behavior:
  Default (no flags)  Only process NEW reports (no daily analysis file yet)
  --full              Re-extract all reports (use after structure changes)
  --date              Process single date (useful for fixing specific days)

Examples:
  bun run scripts/analysis/analyze-all.ts                 # Incremental (new only)
  bun run scripts/analysis/analyze-all.ts --full          # Full re-process
  bun run scripts/analysis/analyze-all.ts --date 2025-08-08  # Single date
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Read all daily analysis files
 */
function readAllDailyAnalysis(): DailyAnalysis[] {
  const dailyDir = join(process.cwd(), 'data', 'analysis', 'daily');

  if (!existsSync(dailyDir)) {
    return [];
  }

  const files = readdirSync(dailyDir).filter((f) => f.endsWith('.json'));
  const analyses: DailyAnalysis[] = [];

  for (const file of files) {
    try {
      const content = require('node:fs').readFileSync(join(dailyDir, file), 'utf-8');
      const analysis = JSON.parse(content) as DailyAnalysis;
      analyses.push(analysis);
    } catch (error) {
      console.error(`⚠️  Error reading ${file}:`, error);
    }
  }

  return analyses.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Find report cards that need daily analysis extraction
 */
function findReportsNeedingExtraction(options: AnalyzeOptions): string[] {
  const reports = readAllReportCards();

  if (options.date) {
    // Process specific date
    return [options.date];
  }

  if (options.full) {
    // Process all reports
    return reports.map((r) => r.date);
  }

  // Default: Find reports without daily analysis
  return reports.filter((r) => !dailyAnalysisExists(r.date)).map((r) => r.date);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  console.log('🔬 Pepper Report Card Analysis Pipeline (Incremental)\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Check for API key (needed for extraction step)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY environment variable not set');
      console.error('   Please set your Anthropic API key in .env file');
      console.error('   Run: op inject -i .env.template -o .env');
      process.exit(1);
    }

    // STEP 1: Extract daily analysis for new/specified reports
    console.log('📖 Finding reports to process...');
    const reportsToProcess = findReportsNeedingExtraction(options);

    if (reportsToProcess.length === 0) {
      console.log('✅ All reports already have daily analysis');
      console.log('   Skipping extraction step (no API calls needed)\n');
    } else {
      console.log(
        `📊 Found ${reportsToProcess.length} report${reportsToProcess.length === 1 ? '' : 's'} to process`,
      );

      if (options.full) {
        console.log('   Mode: FULL re-extraction (--full)');
      } else if (options.date) {
        console.log(`   Mode: Single date (${options.date})`);
      } else {
        console.log('   Mode: Incremental (new reports only)');
      }

      console.log(`\n🤖 Extracting daily analysis with Claude API...`);
      const anthropic = new Anthropic({ apiKey });
      const startTime = Date.now();

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < reportsToProcess.length; i++) {
        const date = reportsToProcess[i];
        const progress = `[${i + 1}/${reportsToProcess.length}]`;

        process.stdout.write(`\r   ${progress} Processing ${date}...`);

        try {
          const report = readReportCard(date);
          if (!report) {
            console.error(`\n   ⚠️  Report card not found: ${date}`);
            errorCount++;
            continue;
          }

          const analysis = await extractDaily(report, anthropic, options.verbose);
          saveDailyAnalysis(analysis);

          if (analysis.friends.length > 0) {
            process.stdout.write(` ✓ ${analysis.friends.join(', ')}`);
          } else {
            process.stdout.write(` ✓`);
          }

          successCount++;

          // Small delay to respect API rate limits
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`\n   ❌ Error processing ${date}:`, error);
          errorCount++;
        }
      }

      console.log(''); // New line after progress
      const duration = Date.now() - startTime;
      console.log(`\n✅ Extraction complete (${(duration / 1000).toFixed(1)}s)`);
      console.log(`   Success: ${successCount}, Errors: ${errorCount}\n`);

      // Estimate API cost
      const estimatedTokens = successCount * 150; // ~150 tokens per request
      const estimatedCost = (estimatedTokens / 1_000_000) * 0.25; // Haiku pricing
      console.log(`💰 Estimated API cost: $${estimatedCost.toFixed(4)}`);
      console.log(`   (${estimatedTokens.toLocaleString()} tokens at Haiku rates)\n`);
    }

    // STEP 2: Aggregate all daily analyses (no API calls!)
    console.log('📈 Aggregating daily analysis files...');
    const analyses = readAllDailyAnalysis();

    if (analyses.length === 0) {
      console.error('❌ No daily analysis files found');
      console.error('   Run extraction step first to process report cards');
      process.exit(1);
    }

    console.log(`✅ Found ${analyses.length} daily analysis files`);
    console.log(`   Date range: ${analyses[0].date} to ${analyses[analyses.length - 1].date}`);

    // Aggregate grade trends
    const trends = analyzeGradeTrends(analyses);
    console.log(
      `   Overall average: ${trends.summary.overallAverageGrade.toFixed(2)}/4.0 (${trends.summary.overallAverageGrade >= 3.5 ? 'Excellent!' : 'Good!'})`,
    );

    // Aggregate friend statistics
    const topFriends = analyzeFriendStats(analyses);
    console.log(`   Unique friends: ${topFriends.friends.length}`);

    // Aggregate activity breakdown
    const activityBreakdown = analyzeActivityBreakdown(analyses);

    // Generate visualization data
    const timeline = generateGradeTimeline(analyses);
    const friendNetworkViz = generateFriendNetworkViz(topFriends);
    const activityCategoryViz = generateActivityCategoryViz(activityBreakdown);
    const trainingCategoryViz = generateTrainingCategoryViz(activityBreakdown);
    const activityFrequencyViz = generateActivityFrequencyViz(activityBreakdown);
    const trainingFrequencyViz = generateTrainingFrequencyViz(activityBreakdown);

    // STEP 3: Save aggregated results
    console.log('\n💾 Saving aggregated data...');
    const aggregatesDir = join(process.cwd(), 'data', 'analysis', 'aggregates');
    const vizDir = join(process.cwd(), 'data', 'viz');

    // Ensure directories exist
    if (!existsSync(aggregatesDir)) {
      mkdirSync(aggregatesDir, { recursive: true });
    }
    if (!existsSync(vizDir)) {
      mkdirSync(vizDir, { recursive: true });
    }

    // Save grade trends
    const gradeTrendsFile = join(aggregatesDir, 'grade-trends.json');
    writeFileSync(gradeTrendsFile, `${JSON.stringify(trends, null, 2)}\n`, 'utf-8');
    console.log('   ✅ data/analysis/aggregates/grade-trends.json');

    // Save weekly summary (latest week)
    if (trends.weekly.length > 0) {
      const latestWeek = trends.weekly[trends.weekly.length - 1];
      const weeklySummaryFile = join(aggregatesDir, 'weekly-summary.json');
      writeFileSync(weeklySummaryFile, `${JSON.stringify(latestWeek, null, 2)}\n`, 'utf-8');
      console.log('   ✅ data/analysis/aggregates/weekly-summary.json');
    }

    // Save top friends
    const topFriendsFile = join(aggregatesDir, 'top-friends.json');
    writeFileSync(topFriendsFile, `${JSON.stringify(topFriends, null, 2)}\n`, 'utf-8');
    console.log('   ✅ data/analysis/aggregates/top-friends.json');

    // Save visualization data
    const gradeTimelineFile = join(vizDir, 'grade-timeline.json');
    writeFileSync(gradeTimelineFile, `${JSON.stringify(timeline, null, 2)}\n`, 'utf-8');
    console.log('   ✅ data/viz/grade-timeline.json');

    const friendNetworkFile = join(vizDir, 'friend-network.json');
    writeFileSync(friendNetworkFile, `${JSON.stringify(friendNetworkViz, null, 2)}\n`, 'utf-8');
    console.log('   ✅ data/viz/friend-network.json');

    // Save activity breakdown
    const activityBreakdownFile = join(aggregatesDir, 'activity-breakdown.json');
    writeFileSync(
      activityBreakdownFile,
      `${JSON.stringify(activityBreakdown, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/analysis/aggregates/activity-breakdown.json');

    // Save activity visualization data
    const activityCategoryFile = join(vizDir, 'activity-categories.json');
    writeFileSync(
      activityCategoryFile,
      `${JSON.stringify(activityCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/activity-categories.json');

    const trainingCategoryFile = join(vizDir, 'training-categories.json');
    writeFileSync(
      trainingCategoryFile,
      `${JSON.stringify(trainingCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/training-categories.json');

    const activityFrequencyFile = join(vizDir, 'activity-frequency.json');
    writeFileSync(
      activityFrequencyFile,
      `${JSON.stringify(activityFrequencyViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/activity-frequency.json');

    const trainingFrequencyFile = join(vizDir, 'training-frequency.json');
    writeFileSync(
      trainingFrequencyFile,
      `${JSON.stringify(trainingFrequencyViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/training-frequency.json');

    // Summary
    console.log('\n═══════════════════════════════════════\n');
    console.log('✅ Analysis pipeline complete!\n');
    console.log('📊 Summary:');
    console.log(`   Reports analyzed: ${analyses.length}`);
    console.log(`   Weekly trends: ${trends.weekly.length} weeks`);
    console.log(`   Monthly trends: ${trends.monthly.length} months`);
    console.log(`   Top friends: ${topFriends.friends.length} unique\n`);
    console.log('💡 Next steps:');
    console.log('   - View the website: bun run dev');
    console.log('   - Deploy: bun run build\n');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
