/**
 * TypeScript type definitions for Pepper Report data structures
 */

// ===== Report Card Types =====

export interface ReportCard {
  date: string; // ISO date format: YYYY-MM-DD
  grade: Grade;
  staffNotes: string;
  activities: Activity[];
  staffNames: string[]; // Anonymized names
  friends: string[]; // Other dogs' first names
  photos: string[]; // Photo filenames or R2 URLs
}

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export type Activity =
  | 'playtime'
  | 'nap'
  | 'outdoor'
  | 'training'
  | 'grooming'
  | 'feeding'
  | 'socialization'
  | 'enrichment'
  | 'special-event';

// ===== Schedule Types =====

export interface Schedule {
  [yearMonth: string]: string[]; // e.g., "2024-11": ["2024-11-05", "2024-11-07"]
}

// ===== Analysis Types =====

export interface WeeklySummary {
  week: string; // ISO week format: YYYY-Www (e.g., "2024-W45")
  startDate: string;
  endDate: string;
  daysAttended: number;
  averageGrade: number; // Numeric grade (A=4.0, B=3.0, etc.)
  gradeDistribution: Record<Grade, number>;
  totalFriendMentions: number;
  topFriends: string[];
  activities: Record<Activity, number>;
  highlights: string[];
}

export interface TopFriends {
  summary: {
    totalReportCards: number;
    uniqueFriends: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  friends: FriendStats[];
}

export interface FriendStats {
  name: string;
  mentions: number;
  percentage: number; // Percentage of report cards mentioning this friend
  firstSeen: string;
  lastSeen: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface AIInsights {
  date: string;
  reportCardDate: string;
  summary: string;
  behavioralPatterns: string[];
  suggestedQuestions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ===== Visualization Data Types =====

export interface GradeTimeline {
  labels: string[]; // Dates
  datasets: [{
    label: string;
    data: number[]; // Numeric grades
    borderColor: string;
    backgroundColor: string;
  }];
}

export interface FriendNetwork {
  nodes: {
    id: string;
    label: string;
    size: number; // Based on mention frequency
  }[];
  edges: {
    from: string;
    to: string;
    weight: number;
  }[];
}

export interface WeeklyActivity {
  labels: string[]; // Week labels
  datasets: {
    label: Activity;
    data: number[];
    backgroundColor: string;
  }[];
}

// ===== Photo Metadata =====

export interface PhotoMetadata {
  filename: string;
  date: string;
  r2Url?: string; // Cloudflare R2 URL
  thumbnailUrl?: string;
  size: number; // Bytes
  width: number;
  height: number;
  uploaded: string; // ISO timestamp
}

export interface PhotosCollection {
  photos: PhotoMetadata[];
  totalSize: number;
  count: number;
}

// ===== Utility Types =====

export interface StaffMapping {
  [realName: string]: string; // Real name -> Pseudonym
}

// ===== Helper Functions =====

export function gradeToNumber(grade: Grade): number {
  const gradeMap: Record<Grade, number> = {
    'A+': 4.3,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D': 1.0,
    'F': 0.0,
  };
  return gradeMap[grade] || 0;
}

export function numberToGrade(num: number): Grade {
  if (num >= 4.2) return 'A+';
  if (num >= 3.85) return 'A';
  if (num >= 3.5) return 'A-';
  if (num >= 3.15) return 'B+';
  if (num >= 2.85) return 'B';
  if (num >= 2.5) return 'B-';
  if (num >= 2.15) return 'C+';
  if (num >= 1.85) return 'C';
  if (num >= 1.5) return 'C-';
  if (num >= 0.5) return 'D';
  return 'F';
}
