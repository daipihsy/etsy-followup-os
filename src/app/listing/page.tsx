'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { EntryCard } from '@/components/EntryCard';
import { ListingForm, RecordButton } from '@/components/forms';
import { ConfirmButton, EmptyState } from '@/components/ui';
import { useLang } from '@/components/lang';
import { getDB } from '@/lib/db';
import { deleteListing } from '@/lib/repo';
import type { Action } from '@/lib/types';

function DetailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const id = params.get('id');
  const [editing, setEditing] = useState(false);

  const listing = useLiveQuery(() => (id ? getDB().listings.get(id) : undefined), [id]);
  const actions = useLiveQuery(
    () => (id ? getDB().actions.where('listingId').equals(id).toArray() : []),
    [id],
    [] as Action[],
  );

  const sorted = [...(actions ?? [])].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt),
  );

  if (id && listing === null) {
    return <EmptyState title={t('Listing not found')} />;
  }
  if (!listing) {
    return <div className="py-10 text-center text-sm text-muted">{t('Loading…')}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-3">
        <button onClick={() => router.back()} className="text-xs text-muted hover:text-fg">
          ← {t('Back')}
        </button>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex items-start gap-3">
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">{listing.listingName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {listing.etsyUrl && (
                <a href={listing.etsyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {t('Open on Etsy ↗')}
                </a>
              )}
              <span>· {sorted.length} {t('changes')}</span>
            </div>
            {listing.notes && <p className="mt-2 text-sm text-muted">{listing.notes}</p>}
          </div>
          <button className="btn-outline btn-xs shrink-0" onClick={() => setEditing(true)}>
            {t('Edit')}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <RecordButton listingId={listing.id} />
          <ConfirmButton
            className="btn-ghost btn-xs text-danger ml-auto"
            title={t('Delete listing')}
            message={t('Delete this listing and all its entries? This cannot be undone.')}
            confirmLabel={t('Delete')}
            danger
            onConfirm={async () => {
              await deleteListing(listing.id);
              router.push('/listings');
            }}
          >
            {t('Delete listing')}
          </ConfirmButton>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-semibold">{t('Change history')}</h2>
      {sorted.length === 0 ? (
        <EmptyState icon="📓" title={t('No entries yet')} description={t('Tap “Record” to add the first one.')} />
      ) : (
        <div className="space-y-2">
          {sorted.map((a) => (
            <EntryCard key={a.id} action={a} showListing={false} />
          ))}
        </div>
      )}

      <ListingForm open={editing} onClose={() => setEditing(false)} listing={listing} />
    </div>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-muted">Loading…</div>}>
      <DetailInner />
    </Suspense>
  );
}
