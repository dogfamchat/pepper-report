#!/usr/bin/env bun

/**
 * Grade Trends Analyzer
 *
 * Analyzes grade trends across all report cards and generates:
 * - Weekly summaries with grade averages
 * - Monthly summaries
 * - Timeline data for Chart.js visualization
 *
 * Usage:
 *   bun run scripts/analysis/grade-trends.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReportCard } from '../types';
import {
  calculateAverageGrade,
  getGradeDistribution,
  getISOWeekString,
  getWeekBounds,
  groupReportsByMonth,
  groupReportsByWeek,
  readAllReportCards,
} from './report-reader';

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

interface GradeTimelinePoint {
  date: string; // YYYY-MM-DD
  grade: string; // Letter grade
  gradeValue: number; // Numeric value for charting
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

/**
 * Analyze grade trends across all report cards
 */
function analyzeGradeTrends(reports: ReportCard[]): GradeTrendsOutput {
  if (reports.length === 0) {
    throw new Error('No report cards found to analyze');
  }

  // Overall statistics
  const overallAverageGrade = calculateAverageGrade(reports);
  const overallGradeDistribution = getGradeDistribution(reports);

  // Weekly summaries
  const weeklyGroups = groupReportsByWeek(reports);
  const weeklySummaries: WeeklySummary[] = [];

  for (const [week, weekReports] of Array.from(weeklyGroups.entries()).sort()) {
    const { start, end } = getWeekBounds(week);

    weeklySummaries.push({
      week,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      daysAttended: weekReports.length,
      averageGrade: calculateAverageGrade(weekReports),
      gradeDistribution: getGradeDistribution(weekReports),
    });
  }

  // Monthly summaries
  const monthlyGroups = groupReportsByMonth(reports);
  const monthlySummaries: MonthlySummary[] = [];

  for (const [month, monthReports] of Array.from(monthlyGroups.entries()).sort()) {
    // Find all unique weeks in this month
    const weeksInMonth = new Set<string>();
    for (const report of monthReports) {
      const date = new Date(report.date);
      const weekKey = getISOWeekString(date);
      weeksInMonth.add(weekKey);
    }

    monthlySummaries.push({
      month,
      daysAttended: monthReports.length,
      averageGrade: calculateAverageGrade(monthReports),
      gradeDistribution: getGradeDistribution(monthReports),
      weeks: Array.from(weeksInMonth).sort(),
    });
  }

  return {
    summary: {
      totalReports: reports.length,
      dateRange: {
        start: reports[0].date,
        end: reports[reports.length - 1].date,
      },
      overallAverageGrade,
      overallGradeDistribution,
    },
    weekly: weeklySummaries,
    monthly: monthlySummaries,
  };
}

/**
 * Generate timeline data for Chart.js
 */
function generateGradeTimeline(reports: ReportCard[]): GradeTimelinePoint[] {
  const gradeMap: Record<string, number> = {
    A: 4.0,
    B: 3.0,
    C: 2.0,
    D: 1.0,
    F: 0.0,
  };

  return reports.map((report) => ({
    date: report.date,
    grade: report.grade,
    gradeValue: gradeMap[report.grade] || 0.0,
  }));
}

/**
 * Save analysis results to JSON files
 */
function saveResults(trends: GradeTrendsOutput, timeline: GradeTimelinePoint[]): void {
  const analysisDir = join(process.cwd(), 'data', 'analysis');
  const vizDir = join(process.cwd(), 'data', 'viz');

  // Ensure directories exist
  if (!existsSync(analysisDir)) {
    mkdirSync(analysisDir, { recursive: true });
  }
  if (!existsSync(vizDir)) {
    mkdirSync(vizDir, { recursive: true });
  }

  // Save weekly summaries (using the most recent week as the main file)
  if (trends.weekly.length > 0) {
    const latestWeek = trends.weekly[trends.weekly.length - 1];
    const weeklySummaryFile = join(analysisDir, 'weekly-summary.json');
    writeFileSync(weeklySummaryFile, `${JSON.stringify(latestWeek, null, 2)}\n`, 'utf-8');
    console.log(`✅ Saved latest weekly summary to ${weeklySummaryFile}`);
  }

  // Save complete grade trends analysis
  const gradeTrendsFile = join(analysisDir, 'grade-trends.json');
  writeFileSync(gradeTrendsFile, `${JSON.stringify(trends, null, 2)}\n`, 'utf-8');
  console.log(`✅ Saved complete grade trends to ${gradeTrendsFile}`);

  // Save visualization data for Chart.js
  const gradeTimelineFile = join(vizDir, 'grade-timeline.json');
  writeFileSync(gradeTimelineFile, `${JSON.stringify(timeline, null, 2)}\n`, 'utf-8');
  console.log(`✅ Saved grade timeline visualization to ${gradeTimelineFile}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Grade Trends Analyzer\n');

  try {
    // Read all report cards
    console.log('📖 Reading report cards...');
    const reports = readAllReportCards();

    if (reports.length === 0) {
      console.error('❌ No report cards found in data/reports/');
      process.exit(1);
    }

    console.log(`   Found ${reports.length} report cards`);
    console.log(`   Date range: ${reports[0].date} to ${reports[reports.length - 1].date}\n`);

    // Analyze grade trends
    console.log('📈 Analyzing grade trends...');
    const trends = analyzeGradeTrends(reports);

    console.log(
      `   Overall average grade: ${trends.summary.overallAverageGrade.toFixed(2)} (${trends.summary.overallAverageGrade >= 3.5 ? 'Excellent!' : 'Good!'})`,
    );
    console.log(
      `   Grade distribution: A=${trends.summary.overallGradeDistribution.A} B=${trends.summary.overallGradeDistribution.B} C=${trends.summary.overallGradeDistribution.C} D=${trends.summary.overallGradeDistribution.D}`,
    );
    console.log(`   Weekly summaries: ${trends.weekly.length} weeks`);
    console.log(`   Monthly summaries: ${trends.monthly.length} months\n`);

    // Generate visualization data
    console.log('📊 Generating visualization data...');
    const timeline = generateGradeTimeline(reports);
    console.log(`   Timeline points: ${timeline.length}\n`);

    // Save results
    console.log('💾 Saving results...');
    saveResults(trends, timeline);

    console.log('\n✅ Grade trends analysis complete!');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { analyzeGradeTrends, generateGradeTimeline };
