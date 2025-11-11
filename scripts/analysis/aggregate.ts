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
import {
  ACTIVITY_CATEGORY_MAP,
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  type ActivityCategory,
  TRAINING_CATEGORY_MAP,
  TRAINING_COLORS,
  TRAINING_LABELS,
  type TrainingCategory,
} from './activity-categories';
import { aggregateCategoryCounts, calculateFrequencies } from './activity-categorizer';
import type { DailyAnalysis } from './extract-daily';
import { getISOWeekString, getWeekBounds } from './report-reader';

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

interface ActivityBreakdown {
  summary: {
    totalReports: number;
    dateRange: {
      start: string;
      end: string;
    };
    totalActivityInstances: number;
    totalTrainingInstances: number;
  };
  categoryCounts: {
    activities: Record<ActivityCategory, number>;
    training: Record<TrainingCategory, number>;
  };
  categoryPercentages: {
    activities: Record<
      ActivityCategory,
      {
        count: number;
        percentage: number;
      }
    >;
    training: Record<
      TrainingCategory,
      {
        count: number;
        percentage: number;
      }
    >;
  };
  detailedFrequencies: {
    activities: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    training: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
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
  - data/analysis/aggregates/activity-breakdown.json
  - data/viz/grade-timeline.json
  - data/viz/friend-network.json
  - data/viz/activity-categories.json
  - data/viz/training-categories.json
  - data/viz/activity-frequency.json
  - data/viz/training-frequency.json

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
 * Analyze activity breakdown from daily analyses
 */
function analyzeActivityBreakdown(analyses: DailyAnalysis[]): ActivityBreakdown {
  if (analyses.length === 0) {
    throw new Error('No daily analysis files found');
  }

  // Aggregate category counts across all reports
  const { activityTotals, trainingTotals } = aggregateCategoryCounts(analyses);

  // Calculate total instances
  const totalActivityInstances = Object.values(activityTotals).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalTrainingInstances = Object.values(trainingTotals).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Calculate percentages for categories
  const activityPercentages: Record<
    ActivityCategory,
    {
      count: number;
      percentage: number;
    }
  > = {} as Record<
    ActivityCategory,
    {
      count: number;
      percentage: number;
    }
  >;

  const trainingPercentages: Record<
    TrainingCategory,
    {
      count: number;
      percentage: number;
    }
  > = {} as Record<
    TrainingCategory,
    {
      count: number;
      percentage: number;
    }
  >;

  for (const [category, count] of Object.entries(activityTotals)) {
    activityPercentages[category as ActivityCategory] = {
      count,
      percentage: totalActivityInstances > 0 ? (count / totalActivityInstances) * 100 : 0,
    };
  }

  for (const [category, count] of Object.entries(trainingTotals)) {
    trainingPercentages[category as TrainingCategory] = {
      count,
      percentage: totalTrainingInstances > 0 ? (count / totalTrainingInstances) * 100 : 0,
    };
  }

  // Calculate detailed frequencies for individual activities/skills
  const { activityFrequency, trainingFrequency } = calculateFrequencies(analyses);

  // Sort and format detailed frequencies
  const activityFrequencies = Object.entries(activityFrequency)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalActivityInstances > 0 ? (count / totalActivityInstances) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const trainingFrequencies = Object.entries(trainingFrequency)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalTrainingInstances > 0 ? (count / totalTrainingInstances) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalReports: analyses.length,
      dateRange: {
        start: analyses[0].date,
        end: analyses[analyses.length - 1].date,
      },
      totalActivityInstances,
      totalTrainingInstances,
    },
    categoryCounts: {
      activities: activityTotals,
      training: trainingTotals,
    },
    categoryPercentages: {
      activities: activityPercentages,
      training: trainingPercentages,
    },
    detailedFrequencies: {
      activities: activityFrequencies,
      training: trainingFrequencies,
    },
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
 * Generate Chart.js visualization data for activity categories (pie chart)
 */
function generateActivityCategoryViz(breakdown: ActivityBreakdown): object {
  const { activities } = breakdown.categoryPercentages;

  // Filter out categories with zero count and sort by count
  const sortedCategories = Object.entries(activities)
    .filter(([_, data]) => data.count > 0)
    .sort(([_, a], [__, b]) => b.count - a.count);

  const labels = sortedCategories.map(
    ([category]) => ACTIVITY_LABELS[category as ActivityCategory],
  );
  const data = sortedCategories.map(([_, data]) => data.count);
  const colors = sortedCategories.map(
    ([category]) => ACTIVITY_COLORS[category as ActivityCategory],
  );

  // Build reverse mapping: category -> list of activities
  const categoryActivities: Record<string, string[]> = {};
  for (const [activityName, categories] of Object.entries(ACTIVITY_CATEGORY_MAP)) {
    for (const category of categories) {
      if (!categoryActivities[category]) {
        categoryActivities[category] = [];
      }
      categoryActivities[category].push(activityName);
    }
  }

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Count',
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context: { dataIndex: number }) => {
              const categoryIndex = context.dataIndex;
              const categoryKey = sortedCategories[categoryIndex][0];
              const activitiesInCategory = categoryActivities[categoryKey] || [];
              return activitiesInCategory.map((a) => `• ${a}`);
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 10,
          },
        },
        y: {
          ticks: {
            autoSkip: false,
          },
        },
      },
    },
  };
}

/**
 * Generate Chart.js visualization data for training categories (pie chart)
 */
function generateTrainingCategoryViz(breakdown: ActivityBreakdown): object {
  const { training } = breakdown.categoryPercentages;

  // Filter out categories with zero count and sort by count
  const sortedCategories = Object.entries(training)
    .filter(([_, data]) => data.count > 0)
    .sort(([_, a], [__, b]) => b.count - a.count);

  const labels = sortedCategories.map(
    ([category]) => TRAINING_LABELS[category as TrainingCategory],
  );
  const data = sortedCategories.map(([_, data]) => data.count);
  const colors = sortedCategories.map(
    ([category]) => TRAINING_COLORS[category as TrainingCategory],
  );

  // Build reverse mapping: category -> list of training skills
  const categoryTraining: Record<string, string[]> = {};
  for (const [skillName, category] of Object.entries(TRAINING_CATEGORY_MAP)) {
    if (!categoryTraining[category]) {
      categoryTraining[category] = [];
    }
    categoryTraining[category].push(skillName);
  }

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Count',
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context: { dataIndex: number }) => {
              const categoryIndex = context.dataIndex;
              const categoryKey = sortedCategories[categoryIndex][0];
              const skillsInCategory = categoryTraining[categoryKey] || [];
              return skillsInCategory.map((s) => `• ${s}`);
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 10,
          },
        },
        y: {
          ticks: {
            autoSkip: false,
          },
        },
      },
    },
  };
}

/**
 * Generate Chart.js visualization data for top activities (bar chart)
 */
function generateActivityFrequencyViz(breakdown: ActivityBreakdown): object {
  // Get top 10 activities
  const top10 = breakdown.detailedFrequencies.activities.slice(0, 10);

  return {
    type: 'bar',
    data: {
      labels: top10.map((a) => a.name),
      datasets: [
        {
          label: 'Frequency',
          data: top10.map((a) => a.count),
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Number of Days',
          },
        },
        y: {
          ticks: {
            autoSkip: false,
          },
        },
      },
    },
  };
}

/**
 * Generate Chart.js visualization data for top training skills (bar chart)
 */
function generateTrainingFrequencyViz(breakdown: ActivityBreakdown): object {
  // Get top 10 training skills
  const top10 = breakdown.detailedFrequencies.training.slice(0, 10);

  return {
    type: 'bar',
    data: {
      labels: top10.map((t) => t.name),
      datasets: [
        {
          label: 'Frequency',
          data: top10.map((t) => t.count),
          backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Number of Days',
          },
        },
        y: {
          ticks: {
            autoSkip: false,
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
  activityBreakdown?: ActivityBreakdown,
  activityCategoryViz?: object,
  trainingCategoryViz?: object,
  activityFrequencyViz?: object,
  trainingFrequencyViz?: object,
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

  // Save activity breakdown (if provided)
  if (activityBreakdown) {
    const activityBreakdownFile = join(aggregatesDir, 'activity-breakdown.json');
    writeFileSync(
      activityBreakdownFile,
      `${JSON.stringify(activityBreakdown, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/analysis/aggregates/activity-breakdown.json');
  }

  // Save activity visualization data (if provided)
  if (activityCategoryViz) {
    const activityCategoryFile = join(vizDir, 'activity-categories.json');
    writeFileSync(
      activityCategoryFile,
      `${JSON.stringify(activityCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/activity-categories.json');
  }

  if (trainingCategoryViz) {
    const trainingCategoryFile = join(vizDir, 'training-categories.json');
    writeFileSync(
      trainingCategoryFile,
      `${JSON.stringify(trainingCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/training-categories.json');
  }

  if (activityFrequencyViz) {
    const activityFrequencyFile = join(vizDir, 'activity-frequency.json');
    writeFileSync(
      activityFrequencyFile,
      `${JSON.stringify(activityFrequencyViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/activity-frequency.json');
  }

  if (trainingFrequencyViz) {
    const trainingFrequencyFile = join(vizDir, 'training-frequency.json');
    writeFileSync(
      trainingFrequencyFile,
      `${JSON.stringify(trainingFrequencyViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/training-frequency.json');
  }
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

    // Analyze activity breakdown
    console.log('\n🎾 Aggregating activity breakdown...');
    const activityBreakdown = analyzeActivityBreakdown(analyses);

    console.log(`   Total activity instances: ${activityBreakdown.summary.totalActivityInstances}`);
    console.log(`   Total training instances: ${activityBreakdown.summary.totalTrainingInstances}`);

    // Show top 3 activity categories
    const topActivityCategories = Object.entries(activityBreakdown.categoryPercentages.activities)
      .filter(([_, data]) => data.count > 0)
      .sort(([_, a], [__, b]) => b.count - a.count)
      .slice(0, 3);

    if (topActivityCategories.length > 0) {
      console.log('\n   Top Activity Categories:');
      topActivityCategories.forEach(([category, data], i) => {
        console.log(
          `   ${i + 1}. ${ACTIVITY_LABELS[category as ActivityCategory]} - ${data.count} times (${data.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Show top 3 activities
    if (activityBreakdown.detailedFrequencies.activities.length > 0) {
      console.log('\n   Top Activities:');
      activityBreakdown.detailedFrequencies.activities.slice(0, 3).forEach((activity, i) => {
        console.log(
          `   ${i + 1}. ${activity.name} - ${activity.count} days (${activity.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Generate visualization data
    console.log('\n📊 Generating visualization data...');
    const timeline = generateGradeTimeline(analyses);
    const friendNetworkViz = generateFriendNetworkViz(topFriends);
    const activityCategoryViz = generateActivityCategoryViz(activityBreakdown);
    const trainingCategoryViz = generateTrainingCategoryViz(activityBreakdown);
    const activityFrequencyViz = generateActivityFrequencyViz(activityBreakdown);
    const trainingFrequencyViz = generateTrainingFrequencyViz(activityBreakdown);

    // Save results
    console.log('\n💾 Saving aggregated data...');
    saveResults(
      trends,
      topFriends,
      timeline,
      friendNetworkViz,
      activityBreakdown,
      activityCategoryViz,
      trainingCategoryViz,
      activityFrequencyViz,
      trainingFrequencyViz,
    );

    console.log('\n═══════════════════════════════════════\n');
    console.log('✅ Aggregation complete!\n');
  } catch (error) {
    console.error('\n❌ Aggregation failed:', error);
    process.exit(1);
  }
}

// Export functions for use in analyze-all.ts
export {
  analyzeGradeTrends,
  analyzeFriendStats,
  analyzeActivityBreakdown,
  generateGradeTimeline,
  generateFriendNetworkViz,
  generateActivityCategoryViz,
  generateTrainingCategoryViz,
  generateActivityFrequencyViz,
  generateTrainingFrequencyViz,
};

// Run if called directly
if (import.meta.main) {
  main();
}
