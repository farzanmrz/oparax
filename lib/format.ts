/**
 * Shared display formatters. Pure, no I/O.
 */

/**
 * Format a badge count for display. The Feed tab's needs-review badge has no cap on the
 * underlying count (every unposted winner draft across every desk, forever), so an idle desk
 * would otherwise render an arbitrarily large number. Caps the display, not the count.
 */
export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
