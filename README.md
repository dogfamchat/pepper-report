# Pepper's Daycare Dashboard 🐕

A data pipeline that automatically scrapes, analyzes, and visualizes our dog Pepper's daycare report cards.

## What It Does

- **Scrapes** Pepper's daycare website daily for schedules and report cards
- **Analyzes** trends in grades, behavior, friendships, and activities
- **Visualizes** everything on a beautiful static website
- **Notifies** us via Slack when new report cards arrive
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

### Prerequisites

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install 1Password CLI** (for secret management):
   ```bash
   brew install 1password-cli
   ```

3. **Install dependencies**:
   ```bash
   bun install
   ```

### Setting Up Secrets

This project uses 1Password CLI to manage secrets securely. All credentials are stored in the "Shared/Clever Canines" vault in 1Password.

**Generate .env file from 1Password:**
```bash
op inject -i .env.template -o .env
```

This will automatically populate your `.env` file with all required credentials from 1Password:
- Daycare website credentials
- Cloudflare R2 configuration
- Slack webhook URL (optional)
- Anthropic API key (optional)

**⚠️ Important:** Never commit `.env` to Git! It's already in `.gitignore`.

**Field naming in 1Password:**
All field names in the "Clever Canines" 1Password item should be lowercase versions of the environment variable names:
- `DAYCARE_USERNAME` → `username`
- `CLOUDFLARE_R2_BUCKET` → `cloudflare_r2_bucket`
- etc.

### Staff Name Anonymization

Staff names are discovered automatically during scraping - no manual setup required.

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

# Scraping (uses tsx for Windows/Playwright compatibility)
bun run scrape:schedule                    # Scrape weekly schedule
bun run scrape:report                      # Scrape today's report card
bun run scrape:report --date 2025-08-08    # Scrape specific date
bun run scrape:report --dry-run            # Test without saving

# Backfilling historical data
bun run backfill:schedule         # Backfill schedule data
bun run backfill:reports          # Backfill report cards

# Analysis and utilities
bun run analyze          # Run all analysis scripts
bun run anonymize        # Generate pseudonyms from staff.private.json
```

**Note for Windows users:** Due to a Bun/Playwright bug on Windows, scraper and backfill scripts use `bun tsx --env-file=.env` internally. The `bun run` scripts handle this automatically.

## Privacy

This is a public repository. Staff names are anonymized using deterministic pseudonyms. Real names are stored only in GitHub Actions secrets and never committed.

## Architecture

Everything runs serverless via GitHub Actions:
1. Daily schedule scraping (8 AM)
2. Report card checking (3 PM, 5 PM, 7 PM on school days)
3. Analysis and visualization generation
4. Automatic deployment to GitHub Pages
5. Notifications via Slack

Historical data from August-October 2025 was backfilled before automation started.

See [design-proposal.md](docs/design-proposal.md) for complete architecture details.

---

**Status:** Fun side project tracking how our good girl is doing at daycare! 🎾
