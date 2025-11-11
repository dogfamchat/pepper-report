#!/usr/bin/env bun

/**
 * Extract Daily Analysis
 *
 * Processes a single report card and extracts analysis data to a daily file.
 * This allows incremental processing - only new reports need AI extraction.
 *
 * Features:
 * - AI-powered friend name extraction (Claude API)
 * - Grade extraction and conversion
 * - Activity categorization (rules-based, no AI)
 * - Training skill categorization (rules-based, no AI)
 * - Idempotent: safe to re-run on existing dates
 *
 * Usage:
 *   bun run scripts/analysis/extract-daily.ts --date 2025-08-08
 *   bun run scripts/analysis/extract-daily.ts --date 2025-08-08 --force
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { Grade, ReportCard } from '../types';
import { getCurrentTimestamp } from '../utils/date-utils';
import type { ActivityCategory, TrainingCategory } from './activity-categories';
import { categorizeReport } from './activity-categorizer';
import { gradeToNumber, readReportCard } from './report-reader';

/**
 * Daily analysis data structure
 * Stored once per report card, never recalculated
 */
export interface DailyAnalysis {
  /** ISO date format: YYYY-MM-DD */
  date: string;
  /** Letter grade from report card */
  grade: Grade;
  /** Numeric grade for averaging (A=4.0, B=3.0, etc.) */
  gradeNumeric: number;
  /** Dog friend names extracted from noteworthyComments via Claude API */
  friends: string[];
  /** Raw comment text (for reference) */
  comment: string;
  /** Activity category counts (aggregated view) */
  activityCounts: Record<ActivityCategory, number>;
  /** Training category counts (aggregated view) */
  trainingCounts: Record<TrainingCategory, number>;
  /** Raw activities (detailed view) */
  rawActivities: string[];
  /** Raw training skills (detailed view) */
  rawTrainingSkills: string[];
  /** Positive behaviors from caughtBeingGood array */
  caughtBeingGood: string[];
  /** Negative behaviors from ooops array */
  ooops: string[];
  /** Timestamp when this analysis was generated */
  analyzedAt: string;
}

interface ExtractOptions {
  date: string;
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ExtractOptions {
  const args = process.argv.slice(2);
  const options: ExtractOptions = {
    date: '',
    force: false,
    verbose: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--date':
        options.date = args[++i];
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Daily Analysis Extractor - Process a single report card

Usage:
  bun run scripts/analysis/extract-daily.ts --date YYYY-MM-DD [options]

Options:
  --date YYYY-MM-DD   Report card date to process (required)
  --force, -f         Force re-extraction even if analysis exists
  --verbose, -v       Verbose logging (show API responses)
  --dry-run           Process without saving output
  --help, -h          Show this help message

Environment:
  ANTHROPIC_API_KEY   Required - Your Anthropic API key

Examples:
  bun run scripts/analysis/extract-daily.ts --date 2025-08-08
  bun run scripts/analysis/extract-daily.ts --date 2025-08-08 --force --verbose
`);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Extract friend names from noteworthy comments using Claude API
 */
async function extractFriendsFromComment(
  comment: string,
  date: string,
  anthropic: Anthropic,
  verbose = false,
): Promise<string[]> {
  if (!comment || comment.trim().length === 0) {
    return [];
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Extract all dog friend names mentioned in this daycare report comment. If no friends are mentioned, return an empty array.

Comment: "${comment}"`,
        },
      ],
      tools: [
        {
          name: 'record_friends',
          description: 'Record the names of dog friends mentioned in the daycare report comment.',
          input_schema: {
            type: 'object',
            properties: {
              friends: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'First name only of a dog friend, in proper case',
                },
                description: 'Array of dog friend names mentioned in the comment',
              },
            },
            required: ['friends'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'record_friends' },
    });

    if (verbose) {
      console.log(`   API Response:`, JSON.stringify(message.content, null, 2));
    }

    // Extract friends from tool use response
    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use') {
      const input = toolUse.input as { friends?: string[] };
      const friends = input.friends || [];

      // Filter and clean up names (exclude "Pepper" since that's our dog)
      return friends
        .filter((f) => typeof f === 'string')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
        .filter((f) => f.toLowerCase() !== 'pepper');
    }

    return [];
  } catch (error) {
    console.error(`   ❌ API error for ${date}:`, error);
    return [];
  }
}

/**
 * Extract analysis data for a single report card
 */
async function extractDaily(
  report: ReportCard,
  anthropic: Anthropic,
  verbose = false,
): Promise<DailyAnalysis> {
  if (verbose) {
    console.log(`\n📄 Processing report card:`);
    console.log(`   Date: ${report.date}`);
    console.log(`   Grade: ${report.grade}`);
    console.log(`   Comment: "${report.noteworthyComments.substring(0, 100)}..."`);
  }

  // Extract friends using Claude API
  const friends = await extractFriendsFromComment(
    report.noteworthyComments,
    report.date,
    anthropic,
    verbose,
  );

  if (verbose && friends.length > 0) {
    console.log(`   Friends found: ${friends.join(', ')}`);
  }

  // Categorize activities and training skills (no AI needed - pure logic)
  const categorization = categorizeReport(report);

  if (verbose) {
    console.log(`   Activities: ${categorization.totalActivities}`);
    console.log(`   Training skills: ${categorization.totalTrainingSkills}`);
  }

  // Extract behavior data directly from report card
  const caughtBeingGood = report.caughtBeingGood || [];
  const ooops = report.ooops || [];

  if (verbose) {
    console.log(`   Caught Being Good: ${caughtBeingGood.length}`);
    console.log(`   Ooops: ${ooops.length}`);
  }

  return {
    date: report.date,
    grade: report.grade,
    gradeNumeric: gradeToNumber(report.grade),
    friends,
    comment: report.noteworthyComments,
    activityCounts: categorization.activityCounts,
    trainingCounts: categorization.trainingCounts,
    rawActivities: categorization.rawActivities,
    rawTrainingSkills: categorization.rawTrainingSkills,
    analyzedAt: getCurrentTimestamp(),
    caughtBeingGood,
    ooops,

  };
}

/**
 * Save daily analysis to disk
 */
function saveDailyAnalysis(analysis: DailyAnalysis): void {
  const dailyDir = join(process.cwd(), 'data', 'analysis', 'daily');

  // Ensure directory exists
  if (!existsSync(dailyDir)) {
    mkdirSync(dailyDir, { recursive: true });
  }

  const outputFile = join(dailyDir, `${analysis.date}.json`);
  writeFileSync(outputFile, `${JSON.stringify(analysis, null, 2)}\n`, 'utf-8');
}

/**
 * Check if daily analysis already exists
 */
function dailyAnalysisExists(date: string): boolean {
  const dailyFile = join(process.cwd(), 'data', 'analysis', 'daily', `${date}.json`);
  return existsSync(dailyFile);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  if (!options.date) {
    console.error('❌ Error: --date parameter is required');
    console.error('   Usage: bun run scripts/analysis/extract-daily.ts --date 2025-08-08');
    process.exit(1);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.error(`❌ Error: Invalid date format "${options.date}"`);
    console.error('   Expected format: YYYY-MM-DD');
    process.exit(1);
  }

  console.log(`📊 Daily Analysis Extractor\n`);
  console.log(`Date: ${options.date}`);

  // Check if analysis already exists
  if (dailyAnalysisExists(options.date) && !options.force) {
    console.log(`⏭️  Analysis already exists for ${options.date}`);
    console.log('   Use --force to re-extract');
    process.exit(0);
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ANTHROPIC_API_KEY environment variable not set');
    console.error('   Please set your Anthropic API key in .env file');
    console.error('   Run: op inject -i .env.template -o .env');
    process.exit(1);
  }

  try {
    // Read report card
    console.log(`\n📖 Reading report card...`);
    const report = readReportCard(options.date);

    if (!report) {
      console.error(`❌ Report card not found for ${options.date}`);
      console.error(
        `   Expected location: data/reports/${options.date.substring(0, 4)}/${options.date}.json`,
      );
      process.exit(1);
    }

    console.log(`✅ Report card found`);

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Extract analysis
    console.log(`\n🤖 Extracting friends with Claude API...`);
    const startTime = Date.now();
    const analysis = await extractDaily(report, anthropic, options.verbose);
    const duration = Date.now() - startTime;

    console.log(`✅ Extraction complete (${(duration / 1000).toFixed(1)}s)`);
    if (analysis.friends.length > 0) {
      console.log(`   Friends: ${analysis.friends.join(', ')}`);
    } else {
      console.log(`   No friends mentioned`);
    }

    if (options.dryRun) {
      console.log('\n🔍 Dry run - not saving file');
      console.log('\nExtracted data:');
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Save to disk
    console.log(`\n💾 Saving daily analysis...`);
    saveDailyAnalysis(analysis);
    console.log(`✅ Saved: data/analysis/daily/${analysis.date}.json`);

    console.log('\n✅ Daily analysis complete!\n');
  } catch (error) {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { dailyAnalysisExists, extractDaily, saveDailyAnalysis };

// Run if called directly
if (import.meta.main) {
  main();
}