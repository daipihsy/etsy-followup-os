'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getDB, DEFAULT_SETTINGS } from '@/lib/db';
import { enrichAll, buildQueue, todayStats, type DerivedListing } from '@/lib/derive';
import type {
  Action,
  Experiment,
  Listing,
  Review,
  SavedFilter,
  Settings,
  Snapshot,
} from '@/lib/types';

export interface AppData {
  loading: boolean;
  settings: Settings;
  listings: Listing[];
  actions: Action[];
  snapshots: Snapshot[];
  experiments: Experiment[];
  reviews: Review[];
  savedFilters: SavedFilter[];
  derived: DerivedListing[];
  byId: Map<string, DerivedListing>;
}

/** Live view of the whole database, enriched with derived fields. */
export function useAppData(): AppData {
  const listings = useLiveQuery(() => getDB().listings.toArray(), [], undefined as Listing[] | undefined);
  const actions = useLiveQuery(() => getDB().actions.toArray(), [], undefined as Action[] | undefined);
  const snapshots = useLiveQuery(() => getDB().snapshots.toArray(), [], undefined as Snapshot[] | undefined);
  const experiments = useLiveQuery(() => getDB().experiments.toArray(), [], undefined as Experiment[] | undefined);
  const reviews = useLiveQuery(() => getDB().reviews.toArray(), [], undefined as Review[] | undefined);
  const savedFilters = useLiveQuery(() => getDB().savedFilters.toArray(), [], undefined as SavedFilter[] | undefined);
  const settingsRow = useLiveQuery(() => getDB().settings.get('app'), [], undefined as Settings | undefined);

  const settings: Settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(settingsRow ?? {}), id: 'app' }),
    [settingsRow],
  );

  const loading =
    listings === undefined ||
    actions === undefined ||
    experiments === undefined;

  const derived = useMemo(
    () => enrichAll(listings ?? [], actions ?? [], experiments ?? [], settings),
    [listings, actions, experiments, settings],
  );

  const byId = useMemo(() => {
    const m = new Map<string, DerivedListing>();
    for (const d of derived) m.set(d.listing.id, d);
    return m;
  }, [derived]);

  return {
    loading,
    settings,
    listings: listings ?? [],
    actions: actions ?? [],
    snapshots: snapshots ?? [],
    experiments: experiments ?? [],
    reviews: reviews ?? [],
    savedFilters: savedFilters ?? [],
    derived,
    byId,
  };
}

export function useQueue(derived: DerivedListing[]): DerivedListing[] {
  return useMemo(() => buildQueue(derived), [derived]);
}

export function useTodayStats(derived: DerivedListing[]) {
  return useMemo(() => todayStats(derived), [derived]);
}

/** Live view of a single listing and its related records. */
export function useListingDetail(id: string | null) {
  const listing = useLiveQuery(() => (id ? getDB().listings.get(id) : undefined), [id]);
  const actions = useLiveQuery(
    () => (id ? getDB().actions.where('listingId').equals(id).toArray() : []),
    [id],
    [] as Action[],
  );
  const snapshots = useLiveQuery(
    () => (id ? getDB().snapshots.where('listingId').equals(id).toArray() : []),
    [id],
    [] as Snapshot[],
  );
  const experiments = useLiveQuery(
    () => (id ? getDB().experiments.where('listingId').equals(id).toArray() : []),
    [id],
    [] as Experiment[],
  );
  const reviews = useLiveQuery(
    () => (id ? getDB().reviews.where('listingId').equals(id).toArray() : []),
    [id],
    [] as Review[],
  );
  return { listing, actions: actions ?? [], snapshots: snapshots ?? [], experiments: experiments ?? [], reviews: reviews ?? [] };
}
