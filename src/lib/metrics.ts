import type { Metrics } from './types';

// CTR / CVR are derived from the raw counts Etsy shows you — no hand math.

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** CTR = clicks ÷ views × 100. */
export function computeCtr(m: Metrics): number | undefined {
  if (m.views && m.views > 0 && m.clicks !== undefined && !isNaN(m.clicks)) {
    return round((m.clicks / m.views) * 100);
  }
  return undefined;
}

/** CVR = orders ÷ visits × 100 (falls back to orders ÷ clicks). */
export function computeCvr(m: Metrics): number | undefined {
  const denom = m.visits && m.visits > 0 ? m.visits : m.clicks && m.clicks > 0 ? m.clicks : undefined;
  if (denom && m.orders !== undefined && !isNaN(m.orders)) {
    return round((m.orders / denom) * 100);
  }
  return undefined;
}
