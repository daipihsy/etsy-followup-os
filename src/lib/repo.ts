import { getDB, ensureSettings, DEFAULT_SETTINGS } from './db';
import { addDays, nowISO, todayISO } from './date';
import { uid } from './util';
import type {
  Action,
  ActionType,
  AdStrategy,
  BackupData,
  Experiment,
  ExperimentStatus,
  Listing,
  ListingStatus,
  Metrics,
  Priority,
  Review,
  ReviewDecision,
  SavedFilter,
  Settings,
  Snapshot,
} from './types';

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export type NewListingInput = Partial<Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>> & {
  listingName: string;
};

export async function createListing(input: NewListingInput): Promise<Listing> {
  const db = getDB();
  const now = nowISO();
  const listing: Listing = {
    id: uid('lst'),
    listingName: input.listingName,
    etsyUrl: input.etsyUrl,
    imageUrl: input.imageUrl,
    etsyListingId: input.etsyListingId,
    shopName: input.shopName,
    category: input.category,
    publishDate: input.publishDate || todayISO(),
    currentPrice: input.currentPrice,
    discount: input.discount,
    adEnabled: input.adEnabled ?? false,
    adStrategy: input.adStrategy,
    status: input.status ?? 'New',
    priority: (input.priority ?? 3) as Priority,
    tags: input.tags ?? [],
    notes: input.notes,
    currentMetrics: input.currentMetrics ?? {},
    nextReviewDate: input.nextReviewDate,
    createdAt: now,
    updatedAt: now,
  };
  await db.listings.put(listing);
  return listing;
}

export async function updateListing(id: string, patch: Partial<Listing>): Promise<void> {
  const db = getDB();
  await db.listings.update(id, { ...patch, updatedAt: nowISO() });
}

export async function deleteListing(id: string): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.listings, db.actions, db.snapshots, db.experiments, db.reviews, async () => {
    await db.listings.delete(id);
    await db.actions.where('listingId').equals(id).delete();
    await db.snapshots.where('listingId').equals(id).delete();
    await db.experiments.where('listingId').equals(id).delete();
    await db.reviews.where('listingId').equals(id).delete();
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface NewActionInput {
  listingId: string;
  date?: string;
  types: ActionType[]; // what was adjusted (multi-select)
  linkUrl?: string;
  linkName?: string;
  imageUrl?: string;
  reason?: string; // note
}

export async function addAction(input: NewActionInput): Promise<Action> {
  const db = getDB();
  const date = input.date || todayISO();
  const types = input.types.length ? input.types : ['备注/其他'];
  const action: Action = {
    id: uid('act'),
    listingId: input.listingId,
    date,
    type: types[0],
    types,
    linkUrl: input.linkUrl?.trim() || undefined,
    linkName: input.linkName?.trim() || undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    reason: input.reason,
    createdAt: nowISO(),
  };
  await db.actions.put(action);
  await db.listings.update(input.listingId, { updatedAt: nowISO() });
  return action;
}

export interface EditActionInput {
  date?: string;
  types?: ActionType[];
  linkUrl?: string;
  linkName?: string;
  imageUrl?: string;
  reason?: string;
}

export async function updateAction(id: string, patch: EditActionInput): Promise<void> {
  const next: Partial<Action> = {};
  if (patch.date) next.date = patch.date;
  if (patch.types) {
    next.types = patch.types.length ? patch.types : ['备注/其他'];
    next.type = next.types[0];
  }
  if ('linkUrl' in patch) next.linkUrl = patch.linkUrl?.trim() || undefined;
  if ('linkName' in patch) next.linkName = patch.linkName?.trim() || undefined;
  if ('imageUrl' in patch) next.imageUrl = patch.imageUrl?.trim() || undefined;
  if ('reason' in patch) next.reason = patch.reason;
  await getDB().actions.update(id, next);
}

export async function deleteAction(id: string): Promise<void> {
  await getDB().actions.delete(id);
}

/** How many records (actions + snapshots + reviews) were logged today. */
export async function countTodayRecords(): Promise<number> {
  const db = getDB();
  const t = todayISO();
  const [a, s, r] = await Promise.all([
    db.actions.where('date').equals(t).count(),
    db.snapshots.where('date').equals(t).count(),
    db.reviews.where('date').equals(t).count(),
  ]);
  return a + s + r;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface NewSnapshotInput extends Metrics {
  listingId: string;
  date?: string;
  notes?: string;
}

export async function addSnapshot(input: NewSnapshotInput): Promise<Snapshot> {
  const db = getDB();
  const date = input.date || todayISO();
  const snap: Snapshot = {
    id: uid('snp'),
    listingId: input.listingId,
    date,
    views: input.views,
    clicks: input.clicks,
    visits: input.visits,
    ctr: input.ctr,
    cvr: input.cvr,
    orders: input.orders,
    revenue: input.revenue,
    adSpend: input.adSpend,
    roas: input.roas,
    favorites: input.favorites,
    notes: input.notes,
    createdAt: nowISO(),
  };
  await db.snapshots.put(snap);

  // Latest snapshot becomes the listing's current metrics. "Latest" = by date,
  // then by creation time, so we recompute rather than blindly overwriting.
  const all = await db.snapshots.where('listingId').equals(input.listingId).toArray();
  const latest = all.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt),
  )[0];
  if (latest) {
    const metrics: Metrics = {
      views: latest.views,
      clicks: latest.clicks,
      visits: latest.visits,
      ctr: latest.ctr,
      cvr: latest.cvr,
      orders: latest.orders,
      revenue: latest.revenue,
      adSpend: latest.adSpend,
      roas: latest.roas,
      favorites: latest.favorites,
    };
    await db.listings.update(input.listingId, { currentMetrics: metrics, updatedAt: nowISO() });
  }
  return snap;
}

export async function deleteSnapshot(id: string): Promise<void> {
  await getDB().snapshots.delete(id);
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface NewReviewInput {
  listingId: string;
  decision: ReviewDecision;
  note?: string;
  nextReviewInDays?: number | null; // null => no next review
  date?: string;
}

const DECISION_STATUS: Partial<Record<ReviewDecision, ListingStatus>> = {
  Scale: 'Scale',
  Hold: 'Hold',
  Drop: 'Dropped',
};

export async function completeReview(input: NewReviewInput): Promise<Review> {
  const db = getDB();
  const date = input.date || todayISO();
  const nextReviewDate =
    input.nextReviewInDays && input.nextReviewInDays > 0 ? addDays(date, input.nextReviewInDays) : undefined;
  const review: Review = {
    id: uid('rev'),
    listingId: input.listingId,
    date,
    decision: input.decision,
    note: input.note,
    nextReviewDate,
    createdAt: nowISO(),
  };
  await db.reviews.put(review);

  const patch: Partial<Listing> = {
    // A completed review always resets the schedule (undefined clears it).
    nextReviewDate: nextReviewDate,
    updatedAt: nowISO(),
  };
  const mappedStatus = DECISION_STATUS[input.decision];
  if (mappedStatus) patch.status = mappedStatus;
  await db.listings.update(input.listingId, patch);
  return review;
}

/** Snooze the next review by N days from today. */
export async function snoozeReview(listingId: string, days: number): Promise<void> {
  await getDB().listings.update(listingId, {
    nextReviewDate: addDays(todayISO(), days),
    updatedAt: nowISO(),
  });
}

export async function setReviewDate(listingId: string, isoDate: string | undefined): Promise<void> {
  await getDB().listings.update(listingId, { nextReviewDate: isoDate, updatedAt: nowISO() });
}

// ---------------------------------------------------------------------------
// Experiments
// ---------------------------------------------------------------------------

export interface NewExperimentInput {
  listingId: string;
  name: string;
  hypothesis?: string;
  variable: string;
  beforeValue?: string;
  afterValue?: string;
  startDate?: string;
  reviewInDays?: number | null;
  status?: ExperimentStatus;
  beforeSnapshot?: Metrics;
}

export async function createExperiment(input: NewExperimentInput): Promise<Experiment> {
  const db = getDB();
  const now = nowISO();
  const startDate = input.startDate || todayISO();
  const reviewDate =
    input.reviewInDays && input.reviewInDays > 0 ? addDays(startDate, input.reviewInDays) : undefined;
  const exp: Experiment = {
    id: uid('exp'),
    listingId: input.listingId,
    name: input.name,
    hypothesis: input.hypothesis,
    variable: input.variable,
    beforeValue: input.beforeValue,
    afterValue: input.afterValue,
    startDate,
    reviewDate,
    status: input.status ?? 'Running',
    beforeSnapshot: input.beforeSnapshot,
    createdAt: now,
    updatedAt: now,
  };
  await db.experiments.put(exp);
  // Starting an experiment moves the listing into Testing and schedules a review.
  const patch: Partial<Listing> = { status: 'Testing', updatedAt: now };
  if (reviewDate) patch.nextReviewDate = reviewDate;
  await db.listings.update(input.listingId, patch);
  return exp;
}

export async function updateExperiment(id: string, patch: Partial<Experiment>): Promise<void> {
  await getDB().experiments.update(id, { ...patch, updatedAt: nowISO() });
}

export async function concludeExperiment(
  id: string,
  outcome: ExperimentStatus,
  fields: { afterSnapshot?: Metrics; conclusion?: string; decision?: string },
): Promise<void> {
  await getDB().experiments.update(id, {
    status: outcome,
    afterSnapshot: fields.afterSnapshot,
    conclusion: fields.conclusion,
    decision: fields.decision,
    updatedAt: nowISO(),
  });
}

export async function deleteExperiment(id: string): Promise<void> {
  await getDB().experiments.delete(id);
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export interface BulkPatch {
  status?: ListingStatus;
  priority?: Priority;
  addTag?: string;
  reviewDate?: string; // absolute
  reviewInDays?: number; // relative to today
  adEnabled?: boolean;
  adStrategy?: AdStrategy;
}

export async function bulkUpdate(ids: string[], patch: BulkPatch): Promise<void> {
  const db = getDB();
  await db.transaction('rw', db.listings, async () => {
    for (const id of ids) {
      const listing = await db.listings.get(id);
      if (!listing) continue;
      const next: Partial<Listing> = { updatedAt: nowISO() };
      if (patch.status) next.status = patch.status;
      if (patch.priority) next.priority = patch.priority;
      if (patch.adEnabled !== undefined) next.adEnabled = patch.adEnabled;
      if (patch.adStrategy) next.adStrategy = patch.adStrategy;
      if (patch.reviewDate) next.nextReviewDate = patch.reviewDate;
      if (patch.reviewInDays !== undefined) next.nextReviewDate = addDays(todayISO(), patch.reviewInDays);
      if (patch.addTag) {
        const tag = patch.addTag.trim();
        if (tag && !listing.tags.includes(tag)) next.tags = [...listing.tags, tag];
      }
      await db.listings.update(id, next);
    }
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = getDB();
  const current = await ensureSettings();
  const next = { ...current, ...patch, id: 'app' as const };
  await db.settings.put(next);
  return next;
}

// ---------------------------------------------------------------------------
// Saved filters
// ---------------------------------------------------------------------------

export async function saveFilter(name: string, filter: unknown): Promise<SavedFilter> {
  const db = getDB();
  const f: SavedFilter = { id: uid('flt'), name, filter, createdAt: nowISO() };
  await db.savedFilters.put(f);
  return f;
}

export async function deleteSavedFilter(id: string): Promise<void> {
  await getDB().savedFilters.delete(id);
}

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------

export const BACKUP_VERSION = 1;

export async function exportBackup(): Promise<BackupData> {
  const db = getDB();
  const [listings, actions, snapshots, experiments, reviews, savedFilters, settings] = await Promise.all([
    db.listings.toArray(),
    db.actions.toArray(),
    db.snapshots.toArray(),
    db.experiments.toArray(),
    db.reviews.toArray(),
    db.savedFilters.toArray(),
    db.settings.get('app'),
  ]);
  return {
    meta: { app: 'etsy-followup-os', version: BACKUP_VERSION, exportedAt: nowISO() },
    listings,
    actions,
    snapshots,
    experiments,
    reviews,
    savedFilters,
    settings: settings ?? null,
  };
}

export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<BackupData>;
  return (
    Array.isArray(d.listings) &&
    Array.isArray(d.actions) &&
    Array.isArray(d.snapshots) &&
    Array.isArray(d.experiments) &&
    Array.isArray(d.reviews)
  );
}

export type ImportMode = 'merge' | 'replace';

export async function importBackup(data: BackupData, mode: ImportMode): Promise<void> {
  const db = getDB();
  await db.transaction(
    'rw',
    [db.listings, db.actions, db.snapshots, db.experiments, db.reviews, db.savedFilters, db.settings],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.listings.clear(),
          db.actions.clear(),
          db.snapshots.clear(),
          db.experiments.clear(),
          db.reviews.clear(),
          db.savedFilters.clear(),
        ]);
      }
      await db.listings.bulkPut(data.listings);
      await db.actions.bulkPut(data.actions);
      await db.snapshots.bulkPut(data.snapshots);
      await db.experiments.bulkPut(data.experiments);
      await db.reviews.bulkPut(data.reviews);
      if (Array.isArray(data.savedFilters)) await db.savedFilters.bulkPut(data.savedFilters);
      if (data.settings) {
        await db.settings.put({ ...DEFAULT_SETTINGS, ...data.settings, id: 'app' });
      }
    },
  );
}

/** Wipe every table (used by "Reset all data"). */
export async function wipeAll(): Promise<void> {
  const db = getDB();
  await db.transaction(
    'rw',
    [db.listings, db.actions, db.snapshots, db.experiments, db.reviews, db.savedFilters, db.settings],
    async () => {
      await Promise.all([
        db.listings.clear(),
        db.actions.clear(),
        db.snapshots.clear(),
        db.experiments.clear(),
        db.reviews.clear(),
        db.savedFilters.clear(),
      ]);
      await db.settings.put(DEFAULT_SETTINGS);
    },
  );
}
