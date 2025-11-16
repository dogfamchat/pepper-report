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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { Grade, ReportCard } from '../types';
import { getCurrentTimestamp } from '../utils/date-utils';
import { gradeToNumber, readReportCard } from './report-reader';

// Load learned mappings (cached from previous AI categorizations)
const LEARNED_ACTIVITY_MAPPINGS: Record<string, string[]> = JSON.parse(
  readFileSync(
    join(process.cwd(), 'scripts', 'analysis', 'learned-activity-mappings.json'),
    'utf-8',
  ),
);
const LEARNED_TRAINING_MAPPINGS: Record<string, string> = JSON.parse(
  readFileSync(
    join(process.cwd(), 'scripts', 'analysis', 'learned-training-mappings.json'),
    'utf-8',
  ),
);

/**
 * AI-suggested category for an activity or training skill
 */
export interface AICategorization {
  /** The activity or training skill name */
  item: string;
  /** AI-suggested category */
  category: string;
  /** Confidence level (0-1) */
  confidence?: number;
}

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
  /** Raw activities (for frequency tracking and AI categorization) */
  rawActivities: string[];
  /** Raw training skills (for frequency tracking and AI categorization) */
  rawTrainingSkills: string[];
  /** AI-suggested categories for activities */
  aiActivityCategories?: AICategorization[];
  /** AI-suggested categories for training skills */
  aiTrainingCategories?: AICategorization[];
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
 * Categorize activities and training skills using Claude API
 */
async function categorizeWithAI(
  activities: string[],
  trainingSkills: string[],
  date: string,
  anthropic: Anthropic,
  verbose = false,
): Promise<{
  activityCategories: AICategorization[];
  trainingCategories: AICategorization[];
}> {
  // If nothing to categorize, return empty arrays
  if (activities.length === 0 && trainingSkills.length === 0) {
    return { activityCategories: [], trainingCategories: [] };
  }

  // First, check learned mappings for all items
  const activityCategories: AICategorization[] = [];
  const trainingCategories: AICategorization[] = [];
  const unmappedActivities: string[] = [];
  const unmappedTraining: string[] = [];

  // Check activities against learned mappings
  for (const activity of activities) {
    const categories = LEARNED_ACTIVITY_MAPPINGS[activity];
    if (categories) {
      // Found in learned mappings - use cached categorization
      for (const category of categories) {
        activityCategories.push({ item: activity, category });
      }
    } else {
      // Not found - will need AI categorization
      unmappedActivities.push(activity);
    }
  }

  // Check training skills against learned mappings
  for (const skill of trainingSkills) {
    const category = LEARNED_TRAINING_MAPPINGS[skill];
    if (category) {
      // Found in learned mappings - use cached categorization
      trainingCategories.push({ item: skill, category });
    } else {
      // Not found - will need AI categorization
      unmappedTraining.push(skill);
    }
  }

  // If everything was found in learned mappings, we're done!
  if (unmappedActivities.length === 0 && unmappedTraining.length === 0) {
    if (verbose) {
      console.log(`   ✅ All items found in learned mappings (no AI call needed)`);
    }
    return { activityCategories, trainingCategories };
  }

  // Log what needs AI categorization
  if (verbose && (unmappedActivities.length > 0 || unmappedTraining.length > 0)) {
    console.log(
      `   🤖 Calling AI for unmapped items: ${unmappedActivities.length} activities, ${unmappedTraining.length} training`,
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a dog daycare report card. Categorize the following activities and training skills into appropriate categories.

ACTIVITIES to categorize: ${JSON.stringify(unmappedActivities)}

Suggested activity categories:
- playtime: Playing with toys, buddies, or general play activities
- socialization: Interacting with other dogs or making friends
- rest: Napping, resting, quiet time
- outdoor: Outside activities, pool parties, outdoor play
- enrichment: Brain games, puzzles, nose work, mental stimulation
- training: One-on-one trainer time, agility equipment, structured training
- special_event: Birthday parties, special celebrations

TRAINING SKILLS to categorize: ${JSON.stringify(unmappedTraining)}

Suggested training categories:
- obedience_commands: Basic commands like sit, down, stand, recall, name recognition
- impulse_control_focus: Impulse control, focus work, settle down exercises
- physical_skills: Agility, balancing, physical coordination, confidence building
- handling_manners: Collar grab, handling, loose-leash walking, boundaries, place work, crate training
- advanced_training: Sequences, recall with distractions, hands-free work
- fun_skills: Trick training, nose targeting, playful skills

Return categorizations for each item. Activities can belong to multiple categories if appropriate.`,
        },
      ],
      tools: [
        {
          name: 'categorize_activities',
          description:
            'Categorize dog daycare activities and training skills into appropriate categories.',
          input_schema: {
            type: 'object',
            properties: {
              activities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    item: { type: 'string', description: 'The activity name' },
                    categories: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Category names (can be multiple for activities)',
                    },
                  },
                  required: ['item', 'categories'],
                },
                description: 'Categorized activities',
              },
              training: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    item: { type: 'string', description: 'The training skill name' },
                    category: { type: 'string', description: 'Single category name' },
                  },
                  required: ['item', 'category'],
                },
                description: 'Categorized training skills',
              },
            },
            required: ['activities', 'training'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'categorize_activities' },
    });

    if (verbose) {
      console.log(`   AI Categorization Response:`, JSON.stringify(message.content, null, 2));
    }

    // Extract categorizations from tool use response
    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use') {
      const input = toolUse.input as {
        activities?: Array<{ item: string; categories: string[] }>;
        training?: Array<{ item: string; category: string }>;
      };

      // Convert AI results for activities (can have multiple categories) to flat list
      const aiActivityResults: AICategorization[] =
        input.activities?.flatMap((act) =>
          act.categories.map((cat) => ({
            item: act.item,
            category: cat,
          })),
        ) || [];

      // Convert AI results for training (single category each)
      const aiTrainingResults: AICategorization[] =
        input.training?.map((skill) => ({
          item: skill.item,
          category: skill.category,
        })) || [];

      // Merge AI results with learned mappings
      return {
        activityCategories: [...activityCategories, ...aiActivityResults],
        trainingCategories: [...trainingCategories, ...aiTrainingResults],
      };
    }

    // No tool use found - return learned mappings only
    return { activityCategories, trainingCategories };
  } catch (error) {
    console.error(`   ❌ AI categorization error for ${date}:`, error);
    // On error, return what we got from learned mappings
    return { activityCategories, trainingCategories };
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

  // Extract raw activity and training data
  const rawActivities = report.whatIDidToday || [];
  const rawTrainingSkills = report.trainingSkills || [];

  if (verbose) {
    console.log(`   Activities: ${rawActivities.length}`);
    console.log(`   Training skills: ${rawTrainingSkills.length}`);
  }

  // Extract behavior data directly from report card
  const caughtBeingGood = report.caughtBeingGood || [];
  const ooops = report.ooops || [];

  if (verbose) {
    console.log(`   Caught Being Good: ${caughtBeingGood.length}`);
    console.log(`   Ooops: ${ooops.length}`);
  }

  // AI categorization for activities and training
  if (verbose) {
    console.log(`   Running AI categorization...`);
  }
  const aiCategorization = await categorizeWithAI(
    rawActivities,
    rawTrainingSkills,
    report.date,
    anthropic,
    verbose,
  );

  if (verbose) {
    console.log(`   AI Activity Categories: ${aiCategorization.activityCategories.length}`);
    console.log(`   AI Training Categories: ${aiCategorization.trainingCategories.length}`);
  }

  return {
    date: report.date,
    grade: report.grade,
    gradeNumeric: gradeToNumber(report.grade),
    friends,
    comment: report.noteworthyComments,
    rawActivities,
    rawTrainingSkills,
    aiActivityCategories: aiCategorization.activityCategories,
    aiTrainingCategories: aiCategorization.trainingCategories,
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
    console.log(`\n🤖 Extracting data with Claude API (friends + categorization)...`);
    const startTime = Date.now();
    const analysis = await extractDaily(report, anthropic, options.verbose);
    const duration = Date.now() - startTime;

    console.log(`✅ Extraction complete (${(duration / 1000).toFixed(1)}s)`);
    if (analysis.friends.length > 0) {
      console.log(`   Friends: ${analysis.friends.join(', ')}`);
    } else {
      console.log(`   No friends mentioned`);
    }
    console.log(
      `   AI Categories: ${(analysis.aiActivityCategories?.length || 0) + (analysis.aiTrainingCategories?.length || 0)} items categorized`,
    );

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
