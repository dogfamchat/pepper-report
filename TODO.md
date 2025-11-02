# TODO - Pepper Report Project

**Last Updated:** 2025-11-02
**Current Phase:** Data Pipeline Completion (Phase 1.5 + Phase 2)

## Overview

This tracks remaining work to complete the Pepper Report project. See [docs/design-proposal.md](docs/design-proposal.md) for full architecture and [docs/report-card-data-structure.md](docs/report-card-data-structure.md) for data schema details.

## Current Priority: Data Pipeline

Focus on completing data ingestion and storage before building analysis and website.

### Immediate Tasks (This Week)

- [x] **Implement photo upload to Cloudflare R2**
  - ✓ Update `scripts/storage/r2-uploader.ts` to upload photos
  - ✓ Add image resizing with sharp (1920px full, 400px thumbnails)
  - ✓ Filter out stock photos (already implemented in scraper)
  - ✓ Update `photos.json` with R2 URLs
  - ✓ Test upload with existing local photo

- [x] **Test R2 upload integration**
  - ✓ Verify R2 bucket is configured in secrets
  - ✓ Test upload script with one photo
  - ✓ Verify photo is accessible via R2 URL
  - ✓ Update scraper to call R2 upload after extracting photos

- [x] **Run historical backfill for all report cards**
  - ✓ Verify daycare credentials are working
  - ✓ Fix bug: Schedule date parsing to handle _comment field
  - ✓ Fix bug: Refactor scraper to reuse browser session (30x faster)
  - ✓ Run: `bun run backfill:reports --schedule data/schedule/2025.json`
  - ✓ Scraped 28/31 report cards (3 dates had no report filed)
  - ✓ Uploaded 12 photos to R2 successfully
  - ✓ Auto-discovered 7 new staff members with anonymization
  - ✓ Commit all backfilled data to Git

### Phase 2: Complete Automation

- [ ] **Verify GitHub Actions secrets are configured**
  - DAYCARE_SCHEDULE_URL
  - DAYCARE_REPORT_URL
  - DAYCARE_USERNAME
  - DAYCARE_PASSWORD
  - STAFF_PRIVATE_JSON
  - CLOUDFLARE_R2_ACCOUNT_ID
  - CLOUDFLARE_R2_ACCESS_KEY
  - CLOUDFLARE_R2_SECRET_KEY
  - CLOUDFLARE_R2_BUCKET
  - SLACK_WEBHOOK_URL (optional)
  - ANTHROPIC_API_KEY (optional for AI insights)

- [ ] **Add Slack notification support**
  - Set up incoming webhook in Slack workspace
  - Create notification template with report card summary
  - Add to workflow after successful scrape
  - Test with next report card

- [ ] **Add GitHub Issue notification support**
  - Create issue template with report card details
  - Add to workflow after successful scrape
  - Auto-close previous report card issue (optional)
  - Test with next report card

- [ ] **Test end-to-end automation**
  - Trigger manual workflow run
  - Verify scraper runs successfully
  - Confirm photo upload to R2
  - Check notifications are sent
  - Verify commits are pushed to Git

## Phase 3: Analysis & Visualization

### Analysis Scripts

- [ ] **Create analysis script structure**
  - Create `scripts/analysis/analyze-all.ts` entry point
  - Set up TypeScript types for analysis outputs

- [ ] **Implement grade trends analysis**
  - Calculate weekly/monthly grade averages
  - Track grade distribution (A/B/C/D counts)
  - Identify improving/declining trends
  - Output: `data/analysis/grade-trends.json`

- [ ] **Implement friend network analysis**
  - Extract friend names from AI insights output (names mentioned in noteworthyComments)
  - Count frequency of each friend name across all reports
  - Calculate top friends list with statistics
  - Output: `data/analysis/top-friends.json`
  - **Depends on:** AI insights implementation

- [ ] **Implement weekly summary analysis**
  - Aggregate report cards by week
  - Calculate weekly stats (attendance, avg grade, top activities)
  - Include notable comments and highlights
  - Output: `data/analysis/weekly-summary.json`

- [ ] **Implement activity categorization**
  - Parse whatIDidToday and trainingSkills arrays
  - Group into categories (play, training, rest, outdoor)
  - Calculate time spent in each category
  - Output: `data/analysis/activity-breakdown.json`

- [ ] **AI insights with Claude API**
  - Create `scripts/analysis/ai-insights.ts`
  - Send report cards to Claude API for structured analysis
  - Extract friend names mentioned in noteworthyComments field
  - Generate natural language summaries of each report
  - Flag patterns or notable behaviors
  - Output: `data/analysis/ai-insights.json` (one file per report)
  - **Note:** Friend extraction is critical for friend network analysis

### Visualization Data Preparation

- [ ] **Create Chart.js data transformations**
  - Create `scripts/analysis/prepare-viz-data.ts`
  - Transform analysis outputs to Chart.js format

- [ ] **Grade timeline visualization data**
  - Format grade trends for line/bar chart
  - Include weekly averages and individual grades
  - Output: `data/viz/grade-timeline.json`

- [ ] **Friend network visualization data**
  - Format friend mentions for bar chart
  - Include top 10 friends with counts
  - Output: `data/viz/friend-network.json`

- [ ] **Activity breakdown visualization data**
  - Format activity categories for pie/doughnut chart
  - Include percentages and counts
  - Output: `data/viz/activity-breakdown.json`

- [ ] **Update GitHub Actions workflow**
  - Add analysis job that runs after successful scrape
  - Add deploy job that triggers after analysis
  - Test full pipeline

## Phase 4: Website Development

### Astro Site Structure

- [ ] **Build core layouts**
  - Create main layout with navigation
  - Add header/footer components
  - Set up styling (Tailwind or CSS)

- [ ] **Build homepage**
  - Display latest report card
  - Show quick stats (current grade, attendance streak)
  - Link to other pages
  - Recent photos carousel

- [ ] **Build timeline page**
  - List all report cards chronologically
  - Filter by month/date range
  - Search functionality
  - Link to individual report cards

- [ ] **Build individual report card page**
  - Display full report card details
  - Show photos in gallery
  - Include staff notes
  - Show friends mentioned

- [ ] **Build trends/analytics page**
  - Embed Chart.js visualizations
  - Grade timeline chart
  - Friend network chart
  - Activity breakdown chart
  - Weekly summary cards

- [ ] **Build friends page**
  - List all friends Pepper has played with
  - Show frequency of mentions
  - Filter/search by name
  - Photos with each friend (if available)

- [ ] **Build photo gallery**
  - Grid view of all photos
  - Filter by date/month
  - Lightbox for full-size viewing
  - Load from R2 URLs

### Deployment

- [ ] **Configure GitHub Pages deployment**
  - Set up deployment workflow
  - Build Astro site
  - Deploy to gh-pages branch
  - Test site is accessible

- [ ] **Test site on GitHub Pages**
  - Verify all pages load correctly
  - Check images load from R2
  - Test charts render properly
  - Validate mobile responsiveness

- [ ] **Optional: Custom domain**
  - Purchase domain (if desired)
  - Configure DNS settings
  - Update GitHub Pages settings

## Phase 5: Polish & Enhancements (Optional)

- [ ] **Improve chart designs**
  - Add color coding (green for A, yellow for B, etc.)
  - Add tooltips with details
  - Make charts interactive/filterable
  - Add animations

- [ ] **Add special events detection**
  - Flag unusual notes or activities
  - Detect birthday mentions
  - Identify new friends
  - Highlight exceptional grades or behaviors

- [ ] **Historical comparison views**
  - Compare this week to last week
  - Month-over-month comparisons
  - Year-to-date summary
  - All-time stats

- [ ] **Advanced friend analysis**
  - Build friend interaction graph
  - Track when friends are mentioned together
  - Identify friend groups
  - Show friendship timeline

- [ ] **Photo enhancements**
  - Automatic tagging (if Claude API can identify dogs)
  - Photo collages or montages
  - Download all photos as ZIP
  - Slideshow view

## Completed Tasks

### Phase 1: MVP
- [x] Set up repository structure
- [x] Build schedule scraper (scripts/scrapers/scrape-schedule.ts)
- [x] Build report card scraper (scripts/scrapers/scrape-report.ts)
- [x] Test scrapers on historical dates (Oct 27, Oct 29)
- [x] Store report cards as JSON (data/reports/2025/)
- [x] Scaffold Astro site structure (src/)

### Phase 1.5: Backfill Preparation
- [x] Create backfill scripts (backfill.ts, backfill-schedule.ts)
- [x] Backfill schedule data (Aug-Oct 2025 in data/schedule/2025.json)
- [x] Create staff anonymization utility (processStaffNames)
- [x] Implement stock photo filtering in scraper
- [x] Build TypeScript types (scripts/types.ts)
- [x] Document data structure (docs/report-card-data-structure.md)

### Phase 2: Automation Setup
- [x] Create GitHub Actions workflows (report.yml, schedule.yml)
- [x] Set up workflow triggers (cron schedules)
- [x] Add auto-commit logic for new reports

### Infrastructure
- [x] Remove IP addresses from metadata (privacy)
- [x] Set up photo extraction from modals
- [x] Create R2 uploader script structure
- [x] Add sharp library for image resizing
- [x] Implement R2 photo upload with resizing (full size + thumbnails)
- [x] Integrate R2 upload into scraper
- [x] Configure public access for R2 bucket
- [x] Test end-to-end photo upload pipeline

## Notes

- **Privacy:** Always anonymize staff names using `processStaffNames()` utility
- **Rate Limiting:** Use 3-5 second delays between scraper requests
- **Stock Photos:** Automatically filtered during extraction (SHA256 hash detection)
- **Backfill:** Run locally first time to monitor progress, then automation takes over
- **Testing:** Always test on single dates before batch operations
- **Notifications:** Skip for backfilled historical data (only for new daily reports)

## References

- [Design Proposal](docs/design-proposal.md) - Full architecture and design decisions
- [Report Card Data Structure](docs/report-card-data-structure.md) - Data schema and extraction details
- [CLAUDE.md](CLAUDE.md) - Project overview and development commands
