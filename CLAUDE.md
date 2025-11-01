# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project scrapes, analyzes, and visualizes Pepper's daycare report cards. It's a data pipeline that runs automatically in GitHub Actions, storing everything in Git, and publishing a static website to GitHub Pages.

**Data Flow:** Scrape → Analyze → Visualize → Notify

Historical data: August-October 2025 (~30-40 report cards) backfilled before automation started.

## Technology Stack

- **Runtime:** Bun (TypeScript execution, testing, package management)
- **Site Generator:** Astro (static site, deploys to GitHub Pages)
- **Visualization:** Chart.js
- **Scraping:** Playwright (handles auth and dynamic content)
- **Photo Storage:** Cloudflare R2 (not in Git repo)
- **Automation:** GitHub Actions

## Repository Structure

```
data/
  schedule/2025.json          # Pepper's weekly daycare schedule
  reports/2025/*.json         # Individual report cards by date
  analysis/*.json             # Aggregated insights (weekly summaries, top friends)
  viz/*.json                  # Chart.js-ready data files
photos.json                   # Metadata with R2 URLs (photos stored in R2, not Git)
staff.private.json            # Real names (in .gitignore, not committed)
staff.public.json             # Anonymized pseudonyms (committed)
src/                          # Astro website source
scripts/
  scrapers/                   # Playwright scrapers for schedule and report cards
  analysis/                   # Data analysis scripts
  backfill.ts                 # One-time historical data import
```

## Common Development Commands

```bash
# Install dependencies
bun install

# Run scrapers locally
bun run scripts/scrape-schedule.ts
bun run scripts/scrape-report.ts --date 2024-11-15

# Historical backfill (one-time)
bun run scripts/backfill.ts --start 2025-08-01 --end 2025-10-31
bun run scripts/backfill-schedule.ts --start 2025-08-01 --end 2025-10-31

# Analysis
bun run scripts/analyze-all.ts      # Run all analysis on existing data
bun run scripts/ai-insights.ts      # Generate Claude API insights

# Website development
cd src
bun run dev                          # Dev server at localhost:4321
bun run build                        # Build for production
bun run preview                      # Preview production build

# Testing
bun test                             # Run all tests
bun test scrapers                    # Test specific suite
```

## Key Architecture Patterns

### Git as Database
All data is committed to Git for complete history and easy rollbacks. Only photos are stored externally in Cloudflare R2 (referenced via photos.json).

### Serverless Pipeline
GitHub Actions orchestrates everything:
- **Schedule Workflow:** Runs daily at 8 AM to scrape weekly schedule
- **Report Card Workflow:** Runs 3x daily (3 PM, 5 PM, 7 PM) on school days
- Analysis triggers only when new report card is found
- Deploy triggers after analysis completes

### Privacy via Anonymization
Staff names are automatically discovered and anonymized using deterministic pseudonyms:
- Scrapers call `processStaffNames()` to auto-register new staff members
- Real names stored in `staff.private.json` (in .gitignore, never committed)
- Deterministic pseudonyms generated: "Jane Smith" → "River Oak" (same name = same pseudonym)
- `staff.public.json` committed to Git and used by website
- Other dogs' first names and all report card data remain public

**For scrapers:**
```typescript
import { processStaffNames } from './utils/staff-utils';

const realNames = ['Jane Smith', 'John Doe'];  // From scraped report
const anonymized = processStaffNames(realNames); // Auto-registers + anonymizes
// Save 'anonymized' in report card JSON
```

### Rate Limiting in Scrapers
Always respect the daycare website:
- Use 3-5 second delays between requests
- Backfill runs sequentially, not in parallel
- Log failures but continue processing
- Don't retry immediately on errors

## GitHub Actions Secrets Required

```
DAYCARE_USERNAME          # Login credentials
DAYCARE_PASSWORD
STAFF_PRIVATE_JSON        # Real staff names mapping
CLOUDFLARE_R2_ACCESS_KEY  # Photo storage
CLOUDFLARE_R2_SECRET_KEY
CLOUDFLARE_R2_BUCKET
SLACK_WEBHOOK_URL         # Optional notifications
ANTHROPIC_API_KEY         # Optional AI insights
```

## Data Schemas

### Report Card JSON
```typescript
{
  date: "2024-11-15",
  grade: "A",
  staffNotes: "Pepper had a great day...",
  activities: ["playtime", "nap", "outdoor"],
  staffNames: ["River Oak"],  // Anonymized
  friends: ["Max", "Luna"],
  photos: ["2024-11-15-001.jpg"]
}
```

### Schedule JSON
```typescript
{
  "2024-11": ["2024-11-05", "2024-11-07", "2024-11-12"]
}
```

## Backfill Strategy

The backfill is a one-time operation to import historical data:

1. Run `backfill-schedule.ts` first to get attendance days (or manually create schedule JSON)
2. Run `backfill.ts` with date range to scrape all historical report cards
3. Execute locally (not in GitHub Actions) to monitor progress
4. Use 3-5 second delays between requests to be respectful
5. After completion, run `analyze-all.ts` to generate aggregates
6. Skip notifications for backfilled data (add `--skip-notify` flag)

## Notification System

Dual notification approach:
- **Slack:** Instant awareness via incoming webhook with rich formatting
- **GitHub Issues:** Permanent searchable record with discussion threads

Only send notifications for new report cards, not backfilled historical data.

## Development Workflow

When adding new features:
1. Test scrapers on single dates first before batch operations
2. Verify data quality in JSON files after scraping
3. Run analysis scripts to validate aggregation logic
4. Test Astro site locally with `bun run dev`
5. Check staff name anonymization is working correctly
6. Never commit `staff.private.json` or credentials

## Testing Scrapers

Always test scrapers on known historical dates before production:
```bash
# Test on a single known date
bun run scripts/scrape-report.ts --date 2025-08-08 --dry-run

# Verify output
cat data/reports/2025/2025-08-08.json
```

Use Playwright's headed mode for debugging:
```typescript
const browser = await chromium.launch({ headless: false });
```

## Photo Management

Photos are resized before uploading to R2:
- Full size: 1920px width (preserve aspect ratio)
- Thumbnails: 400px width for gallery views
- Ignore stock photos (detect via image similarity or file size patterns)
- Store R2 URLs in `photos.json` with metadata

## Analysis Scripts

Analysis runs after each new report card and generates:
- `weekly-summary.json`: Grade averages, attendance counts
- `top-friends.json`: Friend mention frequency
- `ai-insights.json`: Claude API generated summaries (optional)
- `viz/*.json`: Chart.js ready data for website

All analysis scripts are idempotent and can safely re-run on full dataset.
