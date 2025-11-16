import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tests for categorization system consistency
 *
 * Verifies that:
 * 1. AI prompt category keys match learned mapping keys
 * 2. Label formatting works correctly
 * 3. All daily analysis data is consistent with learned mappings
 */

// Load learned mappings
const activityMappingsPath = join(process.cwd(), 'scripts/analysis/learned-activity-mappings.json');
const trainingMappingsPath = join(process.cwd(), 'scripts/analysis/learned-training-mappings.json');

const LEARNED_ACTIVITY_MAPPINGS: Record<string, string[]> = JSON.parse(
  readFileSync(activityMappingsPath, 'utf-8'),
);
const LEARNED_TRAINING_MAPPINGS: Record<string, string> = JSON.parse(
  readFileSync(trainingMappingsPath, 'utf-8'),
);

// Extract category keys from AI prompt in extract-daily.ts
const extractDailyPath = join(process.cwd(), 'scripts/analysis/extract-daily.ts');
const extractDailyContent = readFileSync(extractDailyPath, 'utf-8');

describe('AI Prompt Consistency', () => {
  test('training categories in AI prompt match learned mapping keys', () => {
    // Extract the unique training categories used in learned mappings
    const actualCategories = [...new Set(Object.values(LEARNED_TRAINING_MAPPINGS))].sort();

    // Check that the prompt mentions these categories
    for (const category of actualCategories) {
      const categoryPattern = new RegExp(`-\\s*${category}:`, 'i');
      expect(extractDailyContent).toMatch(categoryPattern);
    }

    // Verify specific categories with "and" are in the prompt (not old versions)
    expect(extractDailyContent).toMatch(/impulse_control_and_focus:/);
    expect(extractDailyContent).toMatch(/handling_and_manners:/);

    // Ensure old versions are NOT in the prompt
    expect(extractDailyContent).not.toMatch(/impulse_control_focus(?!_and):/);
    expect(extractDailyContent).not.toMatch(/handling_manners(?!_and):/);
  });

  test('activity categories in AI prompt match learned mapping keys', () => {
    // Extract unique activity categories
    const actualCategories = [...new Set(Object.values(LEARNED_ACTIVITY_MAPPINGS).flat())].sort();

    // Check that the prompt mentions these categories
    for (const category of actualCategories) {
      const categoryPattern = new RegExp(`-\\s*${category}:`, 'i');
      expect(extractDailyContent).toMatch(categoryPattern);
    }
  });
});

describe('Label Formatting', () => {
  // Replicate the formatCategoryLabel function from trends.astro
  function formatCategoryLabel(category: string): string {
    return category
      .split('_')
      .map((word) => (word === 'and' ? 'and' : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ');
  }

  test('formats impulse_control_and_focus correctly', () => {
    expect(formatCategoryLabel('impulse_control_and_focus')).toBe('Impulse Control and Focus');
  });

  test('formats handling_and_manners correctly', () => {
    expect(formatCategoryLabel('handling_and_manners')).toBe('Handling and Manners');
  });

  test('formats obedience_commands correctly', () => {
    expect(formatCategoryLabel('obedience_commands')).toBe('Obedience Commands');
  });

  test('formats physical_skills correctly', () => {
    expect(formatCategoryLabel('physical_skills')).toBe('Physical Skills');
  });

  test('formats advanced_training correctly', () => {
    expect(formatCategoryLabel('advanced_training')).toBe('Advanced Training');
  });

  test('formats fun_skills correctly', () => {
    expect(formatCategoryLabel('fun_skills')).toBe('Fun Skills');
  });

  test('formats special_event correctly', () => {
    expect(formatCategoryLabel('special_event')).toBe('Special Event');
  });

  test('keeps "and" lowercase in multi-word categories', () => {
    const result = formatCategoryLabel('impulse_control_and_focus');
    expect(result).toMatch(/\sand\s/); // "and" should be surrounded by spaces and lowercase
    expect(result).not.toMatch(/\sAnd\s/);
  });

  test('capitalizes all words except "and"', () => {
    const categories = [
      'impulse_control_and_focus',
      'handling_and_manners',
      'obedience_commands',
      'physical_skills',
    ];

    for (const category of categories) {
      const formatted = formatCategoryLabel(category);
      const words = formatted.split(' ');

      for (const word of words) {
        if (word === 'and') {
          expect(word).toBe('and'); // Should be lowercase
        } else {
          expect(word[0]).toBe(word[0].toUpperCase()); // Should be capitalized
        }
      }
    }
  });
});

describe('Data Integrity', () => {
  test('all training categories in learned mappings are valid', () => {
    const validCategories = [
      'obedience_commands',
      'impulse_control_and_focus',
      'physical_skills',
      'handling_and_manners',
      'advanced_training',
      'fun_skills',
    ];

    const usedCategories = Object.values(LEARNED_TRAINING_MAPPINGS);

    for (const category of usedCategories) {
      expect(validCategories).toContain(category);
    }
  });

  test('all activity categories in learned mappings are valid', () => {
    const validCategories = [
      'playtime',
      'socialization',
      'rest',
      'outdoor',
      'enrichment',
      'training',
      'special_event',
    ];

    const usedCategories = Object.values(LEARNED_ACTIVITY_MAPPINGS).flat();

    for (const category of usedCategories) {
      expect(validCategories).toContain(category);
    }
  });

  test('no duplicate activity mappings', () => {
    const items = Object.keys(LEARNED_ACTIVITY_MAPPINGS);
    const uniqueItems = [...new Set(items)];

    expect(items.length).toBe(uniqueItems.length);
  });

  test('no duplicate training mappings', () => {
    const items = Object.keys(LEARNED_TRAINING_MAPPINGS);
    const uniqueItems = [...new Set(items)];

    expect(items.length).toBe(uniqueItems.length);
  });

  test('activity mappings have at least one category', () => {
    for (const [_item, categories] of Object.entries(LEARNED_ACTIVITY_MAPPINGS)) {
      expect(categories.length).toBeGreaterThan(0);
    }
  });

  test('training mappings have non-empty category strings', () => {
    for (const [_item, category] of Object.entries(LEARNED_TRAINING_MAPPINGS)) {
      expect(category).toBeTruthy();
      expect(category.length).toBeGreaterThan(0);
    }
  });
});

describe('Specific Item Validations', () => {
  test('"nose targeting" is categorized as impulse_control_and_focus', () => {
    expect(LEARNED_TRAINING_MAPPINGS['nose targeting']).toBe('impulse_control_and_focus');
  });

  test('"confidence building" is categorized as physical_skills', () => {
    expect(LEARNED_TRAINING_MAPPINGS['confidence building']).toBe('physical_skills');
  });

  test('multi-category activities exist', () => {
    // Verify we have activities with multiple categories
    const multiCategoryCount = Object.values(LEARNED_ACTIVITY_MAPPINGS).filter(
      (cats) => cats.length > 1,
    ).length;

    expect(multiCategoryCount).toBeGreaterThan(0);
  });

  test('"nose work games and challenges" has multiple categories', () => {
    const categories = LEARNED_ACTIVITY_MAPPINGS['nose work games and challenges'];
    expect(categories).toBeDefined();
    expect(categories.length).toBeGreaterThan(1);
    expect(categories).toContain('enrichment');
    expect(categories).toContain('training');
  });
});
