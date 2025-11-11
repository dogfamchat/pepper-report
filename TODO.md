# TODO - Pepper Report Project

**Last Updated:** 2025-11-11
**Current Phase:** Analysis & Visualization (Phase 3 - Complete)
**Current Branch:** activity-categorization (ready for review and merge)

## Overview

This tracks remaining work to complete the Pepper Report project. See [docs/design-proposal.md](docs/design-proposal.md) for full architecture and [docs/report-card-data-structure.md](docs/report-card-data-structure.md) for data schema details.

## Recent Progress

### Nov 11, 2025 - Activity Categorization ✅ COMPLETE

**Branch:** `activity-categorization` (ready for merge)

**Completed:**
- ✅ **Activity Aggregation Logic** (`scripts/analysis/aggregate.ts`)
  - Created `analyzeActivityBreakdown()` function
  - Built 4 Chart.js visualization generators
  - Integrated into automated analysis pipeline

- ✅ **Activity Charts on Trends Page** (`src/pages/trends.astro`)
  - Activity category horizontal bar chart (7 categories)
  - Training category horizontal bar chart (6 categories)
  - Top 10 activities horizontal bar chart
  - Top 10 training skills horizontal bar chart
  - Enhanced tooltips showing which activities/skills belong to each category
  - Info modals (ℹ️) with comprehensive category breakdowns
  - Responsive grid layout with proper Chart.js initialization

- ✅ **Chart Refinements** (Nov 11)
  - Fixed color palette for better contrast (purple, teal, sky blue)
  - Fixed bar chart label visibility (all 10 labels now showing)
  - Adjusted chart heights for better proportions
  - Fixed doughnut chart size inconsistency
  - Converted category charts from doughnut to horizontal bars (more accurate for overlapping categories)
  - Consistent legend styling across all charts

- ✅ **Data Processing**
  - Regenerated all 32 daily analysis files with activity fields
  - Created 5 new visualization data files in `data/viz/`
  - All builds passing, TypeScript checks clean

**Statistics:**
- 255 total activity instances across 32 reports
- 135 total training instances
- Top categories: Playtime (99 instances), Socialization (67), Outdoor (33)
- Top training: Obedience Commands (51), Handling & Manners (40)

**Key Commits:**
- `3942ca1` - Add activity categorization aggregation and visualization
- `f54e201` - Adjust activity charts (colors, labels, sizing)
- `37582f2` - Fix doughnut chart size inconsistency
- `5b30d5f` - Convert category charts from doughnut to horizontal bar charts

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

**📊 Current Stats (as of Nov 11, 2025):**
- 32 report cards scraped (Aug 8 - Nov 10, 2025)
- Overall average: 3.58/4.0 (89.5%)
- 14 weeks tracked, 4 months of data
- **14 photos uploaded to Cloudflare R2** (all displayed with lightbox modal)
- **12 unique friends identified** (filtered, sorted by recency)
- **255 activity instances tracked** across 7 categories
- **135 training instances tracked** across 6 categories
- **95 positive behaviors** ("Caught Being Good") - not yet visualized
- **13 "ooops" behaviors** - not yet visualized

## Current Status

**Activity categorization is now complete!** ✅ All major analysis features are implemented:
- Grade trends ✅
- Friend analysis ✅
- Activity categorization ✅ (with 4 charts + info modals)
- Photo display ✅ (with lightbox modal + timeline indicators)

**Ready to merge:** The `activity-categorization` branch has been fully tested and is ready for production deployment.
- ✅ PR #10 created: https://github.com/dogfamchat/pepper-report/pull/10
- ✅ All builds passing (Astro + TypeScript + Biome)
- ✅ Dev server tested locally
- ✅ All 4 activity charts rendering correctly
- ✅ Info modals (ℹ️) working properly

### Immediate Tasks (Next Session)

- [ ] **Merge activity-categorization branch to main**
  - Create PR from `activity-categorization` to `main`
  - Review changes and verify all charts working
  - Merge and deploy to production

- [ ] **Implement behavior tracking charts** (Next feature branch)
  - **Branch:** `behavior-tracking` (to be created)
  - **Approach:** Flexible aggregation (no categories needed - raw strings are meaningful)
  - **Data source:** `caughtBeingGood[]` and `ooops[]` arrays in each report
  - **Known values (as of Nov 11, 32 reports):**
    - 8 unique "Caught Being Good" behaviors
    - 3 unique "Ooops" behaviors
    - 95 total positive behaviors (avg 3 per report, 100% of reports)
    - 13 total ooops (avg 0.4 per report, 34% of reports)

  **Charts to implement:**
  1. [ ] **Positive behavior trend line** - # of "caught being good" behaviors over time
  2. [ ] **Good vs Ooops comparison** - Dual-line or stacked bar chart showing ratio
  3. [ ] **Behavior frequency bar chart** - Top behaviors by count (horizontal bar)
  4. [ ] **Ooops tracking** - Monitor problem behaviors over time

  **Implementation approach:**
  - No hardcoded categories (unlike activities)
  - Automatically includes new values when they appear
  - Simple frequency counting and trending
  - Integrate into existing `extract-daily.ts` and `aggregate.ts` pipeline

  **Files to modify:**
  - `scripts/analysis/extract-daily.ts` - Add behavior extraction
  - `scripts/analysis/aggregate.ts` - Add behavior aggregation
  - `src/pages/trends.astro` - Add 2-3 behavior charts
  - Create `data/analysis/aggregates/behavior-trends.json`
  - Create `data/viz/behavior-*.json` files for Chart.js

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

- [x] **Implement activity categorization** ✅ COMPLETED Nov 10-11
  - **Branch:** `activity-categorization` (PR #10)
  - **Approach:** Rules-based mapping using fixed activity lists from daycare app
  - **Implementation:** Created mapping files (`activity-categories.ts`, `activity-categorizer.ts`), integrated into incremental analysis pipeline, added 4 Chart.js visualizations to trends page with info modals
  - **Categories:** 7 activity categories, 6 training categories
  - **Results:** 255 activity instances, 135 training instances across 32 reports
  - **Key files:** Activity categorizer logic, daily extraction, aggregation, 5 visualization JSON files, trends page charts

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

- [x] **Activity breakdown visualization data** ✅ COMPLETED Nov 11
  - ✓ Formatted activity categories for horizontal bar charts
  - ✓ Includes percentages and counts
  - ✓ Output: `data/viz/activity-categories.json`, `activity-frequency.json`
  - ✓ Output: `data/viz/training-categories.json`, `training-frequency.json`
  - ✓ Integrated into activity-categorization branch (PR #10)

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
  - ✓ Activity categorization charts (4 charts added in PR #10)
  - **Note:** Page is growing - consider splitting into separate pages (e.g., `/trends/grades`, `/trends/activities`, `/trends/friends`) if it becomes too long or slow to load

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
  - ✓ Full-screen lightbox modal with keyboard navigation (←/→, ESC)
  - ✓ Click outside to close, body scroll locking
  - [ ] Filter by date/month (future enhancement)

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

- [ ] **Automated photobook & advanced photo analysis**
  - **Photo quality analyzer using Claude Vision API**
    - Analyze each photo for composition, clarity, cuteness
    - Score photos automatically (0-10 scale)
    - Generate metadata: activity detection ("Pepper playing with a ball"), mood, setting
    - Cost: ~$0.01-0.02 per image analysis
    - Output: `data/analysis/photo-quality.json`

  - **"Best of" photo generator**
    - Select top photos based on quality scores
    - Auto-generate monthly or semi-annual highlights
    - Overlay stats on images (grade averages, friend counts)
    - Generate themed collections: "Pepper's Best Friends", "Playtime Highlights"

  - **Semi-annual photobook automation via Blurb API**
    - Use Claude Vision to score all photos from the 6-month period
    - Select top 20-30 photos automatically
    - Generate captions using Claude
    - Create photobook layout via Blurb API
    - Consider integrating report card highlights and stats
    - Auto-order and ship twice yearly (Dec 1, Jun 1)
    - Cost estimate: ~$15-30 per book + ~$0.20-0.60 for AI analysis
    - Triggered via GitHub Action on semi-annual schedule
    - **Implementation steps:**
      1. Research Blurb API authentication and book creation endpoints
      2. Create `scripts/photobook/photo-scorer.ts` using Claude Vision API
      3. Create `scripts/photobook/book-generator.ts` for layout and ordering
      4. Design template with photos + stats integration
      5. Add `.github/workflows/quarterly-photobook.yml`

  - **Other physical product ideas** (Printful/Gelato APIs)
    - Annual calendars (12 best photos)
    - Canvas prints of highest-rated photos
    - Custom trading cards with stats
    - Seasonal ornaments

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
- Trends page with interactive Chart.js visualizations:
  - Grade timeline (line chart)
  - Grade distribution (donut chart)
  - Friend leaderboard (12 friends)
  - **Activity category chart (horizontal bar)** ✨ New in PR #10
  - **Training category chart (horizontal bar)** ✨ New in PR #10
  - **Top 10 activities chart (horizontal bar)** ✨ New in PR #10
  - **Top 10 training skills chart (horizontal bar)** ✨ New in PR #10
  - **Info modals (ℹ️) with category breakdowns** ✨ New in PR #10
- Timeline page with all 32 report cards (expandable cards)
- Gallery page with 14 photos and full-screen lightbox modal
- Photo indicator badges (📷) on timeline for dates with photos
- Automated daily scraping and analysis via GitHub Actions
- Automated deployment on every push to main

**Recently Added Features:**
- **Nov 11, 2025:** Activity categorization with 4 new charts (in PR #10)
- **Nov 10, 2025:** Photo display with lightbox modal + timeline indicators

**Future Enhancements:**
- Behavior tracking charts ("Caught Being Good" / "Ooops") - Next priority
- Friends page (optional - leaderboard currently on trends page)
- Individual report card pages (optional - details shown on timeline)
- Gallery filtering by date/month
- Photo carousel on homepage

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
