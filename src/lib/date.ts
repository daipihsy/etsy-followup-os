// ============================================================================
// Date helpers. All "dates" in the app are day-granularity ISO strings
// (YYYY-MM-DD) interpreted in the user's local timezone. Datetimes use full
// ISO strings. We avoid UTC drift by parsing YYYY-MM-DD into local midnight.
// ============================================================================

const MS_PER_DAY = 86_400_000;

/** Local date as YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Full ISO datetime for "now". */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Convert a Date to a local YYYY-MM-DD string. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD (or full ISO) string into a local Date at midnight. */
export function parseDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const datePart = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Add N days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from `from` to `to` (to - from). Negative if `to` is earlier. */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? parseDate(from) : from;
  const b = typeof to === 'string' ? parseDate(to) : to;
  if (!a || !b) return 0;
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMid - aMid) / MS_PER_DAY);
}

/** Days since a date up to today (>= 0 for past dates). */
export function daysSince(iso: string | undefined | null): number | null {
  if (!iso) return null;
  return daysBetween(iso, todayISO());
}

/** Days until a date from today (negative = overdue). */
export function daysUntil(iso: string | undefined | null): number | null {
  if (!iso) return null;
  return daysBetween(todayISO(), iso);
}

/** Short display date, e.g. "Aug 19" or "Aug 19, 2026" when not current year. */
export function formatDate(iso: string | undefined | null): string {
  const d = parseDate(iso ?? undefined);
  if (!d) return '—';
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

/** Human relative label for a review/action date relative to today. */
export function relativeLabel(iso: string | undefined | null): string {
  const days = daysUntil(iso);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/** "3 days ago", "Today", "—" for a past date (used for Last Action). */
export function agoLabel(iso: string | undefined | null): string {
  const days = daysSince(iso);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export type AgeStage = 'New' | 'Early' | 'Growing' | 'Mature';

/** Listing age in days from publishDate (falls back to createdAt). */
export function listingAgeDays(listing: { publishDate?: string; createdAt: string }): number {
  const base = listing.publishDate || listing.createdAt;
  const days = daysSince(base);
  return days === null ? 0 : Math.max(0, days);
}

export function ageStage(days: number): AgeStage {
  if (days <= 7) return 'New';
  if (days <= 14) return 'Early';
  if (days <= 30) return 'Growing';
  return 'Mature';
}

export function formatAge(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}
