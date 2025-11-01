/**
 * Cloudflare R2 Photo Uploader
 *
 * Handles downloading photos from daycare website, resizing them,
 * and uploading to Cloudflare R2 storage.
 *
 * Cloudflare R2 is S3-compatible, so we use AWS SDK.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { PhotoMetadata, PhotosCollection } from '../types';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

/**
 * Get R2 configuration from environment variables
 */
function getR2Config(): R2Config {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'Missing R2 configuration. Required environment variables:\n' +
      '  - CLOUDFLARE_R2_ACCOUNT_ID\n' +
      '  - CLOUDFLARE_R2_ACCESS_KEY\n' +
      '  - CLOUDFLARE_R2_SECRET_KEY\n' +
      '  - CLOUDFLARE_R2_BUCKET'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

/**
 * Create S3 client for Cloudflare R2
 */
function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Download photo from URL
 */
async function downloadPhoto(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download photo: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Resize photo to specified width (maintains aspect ratio)
 */
async function resizePhoto(buffer: Buffer, width: number): Promise<Buffer> {
  return await sharp(buffer)
    .resize(width, null, {
      withoutEnlargement: true, // Don't upscale smaller images
      fit: 'inside',
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Get image metadata
 */
async function getImageMetadata(buffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Upload photo to R2
 */
async function uploadToR2(
  client: S3Client,
  bucketName: string,
  key: string,
  data: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await client.send(command);

  // Return public URL (assumes bucket has public access configured)
  // Format: https://pub-{hash}.r2.dev/{key}
  // You'll need to configure R2 custom domain or public bucket URL
  return `https://${bucketName}.r2.dev/${key}`;
}

/**
 * Upload photos from URLs to R2
 *
 * Downloads photos, resizes them (full + thumbnail), uploads to R2,
 * and returns array of R2 URLs.
 *
 * @param photoUrls Array of photo URLs from daycare website
 * @param date Report card date (YYYY-MM-DD)
 * @param options Upload options
 * @returns Array of photo filenames/URLs
 */
export async function uploadPhotosToR2(
  photoUrls: string[],
  date: string,
  options: {
    fullWidth?: number; // Default: 1920px
    thumbnailWidth?: number; // Default: 400px
    verbose?: boolean;
  } = {}
): Promise<string[]> {
  const { fullWidth = 1920, thumbnailWidth = 400, verbose = false } = options;

  if (photoUrls.length === 0) {
    return [];
  }

  const config = getR2Config();
  const client = createR2Client(config);
  const uploadedPhotos: string[] = [];

  for (let i = 0; i < photoUrls.length; i++) {
    const url = photoUrls[i];

    try {
      if (verbose) {
        console.log(`   📸 Processing photo ${i + 1}/${photoUrls.length}...`);
      }

      // Download original photo
      const originalBuffer = await downloadPhoto(url);
      const metadata = await getImageMetadata(originalBuffer);

      if (verbose) {
        console.log(`      Original size: ${metadata.width}x${metadata.height}`);
      }

      // Generate unique filename
      const filename = `${date}-${String(i + 1).padStart(3, '0')}.jpg`;

      // Resize for full version
      const fullBuffer = await resizePhoto(originalBuffer, fullWidth);

      // Resize for thumbnail
      const thumbnailBuffer = await resizePhoto(originalBuffer, thumbnailWidth);

      // Upload both versions to R2
      const fullKey = `photos/${date}/${filename}`;
      const thumbnailKey = `photos/${date}/thumbnails/${filename}`;

      const fullUrl = await uploadToR2(client, config.bucketName, fullKey, fullBuffer);
      const thumbnailUrl = await uploadToR2(client, config.bucketName, thumbnailKey, thumbnailBuffer);

      if (verbose) {
        console.log(`      ✓ Uploaded to R2: ${filename}`);
      }

      // Store photo metadata
      const photoMetadata: PhotoMetadata = {
        filename,
        date,
        r2Url: fullUrl,
        thumbnailUrl,
        size: fullBuffer.length,
        width: metadata.width,
        height: metadata.height,
        uploaded: new Date().toISOString(),
      };

      // Update photos.json
      updatePhotosCollection(photoMetadata);

      uploadedPhotos.push(filename);
    } catch (error) {
      console.error(`   ❌ Failed to process photo ${i + 1}:`, error);
      // Continue with other photos
    }
  }

  return uploadedPhotos;
}

/**
 * Update photos.json with new photo metadata
 */
function updatePhotosCollection(photo: PhotoMetadata): void {
  const photosFile = join(process.cwd(), 'photos.json');
  let collection: PhotosCollection;

  if (existsSync(photosFile)) {
    try {
      collection = JSON.parse(readFileSync(photosFile, 'utf-8'));
    } catch (error) {
      console.warn('⚠️  Could not parse photos.json, creating new collection');
      collection = { photos: [], totalSize: 0, count: 0 };
    }
  } else {
    collection = { photos: [], totalSize: 0, count: 0 };
  }

  // Add new photo
  collection.photos.push(photo);
  collection.count = collection.photos.length;
  collection.totalSize = collection.photos.reduce((sum, p) => sum + p.size, 0);

  // Save updated collection
  writeFileSync(photosFile, JSON.stringify(collection, null, 2) + '\n', 'utf-8');
}

/**
 * Get photos for a specific date
 */
export function getPhotosForDate(date: string): PhotoMetadata[] {
  const photosFile = join(process.cwd(), 'photos.json');

  if (!existsSync(photosFile)) {
    return [];
  }

  try {
    const collection: PhotosCollection = JSON.parse(readFileSync(photosFile, 'utf-8'));
    return collection.photos.filter(photo => photo.date === date);
  } catch (error) {
    console.error('Failed to read photos.json:', error);
    return [];
  }
}

export default {
  uploadPhotosToR2,
  getPhotosForDate,
};
