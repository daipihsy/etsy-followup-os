import type { Metrics } from './types';

// CTR / CVR are ratios the user should NOT have to compute by hand — Etsy shows
// the raw counts, so we derive the percentages from what they can copy directly.

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** CTR = clicks ÷ views × 100. Undefined unless both are present and views > 0. */
export function computeCtr(m: Metrics): number | undefined {
  if (m.views && m.views > 0 && m.clicks !== undefined && !isNaN(m.clicks)) {
    return round((m.clicks / m.views) * 100, 2);
  }
  return undefined;
}

/** CVR = orders ÷ visits × 100 (falls back to orders ÷ clicks when no visits). */
export function computeCvr(m: Metrics): number | undefined {
  const denom = m.visits && m.visits > 0 ? m.visits : m.clicks && m.clicks > 0 ? m.clicks : undefined;
  if (denom && m.orders !== undefined && !isNaN(m.orders)) {
    return round((m.orders / denom) * 100, 2);
  }
  return undefined;
}

/** ROAS = revenue ÷ ad spend. Only used as a suggestion when not entered directly. */
export function computeRoas(m: Metrics): number | undefined {
  if (m.adSpend && m.adSpend > 0 && m.revenue !== undefined && !isNaN(m.revenue)) {
    return round(m.revenue / m.adSpend, 2);
  }
  return undefined;
}

/** Fill in derived ctr/cvr from raw counts, keeping any explicit roas. */
export function withDerived(m: Metrics): Metrics {
  return {
    ...m,
    ctr: computeCtr(m) ?? m.ctr,
    cvr: computeCvr(m) ?? m.cvr,
  };
}
