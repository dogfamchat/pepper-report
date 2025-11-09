#!/usr/bin/env bun

/**
 * Main Analysis Orchestrator
 *
 * Runs all analysis scripts in the correct order:
 * 1. Grade trends analysis
 * 2. Friend analysis (TODO: implement when AI integration is ready)
 * 3. Activity analysis (TODO: implement)
 *
 * Usage:
 *   bun run scripts/analysis/analyze-all.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeGradeTrends, generateGradeTimeline } from './grade-trends';
import { readAllReportCards } from './report-reader';

interface AnalyzeOptions {
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AnalyzeOptions {
  const args = process.argv.slice(2);
  const options: AnalyzeOptions = {
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Analysis Orchestrator - Run all analysis scripts

Usage:
  bun run scripts/analysis/analyze-all.ts [options]

Options:
  --verbose, -v       Verbose logging
  --help, -h          Show this help message

Examples:
  bun run scripts/analysis/analyze-all.ts
  bun run scripts/analysis/analyze-all.ts --verbose
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const _options = parseArgs();

  console.log('🔬 Pepper Report Card Analysis Pipeline\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Read all report cards
    console.log('📖 Reading report cards...');
    const reports = readAllReportCards();

    if (reports.length === 0) {
      console.error('❌ No report cards found in data/reports/');
      console.error('   Run scrapers to collect data first.');
      process.exit(1);
    }

    console.log(`✅ Found ${reports.length} report cards`);
    console.log(`   Date range: ${reports[0].date} to ${reports[reports.length - 1].date}\n`);

    // Run grade trends analysis
    console.log('📊 Running grade trends analysis...');
    const startTime = Date.now();

    const trends = analyzeGradeTrends(reports);
    const timeline = generateGradeTimeline(reports);

    const duration = Date.now() - startTime;
    console.log(`✅ Grade trends analysis complete (${duration}ms)`);
    console.log(`   Overall average: ${trends.summary.overallAverageGrade.toFixed(2)}/4.0`);
    console.log(`   ${trends.weekly.length} weeks, ${trends.monthly.length} months\n`);

    // Save grade trends results
    console.log('💾 Saving grade trends data...');
    const analysisDir = join(process.cwd(), 'data', 'analysis');
    const vizDir = join(process.cwd(), 'data', 'viz');

    // Ensure directories exist
    if (!existsSync(analysisDir)) {
      mkdirSync(analysisDir, { recursive: true });
    }
    if (!existsSync(vizDir)) {
      mkdirSync(vizDir, { recursive: true });
    }

    // Save weekly summary (latest week)
    if (trends.weekly.length > 0) {
      const latestWeek = trends.weekly[trends.weekly.length - 1];
      const weeklySummaryFile = join(analysisDir, 'weekly-summary.json');
      writeFileSync(weeklySummaryFile, `${JSON.stringify(latestWeek, null, 2)}\n`, 'utf-8');
      console.log(`   ✅ data/analysis/weekly-summary.json`);
    }

    // Save complete grade trends
    const gradeTrendsFile = join(analysisDir, 'grade-trends.json');
    writeFileSync(gradeTrendsFile, `${JSON.stringify(trends, null, 2)}\n`, 'utf-8');
    console.log(`   ✅ data/analysis/grade-trends.json`);

    // Save visualization data
    const gradeTimelineFile = join(vizDir, 'grade-timeline.json');
    writeFileSync(gradeTimelineFile, `${JSON.stringify(timeline, null, 2)}\n`, 'utf-8');
    console.log(`   ✅ data/viz/grade-timeline.json\n`);

    // TODO: Run friend analysis (when implemented)
    console.log('👥 Friend analysis: Not yet implemented');
    console.log('   (Will be added with AI-powered extraction)\n');

    // TODO: Run activity analysis (when implemented)
    console.log('🎾 Activity analysis: Not yet implemented\n');

    // Summary
    console.log('═══════════════════════════════════════\n');
    console.log('✅ Analysis pipeline complete!\n');
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
