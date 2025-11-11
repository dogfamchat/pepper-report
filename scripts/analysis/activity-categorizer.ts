/**
 * Activity categorization logic for report card analysis
 *
 * This module provides functions to categorize activities and training skills
 * from report cards into their respective categories.
 */

import type { ReportCard } from '../types';
import {
  ACTIVITY_CATEGORY_MAP,
  type ActivityCategory,
  type Category,
  TRAINING_CATEGORY_MAP,
  type TrainingCategory,
} from './activity-categories';

/**
 * Result of categorizing a single report card
 */
export interface ActivityCategorization {
  date: string;
  // Category counts (aggregated view)
  activityCounts: Record<ActivityCategory, number>;
  trainingCounts: Record<TrainingCategory, number>;
  // Raw data (detailed view)
  rawActivities: string[];
  rawTrainingSkills: string[];
  totalActivities: number;
  totalTrainingSkills: number;
}

/**
 * Categorize all activities and training skills from a report card
 */
export function categorizeReport(report: ReportCard): ActivityCategorization {
  const activityCounts: Record<ActivityCategory, number> = {
    playtime: 0,
    socialization: 0,
    rest: 0,
    outdoor: 0,
    enrichment: 0,
    training: 0,
    special_event: 0,
  };

  const trainingCounts: Record<TrainingCategory, number> = {
    obedience_commands: 0,
    impulse_control_focus: 0,
    physical_skills: 0,
    handling_manners: 0,
    advanced_training: 0,
    fun_skills: 0,
  };

  // Categorize "What I Did Today" activities
  for (const activity of report.whatIDidToday || []) {
    const categories = ACTIVITY_CATEGORY_MAP[activity];
    if (categories) {
      for (const category of categories) {
        activityCounts[category]++;
      }
    }
  }

  // Categorize "Training Skills"
  for (const skill of report.trainingSkills || []) {
    const category = TRAINING_CATEGORY_MAP[skill];
    if (category) {
      trainingCounts[category]++;
    }
  }

  return {
    date: report.date,
    activityCounts,
    trainingCounts,
    rawActivities: report.whatIDidToday || [],
    rawTrainingSkills: report.trainingSkills || [],
    totalActivities: report.whatIDidToday?.length || 0,
    totalTrainingSkills: report.trainingSkills?.length || 0,
  };
}

/**
 * Aggregate category counts across multiple reports
 */
export function aggregateCategoryCounts(categorizations: ActivityCategorization[]): {
  activityTotals: Record<ActivityCategory, number>;
  trainingTotals: Record<TrainingCategory, number>;
  totalReports: number;
} {
  const activityTotals: Record<ActivityCategory, number> = {
    playtime: 0,
    socialization: 0,
    rest: 0,
    outdoor: 0,
    enrichment: 0,
    training: 0,
    special_event: 0,
  };

  const trainingTotals: Record<TrainingCategory, number> = {
    obedience_commands: 0,
    impulse_control_focus: 0,
    physical_skills: 0,
    handling_manners: 0,
    advanced_training: 0,
    fun_skills: 0,
  };

  for (const categorization of categorizations) {
    // Sum up activity counts
    for (const [category, count] of Object.entries(categorization.activityCounts)) {
      activityTotals[category as ActivityCategory] += count;
    }

    // Sum up training counts
    for (const [category, count] of Object.entries(categorization.trainingCounts)) {
      trainingTotals[category as TrainingCategory] += count;
    }
  }

  return {
    activityTotals,
    trainingTotals,
    totalReports: categorizations.length,
  };
}

/**
 * Calculate frequency of individual activities/skills across multiple reports
 */
export function calculateFrequencies(categorizations: ActivityCategorization[]): {
  activityFrequency: Record<string, number>;
  trainingFrequency: Record<string, number>;
} {
  const activityFrequency: Record<string, number> = {};
  const trainingFrequency: Record<string, number> = {};

  for (const categorization of categorizations) {
    // Count each activity
    for (const activity of categorization.rawActivities) {
      activityFrequency[activity] = (activityFrequency[activity] || 0) + 1;
    }

    // Count each training skill
    for (const skill of categorization.rawTrainingSkills) {
      trainingFrequency[skill] = (trainingFrequency[skill] || 0) + 1;
    }
  }

  return {
    activityFrequency,
    trainingFrequency,
  };
}

/**
 * Calculate percentages for chart display
 */
export function calculatePercentages(counts: Record<Category, number>): Record<
  Category,
  {
    count: number;
    percentage: number;
  }
> {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const result: Record<
    Category,
    {
      count: number;
      percentage: number;
    }
  > = {} as Record<
    Category,
    {
      count: number;
      percentage: number;
    }
  >;

  for (const [category, count] of Object.entries(counts)) {
    result[category as Category] = {
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  }

  return result;
}
