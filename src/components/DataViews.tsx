'use client';

import { Badge } from './ui';
import { EntryActions0, ListingLink } from './QuickActions';
import { useLang } from './lang';
import { deleteSnapshot } from '@/lib/repo';
import { agoLabel, formatDate } from '@/lib/date';
import { fmtNum, fmtPct } from '@/lib/util';
import type { Listing, Snapshot } from '@/lib/types';

function fmtRoas(v?: number) {
  return v === undefined || v === null || isNaN(v) ? '—' : v.toFixed(2);
}

interface Col {
  key: keyof Snapshot;
  en: string;
  zh: string;
  kind?: 'pct' | 'roas';
}

const COLS: Col[] = [
  { key: 'views', en: 'Views', zh: '曝光' },
  { key: 'clicks', en: 'Clicks', zh: '点击' },
  { key: 'ctr', en: 'CTR', zh: 'CTR', kind: 'pct' },
  { key: 'visits', en: 'Visits', zh: '访问' },
  { key: 'orders', en: 'Orders', zh: '订单' },
  { key: 'cvr', en: 'CVR', zh: 'CVR', kind: 'pct' },
  { key: 'revenue', en: 'Revenue', zh: '营收' },
  { key: 'adSpend', en: 'Spend', zh: '花费' },
  { key: 'roas', en: 'ROAS', zh: 'ROAS', kind: 'roas' },
];

function cellValue(s: Snapshot, c: Col): string {
  const v = s[c.key] as number | undefined;
  if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '—';
  if (c.kind === 'pct') return fmtPct(v);
  if (c.kind === 'roas') return fmtRoas(v);
  return fmtNum(v, 2);
}

/** One-line data summary card for the Journal feed. */
export function DataCard({
  snapshot,
  listing,
  showListing = true,
}: {
  snapshot: Snapshot;
  listing?: Listing;
  showListing?: boolean;
}) {
  const { t, lang } = useLang();
  const parts = COLS.filter((c) => {
    const v = snapshot[c.key] as number | undefined;
    return v !== undefined && v !== null && !(typeof v === 'number' && isNaN(v));
  }).map((c) => `${lang === 'zh' ? c.zh : c.en} ${cellValue(snapshot, c)}`);

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
              <ListingLink id={snapshot.listingId} className="text-sm font-semibold hover:text-accent">
                {listing?.listingName ?? t('(deleted)')}
              </ListingLink>
            )}
            <Badge tone="info">{t('Data')}</Badge>
            <span className="ml-auto text-2xs text-muted">{agoLabel(snapshot.date)}</span>
          </div>
          <p className="mt-1.5 text-sm tnum text-fg/90">{parts.length ? parts.join(' · ') : t('(no numbers)')}</p>
          {snapshot.notes && <p className="mt-1 text-xs text-muted">{snapshot.notes}</p>}
          <div className="mt-2">
            <EntryActions0 onDelete={() => deleteSnapshot(snapshot.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A day-by-day table of the numbers, for the listing detail page. */
export function DataTable({ snapshots }: { snapshots: Snapshot[] }) {
  const { t, lang } = useLang();
  const rows = [...snapshots].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt),
  );
  if (rows.length === 0) return null;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] tnum text-sm">
        <thead className="border-b border-border">
          <tr>
            <th className="th">{t('Date')}</th>
            {COLS.map((c) => (
              <th key={c.key as string} className="th text-right">
                {lang === 'zh' ? c.zh : c.en}
              </th>
            ))}
            <th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border/60">
              <td className="td whitespace-nowrap">{formatDate(s.date)}</td>
              {COLS.map((c) => (
                <td key={c.key as string} className="td text-right">
                  {cellValue(s, c)}
                </td>
              ))}
              <td className="td text-right">
                <button className="text-2xs text-muted hover:text-danger" onClick={() => deleteSnapshot(s.id)}>
                  {t('Delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
