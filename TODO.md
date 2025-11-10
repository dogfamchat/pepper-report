# TODO - Pepper Report Project

**Last Updated:** 2025-11-10
**Current Phase:** Analysis & Visualization (Phase 3 - Near Complete)
**Current Branch:** add-photo-display (rebased on main, ready for review)

## Overview

This tracks remaining work to complete the Pepper Report project. See [docs/design-proposal.md](docs/design-proposal.md) for full architecture and [docs/report-card-data-structure.md](docs/report-card-data-structure.md) for data schema details.

## Recent Progress

### Nov 10, 2025 - Photo Display Feature ✅ COMPLETE

**Branch:** `add-photo-display` (ready for PR)

**Completed:**
- ✅ **PhotoGallery Component** (`src/components/PhotoGallery.astro`)
  - Reusable component for displaying photos from R2
  - Supports multiple sizes: small, medium, large
  - Optional title display
  - Graceful handling when no photos exist
  - Responsive grid layout

- ✅ **Gallery Page with Lightbox Modal** (`src/pages/gallery.astro`)
  - Dedicated photo gallery page at `/pepper-report/gallery`
  - Displays all 14 photos from R2 storage
  - Masonry-style responsive grid layout
  - Date labels for each photo
  - **Full-screen lightbox modal for photo viewing**
  - Navigation: arrow buttons, keyboard (←/→), ESC to close
  - Click outside to close, body scroll locked
  - Mobile responsive with touch-friendly controls
  - Beautiful gradient header and styling

- ✅ **Homepage Photo Integration** (`src/pages/index.astro`)
  - Latest photo section with link to full gallery
  - "Latest Photo" card with date and navigation
  - Photo display within latest report card
  - Responsive layout for mobile/desktop

- ✅ **Timeline Photo Integration & Indicators** (`src/pages/timeline.astro`)
  - PhotoGallery component added to each report card detail view
  - Medium-sized photo display within expandable cards
  - **📷 Photo indicator badges** next to dates that have photos
  - Visual indicators help identify which reports have photos
  - Subtle styling with hover effects
  - Fixed frontmatter formatting issues

- ✅ **Branch Health**
  - Fixed critical compiler bug (missing frontmatter delimiters)
  - Build verified and passing
  - Dev server tested and functional
  - Clean commit history with 5 commits
  - All features tested and working

**Files Modified:**
- `src/components/PhotoGallery.astro` (new, 122 lines)
- `src/pages/gallery.astro` (new, 400 lines with lightbox)
- `src/pages/index.astro` (enhanced with photo display)
- `src/pages/timeline.astro` (enhanced with gallery + indicators)

### Nov 9, 2025 - Friend Analysis & Incremental Architecture

**✅ Completed:**
- Grade trends analysis pipeline (analyze-all.ts, grade-trends.ts, report-reader.ts)
- Homepage with real data and statistics dashboard
- Trends page with interactive Chart.js visualizations
- Timeline page with all 31 report cards
- GitHub Actions automation (analysis + deployment)
- Production deployment to GitHub Pages: https://dogfamchat.github.io/pepper-report
- **Friend analysis with Claude Haiku 4.5 API**
  - AI-powered friend name extraction from report comments
  - Structured outputs using tool_choice for guaranteed JSON
  - Friend leaderboard with last-seen dates
  - Integrated into analyze-all.ts pipeline
- **🚀 Incremental Analysis Architecture**
  - Restructured analysis for cost efficiency and performance
  - Split into daily extraction + aggregation steps
  - API calls only for NEW reports (not every analysis run)
  - Backfilled all 31 existing reports (~34s, $0.0012 one-time)
  - **Performance:** New reports process in ~1s (vs ~34s for full batch)
  - **Cost:** $0.00004 per new report (vs $0.0012 per full run)

**📊 Current Stats:**
- 31 report cards scraped (Aug-Nov 2025)
- Overall average: 3.58/4.0 (89.5%)
- 14 weeks tracked, 4 months of data
- **14 photos uploaded to Cloudflare R2 (Nov 10: now visible on website!)**
- **12 unique friends identified** (filtered, sorted by recency)

## Current Priority: Activity Analysis

**Photo display is now complete!** ✅ Friend analysis is complete! Next priority is implementing activity categorization.

### Immediate Tasks (Next Session)

- [x] **Implement friend analysis with Claude API** ✅ COMPLETED Nov 9
  - ✓ Created incremental analysis architecture (extract-daily.ts, aggregate.ts)
  - ✓ Set up Anthropic SDK with Claude Haiku 4.5 model
  - ✓ Extract dog names from `noteworthyComments` using structured outputs
  - ✓ Track friend co-occurrence and frequency
  - ✓ Generate `data/analysis/aggregates/top-friends.json`
  - ✓ Added friend leaderboard to trends page (sorted by recency)
  - ✓ Filter out "Pepper" from results (can't be friends with herself)
  - ✓ Integrated into analyze-all.ts automated pipeline
  - ✓ **Restructured for incremental updates (cost-efficient)**

- [ ] **Implement activity categorization (PRIORITY)** - IN PROGRESS
  - **Branch:** `activity-categorization`
  - **Approach:** Rules-based mapping (no AI needed)
  - **Rationale:** Activities come from fixed checkboxes on daycare's app - no new activities unless app changes

  **Implementation Steps:**
  1. [ ] Extract all unique activities from 31 existing reports
     - Scan `whatIDidToday` arrays for all unique strings
     - Scan `trainingSkills` arrays for all unique strings
     - Document complete list of possible checkbox values

  2. [ ] Create activity category mapping
     - Define categories: playtime, training, enrichment, outdoor, socialization, rest
     - Map each checkbox option to one or more categories
     - Create `scripts/analysis/activity-categories.ts` with complete mapping
     - Handle multi-category activities (e.g., "played with buddies" = playtime + socialization)

  3. [ ] Create activity categorization logic
     - Create `scripts/analysis/activity-categorizer.ts`
     - Implement simple lookup function (no AI needed)
     - Export `categorizeActivities(report)` function
     - Return category counts for a single report

  4. [ ] Integrate into incremental analysis pipeline
     - Update `scripts/analysis/extract-daily.ts` to include activity extraction
     - Add `activities` field to daily analysis JSON structure
     - Store categorized activities in `data/analysis/daily/YYYY-MM-DD.json`

  5. [ ] Create aggregation logic
     - Update `scripts/analysis/aggregate.ts` to sum activity counts
     - Calculate percentages across all reports
     - Generate `data/analysis/aggregates/activity-breakdown.json`
     - Generate `data/viz/activity-breakdown.json` (Chart.js format for pie/doughnut chart)

  6. [ ] Add activity charts to trends page
     - Update `src/pages/trends.astro` or `src/components/GradeCharts.astro`
     - Add pie or doughnut chart showing activity distribution
     - Display category percentages and counts

  7. [ ] Test and verify
     - Run analysis on all 31 reports
     - Verify categorizations make sense
     - Check chart displays correctly
     - Commit changes and create PR

  **Files to Create/Modify:**
  - New: `scripts/analysis/activity-categories.ts` (mapping file)
  - New: `scripts/analysis/activity-categorizer.ts` (categorization logic)
  - Modify: `scripts/analysis/extract-daily.ts` (add activity extraction)
  - Modify: `scripts/analysis/aggregate.ts` (add activity aggregation)
  - New: `data/analysis/aggregates/activity-breakdown.json` (output)
  - New: `data/viz/activity-breakdown.json` (Chart.js format)
  - Modify: `src/pages/trends.astro` or `src/components/GradeCharts.astro` (add chart)

- [x] **Display photos on website** ✅ COMPLETED Nov 10
  - ✓ Added photo display to homepage (latest report's photos)
  - ✓ Created PhotoGallery component
  - ✓ Load photos from R2 URLs stored in `photos.json`
  - ✓ Created dedicated gallery page
  - ✓ Integrated into timeline page report cards
  - ✓ **Lightbox modal with keyboard navigation** (completed Nov 10)
  - ✓ **Photo indicator badges on timeline** (completed Nov 10)

- [ ] **Build friends page** (Optional - leaderboard now on trends page)
  - Create `src/pages/friends.astro`
  - Display friend network visualization
  - List all friends with frequency stats
  - Note: Friend leaderboard already visible on trends page

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

- [x] **~~Add GitHub Issue notification support~~** ❌ REMOVED (Nov 9)
  - ✓ Created `scripts/notifications/github-issue-notify.ts`
  - ✓ Implemented markdown formatting with embedded photos
  - ✓ Graceful handling of missing labels
  - ✓ Integrated into GitHub Actions workflow
  - ✓ Tested locally with existing report card
  - **Update (Nov 9):** Removed GitHub Issue notifications - not providing value

- [x] **Test end-to-end automation**
  - ✓ Triggered manual workflow run
  - ✓ Verified scraper runs successfully
  - ✓ Confirmed photo upload to R2
  - ✓ Tested notification scripts locally
  - ✓ Verified commits are pushed to Git
  - ✓ Ready for next real report card

## Phase 3: Analysis & Visualization

### Analysis Scripts

- [x] **Create incremental analysis architecture** ✅ RESTRUCTURED Nov 9
  - ✓ Created `scripts/analysis/analyze-all.ts` orchestrator (incremental by default)
  - ✓ Created `scripts/analysis/extract-daily.ts` for per-report extraction
  - ✓ Created `scripts/analysis/aggregate.ts` for fast aggregation
  - ✓ Created `scripts/analysis/report-reader.ts` with shared utilities
  - ✓ Set up TypeScript types for analysis outputs
  - ✓ **New data structure:** `data/analysis/daily/` + `data/analysis/aggregates/`
  - ✓ **Removed legacy batch scripts:** friends-analyzer.ts, grade-trends.ts

- [x] **Implement grade trends analysis**
  - ✓ Calculate weekly/monthly grade averages
  - ✓ Track grade distribution (A/B/C/D counts)
  - ✓ Identify improving/declining trends
  - ✓ Output: `data/analysis/aggregates/grade-trends.json`
  - ✓ Output: `data/analysis/aggregates/weekly-summary.json`
  - ✓ **Now uses incremental aggregation (no API calls needed)**

- [x] **AI insights with Claude API** ✅ COMPLETED Nov 9
  - ✓ Uses Claude Haiku 4.5 API with incremental extraction
  - ✓ Extract friend names from noteworthyComments using structured outputs
  - ✓ Track friend mentions and recency
  - ✓ Generate friend leaderboard data
  - ✓ Output: `data/analysis/daily/YYYY-MM-DD.json` (per report)
  - ✓ Output: `data/analysis/aggregates/top-friends.json` (aggregated)
  - ✓ Output: `data/viz/friend-network.json`
  - ✓ Filters out "Pepper" (can't be friends with herself)
  - ✓ Sorted by mention count, then by most recent date
  - ✓ **Cost-efficient:** Only processes NEW reports (~$0.00004 each)

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

- [x] **Friend network visualization data** ✅ COMPLETED Nov 9
  - ✓ Generated friend leaderboard data structure
  - ✓ Includes all friends with mention counts and last-seen dates
  - ✓ Output: `data/viz/friend-network.json`
  - ✓ Displayed as leaderboard on trends page (not chart)

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
  - ✓ **Photo display integrated (Nov 10)**
  - ✓ Latest photo section with gallery link
  - [ ] Photo carousel (future enhancement)

- [x] **Build timeline page** (`src/pages/timeline.astro`)
  - ✓ List all 31 report cards chronologically
  - ✓ Grouped by month with expandable cards
  - ✓ Click to expand/collapse for full report details
  - ✓ Mobile-responsive card layout
  - ✓ **PhotoGallery component integrated (Nov 10)**
  - [ ] Advanced filtering/search (future enhancement)

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
  - ✓ Friend leaderboard with 12 friends sorted by recency (Nov 9)
  - Note: Activity charts pending activity analysis implementation

- [ ] **Build friends page**
  - List all friends Pepper has played with
  - Show frequency of mentions
  - Filter/search by name
  - Photos with each friend (if available)
  - **Depends on:** Friend analysis implementation

- [x] **Build photo gallery** ✅ COMPLETED Nov 10
  - ✓ Grid view of all photos (`src/pages/gallery.astro`)
  - ✓ Load from R2 URLs (photos.json)
  - ✓ Masonry-style responsive layout
  - ✓ Date labels on each photo
  - ✓ Links to full-size images
  - [ ] Filter by date/month (future enhancement)
  - [ ] Lightbox for full-size viewing (future enhancement - currently opens in new tab)

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

**Recently Added Features (Nov 10):**
- ✅ Photo display on homepage, timeline, and gallery pages
- ✅ PhotoGallery reusable component
- ✅ Dedicated gallery page with 14 photos

**Missing Features:**
- Activity categorization and charts
- Friends page (optional - leaderboard exists on trends page)
- Individual report card pages (optional - details shown on timeline)
- Photo lightbox/modal (currently opens in new tab)
- Gallery filtering by date/month

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
- `data/analysis/daily/` - Per-report analysis (cached AI extractions)
- `data/analysis/aggregates/` - Aggregated trends and statistics
- `data/viz/` - Chart.js-optimized data
- `data/reports/2025/` - Raw report card JSONs
- `data/schedule/` - Schedule data

**Incremental Architecture (Nov 9):**
- Daily analysis files stored once, never recalculated
- Aggregation reads daily files (no API calls)
- New reports only trigger extraction for that specific date
- Scales efficiently as dataset grows

### Chart.js Integration
- Self-contained `GradeCharts.astro` component
- Pass data via `data-*` attributes on canvas elements
- Use module script that imports Chart.js directly from npm
- Read data from DOM using dataset API

### Claude API Structured Outputs (Friend Analysis)
Using **tool_choice** for guaranteed JSON schema compliance:
- Model: `claude-haiku-4-5` (alias for latest Haiku)
- Define a `record_friends` tool with strict JSON schema
- Use `tool_choice: { type: 'tool', name: 'record_friends' }` to force structured output
- No markdown parsing needed - response guarantees valid JSON
- Cost: ~$0.0012 per full analysis run (31 reports × ~150 tokens)
- Filters: Exclude "Pepper" (can't be friends with herself)
- Sorting: By mention count (desc), then by most recent date (desc)

## References

- [Design Proposal](docs/design-proposal.md) - Full architecture and design decisions
- [Report Card Data Structure](docs/report-card-data-structure.md) - Data schema and extraction details
- [CLAUDE.md](CLAUDE.md) - Project overview and development commands
