#!/usr/bin/env bun
/**
 * Send Slack notification for new report card
 * Usage: bun run scripts/notifications/slack-notify.ts --date 2024-11-15
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PhotosCollection, ReportCard } from '../types';

// Grade emoji mapping
const GRADE_EMOJI: Record<string, string> = {
  A: '🌟',
  B: '⭐',
  C: '💫',
  D: '✨',
};

// Slack Block Kit types
interface SlackTextBlock {
  type: 'header' | 'section' | 'context';
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: {
    type: string;
    text: string;
  }[];
  elements?: {
    type: string;
    text: string;
  }[];
}

interface SlackImageBlock {
  type: 'image';
  image_url: string;
  alt_text: string;
}

interface SlackDividerBlock {
  type: 'divider';
}

type SlackBlock = SlackTextBlock | SlackImageBlock | SlackDividerBlock;

interface SlackPayload {
  text: string;
  blocks?: SlackBlock[];
}

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
  const photo = photosMetadata.photos.find((p) => p.filename === filename);
  return photo?.r2Url || null;
}

/**
 * Format report card data into a Slack message
 */
function formatSlackMessage(
  report: ReportCard,
  photosMetadata: PhotosCollection | null,
): SlackPayload {
  const gradeEmoji = GRADE_EMOJI[report.grade] || '📝';

  // Format activities into readable list
  const activities = report.whatIDidToday.slice(0, 5).join(', ');
  const activitiesText =
    report.whatIDidToday.length > 0
      ? report.whatIDidToday.length > 5
        ? `${activities}, and more...`
        : activities
      : 'None today';

  // Format training skills
  const trainingText =
    report.trainingSkills.length > 0 ? report.trainingSkills.slice(0, 3).join(', ') : 'None today';

  // Best part of day
  const bestPart = report.bestPartOfDay;

  // Build blocks for rich formatting
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${gradeEmoji} New Report Card: Grade ${report.grade}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Date:*\n${report.date}`,
        },
        {
          type: 'mrkdwn',
          text: `*Grade:*\n${report.gradeDescription}`,
        },
      ],
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Staff:*\n${report.staffNames.join(', ')}`,
        },
        {
          type: 'mrkdwn',
          text: `*Best Part:*\n${bestPart}`,
        },
      ],
    },
  ];

  // Add activities section
  if (report.whatIDidToday.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Activities:*\n${activitiesText}`,
      },
    });
  }

  // Add training section
  if (report.trainingSkills.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Training Skills:*\n${trainingText}`,
      },
    });
  }

  // Add "Caught being good" section
  if (report.caughtBeingGood.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ Caught Being Good:*\n${report.caughtBeingGood.join(', ')}`,
      },
    });
  }

  // Add "Ooops" section (if any)
  if (report.ooops.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⚠️  Ooops:*\n${report.ooops.join(', ')}`,
      },
    });
  }

  // Add noteworthy comments if present
  if (report.noteworthyComments?.trim()) {
    // Limit to 500 chars for Slack
    const comments =
      report.noteworthyComments.length > 500
        ? `${report.noteworthyComments.substring(0, 497)}...`
        : report.noteworthyComments;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📝 Noteworthy Comments:*\n${comments}`,
      },
    });
  }

  // Add photo count if present
  if (report.photos.length > 0) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📸 ${report.photos.length} photo${report.photos.length !== 1 ? 's' : ''} uploaded`,
        },
      ],
    });
  }

  // Add divider
  blocks.push({
    type: 'divider',
  });

  // Add photo images if available
  if (report.photos.length > 0 && photosMetadata) {
    for (const photoFilename of report.photos) {
      const photoUrl = getPhotoUrl(photoFilename, photosMetadata);
      if (photoUrl) {
        blocks.push({
          type: 'image',
          image_url: photoUrl,
          alt_text: `Photo from ${report.date}`,
        });
      }
    }
  }

  return {
    text: `New Report Card for ${report.date}: Grade ${report.grade}`,
    blocks,
  };
}

/**
 * Send Slack notification via webhook
 */
async function sendSlackNotification(webhookUrl: string, payload: SlackPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send Slack notification: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  console.log('✅ Slack notification sent successfully');
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dateArg = args.find((arg) => arg.startsWith('--date='))?.split('=')[1];
  const dateIndex = args.indexOf('--date');
  const date =
    dateArg || (dateIndex !== -1 && args[dateIndex + 1]) || new Date().toISOString().split('T')[0];

  console.log(`📨 Preparing Slack notification for report card: ${date}`);

  // Get webhook URL from environment
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('❌ Error: SLACK_WEBHOOK_URL environment variable not set');
    process.exit(1);
  }

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

  // Format and send notification
  const payload = formatSlackMessage(report, photosMetadata);

  // Log payload for debugging (in verbose mode)
  if (process.env.VERBOSE === 'true') {
    console.log('Slack payload:', JSON.stringify(payload, null, 2));
  }

  await sendSlackNotification(webhookUrl, payload);
  console.log('✅ Notification sent successfully!');
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
