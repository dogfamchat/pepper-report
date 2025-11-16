import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface DailyAnalysis {
  aiActivityCategories: Array<{ item: string; category: string }>;
  aiTrainingCategories: Array<{ item: string; category: string }>;
}

// Convert snake_case to Title Case
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Build mappings from all daily analysis files
function buildCategoryMappings() {
  const dataDir = join(process.cwd(), 'data', 'analysis', 'daily');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  const activityMap = new Map<string, Set<string>>();
  const trainingMap = new Map<string, Set<string>>();

  // Process each file
  for (const file of files) {
    const filePath = join(dataDir, file);
    const content = readFileSync(filePath, 'utf-8');
    const data: DailyAnalysis = JSON.parse(content);

    // Process activity categories
    if (data.aiActivityCategories) {
      for (const { item, category } of data.aiActivityCategories) {
        const titleCaseCategory = toTitleCase(category);
        if (!activityMap.has(titleCaseCategory)) {
          activityMap.set(titleCaseCategory, new Set());
        }
        activityMap.get(titleCaseCategory)?.add(item);
      }
    }

    // Process training categories
    if (data.aiTrainingCategories) {
      for (const { item, category } of data.aiTrainingCategories) {
        const titleCaseCategory = toTitleCase(category);
        if (!trainingMap.has(titleCaseCategory)) {
          trainingMap.set(titleCaseCategory, new Set());
        }
        trainingMap.get(titleCaseCategory)?.add(item);
      }
    }
  }

  // Convert to sorted objects
  const aiActivityCategoryItems: Record<string, string[]> = {};
  for (const [category, items] of Array.from(activityMap.entries()).sort()) {
    aiActivityCategoryItems[category] = Array.from(items).sort();
  }

  const aiTrainingCategoryItems: Record<string, string[]> = {};
  for (const [category, items] of Array.from(trainingMap.entries()).sort()) {
    aiTrainingCategoryItems[category] = Array.from(items).sort();
  }

  return { aiActivityCategoryItems, aiTrainingCategoryItems };
}

// Generate TypeScript object literal string
function generateObjectLiteral(obj: Record<string, string[]>, indent = 2): string {
  const spaces = ' '.repeat(indent);
  const lines: string[] = [];

  for (const [category, items] of Object.entries(obj)) {
    const itemsStr = items.map((item) => `'${item.replace(/'/g, "\\'")}'`).join(', ');
    lines.push(`${spaces}'${category}': [${itemsStr}]`);
  }

  return `{\n${lines.join(',\n')}\n}`;
}

// Main execution
const { aiActivityCategoryItems, aiTrainingCategoryItems } = buildCategoryMappings();

console.log('// Activity Categories to Items');
console.log(`const aiActivityCategoryItems = ${generateObjectLiteral(aiActivityCategoryItems)};`);
console.log();
console.log('// Training Categories to Items');
console.log(`const aiTrainingCategoryItems = ${generateObjectLiteral(aiTrainingCategoryItems)};`);

// Also print statistics
console.log();
console.log('// Statistics:');
console.log(`// - Activity categories: ${Object.keys(aiActivityCategoryItems).length}`);
console.log(`// - Training categories: ${Object.keys(aiTrainingCategoryItems).length}`);
console.log(
  `// - Total unique activity items: ${Object.values(aiActivityCategoryItems).reduce((sum, arr) => sum + arr.length, 0)}`,
);
console.log(
  `// - Total unique training items: ${Object.values(aiTrainingCategoryItems).reduce((sum, arr) => sum + arr.length, 0)}`,
);
