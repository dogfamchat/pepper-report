#!/usr/bin/env bun
/**
 * Create GitHub Issue for new report card
 * Usage: bun run scripts/notifications/github-issue-notify.ts --date 2024-11-15
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { ReportCard, PhotosCollection } from '../types';

// Grade emoji mapping
const GRADE_EMOJI: Record<string, string> = {
  'A': '🌟',
  'B': '⭐',
  'C': '💫',
  'D': '✨',
};

/**
 * Load photo URLs from photos.json
 */
function loadPhotosMetadata(): PhotosCollection | null {
  const photosPath = resolve(process.cwd(), 'photos.json');
  if (!existsSync(photosPath)) {
    return null;
  }
  const photosJson = readFileSync(photosPath, 'utf-8');
  return JSON.parse(photosJson) as PhotosCollection;
}

/**
 * Get R2 URL for a photo filename
 */
function getPhotoUrl(filename: string, photosMetadata: PhotosCollection | null): string | null {
  if (!photosMetadata) return null;
  const photo = photosMetadata.photos.find(p => p.filename === filename);
  return photo?.r2Url || null;
}

/**
 * Format report card data into GitHub Issue markdown
 */
function formatIssueBody(report: ReportCard, photosMetadata: PhotosCollection | null): string {
  const gradeEmoji = GRADE_EMOJI[report.grade] || '📝';

  let body = `## ${gradeEmoji} Report Card Summary\n\n`;

  // Basic info
  body += `**Date:** ${report.date}\n`;
  body += `**Grade:** ${report.gradeDescription}\n`;
  body += `**Staff:** ${report.staffNames.join(', ')}\n`;
  body += `**Best Part of Day:** ${report.bestPartOfDay}\n\n`;

  // Activities
  if (report.whatIDidToday.length > 0) {
    body += `### 🎾 Activities\n\n`;
    report.whatIDidToday.forEach(activity => {
      body += `- ${activity}\n`;
    });
    body += `\n`;
  }

  // Training skills
  if (report.trainingSkills.length > 0) {
    body += `### 🎓 Training Skills\n\n`;
    report.trainingSkills.forEach(skill => {
      body += `- ${skill}\n`;
    });
    body += `\n`;
  }

  // Caught being good
  if (report.caughtBeingGood.length > 0) {
    body += `### ✅ Caught Being Good\n\n`;
    report.caughtBeingGood.forEach(behavior => {
      body += `- ${behavior}\n`;
    });
    body += `\n`;
  }

  // Ooops
  if (report.ooops.length > 0) {
    body += `### ⚠️ Ooops\n\n`;
    report.ooops.forEach(oops => {
      body += `- ${oops}\n`;
    });
    body += `\n`;
  }

  // Noteworthy comments
  if (report.noteworthyComments && report.noteworthyComments.trim()) {
    body += `### 📝 Noteworthy Comments\n\n`;
    body += `${report.noteworthyComments}\n\n`;
  }

  // Photos
  if (report.photos.length > 0 && photosMetadata) {
    body += `### 📸 Photos\n\n`;
    for (const photoFilename of report.photos) {
      const photoUrl = getPhotoUrl(photoFilename, photosMetadata);
      if (photoUrl) {
        body += `![${photoFilename}](${photoUrl})\n\n`;
      }
    }
  }

  // Footer
  body += `---\n\n`;
  body += `*Automatically generated from daycare report card*\n`;

  return body;
}

/**
 * Check if a label exists in the repository
 */
async function labelExists(labelName: string): Promise<boolean> {
  const { spawn } = await import('child_process');

  return new Promise((resolve) => {
    const gh = spawn('gh', ['label', 'list', '--json', 'name']);

    let stdout = '';

    gh.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gh.on('close', (code) => {
      if (code === 0) {
        try {
          const labels = JSON.parse(stdout);
          const exists = labels.some((label: any) => label.name === labelName);
          resolve(exists);
        } catch {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Create GitHub Issue using gh CLI
 */
async function createGitHubIssue(title: string, body: string): Promise<void> {
  const { spawn } = await import('child_process');

  // Check if label exists
  const hasLabel = await labelExists('report-card');

  const args = [
    'issue',
    'create',
    '--title', title,
    '--body', body
  ];

  if (hasLabel) {
    args.push('--label', 'report-card');
  }

  return new Promise((resolve, reject) => {
    const gh = spawn('gh', args);

    let stdout = '';
    let stderr = '';

    gh.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gh.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gh.on('close', (code) => {
      if (code === 0) {
        console.log('✅ GitHub Issue created successfully');
        console.log(stdout.trim());
        if (!hasLabel) {
          console.log('ℹ️  Note: "report-card" label not found, issue created without label');
        }
        resolve();
      } else {
        reject(new Error(`Failed to create GitHub Issue (exit code ${code})\n${stderr}`));
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dateArg = args.find(arg => arg.startsWith('--date='))?.split('=')[1];
  const dateIndex = args.indexOf('--date');
  const date = dateArg || (dateIndex !== -1 && args[dateIndex + 1]) || new Date().toISOString().split('T')[0];

  console.log(`📋 Preparing GitHub Issue for report card: ${date}`);

  // Load report card
  const year = date.substring(0, 4);
  const reportPath = resolve(process.cwd(), `data/reports/${year}/${date}.json`);

  if (!existsSync(reportPath)) {
    console.error(`❌ Error: Report card not found at ${reportPath}`);
    process.exit(1);
  }

  const reportJson = readFileSync(reportPath, 'utf-8');
  const report = JSON.parse(reportJson) as ReportCard;

  console.log(`📋 Loaded report card: Grade ${report.grade}`);

  // Load photos metadata
  const photosMetadata = loadPhotosMetadata();

  // Format issue
  const gradeEmoji = GRADE_EMOJI[report.grade] || '📝';
  const title = `${gradeEmoji} Report Card: ${date} (Grade ${report.grade})`;
  const body = formatIssueBody(report, photosMetadata);

  // Log body for debugging (in verbose mode)
  if (process.env.VERBOSE === 'true') {
    console.log('Issue body:', body);
  }

  await createGitHubIssue(title, body);
  console.log('✅ GitHub Issue created successfully!');
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
