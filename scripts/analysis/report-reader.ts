/**
 * Shared utilities for reading and aggregating report card data
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReportCard } from '../types';
import { getISOWeekString } from '../utils/date-utils';

/**
 * Read a single report card from disk
 */
export function readReportCard(date: string): ReportCard | null {
  const [year] = date.split('-');
  const reportFile = join(process.cwd(), 'data', 'reports', year, `${date}.json`);

  if (!existsSync(reportFile)) {
    return null;
  }

  try {
    const content = readFileSync(reportFile, 'utf-8');
    return JSON.parse(content) as ReportCard;
  } catch (error) {
    console.error(`Error reading report card ${date}:`, error);
    return null;
  }
}

/**
 * Read all report cards from a specific year
 */
export function readReportCardsByYear(year: string): ReportCard[] {
  const reportsDir = join(process.cwd(), 'data', 'reports', year);

  if (!existsSync(reportsDir)) {
    return [];
  }

  const files = readdirSync(reportsDir).filter((f) => f.endsWith('.json'));
  const reports: ReportCard[] = [];

  for (const file of files) {
    const date = file.replace('.json', '');
    const report = readReportCard(date);
    if (report) {
      reports.push(report);
    }
  }

  return reports.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Read all report cards across all years
 */
export function readAllReportCards(): ReportCard[] {
  const reportsDir = join(process.cwd(), 'data', 'reports');

  if (!existsSync(reportsDir)) {
    return [];
  }

  const years = readdirSync(reportsDir).filter((d) => {
    const path = join(reportsDir, d);
    return existsSync(path) && readdirSync(path).length > 0;
  });

  const allReports: ReportCard[] = [];

  for (const year of years) {
    const yearReports = readReportCardsByYear(year);
    allReports.push(...yearReports);
  }

  return allReports.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group report cards by ISO week
 */
export function groupReportsByWeek(reports: ReportCard[]): Map<string, ReportCard[]> {
  const grouped = new Map<string, ReportCard[]>();

  for (const report of reports) {
    const date = new Date(report.date);
    const weekKey = getISOWeekString(date);

    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }
    grouped.get(weekKey)?.push(report);
  }

  return grouped;
}

/**
 * Group report cards by month (YYYY-MM)
 */
export function groupReportsByMonth(reports: ReportCard[]): Map<string, ReportCard[]> {
  const grouped = new Map<string, ReportCard[]>();

  for (const report of reports) {
    const monthKey = report.date.substring(0, 7); // YYYY-MM

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)?.push(report);
  }

  return grouped;
}

/**
 * Convert grade letter to numeric value (for averaging)
 */
export function gradeToNumber(grade: string): number {
  const gradeMap: Record<string, number> = {
    A: 4.0,
    B: 3.0,
    C: 2.0,
    D: 1.0,
    F: 0.0,
  };
  return gradeMap[grade] || 0.0;
}

/**
 * Calculate average grade from reports
 */
export function calculateAverageGrade(reports: ReportCard[]): number {
  if (reports.length === 0) return 0;

  const total = reports.reduce((sum, report) => sum + gradeToNumber(report.grade), 0);
  return total / reports.length;
}

/**
 * Get grade distribution
 */
export function getGradeDistribution(reports: ReportCard[]): Record<string, number> {
  const distribution: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  };

  for (const report of reports) {
    if (Object.hasOwn(distribution, report.grade)) {
      distribution[report.grade]++;
    }
  }

  return distribution;
}
