import Dexie, { type Table } from 'dexie';
import type {
  Action,
  Experiment,
  Listing,
  Review,
  SavedFilter,
  Settings,
  Snapshot,
} from './types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  positiveCtrThreshold: 2.5,
  positiveCvrThreshold: 3.0,
  positiveRoasThreshold: 2.5,
  untouchedWarningDays: 5,
  defaultReviewIntervalDays: 3,
  currency: 'USD',
  defaultShop: '',
  theme: 'dark',
  matrixCtrThreshold: 2.5,
  matrixCvrThreshold: 3.0,
  demoLoaded: false,
};

export class FollowupDB extends Dexie {
  listings!: Table<Listing, string>;
  actions!: Table<Action, string>;
  snapshots!: Table<Snapshot, string>;
  experiments!: Table<Experiment, string>;
  reviews!: Table<Review, string>;
  settings!: Table<Settings, string>;
  savedFilters!: Table<SavedFilter, string>;

  constructor() {
    super('etsy-followup-os');
    this.version(1).stores({
      listings: 'id, listingName, shopName, category, status, priority, nextReviewDate, updatedAt',
      actions: 'id, listingId, date, type, reviewDate',
      snapshots: 'id, listingId, date',
      experiments: 'id, listingId, status, startDate',
      reviews: 'id, listingId, date',
      settings: 'id',
      savedFilters: 'id, name',
    });
  }
}

// A single shared instance. Guarded so it is only constructed in the browser
// (IndexedDB is unavailable during static export / server render).
let _db: FollowupDB | null = null;

export function getDB(): FollowupDB {
  if (typeof window === 'undefined') {
    // Should never actually be used server-side; return a lazily-typed stub.
    throw new Error('IndexedDB is not available on the server.');
  }
  if (!_db) {
    _db = new FollowupDB();
  }
  return _db;
}

/** Ensure the settings row exists and return it (merged over defaults). */
export async function ensureSettings(): Promise<Settings> {
  const db = getDB();
  const existing = await db.settings.get('app');
  if (existing) {
    return { ...DEFAULT_SETTINGS, ...existing, id: 'app' };
  }
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
