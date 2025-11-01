/**
 * Staff Name Anonymization Script
 *
 * Automatically discovers staff names from scraped report cards and generates
 * deterministic pseudonyms to protect privacy. Scrapers call registerStaffNames()
 * to add new names, which are stored in staff.private.json and mapped to
 * pseudonyms in staff.public.json.
 *
 * Usage:
 *   bun run scripts/anonymize.ts              # Regenerate pseudonyms
 *   registerStaffNames(['Jane', 'John'])      # Add new names (from scraper)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

interface StaffMapping {
  [realName: string]: string;
}

// Nature-based pseudonym word lists
const FIRST_NAMES = [
  'River', 'Meadow', 'Forest', 'Sky', 'Ocean', 'Lake', 'Brook', 'Storm',
  'Dawn', 'Willow', 'Sage', 'Aspen', 'Birch', 'Cedar', 'Maple', 'Rowan',
  'Cypress', 'Jasper', 'Flint', 'Clay', 'Stone', 'Ridge', 'Vale', 'Glen'
];

const LAST_NAMES = [
  'Oak', 'Pine', 'Elm', 'Ash', 'Birch', 'Cedar', 'Maple', 'Willow',
  'Mountain', 'Valley', 'Creek', 'Field', 'Meadow', 'Forest', 'Grove',
  'Hill', 'Stone', 'Rock', 'Cloud', 'Rain', 'Wind', 'Snow', 'Frost', 'Bloom'
];

const rootDir = process.cwd();
const privateFile = join(rootDir, 'staff.private.json');
const publicFile = join(rootDir, 'staff.public.json');

/**
 * Generate a deterministic pseudonym from a real name
 * Same input always produces same output
 */
function generatePseudonym(realName: string): string {
  // Create a hash of the name for deterministic selection
  const hash = createHash('sha256').update(realName.toLowerCase().trim()).digest();

  // Use hash bytes to select from word lists
  const firstIndex = hash[0] % FIRST_NAMES.length;
  const lastIndex = hash[1] % LAST_NAMES.length;

  return `${FIRST_NAMES[firstIndex]} ${LAST_NAMES[lastIndex]}`;
}

/**
 * Load existing staff mapping or create empty one
 */
function loadStaffMapping(): StaffMapping {
  if (!existsSync(privateFile)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(privateFile, 'utf-8'));
  } catch (error) {
    console.warn('⚠️  Could not parse staff.private.json, starting fresh');
    return {};
  }
}

/**
 * Save staff mapping to private file
 */
function saveStaffMapping(mapping: StaffMapping): void {
  writeFileSync(
    privateFile,
    JSON.stringify(mapping, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * Register new staff names discovered during scraping
 * Returns true if any new names were added
 */
function registerStaffNames(names: string[]): boolean {
  const mapping = loadStaffMapping();
  let newNamesAdded = false;

  for (const name of names) {
    const trimmedName = name.trim();
    if (trimmedName && !mapping[trimmedName]) {
      mapping[trimmedName] = trimmedName; // Store as identity mapping
      newNamesAdded = true;
      console.log(`   ➕ Discovered new staff member: ${trimmedName}`);
    }
  }

  if (newNamesAdded) {
    saveStaffMapping(mapping);
    // Regenerate pseudonyms
    regeneratePseudonyms(mapping);
  }

  return newNamesAdded;
}

/**
 * Get pseudonym for a staff name (or return original if not mapped)
 */
function getPseudonym(realName: string): string {
  const publicMapping = existsSync(publicFile)
    ? JSON.parse(readFileSync(publicFile, 'utf-8'))
    : {};

  return publicMapping[realName] || generatePseudonym(realName);
}

/**
 * Regenerate public pseudonyms from private mapping
 */
function regeneratePseudonyms(privateData?: StaffMapping): void {
  const mapping = privateData || loadStaffMapping();
  const publicData: StaffMapping = {};

  for (const realName of Object.keys(mapping)) {
    publicData[realName] = generatePseudonym(realName);
  }

  writeFileSync(
    publicFile,
    JSON.stringify(publicData, null, 2) + '\n',
    'utf-8'
  );
}

/**
 * Main anonymization function (for CLI usage)
 */
async function anonymize() {
  const mapping = loadStaffMapping();
  const count = Object.keys(mapping).length;

  if (count === 0) {
    console.log('ℹ️  No staff names registered yet.');
    console.log('   Staff names will be automatically discovered during scraping.\n');

    // Create empty files
    saveStaffMapping({});
    regeneratePseudonyms({});
    return;
  }

  console.log('🔒 Generating pseudonyms...\n');

  const publicData: StaffMapping = {};
  for (const realName of Object.keys(mapping)) {
    const pseudonym = generatePseudonym(realName);
    publicData[realName] = pseudonym;
    console.log(`   ${realName} → ${pseudonym}`);
  }

  writeFileSync(
    publicFile,
    JSON.stringify(publicData, null, 2) + '\n',
    'utf-8'
  );

  console.log(`\n✅ Generated ${count} pseudonyms`);
  console.log(`📄 Saved to: staff.public.json\n`);
  console.log('⚠️  Remember: NEVER commit staff.private.json to Git!\n');
}

// Run if called directly
if (import.meta.main) {
  anonymize();
}

export {
  generatePseudonym,
  anonymize,
  registerStaffNames,
  getPseudonym,
  loadStaffMapping,
  regeneratePseudonyms
};
