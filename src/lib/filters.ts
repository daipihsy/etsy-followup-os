import type { AgeStage } from './date';
import type { DerivedListing } from './derive';
import type { AdStrategy, ListingStatus, Priority } from './types';

export interface FilterState {
  search: string;
  shops: string[];
  categories: string[];
  statuses: ListingStatus[];
  priorities: Priority[];
  ad: 'any' | 'on' | 'off';
  adStrategies: AdStrategy[];
  ageStages: AgeStage[];
  ageMin: number | null;
  ageMax: number | null;
  publishFrom: string | null;
  publishTo: string | null;
  ctrMin: number | null;
  ctrMax: number | null;
  cvrMin: number | null;
  cvrMax: number | null;
  roasMin: number | null;
  roasMax: number | null;
  ordersMin: number | null;
  ordersMax: number | null;
  revenueMin: number | null;
  revenueMax: number | null;
  lastActionFrom: string | null;
  lastActionTo: string | null;
  nextReviewFrom: string | null;
  nextReviewTo: string | null;
  noActionDays: number | null; // days since last action >=
  tags: string[];
}

export const EMPTY_FILTER: FilterState = {
  search: '',
  shops: [],
  categories: [],
  statuses: [],
  priorities: [],
  ad: 'any',
  adStrategies: [],
  ageStages: [],
  ageMin: null,
  ageMax: null,
  publishFrom: null,
  publishTo: null,
  ctrMin: null,
  ctrMax: null,
  cvrMin: null,
  cvrMax: null,
  roasMin: null,
  roasMax: null,
  ordersMin: null,
  ordersMax: null,
  revenueMin: null,
  revenueMax: null,
  lastActionFrom: null,
  lastActionTo: null,
  nextReviewFrom: null,
  nextReviewTo: null,
  noActionDays: null,
  tags: [],
};

function inRange(v: number | undefined, min: number | null, max: number | null): boolean {
  if (min !== null) {
    if (v === undefined || v < min) return false;
  }
  if (max !== null) {
    if (v === undefined || v > max) return false;
  }
  return true;
}

function dateInRange(v: string | undefined | null, from: string | null, to: string | null): boolean {
  if (from !== null) {
    if (!v || v.slice(0, 10) < from) return false;
  }
  if (to !== null) {
    if (!v || v.slice(0, 10) > to) return false;
  }
  return true;
}

export function applyFilters(items: DerivedListing[], f: FilterState): DerivedListing[] {
  const search = f.search.trim().toLowerCase();
  return items.filter((d) => {
    const l = d.listing;
    const m = l.currentMetrics;

    if (search) {
      const hay = `${l.listingName} ${l.shopName ?? ''} ${l.category ?? ''} ${l.tags.join(' ')} ${
        l.etsyListingId ?? ''
      }`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (f.shops.length && !(l.shopName && f.shops.includes(l.shopName))) return false;
    if (f.categories.length && !(l.category && f.categories.includes(l.category))) return false;
    if (f.statuses.length && !f.statuses.includes(l.status)) return false;
    if (f.priorities.length && !f.priorities.includes(l.priority)) return false;
    if (f.ad === 'on' && !l.adEnabled) return false;
    if (f.ad === 'off' && l.adEnabled) return false;
    if (f.adStrategies.length && !(l.adStrategy && f.adStrategies.includes(l.adStrategy))) return false;
    if (f.ageStages.length && !f.ageStages.includes(d.ageStage)) return false;
    if (!inRange(d.age, f.ageMin, f.ageMax)) return false;
    if (!dateInRange(l.publishDate, f.publishFrom, f.publishTo)) return false;
    if (!inRange(m.ctr, f.ctrMin, f.ctrMax)) return false;
    if (!inRange(m.cvr, f.cvrMin, f.cvrMax)) return false;
    if (!inRange(m.roas, f.roasMin, f.roasMax)) return false;
    if (!inRange(m.orders, f.ordersMin, f.ordersMax)) return false;
    if (!inRange(m.revenue, f.revenueMin, f.revenueMax)) return false;
    if (!dateInRange(d.lastAction?.date, f.lastActionFrom, f.lastActionTo)) return false;
    if (!dateInRange(d.nextReviewDate, f.nextReviewFrom, f.nextReviewTo)) return false;
    if (f.noActionDays !== null) {
      const days = d.daysSinceLastAction ?? d.age;
      if (days < f.noActionDays) return false;
    }
    if (f.tags.length && !f.tags.every((t) => l.tags.includes(t))) return false;
    return true;
  });
}

export function isFilterActive(f: FilterState): boolean {
  return JSON.stringify(f) !== JSON.stringify(EMPTY_FILTER);
}

export function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.shops.length) n++;
  if (f.categories.length) n++;
  if (f.statuses.length) n++;
  if (f.priorities.length) n++;
  if (f.ad !== 'any') n++;
  if (f.adStrategies.length) n++;
  if (f.ageStages.length) n++;
  if (f.ageMin !== null || f.ageMax !== null) n++;
  if (f.publishFrom || f.publishTo) n++;
  if (f.ctrMin !== null || f.ctrMax !== null) n++;
  if (f.cvrMin !== null || f.cvrMax !== null) n++;
  if (f.roasMin !== null || f.roasMax !== null) n++;
  if (f.ordersMin !== null || f.ordersMax !== null) n++;
  if (f.revenueMin !== null || f.revenueMax !== null) n++;
  if (f.lastActionFrom || f.lastActionTo) n++;
  if (f.nextReviewFrom || f.nextReviewTo) n++;
  if (f.noActionDays !== null) n++;
  if (f.tags.length) n++;
  return n;
}

// Built-in preset filters described in the spec.
export interface Preset {
  name: string;
  build: (opts: { ctr: number; cvr: number; roas: number; noAction: number }) => FilterState;
}

export const PRESETS: Preset[] = [
  {
    name: 'High CTR New Listings',
    build: ({ ctr }) => ({ ...EMPTY_FILTER, ctrMin: ctr, ageMax: 14 }),
  },
  {
    name: 'High CTR Low CVR',
    build: ({ ctr, cvr }) => ({ ...EMPTY_FILTER, ctrMin: ctr, cvrMax: cvr }),
  },
  {
    name: 'Untouched Winners',
    build: ({ ctr, roas, noAction }) => ({
      ...EMPTY_FILTER,
      ctrMin: ctr,
      roasMin: roas,
      noActionDays: noAction,
    }),
  },
];
