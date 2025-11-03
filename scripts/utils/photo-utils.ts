/**
 * Photo Extraction and Processing Utilities
 *
 * Handles extraction of base64-encoded photos from report cards,
 * decoding, and preparation for storage (local or R2).
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { uploadLocalPhotosToR2 } from '../storage/r2-uploader';

// SHA256 hash of the stock photo used by the daycare
// This is the placeholder image they use when no real photo is available
const STOCK_PHOTO_HASH = '851b6bdcc30c5a3b92ecdfc3683fc296a51b6724661c72943930252ebd322281';

export interface PhotoData {
  filename: string;
  base64Data: string;
  mimeType: string;
  size: number;
}

/**
 * Extract all base64-encoded images from the report card modal
 * Only extracts the last image, which is the actual daycare photo
 * (earlier images are typically stock icons/UI elements)
 */
export async function extractPhotosFromModal(page: Page, reportDate: string): Promise<PhotoData[]> {
  const photos: PhotoData[] = [];

  // Find all img tags with base64-encoded src
  const imgElements = await page.locator('img[src^="data:image"]').all();

  if (imgElements.length === 0) {
    console.log('   No photos found in modal');
    return photos;
  }

  console.log(`   Found ${imgElements.length} image(s) in modal (extracting last one only)`);

  // Only extract the last image (the actual daycare photo)
  const lastIndex = imgElements.length - 1;
  const img = imgElements[lastIndex];
  const src = await img.getAttribute('src');

  if (!src || !src.startsWith('data:image')) {
    console.warn('   ⚠️  Last image does not have valid data URL');
    return photos;
  }

  // Parse data URL: "data:image/png;base64,iVBORw0KG..."
  const match = src.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    console.warn('   ⚠️  Could not parse last image data URL');
    return photos;
  }

  const [, mimeType, base64Data] = match;
  const extension = mimeType.split('/')[1]; // e.g., "png" from "image/png"

  // Calculate photo hash to detect stock photos
  const photoBuffer = Buffer.from(base64Data, 'base64');
  const photoHash = createHash('sha256').update(photoBuffer).digest('hex');

  // Check if this is the stock photo
  if (photoHash === STOCK_PHOTO_HASH) {
    console.log('   ⏭️  Skipping stock photo (no real photo available)');
    return photos;
  }

  // Generate filename: YYYY-MM-DD-001.png (always use 001 since we only extract one)
  const filename = `${reportDate}-001.${extension}`;

  // Calculate approximate size
  const size = Math.ceil((base64Data.length * 3) / 4);

  photos.push({
    filename,
    base64Data,
    mimeType,
    size,
  });

  console.log(`   ✓ Extracted photo: ${filename} (${formatBytes(size)})`);

  return photos;
}

/**
 * Save photos to local filesystem
 */
export function savePhotosLocally(photos: PhotoData[], outputDir: string = 'data/photos'): void {
  if (photos.length === 0) {
    return;
  }

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (const photo of photos) {
    const filePath = join(outputDir, photo.filename);

    // Decode base64 to binary buffer
    const buffer = Buffer.from(photo.base64Data, 'base64');

    // Write to file
    writeFileSync(filePath, buffer);
    console.log(`   ✓ Saved photo to ${filePath}`);
  }
}

/**
 * Upload photos to Cloudflare R2
 * Saves photos locally first as temp files, then uploads to R2
 *
 * @param photos Photo data extracted from report card
 * @param date Report card date (YYYY-MM-DD)
 * @param options Upload options
 * @returns Array of photo filenames uploaded to R2
 */
export async function uploadPhotosToR2(
  photos: PhotoData[],
  date: string,
  options: {
    verbose?: boolean;
  } = {},
): Promise<string[]> {
  if (photos.length === 0) {
    return [];
  }

  const { verbose = false } = options;

  // Create temp directory for photos
  const tempDir = join(process.cwd(), 'data', 'photos', 'temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // Save photos to temp files first
  const tempPaths: string[] = [];
  for (const photo of photos) {
    const tempPath = join(tempDir, photo.filename);
    const buffer = Buffer.from(photo.base64Data, 'base64');
    writeFileSync(tempPath, buffer);
    tempPaths.push(tempPath);

    if (verbose) {
      console.log(`   ✓ Saved temp photo: ${photo.filename}`);
    }
  }

  // Upload to R2
  if (verbose) {
    console.log(`   📤 Uploading ${tempPaths.length} photo(s) to R2...`);
  }

  const uploadedFiles = await uploadLocalPhotosToR2(tempPaths, date, {
    verbose,
  });

  // Clean up temp files
  for (const tempPath of tempPaths) {
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink(tempPath);
    } catch (_error) {
      // Ignore cleanup errors
    }
  }

  return uploadedFiles;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Filter out stock photos or duplicates (future enhancement)
 * This is a placeholder for more sophisticated filtering
 */
export function filterStockPhotos(photos: PhotoData[]): PhotoData[] {
  // TODO: Implement image similarity detection
  // TODO: Check file size patterns (stock photos might be consistently sized)
  // For now, return all photos
  return photos;
}

/**
 * Resize photos for different uses (future enhancement)
 * This would require an image processing library like sharp
 */
export async function resizePhotos(_photos: PhotoData[]): Promise<{
  full: PhotoData[];
  thumbnails: PhotoData[];
}> {
  // TODO: Implement with sharp or similar library
  // - Full size: 1920px width
  // - Thumbnails: 400px width
  throw new Error('Photo resizing not yet implemented - install sharp library');
}
