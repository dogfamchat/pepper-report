# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for automated scraping and deployment.

## Why GitHub Secrets?

GitHub Secrets are encrypted environment variables that keep sensitive credentials (passwords, API keys) secure. They're never exposed in logs or code and can only be accessed by authorized GitHub Actions workflows.

## Required Secrets for Phase 2

### 1. Daycare Website Credentials

**`DAYCARE_SCHEDULE_URL`**
- **Description**: The URL to the daycare schedule page
- **Example**: `https://daycare-website.com/schedule` or `https://app.example-daycare.com/schedule`
- **Where to find**: The schedule page URL after logging in
- **Note**: Do not include trailing slash

**`DAYCARE_REPORT_URL`**
- **Description**: The URL to the daycare report cards page
- **Example**: `https://daycare-website.com/reports` or `https://app.example-daycare.com/reports`
- **Where to find**: The report cards page URL after logging in
- **Note**: Do not include trailing slash

**`DAYCARE_USERNAME`**
- **Description**: Your login username for the daycare website
- **Example**: `john@example.com` or `johnsmith`
- **Where to find**: Your daycare account credentials

**`DAYCARE_PASSWORD`**
- **Description**: Your password for the daycare website
- **Example**: `MySecureP@ssw0rd!`
- **Security note**: Use a strong, unique password

### 2. Staff Name Mapping

**`STAFF_PRIVATE_JSON`**
- **Description**: JSON mapping of real staff names to themselves (for anonymization)
- **Format**: JSON object
- **Example**:
  ```json
  {
    "Jane Smith": "Jane Smith",
    "John Doe": "John Doe",
    "Sarah Johnson": "Sarah Johnson"
  }
  ```
- **How to generate**: Run scrapers locally first, then copy `staff.private.json`

### 3. Cloudflare R2 Configuration

**`CLOUDFLARE_R2_ACCOUNT_ID`**
- **Description**: Your Cloudflare account ID
- **Where to find**: Cloudflare R2 dashboard (shown at top of page)
- **Example**: `a1b2c3d4e5f6g7h8i9j0`

**`CLOUDFLARE_R2_ACCESS_KEY`**
- **Description**: R2 API token access key ID
- **Where to find**: Created when you generate an R2 API token
- **Example**: `abc123def456ghi789`

**`CLOUDFLARE_R2_SECRET_KEY`**
- **Description**: R2 API token secret access key
- **Where to find**: Created when you generate an R2 API token (shown only once!)
- **Example**: `xyz789uvw456rst123pqr456mno789`
- **Security note**: Save immediately when creating token - not shown again

**`CLOUDFLARE_R2_BUCKET`**
- **Description**: Name of your R2 bucket
- **Example**: `pepper-daycare-photos`

## How to Add Secrets to GitHub

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret

For each secret listed above:

1. Click **New repository secret**
2. Enter the **Name** exactly as shown (case-sensitive!)
3. Paste the **Value**
4. Click **Add secret**

### Visual Guide

```
Repository → Settings → Secrets and variables → Actions → New repository secret

┌─────────────────────────────────────┐
│ Name: DAYCARE_USERNAME              │
│ ─────────────────────────────────── │
│ Secret: john@example.com            │
│ ─────────────────────────────────── │
│           [ Add secret ]            │
└─────────────────────────────────────┘
```

## Generating STAFF_PRIVATE_JSON Secret

This secret requires running scrapers locally first:

### Method 1: From Existing Local File

If you've already run scrapers locally and have `staff.private.json`:

```bash
# Display the content
cat staff.private.json

# Copy the output and paste as STAFF_PRIVATE_JSON secret
```

### Method 2: Start Fresh

If starting from scratch:

```bash
# Create empty staff mapping
echo '{}' > staff.private.json

# Set as secret initially (can update later as staff are discovered)
```

**Important**: After your first automated scrape discovers new staff members, the workflow will output updated JSON. You'll need to manually update the secret.

### Updating After New Staff Discovery

When GitHub Actions discovers new staff members:

1. Check the workflow run logs
2. Look for "⚠️ New staff members discovered!"
3. Copy the JSON output shown
4. Go to Settings → Secrets → STAFF_PRIVATE_JSON
5. Click **Update** and paste the new JSON

## Verifying Secrets Are Set

After adding all secrets, verify they appear in the list:

```
Settings → Secrets and variables → Actions

Secrets:
✓ CLOUDFLARE_R2_ACCESS_KEY         Updated 2 minutes ago
✓ CLOUDFLARE_R2_ACCOUNT_ID         Updated 3 minutes ago
✓ CLOUDFLARE_R2_BUCKET             Updated 3 minutes ago
✓ CLOUDFLARE_R2_SECRET_KEY         Updated 2 minutes ago
✓ DAYCARE_PASSWORD                 Updated 5 minutes ago
✓ DAYCARE_USERNAME                 Updated 5 minutes ago
✓ STAFF_PRIVATE_JSON               Updated 1 minute ago
```

## Testing Secrets in GitHub Actions

Trigger a manual workflow run to test:

1. Go to **Actions** tab
2. Select **Report Card Checker** workflow
3. Click **Run workflow**
4. Choose branch (usually `main`)
5. Click **Run workflow**

Watch the logs to verify:
- ✅ Login succeeds (credentials work)
- ✅ Staff mapping loads (no parsing errors)
- ✅ Photos upload to R2 (if report card exists)

## Security Best Practices

### ✅ DO

- Use unique, strong passwords
- Rotate credentials every 6-12 months
- Review secret access regularly
- Delete unused secrets promptly
- Use least-privilege API tokens (only necessary permissions)

### ❌ DON'T

- Never commit secrets to Git (`.gitignore` protects `.env`)
- Don't share secrets outside GitHub Actions
- Don't use personal passwords (create dedicated account if possible)
- Don't print secret values in workflow logs
- Don't grant unnecessary workflow permissions

## Troubleshooting

### "Secret not found" Error

**Problem**: Workflow can't access a secret

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Ensure secret is added to the correct repository
3. Check workflow has `secrets: inherit` permission (if using reusable workflows)

### "Invalid credentials" Error

**Problem**: Login to daycare website fails

**Solution**:
1. Verify `DAYCARE_USERNAME` and `DAYCARE_PASSWORD` are correct
2. Test credentials manually on the daycare website
3. Check for special characters that might need escaping
4. Ensure account isn't locked or expired

### "R2 access denied" Error

**Problem**: Can't upload photos to R2

**Solution**:
1. Verify all R2 secrets are set correctly
2. Check R2 API token permissions (needs "Object Read & Write")
3. Confirm bucket name matches exactly
4. Test R2 credentials locally first

### "Staff mapping parse error"

**Problem**: `STAFF_PRIVATE_JSON` format is invalid

**Solution**:
1. Ensure it's valid JSON (use a JSON validator)
2. Check for trailing commas (not allowed in JSON)
3. Verify quotes are double quotes (not single)
4. Test locally: `echo '${{ secrets.STAFF_PRIVATE_JSON }}' | jq .`

## Updating Secrets

To change a secret value:

1. Go to Settings → Secrets and variables → Actions
2. Find the secret in the list
3. Click **Update**
4. Enter new value
5. Click **Update secret**

Workflows will automatically use the new value on next run (no code changes needed).

## Backing Up Secrets

Since secrets aren't visible after creation:

### Local Backup (Encrypted)

Store in a password manager like 1Password, Bitwarden, or LastPass:

```
GitHub Secrets - Pepper Report
├─ DAYCARE_SCHEDULE_URL: https://daycare-website.com/schedule
├─ DAYCARE_REPORT_URL: https://daycare-website.com/reports
├─ DAYCARE_USERNAME: john@example.com
├─ DAYCARE_PASSWORD: MySecureP@ssw0rd!
├─ CLOUDFLARE_R2_ACCOUNT_ID: a1b2c3d4e5f6...
├─ CLOUDFLARE_R2_ACCESS_KEY: abc123def456...
├─ CLOUDFLARE_R2_SECRET_KEY: xyz789uvw456...
├─ CLOUDFLARE_R2_BUCKET: pepper-daycare-photos
└─ STAFF_PRIVATE_JSON: {...}
```

### Environment File (Local Only)

Create `.env.backup` (add to `.gitignore`):

```bash
# GitHub Secrets Backup (DO NOT COMMIT!)
DAYCARE_SCHEDULE_URL=https://daycare-website.com/schedule
DAYCARE_REPORT_URL=https://daycare-website.com/reports
DAYCARE_USERNAME=john@example.com
DAYCARE_PASSWORD=MySecureP@ssw0rd!
CLOUDFLARE_R2_ACCOUNT_ID=a1b2c3d4e5f6...
CLOUDFLARE_R2_ACCESS_KEY=abc123def456...
CLOUDFLARE_R2_SECRET_KEY=xyz789uvw456...
CLOUDFLARE_R2_BUCKET=pepper-daycare-photos
STAFF_PRIVATE_JSON='{"Jane Smith":"Jane Smith"}'
```

## Next Steps

After setting up secrets:

1. ✅ Test workflows manually (Actions → Run workflow)
2. ✅ Verify automated schedules are running
3. ✅ Monitor first few runs for errors
4. ✅ Set up notifications for workflow failures (optional)
5. ✅ Document any custom setup in your own notes

## Additional Security (Optional)

### Environment Protection Rules

For extra security, require manual approval for workflow runs:

1. Settings → Environments → New environment
2. Name: `production`
3. Add protection rule: Required reviewers
4. Update workflows to use: `environment: production`

### Audit Logs

Review secret access:

1. Settings → Logs → Audit log
2. Filter by: `action:repo.secret_scanning_alert`
3. Monitor for unauthorized access attempts

## Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare R2 Setup Guide](./cloudflare-r2-setup.md)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
