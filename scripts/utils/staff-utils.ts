/**
 * Staff Utilities for Scrapers
 *
 * Helper functions for scrapers to automatically discover and anonymize
 * staff names from report cards.
 */

import { registerStaffNames, getPseudonym } from '../anonymize';

/**
 * Process staff names from a scraped report card
 *
 * 1. Registers any new names in staff.private.json
 * 2. Returns anonymized versions for storage
 *
 * Usage in scraper:
 *   const realNames = ['Jane Smith', 'John Doe'];
 *   const anonymizedNames = processStaffNames(realNames);
 *   // Save anonymizedNames in report card JSON
 *
 * @param realNames - Array of real staff names from scraped report
 * @param options - Optional configuration
 * @returns Array of anonymized names
 */
export function processStaffNames(
  realNames: string[],
  options?: {
    autoRegister?: boolean; // Default: true
    verbose?: boolean; // Default: false
  }
): string[] {
  const { autoRegister = true, verbose = false } = options || {};

  // Clean and normalize names
  const cleanedNames = realNames
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (cleanedNames.length === 0) {
    return [];
  }

  // Register new names if auto-register is enabled
  if (autoRegister) {
    const wasUpdated = registerStaffNames(cleanedNames);
    if (wasUpdated && verbose) {
      console.log('✓ Staff registry updated with new names');
    }
  }

  // Return anonymized versions
  return cleanedNames.map(name => getPseudonym(name));
}

/**
 * Extract first names from full names (for display purposes)
 *
 * Example: "Jane Smith" → "Jane"
 */
export function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0];
}

/**
 * Validate staff name format
 *
 * Basic validation to catch potential scraping errors
 */
export function isValidStaffName(name: string): boolean {
  const trimmed = name.trim();

  // Check minimum length
  if (trimmed.length < 2) {
    return false;
  }

  // Check for suspicious patterns (might indicate scraping error)
  const suspiciousPatterns = [
    /^\d+$/, // All digits
    /^[^a-zA-Z]+$/, // No letters
    /https?:\/\//, // URLs
    /@/, // Email addresses
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}

/**
 * Process and validate staff names from scraper
 *
 * Combines validation and processing in one step
 */
export function processAndValidateStaffNames(
  rawNames: string[],
  options?: {
    autoRegister?: boolean;
    verbose?: boolean;
    throwOnInvalid?: boolean; // Default: false (filter out invalid)
  }
): string[] {
  const { throwOnInvalid = false, ...processOptions } = options || {};

  // Validate names first
  const validNames: string[] = [];
  const invalidNames: string[] = [];

  for (const name of rawNames) {
    if (isValidStaffName(name)) {
      validNames.push(name);
    } else {
      invalidNames.push(name);
    }
  }

  // Handle invalid names
  if (invalidNames.length > 0) {
    const message = `Invalid staff names detected: ${invalidNames.join(', ')}`;
    if (throwOnInvalid) {
      throw new Error(message);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  // Process valid names
  return processStaffNames(validNames, processOptions);
}

export default {
  processStaffNames,
  processAndValidateStaffNames,
  extractFirstName,
  isValidStaffName,
};
