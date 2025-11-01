/**
 * Authentication Utilities
 *
 * Shared login functionality for daycare website scrapers.
 */

import type { Page } from 'playwright';

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Log into the daycare website
 *
 * @param page - Playwright page instance
 * @param credentials - Username and password
 * @param verbose - Enable verbose logging
 * @throws Error if login fails or credentials are missing
 */
export async function login(
  page: Page,
  credentials: LoginCredentials,
  verbose = false
): Promise<void> {
  const { username, password } = credentials;

  if (!username || !password) {
    throw new Error('Username and password are required for login');
  }

  if (verbose) {
    console.log('🔐 Logging in...');
  }

  // Fill in login form using specific WellnessLiving selectors
  await page.fill('input#template-passport-login', username);
  await page.fill('input#template-passport-password', password);

  // Wait for navigation after login (modern Playwright pattern)
  await Promise.all([
    page.waitForURL('**/*', { waitUntil: 'networkidle' }),
    page.click('button[type="submit"]'),
  ]);

  if (verbose) {
    console.log('✓ Logged in successfully');
  }
}

/**
 * Get login credentials from environment variables
 *
 * @throws Error if required environment variables are missing
 */
export function getCredentials(): LoginCredentials {
  const username = process.env.DAYCARE_USERNAME;
  const password = process.env.DAYCARE_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  - DAYCARE_USERNAME\n' +
      '  - DAYCARE_PASSWORD'
    );
  }

  return { username, password };
}
