# Pepper's Daycare Dashboard - Design Proposal

**Project:** Analyzing and visualizing Pepper's daycare report cards  
**Repo:** `dogfamchat/pepper-report`  
**Status:** Fun side project (let's not overthink this!)

## What We're Building

A website that automatically scrapes Pepper's daycare report cards, analyzes trends in her behavior and friendships, and creates beautiful visualizations showing how our good girl is doing over time. Think: "Is Pepper having a good week?", "Who are her BFFs?", "Does she behave better on certain days?"

## The Big Picture

We'll build a data pipeline that runs automatically in GitHub Actions:

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Scrape     │ ───> │   Analyze    │ ───> │  Visualize   │ ───> │   Notify     │
│  Daycare    │      │   Trends     │      │   & Deploy   │      │     Us!      │
│  Website    │      │              │      │              │      │              │
└─────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
      │                     │                      │                      │
      v                     v                      v                      v
  Raw JSON            Analysis JSON          GitHub Pages          GitHub Issue
  + Photos            (aggregates)          (Static Site)           and Slack
```

Everything gets stored in Git, so we have a complete history of Pepper's daycare career!

**Note:** This shows the ongoing automated pipeline. For the initial setup, we'll run a one-time backfill to import August-October 2025 data (~30-40 report cards) before starting the automation.

## Data Pipeline

### Stage 1: Ingestion

**Schedule Scraping** (runs daily, once in the morning)
- Scrape daycare website to find Pepper's schedule for the week
- She attends 2-3 days per week, so we'll know which days to expect report cards
- This helps us catch the rare cases where staff forgets to give her one
- Store schedule data: `data/schedule/2025.json`

**Report Card Scraping** (runs 2-3 times on school days, in the afternoon)
- Check the schedule to see if today is a school day
- If yes, scrape the report card section of the website
- Extract: date, letter grade, staff notes, activity descriptions, staff names, friend mentions
- Download any photos they attached (ignoring stock photos)
- Store report card: `data/reports/2025/2025-08-08.json`
- Store photo: `photos/2025/2025-08-08-001.jpg` (uploaded to Cloudflare R2)
- Only run analysis after we successfully get a new report card

**Authentication:** Username/password stored as GitHub Actions secrets

### Stage 2: Analysis

We'll run two types of analysis:

**Pre-defined Analysis** (TypeScript scripts)
- Calculate weekly/monthly averages of letter grades
- Track grade trends (is she improving?)
- Extract and count friend mentions (who's her top BFF?)
- Categorize activities (playtime, nap time, outdoor time)
- Flag special events or notes from staff
- Store results: `data/analysis/weekly-summary.json`, `data/analysis/top-friends.json`

**AI-Assisted Insights** (Claude API, required)
- **Extract friend names from noteworthyComments field** (critical for friend network analysis)
- Generate natural language summaries: "Pepper had a great week! She played well with Max and Luna."
- Identify behavioral patterns staff might mention repeatedly
- Suggest questions we might want to explore
- Cost: ~$0.20-$2/year (trivial expense)
- Store insights: `data/analysis/ai-insights.json` (one file per report)

### Stage 3: Visualization

**Transform for Charts**
- Reorganize analysis data into formats Chart.js can consume
- Create data files for different visualization types:
  - `data/viz/grade-timeline.json` - grades over time
  - `data/viz/friend-network.json` - friend interaction counts
  - `data/viz/weekly-activity.json` - activity breakdowns
- These files are small and optimized for client-side loading

**Static Website** (Astro)
- Beautiful, fast loading website hosted on GitHub Pages
- Homepage with latest report card and quick stats
- Timeline view showing all report cards chronologically
- Trends page with interactive charts
- Friends page showing her social network
- Photo gallery of all her daycare pics

## Technology Stack

### Core Technologies

**Static Site Generator:** Astro
- Zero JavaScript by default (blazing fast!)
- Native TypeScript support
- Perfect for data-driven sites
- Deploys to GitHub Pages with one click

**Data Visualization:** Chart.js
- Simple, beautiful time-series charts
- Small bundle size (71KB)
- Great TypeScript support
- Perfect for showing grade trends, activity breakdowns, etc.

**Web Scraping:** Playwright (TypeScript)
- Handles authentication and dynamic content
- Reliable in GitHub Actions with Docker containers
- Excellent TypeScript support and debugging tools

**Photo Storage:** Cloudflare R2
- Free for our use case (10GB storage, unlimited bandwidth)
- We'll resize photos before uploading (saves space)
- No egress fees unlike AWS S3
- Photos don't bloat the Git repo

**Runtime:** Bun
- 28x faster package installation than npm
- Runs TypeScript directly
- Native test runner
- Makes GitHub Actions workflows lightning fast

### Data Storage

Everything lives in the Git repository (except photos):

```
pepper-report/
├── data/
│   ├── schedule/
│   │   └── 2025.json
│   ├── reports/
│   │   └── 2025/
│   │       ├── 2025-08-08.json
│   │       └── 2025-08-12.json
│   ├── analysis/
│   │   ├── weekly-summary.json
│   │   ├── top-friends.json
│   │   └── ai-insights.json
│   └── viz/
│       ├── grade-timeline.json
│       ├── friend-network.json
│       └── weekly-activity.json
├── photos.json          # Metadata with R2 URLs
├── staff.private.json   # Real names (not committed)
├── staff.public.json    # Anonymized names (committed)
└── src/                 # Astro website code
```

## Privacy & Anonymization

The repo and website will be **public**, but we'll protect staff privacy:

**Staff Names:**
- Real names (first names only) stored in `staff.private.json` (in `.gitignore`)
- Build script generates deterministic pseudonyms: "Jane" → "River Oak", "John" → "Mountain Pine"
- Same real name always maps to same pseudonym (consistency across builds)
- Website displays only pseudonyms
- Private config stored as GitHub Actions secret

**What Stays Public:**
- Pepper's name (she's our dog!)
- Other dogs' names (first names only, as provided by daycare)
- Anonymized staff names
- All report card data and photos

## GitHub Actions Workflows

### Schedule Workflow (runs daily at 8 AM)

```yaml
name: Update Schedule
on:
  schedule:
    - cron: '0 8 * * *'  # 8 AM daily
  workflow_dispatch:      # Manual trigger

jobs:
  scrape-schedule:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.54.0-noble
    steps:
      - Checkout repo
      - Setup Bun
      - Install dependencies
      - Run schedule scraper (with auth from secrets)
      - Commit updated schedule JSON
```

### Report Card Workflow (runs 3x on school days)

```yaml
name: Check for Report Cards
on:
  schedule:
    - cron: '0 15,17,19 * * *'  # 3 PM, 5 PM, 7 PM
  workflow_dispatch:

jobs:
  check-report:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.54.0-noble
    steps:
      - Checkout repo
      - Setup Bun
      - Check if today is a school day (read schedule)
      - If yes, scrape for report card
      - If found new report card:
          - Download photo(s)
          - Resize and upload to Cloudflare R2
          - Store report JSON
          - Trigger analysis workflow

  analyze:
    needs: check-report
    if: needs.check-report.outputs.new-report == 'true'
    steps:
      - Run analysis scripts
      - Generate AI insights (Claude API)
      - Commit analysis results
      - Trigger deploy workflow

  deploy:
    needs: analyze
    steps:
      - Build staff pseudonyms (from secrets)
      - Build Astro site
      - Deploy to GitHub Pages
      - Post notification to Slack
      - Create GitHub issue for discussion
```

## Historical Data Backfill

Pepper started daycare in **August 2025**, so we have ~3 months of report cards to backfill (approximately 30-40 report cards). We need a one-time script to grab all the historical data before the regular automation kicks in.

### Backfill Strategy

**Separate backfill script** (`scripts/backfill.ts`):
- Takes date range as parameters: `--start-date 2025-08-01 --end-date 2025-10-31`
- Scrapes all report cards in the date range
- Respects rate limiting (2-5 seconds between requests to be polite)
- Saves each report card to the appropriate file
- Downloads all historical photos to Cloudflare R2
- Runs in sequence, not parallel (to avoid overwhelming the daycare site)

**Run manually, not in GitHub Actions:**
- Execute locally on your machine first time
- Allows you to monitor progress and handle any errors
- Can pause/resume if needed
- Avoids burning GitHub Actions minutes on a one-time task

**After backfill completes:**
- Run analysis scripts on all historical data
- Generate all aggregate files (weekly summaries, friend counts, etc.)
- Build and deploy the initial website with full history
- **Skip notifications** for backfilled data (otherwise you'd get 30-40 Slack messages!)

### Implementation Approach

```typescript
// scripts/backfill.ts
import { scrapeReportCard } from './scrapers/report-card';
import { analyzeReportCard } from './analysis/analyzer';
import { uploadPhoto } from './storage/r2-uploader';

async function backfill(startDate: Date, endDate: Date) {
  console.log(`Backfilling from ${startDate} to ${endDate}...`);
  
  const dates = getSchoolDays(startDate, endDate); // Filter to known school days
  
  for (const date of dates) {
    console.log(`Processing ${date}...`);
    
    try {
      const reportCard = await scrapeReportCard(date);
      
      if (reportCard) {
        // Save report card JSON
        await saveReportCard(reportCard);
        
        // Upload photos to R2
        for (const photo of reportCard.photos) {
          await uploadPhoto(photo, date);
        }
        
        console.log(`✓ Saved report card for ${date}`);
      } else {
        console.log(`- No report card found for ${date}`);
      }
      
      // Rate limiting: wait 3 seconds between requests
      await sleep(3000);
      
    } catch (error) {
      console.error(`✗ Failed to process ${date}:`, error);
      // Continue with next date instead of crashing
    }
  }
  
  console.log('Backfill complete! Running analysis...');
  await runFullAnalysis();
}

// Run with: bun run scripts/backfill.ts --start 2025-08-01 --end 2025-10-31
```

### Backfill Checklist

**Before starting:**
- [ ] Test scraper on a single historical date
- [ ] Verify Cloudflare R2 bucket is set up
- [ ] Have daycare credentials ready
- [ ] Know which days Pepper attended (or scrape schedule first)

**During backfill:**
- [ ] Monitor console output for errors
- [ ] Check that photos are uploading correctly
- [ ] Verify JSON files are being created
- [ ] Pause if you hit rate limits or errors

**After backfill:**
- [ ] Run full analysis on all data: `bun run scripts/analyze-all.ts`
- [ ] Build website locally to verify: `bun run build`
- [ ] Check photo gallery loads correctly
- [ ] Review charts to see 3 months of trends
- [ ] Commit all data files to Git
- [ ] Deploy to GitHub Pages
- [ ] Post a single "Historical data loaded!" message to Slack

### Rate Limiting Considerations

**Be respectful of the daycare's website:**
- Use 3-5 second delays between requests
- Run during off-hours (evening/night) if possible
- If you get blocked, increase delay and try again later
- Total backfill time: ~40 requests × 5 seconds = ~3-4 minutes (very reasonable)

**Error handling:**
- Log failures but continue with next date
- Save progress after each successful scrape
- Can re-run for specific failed dates later
- Don't retry immediately if something fails

### Schedule Backfill First

**Option 1: Scrape schedule history**
If the daycare website shows past schedules, scrape those first:
```bash
bun run scripts/backfill-schedule.ts --start 2025-08-01 --end 2025-10-31
```

This gives you the exact list of days Pepper attended, so you only scrape on those days.

**Option 2: Manual schedule**
If schedules aren't available online, manually create `data/schedule/2025.json`:
```json
{
  "2025-08": [
    "2025-08-05", "2025-08-07", "2025-08-12", "2025-08-14", ...
  ],
  "2025-09": [...],
  "2025-10": [...]
}
```

Then the backfill script only attempts those specific dates.

## Notifications

We need to know when Pepper gets a new report card! Here are a few options:

### Option 1: GitHub Issues (Recommended)

**How it works:**
- When a new report card is found, create a GitHub issue
- Title: "📋 New Report Card: Nov 15, 2024 - Grade A"
- Body includes: grade, staff notes snippet, link to updated website, photo thumbnail
- Tag both of us: `@username1 @username2`
- Auto-close previous report card issue (keep inbox clean)

**Pros:**
- Zero setup, zero cost
- GitHub notifies us by email automatically
- Keeps a searchable history
- Can comment/discuss directly on the issue
- Mobile notifications via GitHub app

**Cons:**
- Requires GitHub app for instant notifications
- Clutters issue tracker (though we can filter by label)

**Implementation:**
```yaml
- name: Create notification issue
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '📋 New Report Card: ${{ env.DATE }} - Grade ${{ env.GRADE }}',
        body: `Pepper's new report card is available!\n\n**Grade:** ${{ env.GRADE }}\n**Staff Notes:** ${{ env.NOTES }}\n\n[View Website](https://dogfamchat.github.io/pepper-report)`,
        labels: ['report-card', 'automated'],
        assignees: ['your-username', 'nadine-username']
      });
```

### Option 2: Slack Webhook

**How it works:**
- Create an incoming webhook in your Slack workspace
- Post a formatted message when new report card arrives
- Include grade, staff notes, and link to website
- Can mention both of you in the message

**Pros:**
- Instant notification where you already chat
- Can use rich formatting (bold, emojis, buttons)
- Can include photo thumbnails
- Very reliable delivery

**Cons:**
- Requires 2-minute setup in Slack
- One more secret to manage (webhook URL)

**Setup (one time):**
1. Go to your Slack workspace → Settings & administration → Manage apps
2. Search for "Incoming Webhooks" and add to workspace
3. Create new webhook, choose channel (e.g., #pepper-updates)
4. Copy webhook URL
5. Add to GitHub secrets as `SLACK_WEBHOOK_URL`

**Implementation:**
```yaml
- name: Post to Slack
  uses: slackapi/slack-github-action@v1.26.0
  with:
    payload: |
      {
        "text": "🐕 New report card for Pepper!",
        "blocks": [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "📋 New Report Card - ${{ env.DATE }}"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Grade:*\n${{ env.GRADE }}"
              },
              {
                "type": "mrkdwn",
                "text": "*Friends:*\n${{ env.TOP_FRIEND }}"
              }
            ]
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Staff Notes:*\n${{ env.NOTES_PREVIEW }}"
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "📊 View Dashboard"
                },
                "url": "https://dogfamchat.github.io/pepper-report"
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "💬 Discuss"
                },
                "url": "${{ env.ISSUE_URL }}"
              }
            ]
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

**Example Slack Message:**
```
🐕 New report card for Pepper!

📋 New Report Card - Nov 15, 2024

Grade:          Friends:
A               Max, Luna

Staff Notes:
Pepper had a great day! She played well with her friends...

[📊 View Dashboard]  [💬 Discuss]
```

**Pro tip:** Use [Slack's Block Kit Builder](https://app.slack.com/block-kit-builder) to design custom message layouts. You can add:
- Photo thumbnails from Cloudflare R2
- Color-coded borders (green for A, yellow for B, etc.)
- Multiple action buttons
- Expandable sections for full staff notes

### Recommendation: Slack + GitHub Issues

**Use both!** They complement each other perfectly:

**Slack for instant awareness:**
- Real-time notification while you're chatting during the day
- Quick "Pepper got her report card!" moment
- Can react with emojis (🐕 ⭐ 🎉)
- Link directly to the website and GitHub issue

**GitHub Issues for the permanent record:**
- Searchable history of all report cards
- Discussion thread for each day
- Can add notes later ("Oh, she was tired because we had friends over")
- Keeps everything in one place with the code

**Example notification flow:**
```
New Report Card Found
    ↓
┌─────────────────────┬─────────────────────┐
│   Post to Slack     │  Create GitHub      │
│   (immediate)       │  Issue (record)     │
└─────────────────────┴─────────────────────┘
         ↓                       ↓
    See it in your         Email notification
    Slack channel         + permanent thread
         ↓
    Click link → Website
```

**Setup:**
1. Create a Slack incoming webhook (takes 2 minutes)
2. Store webhook URL as GitHub secret
3. Workflow posts to both Slack and GitHub Issues

**Real-world example:**
```
3:15 PM - Pepper's daycare posts her report card
3:17 PM - GitHub Actions scrapes it
3:18 PM - Slack message: "🐕 Pepper got an A today!"
3:18 PM - Both of you see it on Slack, react with 🎉
3:18 PM - GitHub Issue created (you get email too)
3:30 PM - You click through from Slack to website
Evening - You add a comment on the GitHub Issue about her day
```

This gives you the best of both: instant awareness via Slack where you're already chatting, plus a permanent record in GitHub that you can search and discuss later.

## Cost Analysis

**Free:**
- GitHub Actions (2,000 minutes/month free for private repos, unlimited for public)
- GitHub Pages hosting
- Cloudflare R2 storage (10GB free = ~3-4 years of photos)
- Bun, Astro, Chart.js, Playwright (all open source)
- GitHub Issues notifications (built-in)
- Slack incoming webhooks (free, unlimited)
- Initial backfill (run locally, ~3-4 minutes, zero cost)
- SendGrid email (100 emails/day = plenty for our use case)

**Minimal Cost:**
- Claude API for AI insights: ~$0.20-$2/year (required for friend extraction)
- After 3-4 years, R2 storage: ~$0.01/month per additional GB

**Total: ~$0.20-$2/year** (essentially free)

## Implementation Phases

### Phase 1: MVP (Weekend Project)
- [ ] Set up repository structure
- [ ] Build schedule scraper (Playwright + TypeScript)
- [ ] Build report card scraper
- [ ] **Test scrapers on a few historical dates**
- [ ] Store first few report cards as JSON
- [ ] Basic Astro site showing latest report card
- [ ] Deploy to GitHub Pages

### Phase 1.5: Historical Backfill (Following Weeknight)
- [ ] Create backfill script with date range support
- [ ] Backfill schedule data (August - October 2025)
- [ ] Run backfill for all report cards (30-40 cards)
- [ ] Upload all historical photos to R2
- [ ] Run initial analysis on full dataset
- [ ] Verify data quality and completeness
- [ ] Rebuild and deploy site with full history

### Phase 2: Automation (Following Weekend)
- [ ] Set up GitHub Actions workflows
- [ ] Configure secrets (daycare credentials, Slack webhook URL)
- [ ] Set up Cloudflare R2 bucket
- [ ] Add photo upload to pipeline
- [ ] Add Slack + GitHub Issue notifications
- [ ] Test end-to-end automation

### Phase 3: Analysis & Visualization (Fun Part!)
- [ ] Write analysis scripts (grade trends, friend mentions)
- [ ] Create Chart.js visualizations
- [ ] Build full Astro site with multiple pages
- [ ] Add photo gallery
- [ ] Staff name anonymization

### Phase 4: Polish (Optional)
- [ ] Improve chart designs
- [ ] Add more analysis dimensions
- [ ] Build "special events" detection
- [ ] Historical comparison views
- [ ] Advanced friend interaction graphs

## Open Questions / Decisions

1. **Historical Schedule:** Can we scrape past schedules from the daycare website, or do we need to manually create the list of days Pepper attended?

2. **Backfill Timing:** When should we run the backfill? (Weeknight evening, weekend morning, etc.)

3. **Notification Details:** Should we include photo thumbnails in Slack messages, or just links? Auto-close old GitHub issues or leave them all open?

4. **Scraping Schedule:** Should we check for report cards 2x or 3x per day? (3x is safer but uses more Actions minutes)

3. **AI Model Choice:** Use Haiku ($0.20/year) or Sonnet ($2/year) for better quality insights?

4. **Photo Processing:** Resize to 1920px or 1200px width? Generate thumbnails at what size?

5. **Visualization Priorities:** Which charts are most important for v1?
   - Grade over time (definitely)
   - Friend mention frequency (definitely)
   - Activity breakdown (nice to have)
   - Weekly vs monthly views (iterating on this)

6. **Domain Name:** Do we want a custom domain, or is `username.github.io/pepper-report` fine?

## Why This Architecture?

**Serverless = Zero Maintenance**
- No servers to manage, patch, or pay for
- GitHub Actions handles all compute
- Cloudflare handles all image serving

**Git as Database = Simplicity**
- Complete history of all data (including the backfilled August-October data)
- Easy rollbacks if something breaks
- No database to maintain or back up
- Works perfectly for append-only data (report cards)
- Can diff changes to see what was updated

**Static Site = Speed & Reliability**
- Loads instantly (no server processing)
- GitHub Pages has 99.9% uptime
- Can't break or get hacked (no dynamic backend)

**TypeScript = Fewer Bugs**
- Catch errors at compile time
- Great IDE support
- Self-documenting code

## Next Steps

1. Review this proposal and suggest changes
2. Decide on historical schedule approach (scrape or manual list)
3. Set up the repository
4. Build a proof-of-concept scraper for one report card
5. Test on 2-3 historical dates to validate approach
6. If that works, run the full backfill for August-October
7. Deploy initial site with 3 months of history
8. Set up automation for ongoing scraping

---

**Questions? Concerns? Wild ideas?** Let's discuss! This should be fun, not stressful. 🐕
