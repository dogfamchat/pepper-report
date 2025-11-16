/**
 * Activity frequency calculation for report card analysis
 *
 * This module provides functions to track raw activity and training skill frequencies
 * across report cards, used for "Top 10" frequency charts.
 */

/**
 * Type that has the minimum fields needed for frequency calculation
 */
type FrequencyCalculable = {
  rawActivities?: string[];
  rawTrainingSkills?: string[];
};

/**
 * Calculate frequency of individual activities/skills across multiple reports
 */
export function calculateFrequencies(categorizations: FrequencyCalculable[]): {
  activityFrequency: Record<string, number>;
  trainingFrequency: Record<string, number>;
} {
  const activityFrequency: Record<string, number> = {};
  const trainingFrequency: Record<string, number> = {};

  for (const categorization of categorizations) {
    // Count each activity (if they exist)
    if (categorization.rawActivities) {
      for (const activity of categorization.rawActivities) {
        activityFrequency[activity] = (activityFrequency[activity] || 0) + 1;
      }
    }

    // Count each training skill (if they exist)
    if (categorization.rawTrainingSkills) {
      for (const skill of categorization.rawTrainingSkills) {
        trainingFrequency[skill] = (trainingFrequency[skill] || 0) + 1;
      }
    }
  }

  return {
    activityFrequency,
    trainingFrequency,
  };
}

/**
 * AI Categorization type (must match extract-daily.ts)
 */
export interface AICategorization {
  item: string;
  category: string;
  confidence?: number;
}

/**
 * Type that has AI categorization fields
 */
type AICategorizableMinimal = {
  aiActivityCategories?: AICategorization[];
  aiTrainingCategories?: AICategorization[];
};

/**
 * Aggregate AI-suggested category counts across multiple reports
 * Returns counts for all unique categories suggested by AI
 */
export function aggregateAICategoryCounts(analyses: AICategorizableMinimal[]): {
  activityCounts: Record<string, number>;
  trainingCounts: Record<string, number>;
  totalReports: number;
  totalActivityInstances: number;
  totalTrainingInstances: number;
} {
  const activityCounts: Record<string, number> = {};
  const trainingCounts: Record<string, number> = {};
  let totalActivityInstances = 0;
  let totalTrainingInstances = 0;

  for (const analysis of analyses) {
    // Count AI activity categories
    if (analysis.aiActivityCategories) {
      for (const cat of analysis.aiActivityCategories) {
        activityCounts[cat.category] = (activityCounts[cat.category] || 0) + 1;
        totalActivityInstances++;
      }
    }

    // Count AI training categories
    if (analysis.aiTrainingCategories) {
      for (const cat of analysis.aiTrainingCategories) {
        trainingCounts[cat.category] = (trainingCounts[cat.category] || 0) + 1;
        totalTrainingInstances++;
      }
    }
  }

  return {
    activityCounts,
    trainingCounts,
    totalReports: analyses.length,
    totalActivityInstances,
    totalTrainingInstances,
  };
}
