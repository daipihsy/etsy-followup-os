/** Generate a unique-ish id (crypto.randomUUID when available). */
export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
}

/** Tailwind-friendly className joiner. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function fmtMoney(v: number | undefined | null, currency = 'USD'): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  const sym = currencySymbol(currency);
  return `${sym}${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function fmtPct(v: number | undefined | null, digits = 1): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function fmtNum(v: number | undefined | null, digits = 0): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtRoas(v: number | undefined | null): string {
  if (v === undefined || v === null || isNaN(v)) return '—';
  return v.toFixed(1);
}

/** Parse a possibly-empty numeric input string into number | undefined. */
export function parseNum(v: string): number | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return isNaN(n) ? undefined : n;
}

/** Signed difference formatter for Before/After tables. */
export function fmtDiff(before: number | undefined, after: number | undefined, digits = 1): string {
  if (before === undefined || after === undefined) return '—';
  const d = after - before;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(digits)}`;
}
