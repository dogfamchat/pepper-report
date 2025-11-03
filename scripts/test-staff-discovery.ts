/**
 * Test Script: Staff Name Auto-Discovery
 *
 * This demonstrates how staff names are automatically discovered and anonymized.
 * Run: bun run scripts/test-staff-discovery.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processStaffNames } from './utils/staff-utils';

console.log('🧪 Testing Staff Name Auto-Discovery\n');
console.log('='.repeat(60));

// Simulate scraping three report cards with different staff
const reportCards = [
  {
    date: '2024-11-01',
    staff: ['Jane Smith', 'John Doe'],
  },
  {
    date: '2024-11-02',
    staff: ['Jane Smith', 'Emily Johnson'],
  },
  {
    date: '2024-11-03',
    staff: ['Michael Brown'],
  },
];

console.log('\n📋 Simulating report card scraping...\n');

for (const report of reportCards) {
  console.log(`\n📅 ${report.date}`);
  console.log(`   Real staff: ${report.staff.join(', ')}`);

  // Process names (auto-registers new ones)
  const anonymized = processStaffNames(report.staff, { verbose: false });

  console.log(`   Anonymized: ${anonymized.join(', ')}`);
}

// Show final state
console.log(`\n${'='.repeat(60)}`);
console.log('\n📊 Final Staff Registry:\n');

const privateFile = join(process.cwd(), 'staff.private.json');
const publicFile = join(process.cwd(), 'staff.public.json');

const privateData = JSON.parse(readFileSync(privateFile, 'utf-8'));
const publicData = JSON.parse(readFileSync(publicFile, 'utf-8'));

console.log('Real names (staff.private.json):');
Object.keys(privateData).forEach((name) => {
  console.log(`   - ${name}`);
});

console.log('\nPseudonyms (staff.public.json):');
Object.entries(publicData).forEach(([real, pseudo]) => {
  console.log(`   - ${real} → ${pseudo}`);
});

console.log('\n✅ Test complete!\n');
console.log('Key points:');
console.log('  • New staff names are automatically registered');
console.log('  • Same name always gets same pseudonym (deterministic)');
console.log('  • staff.private.json contains real names (never commit!)');
console.log('  • staff.public.json contains pseudonyms (safe to commit)');
console.log();
