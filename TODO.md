# TODO - Pepper Report Project

**Last Updated:** 2025-11-09
**Current Phase:** Analysis & Visualization (Phase 3 - Partial Complete)

## Overview

This tracks remaining work to complete the Pepper Report project. See [docs/design-proposal.md](docs/design-proposal.md) for full architecture and [docs/report-card-data-structure.md](docs/report-card-data-structure.md) for data schema details.

## Recent Progress (Nov 9, 2025)

**✅ Completed:**
- Grade trends analysis pipeline (analyze-all.ts, grade-trends.ts, report-reader.ts)
- Homepage with real data and statistics dashboard
- Trends page with interactive Chart.js visualizations
- Timeline page with all 31 report cards
- GitHub Actions automation (analysis + deployment)
- Production deployment to GitHub Pages: https://dogfamchat.github.io/pepper-report

**📊 Current Stats:**
- 31 report cards scraped (Aug-Nov 2025)
- Overall average: 3.58/4.0 (89.5%)
- 14 weeks tracked, 4 months of data
- 12 photos uploaded to Cloudflare R2

## Current Priority: Friend & Activity Analysis

The core data pipeline and visualization infrastructure is complete. Next priority is implementing AI-powered friend extraction and activity categorization to complete the analysis suite.

### Immediate Tasks (Next Session)

- [ ] **Implement friend analysis with Claude API (PRIORITY)**
  - Create `scripts/analysis/friends-analyzer.ts`
  - Set up Anthropic SDK with Haiku model for cost efficiency
  - Extract dog names from `noteworthyComments` field across all reports
  - Track friend co-occurrence and frequency
  - Generate `data/analysis/top-friends.json`
  - Add friend network chart to trends page

- [ ] **Implement activity categorization**
  - Create `scripts/analysis/activity-analyzer.ts`
  - Parse `whatIDidToday` and `trainingSkills` arrays
  - Categorize into: playtime, training, enrichment, outdoor, socialization, rest
  - Generate `data/viz/activity-breakdown.json`
  - Add activity charts to trends page

- [ ] **Display photos on website**
  - Add photo display to homepage (latest report's photos)
  - Create photo gallery component
  - Load photos from R2 URLs stored in `photos.json`
  - Add lightbox/modal for full-size viewing

- [ ] **Build friends page**
  - Create `src/pages/friends.astro`
  - Display friend network visualization
  - List all friends with frequency stats
  - **Depends on:** Friend analysis completion

### Phase 2: Complete Automation

- [x] **Verify GitHub Actions secrets are configured**
  - ✓ DAYCARE_SCHEDULE_URL
  - ✓ DAYCARE_REPORT_URL
  - ✓ DAYCARE_USERNAME
  - ✓ DAYCARE_PASSWORD
  - ✓ STAFF_PRIVATE_JSON
  - ✓ CLOUDFLARE_R2_ACCOUNT_ID
  - ✓ CLOUDFLARE_R2_ACCESS_KEY
  - ✓ CLOUDFLARE_R2_SECRET_KEY
  - ✓ CLOUDFLARE_R2_BUCKET
  - ✓ CLOUDFLARE_R2_PUBLIC_DOMAIN
  - ✓ SLACK_WEBHOOK_URL
  - ✓ ANTHROPIC_API_KEY

- [x] **Add Slack notification support**
  - ✓ Created `scripts/notifications/slack-notify.ts`
  - ✓ Implemented Slack Block Kit formatting with rich sections
  - ✓ Added inline photo display from R2 URLs
  - ✓ Integrated into GitHub Actions workflow
  - ✓ Tested locally with existing report card

- [x] **Add GitHub Issue notification support**
  - ✓ Created `scripts/notifications/github-issue-notify.ts`
  - ✓ Implemented markdown formatting with embedded photos
  - ✓ Graceful handling of missing labels
  - ✓ Integrated into GitHub Actions workflow
  - ✓ Tested locally with existing report card

- [x] **Test end-to-end automation**
  - ✓ Triggered manual workflow run
  - ✓ Verified scraper runs successfully
  - ✓ Confirmed photo upload to R2
  - ✓ Tested notification scripts locally
  - ✓ Verified commits are pushed to Git
  - ✓ Ready for next real report card

## Phase 3: Analysis & Visualization

### Analysis Scripts

- [x] **Create analysis script structure**
  - ✓ Created `scripts/analysis/analyze-all.ts` entry point
  - ✓ Created `scripts/analysis/report-reader.ts` with shared utilities
  - ✓ Set up TypeScript types for analysis outputs

- [x] **Implement grade trends analysis**
  - ✓ Created `scripts/analysis/grade-trends.ts`
  - ✓ Calculate weekly/monthly grade averages
  - ✓ Track grade distribution (A/B/C/D counts)
  - ✓ Identify improving/declining trends
  - ✓ Output: `data/analysis/grade-trends.json`
  - ✓ Output: `data/analysis/weekly-summary.json`

- [ ] **AI insights with Claude API (PRIORITY)**
  - Create `scripts/analysis/friends-analyzer.ts`
  - Use Claude Haiku API for cost efficiency (~$0.20/year)
  - Extract friend names mentioned in noteworthyComments field
  - Track friend co-occurrence over time
  - Generate friend network data
  - Output: `data/analysis/top-friends.json`
  - **Note:** Currently the biggest gap in analysis

- [ ] **Implement activity categorization**
  - Create `scripts/analysis/activity-analyzer.ts`
  - Parse whatIDidToday and trainingSkills arrays
  - Group into categories (play, training, rest, outdoor, enrichment, socialization)
  - Calculate time spent in each category
  - Output: `data/analysis/activity-breakdown.json`
  - Output: `data/viz/activity-breakdown.json`

### Visualization Data Preparation

- [x] **Create Chart.js data transformations**
  - ✓ Implemented in `scripts/analysis/grade-trends.ts`
  - ✓ Transform analysis outputs to Chart.js format

- [x] **Grade timeline visualization data**
  - ✓ Format grade trends for line/bar chart
  - ✓ Include weekly averages and individual grades
  - ✓ Output: `data/viz/grade-timeline.json`

- [ ] **Friend network visualization data**
  - Format friend mentions for bar chart
  - Include top 10 friends with counts
  - Output: `data/viz/friend-network.json`
  - **Depends on:** AI insights implementation

- [ ] **Activity breakdown visualization data**
  - Format activity categories for pie/doughnut chart
  - Include percentages and counts
  - Output: `data/viz/activity-breakdown.json`
  - **Depends on:** Activity analyzer implementation

- [x] **Update GitHub Actions workflow**
  - ✓ Added analysis job that runs after successful scrape
  - ✓ Added deploy job that triggers after analysis
  - ✓ Tested full pipeline
  - ✓ Auto-commits analysis results to Git

## Phase 4: Website Development

### Astro Site Structure

- [x] **Build core layouts**
  - ✓ Created main layout with navigation
  - ✓ Set up styling with CSS gradients and responsive design
  - ✓ Mobile-responsive layout

- [x] **Build homepage** (`src/pages/index.astro`)
  - ✓ Display latest report card with full details
  - ✓ Show quick stats (total days, average grade, A grades, weeks tracked)
  - ✓ Links to trends and timeline pages
  - ✓ Grade-based color coding (purple for A, pink for B)
  - Note: Photo carousel not yet implemented

- [x] **Build timeline page** (`src/pages/timeline.astro`)
  - ✓ List all 31 report cards chronologically
  - ✓ Grouped by month with expandable cards
  - ✓ Click to expand/collapse for full report details
  - ✓ Mobile-responsive card layout
  - Note: Advanced filtering/search not yet implemented

- [ ] **Build individual report card page**
  - Display full report card details
  - Show photos in gallery
  - Include staff notes
  - Show friends mentioned
  - Note: Currently report cards shown inline on timeline page

- [x] **Build trends/analytics page** (`src/pages/trends.astro`)
  - ✓ Created `src/components/GradeCharts.astro` for Chart.js visualizations
  - ✓ Grade timeline chart (line chart with 31 data points)
  - ✓ Grade distribution chart (donut chart showing A vs B)
  - ✓ Statistics dashboard with overall metrics
  - ✓ 4 monthly performance cards with detailed breakdowns
  - ✓ 14 weekly performance entries with dates and grade badges
  - Note: Friend network and activity charts pending friend/activity analysis

- [ ] **Build friends page**
  - List all friends Pepper has played with
  - Show frequency of mentions
  - Filter/search by name
  - Photos with each friend (if available)
  - **Depends on:** Friend analysis implementation

- [ ] **Build photo gallery**
  - Grid view of all photos
  - Filter by date/month
  - Lightbox for full-size viewing
  - Load from R2 URLs
  - Note: Photos uploaded to R2 but not yet displayed on site

### Deployment

- [x] **Configure GitHub Pages deployment**
  - ✓ Created `.github/workflows/deploy.yml`
  - ✓ Set up deployment workflow
  - ✓ Build Astro site with static adapter
  - ✓ Deploy to GitHub Pages
  - ✓ Site accessible at `https://dogfamchat.github.io/pepper-report`

- [x] **Test site on GitHub Pages**
  - ✓ Verified all pages load correctly
  - ✓ Test charts render properly
  - ✓ Validated mobile responsiveness
  - Note: R2 images not yet integrated into site

- [ ] **Optional: Custom domain**
  - Purchase domain (if desired)
  - Configure DNS settings
  - Update GitHub Pages settings

## Phase 5: Polish & Enhancements (Optional)

- [ ] **Multi-year support**
  - Update code to handle year transitions (2025 → 2026)
  - Ensure analysis works across multiple years
  - Update scrapers and workflows for multi-year data

- [ ] **Improve chart designs**
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
  - Photo carousel on homepage
  - Automatic tagging (if Claude API can identify dogs)
  - Photo collages or montages
  - Download all photos as ZIP
  - Slideshow view

- [ ] **Advanced timeline features**
  - Filter by date range
  - Search functionality
  - Filter by grade
  - Export reports to PDF

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

### Phase 3: Analysis Pipeline (Nov 9, 2025)
- [x] Created `scripts/analysis/analyze-all.ts` orchestrator
- [x] Created `scripts/analysis/report-reader.ts` with shared utilities
- [x] Created `scripts/analysis/grade-trends.ts` analyzer
- [x] Generated `data/analysis/grade-trends.json` with weekly/monthly stats
- [x] Generated `data/analysis/weekly-summary.json`
- [x] Generated `data/viz/grade-timeline.json` for Chart.js
- [x] Fixed TypeScript configuration (added DOM types)
- [x] Fixed all linting issues with Biome

### Phase 4: Website Implementation (Nov 9, 2025)
- [x] Updated homepage (`src/pages/index.astro`) with real data
- [x] Created trends page (`src/pages/trends.astro`) with Chart.js visualizations
- [x] Created timeline page (`src/pages/timeline.astro`) with expandable report cards
- [x] Created `src/components/GradeCharts.astro` component
- [x] Implemented grade timeline chart (line chart)
- [x] Implemented grade distribution chart (donut chart)
- [x] Added statistics dashboard with 4 key metrics
- [x] Added monthly performance cards
- [x] Added weekly performance entries
- [x] Fixed Chart.js ES6 import issues
- [x] Created `.github/workflows/deploy.yml` for GitHub Pages
- [x] Updated `.github/workflows/report.yml` with analysis job
- [x] Deployed production site to https://dogfamchat.github.io/pepper-report

## Notes

- **Privacy:** Always anonymize staff names using `processStaffNames()` utility
- **Rate Limiting:** Use 3-5 second delays between scraper requests
- **Stock Photos:** Automatically filtered during extraction (SHA256 hash detection)
- **Backfill:** Run locally first time to monitor progress, then automation takes over
- **Testing:** Always test on single dates before batch operations
- **Notifications:** Skip for backfilled historical data (only for new daily reports)

## Production Site Status

**Live URL:** https://dogfamchat.github.io/pepper-report

**Working Features:**
- Homepage with latest report card and statistics
- Trends page with interactive Chart.js visualizations (grade timeline, distribution)
- Timeline page with all 31 report cards (expandable cards)
- Automated daily scraping and analysis via GitHub Actions
- Automated deployment on every push to main

**Missing Features:**
- Friend analysis and visualization (no AI extraction yet)
- Activity categorization and charts
- Photo display on website (photos exist in R2 but not shown)
- Friends page
- Photo gallery page
- Individual report card pages

## Key Technical Decisions

### Week Calculation
Using **ISO 8601 week numbers** for consistency:
- Week starts Monday, ends Sunday
- Week containing January 4th is week 1
- Implemented in `scripts/analysis/report-reader.ts:getWeekNumber()`

### Grade Storage Format
Storing both letter and numeric values:
```json
{
  "date": "2025-11-07",
  "grade": "A",
  "gradeValue": 4.0
}
```

### Data Organization
Separate directories for different purposes:
- `data/analysis/` - Human-readable summaries
- `data/viz/` - Chart.js-optimized data
- `data/reports/2025/` - Raw report card JSONs
- `data/schedule/` - Schedule data

### Chart.js Integration
- Self-contained `GradeCharts.astro` component
- Pass data via `data-*` attributes on canvas elements
- Use module script that imports Chart.js directly from npm
- Read data from DOM using dataset API

## References

- [Design Proposal](docs/design-proposal.md) - Full architecture and design decisions
- [Report Card Data Structure](docs/report-card-data-structure.md) - Data schema and extraction details
- [CLAUDE.md](CLAUDE.md) - Project overview and development commands
