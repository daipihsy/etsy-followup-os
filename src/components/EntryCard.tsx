'use client';

import { Badge } from './ui';
import { EntryActions, ListingLink } from './QuickActions';
import { useLang } from './lang';
import { agoLabel } from '@/lib/date';
import type { Action, Listing } from '@/lib/types';

export function EntryCard({
  action,
  listing,
  showListing = true,
}: {
  action: Action;
  listing?: Listing;
  showListing?: boolean;
}) {
  const { t } = useLang();
  const cats = action.types && action.types.length ? action.types : action.type ? [action.type] : [];
  return (
    <div className="card p-3">
      <div className="flex items-start gap-3">
        {showListing && listing?.imageUrl && (
          <ListingLink id={listing.id}>
            <img
              src={listing.imageUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-md border border-border object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          </ListingLink>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {showListing && (
              <ListingLink id={action.listingId} className="text-sm font-semibold hover:text-accent">
                {listing?.listingName ?? t('(deleted)')}
              </ListingLink>
            )}
            {cats.map((c) => (
              <Badge key={c} tone="accent">
                {c}
              </Badge>
            ))}
            <span className="ml-auto text-2xs text-muted">{agoLabel(action.date)}</span>
          </div>

          {action.reason && <p className="mt-1.5 text-sm text-fg/90 whitespace-pre-wrap">{action.reason}</p>}

          {action.linkUrl && (
            <a
              href={action.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-xs text-accent hover:underline break-all"
            >
              🔗 {action.linkName || action.linkUrl}
            </a>
          )}

          {action.imageUrl && (
            <img
              src={action.imageUrl}
              alt=""
              className="mt-2 max-h-40 rounded-md border border-border object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}

          <div className="mt-2">
            <EntryActions action={action} />
          </div>
        </div>
      </div>
    </div>
  );
}
