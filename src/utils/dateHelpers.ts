/**
 * Date Helpers - Source of Truth for Local Timezone Management
 * 
 * 🎯 Purpose: Prevent streak bugs caused by UTC/timezone mismatches
 * 
 * Key Principle: "Today" always means "User's Local Today", never UTC.
 * 
 * Example Problem:
 * - User completes task at 11:30 PM Local (Jan 24)
 * - System saves as 2026-01-25T02:30:00Z (UTC)
 * - Streak logic thinks they skipped Jan 24 → STREAK BROKEN ❌
 * 
 * Solution:
 * - Always use getLocalTodayDateKey() for "today"
 * - Always normalize dates from DB before comparison
 * - Store completion dates as YYYY-MM-DD strings (no timezone)
 */

import { format, startOfDay, parseISO } from 'date-fns';

/**
 * Get the current date in the user's local timezone as YYYY-MM-DD string.
 * This is the ONLY function you should use for "today".
 * 
 * @returns {string} Current local date as "YYYY-MM-DD" (e.g., "2026-01-24")
 * 
 * @example
 * // User in New York at 11:30 PM on Jan 24
 * getLocalTodayDateKey() // "2026-01-24" ✅
 * 
 * // NOT this (could be UTC tomorrow):
 * new Date().toISOString().split('T')[0] // "2026-01-25" ❌
 */
export function getLocalTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a specific date in the user's local timezone as YYYY-MM-DD string.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Local date as "YYYY-MM-DD"
 * 
 * @example
 * const selectedDate = new Date('2026-01-20T15:30:00');
 * getLocalDateKey(selectedDate) // "2026-01-20"
 */
export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalize a date string from Supabase/Storage to local timezone.
 * Handles both ISO strings and YYYY-MM-DD strings safely.
 * 
 * @param {string} dateString - ISO string or YYYY-MM-DD from DB
 * @returns {string} Normalized local date as "YYYY-MM-DD"
 * 
 * @example
 * // User completed task at 11:30 PM Jan 24 (saved as UTC next day)
 * normalizeDate("2026-01-25T02:30:00Z") // "2026-01-24" ✅
 * 
 * // Already normalized
 * normalizeDate("2026-01-24") // "2026-01-24" ✅
 */
export function normalizeDate(dateString: string): string {
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Parse ISO string and convert to local date key
  const date = parseISO(dateString);
  return getLocalDateKey(date);
}

/**
 * Check if two date strings represent the same local day.
 * Normalizes both dates before comparison.
 * 
 * @param {string} dateString1 - First date (ISO or YYYY-MM-DD)
 * @param {string} dateString2 - Second date (ISO or YYYY-MM-DD)
 * @returns {boolean} True if same local day
 * 
 * @example
 * isSameLocalDay("2026-01-24", "2026-01-24T23:59:00Z") // true ✅
 * isSameLocalDay("2026-01-24", "2026-01-25") // false
 */
export function isSameLocalDay(dateString1: string, dateString2: string): boolean {
  return normalizeDate(dateString1) === normalizeDate(dateString2);
}

/**
 * Check if a date string is today in local timezone.
 * 
 * @param {string} dateString - Date to check (ISO or YYYY-MM-DD)
 * @returns {boolean} True if it's today locally
 * 
 * @example
 * // User's local time: Jan 24, 2026
 * isLocalToday("2026-01-24") // true
 * isLocalToday("2026-01-24T23:59:00Z") // true if UTC converts to local Jan 24
 * isLocalToday("2026-01-25") // false
 */
export function isLocalToday(dateString: string): boolean {
  return normalizeDate(dateString) === getLocalTodayDateKey();
}

/**
 * Check if a date string is yesterday in local timezone.
 * 
 * @param {string} dateString - Date to check
 * @returns {boolean} True if it's yesterday locally
 * 
 * @example
 * // User's local time: Jan 25, 2026
 * isLocalYesterday("2026-01-24") // true
 * isLocalYesterday("2026-01-23") // false
 */
export function isLocalYesterday(dateString: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return normalizeDate(dateString) === getLocalDateKey(yesterday);
}

/**
 * Get start of day for a date string in local timezone.
 * Useful for date comparisons.
 * 
 * @param {string} dateString - Date string to process
 * @returns {Date} Start of day in local timezone
 */
export function getLocalStartOfDay(dateString: string): Date {
  const normalized = normalizeDate(dateString);
  return startOfDay(parseISO(normalized));
}

/**
 * Calculate days between two dates (always positive).
 * 
 * @param {string} dateString1 - First date
 * @param {string} dateString2 - Second date
 * @returns {number} Absolute days between dates
 * 
 * @example
 * daysBetween("2026-01-20", "2026-01-24") // 4
 */
export function daysBetween(dateString1: string, dateString2: string): number {
  const date1 = getLocalStartOfDay(dateString1);
  const date2 = getLocalStartOfDay(dateString2);
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a date string for display.
 * 
 * @param {string} dateString - Date to format
 * @param {string} formatString - date-fns format string
 * @returns {string} Formatted date
 * 
 * @example
 * formatLocalDate("2026-01-24", "MMM d, yyyy") // "Jan 24, 2026"
 */
export function formatLocalDate(dateString: string, formatString: string = 'MMM d, yyyy'): string {
  const normalized = normalizeDate(dateString);
  return format(parseISO(normalized), formatString);
}

/**
 * 🔥 STREAK SAFE: Check if streak is still valid
 * A streak is valid if the last completion was either today or yesterday.
 * 
 * @param {string | null} lastCompletionDateString - Last completion date
 * @returns {boolean} True if streak is still valid
 * 
 * @example
 * // Today is Jan 25
 * isStreakValid("2026-01-25") // true (completed today)
 * isStreakValid("2026-01-24") // true (completed yesterday - streak continues)
 * isStreakValid("2026-01-23") // false (missed a day - streak broken)
 * isStreakValid(null) // false (no history)
 */
export function isStreakValid(lastCompletionDateString: string | null): boolean {
  if (!lastCompletionDateString) return false;
  
  const normalized = normalizeDate(lastCompletionDateString);
  const today = getLocalTodayDateKey();
  
  // Completed today
  if (normalized === today) return true;
  
  // Completed yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return normalized === getLocalDateKey(yesterday);
}

/**
 * 🔥 STREAK SAFE: Check if already counted today
 * Prevents double-counting on the same day.
 * 
 * @param {string | null} lastCompletionDateString - Last completion date
 * @returns {boolean} True if already counted today
 * 
 * @example
 * // Today is Jan 25
 * hasCountedToday("2026-01-25") // true
 * hasCountedToday("2026-01-24") // false
 */
export function hasCountedToday(lastCompletionDateString: string | null): boolean {
  if (!lastCompletionDateString) return false;
  return isLocalToday(lastCompletionDateString);
}
