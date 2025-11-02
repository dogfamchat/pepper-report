# Report Card Data Structure

**Last Updated:** 2025-11-01

> **⚠️ PRIVACY NOTE:** This documentation must NOT contain real staff names. All staff names should be anonymized or shown as placeholders like `[Staff Name]`. Real names are stored in `staff.private.json` (gitignored) and processed via `processStaffNames()` utility.

## Navigation Flow

1. Login to `https://www.wellnessliving.com/rs/profile.html`
2. Click on "Forms" tab (`a:has-text("Forms")`)
3. View report list in table
4. Click on "Dayschool Report Card" link to open modal (`a:has-text("Dayschool Report Card")`)
5. Report card loads in same page (not in iframe, but as a dynamically loaded modal)

## Report List Page

The report list page shows a table with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Form Name | Always "Dayschool Report Card" | "Dayschool Report Card" |
| Source | Who added it | "Added by staff [Staff Name]" |
| Added On | Date added | "Oct 31, 2025" |
| Status | Completion status | "Completed" (green badge) |
| Completed On | Date and time completed | "Oct 31, 2025, 2:11pm" |
| Completed By | Staff member who completed it | "[Staff Name]" |
| Amended By | Staff member who amended (if any) | "[Staff Name]" or empty |
| Action | View button (eye icon) | Clickable icon |

### Selectors for Report List

- Year selector: Dropdown showing "2025" with left/right arrows
- Search box: Text input with placeholder "Search by form name"
- Filter button: Button with text "Filter"
- Table: `table` element
- Report rows: `table tbody tr`
- Report link: `a:has-text("Dayschool Report Card")`

## Report Card Detail View

The modal is titled "Dayschool Report Card for Pepper (John & Nadine)"

### Field 1: My name
- **Type:** Read-only text display
- **Label:** "My name:"
- **Value:** "Pepper"
- **HTML:** `<div class="css-quiz-answer">Pepper</div>`

### Field 2: My Dayschool Trainer(s) today were
- **Type:** Multi-select dropdown
- **Label:** "My Dayschool Trainer(s) today were:"
- **Options:** [List of staff names - anonymized in actual scraped data]
- **Selected:** One or more trainer names (can have multiple)
- **HTML:** `<select multiple>` with `chosen.js` styling
- **Note:** Staff names are anonymized by processStaffNames() utility

### Field 3: Overall my behavior...
- **Type:** Radio buttons (A/B/C/D grade)
- **Label:** "Overall my behavior, listening ability, skill execution, play etiquette, and pure enjoyment measure up to the following:"
- **Options:**
  - A = I excelled at everything I did today! (checked)
  - B = I practiced consistent good behaviour.
  - C = I needed a little help from the trainer.
  - D = I found the concepts of the day to be challenging.
- **Selected:** "A = I excelled at everything I did today!"
- **HTML:** `<input type="radio" name="a_radio" value="1" checked>`

### Field 4: The ONE best part of my day was
- **Type:** Single-select dropdown
- **Label:** "The ONE best part of my day was:"
- **Options:**
  1. making new friends.
  2. playing with familiar friends. (selected)
  3. hanging out with my bestie.
  4. cuddling with friends.
  5. getting cuddles from the trainer.
  6. eating cookies!
  7. learning something new.
  8. having a pool party!
  9. soaking up the sun.
  10. playing outside!
  11. mastering the agility equipment!
- **Selected:** "playing with familiar friends."
- **HTML:** `<select>` with `chosen.js` styling

### Field 5: What I did today
- **Type:** Textarea (appears from screenshot but not fully captured in exploration)
- **Label:** "What I did today:"
- **Value:** "had a lot of fun with my family" (from screenshot)
- **Note:** Has character counter (likely limited length)

## Data Extraction Strategy

### From Report List Table
Extract these fields for each report:
- **date:** From "Completed On" column (parse "Oct 31, 2025, 2:11pm" → "2025-10-31")
- **completedDateTime:** Full timestamp
- **completedBy:** Staff name from "Completed By" column (**anonymize**)
- **amendedBy:** Staff name from "Amended By" column (**anonymize**)
- **addedBy:** Staff name from "Source" column (**anonymize**)

### From Report Card Modal
Extract these fields:
- **dogName:** From "My name" field (should always be "Pepper")
- **staffNames:** Array from "My Dayschool Trainer(s)" multi-select (**anonymize**)
- **grade:** From behavior radio buttons (A/B/C/D)
- **gradeDescription:** Full text of selected radio option
- **bestPartOfDay:** Selected option from dropdown
- **whatIDidToday:** Text from textarea
- **photos:** Array of photo URLs/references (if present)

## Technical Implementation Notes

### Selectors for Scraping

**Modal Container:**
```typescript
const modal = page.locator('.css-popup-form-wrapper .css-wl-quiz-process-wrap').first();
```

**Modal Title (contains dog name):**
```typescript
const title = modal.locator('.js-wl-quiz-process-header');
// Example: "Dayschool Report Card for Pepper (John & Nadine)"
```

**Field Extraction Pattern:**
Each field is wrapped in a `.css-core-quiz-element-wrap` div with:
- Question: `.css-quiz-question`
- Answer: `.css-quiz-answer` (for read-only)
- or: `.js-core-quiz-response-component` (for form fields)

**Specific Field Selectors:**
```typescript
// Field 1: My name (read-only)
const myName = modal.locator('.css-quiz-question:has-text("My name")').locator('+ .css-col-100 .css-quiz-answer');

// Field 2: Trainers (multi-select)
const trainers = modal.locator('.css-quiz-question:has-text("Trainer")').locator('+ .css-col-100 select option[selected]');

// Field 3: Behavior grade (radio)
const grade = modal.locator('input[name="a_radio"]:checked');

// Field 4: Best part (dropdown)
const bestPart = modal.locator('.css-quiz-question:has-text("best part")').locator('+ .css-col-100 select option[selected]');

// Field 5: What I did today (textarea - need to verify selector)
const whatIDid = modal.locator('.css-quiz-question:has-text("What I did")').locator('+ .css-col-100 textarea');
```

### Modal State
The modal appears to load instantly with data already populated (disabled form fields showing completed report).
- All fields are `disabled` since this is a view-only mode
- Need to extract values from `selected` options and `checked` radio buttons
- Wait strategy: Look for modal title containing "Dayschool Report Card for"

### Photos
**Status:** ✅ Implemented
Photos are embedded as base64-encoded images in the modal HTML:
- Located in `<img src="data:image/png;base64,...">` tags
- Multiple images may be present (stock icons + actual photo)
- Only the **last image** is extracted (the actual daycare photo)
- **Stock photo detection:** Automatically filters out the placeholder photo the daycare uses when no real photo is taken
- Stock photo is identified by SHA256 hash
- Photos saved to `data/photos/YYYY-MM-DD-001.png` (only if not stock photo)
- Empty `photos: []` array when only stock photo is present

## Data Schema (Proposed)

```typescript
interface ReportCard {
  date: string;                    // "2025-10-31"
  completedDateTime: string;       // "2025-10-31T14:11:43"
  dog: {
    name: string;                  // "Pepper"
    owners: string;                // "John & Nadine"
  };
  staffNames: string[];            // ["River Oak"] (anonymized)
  grade: "A" | "B" | "C" | "D";
  gradeDescription: string;        // Full text
  bestPartOfDay: string;
  notes: string;                   // whatIDidToday field
  photos: string[];                // URLs or R2 references
  metadata: {
    addedBy: string;               // Anonymized
    completedBy: string;           // Anonymized
    amendedBy?: string;            // Anonymized
  };
}
```

## Privacy & Anonymization

**Must anonymize:**
- All staff names (from trainers list, completed by, added by, amended by)
- Process using `processStaffNames()` utility

**Do NOT anonymize:**
- Dog name ("Pepper")
- Owner names ("John & Nadine") - these are us!
- Activity descriptions
- Notes/comments

## Status

1. ✅ Document complete data structure
2. ✅ Build TypeScript types for report data (scripts/types.ts)
3. ✅ Implement scraper (scripts/scrapers/scrape-report.ts):
   - Navigates to Forms page
   - Iterates through all reports for a date/year
   - Opens each modal
   - Extracts all fields
   - Anonymizes staff names
   - Saves to JSON
4. ✅ Remove IP address from metadata (privacy enhancement)
   - Removed from TypeScript types
   - Removed from scraper extraction
   - Removed from existing report JSON files
   - Updated documentation

## Remaining Tasks

1. ✅ ~~Verify photo extraction~~ (Complete - with stock photo filtering)
2. ✅ ~~Test scraper with actual report data~~ (Complete)
3. ⏭️ Implement photo upload to Cloudflare R2
4. ⏭️ Update analysis scripts to work with new data structure
5. ⏭️ Optional: Add image resizing with sharp library (1920px full, 400px thumbnails)
