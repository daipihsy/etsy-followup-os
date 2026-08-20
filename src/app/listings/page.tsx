'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { PageHeader } from '@/components/AppShell';
import { NewListingButton } from '@/components/forms';
import { ListingLink } from '@/components/QuickActions';
import { useLang } from '@/components/lang';
import { EmptyState } from '@/components/ui';
import { getDB } from '@/lib/db';
import { agoLabel } from '@/lib/date';
import type { Action, Listing } from '@/lib/types';

export default function ListingsPage() {
  const { t } = useLang();
  const listings = useLiveQuery(() => getDB().listings.toArray(), [], undefined as Listing[] | undefined);
  const actions = useLiveQuery(() => getDB().actions.toArray(), [], [] as Action[]);

  const stats = useMemo(() => {
    const count = new Map<string, number>();
    const last = new Map<string, string>();
    for (const a of actions ?? []) {
      count.set(a.listingId, (count.get(a.listingId) ?? 0) + 1);
      const cur = last.get(a.listingId);
      if (!cur || a.date > cur) last.set(a.listingId, a.date);
    }
    return { count, last };
  }, [actions]);

  const sorted = useMemo(() => {
    return [...(listings ?? [])].sort((a, b) => {
      const la = stats.last.get(a.id) ?? '';
      const lb = stats.last.get(b.id) ?? '';
      if (la !== lb) return la < lb ? 1 : -1;
      return (a.listingName || '').localeCompare(b.listingName || '');
    });
  }, [listings, stats]);

  const loading = listings === undefined;

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={t('My Listings')} actions={<NewListingButton />} />

      {loading ? (
        <div className="py-10 text-center text-sm text-muted">{t('Loading…')}</div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="▤"
          title={t('No listings yet')}
          description={t('Add a listing, then record what you change on it over time.')}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {sorted.map((l) => {
            const c = stats.count.get(l.id) ?? 0;
            const last = stats.last.get(l.id);
            return (
              <ListingLink key={l.id} id={l.id} className="card p-3 flex items-center gap-3 hover:border-accent/50">
                {l.imageUrl ? (
                  <img
                    src={l.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2 text-lg text-muted">
                    ▤
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold line-clamp-1">{l.listingName}</div>
                  <div className="text-2xs text-muted">
                    {c} {t('changes')}
                    {last ? ` · ${t('last')} ${agoLabel(last)}` : ` · ${t('no changes yet')}`}
                  </div>
                </div>
              </ListingLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
