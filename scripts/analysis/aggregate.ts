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
import { aggregateAICategoryCounts, calculateFrequencies } from './activity-categorizer';
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

interface BehaviorTrends {
  summary: {
    totalReports: number;
    dateRange: {
      start: string;
      end: string;
    };
    totalPositiveBehaviors: number;
    totalNegativeBehaviors: number;
    reportsWithPositive: number;
    reportsWithNegative: number;
    positivePercentage: number;
    negativePercentage: number;
  };
  timeline: Array<{
    date: string;
    positiveCount: number;
    negativeCount: number;
  }>;
  positiveBehaviors: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  negativeBehaviors: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
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
    // Pass date string directly to avoid UTC conversion issues
    const weekKey = getISOWeekString(analysis.date);

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
      // Pass date string directly to avoid UTC conversion issues
      const weekKey = getISOWeekString(analysis.date);
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

  // Calculate detailed frequencies for individual activities/skills
  const { activityFrequency, trainingFrequency } = calculateFrequencies(analyses);

  // Calculate total instances from raw frequencies
  const totalActivityInstances = Object.values(activityFrequency).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalTrainingInstances = Object.values(trainingFrequency).reduce(
    (sum, count) => sum + count,
    0,
  );

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
    detailedFrequencies: {
      activities: activityFrequencies,
      training: trainingFrequencies,
    },
  };
}

/**
 * Analyze behavior trends from daily analyses
 */
function analyzeBehaviorTrends(analyses: DailyAnalysis[]): BehaviorTrends {
  if (analyses.length === 0) {
    throw new Error('No daily analysis files found');
  }

  // Count total behaviors and reports with behaviors
  let totalPositiveBehaviors = 0;
  let totalNegativeBehaviors = 0;
  let reportsWithPositive = 0;
  let reportsWithNegative = 0;

  // Track frequency of each behavior
  const positiveBehaviorCounts = new Map<string, number>();
  const negativeBehaviorCounts = new Map<string, number>();

  // Timeline data for charting
  const timeline: Array<{
    date: string;
    positiveCount: number;
    negativeCount: number;
  }> = [];

  for (const analysis of analyses) {
    const positiveCount = analysis.caughtBeingGood?.length || 0;
    const negativeCount = analysis.ooops?.length || 0;

    totalPositiveBehaviors += positiveCount;
    totalNegativeBehaviors += negativeCount;

    if (positiveCount > 0) reportsWithPositive++;
    if (negativeCount > 0) reportsWithNegative++;

    // Track timeline
    timeline.push({
      date: analysis.date,
      positiveCount,
      negativeCount,
    });

    // Count individual behaviors
    for (const behavior of analysis.caughtBeingGood || []) {
      positiveBehaviorCounts.set(behavior, (positiveBehaviorCounts.get(behavior) || 0) + 1);
    }

    for (const behavior of analysis.ooops || []) {
      negativeBehaviorCounts.set(behavior, (negativeBehaviorCounts.get(behavior) || 0) + 1);
    }
  }

  // Calculate percentages and sort behaviors by frequency
  const positiveBehaviors = Array.from(positiveBehaviorCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalPositiveBehaviors > 0 ? (count / totalPositiveBehaviors) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const negativeBehaviors = Array.from(negativeBehaviorCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalNegativeBehaviors > 0 ? (count / totalNegativeBehaviors) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalReports: analyses.length,
      dateRange: {
        start: analyses[0].date,
        end: analyses[analyses.length - 1].date,
      },
      totalPositiveBehaviors,
      totalNegativeBehaviors,
      reportsWithPositive,
      reportsWithNegative,
      positivePercentage: (reportsWithPositive / analyses.length) * 100,
      negativePercentage: (reportsWithNegative / analyses.length) * 100,
    },
    timeline,
    positiveBehaviors,
    negativeBehaviors,
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
 * Generate Chart.js visualization data for behavior timeline (line chart)
 */
function generateBehaviorTimelineViz(behaviorTrends: BehaviorTrends): object {
  return {
    type: 'line',
    data: {
      labels: behaviorTrends.timeline.map((t) => t.date),
      datasets: [
        {
          label: 'Caught Being Good',
          data: behaviorTrends.timeline.map((t) => t.positiveCount),
          borderColor: 'rgba(34, 197, 94, 1)', // Green
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0,
          fill: true,
        },
        {
          label: 'Ooops',
          data: behaviorTrends.timeline.map((t) => t.negativeCount),
          borderColor: 'rgba(239, 68, 68, 1)', // Red
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Number of Behaviors',
          },
        },
      },
    },
  };
}

/**
 * Generate Chart.js visualization data for behavior frequency (bar chart)
 */
function generateBehaviorFrequencyViz(behaviorTrends: BehaviorTrends): object {
  // Combine positive and negative behaviors
  const allBehaviors = [
    ...behaviorTrends.positiveBehaviors.map((b) => ({ ...b, type: 'positive' })),
    ...behaviorTrends.negativeBehaviors.map((b) => ({ ...b, type: 'negative' })),
  ].sort((a, b) => b.count - a.count);

  const labels = allBehaviors.map((b) => b.name);
  const data = allBehaviors.map((b) => b.count);
  const colors = allBehaviors.map((b) =>
    b.type === 'positive' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
  );

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Frequency',
          data,
          backgroundColor: colors,
          borderWidth: 0,
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
        tooltip: {
          callbacks: {
            label: (context: { parsed: { x: number } }) => {
              return `Occurred ${context.parsed.x} times`;
            },
          },
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
            text: 'Number of Occurrences',
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
 * Generate Chart.js visualization data for AI activity categories (bar chart)
 */
function generateAIActivityCategoryViz(
  activityCounts: Record<string, number>,
  totalInstances: number,
): object {
  // Sort categories by count
  const sortedCategories = Object.entries(activityCounts).sort(([_, a], [__, b]) => b - a);

  // Convert snake_case to Title Case (keep 'and' lowercase)
  const labels = sortedCategories.map(([cat]) =>
    cat
      .split('_')
      .map((word) => (word === 'and' ? 'and' : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' '),
  );
  const data = sortedCategories.map(([_, count]) => count);
  const percentages = sortedCategories.map(([_, count]) =>
    ((count / totalInstances) * 100).toFixed(1),
  );

  // Use existing color palette or generate colors
  const colors = ['#FF6B9D', '#9B59B6', '#5DADE2', '#26A69A', '#FFD93D', '#FF9800', '#FF9FF3'];

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Activity Count',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
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
        tooltip: {
          callbacks: {
            label: (context: { parsed: { x: number }; dataIndex: number }) => {
              return `${context.parsed.x} instances (${percentages[context.dataIndex]}%)`;
            },
          },
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
            text: 'Number of Activity Instances',
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
 * Generate Chart.js visualization data for AI training categories (bar chart)
 */
function generateAITrainingCategoryViz(
  trainingCounts: Record<string, number>,
  totalInstances: number,
): object {
  // Sort categories by count
  const sortedCategories = Object.entries(trainingCounts).sort(([_, a], [__, b]) => b - a);

  // Convert snake_case to Title Case (keep 'and' lowercase)
  const labels = sortedCategories.map(([cat]) =>
    cat
      .split('_')
      .map((word) => (word === 'and' ? 'and' : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' '),
  );
  const data = sortedCategories.map(([_, count]) => count);
  const percentages = sortedCategories.map(([_, count]) =>
    ((count / totalInstances) * 100).toFixed(1),
  );

  // Use existing color palette or generate colors
  const colors = ['#6C5CE7', '#0984E3', '#00B894', '#FDCB6E', '#E17055', '#FD79A8'];

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Training Count',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
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
        tooltip: {
          callbacks: {
            label: (context: { parsed: { x: number }; dataIndex: number }) => {
              return `${context.parsed.x} instances (${percentages[context.dataIndex]}%)`;
            },
          },
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
            text: 'Number of Training Instances',
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
  activityFrequencyViz?: object,
  trainingFrequencyViz?: object,
  behaviorTrends?: BehaviorTrends,
  behaviorTimelineViz?: object,
  behaviorFrequencyViz?: object,
  aiActivityCategoryViz?: object,
  aiTrainingCategoryViz?: object,
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

  // Save behavior trends (if provided)
  if (behaviorTrends) {
    const behaviorTrendsFile = join(aggregatesDir, 'behavior-trends.json');
    writeFileSync(behaviorTrendsFile, `${JSON.stringify(behaviorTrends, null, 2)}\n`, 'utf-8');
    console.log('   ✅ data/analysis/aggregates/behavior-trends.json');
  }

  // Save behavior visualization data (if provided)
  if (behaviorTimelineViz) {
    const behaviorTimelineFile = join(vizDir, 'behavior-timeline.json');
    writeFileSync(
      behaviorTimelineFile,
      `${JSON.stringify(behaviorTimelineViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/behavior-timeline.json');
  }

  if (behaviorFrequencyViz) {
    const behaviorFrequencyFile = join(vizDir, 'behavior-frequency.json');
    writeFileSync(
      behaviorFrequencyFile,
      `${JSON.stringify(behaviorFrequencyViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/behavior-frequency.json');
  }

  // Save AI category visualization data (if provided)
  if (aiActivityCategoryViz) {
    const aiActivityCategoryFile = join(vizDir, 'ai-activity-categories.json');
    writeFileSync(
      aiActivityCategoryFile,
      `${JSON.stringify(aiActivityCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/ai-activity-categories.json');
  }

  if (aiTrainingCategoryViz) {
    const aiTrainingCategoryFile = join(vizDir, 'ai-training-categories.json');
    writeFileSync(
      aiTrainingCategoryFile,
      `${JSON.stringify(aiTrainingCategoryViz, null, 2)}\n`,
      'utf-8',
    );
    console.log('   ✅ data/viz/ai-training-categories.json');
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

    // Show top 3 most frequent activities
    if (activityBreakdown.detailedFrequencies.activities.length > 0) {
      console.log('\n   Top Activities:');
      activityBreakdown.detailedFrequencies.activities.slice(0, 3).forEach((activity, i) => {
        console.log(
          `   ${i + 1}. ${activity.name} - ${activity.count} times (${activity.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Analyze behavior trends
    console.log('\n🌟 Aggregating behavior trends...');
    const behaviorTrends = analyzeBehaviorTrends(analyses);

    console.log(`   Total positive behaviors: ${behaviorTrends.summary.totalPositiveBehaviors}`);
    console.log(`   Total negative behaviors: ${behaviorTrends.summary.totalNegativeBehaviors}`);
    console.log(
      `   Reports with positive: ${behaviorTrends.summary.reportsWithPositive} (${behaviorTrends.summary.positivePercentage.toFixed(1)}%)`,
    );
    console.log(
      `   Reports with negative: ${behaviorTrends.summary.reportsWithNegative} (${behaviorTrends.summary.negativePercentage.toFixed(1)}%)`,
    );

    // Show top 3 positive behaviors
    if (behaviorTrends.positiveBehaviors.length > 0) {
      console.log('\n   Top Positive Behaviors:');
      behaviorTrends.positiveBehaviors.slice(0, 3).forEach((behavior, i) => {
        console.log(
          `   ${i + 1}. ${behavior.name} - ${behavior.count} times (${behavior.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Show all negative behaviors (usually only a few)
    if (behaviorTrends.negativeBehaviors.length > 0) {
      console.log('\n   Negative Behaviors:');
      behaviorTrends.negativeBehaviors.forEach((behavior, i) => {
        console.log(
          `   ${i + 1}. ${behavior.name} - ${behavior.count} times (${behavior.percentage.toFixed(1)}%)`,
        );
      });
    }

    // Aggregate AI categories
    console.log('\n🤖 Aggregating AI-suggested categories...');
    const aiCategories = aggregateAICategoryCounts(analyses);

    console.log(`   AI activity instances: ${aiCategories.totalActivityInstances}`);
    console.log(`   AI training instances: ${aiCategories.totalTrainingInstances}`);
    console.log(
      `   Unique AI activity categories: ${Object.keys(aiCategories.activityCounts).length}`,
    );
    console.log(
      `   Unique AI training categories: ${Object.keys(aiCategories.trainingCounts).length}`,
    );

    // Show top 3 AI activity categories
    const topAIActivityCategories = Object.entries(aiCategories.activityCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);

    if (topAIActivityCategories.length > 0) {
      console.log('\n   Top AI Activity Categories:');
      topAIActivityCategories.forEach(([category, count], i) => {
        const percentage = ((count / aiCategories.totalActivityInstances) * 100).toFixed(1);
        console.log(
          `   ${i + 1}. ${category.replace(/_/g, ' ')} - ${count} instances (${percentage}%)`,
        );
      });
    }

    // Generate visualization data
    console.log('\n📊 Generating visualization data...');
    const timeline = generateGradeTimeline(analyses);
    const friendNetworkViz = generateFriendNetworkViz(topFriends);
    const activityFrequencyViz = generateActivityFrequencyViz(activityBreakdown);
    const trainingFrequencyViz = generateTrainingFrequencyViz(activityBreakdown);
    const behaviorTimelineViz = generateBehaviorTimelineViz(behaviorTrends);
    const behaviorFrequencyViz = generateBehaviorFrequencyViz(behaviorTrends);

    // Generate AI category visualizations
    const aiActivityCategoryViz = generateAIActivityCategoryViz(
      aiCategories.activityCounts,
      aiCategories.totalActivityInstances,
    );
    const aiTrainingCategoryViz = generateAITrainingCategoryViz(
      aiCategories.trainingCounts,
      aiCategories.totalTrainingInstances,
    );

    // Save results
    console.log('\n💾 Saving aggregated data...');
    saveResults(
      trends,
      topFriends,
      timeline,
      friendNetworkViz,
      activityBreakdown,
      activityFrequencyViz,
      trainingFrequencyViz,
      behaviorTrends,
      behaviorTimelineViz,
      behaviorFrequencyViz,
      aiActivityCategoryViz,
      aiTrainingCategoryViz,
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
  analyzeBehaviorTrends,
  generateGradeTimeline,
  generateFriendNetworkViz,
  generateActivityFrequencyViz,
  generateTrainingFrequencyViz,
  generateBehaviorTimelineViz,
  generateBehaviorFrequencyViz,
};

// Run if called directly
if (import.meta.main) {
  main();
}
