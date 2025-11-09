/**
 * Shared utilities for reading and aggregating report card data
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReportCard } from '../types';

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
 * Get the week number for a date (ISO 8601 week)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format date as ISO week string (e.g., "2025-W45")
 */
export function getISOWeekString(date: Date): string {
  const weekNum = getWeekNumber(date);
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Get start and end dates for a given ISO week
 */
export function getWeekBounds(isoWeek: string): { start: Date; end: Date } {
  const [year, week] = isoWeek.split('-W').map(Number);

  // Find the first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const firstThursday = new Date(jan4);
  firstThursday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + 3);

  // Calculate the start of the target week (Monday)
  const weekStart = new Date(firstThursday);
  weekStart.setDate(firstThursday.getDate() - 3 + (week - 1) * 7);

  // Calculate the end of the week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return { start: weekStart, end: weekEnd };
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
