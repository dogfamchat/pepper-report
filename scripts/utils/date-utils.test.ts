import { describe, expect, test } from 'bun:test';
import {
  formatDate,
  formatDateNoYear,
  formatMonth,
  formatShortDate,
  generateDateRange,
  generateMonthRange,
  getCurrentDate,
  getCurrentMonth,
  getCurrentTimestamp,
  getISOWeekString,
  getWeekBounds,
  getWeekNumber,
  parseCompletedDateTime,
  parseScheduleDate,
} from './date-utils';

// ============================================================================
// CURRENT DATE HELPERS
// ============================================================================

describe('getCurrentDate', () => {
  test('returns YYYY-MM-DD format', () => {
    const result = getCurrentDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('returns valid date', () => {
    const result = getCurrentDate();
    const date = new Date(result);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

describe('getCurrentMonth', () => {
  test('returns YYYY-MM format', () => {
    const result = getCurrentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  test('returns valid month', () => {
    const result = getCurrentMonth();
    const [year, month] = result.split('-').map(Number);
    expect(year).toBeGreaterThan(2000);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });
});

describe('getCurrentTimestamp', () => {
  test('returns ISO 8601 format', () => {
    const result = getCurrentTimestamp();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('returns valid timestamp', () => {
    const result = getCurrentTimestamp();
    const date = new Date(result);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

// ============================================================================
// DATE FORMATTING
// ============================================================================

describe('formatDate', () => {
  test('formats standard date correctly', () => {
    const result = formatDate('2025-08-15');
    expect(result).toBe('Friday, August 15, 2025');
  });

  test('handles first day of month', () => {
    const result = formatDate('2025-01-01');
    expect(result).toBe('Wednesday, January 1, 2025');
  });

  test('handles last day of month', () => {
    const result = formatDate('2024-12-31');
    expect(result).toBe('Tuesday, December 31, 2024');
  });

  test('handles leap year date', () => {
    const result = formatDate('2024-02-29');
    expect(result).toBe('Thursday, February 29, 2024');
  });
});

describe('formatShortDate', () => {
  test('formats standard date correctly', () => {
    const result = formatShortDate('2025-08-15');
    expect(result).toBe('Aug 15, 2025');
  });

  test('handles single digit dates', () => {
    const result = formatShortDate('2025-01-05');
    expect(result).toBe('Jan 5, 2025');
  });

  test('handles December', () => {
    const result = formatShortDate('2024-12-25');
    expect(result).toBe('Dec 25, 2024');
  });
});

describe('formatDateNoYear', () => {
  test('formats without year', () => {
    const result = formatDateNoYear('2025-08-15');
    expect(result).toBe('Aug 15');
  });

  test('handles single digit dates', () => {
    const result = formatDateNoYear('2025-01-05');
    expect(result).toBe('Jan 5');
  });

  test('handles end of year', () => {
    const result = formatDateNoYear('2024-12-31');
    expect(result).toBe('Dec 31');
  });
});

describe('formatMonth', () => {
  test('formats standard month correctly', () => {
    const result = formatMonth('2025-08');
    expect(result).toBe('August 2025');
  });

  test('handles January', () => {
    const result = formatMonth('2024-01');
    expect(result).toBe('January 2024');
  });

  test('handles December', () => {
    const result = formatMonth('2025-12');
    expect(result).toBe('December 2025');
  });
});

// ============================================================================
// DATE PARSING
// ============================================================================

describe('parseScheduleDate', () => {
  describe('ISO format', () => {
    test('parses ISO format correctly', () => {
      expect(parseScheduleDate('2024-11-15')).toBe('2024-11-15');
    });
  });

  describe('slash formats', () => {
    test('parses MM/DD/YYYY format', () => {
      expect(parseScheduleDate('11/15/2024')).toBe('2024-11-15');
    });

    test('parses YYYY/MM/DD format', () => {
      expect(parseScheduleDate('2024/11/15')).toBe('2024-11-15');
    });

    test('pads single digits', () => {
      expect(parseScheduleDate('1/5/2024')).toBe('2024-01-05');
    });
  });

  describe('text formats', () => {
    test('parses full month name', () => {
      expect(parseScheduleDate('November 15, 2024')).toBe('2024-11-15');
    });

    test('parses short month name', () => {
      expect(parseScheduleDate('Nov 15, 2024')).toBe('2024-11-15');
    });

    test('handles optional comma', () => {
      expect(parseScheduleDate('Nov 15 2024')).toBe('2024-11-15');
    });

    test('is case insensitive', () => {
      expect(parseScheduleDate('NOVEMBER 15, 2024')).toBe('2024-11-15');
      expect(parseScheduleDate('november 15, 2024')).toBe('2024-11-15');
    });
  });

  describe('data-date attribute format', () => {
    test('extracts from data-date attribute', () => {
      expect(parseScheduleDate('data-date="2024-11-15"')).toBe('2024-11-15');
    });
  });

  describe('invalid inputs', () => {
    test('returns null for header text', () => {
      expect(parseScheduleDate('Date')).toBeNull();
      expect(parseScheduleDate('schedule')).toBeNull();
    });

    test('returns null for empty string', () => {
      expect(parseScheduleDate('')).toBeNull();
      expect(parseScheduleDate('  ')).toBeNull();
    });

    test('returns null for very short strings', () => {
      expect(parseScheduleDate('ab')).toBeNull();
    });

    test('warns for unparseable dates with numbers', () => {
      const result = parseScheduleDate('abc123def');
      expect(result).toBeNull();
    });
  });
});

describe('parseCompletedDateTime', () => {
  describe('standard parsing', () => {
    test('parses PM time correctly', () => {
      const result = parseCompletedDateTime('Oct 31, 2025, 2:11pm', '2025-10-31');
      expect(result).toBe('2025-10-31T20:11:00.000Z'); // MDT is UTC-6
    });

    test('parses AM time correctly', () => {
      const result = parseCompletedDateTime('Aug 15, 2025, 9:30am', '2025-08-15');
      expect(result).toBe('2025-08-15T15:30:00.000Z'); // MDT is UTC-6
    });

    test('handles noon correctly', () => {
      const result = parseCompletedDateTime('Aug 15, 2025, 12:00pm', '2025-08-15');
      expect(result).toBe('2025-08-15T18:00:00.000Z'); // MDT is UTC-6, 12pm + 6 = 18:00
    });

    test('handles midnight correctly', () => {
      const result = parseCompletedDateTime('Aug 15, 2025, 12:00am', '2025-08-15');
      expect(result).toBe('2025-08-15T06:00:00.000Z'); // MDT is UTC-6, 12am (0:00) + 6 = 06:00
    });
  });

  describe('DST transitions', () => {
    test('uses MDT (UTC-6) during summer', () => {
      // August is always MDT
      const result = parseCompletedDateTime('Aug 15, 2025, 3:00pm', '2025-08-15');
      expect(result).toBe('2025-08-15T21:00:00.000Z'); // 3pm + 6 hours
    });

    test('uses MST (UTC-7) during winter', () => {
      // December is always MST
      const result = parseCompletedDateTime('Dec 15, 2025, 3:00pm', '2025-12-15');
      expect(result).toBe('2025-12-15T22:00:00.000Z'); // 3pm + 7 hours
    });

    test('handles March DST transition month', () => {
      // March 2025 transitions on 2nd Sunday (March 9)
      // Before transition (March 8): MST (UTC-7)
      const beforeDST = parseCompletedDateTime('Mar 8, 2025, 3:00pm', '2025-03-08');
      expect(beforeDST).toBe('2025-03-08T22:00:00.000Z'); // 3pm + 7 hours

      // After transition (March 10): MDT (UTC-6)
      const afterDST = parseCompletedDateTime('Mar 10, 2025, 3:00pm', '2025-03-10');
      expect(afterDST).toBe('2025-03-10T21:00:00.000Z'); // 3pm + 6 hours
    });

    test('handles November DST transition month', () => {
      // November 2025 transitions on 1st Sunday (November 2)
      // Before transition (November 1): MDT (UTC-6)
      const beforeDST = parseCompletedDateTime('Nov 1, 2025, 3:00pm', '2025-11-01');
      expect(beforeDST).toBe('2025-11-01T21:00:00.000Z'); // 3pm + 6 hours

      // After transition (November 3): MST (UTC-7)
      const afterDST = parseCompletedDateTime('Nov 3, 2025, 3:00pm', '2025-11-03');
      expect(afterDST).toBe('2025-11-03T22:00:00.000Z'); // 3pm + 7 hours
    });
  });

  describe('month abbreviations', () => {
    test('parses all months correctly', () => {
      expect(parseCompletedDateTime('Jan 1, 2025, 12:00pm', '2025-01-01')).toContain('2025-01-01');
      expect(parseCompletedDateTime('Feb 1, 2025, 12:00pm', '2025-02-01')).toContain('2025-02-01');
      expect(parseCompletedDateTime('Mar 1, 2025, 12:00pm', '2025-03-01')).toContain('2025-03-01');
      expect(parseCompletedDateTime('Apr 1, 2025, 12:00pm', '2025-04-01')).toContain('2025-04-01');
      expect(parseCompletedDateTime('May 1, 2025, 12:00pm', '2025-05-01')).toContain('2025-05-01');
      expect(parseCompletedDateTime('Jun 1, 2025, 12:00pm', '2025-06-01')).toContain('2025-06-01');
      expect(parseCompletedDateTime('Jul 1, 2025, 12:00pm', '2025-07-01')).toContain('2025-07-01');
      expect(parseCompletedDateTime('Aug 1, 2025, 12:00pm', '2025-08-01')).toContain('2025-08-01');
      expect(parseCompletedDateTime('Sep 1, 2025, 12:00pm', '2025-09-01')).toContain('2025-09-01');
      expect(parseCompletedDateTime('Oct 1, 2025, 12:00pm', '2025-10-01')).toContain('2025-10-01');
      expect(parseCompletedDateTime('Nov 1, 2025, 12:00pm', '2025-11-01')).toContain('2025-11-01');
      expect(parseCompletedDateTime('Dec 1, 2025, 12:00pm', '2025-12-01')).toContain('2025-12-01');
    });
  });

  describe('error handling', () => {
    test('returns fallback for invalid format', () => {
      const result = parseCompletedDateTime('invalid text', '2025-08-15');
      expect(result).toContain('2025-08-15');
    });

    test('returns fallback for unknown month', () => {
      const result = parseCompletedDateTime('Xyz 15, 2025, 3:00pm', '2025-08-15');
      expect(result).toContain('2025-08-15');
    });
  });
});

// ============================================================================
// DATE ARITHMETIC & RANGE GENERATION
// ============================================================================

describe('generateDateRange', () => {
  test('generates single day range', () => {
    const result = generateDateRange('2025-08-15', '2025-08-15');
    expect(result).toEqual(['2025-08-15']);
  });

  test('generates multi-day range', () => {
    const result = generateDateRange('2025-08-15', '2025-08-17');
    expect(result).toEqual(['2025-08-15', '2025-08-16', '2025-08-17']);
  });

  test('handles month boundary', () => {
    const result = generateDateRange('2025-08-30', '2025-09-02');
    expect(result).toEqual(['2025-08-30', '2025-08-31', '2025-09-01', '2025-09-02']);
  });

  test('handles year boundary', () => {
    const result = generateDateRange('2024-12-30', '2025-01-02');
    expect(result).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']);
  });

  test('handles leap year Feb 28-Mar 1', () => {
    const result = generateDateRange('2024-02-28', '2024-03-01');
    expect(result).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  test('handles non-leap year Feb 28-Mar 1', () => {
    const result = generateDateRange('2025-02-28', '2025-03-01');
    expect(result).toEqual(['2025-02-28', '2025-03-01']);
  });

  test('handles 30-day month boundary', () => {
    const result = generateDateRange('2025-04-29', '2025-05-02');
    expect(result).toEqual(['2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02']);
  });

  test('handles 31-day month boundary', () => {
    const result = generateDateRange('2025-01-30', '2025-02-02');
    expect(result).toEqual(['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']);
  });
});

describe('generateMonthRange', () => {
  test('generates single month range', () => {
    const result = generateMonthRange('2025-08-15', '2025-08-20');
    expect(result).toEqual(['2025-08']);
  });

  test('generates multi-month range', () => {
    const result = generateMonthRange('2025-08-01', '2025-10-31');
    expect(result).toEqual(['2025-08', '2025-09', '2025-10']);
  });

  test('handles year boundary', () => {
    const result = generateMonthRange('2024-11-01', '2025-02-28');
    expect(result).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
  });

  test('handles single-digit months with padding', () => {
    const result = generateMonthRange('2025-01-01', '2025-03-31');
    expect(result).toEqual(['2025-01', '2025-02', '2025-03']);
  });

  test('accepts YYYY-MM format directly', () => {
    const result = generateMonthRange('2025-08', '2025-10');
    expect(result).toEqual(['2025-08', '2025-09', '2025-10']);
  });

  test('handles full year', () => {
    const result = generateMonthRange('2025-01', '2025-12');
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('2025-01');
    expect(result[11]).toBe('2025-12');
  });
});

// ============================================================================
// ISO WEEK CALCULATIONS
// ============================================================================

describe('getWeekNumber', () => {
  test('returns week 1 for early January', () => {
    const date = new Date(2025, 0, 6); // January 6, 2025
    const weekNum = getWeekNumber(date);
    expect(weekNum).toBeGreaterThanOrEqual(1);
    expect(weekNum).toBeLessThanOrEqual(2);
  });

  test('handles late December (may be week 1 of next year)', () => {
    const date = new Date(2024, 11, 30); // December 30, 2024
    const weekNum = getWeekNumber(date);
    // Per ISO 8601, late December can be week 1 of next year or week 52/53 of current year
    expect(weekNum).toBeGreaterThanOrEqual(1);
    expect(weekNum).toBeLessThanOrEqual(53);
  });

  test('returns consistent results for same week', () => {
    const monday = new Date(2025, 7, 4); // August 4, 2025 (Monday)
    const friday = new Date(2025, 7, 8); // August 8, 2025 (Friday)
    expect(getWeekNumber(monday)).toBe(getWeekNumber(friday));
  });
});

describe('getISOWeekString', () => {
  test('formats week string correctly', () => {
    const date = new Date(2025, 7, 15); // August 15, 2025
    const result = getISOWeekString(date);
    expect(result).toMatch(/^2025-W\d{2}$/);
  });

  test('pads single digit weeks', () => {
    const date = new Date(2025, 0, 6); // Early January
    const result = getISOWeekString(date);
    expect(result).toMatch(/^2025-W0[1-9]$/);
  });

  test('handles double digit weeks', () => {
    const date = new Date(2025, 6, 15); // Mid July
    const result = getISOWeekString(date);
    expect(result).toMatch(/^2025-W[2-3]\d$/);
  });
});

describe('getWeekBounds', () => {
  test('returns Monday to Sunday for a week', () => {
    const { start, end } = getWeekBounds('2025-W33');

    // Monday
    expect(start.getDay()).toBe(1);

    // Sunday
    expect(end.getDay()).toBe(0);
  });

  test('returns 7-day span', () => {
    const { start, end } = getWeekBounds('2025-W33');
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7); // Monday to Sunday is actually 7 days (inclusive)
  });

  test('handles week 1', () => {
    const { start, end } = getWeekBounds('2025-W01');
    expect(start.getFullYear()).toBe(2024); // Week 1 of 2025 likely starts in late 2024
    expect(end.getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  test('handles week 52/53', () => {
    const { start, end } = getWeekBounds('2024-W52');
    expect(start.getFullYear()).toBe(2024);
    // End might be in 2025
    expect(end.getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});

// ============================================================================
// EDGE CASES & BOUNDARY TESTS
// ============================================================================

describe('Edge Cases', () => {
  describe('Leap years', () => {
    test('formatDate handles leap year correctly', () => {
      const result = formatDate('2024-02-29');
      expect(result).toContain('February 29, 2024');
    });

    test('generateDateRange handles leap year', () => {
      const result = generateDateRange('2024-02-28', '2024-03-01');
      expect(result).toHaveLength(3);
      expect(result[1]).toBe('2024-02-29');
    });

    test('parseCompletedDateTime handles leap year', () => {
      const result = parseCompletedDateTime('Feb 29, 2024, 12:00pm', '2024-02-29');
      expect(result).toContain('2024-02-29');
    });
  });

  describe('Year boundaries', () => {
    test('formatDate handles New Years Eve', () => {
      const result = formatDate('2024-12-31');
      expect(result).toBe('Tuesday, December 31, 2024');
    });

    test('formatDate handles New Years Day', () => {
      const result = formatDate('2025-01-01');
      expect(result).toBe('Wednesday, January 1, 2025');
    });

    test('generateDateRange crosses year boundary correctly', () => {
      const result = generateDateRange('2024-12-30', '2025-01-02');
      expect(result).toHaveLength(4);
      expect(result).toContain('2024-12-31');
      expect(result).toContain('2025-01-01');
    });

    test('generateMonthRange crosses year boundary', () => {
      const result = generateMonthRange('2024-11', '2025-02');
      expect(result).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
    });
  });

  describe('Month boundaries', () => {
    test('handles 28-day February in non-leap year', () => {
      const result = generateDateRange('2025-02-27', '2025-03-02');
      expect(result).toEqual(['2025-02-27', '2025-02-28', '2025-03-01', '2025-03-02']);
    });

    test('handles 30-day months', () => {
      const result = generateDateRange('2025-04-29', '2025-05-02');
      expect(result).toEqual(['2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02']);
    });

    test('handles 31-day months', () => {
      const result = generateDateRange('2025-07-30', '2025-08-02');
      expect(result).toEqual(['2025-07-30', '2025-07-31', '2025-08-01', '2025-08-02']);
    });
  });
});
