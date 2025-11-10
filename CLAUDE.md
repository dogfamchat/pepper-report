# CLAUDE.md

Guardrails for Claude Code when working with this daycare report scraping pipeline.

**Project:** Scrape → Analyze → Visualize → Notify (Pepper's daycare reports)
**Stack:** Bun + Playwright + Astro + Cloudflare R2

## Critical Guardrails

### Privacy: Staff Name Anonymization
- Always use `processStaffNames()` from `scripts/utils/staff-utils.ts` when handling staff names
- `staff.private.json` stores real name → pseudonym mapping (gitignored, NEVER commit)
- Anonymized names are stored directly in report card JSONs (committed to Git)
- Dog names and report data remain public, only staff names are anonymized
- Example: `processStaffNames(['Jane Smith'])` → auto-registers and returns `['Forest Oak']`

### Scraping: Rate Limiting
- Use 3-5 second delays between requests (respect daycare website)
- Test on single dates before batch operations: `bun run scripts/scrape-report.ts --date 2025-08-08 --dry-run`
- Avoid `page.waitForTimeout()` - use `page.waitForSelector()` or other deterministic waits instead
- Log failures and continue, don't retry immediately on errors

### Data Storage: Git vs R2
- Commit all JSON data to Git (schedule, reports, analysis)
- Store photos in Cloudflare R2, reference via `photos.json`
- Photos: full (1920px) + thumbnails (400px)

### Secrets Management
- Local: Use 1Password CLI `op inject -i .env.template -o .env`
- CI: All secrets in "Shared/Clever Canines" vault
- See `.env.template` for required environment variables
- NEVER commit `.env` or `staff.private.json`

### Testing
- Test scrapers with `--dry-run` flag before production
- Verify JSON output in `data/reports/` after scraping
- For debugging: `chromium.launch({ headless: false })`

### Notifications
- Send to Slack for new reports only
- Skip notifications for backfilled historical data

## Common Patterns

**Scraper workflow:**
```typescript
import { processStaffNames } from './utils/staff-utils';
const realNames = extractedFromPage;
const anonymized = processStaffNames(realNames);
// Save anonymized names in report JSON
```

**Data flow:** GitHub Actions runs scrapers → commits to Git → triggers analysis → deploys static site

For detailed setup, environment variables, or GitHub Actions configuration see `.env.template` and `.github/workflows/`.