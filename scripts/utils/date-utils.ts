/**
 * Centralized date and time utilities
 *
 * Stage 3: Refactored to use Day.js library
 * Provides timezone-aware date handling with cleaner, more maintainable code
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Configure Day.js plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

// Set default timezone to America/Denver (Mountain Time)
dayjs.tz.setDefault('America/Denver');

// ============================================================================
// CURRENT DATE HELPERS
// ============================================================================

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM');
}

/**
 * Get current timestamp in full ISO format
 */
export function getCurrentTimestamp(): string {
  return dayjs().toISOString();
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date string to human-readable format
 * Input: "2025-01-15"
 * Output: "Wednesday, January 15, 2025"
 */
export function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('dddd, MMMM D, YYYY');
}

/**
 * Format date string to short format
 * Input: "2025-01-15"
 * Output: "Jan 15, 2025"
 */
export function formatShortDate(dateStr: string): string {
  return dayjs(dateStr).format('MMM D, YYYY');
}

/**
 * Format date string to very short format (no year)
 * Input: "2025-01-15"
 * Output: "Jan 15"
 */
export function formatDateNoYear(dateStr: string): string {
  return dayjs(dateStr).format('MMM D');
}

/**
 * Format month string to human-readable format
 * Input: "2025-01"
 * Output: "January 2025"
 */
export function formatMonth(monthStr: string): string {
  return dayjs(`${monthStr}-01`).format('MMMM YYYY');
}

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse schedule date from various formats to YYYY-MM-DD
 * Handles: ISO format, slash formats, text format, data-date attributes
 */
export function parseScheduleDate(dateText: string): string | null {
  const cleaned = dateText.trim();

  // Skip header rows or common non-date text
  const headerPatterns = /^(date|time|status|day|month|year|schedule|location|teacher|staff)$/i;
  if (headerPatterns.test(cleaned) || cleaned.length < 3) {
    return null;
  }

  // Try ISO format first: 2024-11-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try slash format: 11/15/2024 or 2024/11/15
  const slashMatch = cleaned.match(/(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
  if (slashMatch) {
    const [, first, second, third] = slashMatch;
    let date: dayjs.Dayjs | undefined;
    if (first.length === 4) {
      // 2024/11/15 or 2024-11-15
      date = dayjs(`${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`);
    } else if (third.length === 4) {
      // 11/15/2024 or 11-15-2024
      date = dayjs(`${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`);
    }
    if (date?.isValid()) {
      return date.format('YYYY-MM-DD');
    }
  }

  // Try text format: "November 15, 2024" or "Nov 15, 2024"
  const textMatch = cleaned.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (textMatch) {
    const [, monthName, day, year] = textMatch;
    // Day.js is case-sensitive, so we need to properly capitalize
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
    const date = dayjs(`${capitalizedMonth} ${day}, ${year}`, ['MMMM D, YYYY', 'MMM D, YYYY']);
    if (date.isValid()) {
      return date.format('YYYY-MM-DD');
    }
  }

  // Try data-date attribute format
  const dataDateMatch = cleaned.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
  if (dataDateMatch) {
    return dataDateMatch[1];
  }

  // Only warn if it looks like it should be a date (contains numbers)
  if (/\d/.test(cleaned)) {
    console.warn(`   ⚠️  Could not parse date: "${dateText}"`);
  }
  return null;
}

/**
 * Parse "Completed On" date/time to ISO format
 * Input: "Oct 31, 2025, 2:11pm" (Mountain Time)
 * Output: "2025-10-31T20:11:00.000Z" (properly converted to UTC)
 */
export function parseCompletedDateTime(completedOnText: string): string | undefined {
  try {
    // Parse "Oct 31, 2025, 2:11pm" format
    const match = completedOnText.match(/(\w+)\s+(\d+),\s+(\d+),\s+(\d+):(\d+)(am|pm)/i);
    if (!match) {
      console.warn(`⚠️  Could not parse completed date: "${completedOnText}"`);
      return;
    }

    const [, monthStr, day, year, hour, minute, meridiem] = match;

    // Parse the date and time in Mountain Time using Day.js
    const dateTimeStr = `${monthStr} ${day}, ${year} ${hour}:${minute}${meridiem}`;
    const mtDate = dayjs.tz(dateTimeStr, 'MMM D, YYYY h:mma', 'America/Denver');

    if (!mtDate.isValid()) {
      console.warn(`⚠️  Invalid date parsed: "${completedOnText}"`);
      return;
    }

    // Convert to UTC and return ISO string
    return mtDate.utc().toISOString();
  } catch (error) {
    console.warn(`⚠️  Error parsing date: ${error}`);
    return;
  }
}

// ============================================================================
// DATE ARITHMETIC & RANGE GENERATION
// ============================================================================

/**
 * Generate array of date strings from start to end (inclusive)
 * Input: "2025-01-01", "2025-01-05"
 * Output: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"]
 */
export function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = dayjs(start);
  const endDate = dayjs(end);

  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  return dates;
}

/**
 * Generate array of month strings from start to end (inclusive)
 * Input: "2024-11-01", "2025-01-31"
 * Output: ["2024-11", "2024-12", "2025-01"]
 */
export function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const startMonth = start.slice(0, 7); // YYYY-MM
  const endMonth = end.slice(0, 7);

  let current = dayjs(`${startMonth}-01`);
  const endDate = dayjs(`${endMonth}-01`);

  while (current.isBefore(endDate) || current.isSame(endDate, 'month')) {
    months.push(current.format('YYYY-MM'));
    current = current.add(1, 'month');
  }

  return months;
}

// ============================================================================
// ISO WEEK CALCULATIONS
// ============================================================================

/**
 * Get ISO 8601 week number for a date
 */
export function getWeekNumber(date: Date): number {
  return dayjs(date).isoWeek();
}

/**
 * Format date as ISO week string (e.g., "2025-W45")
 * Accepts either a Date object or a date string in YYYY-MM-DD format
 * For string inputs, parses in local timezone to avoid UTC conversion issues
 */
export function getISOWeekString(date: Date | string): string {
  const d = dayjs(date);
  return `${d.isoWeekYear()}-W${d.isoWeek().toString().padStart(2, '0')}`;
}

/**
 * Get start and end dates for a given ISO week
 * Returns [start, end) with end being exclusive (the Monday of the next week)
 * Input: "2025-W45"
 * Output: { start: Date, end: Date }
 * Example: 2025-W44 returns [2025-10-27, 2025-11-03) where Nov 3 is NOT included
 */
export function getWeekBounds(isoWeek: string): { start: Date; end: Date } {
  const [year, week] = isoWeek.split('-W').map(Number);

  // Set to the start of the ISO week (Monday)
  const weekStart = dayjs().year(year).isoWeek(week).startOf('isoWeek');

  // Set to the start of the next week (Monday) - exclusive upper bound
  const weekEnd = weekStart.add(1, 'week');

  return {
    start: weekStart.toDate(),
    end: weekEnd.toDate(),
  };
}
