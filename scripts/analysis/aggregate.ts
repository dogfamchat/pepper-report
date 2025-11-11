#!/usr/bin/env bun

/**
 * Aggregate Daily Analysis Data
 *
 * Reads all daily analysis files and aggregates them into:
 * - Weekly/monthly grade trends
 * - Friend statistics and rankings
 * - Visualization data for Chart.js
 *
 * This is fast (no API calls) since it only reads pre-processed daily files.
 *
 * Usage:
 *   bun run scripts/analysis/aggregate.ts
 *   bun run scripts/analysis/aggregate.ts --verbose
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getISOWeekString, getWeekBounds } from '../utils/date-utils';
import type { DailyAnalysis } from './extract-daily';

interface WeeklySummary {
  week: string; // ISO week format: YYYY-WXX
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysAttended: number;
  averageGrade: number;
  gradeDistribution: Record<string, number>;
}

interface MonthlySummary {
  month: string; // YYYY-MM
  daysAttended: number;
  averageGrade: number;
  gradeDistribution: Record<string, number>;
  weeks: string[]; // List of ISO week numbers in this month
}

interface GradeTrendsOutput {
  summary: {
    totalReports: number;
    dateRange: {
      start: string;
      end: string;
    };
    overallAverageGrade: number;
    overallGradeDistribution: Record<string, number>;
  };
  weekly: WeeklySummary[];
  monthly: MonthlySummary[];
}

interface FriendStats {
  name: string;
  mentions: number;
  percentage: number;
  firstSeen: string;
  lastSeen: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface TopFriends {
  summary: {
    totalReportCards: number;
    uniqueFriends: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  friends: FriendStats[];
}

interface AggregateOptions {
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AggregateOptions {
  const args = process.argv.slice(2);
  const options: AggregateOptions = {
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
Aggregate Analysis - Combine daily analysis files into aggregates

Usage:
  bun run scripts/analysis/aggregate.ts [options]

Options:
  --verbose, -v       Verbose logging
  --help, -h          Show this help message

Description:
  Reads all daily analysis files from data/analysis/daily/ and:
  - Calculates weekly and monthly grade trends
  - Aggregates friend mentions and rankings
  - Generates visualization data for Chart.js

  Output files:
  - data/analysis/aggregates/grade-trends.json
  - data/analysis/aggregates/top-friends.json
  - data/analysis/aggregates/weekly-summary.json
  - data/viz/grade-timeline.json
  - data/viz/friend-network.json

Examples:
  bun run scripts/analysis/aggregate.ts
  bun run scripts/analysis/aggregate.ts --verbose
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
      const content = readFileSync(join(dailyDir, file), 'utf-8');
      const analysis = JSON.parse(content) as DailyAnalysis;
      analyses.push(analysis);
    } catch (error) {
      console.error(`⚠️  Error reading ${file}:`, error);
    }
  }

  return analyses.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group daily analyses by ISO week
 */
function groupByWeek(analyses: DailyAnalysis[]): Map<string, DailyAnalysis[]> {
  const grouped = new Map<string, DailyAnalysis[]>();

  for (const analysis of analyses) {
    const date = new Date(analysis.date);
    const weekKey = getISOWeekString(date);

    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }
    grouped.get(weekKey)?.push(analysis);
  }

  return grouped;
}

/**
 * Group daily analyses by month (YYYY-MM)
 */
function groupByMonth(analyses: DailyAnalysis[]): Map<string, DailyAnalysis[]> {
  const grouped = new Map<string, DailyAnalysis[]>();

  for (const analysis of analyses) {
    const monthKey = analysis.date.substring(0, 7); // YYYY-MM

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)?.push(analysis);
  }

  return grouped;
}

/**
 * Calculate average grade from daily analyses
 */
function calculateAverage(analyses: DailyAnalysis[]): number {
  if (analyses.length === 0) return 0;
  const total = analyses.reduce((sum, a) => sum + a.gradeNumeric, 0);
  return total / analyses.length;
}

/**
 * Get grade distribution from daily analyses
 */
function getDistribution(analyses: DailyAnalysis[]): Record<string, number> {
  const distribution: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  for (const analysis of analyses) {
    if (Object.hasOwn(distribution, analysis.grade)) {
      distribution[analysis.grade]++;
    }
  }

  return distribution;
}

/**
 * Analyze grade trends from daily analyses
 */
function analyzeGradeTrends(analyses: DailyAnalysis[]): GradeTrendsOutput {
  if (analyses.length === 0) {
    throw new Error('No daily analysis files found');
  }

  // Overall statistics
  const overallAverageGrade = calculateAverage(analyses);
  const overallGradeDistribution = getDistribution(analyses);

  // Weekly summaries
  const weeklyGroups = groupByWeek(analyses);
  const weeklySummaries: WeeklySummary[] = [];

  for (const [week, weekAnalyses] of Array.from(weeklyGroups.entries()).sort()) {
    const { start, end } = getWeekBounds(week);

    weeklySummaries.push({
      week,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      daysAttended: weekAnalyses.length,
      averageGrade: calculateAverage(weekAnalyses),
      gradeDistribution: getDistribution(weekAnalyses),
    });
  }

  // Monthly summaries
  const monthlyGroups = groupByMonth(analyses);
  const monthlySummaries: MonthlySummary[] = [];

  for (const [month, monthAnalyses] of Array.from(monthlyGroups.entries()).sort()) {
    // Find all unique weeks in this month
    const weeksInMonth = new Set<string>();
    for (const analysis of monthAnalyses) {
      const date = new Date(analysis.date);
      const weekKey = getISOWeekString(date);
      weeksInMonth.add(weekKey);
    }

    monthlySummaries.push({
      month,
      daysAttended: monthAnalyses.length,
      averageGrade: calculateAverage(monthAnalyses),
      gradeDistribution: getDistribution(monthAnalyses),
      weeks: Array.from(weeksInMonth).sort(),
    });
  }

  return {
    summary: {
      totalReports: analyses.length,
      dateRange: {
        start: analyses[0].date,
        end: analyses[analyses.length - 1].date,
      },
      overallAverageGrade,
      overallGradeDistribution,
    },
    weekly: weeklySummaries,
    monthly: monthlySummaries,
  };
}

/**
 * Analyze friend statistics from daily analyses
 */
function analyzeFriendStats(analyses: DailyAnalysis[]): TopFriends {
  const friendData = new Map<
    string,
    {
      count: number;
      dates: string[];
    }
  >();

  // Count mentions for each friend
  for (const analysis of analyses) {
    for (const friend of analysis.friends) {
      if (!friendData.has(friend)) {
        friendData.set(friend, { count: 0, dates: [] });
      }
      const data = friendData.get(friend);
      if (data) {
        data.count++;
        data.dates.push(analysis.date);
      }
    }
  }

  // Calculate statistics for each friend
  const friendStats: FriendStats[] = [];
  const totalReports = analyses.length;

  for (const [name, data] of friendData.entries()) {
    const sortedDates = data.dates.sort();
    const firstSeen = sortedDates[0];
    const lastSeen = sortedDates[sortedDates.length - 1];

    // Calculate trend (simple heuristic: compare first half vs second half)
    const midpoint = Math.floor(data.dates.length / 2);
    const firstHalf = sortedDates.slice(0, midpoint);
    const secondHalf = sortedDates.slice(midpoint);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (data.count >= 3) {
      const firstHalfCount = firstHalf.length;
      const secondHalfCount = secondHalf.length;

      if (secondHalfCount > firstHalfCount * 1.5) {
        trend = 'increasing';
      } else if (firstHalfCount > secondHalfCount * 1.5) {
        trend = 'decreasing';
      }
    }

    friendStats.push({
      name,
      mentions: data.count,
      percentage: (data.count / totalReports) * 100,
      firstSeen,
      lastSeen,
      trend,
    });
  }

  // Sort by mention count (descending), then by latest mention (most recent first)
  friendStats.sort((a, b) => {
    // Primary: sort by mentions descending
    if (b.mentions !== a.mentions) {
      return b.mentions - a.mentions;
    }
    // Secondary: sort by most recent mention (reverse chronological - newest first)
    return b.lastSeen.localeCompare(a.lastSeen);
  });

  return {
    summary: {
      totalReportCards: totalReports,
      uniqueFriends: friendStats.length,
      dateRange: {
        start: analyses[0].date,
        end: analyses[analyses.length - 1].date,
      },
    },
    friends: friendStats,
  };
}

/**
 * Generate Chart.js visualization data for grade timeline
 */
function generateGradeTimeline(analyses: DailyAnalysis[]): object {
  return analyses.map((analysis) => ({
    date: analysis.date,
    grade: analysis.grade,
    gradeValue: analysis.gradeNumeric,
  }));
}

/**
 * Generate Chart.js visualization data for friend network
 */
function generateFriendNetworkViz(topFriends: TopFriends): object {
  // Get top 10 friends for visualization
  const top10 = topFriends.friends.slice(0, 10);

  return {
    type: 'bar',
    data: {
      labels: top10.map((f) => f.name),
      datasets: [
        {
          label: 'Mentions',
          data: top10.map((f) => f.mentions),
          backgroundColor: 'rgba(147, 51, 234, 0.8)', // Purple
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Pepper's Top Friends",
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Number of Mentions',
          },
        },
      },
    },
  };
}

/**
 * Save aggregated results
 */
function saveResults(
  trends: GradeTrendsOutput,
  topFriends: TopFriends,
  timeline: object,
  friendNetworkViz: object,
): void {
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
}

/**
 * Main execution
 */
async function main() {
  const _options = parseArgs();

  console.log('📊 Aggregate Analysis\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Read all daily analysis files
    console.log('📖 Reading daily analysis files...');
    const analyses = readAllDailyAnalysis();

    if (analyses.length === 0) {
      console.error('❌ No daily analysis files found in data/analysis/daily/');
      console.error('   Run extract-daily.ts to process report cards first.');
      process.exit(1);
    }

    console.log(`✅ Found ${analyses.length} daily analysis files`);
    console.log(`   Date range: ${analyses[0].date} to ${analyses[analyses.length - 1].date}`);

    // Analyze grade trends
    console.log('\n📈 Aggregating grade trends...');
    const trends = analyzeGradeTrends(analyses);

    console.log(
      `   Overall average: ${trends.summary.overallAverageGrade.toFixed(2)} (${trends.summary.overallAverageGrade >= 3.5 ? 'Excellent!' : 'Good!'})`,
    );
    console.log(
      `   Distribution: A=${trends.summary.overallGradeDistribution.A} B=${trends.summary.overallGradeDistribution.B} C=${trends.summary.overallGradeDistribution.C} D=${trends.summary.overallGradeDistribution.D}`,
    );
    console.log(`   Weekly summaries: ${trends.weekly.length} weeks`);
    console.log(`   Monthly summaries: ${trends.monthly.length} months`);

    // Analyze friend statistics
    console.log('\n👥 Aggregating friend statistics...');
    const topFriends = analyzeFriendStats(analyses);

    console.log(`   Unique friends: ${topFriends.friends.length}`);

    // Show top 5 friends
    if (topFriends.friends.length > 0) {
      console.log('\n   Top 5 Friends:');
      topFriends.friends.slice(0, 5).forEach((friend, i) => {
        console.log(
          `   ${i + 1}. ${friend.name} - ${friend.mentions} mentions (${friend.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Generate visualization data
    console.log('\n📊 Generating visualization data...');
    const timeline = generateGradeTimeline(analyses);
    const friendNetworkViz = generateFriendNetworkViz(topFriends);

    // Save results
    console.log('\n💾 Saving aggregated data...');
    saveResults(trends, topFriends, timeline, friendNetworkViz);

    console.log('\n═══════════════════════════════════════\n');
    console.log('✅ Aggregation complete!\n');
  } catch (error) {
    console.error('\n❌ Aggregation failed:', error);
    process.exit(1);
  }
}

// Export functions for use in analyze-all.ts
export { analyzeGradeTrends, analyzeFriendStats, generateGradeTimeline, generateFriendNetworkViz };

// Run if called directly
if (import.meta.main) {
  main();
}
