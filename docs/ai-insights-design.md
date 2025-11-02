# AI Insights Design Document

## 1. Overview

### 1.1 Purpose
The AI Insights system uses Claude AI to analyze Pepper's daycare report cards and extract meaningful insights that would be difficult or error-prone to capture with rule-based parsing. This includes:

- **Friend name extraction**: Identifying dog names mentioned in free-text staff notes
- **Behavioral pattern analysis**: Detecting trends and patterns in activities and behavior
- **Natural language summaries**: Generating human-readable summaries of daily activities
- **Sentiment analysis**: Understanding the tone and mood of each day

### 1.2 Why AI?
Traditional string parsing fails for friend extraction because:
- Dog names appear in varied contexts ("played with Max", "Max and Luna were buddies today")
- Names can be possessive ("Max's favorite toy")
- Names may be part of phrases ("Max-imum fun!")
- Staff use inconsistent capitalization and formatting
- Need to distinguish dog names from common words

AI provides:
- Context-aware name extraction
- Robust handling of natural language variations
- Ability to infer meaning from partial or ambiguous text
- Scalable pattern recognition without manual rule maintenance

### 1.3 Scope
**In Scope:**
- Friend name extraction from `noteworthyComments` field
- Daily activity summaries
- Behavioral pattern identification
- Sentiment scoring
- Integration with existing analysis pipeline

**Out of Scope (Future Enhancements):**
- Multi-day trend analysis (will use aggregated AI insights)
- Recommendation engine for activities
- Predictive analytics
- Real-time processing (remains batch-oriented)

---

## 2. Architecture

### 2.1 System Context

```
┌─────────────────┐
│ Report Scrapers │
└────────┬────────┘
         │
         ├──► data/reports/YYYY/YYYY-MM-DD.json
         │
         v
┌─────────────────┐
│  AI Insights    │──┐
│    Script       │  │
└────────┬────────┘  │
         │           │ Anthropic
         │           │ Claude API
         v           │
┌─────────────────┐  │
│  ai-insights.   │◄─┘
│     json        │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Analysis       │
│   Scripts       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  top-friends.   │
│     json        │
└─────────────────┘
```

### 2.2 Component Architecture

```
scripts/
  analysis/
    ai-insights.ts          # Main AI processing script
    analyze-all.ts          # Orchestrator (calls AI insights first)
    top-friends.ts          # Uses AI-extracted friend names
    weekly-summary.ts       # Uses AI summaries
  utils/
    claude-client.ts        # Anthropic API wrapper
    prompt-templates.ts     # Reusable prompts
```

### 2.3 Data Flow

1. **Input**: Raw report card JSON with `noteworthyComments` field
2. **Processing**:
   - Load report card
   - Construct prompt with context
   - Call Claude API
   - Parse structured response
3. **Output**: AI insights JSON with extracted friends and summary
4. **Downstream**: Analysis scripts consume AI insights for aggregations

---

## 3. API Integration

### 3.1 Anthropic Claude API

**Model Selection:**
- Primary: `claude-3-5-sonnet-20241022` (good balance of speed/quality)
- Fallback: `claude-3-haiku-20240307` (faster, lower cost)

**Authentication:**
```typescript
// Environment variable: ANTHROPIC_API_KEY
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### 3.2 Request Configuration

```typescript
interface ClaudeRequestConfig {
  model: string;
  max_tokens: number;        // 1024 sufficient for our use case
  temperature: number;       // 0.0 for deterministic extraction
  system: string;            // Task instructions
  messages: Message[];       // User prompt with report data
}
```

### 3.3 Prompt Engineering

**System Prompt:**
```
You are an expert at analyzing pet daycare report cards. Your task is to:

1. Extract dog names mentioned in staff notes (first names only)
2. Summarize the day's activities in 2-3 sentences
3. Identify behavioral patterns or notable events
4. Assess the overall sentiment

Be conservative with name extraction - only extract clear dog names,
not common words. Staff names are already provided separately.
```

**User Prompt Template:**
```
Analyze this daycare report card:

Date: {date}
Grade: {grade}
Staff: {staffNames}
Best Part: {bestPartOfDay}
Activities: {whatIDidToday}
Training: {trainingSkills}
Caught Being Good: {caughtBeingGood}
Ooops: {ooops}
Notes: {noteworthyComments}

Respond with ONLY a JSON object (no markdown formatting):
{
  "friendsMentioned": ["name1", "name2"],
  "summary": "brief 2-3 sentence summary",
  "behavioralPatterns": ["pattern1", "pattern2"],
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0
}
```

### 3.4 Response Parsing

```typescript
interface ClaudeResponse {
  friendsMentioned: string[];
  summary: string;
  behavioralPatterns: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

// Validate and sanitize AI response
function parseAIResponse(raw: string): ClaudeResponse {
  // Strip markdown code blocks if present
  const cleaned = raw.replace(/```json\n?|\n?```/g, '');
  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (!Array.isArray(parsed.friendsMentioned)) {
    throw new Error('Invalid friendsMentioned field');
  }

  // Sanitize friend names (capitalize, trim, remove duplicates)
  parsed.friendsMentioned = Array.from(
    new Set(parsed.friendsMentioned.map(name =>
      name.trim().replace(/\b\w/g, l => l.toUpperCase())
    ))
  );

  return parsed;
}
```

---

## 4. Implementation Details

### 4.1 Main Script: `scripts/analysis/ai-insights.ts`

```typescript
#!/usr/bin/env bun

import { Anthropic } from '@anthropic-ai/sdk';
import type { ReportCard, AIInsights } from '../types';

async function generateInsightsForReport(
  report: ReportCard
): Promise<AIInsights> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build prompt from report data
  const prompt = buildPrompt(report);

  // Call Claude API
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    temperature: 0.0, // Deterministic for consistent extraction
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  // Parse and validate response
  const content = response.content[0].text;
  const parsed = parseAIResponse(content);

  // Return standardized AIInsights object
  return {
    date: new Date().toISOString().split('T')[0],
    reportCardDate: report.date,
    summary: parsed.summary,
    friendsMentioned: parsed.friendsMentioned,
    behavioralPatterns: parsed.behavioralPatterns,
    sentiment: parsed.sentiment,
    confidence: parsed.confidence,
  };
}

async function processAllReports(options: {
  force?: boolean;  // Reprocess existing insights
  dateFilter?: string;  // Process specific date or range
}) {
  // Load all report cards
  const reports = await loadReportCards(options.dateFilter);

  // Load existing insights to avoid reprocessing
  const existingInsights = options.force
    ? {}
    : await loadExistingInsights();

  const results: AIInsights[] = [];

  for (const report of reports) {
    // Skip if already processed (unless --force)
    if (!options.force && existingInsights[report.date]) {
      console.log(`⏭️  Skipping ${report.date} (already processed)`);
      results.push(existingInsights[report.date]);
      continue;
    }

    console.log(`🤖 Processing ${report.date}...`);

    try {
      const insights = await generateInsightsForReport(report);
      results.push(insights);

      // Add delay to respect rate limits (5 req/sec for Claude)
      await delay(250);
    } catch (error) {
      console.error(`❌ Failed to process ${report.date}:`, error);
      // Continue processing other reports
    }
  }

  // Save all insights to single file
  await saveInsights(results);

  console.log(`✅ Processed ${results.length} report cards`);
}
```

### 4.2 Utility: `scripts/utils/claude-client.ts`

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyze(
    systemPrompt: string,
    userPrompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.0,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (response.content[0].type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    return response.content[0].text;
  }

  async analyzeWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.analyze(systemPrompt, userPrompt);
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (error.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`⏳ Rate limited. Retrying in ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        }

        // Don't retry on other errors
        throw error;
      }
    }

    throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message}`);
  }
}
```

### 4.3 Data Output: `data/analysis/ai-insights.json`

```typescript
// Structure: Array of insights, one per report card
[
  {
    "date": "2024-11-15",  // When insights were generated
    "reportCardDate": "2024-11-15",
    "summary": "Pepper had an excellent day focusing on impulse control and sit-stay training. She played outside with several friends and received lots of positive reinforcement for good behavior.",
    "friendsMentioned": ["Max", "Luna", "Bailey"],
    "behavioralPatterns": [
      "Strong impulse control during training",
      "Positive social interactions with multiple dogs",
      "Responsive to training cues"
    ],
    "sentiment": "positive",
    "confidence": 0.95
  },
  // ... more insights
]
```

---

## 5. Integration with Analysis Pipeline

### 5.1 Modified `analyze-all.ts`

```typescript
#!/usr/bin/env bun

/**
 * Master analysis orchestrator
 * Runs all analysis scripts in correct dependency order
 */

async function analyzeAll(options: { force?: boolean }) {
  console.log('🚀 Starting full analysis pipeline...\n');

  // Phase 1: AI Insights (REQUIRED - other scripts depend on this)
  console.log('📊 Phase 1: Generating AI insights...');
  await runScript('scripts/analysis/ai-insights.ts', options);

  // Phase 2: Friend Analysis (depends on AI insights)
  console.log('📊 Phase 2: Analyzing friend networks...');
  await runScript('scripts/analysis/top-friends.ts', options);

  // Phase 3: Weekly Summaries
  console.log('📊 Phase 3: Generating weekly summaries...');
  await runScript('scripts/analysis/weekly-summary.ts', options);

  // Phase 4: Visualization Data
  console.log('📊 Phase 4: Preparing visualization data...');
  await runScript('scripts/analysis/generate-viz.ts', options);

  console.log('\n✅ Analysis pipeline complete!');
}
```

### 5.2 Updated `top-friends.ts`

```typescript
/**
 * Analyzes friend mentions using AI-extracted names
 */

async function analyzeTopFriends(): Promise<TopFriends> {
  // Load AI insights (not raw report cards)
  const insights = await loadAIInsights();

  // Count friend mentions across all insights
  const friendCounts = new Map<string, FriendMention[]>();

  for (const insight of insights) {
    for (const friend of insight.friendsMentioned) {
      if (!friendCounts.has(friend)) {
        friendCounts.set(friend, []);
      }
      friendCounts.get(friend)!.push({
        date: insight.reportCardDate,
        context: insight.summary,
      });
    }
  }

  // Convert to sorted statistics
  const friends: FriendStats[] = Array.from(friendCounts.entries())
    .map(([name, mentions]) => ({
      name,
      mentions: mentions.length,
      percentage: (mentions.length / insights.length) * 100,
      firstSeen: mentions[0].date,
      lastSeen: mentions[mentions.length - 1].date,
      trend: calculateTrend(mentions),
    }))
    .sort((a, b) => b.mentions - a.mentions);

  return {
    summary: {
      totalReportCards: insights.length,
      uniqueFriends: friends.length,
      dateRange: {
        start: insights[0].reportCardDate,
        end: insights[insights.length - 1].reportCardDate,
      },
    },
    friends,
  };
}
```

---

## 6. Error Handling & Resilience

### 6.1 API Error Scenarios

| Error Type | HTTP Status | Handling Strategy |
|------------|-------------|-------------------|
| Rate Limit | 429 | Exponential backoff (2s, 4s, 8s) |
| Invalid API Key | 401 | Fail fast with clear error message |
| Network Error | - | Retry with exponential backoff |
| Timeout | - | Retry with increased timeout |
| Invalid JSON | - | Log error, skip report, continue |
| Service Error | 500-503 | Retry with backoff |

### 6.2 Validation & Sanitization

```typescript
function validateAIInsights(insights: any): AIInsights {
  // Required fields check
  const required = ['friendsMentioned', 'summary', 'sentiment'];
  for (const field of required) {
    if (!(field in insights)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Type validation
  if (!Array.isArray(insights.friendsMentioned)) {
    throw new Error('friendsMentioned must be an array');
  }

  // Sanitize friend names
  insights.friendsMentioned = insights.friendsMentioned
    .filter(name => typeof name === 'string' && name.trim().length > 0)
    .map(name => name.trim())
    .filter(name => name.length >= 2 && name.length <= 30) // Reasonable name lengths
    .map(name => capitalizeFirstLetter(name));

  // Remove duplicates (case-insensitive)
  insights.friendsMentioned = Array.from(
    new Set(insights.friendsMentioned.map(n => n.toLowerCase()))
  ).map(n => capitalizeFirstLetter(n));

  // Validate sentiment
  const validSentiments = ['positive', 'neutral', 'negative'];
  if (!validSentiments.includes(insights.sentiment)) {
    insights.sentiment = 'neutral'; // Safe default
  }

  return insights as AIInsights;
}
```

### 6.3 Partial Failure Handling

```typescript
async function processAllReportsWithRecovery() {
  const results: AIInsights[] = [];
  const errors: { date: string; error: string }[] = [];

  for (const report of reports) {
    try {
      const insights = await generateInsightsForReport(report);
      results.push(insights);
    } catch (error) {
      // Log but continue processing
      console.error(`❌ Failed ${report.date}:`, error.message);
      errors.push({ date: report.date, error: error.message });

      // Create fallback insights to unblock downstream analysis
      results.push(createFallbackInsights(report));
    }
  }

  // Save successful results
  await saveInsights(results);

  // Write error log for review
  if (errors.length > 0) {
    await Bun.write('data/analysis/ai-insights-errors.json',
      JSON.stringify(errors, null, 2)
    );
    console.warn(`⚠️  ${errors.length} reports failed. See ai-insights-errors.json`);
  }

  return results;
}

function createFallbackInsights(report: ReportCard): AIInsights {
  return {
    date: new Date().toISOString().split('T')[0],
    reportCardDate: report.date,
    summary: 'AI insights unavailable for this report.',
    friendsMentioned: [], // Empty, but won't break aggregation
    behavioralPatterns: [],
    sentiment: 'neutral',
    confidence: 0.0,
  };
}
```

---

## 7. Cost & Performance

### 7.1 API Cost Estimation

**Claude 3.5 Sonnet Pricing** (as of 2024):
- Input: $3.00 / million tokens
- Output: $15.00 / million tokens

**Per Report Estimate:**
- Input tokens: ~500 (prompt + report data)
- Output tokens: ~200 (JSON response)
- Cost per report: ~$0.0045

**Monthly Cost** (assuming 20 report cards/month):
- 20 reports × $0.0045 = $0.09/month
- **Annual cost: ~$1.08**

**Backfill Cost** (35 historical reports):
- 35 reports × $0.0045 = $0.16 one-time

### 7.2 Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Single report processing | < 3s | Includes API round-trip |
| Batch processing (20 reports) | < 60s | With rate limiting |
| Cache hit (existing insights) | < 50ms | Skip API call |

### 7.3 Rate Limiting

Anthropic API limits:
- **Tier 1 (default)**: 5 requests/second, 50,000 requests/day
- Our usage: ~20 reports/month = well under limits

Implementation:
```typescript
// Add 250ms delay between requests (4 req/sec - safely under limit)
await delay(250);
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// tests/ai-insights.test.ts

describe('AI Insights', () => {
  test('parseAIResponse handles valid JSON', () => {
    const raw = '{"friendsMentioned":["Max"],"summary":"Good day","sentiment":"positive"}';
    const result = parseAIResponse(raw);
    expect(result.friendsMentioned).toEqual(['Max']);
  });

  test('parseAIResponse strips markdown code blocks', () => {
    const raw = '```json\n{"friendsMentioned":[]}\n```';
    const result = parseAIResponse(raw);
    expect(result).toBeDefined();
  });

  test('validateAIInsights sanitizes friend names', () => {
    const input = { friendsMentioned: ['  max  ', 'MAX', 'luna'] };
    const result = validateAIInsights(input);
    expect(result.friendsMentioned).toEqual(['Max', 'Luna']);
  });

  test('buildPrompt includes all report fields', () => {
    const report = mockReportCard();
    const prompt = buildPrompt(report);
    expect(prompt).toContain(report.noteworthyComments);
    expect(prompt).toContain(report.grade);
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Claude API Integration', () => {
  test('generates insights for real report', async () => {
    const report = await loadReportCard('2025-10-22');
    const insights = await generateInsightsForReport(report);

    expect(insights.summary).toBeTruthy();
    expect(Array.isArray(insights.friendsMentioned)).toBe(true);
    expect(['positive', 'neutral', 'negative']).toContain(insights.sentiment);
  }, 10000); // 10s timeout for API call

  test('handles API errors gracefully', async () => {
    // Mock API failure
    const badClient = new ClaudeClient('invalid-key');
    await expect(badClient.analyze('sys', 'usr')).rejects.toThrow();
  });
});
```

### 8.3 Manual Testing Checklist

Before deployment:
- [ ] Test on 3-5 historical report cards
- [ ] Verify friend names are correctly extracted
- [ ] Check summaries are coherent and accurate
- [ ] Validate JSON output format
- [ ] Test error handling with invalid API key
- [ ] Verify rate limiting works (process 10+ reports)
- [ ] Check cost for full backfill (35 reports)
- [ ] Test integration with `top-friends.ts`
- [ ] Verify Astro site displays insights correctly

---

## 9. Deployment & Operations

### 9.1 GitHub Actions Integration

Update `.github/workflows/analyze.yml`:

```yaml
name: Analyze Report Cards

on:
  workflow_dispatch:
  push:
    paths:
      - 'data/reports/**/*.json'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run AI insights
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: bun run scripts/analysis/ai-insights.ts

      - name: Run analysis pipeline
        run: bun run scripts/analysis/analyze-all.ts

      - name: Commit results
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add data/analysis/
          git commit -m "Update analysis data [skip ci]" || exit 0
          git push
```

### 9.2 Environment Variables

Required secrets in GitHub:
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Local development:
```bash
# .env.template
ANTHROPIC_API_KEY={{op://Shared/Clever Canines/anthropic_api_key}}
```

### 9.3 Monitoring

Track key metrics:
- API call success rate
- Processing time per report
- Monthly API costs
- Error frequency by type

Simple logging:
```typescript
const metrics = {
  processed: 0,
  failed: 0,
  totalTime: 0,
  friendsExtracted: 0,
};

// Log at end of run
console.log(`
📊 AI Insights Metrics:
  Processed: ${metrics.processed} reports
  Failed: ${metrics.failed} reports
  Avg time: ${(metrics.totalTime / metrics.processed).toFixed(1)}s
  Friends found: ${metrics.friendsExtracted} total
  Success rate: ${((metrics.processed / (metrics.processed + metrics.failed)) * 100).toFixed(1)}%
`);
```

---

## 10. Future Enhancements

### 10.1 Multi-Report Analysis
Analyze trends across multiple report cards:
```typescript
// Weekly pattern detection
"This week Pepper showed increased confidence during outdoor play
compared to last week, with 3 mentions of 'brave' vs 1 last week."
```

### 10.2 Behavioral Recommendations
Based on patterns, suggest activities:
```typescript
"Pepper excels at impulse control training. Consider adding more
advanced skills like extended stays or recall under distraction."
```

### 10.3 Photo Analysis
Use Claude's vision capabilities to analyze photos:
```typescript
// Detect activities, dog breeds, play styles from photos
"Photo analysis: Pepper engaging in chase play with 2 medium-sized dogs
in outdoor area. High energy, positive body language."
```

### 10.4 Custom Questions
Allow parents to ask questions about historical data:
```typescript
// Natural language query over all reports
"How has Pepper's relationship with Max evolved over time?"
```

### 10.5 Caching & Optimization
Implement response caching:
```typescript
// Cache parsed insights to reduce reprocessing
const cacheKey = `insights:${report.date}:${hashReportContent(report)}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

---

## 11. Security & Privacy

### 11.1 Data Handling
- **API requests**: Only send necessary data (exclude owner names)
- **Storage**: AI insights stored in public repo (no private data)
- **Logs**: Never log API keys or sensitive responses

### 11.2 API Key Management
- Store in GitHub Secrets (not in code)
- Use 1Password for local development
- Rotate keys quarterly
- Monitor usage in Anthropic Console

### 11.3 Content Review
While AI-generated content is generally safe, implement basic filtering:
```typescript
function sanitizeAISummary(summary: string): string {
  // Remove any potential injection attempts
  return summary
    .replace(/<script/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 500); // Max length
}
```

---

## 12. Success Metrics

### 12.1 Technical Metrics
- **Accuracy**: Friend extraction accuracy > 95% (manual review of 20 samples)
- **Reliability**: Success rate > 98% (< 2% API failures)
- **Performance**: Average processing time < 3s per report
- **Cost**: Monthly spend < $0.50

### 12.2 User Value Metrics
- **Friend tracking**: Identify 10+ unique friends over 3 months
- **Insights quality**: Summaries are readable and accurate
- **Time savings**: Reduce manual friend tracking effort to zero

### 12.3 Review Process
Every month:
1. Review 10 random AI-generated insights
2. Compare friend extraction against manual reading
3. Check summary accuracy and tone
4. Review error logs and failure patterns
5. Optimize prompts if accuracy drops

---

## 13. Implementation Checklist

### Phase 1: Core Implementation
- [ ] Install `@anthropic-ai/sdk` package
- [ ] Create `scripts/utils/claude-client.ts`
- [ ] Create `scripts/utils/prompt-templates.ts`
- [ ] Create `scripts/analysis/ai-insights.ts`
- [ ] Add type definitions for API responses
- [ ] Implement error handling and retries
- [ ] Add rate limiting delays

### Phase 2: Testing
- [ ] Write unit tests for parsing/validation
- [ ] Test on 5 historical report cards manually
- [ ] Verify friend name extraction accuracy
- [ ] Test error handling (invalid API key, network errors)
- [ ] Load test with 20+ reports

### Phase 3: Integration
- [ ] Update `analyze-all.ts` to call AI insights first
- [ ] Modify `top-friends.ts` to use AI insights
- [ ] Update `weekly-summary.ts` to include AI summaries
- [ ] Add AI insights section to Astro website
- [ ] Update CLAUDE.md with new scripts

### Phase 4: Deployment
- [ ] Add `ANTHROPIC_API_KEY` to GitHub Secrets
- [ ] Update GitHub Actions workflow
- [ ] Run backfill on all 35 historical reports
- [ ] Verify analysis pipeline works end-to-end
- [ ] Deploy updated website

### Phase 5: Documentation
- [ ] Add usage examples to README
- [ ] Document prompt engineering decisions
- [ ] Create troubleshooting guide
- [ ] Add monitoring dashboard (optional)

---

## 14. CLI Usage Examples

```bash
# Generate AI insights for all reports (skip existing)
bun run scripts/analysis/ai-insights.ts

# Force regenerate all insights
bun run scripts/analysis/ai-insights.ts --force

# Process specific date range
bun run scripts/analysis/ai-insights.ts --start 2025-08-01 --end 2025-10-31

# Single report (for testing)
bun run scripts/analysis/ai-insights.ts --date 2025-10-22

# Dry run (show prompts without API calls)
bun run scripts/analysis/ai-insights.ts --dry-run

# Use faster/cheaper model
bun run scripts/analysis/ai-insights.ts --model haiku

# Full pipeline with fresh AI insights
bun run scripts/analysis/analyze-all.ts --force
```

---

## 15. References

- **Anthropic API Docs**: https://docs.anthropic.com/
- **Claude Prompt Engineering**: https://docs.anthropic.com/prompt-engineering
- **Rate Limits**: https://docs.anthropic.com/rate-limits
- **Best Practices**: https://docs.anthropic.com/best-practices

---

**Document Version**: 1.0
**Last Updated**: 2024-11-02
**Author**: Design Document for Claude Code Implementation
**Status**: Ready for Implementation
