/**
 * TypeScript type definitions for Pepper Report data structures
 */

// ===== Report Card Types =====

/**
 * Report card data structure as scraped from the daycare website
 * Based on documentation in docs/report-card-data-structure.md
 */
export interface ReportCard {
  /** ISO date format: YYYY-MM-DD */
  date: string;

  /** Full timestamp when report was completed: ISO 8601 format */
  completedDateTime: string;

  /** Dog information from report title */
  dog: {
    /** Dog's name (always "Pepper") */
    name: string;
    /** Owner names from report title (e.g., "John & Nadine") */
    owners: string;
  };

  /** Anonymized staff trainer names (from multi-select field) */
  staffNames: string[];

  /** Letter grade from behavior field */
  grade: Grade;

  /** Full text description of the selected grade */
  gradeDescription: string;

  /** Selected option from "best part of my day" dropdown */
  bestPartOfDay: string;

  /** Selected checkboxes from "What I did today" field */
  whatIDidToday: string[];

  /** Selected checkboxes from "Training skills I practiced today" field */
  trainingSkills: string[];

  /** Selected items from "Caught being good!" multi-select */
  caughtBeingGood: string[];

  /** Selected items from "Ooops...!" multi-select */
  ooops: string[];

  /** Combined noteworthy comments from main field and continuation fields */
  noteworthyComments: string;

  /** Photo filenames or R2 URLs */
  photos: string[];

  /** Administrative metadata from report list table */
  metadata: {
    /** Anonymized name of staff who added the report */
    addedBy: string;
    /** Anonymized name of staff who completed the report */
    completedBy: string;
    /** Anonymized name of staff who amended (if any) */
    amendedBy?: string;
  };
}

/** Letter grades for behavior assessment (no F grade in actual system) */
export type Grade = 'A' | 'B' | 'C' | 'D';

/**
 * Options for "best part of my day" dropdown field
 */
export type BestPartOption =
  | 'making new friends.'
  | 'playing with familiar friends.'
  | 'hanging out with my bestie.'
  | 'cuddling with friends.'
  | 'getting cuddles from the trainer.'
  | 'eating cookies!'
  | 'learning something new.'
  | 'having a pool party!'
  | 'soaking up the sun.'
  | 'playing outside!'
  | 'mastering the agility equipment!';

// ===== Scraper Data Types =====

/**
 * Raw data extracted from report list table row
 * Before processing and anonymization
 */
export interface ReportListRow {
  /** Form name (always "Dayschool Report Card") */
  formName: string;
  /** Date and time the report was added */
  addedOn: string;
  /** Completion status (e.g., "Completed") */
  status: string;
  /** Date and time the report was completed */
  completedOn: string;
  /** Real staff name who completed (before anonymization) */
  completedBy: string;
  /** Real staff name who amended, if any (before anonymization) */
  amendedBy?: string;
  /** Real staff name who added from "Source" column (before anonymization) */
  addedBy: string;
}

/**
 * Raw data extracted from report card modal
 * Before processing and anonymization
 */
export interface ReportModalData {
  /** Dog name from "My name" field */
  dogName: string;
  /** Owner names extracted from modal title */
  owners: string;
  /** Real staff trainer names (before anonymization) */
  trainers: string[];
  /** Letter grade (A/B/C/D) */
  grade: Grade;
  /** Full description text of selected grade */
  gradeDescription: string;
  /** Selected "best part of day" option */
  bestPartOfDay: string;
  /** Free text from "What I did today" */
  whatIDidToday: string;
  /** Photo URLs or references (if found) */
  photos: string[];
}

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
  topFriends: string[];
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
    label: string;
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
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
  };
  return gradeMap[grade] || 1.0; // Default to D if unknown
}

export function numberToGrade(num: number): Grade {
  if (num >= 3.5) return 'A';
  if (num >= 2.5) return 'B';
  if (num >= 1.5) return 'C';
  return 'D'; // Lowest grade in the system
}
