import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// TypeScript interfaces
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface BehaviorTimelineDataPoint {
  date: string;
  positiveCount: number;
  negativeCount: number;
}

export interface CategoryChartDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DataSet {
  label: string;
  data: number[];
}

// Category emoji mappings
export const ACTIVITY_EMOJIS: Record<string, string> = {
  Playtime: '🎾',
  Socialization: '🐕',
  Rest: '😴',
  Outdoor: '🌳',
  Training: '🎓',
  Enrichment: '🧩',
  'Special Event': '🎉',
  'Physical Skills': '💪',
};

export const TRAINING_EMOJIS: Record<string, string> = {
  'Obedience Commands': '🎯',
  'Impulse Control and Focus': '🧠',
  'Physical Skills': '💪',
  'Handling and Manners': '🤝',
  'Advanced Training': '🎓',
  'Fun Skills': '🎭',
};

// Helper function to convert snake_case category names to human-readable labels
export function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => (word === 'and' ? 'and' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

// Calculate grade percentage
export const gradeToPercent = (grade: number) => ((grade / 4.0) * 100).toFixed(0);

// Load grade data (timeline and trends)
export function loadGradeData() {
  const timelinePath = join(process.cwd(), 'data', 'viz', 'grade-timeline.json');
  const timeline = JSON.parse(readFileSync(timelinePath, 'utf-8'));

  const trendsPath = join(process.cwd(), 'data', 'analysis', 'aggregates', 'grade-trends.json');
  const trends = JSON.parse(readFileSync(trendsPath, 'utf-8'));

  return { timeline, trends };
}

// Load friend network data (optional - may not exist)
export function loadFriendsData() {
  try {
    const friendsPath = join(process.cwd(), 'data', 'analysis', 'aggregates', 'top-friends.json');
    return JSON.parse(readFileSync(friendsPath, 'utf-8'));
  } catch {
    return null;
  }
}

// Load activity breakdown data (optional)
export function loadActivityData() {
  try {
    const activityPath = join(
      process.cwd(),
      'data',
      'analysis',
      'aggregates',
      'activity-breakdown.json',
    );
    const activityData = JSON.parse(readFileSync(activityPath, 'utf-8'));

    const vizDir = join(process.cwd(), 'data', 'viz');
    const activityFrequencyViz = JSON.parse(
      readFileSync(join(vizDir, 'activity-frequency.json'), 'utf-8'),
    );
    const trainingFrequencyViz = JSON.parse(
      readFileSync(join(vizDir, 'training-frequency.json'), 'utf-8'),
    );

    // Transform Chart.js data to Recharts format
    const activityChartData: ChartDataPoint[] = activityFrequencyViz.data.labels.map(
      (label: string, i: number) => ({
        name: label,
        value: activityFrequencyViz.data.datasets[0].data[i],
        color:
          activityFrequencyViz.data.datasets[0].backgroundColor?.[i] ??
          activityFrequencyViz.data.datasets[0].backgroundColor,
      }),
    );

    const trainingChartData: ChartDataPoint[] = trainingFrequencyViz.data.labels.map(
      (label: string, i: number) => ({
        name: label,
        value: trainingFrequencyViz.data.datasets[0].data[i],
        color:
          trainingFrequencyViz.data.datasets[0].backgroundColor?.[i] ??
          trainingFrequencyViz.data.datasets[0].backgroundColor,
      }),
    );

    return {
      summary: activityData.summary,
      activityChartData,
      trainingChartData,
    };
  } catch {
    return null;
  }
}

// Load behavior data and visualization (optional)
export function loadBehaviorData() {
  try {
    const behaviorPath = join(
      process.cwd(),
      'data',
      'analysis',
      'aggregates',
      'behavior-trends.json',
    );
    const behaviorData = JSON.parse(readFileSync(behaviorPath, 'utf-8'));

    const vizDir = join(process.cwd(), 'data', 'viz');
    const behaviorTimelineViz = JSON.parse(
      readFileSync(join(vizDir, 'behavior-timeline.json'), 'utf-8'),
    );
    const behaviorFrequencyViz = JSON.parse(
      readFileSync(join(vizDir, 'behavior-frequency.json'), 'utf-8'),
    );

    // Transform behavior timeline data
    const labels = behaviorTimelineViz.data.labels;
    const positiveData =
      (behaviorTimelineViz.data.datasets as DataSet[]).find(
        (ds) => ds.label === 'Caught Being Good',
      )?.data || [];
    const negativeData =
      (behaviorTimelineViz.data.datasets as DataSet[]).find((ds) => ds.label === 'Ooops')?.data ||
      [];

    const timelineChartData: BehaviorTimelineDataPoint[] = labels.map(
      (date: string, i: number) => ({
        date,
        positiveCount: positiveData[i] || 0,
        negativeCount: negativeData[i] || 0,
      }),
    );

    // Transform behavior frequency data
    const frequencyChartData: ChartDataPoint[] = behaviorFrequencyViz.data.labels.map(
      (label: string, i: number) => ({
        name: label,
        value: behaviorFrequencyViz.data.datasets[0].data[i],
        color: behaviorFrequencyViz.data.datasets[0].backgroundColor[i],
      }),
    );

    return {
      summary: behaviorData.summary,
      positiveBehaviors: behaviorData.positiveBehaviors,
      negativeBehaviors: behaviorData.negativeBehaviors,
      timelineChartData,
      frequencyChartData,
    };
  } catch {
    return null;
  }
}

// Load AI category visualization data and learned mappings (optional)
export function loadCategoryData() {
  try {
    const vizDir = join(process.cwd(), 'data', 'viz');
    const aiActivityCategoriesViz = JSON.parse(
      readFileSync(join(vizDir, 'ai-activity-categories.json'), 'utf-8'),
    );
    const aiTrainingCategoriesViz = JSON.parse(
      readFileSync(join(vizDir, 'ai-training-categories.json'), 'utf-8'),
    );

    const learnedActivityPath = join(
      process.cwd(),
      'scripts',
      'analysis',
      'learned-activity-mappings.json',
    );
    const learnedTrainingPath = join(
      process.cwd(),
      'scripts',
      'analysis',
      'learned-training-mappings.json',
    );

    const learnedActivityMappings: Record<string, string[]> = JSON.parse(
      readFileSync(learnedActivityPath, 'utf-8'),
    );
    const learnedTrainingMappings: Record<string, string> = JSON.parse(
      readFileSync(learnedTrainingPath, 'utf-8'),
    );

    // Build reverse mappings: category -> items
    const activityCategoryItems: Record<string, string[]> = {};
    const trainingCategoryItems: Record<string, string[]> = {};

    // For activities (can have multiple categories per activity)
    for (const [activity, categories] of Object.entries(learnedActivityMappings)) {
      for (const category of categories) {
        const label = formatCategoryLabel(category);
        if (!activityCategoryItems[label]) {
          activityCategoryItems[label] = [];
        }
        activityCategoryItems[label].push(activity);
      }
    }

    // For training (single category per skill)
    for (const [skill, category] of Object.entries(learnedTrainingMappings)) {
      const label = formatCategoryLabel(category);
      if (!trainingCategoryItems[label]) {
        trainingCategoryItems[label] = [];
      }
      trainingCategoryItems[label].push(skill);
    }

    // Transform AI category data
    const aiActivityChartData: CategoryChartDataPoint[] = aiActivityCategoriesViz.data.labels.map(
      (label: string, i: number) => ({
        name: label,
        value: aiActivityCategoriesViz.data.datasets[0].data[i],
        color: aiActivityCategoriesViz.data.datasets[0].backgroundColor[i],
      }),
    );

    const aiTrainingChartData: CategoryChartDataPoint[] = aiTrainingCategoriesViz.data.labels.map(
      (label: string, i: number) => ({
        name: label,
        value: aiTrainingCategoriesViz.data.datasets[0].data[i],
        color: aiTrainingCategoriesViz.data.datasets[0].backgroundColor[i],
      }),
    );

    return {
      activityCategoryItems,
      trainingCategoryItems,
      aiActivityChartData,
      aiTrainingChartData,
      learnedActivityMappings,
      learnedTrainingMappings,
    };
  } catch (error) {
    console.error('Failed to load category data:', error);
    return null;
  }
}
