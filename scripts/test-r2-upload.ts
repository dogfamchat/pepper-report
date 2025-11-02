#!/usr/bin/env bun
/**
 * Test script for R2 photo upload
 *
 * Uploads a test photo to Cloudflare R2 to verify the upload pipeline works.
 *
 * Usage:
 *   bun run scripts/test-r2-upload.ts
 *   bun run scripts/test-r2-upload.ts --photo path/to/photo.jpg --date 2025-10-27
 */

import { uploadLocalPhotosToR2 } from './storage/r2-uploader';
import { existsSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let photoPath = join(process.cwd(), 'data/photos/2025-10-27-001.png');
let date = '2025-10-27';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--photo' && args[i + 1]) {
    photoPath = args[i + 1];
    i++;
  } else if (args[i] === '--date' && args[i + 1]) {
    date = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Test R2 Photo Upload

Usage:
  bun run scripts/test-r2-upload.ts [options]

Options:
  --photo <path>    Path to photo file (default: data/photos/2025-10-27-001.png)
  --date <date>     Date for the photo (YYYY-MM-DD) (default: 2025-10-27)
  --help, -h        Show this help message

Examples:
  bun run scripts/test-r2-upload.ts
  bun run scripts/test-r2-upload.ts --photo my-photo.jpg --date 2025-11-02
`);
    process.exit(0);
  }
}

async function main() {
  console.log('🧪 R2 Photo Upload Test\n');

  // Verify photo file exists
  if (!existsSync(photoPath)) {
    console.error(`❌ Error: Photo file not found: ${photoPath}`);
    console.log('\nPlease provide a valid photo path using --photo flag');
    process.exit(1);
  }

  console.log(`📁 Photo: ${photoPath}`);
  console.log(`📅 Date: ${date}\n`);

  try {
    // Check R2 configuration
    const requiredEnvVars = [
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY',
      'CLOUDFLARE_R2_SECRET_KEY',
      'CLOUDFLARE_R2_BUCKET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.log('\n💡 Run: op inject -i .env.template -o .env');
      process.exit(1);
    }

    console.log('✓ R2 configuration found\n');
    console.log('📤 Uploading photo to R2...\n');

    // Upload the photo
    const uploadedFiles = await uploadLocalPhotosToR2(
      [photoPath],
      date,
      { verbose: true }
    );

    if (uploadedFiles.length > 0) {
      console.log('\n✅ Upload successful!');
      console.log(`\n📸 Uploaded ${uploadedFiles.length} photo(s):`);
      uploadedFiles.forEach(filename => console.log(`   - ${filename}`));
      console.log('\n📄 Updated photos.json with R2 URLs');
      console.log('\n💡 You can now view the photo metadata in photos.json');
    } else {
      console.error('\n❌ Upload failed - no files were uploaded');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Upload failed:', error);

    if (error instanceof Error) {
      console.error('\nError details:', error.message);

      // Provide helpful hints for common errors
      if (error.message.includes('credentials')) {
        console.log('\n💡 Check your R2 credentials in .env file');
      } else if (error.message.includes('bucket')) {
        console.log('\n💡 Verify your R2 bucket name is correct');
      } else if (error.message.includes('endpoint')) {
        console.log('\n💡 Check your R2 account ID is correct');
      }
    }

    process.exit(1);
  }
}

main();
