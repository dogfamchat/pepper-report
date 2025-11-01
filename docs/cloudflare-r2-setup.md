# Cloudflare R2 Setup Guide

This guide walks you through setting up Cloudflare R2 for storing Pepper's daycare photos.

## What is Cloudflare R2?

Cloudflare R2 is an S3-compatible object storage service with zero egress fees. It's perfect for storing photos that will be accessed frequently (on the website) without incurring bandwidth costs.

## Prerequisites

- Cloudflare account (free tier works fine)
- Access to Cloudflare Dashboard

## Step 1: Create an R2 Bucket

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)

2. Navigate to **R2** in the left sidebar

3. Click **Create bucket**

4. Configure your bucket:
   - **Bucket name**: `pepper-daycare-photos` (or your preferred name)
   - **Location**: Auto (Cloudflare will optimize based on usage)

5. Click **Create bucket**

## Step 2: Enable Public Access (Optional but Recommended)

To serve photos directly from R2 to your website:

1. Open your bucket settings

2. Go to **Settings** → **Public access**

3. Click **Allow Access**

4. You'll get a public URL like:
   ```
   https://pub-xxxxxxxxxxxxx.r2.dev
   ```

5. Save this URL - you'll need it for your website

**Alternative**: Use a custom domain for cleaner URLs:
- Go to **Settings** → **Custom Domains**
- Add your domain (e.g., `photos.pepper-report.com`)
- Update DNS records as instructed

## Step 3: Create API Token

1. In the R2 dashboard, click **Manage R2 API Tokens**

2. Click **Create API Token**

3. Configure permissions:
   - **Token name**: `pepper-report-uploader`
   - **Permissions**: **Object Read & Write**
   - **Specify bucket**: Select your `pepper-daycare-photos` bucket
   - **TTL**: Leave blank (no expiration) or set as desired

4. Click **Create API Token**

5. **IMPORTANT**: Copy these values immediately (they won't be shown again):
   - **Access Key ID**: e.g., `abc123def456...`
   - **Secret Access Key**: e.g., `xyz789uvw012...`
   - **Account ID**: Shown at the top of the page

## Step 4: Configure Environment Variables

### Local Development

Create a `.env` file in your project root (this file is git-ignored):

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY=your_access_key_id
CLOUDFLARE_R2_SECRET_KEY=your_secret_access_key
CLOUDFLARE_R2_BUCKET=pepper-daycare-photos

# Daycare Website Credentials
DAYCARE_USERNAME=your_username
DAYCARE_PASSWORD=your_password
```

### GitHub Actions (CI/CD)

Add these as **Repository Secrets**:

1. Go to your GitHub repository

2. Navigate to **Settings** → **Secrets and variables** → **Actions**

3. Click **New repository secret** for each:
   - `CLOUDFLARE_R2_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY`
   - `CLOUDFLARE_R2_SECRET_KEY`
   - `CLOUDFLARE_R2_BUCKET`

## Step 5: Test the Connection

Run a test upload to verify everything works:

```bash
# Set environment variables (if not in .env)
export CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
export CLOUDFLARE_R2_ACCESS_KEY=your_access_key
export CLOUDFLARE_R2_SECRET_KEY=your_secret_key
export CLOUDFLARE_R2_BUCKET=pepper-daycare-photos

# Run a test scrape with photos
bun run scripts/scrapers/scrape-report.ts --date 2024-11-15 --verbose
```

If successful, you should see photos uploaded to R2 and listed in `photos.json`.

## Step 6: Configure Bucket Lifecycle Rules (Optional)

To automatically delete old photos after a certain period:

1. Open your bucket in the R2 dashboard

2. Go to **Settings** → **Object lifecycle rules**

3. Click **Create rule**:
   - **Rule name**: `delete-old-photos`
   - **Prefix**: `photos/` (optional - targets photo folder only)
   - **Delete objects after**: `365 days` (or your preference)

4. Click **Create**

## Directory Structure in R2

Photos will be organized like this:

```
pepper-daycare-photos/
├── photos/
│   ├── 2024-11-15/
│   │   ├── 2024-11-15-001.jpg (full size)
│   │   ├── 2024-11-15-002.jpg
│   │   └── thumbnails/
│   │       ├── 2024-11-15-001.jpg (400px wide)
│   │       └── 2024-11-15-002.jpg
│   ├── 2024-11-16/
│   │   └── ...
│   └── ...
```

## Cost Estimate

Cloudflare R2 pricing (as of 2024):

- **Storage**: $0.015 per GB/month
- **Class A operations** (writes): $4.50 per million requests
- **Class B operations** (reads): $0.36 per million requests
- **Egress**: **FREE** (no bandwidth charges!)

**Example for Pepper's photos**:
- ~3 photos per day × 365 days = ~1,095 photos/year
- Average ~2 MB per photo (full + thumbnail) = ~2.2 GB storage
- **Cost**: ~$0.03/month or **$0.40/year**

Essentially free for this use case!

## Troubleshooting

### "Access Denied" Errors

- **Check API token permissions**: Must have "Object Read & Write" for the specific bucket
- **Verify account ID**: Make sure it matches your Cloudflare account
- **Check bucket name**: Must match exactly (case-sensitive)

### Photos Not Appearing on Website

- **Enable public access**: Make sure bucket has public access enabled
- **Check R2 URL**: Verify you're using the correct `pub-*.r2.dev` URL
- **CORS configuration**: If loading from a different domain, you may need to configure CORS:
  ```json
  [
    {
      "AllowedOrigins": ["https://your-website.com"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

### Rate Limiting

If you're backfilling many photos at once:
- R2 has generous rate limits (10,000+ requests/second)
- But the daycare website might rate-limit you
- Use the built-in delays in backfill scripts (3-5 seconds between requests)

## Security Best Practices

1. **Never commit credentials**: `.env` is in `.gitignore` - keep it that way!
2. **Rotate API keys periodically**: Create new tokens every 6-12 months
3. **Use least privilege**: API token should only access the photos bucket
4. **Monitor usage**: Check R2 dashboard occasionally for unusual activity
5. **Enable public access carefully**: Only if you need direct photo URLs

## Next Steps

Once R2 is configured:
1. Test local scraping with photos
2. Update GitHub Secrets for CI/CD
3. Run backfill to upload historical photos
4. Configure Astro site to display photos from R2 URLs

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [S3-Compatible API Reference](https://developers.cloudflare.com/r2/api/s3/)
