import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tests for learned mappings system
 *
 * Verifies that the learned mappings flow works correctly:
 * 1. Known items are found in mappings
 * 2. New items are detected as unmapped
 * 3. Mapping updates work correctly
 * 4. System handles multi-category activities
 */

// Load learned mappings (real files)
const activityMappingsPath = join(process.cwd(), 'scripts/analysis/learned-activity-mappings.json');
const trainingMappingsPath = join(process.cwd(), 'scripts/analysis/learned-training-mappings.json');

const LEARNED_ACTIVITY_MAPPINGS: Record<string, string[]> = JSON.parse(
  readFileSync(activityMappingsPath, 'utf-8'),
);
const LEARNED_TRAINING_MAPPINGS: Record<string, string> = JSON.parse(
  readFileSync(trainingMappingsPath, 'utf-8'),
);

describe('Learned Mappings System', () => {
  test('activity mappings file exists and is valid', () => {
    expect(LEARNED_ACTIVITY_MAPPINGS).toBeDefined();
    expect(typeof LEARNED_ACTIVITY_MAPPINGS).toBe('object');
    expect(Object.keys(LEARNED_ACTIVITY_MAPPINGS).length).toBeGreaterThan(0);
  });

  test('training mappings file exists and is valid', () => {
    expect(LEARNED_TRAINING_MAPPINGS).toBeDefined();
    expect(typeof LEARNED_TRAINING_MAPPINGS).toBe('object');
    expect(Object.keys(LEARNED_TRAINING_MAPPINGS).length).toBeGreaterThan(0);
  });

  test('activity mappings use arrays for multi-category support', () => {
    const firstActivity = Object.values(LEARNED_ACTIVITY_MAPPINGS)[0];
    expect(Array.isArray(firstActivity)).toBe(true);
  });

  test('training mappings use strings for single category', () => {
    const firstTraining = Object.values(LEARNED_TRAINING_MAPPINGS)[0];
    expect(typeof firstTraining).toBe('string');
  });

  test('all category keys use correct format with underscores', () => {
    // Check training categories use 'and' in key names where appropriate
    const trainingCategories = new Set(Object.values(LEARNED_TRAINING_MAPPINGS));

    // Should have impulse_control_and_focus, not impulse_control_focus
    const hasCorrectImpulseControl = Array.from(trainingCategories).some((cat) =>
      cat.includes('impulse_control_and_focus'),
    );
    const hasOldImpulseControl = Array.from(trainingCategories).some(
      (cat) => cat === 'impulse_control_focus',
    );

    expect(hasCorrectImpulseControl).toBe(true);
    expect(hasOldImpulseControl).toBe(false);

    // Should have handling_and_manners, not handling_manners
    const hasCorrectHandling = Array.from(trainingCategories).some((cat) =>
      cat.includes('handling_and_manners'),
    );
    const hasOldHandling = Array.from(trainingCategories).some((cat) => cat === 'handling_manners');

    expect(hasCorrectHandling).toBe(true);
    expect(hasOldHandling).toBe(false);
  });

  test('known items are found in mappings', () => {
    const knownActivity = 'played with my favorite toy';
    const knownTraining = 'sit (stay)';

    expect(LEARNED_ACTIVITY_MAPPINGS[knownActivity]).toBeDefined();
    expect(LEARNED_TRAINING_MAPPINGS[knownTraining]).toBeDefined();
  });

  test('multi-category activities work correctly', () => {
    // Find an activity with multiple categories
    const multiCategoryActivity = Object.entries(LEARNED_ACTIVITY_MAPPINGS).find(
      ([_, categories]) => categories.length > 1,
    );

    expect(multiCategoryActivity).toBeDefined();
    if (multiCategoryActivity) {
      const [_item, categories] = multiCategoryActivity;
      expect(categories.length).toBeGreaterThan(1);
      expect(Array.isArray(categories)).toBe(true);
    }
  });
});

describe('New Items Detection Flow', () => {
  test('detects known activity correctly', () => {
    const activity = 'played with my favorite toy';
    const categories = LEARNED_ACTIVITY_MAPPINGS[activity];

    expect(categories).toBeDefined();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories).toContain('playtime');
  });

  test('detects new activity correctly', () => {
    const newActivity = 'splash pad fun'; // Not in mappings
    const categories = LEARNED_ACTIVITY_MAPPINGS[newActivity];

    expect(categories).toBeUndefined();
  });

  test('detects known training skill correctly', () => {
    const skill = 'sit (stay)';
    const category = LEARNED_TRAINING_MAPPINGS[skill];

    expect(category).toBeDefined();
    expect(category).toBe('obedience_commands');
  });

  test('detects new training skill correctly', () => {
    const newSkill = 'touch targeting'; // Not in mappings
    const category = LEARNED_TRAINING_MAPPINGS[newSkill];

    expect(category).toBeUndefined();
  });
});

describe('Mapping Update Simulation', () => {
  test('simulates adding new activity mapping', () => {
    const mockMappings = { ...LEARNED_ACTIVITY_MAPPINGS };
    const newActivity = 'splash pad fun';
    const newCategories = ['playtime', 'outdoor'];

    // Simulate update
    mockMappings[newActivity] = newCategories;

    expect(mockMappings[newActivity]).toBeDefined();
    expect(mockMappings[newActivity]).toEqual(['playtime', 'outdoor']);
    expect(Object.keys(mockMappings).length).toBe(
      Object.keys(LEARNED_ACTIVITY_MAPPINGS).length + 1,
    );
  });

  test('simulates adding new training mapping', () => {
    const mockMappings = { ...LEARNED_TRAINING_MAPPINGS };
    const newSkill = 'touch targeting';
    const newCategory = 'fun_skills';

    // Simulate update
    mockMappings[newSkill] = newCategory;

    expect(mockMappings[newSkill]).toBeDefined();
    expect(mockMappings[newSkill]).toBe('fun_skills');
    expect(Object.keys(mockMappings).length).toBe(
      Object.keys(LEARNED_TRAINING_MAPPINGS).length + 1,
    );
  });

  test('simulates full flow: known items use cache, new items need AI', () => {
    const reportActivities = [
      'played with my favorite toy', // Known
      'splash pad fun', // New
      'hung out with my bestie', // Known
    ];

    const reportTraining = [
      'sit (stay)', // Known
      'touch targeting', // New
      'recall', // Known
    ];

    const unmappedActivities: string[] = [];
    const unmappedTraining: string[] = [];

    // Check activities
    for (const activity of reportActivities) {
      if (!LEARNED_ACTIVITY_MAPPINGS[activity]) {
        unmappedActivities.push(activity);
      }
    }

    // Check training
    for (const skill of reportTraining) {
      if (!LEARNED_TRAINING_MAPPINGS[skill]) {
        unmappedTraining.push(skill);
      }
    }

    expect(unmappedActivities).toEqual(['splash pad fun']);
    expect(unmappedTraining).toEqual(['touch targeting']);
  });

  test('simulates second report after mappings updated (all cached)', () => {
    // Simulate updated mappings after first report
    const updatedActivityMappings: Record<string, string[]> = {
      ...LEARNED_ACTIVITY_MAPPINGS,
      'splash pad fun': ['playtime', 'outdoor'],
    };
    const updatedTrainingMappings: Record<string, string> = {
      ...LEARNED_TRAINING_MAPPINGS,
      'touch targeting': 'fun_skills',
    };

    const reportActivities = [
      'played with my favorite toy', // Known
      'splash pad fun', // NOW known (was new)
      'hung out with my bestie', // Known
    ];

    const reportTraining = [
      'sit (stay)', // Known
      'touch targeting', // NOW known (was new)
      'recall', // Known
    ];

    const unmappedActivities: string[] = [];
    const unmappedTraining: string[] = [];

    // Check activities
    for (const activity of reportActivities) {
      if (!updatedActivityMappings[activity]) {
        unmappedActivities.push(activity);
      }
    }

    // Check training
    for (const skill of reportTraining) {
      if (!updatedTrainingMappings[skill]) {
        unmappedTraining.push(skill);
      }
    }

    // All should be found now
    expect(unmappedActivities).toEqual([]);
    expect(unmappedTraining).toEqual([]);
  });
});

describe('Category Key Consistency', () => {
  test('all training category keys match expected format', () => {
    const expectedCategories = [
      'obedience_commands',
      'impulse_control_and_focus', // With 'and'
      'physical_skills',
      'handling_and_manners', // With 'and'
      'advanced_training',
      'fun_skills',
    ];

    const actualCategories = [...new Set(Object.values(LEARNED_TRAINING_MAPPINGS))].sort();

    // All actual categories should be in expected list
    for (const category of actualCategories) {
      expect(expectedCategories).toContain(category);
    }
  });

  test('all activity category keys match expected format', () => {
    const expectedCategories = [
      'playtime',
      'socialization',
      'rest',
      'outdoor',
      'enrichment',
      'training',
      'special_event',
    ];

    const actualCategories = [...new Set(Object.values(LEARNED_ACTIVITY_MAPPINGS).flat())].sort();

    // All actual categories should be in expected list
    for (const category of actualCategories) {
      expect(expectedCategories).toContain(category);
    }
  });

  test('nose targeting has correct category', () => {
    const noseTargeting = LEARNED_TRAINING_MAPPINGS['nose targeting'];

    expect(noseTargeting).toBeDefined();
    expect(noseTargeting).toBe('impulse_control_and_focus');
  });
});
