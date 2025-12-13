#!/usr/bin/env bun

/**
 * Photo Analyzer with Claude Vision API
 *
 * Analyzes daycare photos using Claude's vision capabilities to:
 * - Score photo quality (composition, clarity, cuteness)
 * - Auto-tag what's happening in the photo
 * - Identify any visible dog friends
 *
 * Usage:
 *   bun tsx --env-file=.env scripts/analysis/analyze-photos.ts
 *   bun tsx --env-file=.env scripts/analysis/analyze-photos.ts --force
 *   bun tsx --env-file=.env scripts/analysis/analyze-photos.ts --dry-run
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentTimestamp } from '../utils/date-utils';

interface PhotoMetadata {
  filename: string;
  date: string;
  r2Url: string;
  thumbnailUrl: string;
  size: number;
  width: number;
  height: number;
  uploaded: string;
}

interface PhotosJson {
  _comment: string;
  photos: PhotoMetadata[];
  totalSize: number;
  count: number;
}

/**
 * Analysis results for a single photo
 */
export interface PhotoAnalysis {
  /** Photo filename */
  filename: string;
  /** Photo date */
  date: string;
  /** R2 URL */
  r2Url: string;
  /** Overall quality score (1-10) */
  qualityScore: number;
  /** Cuteness score (1-10) */
  cutenessScore: number;
  /** Composition score (1-10) */
  compositionScore: number;
  /** Combined score (average of all three) */
  overallScore: number;
  /** Auto-generated description of the photo */
  description: string;
  /** Tags describing what's happening */
  tags: string[];
  /** Activity detected (playing, resting, training, etc.) */
  activity: string;
  /** Dog friends visible in the photo (if any) */
  visibleFriends: string[];
  /** Whether Pepper is clearly visible */
  pepperVisible: boolean;
  /** Timestamp when analysis was performed */
  analyzedAt: string;
}

/**
 * Complete photo analysis data
 */
export interface PhotoAnalysisData {
  _comment: string;
  photos: PhotoAnalysis[];
  bestPhotos: string[]; // filenames of top 5 photos
  analyzedAt: string;
  totalPhotos: number;
  averageScore: number;
}

interface AnalyzeOptions {
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  limit?: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AnalyzeOptions {
  const args = process.argv.slice(2);
  const options: AnalyzeOptions = {
    force: false,
    verbose: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
      case '--limit':
        options.limit = Number.parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        console.log(`
Photo Analyzer - Analyze daycare photos with Claude Vision

Usage:
  bun tsx --env-file=.env scripts/analysis/analyze-photos.ts [options]

Options:
  --force, -f     Force re-analysis of all photos (ignore existing)
  --verbose, -v   Verbose logging (show API responses)
  --dry-run       Analyze without saving output
  --limit N       Only analyze first N photos (for testing)
  --help, -h      Show this help message

Environment:
  ANTHROPIC_API_KEY   Required - Your Anthropic API key

Examples:
  bun tsx --env-file=.env scripts/analysis/analyze-photos.ts
  bun tsx --env-file=.env scripts/analysis/analyze-photos.ts --limit 3 --verbose
  bun tsx --env-file=.env scripts/analysis/analyze-photos.ts --force
`);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Load existing photo analysis data
 */
function loadExistingAnalysis(): PhotoAnalysisData | null {
  const analysisFile = join(process.cwd(), 'data', 'analysis', 'photo-analysis.json');

  if (!existsSync(analysisFile)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(analysisFile, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Analyze a single photo using Claude Vision API
 */
async function analyzePhoto(
  photo: PhotoMetadata,
  anthropic: Anthropic,
  verbose = false,
  recentDescriptions: string[] = [],
): Promise<PhotoAnalysis> {
  console.log(`   📸 Analyzing ${photo.filename}...`);

  // Build context about recent descriptions to avoid repetition
  const recentContext =
    recentDescriptions.length > 0
      ? `\nRECENT DESCRIPTIONS (write something DIFFERENT - avoid similar phrasing, sentence structures, and opening words):\n${recentDescriptions.map((d, i) => `${i + 1}. "${d}"`).join('\n')}\n`
      : '';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: photo.r2Url,
            },
          },
          {
            type: 'text',
            text: `You are analyzing a photo from a dog daycare. Be objective and factual.

ABOUT THE DOG:
- Name: Pepper
- Breed: Vizsla
- Sex: Female
- Coat: Reddish/rust colored
- Eyes: Amber
- Build: Athletic, medium-sized

SCORING GUIDELINES (use the FULL 1-10 range critically):
- 9-10: Exceptional - professional quality, perfect moment captured, excellent lighting/composition
- 7-8: Good - clear subject, decent composition, nice moment
- 5-6: Average - adequate photo, nothing special, minor issues
- 3-4: Below average - blurry, poor lighting, awkward framing, subject partially visible
- 1-2: Poor - very blurry, subject barely visible, bad exposure

Most daycare photos should score 4-7. Reserve 8+ for truly standout shots.

DESCRIPTION GUIDELINES:
- Capture what makes THIS photo interesting or unique - the moment, the mood, the action
- Write with warmth and personality, but stay grounded in what you actually see
- AVOID overused clichés: adorable, sweet, gorgeous, soulful, precious, cute, beautiful
- AVOID repetitive phrases across photos - do NOT keep using: "classic head tilt", "amber eyes", "something caught her attention", "those expressive eyes"
- VARY your sentence structure - don't start every caption with "Pepper..." or "Close-up of..." or "That classic..."
- Focus on the story or moment: What's happening? What's the vibe? What makes this photo different from others?
- Find FRESH ways to describe similar poses - if it's a head tilt, what ELSE is interesting about it?
- Good examples: "Mid-wrestle with a golden retriever friend.", "Late afternoon light casts fence shadows as Pepper surveys her kingdom.", "Nap time for most of the pack, but Pepper's staying alert.", "Someone mentioned the T-word (treats) and now she's locked in."
- Bad examples: "Close-up shot of Pepper in the outdoor area.", "Classic head tilt moment.", "Those amber eyes...", "Something has caught her attention."
${recentContext}
Provide:
1. Quality scores (qualityScore, cutenessScore, compositionScore) - BE CRITICAL, use full 1-10 range
2. A brief engaging caption (1-2 sentences) - warm but not clichéd
3. Tags describing the scene
4. Main activity (playing, resting, training, socializing, eating, exploring, posing, other)
5. Names of other dogs visible (if identifiable)
6. Whether Pepper is clearly visible`,
          },
        ],
      },
    ],
    tools: [
      {
        name: 'record_photo_analysis',
        description: 'Record the analysis results for a daycare photo',
        input_schema: {
          type: 'object',
          properties: {
            qualityScore: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Overall image quality score (1-10)',
            },
            cutenessScore: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Cuteness/adorability score (1-10)',
            },
            compositionScore: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Photo composition score (1-10)',
            },
            description: {
              type: 'string',
              description: 'Brief engaging description for photo caption (1-2 sentences)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags describing the scene',
            },
            activity: {
              type: 'string',
              enum: [
                'playing',
                'resting',
                'training',
                'socializing',
                'eating',
                'exploring',
                'posing',
                'other',
              ],
              description: 'Main activity shown in photo',
            },
            visibleFriends: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of other dogs visible (if identifiable)',
            },
            pepperVisible: {
              type: 'boolean',
              description: 'Whether Pepper is clearly visible in the photo',
            },
          },
          required: [
            'qualityScore',
            'cutenessScore',
            'compositionScore',
            'description',
            'tags',
            'activity',
            'visibleFriends',
            'pepperVisible',
          ],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'record_photo_analysis' },
  });

  if (verbose) {
    console.log(`   API Response:`, JSON.stringify(message.content, null, 2));
  }

  // Extract analysis from tool use response
  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No tool use response from API');
  }

  const input = toolUse.input as {
    qualityScore: number;
    cutenessScore: number;
    compositionScore: number;
    description: string;
    tags: string[];
    activity: string;
    visibleFriends: string[];
    pepperVisible: boolean;
  };

  const overallScore = Number(
    ((input.qualityScore + input.cutenessScore + input.compositionScore) / 3).toFixed(1),
  );

  return {
    filename: photo.filename,
    date: photo.date,
    r2Url: photo.r2Url,
    qualityScore: input.qualityScore,
    cutenessScore: input.cutenessScore,
    compositionScore: input.compositionScore,
    overallScore,
    description: input.description,
    tags: input.tags,
    activity: input.activity,
    visibleFriends: input.visibleFriends,
    pepperVisible: input.pepperVisible,
    analyzedAt: getCurrentTimestamp(),
  };
}

/**
 * Save photo analysis data
 */
function saveAnalysis(data: PhotoAnalysisData): void {
  const analysisDir = join(process.cwd(), 'data', 'analysis');
  const analysisFile = join(analysisDir, 'photo-analysis.json');

  if (!existsSync(analysisDir)) {
    mkdirSync(analysisDir, { recursive: true });
  }

  writeFileSync(analysisFile, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.log(`\n✅ Saved photo analysis to ${analysisFile}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🖼️  Photo Analyzer with Claude Vision\n');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load photos.json
  const photosFile = join(process.cwd(), 'photos.json');
  if (!existsSync(photosFile)) {
    console.error('❌ photos.json not found');
    process.exit(1);
  }

  const photosData: PhotosJson = JSON.parse(readFileSync(photosFile, 'utf-8'));
  console.log(`📁 Found ${photosData.count} photos to analyze`);

  // Load existing analysis
  const existingAnalysis = loadExistingAnalysis();
  const existingPhotos = new Set(existingAnalysis?.photos.map((p) => p.filename) || []);

  // Determine which photos to analyze
  let photosToAnalyze = photosData.photos;

  if (!options.force && existingAnalysis) {
    photosToAnalyze = photosData.photos.filter((p) => !existingPhotos.has(p.filename));
    console.log(`   ${existingPhotos.size} already analyzed, ${photosToAnalyze.length} new`);
  }

  if (options.limit) {
    photosToAnalyze = photosToAnalyze.slice(0, options.limit);
    console.log(`   Limited to ${options.limit} photos`);
  }

  if (photosToAnalyze.length === 0) {
    console.log('\n✅ All photos already analyzed. Use --force to re-analyze.');
    return;
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({ apiKey });

  // Analyze photos
  console.log(`\n🤖 Analyzing ${photosToAnalyze.length} photos with Claude Vision...\n`);

  const newAnalyses: PhotoAnalysis[] = [];
  const recentDescriptions: string[] = []; // track recent descriptions to avoid repetition
  const MAX_RECENT = 8; // how many recent descriptions to include as context
  let successCount = 0;
  let errorCount = 0;

  for (const photo of photosToAnalyze) {
    try {
      const analysis = await analyzePhoto(photo, anthropic, options.verbose, recentDescriptions);
      newAnalyses.push(analysis);
      successCount++;

      // Add this description to recent list (keep last N)
      recentDescriptions.push(analysis.description);
      if (recentDescriptions.length > MAX_RECENT) {
        recentDescriptions.shift();
      }

      console.log(
        `      Score: ${analysis.overallScore}/10 | ${analysis.activity} | "${analysis.description.slice(0, 50)}..."`,
      );

      // Rate limiting: wait 1 second between requests
      if (photosToAnalyze.indexOf(photo) < photosToAnalyze.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Failed to analyze ${photo.filename}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Analysis complete: ${successCount} succeeded, ${errorCount} failed`);

  if (options.dryRun) {
    console.log('\n🔍 Dry run - would save:');
    console.log(JSON.stringify(newAnalyses, null, 2));
    return;
  }

  // Merge with existing analyses
  let allAnalyses: PhotoAnalysis[];
  if (options.force || !existingAnalysis) {
    allAnalyses = newAnalyses;
  } else {
    // Keep existing, add new
    const existingMap = new Map(existingAnalysis.photos.map((p) => [p.filename, p]));
    for (const analysis of newAnalyses) {
      existingMap.set(analysis.filename, analysis);
    }
    allAnalyses = Array.from(existingMap.values());
  }

  // Sort by date
  allAnalyses.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate best photos (top 10 by overall score)
  const bestPhotos = [...allAnalyses]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10)
    .map((p) => p.filename);

  // Calculate average score
  const averageScore = Number(
    (allAnalyses.reduce((sum, p) => sum + p.overallScore, 0) / allAnalyses.length).toFixed(1),
  );

  // Create final data
  const analysisData: PhotoAnalysisData = {
    _comment: 'Photo analysis data generated by Claude Vision API',
    photos: allAnalyses,
    bestPhotos,
    analyzedAt: getCurrentTimestamp(),
    totalPhotos: allAnalyses.length,
    averageScore,
  };

  saveAnalysis(analysisData);

  // Print summary
  console.log('\n📈 Summary:');
  console.log(`   Total photos: ${analysisData.totalPhotos}`);
  console.log(`   Average score: ${analysisData.averageScore}/10`);
  console.log(`\n🏆 Best photos:`);
  for (const filename of bestPhotos) {
    const photo = allAnalyses.find((p) => p.filename === filename);
    if (photo) {
      console.log(
        `   ${photo.overallScore}/10 - ${photo.date}: ${photo.description.slice(0, 60)}...`,
      );
    }
  }
}

// Run if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('analyze-photos.ts');
if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { analyzePhoto, loadExistingAnalysis, saveAnalysis };
