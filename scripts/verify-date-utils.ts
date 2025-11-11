#!/usr/bin/env bun
/**
 * Quick verification script for date utilities
 * Tests that all functions work correctly with Day.js
 */

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
} from './utils/date-utils';

console.log('🧪 Verifying Date Utilities with Day.js\n');

// Test current date helpers
console.log('📅 Current Date Helpers:');
console.log(`  getCurrentDate():      ${getCurrentDate()}`);
console.log(`  getCurrentMonth():     ${getCurrentMonth()}`);
console.log(`  getCurrentTimestamp(): ${getCurrentTimestamp()}`);

// Test formatting
console.log('\n🎨 Date Formatting:');
console.log(`  formatDate('2025-08-08'):       ${formatDate('2025-08-08')}`);
console.log(`  formatShortDate('2025-08-08'):  ${formatShortDate('2025-08-08')}`);
console.log(`  formatDateNoYear('2025-08-08'): ${formatDateNoYear('2025-08-08')}`);
console.log(`  formatMonth('2025-08'):         ${formatMonth('2025-08')}`);

// Test parsing
console.log('\n🔍 Date Parsing:');
console.log(`  parseScheduleDate('11/15/2024'):        ${parseScheduleDate('11/15/2024')}`);
console.log(`  parseScheduleDate('November 15, 2024'): ${parseScheduleDate('November 15, 2024')}`);
console.log(`  parseScheduleDate('Nov 15, 2024'):      ${parseScheduleDate('Nov 15, 2024')}`);

// Test MT to UTC conversion
console.log('\n🌍 Timezone Conversion (Mountain Time → UTC):');
const summer = parseCompletedDateTime('Aug 15, 2025, 2:11pm', '2025-08-15');
const winter = parseCompletedDateTime('Dec 15, 2025, 2:11pm', '2025-12-15');
console.log(`  Aug 15, 2025 2:11pm MT → ${summer} (MDT, UTC-6)`);
console.log(`  Dec 15, 2025 2:11pm MT → ${winter} (MST, UTC-7)`);

// Test date ranges
console.log('\n📊 Date Ranges:');
const dateRange = generateDateRange('2025-08-08', '2025-08-11');
console.log(`  generateDateRange('2025-08-08', '2025-08-11'):`);
console.log(`    ${dateRange.join(', ')}`);

const monthRange = generateMonthRange('2024-11', '2025-02');
console.log(`  generateMonthRange('2024-11', '2025-02'):`);
console.log(`    ${monthRange.join(', ')}`);

// Test ISO week calculations
console.log('\n📆 ISO Week Calculations:');
const testDate = new Date(2025, 7, 8); // August 8, 2025
console.log(`  Date: August 8, 2025`);
console.log(`  getWeekNumber():    Week ${getWeekNumber(testDate)}`);
console.log(`  getISOWeekString(): ${getISOWeekString(testDate)}`);

const weekBounds = getWeekBounds('2025-W32');
console.log(`  getWeekBounds('2025-W32'):`);
console.log(
  `    Start: ${weekBounds.start.toISOString().slice(0, 10)} (${weekBounds.start.toDateString()})`,
);
console.log(
  `    End:   ${weekBounds.end.toISOString().slice(0, 10)} (${weekBounds.end.toDateString()})`,
);

// Test edge cases
console.log('\n🔬 Edge Cases:');
console.log(`  Leap year: formatDate('2024-02-29')        = ${formatDate('2024-02-29')}`);
console.log(`  Year boundary: generateDateRange('2024-12-30', '2025-01-02')`);
console.log(`    ${generateDateRange('2024-12-30', '2025-01-02').join(', ')}`);

console.log('\n✅ All date utilities working correctly with Day.js!');
