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

## Project Status

**Phase 1: Foundation Setup** ✅ Complete

- Project structure created
- Dependencies installed (Astro, Playwright, Chart.js, Sharp)
- TypeScript configuration
- Staff anonymization system
- Basic Astro site scaffolding
- Data schema templates and type definitions

**Next:** Build scrapers and test with historical data

## Getting Started

### Initial Setup

Dependencies are already installed! Staff names are discovered automatically during scraping - no manual setup required.

**How it works:**
- When scrapers find staff names in report cards, they automatically register them in `staff.private.json`
- Pseudonyms are generated deterministically (same name → same pseudonym)
- Anonymized names are stored in `staff.public.json` (safe to commit)

**Manual regeneration (optional):**
```bash
bun run anonymize  # Regenerate pseudonyms from discovered names
```

**⚠️ Important:** `staff.private.json` contains real names and is automatically excluded from Git!

### Development Commands

```bash
# Website development
bun run dev              # Start Astro dev server (http://localhost:4321)
bun run build            # Build for production
bun run preview          # Preview production build

# Staff anonymization
bun run anonymize        # Generate pseudonyms from staff.private.json

# To be implemented:
bun run scrape:schedule  # Scrape weekly schedule
bun run scrape:report    # Scrape report card
bun run analyze          # Run all analysis scripts
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
