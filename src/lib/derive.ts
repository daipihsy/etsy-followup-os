import type { Action, Experiment, Listing, Metrics, Settings } from './types';
import {
  type AgeStage,
  ageStage,
  daysSince,
  daysUntil,
  listingAgeDays,
} from './date';

export interface DerivedListing {
  listing: Listing;
  age: number;
  ageStage: AgeStage;
  lastAction: Action | null;
  daysSinceLastAction: number | null;
  nextReviewDate: string | null;
  reviewDaysUntil: number | null; // negative = overdue
  isOverdue: boolean;
  isDueToday: boolean;
  hasReview: boolean;
  runningExperiment: Experiment | null;
  isUntouchedWinner: boolean;
  hasGoodPerformance: boolean;
  attentionScore: number;
  inQueue: boolean;
  reasons: string[];
  primaryReason: string;
}

function metricNum(v: number | undefined): number | undefined {
  return typeof v === 'number' && !isNaN(v) ? v : undefined;
}

/** Does this listing meet the "good performance" bar from settings? */
export function hasGoodPerformance(m: Metrics, s: Settings): boolean {
  const ctr = metricNum(m.ctr);
  const roas = metricNum(m.roas);
  const cvr = metricNum(m.cvr);
  const orders = metricNum(m.orders);
  const ctrOk = ctr !== undefined && ctr >= s.positiveCtrThreshold;
  const roasOk = roas !== undefined && roas >= s.positiveRoasThreshold;
  const cvrOk = cvr !== undefined && cvr >= s.positiveCvrThreshold;
  const hasOrders = orders !== undefined && orders > 0;
  // Strong CTR is the entry condition; then any positive downstream signal.
  return ctrOk && (roasOk || cvrOk || hasOrders);
}

export function enrichListing(
  listing: Listing,
  actions: Action[],
  experiments: Experiment[],
  settings: Settings,
): DerivedListing {
  const age = listingAgeDays(listing);
  const stage = ageStage(age);

  const myActions = actions
    .filter((a) => a.listingId === listing.id)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
  const lastAction = myActions[0] ?? null;
  const daysSinceLastAction = lastAction ? daysSince(lastAction.date) : null;

  const runningExperiment =
    experiments.find((e) => e.listingId === listing.id && (e.status === 'Running' || e.status === 'Planned')) ??
    null;

  const nextReviewDate = listing.nextReviewDate ?? null;
  const reviewDaysUntil = nextReviewDate ? daysUntil(nextReviewDate) : null;
  const isOverdue = reviewDaysUntil !== null && reviewDaysUntil < 0;
  const isDueToday = reviewDaysUntil === 0;
  const hasReview = nextReviewDate !== null;

  const m = listing.currentMetrics;
  const good = hasGoodPerformance(m, settings);

  const noActionDays = daysSinceLastAction === null ? age : daysSinceLastAction;
  const isUntouchedWinner =
    listing.status !== 'Dropped' &&
    listing.status !== 'Hold' &&
    good &&
    noActionDays >= settings.untouchedWarningDays;

  // ---- Attention scoring (mirrors the queue priority list in the spec) ----
  const reasons: string[] = [];
  let score = 0;

  if (isOverdue) {
    score += 10_000 + Math.abs(reviewDaysUntil!) * 20;
    reasons.push(
      `Review is ${Math.abs(reviewDaysUntil!)} day${Math.abs(reviewDaysUntil!) === 1 ? '' : 's'} overdue.`,
    );
  } else if (isDueToday) {
    score += 8_000;
    reasons.push('Review is due today.');
  }

  if (listing.status === 'Growing') {
    score += 2_000;
    reasons.push('Growing — momentum is building, keep it moving.');
  } else if (listing.status === 'Testing') {
    score += 1_500;
    reasons.push('Testing — an experiment is in progress.');
  } else if (listing.status === 'Signal') {
    score += 1_000;
    reasons.push('Early signal detected — decide the next move.');
  } else if (listing.status === 'Scale') {
    score += 900;
    reasons.push('Scaling — watch spend and ROAS closely.');
  }

  const ctr = metricNum(m.ctr);
  const cvr = metricNum(m.cvr);
  const roas = metricNum(m.roas);
  const orders = metricNum(m.orders);

  if (ctr !== undefined && ctr >= settings.positiveCtrThreshold && orders !== undefined && orders > 0) {
    score += 800;
  }
  if (roas !== undefined && roas >= settings.positiveRoasThreshold) {
    score += 600;
  }
  if (orders !== undefined && orders > 0) {
    score += 200;
  }

  if (
    ctr !== undefined &&
    ctr >= settings.positiveCtrThreshold &&
    cvr !== undefined &&
    cvr < settings.positiveCvrThreshold
  ) {
    score += 500;
    reasons.push(`CTR ${ctr.toFixed(1)}% is strong but CVR ${cvr.toFixed(1)}% is low.`);
  }

  if (isUntouchedWinner) {
    score += 900;
    reasons.push(`Strong performance but no action in ${noActionDays} days.`);
  }

  // Manual priority as a persistent nudge / tiebreaker.
  score += listing.priority * 100;
  if (listing.priority >= 5) {
    reasons.push('Flagged high priority.');
  }

  const inQueue =
    listing.status !== 'Dropped' &&
    (isOverdue ||
      isDueToday ||
      isUntouchedWinner ||
      listing.status === 'Growing' ||
      listing.status === 'Testing' ||
      listing.status === 'Signal' ||
      listing.status === 'Scale' ||
      listing.priority >= 5);

  const primaryReason =
    reasons[0] ??
    (good ? 'Performing well — worth a periodic check.' : 'On the follow-up list.');

  return {
    listing,
    age,
    ageStage: stage,
    lastAction,
    daysSinceLastAction,
    nextReviewDate,
    reviewDaysUntil,
    isOverdue,
    isDueToday,
    hasReview,
    runningExperiment,
    isUntouchedWinner,
    hasGoodPerformance: good,
    attentionScore: score,
    inQueue,
    reasons,
    primaryReason,
  };
}

export function enrichAll(
  listings: Listing[],
  actions: Action[],
  experiments: Experiment[],
  settings: Settings,
): DerivedListing[] {
  return listings.map((l) => enrichListing(l, actions, experiments, settings));
}

/** The Today follow-up queue: things needing attention, highest score first. */
export function buildQueue(derived: DerivedListing[]): DerivedListing[] {
  return derived
    .filter((d) => d.inQueue)
    .sort((a, b) => b.attentionScore - a.attentionScore || (a.listing.listingName || '').localeCompare(b.listing.listingName || ''));
}

export interface TodayStats {
  needAction: number;
  reviewDueToday: number;
  overdue: number;
  growing: number;
  testing: number;
  untouchedWinners: number;
}

export function todayStats(derived: DerivedListing[]): TodayStats {
  return {
    needAction: derived.filter((d) => d.inQueue).length,
    reviewDueToday: derived.filter((d) => d.isDueToday).length,
    overdue: derived.filter((d) => d.isOverdue).length,
    growing: derived.filter((d) => d.listing.status === 'Growing').length,
    testing: derived.filter((d) => d.listing.status === 'Testing').length,
    untouchedWinners: derived.filter((d) => d.isUntouchedWinner).length,
  };
}
