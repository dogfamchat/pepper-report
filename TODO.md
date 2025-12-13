# TODO - Pepper Report Project

**Last Updated:** 2025-12-13
**Current Phase:** Maintenance & Enhancements (All Core Features Complete)
**Current Branch:** main

## Overview

This tracks remaining work to complete the Pepper Report project. See [docs/design-proposal.md](docs/design-proposal.md) for full architecture and [docs/report-card-data-structure.md](docs/report-card-data-structure.md) for data schema details.

## Recent Progress

### Dec 13, 2025 - AI-Powered Photo Analysis ✅ COMPLETE

**Implementation:**
- ✅ **Photo Analyzer with Claude Vision API** (`scripts/analysis/analyze-photos.ts`)
  - Analyzes all daycare photos using Claude Sonnet vision capabilities
  - Scores each photo on quality, cuteness, and composition (1-10 scale)
  - Generates factual descriptions (no flowery language)
  - Auto-tags activities and identifies visible dog friends
  - Incremental architecture: only new photos trigger API calls
  - Cost: ~$0.01 per photo analysis

- ✅ **Enhanced Gallery Page** (`src/pages/gallery.astro`)
  - New "Top Rated Photos" section with gradient cards
  - #1 photo spans 2 columns × 2 rows (hero treatment)
  - Score badges on all photos (rainbow gradient styling)
  - AI-generated descriptions on all photo cards
  - Enhanced lightbox with scores, description, and tags
  - Activity tags displayed below descriptions

- ✅ **Analysis Data** (`data/analysis/photo-analysis.json`)
  - Contains analysis for 26 photos
  - Average score: 6.6/10 (using full 1-10 range critically)
  - Best photo: Oct 24, 2025 (8/10)
  - Tracks: quality scores, descriptions, tags, activities, visible friends

**Key Technical Details:**
- Model: `claude-sonnet-4-20250514` with vision capabilities
- Structured outputs with `tool_choice` for guaranteed JSON schema
- Prompt includes Pepper's details (Vizsla, reddish coat, female)
- Scoring guidelines ensure differentiated ratings (4-7 for typical daycare photos)
- Context-aware descriptions: each photo sees last 8 descriptions to avoid repetition

**Description Style Evolution:**
The photo descriptions went through several iterations:

1. **Original style** (first run): Engaging, emotional captions
   - Examples: "Pepper strikes a pose with those soulful amber eyes", "Sweet Pepper looking adorable in the play yard"
   - Pros: Warm, engaging, fun to read
   - Cons: Too similar across photos (many mentioned eyes, used words like "adorable", "sweet", "gorgeous")

2. **Factual style** (second iteration): Dry, observational captions
   - Examples: "Close-up shot of Pepper investigating the camera on the artificial turf", "Pepper mid-play with a white terrier"
   - Pros: More varied, focuses on what's actually happening
   - Cons: Too dry/clinical, still some repetition ("classic head tilt", "amber eyes")

3. **Current style** (middle ground with context): Warm, varied, unique captions
   - Examples: "Close-up selfie mode activated!", "The calm in the storm of daycare chaos", "Wrestling match escalates as Pepper joins a golden-coated friend"
   - Implementation: Each API call receives the last 8 descriptions as context, with instructions to write something different
   - Pros: Engaging AND varied - each description feels unique
   - Cons: Slightly higher API cost (~$0.01-0.02 more per full run due to extra context tokens)

To adjust description style, edit the `DESCRIPTION GUIDELINES` section in `scripts/analysis/analyze-photos.ts` (around line 215-227) and re-run with `--force` flag.

**New npm script:** `bun run analyze:photos`

### Dec 7, 2025 - Layout Updates ✅ COMPLETE

**PR:** #20 (merged Dec 7)

- ✅ Additional layout refinements and improvements
- ✅ UI polish across pages

### Dec 4-5, 2025 - Cloudflare Pages Migration ✅ COMPLETE

**Commits:** `c80a042`, `363d5f0`, `8c64bd2`

**Completed:**
- ✅ **Migrated from GitHub Pages to Cloudflare Pages**
  - New production URL: https://pepper-report.pages.dev
  - Added GitHub Pages redirect to new URL
  - Updated all internal navigation links
  - Fixed base path handling for Cloudflare

### Dec 4, 2025 - Recharts Migration ✅ COMPLETE

**PR:** #18 (merged Dec 4)

**Completed:**
- ✅ **Migrated from Chart.js to Recharts**
  - Replaced all Chart.js visualizations with Recharts components
  - SVG-based rendering for better performance and accessibility
  - Improved mobile responsiveness
  - Cleaner component architecture

- ✅ **GitHub Actions Fixes** (PR #19)
  - Fixed failing workflow issues
  - Improved reliability of automated scraping

### Dec 3, 2025 - Workflow Fixes ✅ COMPLETE

**PR:** #17 (merged Dec 3)

- ✅ Fixed data/viz files not updating in report workflow
- ✅ Ensured analysis data regenerates correctly

### Nov 17, 2025 - Mobile & Photo Styling ✅ COMPLETE

**PRs:** #15, #16 (merged Nov 17)

- ✅ Fixed mobile rendering issue with report photos
- ✅ Applied styling changes to photo elements
- ✅ Improved responsive design

### Nov 16, 2025 - Layout & Responsive Design Improvements ✅ COMPLETE

**PR:** #14 (merged Nov 16)

**Completed:**
- ✅ **Responsive Layout Enhancements** (`src/pages/*.astro`)
  - Fixed mobile responsiveness across all pages
  - Improved chart container sizing and layout
  - Enhanced homepage layout with better spacing
  - Updated trends page with responsive grid improvements
  - Cleaned up timeline page layout

- ✅ **Animation Improvements** (`src/components/GradeCharts.astro`, `data/viz/behavior-timeline.json`)
  - Disabled chart animations for better performance
  - Updated behavior timeline visualization settings
  - Modified aggregate.ts to disable animations by default

- ✅ **Component Cleanup** (`src/components/PhotoGallery.astro`, `src/pages/gallery.astro`)
  - Removed unused code and improved component structure
  - Simplified gallery page layout
  - Enhanced photo display components

- ✅ **Layout Consistency** (`src/layouts/Layout.astro`)
  - Added global layout improvements
  - Better mobile viewport handling
  - Consistent styling across all pages

**Files Modified:**
- `.mcp.json` - Chrome MCP configuration fix
- `data/viz/behavior-timeline.json` - Animation settings
- `scripts/analysis/aggregate.ts` - Chart generation updates
- `src/components/GradeCharts.astro` - Chart improvements (35+ line additions)
- `src/components/PhotoGallery.astro` - Code cleanup
- `src/layouts/Layout.astro` - Global layout enhancements
- `src/pages/gallery.astro` - Gallery page simplification
- `src/pages/index.astro` - Homepage layout improvements (73+ line additions)
- `src/pages/timeline.astro` - Timeline cleanup
- `src/pages/trends.astro` - Trends page responsive improvements (95+ line changes)

### Nov 16, 2025 - Code Cleanup & Label Formatting Consistency ✅ COMPLETE

**PR:** #13 (merged Nov 16)

**Completed:**
- ✅ **Additional Code Cleanup** (`scripts/analysis/`)
  - Deleted `activity-categories.ts` entirely (184 lines removed)
  - Removed unused functions from `activity-categorizer.ts` (~160 lines removed)
  - Removed unused interfaces and imports from `extract-daily.ts`
  - Removed categoryCounts/categoryPercentages from `activity-breakdown.json`
  - Total cleanup: 5 files, 76 insertions, 602 deletions
  - Commit: e2a7156

- ✅ **Category Label Formatting Fix**
  - Renamed category keys in learned mappings to include "and":
    - `impulse_control_focus` → `impulse_control_and_focus`
    - `handling_manners` → `handling_and_manners`
  - Updated all 34 daily analysis files with new category names
  - Regenerated visualization JSON files
  - Simple snake_case to Title Case conversion (keeps "and" lowercase)
  - No brittle special case handling needed
  - Total changes: 37 files, 157 insertions, 152 deletions
  - Commit: 6c51e1f

**Key Technical Decision:**
Rather than maintaining special case dictionaries for label formatting, we renamed the category keys themselves at the source (learned mappings) to include "and". This allows a simple converter to handle everything automatically without special cases:
```typescript
// Convert snake_case to Title Case (keep 'and' lowercase)
category.split('_')
  .map(word => word === 'and' ? 'and' : word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')
```

### Nov 15, 2025 - AI-Powered Activity Categorization with Learned Mappings ✅ COMPLETE

**Branch:** `fix-activities-and-training` (ready for PR - pending GitHub Actions update)

**Context:**
After merging PR #10 (activity-categorization), we discovered that activities and training skills are NOT static - new ones are being added frequently. Two new items appeared that weren't in our manual mappings:
- "confidence building" (appeared in 9 reports starting Aug 8, 2025)
- "nose targeting" (appeared in 1 report on Nov 14, 2025)

**Problem:** Manual mapping maintenance would be ongoing burden as daycare adds new activities/skills.

**Solution:** Hybrid approach with AI categorization + learned mappings
1. Keep raw data frequency charts (never break)
2. Add AI-powered category suggestions using Claude Haiku 4.5
3. Use learned mappings to lock categories after first AI categorization (prevents drift)
4. Only new items trigger AI calls (cost-efficient)

**Completed So Far:**
- ✅ **AI Categorization Integration** (`scripts/analysis/extract-daily.ts`)
  - Added `categorizeWithAI()` function using Claude Haiku 4.5 API
  - Structured outputs with tool_choice for guaranteed JSON schema
  - Extended `DailyAnalysis` interface with `aiActivityCategories` and `aiTrainingCategories`
  - Cost: ~$0.00004 per report when AI is needed, $0 when using learned mappings

- ✅ **Learned Mappings System** (`scripts/analysis/extract-daily.ts`)
  - Checks learned mappings first before calling AI
  - Only unmapped items trigger AI categorization
  - Merges learned mappings with AI results
  - Returns early if all items found in cache (no AI call)
  - Verbose logging shows when AI is needed vs cached

- ✅ **Learned Mapping Files Created**
  - `scripts/analysis/learned-activity-mappings.json` (14 activities from manual approach)
  - `scripts/analysis/learned-training-mappings.json` (22 training skills including new ones)
  - Multi-category support preserved for activities
  - "confidence building" categorized as "physical_skills" (semantic reasoning: obstacles, surfaces, heights)
  - "nose targeting" categorized as "impulse_control_and_focus"

- ✅ **AI Category Aggregation** (`scripts/analysis/activity-categorizer.ts`)
  - Created `aggregateAICategoryCounts()` function
  - Counts activity and training instances across all reports
  - Tracks total instances for percentage calculations

- ✅ **AI Category Visualization** (`scripts/analysis/aggregate.ts`)
  - Added `generateAIActivityCategoryViz()` and `generateAITrainingCategoryViz()`
  - Creates Chart.js configuration for horizontal bar charts
  - Outputs to `data/viz/ai-activity-categories.json` and `data/viz/ai-training-categories.json`

- ✅ **Interactive Charts on Trends Page** (`src/pages/trends.astro`)
  - Added "🤖 AI-Suggested Categories" section with 2 charts
  - Built category mappings from AI data (8 activity categories, 6 training categories)
  - Hover tooltips showing all items in each category (afterLabel callbacks)
  - Info icons (ℹ️) opening modals with complete category breakdowns
  - Modals list all items under each category with emoji headers
  - Same UX as manual charts

- ✅ **Testing** (Nov 14 report)
  - Verified learned mappings load correctly
  - Confirmed all known items found in cache (no AI call)
  - Processing time: 1.4s (vs ~2.8s with AI calls)
  - Output: "✅ All items found in learned mappings (no AI call needed)"

- ✅ **Initial AI Categorization** (one-time, Nov 15)
  - Regenerated all 34 daily analysis files with AI categories
  - 304 activity instances categorized across 34 reports
  - 118 training instances categorized across 34 reports
  - Total AI cost: ~$0.0014-0.0027 (one-time expense)

**Pending Tasks:**
- [x] **Regenerate All Daily Files with Learned Mappings** ✅ COMPLETED Nov 15
  - Ran extract-daily.ts for all 34 dates with learned mappings
  - Verified all items found in cache (no AI calls needed)
  - Confirmed data consistency across all files

- [x] **Regenerate Aggregate Data** ✅ COMPLETED Nov 15
  - Ran aggregation to update viz files
  - AI category charts use latest data
  - Chart.js configurations verified

- [x] **Code Cleanup - Remove Rules-Based Categorization** ✅ COMPLETED Nov 15
  - Removed old rules-based category visualization functions (~158 lines)
  - Deleted `data/viz/activity-categories.json` and `data/viz/training-categories.json`
  - Removed unused category map and color constants
  - Cleaned up analyze-all.ts to not generate old viz files
  - Made system fully dynamic from learned mappings

- [x] **Update UI Text** ✅ COMPLETED Nov 15
  - Changed "AI-Suggested Categories" to "Categories"
  - Changed chart titles from "AI Activity/Training Categories" to "Activity/Training Categories"
  - Updated subtitle to show counts: "14 activities • 22 training skills"
  - Removed explanatory subtitles from modals for cleaner UI

- [x] **Update GitHub Actions Workflow** ✅ COMPLETED Nov 16
  - ✓ Added `saveNewLearnedMappings()` function to extract-daily.ts
  - ✓ New AI categorizations automatically saved to learned mapping files
  - ✓ GitHub Actions workflow updated to monitor and commit learned mapping files
  - ✓ Commit message includes note when mappings are updated
  - ✓ Full automation: new activities/skills → AI categorization → saved to mappings → committed to Git

- [x] **Create Commit** ✅ COMPLETED Nov 15
  - Committed learned mappings implementation (commit: 0d912dc)
  - Included learned mapping JSON files
  - Included extract-daily.ts changes (cross-platform fix)
  - Included trends page updates (dynamic modals and tooltips)
  - Included aggregate.ts changes (removed old code)
  - 44 files changed, 440 insertions(+), 1046 deletions (net -606 lines)

**Key Technical Details for Future Claude Sessions:**

**File: `scripts/analysis/extract-daily.ts`**
- Location of learned mapping imports: Lines ~9-16 (after existing imports)
- Modified function: `categorizeWithAI()` (around line 150-250)
- Logic flow:
  1. Load `LEARNED_ACTIVITY_MAPPINGS` and `LEARNED_TRAINING_MAPPINGS` from JSON files
  2. Check all activities/training against learned mappings first
  3. Separate into `unmappedActivities` and `unmappedTraining` arrays
  4. Return early if all found in cache (no AI call)
  5. Only call AI for unmapped items
  6. Merge learned mappings with AI results
  7. Return combined categorizations

**Files: `scripts/analysis/learned-*-mappings.json`**
- `learned-activity-mappings.json`: 14 activities, multi-category support (array values)
- `learned-training-mappings.json`: 22 training skills, single category (string values)
- These are the "source of truth" for categories - edit these to change categorizations
- New items will be added here when AI categorizes them (future enhancement)

**File: `src/pages/trends.astro`**
- AI category section starts around line ~400 (after activity categorization section)
- Two category mappings built from AI data: `aiActivityCategoryItems` and `aiTrainingCategoryItems`
- Used for hover tooltips (afterLabel callbacks) and info modals
- Chart initialization uses these mappings to show items in each category

**Data Flow:**
1. Report scraped → stored in `data/reports/2025/YYYY-MM-DD.json`
2. `extract-daily.ts` reads report, checks learned mappings, calls AI if needed
3. Results saved to `data/analysis/daily/YYYY-MM-DD.json` with `aiActivityCategories` and `aiTrainingCategories`
4. `aggregate.ts` reads all daily files, aggregates AI categories, generates viz JSON
5. Trends page loads viz JSON and renders charts with interactive features

**Cost Analysis:**
- Initial categorization (34 reports): ~$0.0014-0.0027 one-time
- Future reports with learned mappings: $0 (no AI call if all items known)
- Future reports with NEW items: ~$0.00004 per report (only new items categorized)

**Why "confidence building" is physical_skills:**
- Not found in original manual mappings (bug in PR #10 - modal showed it but code didn't include it)
- Appeared in 9 reports starting Aug 8, 2025
- AI suggested "physical_skills" based on semantic reasoning
- User approved: obstacles, surfaces, heights, balance challenges = physical development

### Nov 15, 2025 - Behavior Tracking ✅ COMPLETE

**Branch:** `behaviour-tracking` (ready for PR)

**Completed:**
- ✅ **Behavior Data Extraction** (`scripts/analysis/extract-daily.ts`)
  - Added `caughtBeingGood` and `ooops` arrays to DailyAnalysis interface
  - Extraction logic pulls behaviors directly from report cards
  - No AI processing needed - behaviors are already structured data
  - Regenerated all 34 daily analysis files with behavior fields

- ✅ **Behavior Aggregation Logic** (`scripts/analysis/aggregate.ts`)
  - Created `analyzeBehaviorTrends()` function
  - Counts total positive/negative behaviors across all reports
  - Tracks frequency of each unique behavior
  - Calculates percentages and report coverage
  - Built 2 Chart.js visualization generators (comparison chart removed)

- ✅ **Behavior Charts on Trends Page** (`src/pages/trends.astro`)
  - Behavior timeline (line chart showing positive vs negative over time)
  - Behavior frequency (full-width horizontal bar chart, all behaviors color-coded)
  - Summary stats section (3 stat cards with totals and ratio)
  - Top 5 positive behaviors list
  - All "ooops" behaviors list
  - Color-coded: green for positive, red for negative
  - Responsive mobile-friendly design

- ✅ **Utility Script** (`scripts/analysis/regenerate-all-daily.ts`)
  - New utility script to regenerate all daily files
  - Useful when DailyAnalysis interface changes
  - Processes all 34 reports with proper rate limiting

- ✅ **Data Processing**
  - Regenerated all 34 daily analysis files with behavior data
  - Created 3 data files in `data/analysis/aggregates/` and `data/viz/`
  - Removed redundant behavior comparison chart
  - All builds passing, TypeScript checks clean

- ✅ **Code Cleanup** (Nov 15)
  - Removed redundant behavior comparison bar chart (data shown in stat cards)
  - Deleted `data/viz/behavior-comparison.json`
  - Removed `generateBehaviorComparisonViz()` function from aggregate.ts
  - Made behavior frequency chart full-width for better visibility
  - Fixed TypeScript type assertions for Chart.js canvas elements

**Statistics (34 reports):**
- 100 total positive behaviors (avg 2.9 per report)
- 15 total negative behaviors (avg 0.4 per report)
- 100% of reports have positive behaviors
- 35% of reports have ooops moments
- 6.7:1 positive:negative ratio
- Top positive: "listened and respected my trainer" (26 times, 26%)
- Top ooops: "verbally expressed myself" (10 times, 66.7%)
- 8 unique positive behaviors, 3 unique ooops behaviors

**Key Commits:**
- `08f5cb4` - Add behavior tracking with charts and visualizations
- `204da04` - Update TODO.md with behavior tracking progress
- `c403dd0` - Regenerate daily analysis (34 reports)
- `6ba760b` - Remove redundant behavior comparison chart
- `bab3c76` - Remove unused behavior comparison chart generation

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
- Production deployment to Cloudflare Pages: https://pepper-report.pages.dev
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

**📊 Current Stats (as of Dec 13, 2025):**
- 45 report cards scraped (Aug 8 - Dec 12, 2025)
- 18+ weeks tracked, 5 months of data
- **Photos uploaded to Cloudflare R2** (all displayed with lightbox modal)
- **Unique friends identified** (filtered, sorted by recency)
- **Activity instances tracked** across 7 categories ✅ visualized
- **Training instances tracked** across 6 categories ✅ visualized
- **Positive behaviors** ("Caught Being Good") ✅ visualized
- **"Ooops" behaviors** ✅ visualized

## Current Status

**All major analysis features are now complete!** ✅ Full visualization pipeline implemented:
- Grade trends ✅ (Recharts line/bar charts + weekly/monthly breakdowns)
- Friend analysis ✅ (leaderboard sorted by recency)
- Activity categorization ✅ (AI-powered with learned mappings, category + frequency charts + info modals)
- Behavior tracking ✅ (timeline + frequency charts + stat cards + top behaviors lists)
- Photo display ✅ (lightbox modal + timeline indicators + gallery page)

**Infrastructure:**
- ✅ Migrated from Chart.js to Recharts (PR #18, Dec 4)
- ✅ Migrated from GitHub Pages to Cloudflare Pages (Dec 5)
- ✅ Automated daily scraping and analysis via GitHub Actions

**Recently merged PRs:**
- PR #20 - Layout updates (Dec 7)
- PR #19 - Fix GitHub Actions workflow (Dec 4)
- PR #18 - Recharts migration (Dec 4)
- PR #17 - Fix data/viz workflow (Dec 3)
- PR #16 - Photo styling (Nov 17)
- PR #15 - Mobile rendering fix (Nov 17)
- PR #14 - Layout tweaks (Nov 16)
- PR #13 - AI activity categorization (Nov 16)
- PR #12 - Behavior tracking (Nov 16)

### Immediate Tasks (Next Session)

- [x] **Merge activity-categorization branch to main** ✅ COMPLETED Nov 11
  - ✓ PR #10 merged successfully
  - ✓ Activity charts now in production

- [x] **Review and merge behaviour-tracking PR** ✅ COMPLETED Nov 16
  - ✓ PR #12 merged successfully
  - ✓ Behavior charts now in production
  - ✓ All behavior tracking features deployed

- [x] **Review and merge fix-activities-and-training PR** ✅ COMPLETED Nov 16
  - ✓ PR #13 merged successfully
  - ✓ AI-powered categorization with learned mappings deployed

- [x] **Implement behavior tracking charts** ✅ COMPLETED Nov 15
  - **Branch:** `behaviour-tracking` (ready for PR)
  - **Implementation:** Flexible aggregation (no categories - raw strings used directly)
  - **Charts implemented:**
    1. ✅ Behavior timeline (line chart with positive/negative over time)
    2. ✅ Behavior frequency (full-width horizontal bar chart, all behaviors color-coded)
    3. ❌ Behavior comparison (removed as redundant - data shown in stat cards)
  - **Files modified:**
    - ✅ `scripts/analysis/extract-daily.ts` - Added behavior extraction
    - ✅ `scripts/analysis/aggregate.ts` - Added behavior aggregation (removed comparison viz)
    - ✅ `src/pages/trends.astro` - Added behavior section with 2 charts + stat cards
    - ✅ Created `data/analysis/aggregates/behavior-trends.json`
    - ✅ Created `data/viz/behavior-*.json` files (2 files)
  - **Code cleanup:**
    - ✅ Removed redundant comparison chart visualization
    - ✅ Deleted `data/viz/behavior-comparison.json`
    - ✅ Removed `generateBehaviorComparisonViz()` function

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
  - Photo collages or montages
  - Download all photos as ZIP
  - Slideshow view

- [x] **Photo quality analyzer using Claude Vision API** ✅ COMPLETED Dec 13, 2025
  - ✓ Analyze each photo for composition, clarity, cuteness
  - ✓ Score photos automatically (1-10 scale with critical scoring guidelines)
  - ✓ Generate metadata: activity detection, tags, visible friends
  - ✓ Cost: ~$0.01 per image analysis (Claude Sonnet vision)
  - ✓ Output: `data/analysis/photo-analysis.json`
  - ✓ "Top Rated Photos" section on gallery page
  - ✓ AI descriptions and tags displayed on all photos

- [ ] **"Best of" photo generator** (partially complete)
  - ✓ Select top 10 photos based on quality scores (implemented)
  - [ ] Auto-generate monthly or semi-annual highlights
  - [ ] Overlay stats on images (grade averages, friend counts)
  - [ ] Generate themed collections: "Pepper's Best Friends", "Playtime Highlights"

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

**Live URL:** https://pepper-report.pages.dev (migrated from GitHub Pages Dec 2025)

**Working Features:**
- Homepage with latest report card and statistics
- Trends page with interactive Recharts visualizations:
  - Grade timeline (line chart)
  - Grade distribution (bar chart)
  - Friend leaderboard (sorted by recency)
  - Activity category charts (horizontal bars)
  - Training category charts (horizontal bars)
  - Top activities/training frequency charts
  - Info modals (ℹ️) with category breakdowns
  - Behavior timeline and frequency charts
  - Behavior stat cards and top behaviors lists
- Timeline page with all 45 report cards (expandable cards)
- Gallery page with AI-powered features:
  - "Top Rated Photos" section with quality scores
  - AI-generated descriptions and tags on all photos
  - Full-screen lightbox modal with enhanced details
- Photo indicator badges (📷) on timeline for dates with photos
- Automated daily scraping and analysis via GitHub Actions
- Automated deployment on every push to main

**Major Updates (Nov-Dec 2025):**
- **Dec 13, 2025:** AI-powered photo analysis with Claude Vision API
- **Dec 4, 2025:** Migrated from Chart.js to Recharts (SVG rendering)
- **Dec 5, 2025:** Migrated from GitHub Pages to Cloudflare Pages
- **Nov 16, 2025:** AI-powered activity categorization with learned mappings
- **Nov 16, 2025:** Behavior tracking charts
- **Nov 10, 2025:** Photo display with lightbox modal + timeline indicators

**Future Enhancements (Optional):**
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

### Recharts Integration (migrated from Chart.js Dec 2025)
- Replaced Chart.js with Recharts for SVG-based rendering
- Better performance and accessibility
- Improved mobile responsiveness
- Cleaner React-like component architecture within Astro

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
