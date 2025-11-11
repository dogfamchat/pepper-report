/**
 * Activity categorization mappings for report card analysis
 *
 * Categories are split into two groups:
 * 1. Activity categories (from "What I Did Today")
 * 2. Training skill categories (from "Training Skills I Practiced Today")
 *
 * Activities from fixed checkboxes on daycare's report card app.
 */

// Activity categories (from "What I Did Today")
export type ActivityCategory =
  | 'playtime'
  | 'socialization'
  | 'rest'
  | 'outdoor'
  | 'enrichment'
  | 'training'
  | 'special_event';

// Training skill categories (from "Training Skills I Practiced Today")
export type TrainingCategory =
  | 'obedience_commands'
  | 'impulse_control_focus'
  | 'physical_skills'
  | 'handling_manners'
  | 'advanced_training'
  | 'fun_skills';

export type Category = ActivityCategory | TrainingCategory;

/**
 * Maps "What I Did Today" activities to their categories
 * Each activity can belong to multiple categories
 */
export const ACTIVITY_CATEGORY_MAP: Record<string, ActivityCategory[]> = {
  'brain building games and challenges': ['enrichment'],
  'caught bubbles': ['playtime', 'enrichment'],
  'engagement games': ['enrichment'],
  'had a pool party': ['playtime', 'outdoor', 'socialization'],
  'hung out with my bestie': ['socialization'],
  'napped with friends': ['rest'],
  'nose work games and challenges': ['enrichment', 'training'],
  'one-on-one time with the trainer': ['training'],
  'party animal': ['playtime', 'socialization'],
  'played on the agility equipment': ['playtime', 'training'],
  'played outdoors': ['playtime', 'outdoor'],
  'played with as many buddies as possible': ['playtime', 'socialization'],
  'played with my favorite toy': ['playtime'],
  'special event': ['special_event'],
};

/**
 * Maps training skills to their categories
 * Each skill belongs to exactly one training category
 */
export const TRAINING_CATEGORY_MAP: Record<string, TrainingCategory> = {
  // Obedience Commands
  'sit (stay)': 'obedience_commands',
  'down (stay)': 'obedience_commands',
  'stand (stay)': 'obedience_commands',
  recall: 'obedience_commands',
  'name recognition': 'obedience_commands',

  // Impulse Control & Focus
  'impulse control': 'impulse_control_focus',
  'focus work': 'impulse_control_focus',
  'jazz up, settle down': 'impulse_control_focus',

  // Physical Skills
  agility: 'physical_skills',
  'balancing skills': 'physical_skills',

  // Handling & Manners
  'collar grab games': 'handling_manners',
  'handling (exam style)': 'handling_manners',
  'loose-leash walking': 'handling_manners',
  'boundries, door-ways, and thresholds': 'handling_manners',
  'place work (go to matt/table)': 'handling_manners',
  'crate training': 'handling_manners',

  // Advanced Training
  'sequence (3 different skills in varying order)': 'advanced_training',
  'recall with distractions': 'advanced_training',
  'hands-free work': 'advanced_training',

  // Fun Skills
  'trick training': 'fun_skills',
};

/**
 * Human-readable category labels for display
 */
export const CATEGORY_LABELS: Record<Category, string> = {
  // Activity categories
  playtime: 'Playtime',
  socialization: 'Socialization',
  rest: 'Rest',
  outdoor: 'Outdoor',
  enrichment: 'Enrichment',
  training: 'Training',
  special_event: 'Special Event',

  // Training categories
  obedience_commands: 'Obedience Commands',
  impulse_control_focus: 'Impulse Control & Focus',
  physical_skills: 'Physical Skills',
  handling_manners: 'Handling & Manners',
  advanced_training: 'Advanced Training',
  fun_skills: 'Fun Skills',
};

/**
 * Color scheme for charts (Chart.js compatible)
 */
export const CATEGORY_COLORS: Record<Category, string> = {
  // Activity categories - warm/vibrant colors
  playtime: '#FF6B9D', // Pink
  socialization: '#4ECDC4', // Teal
  rest: '#95E1D3', // Mint
  outdoor: '#A8E6CF', // Light green
  enrichment: '#FFD93D', // Yellow
  training: '#C7CEEA', // Lavender
  special_event: '#FF9FF3', // Fuchsia

  // Training categories - cool/professional colors
  obedience_commands: '#6C5CE7', // Purple
  impulse_control_focus: '#0984E3', // Blue
  physical_skills: '#00B894', // Green
  handling_manners: '#FDCB6E', // Gold
  advanced_training: '#E17055', // Coral
  fun_skills: '#FD79A8', // Hot pink
};
