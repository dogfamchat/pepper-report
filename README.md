# Pepper's Daycare Dashboard 🐕

A data pipeline that automatically scrapes, analyzes, and visualizes our dog Pepper's daycare report cards.

## What It Does

- **Scrapes** Pepper's daycare website daily for schedules and report cards
- **Analyzes** trends in grades, behavior, friendships, and activities
- **Visualizes** everything on a beautiful static website
- **Notifies** us via Slack and GitHub Issues when new report cards arrive
- **Stores** complete history in Git (August 2025 onwards)

## Tech Stack

- **Bun** - Fast TypeScript runtime
- **Astro** - Static site generator
- **Playwright** - Web scraping with authentication
- **Chart.js** - Data visualization
- **Cloudflare R2** - Photo storage
- **GitHub Actions** - Automated daily pipeline
- **GitHub Pages** - Website hosting

## Project Structure

```
data/
  schedule/       # Weekly attendance schedules
  reports/        # Individual report cards (JSON)
  analysis/       # Aggregated insights
  viz/           # Chart-ready data
scripts/
  scrapers/      # Playwright scrapers
  analysis/      # Data analysis scripts
src/             # Astro website
```

## Getting Started

```bash
# Install dependencies
bun install

# Scrape a report card
bun run scripts/scrape-report.ts --date 2024-11-15

# Run analysis
bun run scripts/analyze-all.ts

# Develop website
cd src && bun run dev
```

## Privacy

This is a public repository. Staff names are anonymized using deterministic pseudonyms. Real names are stored only in GitHub Actions secrets and never committed.

## Architecture

Everything runs serverless via GitHub Actions:
1. Daily schedule scraping (8 AM)
2. Report card checking (3 PM, 5 PM, 7 PM on school days)
3. Analysis and visualization generation
4. Automatic deployment to GitHub Pages
5. Notifications via Slack and GitHub Issues

Historical data from August-October 2025 was backfilled before automation started.

See [design-proposal.md](docs/design-proposal.md) for complete architecture details.

---

**Status:** Fun side project tracking how our good girl is doing at daycare! 🎾
