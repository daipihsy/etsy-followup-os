'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { AdBadge, PriorityBadge, StatusBadge } from '@/components/badges';
import { BulkBar } from '@/components/BulkBar';
import { FiltersPanel } from '@/components/FiltersPanel';
import { ListingLink, QuickActions } from '@/components/QuickActions';
import { EmptyState, StatCard } from '@/components/ui';
import { useAppData } from '@/hooks/useData';
import type { DerivedListing } from '@/lib/derive';
import { agoLabel, formatDate, relativeLabel } from '@/lib/date';
import { EMPTY_FILTER, applyFilters, type FilterState } from '@/lib/filters';
import { ACTIVE_STATUSES } from '@/lib/types';
import { cx, fmtMoney, fmtNum, fmtPct, fmtRoas } from '@/lib/util';

type SortKey =
  | 'name'
  | 'shop'
  | 'age'
  | 'status'
  | 'priority'
  | 'ctr'
  | 'cvr'
  | 'roas'
  | 'orders'
  | 'revenue'
  | 'daysSinceAction'
  | 'nextReview';

interface Sort {
  key: SortKey;
  dir: 'asc' | 'desc';
}

function sortValue(d: DerivedListing, key: SortKey): number | string {
  const l = d.listing;
  const m = l.currentMetrics;
  switch (key) {
    case 'name':
      return l.listingName.toLowerCase();
    case 'shop':
      return (l.shopName ?? '').toLowerCase();
    case 'age':
      return d.age;
    case 'status':
      return l.status;
    case 'priority':
      return l.priority;
    case 'ctr':
      return m.ctr ?? -1;
    case 'cvr':
      return m.cvr ?? -1;
    case 'roas':
      return m.roas ?? -1;
    case 'orders':
      return m.orders ?? -1;
    case 'revenue':
      return m.revenue ?? -1;
    case 'daysSinceAction':
      return d.daysSinceLastAction ?? 99999;
    case 'nextReview':
      return d.nextReviewDate ?? '9999-12-31';
  }
}

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: 'name', label: 'Listing' },
  { key: 'shop', label: 'Shop' },
  { key: 'age', label: 'Age', num: true },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Prio', num: true },
  { key: 'ctr', label: 'CTR', num: true },
  { key: 'cvr', label: 'CVR', num: true },
  { key: 'roas', label: 'ROAS', num: true },
  { key: 'orders', label: 'Orders', num: true },
  { key: 'revenue', label: 'Revenue', num: true },
];

export default function DashboardPage() {
  const { derived, settings, savedFilters, loading } = useAppData();
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [sort, setSort] = useState<Sort>({ key: 'nextReview', dir: 'asc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shops = useMemo(
    () => Array.from(new Set(derived.map((d) => d.listing.shopName).filter(Boolean) as string[])).sort(),
    [derived],
  );
  const categories = useMemo(
    () => Array.from(new Set(derived.map((d) => d.listing.category).filter(Boolean) as string[])).sort(),
    [derived],
  );
  const tags = useMemo(
    () => Array.from(new Set(derived.flatMap((d) => d.listing.tags))).sort(),
    [derived],
  );

  const filtered = useMemo(() => applyFilters(derived, filter), [derived, filter]);

  const rows = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sort]);

  const pool = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of ACTIVE_STATUSES) counts[s] = 0;
    let overdue = 0;
    let reviewDue = 0;
    let noAction = 0;
    for (const d of derived) {
      if (d.listing.status !== 'Dropped') counts[d.listing.status] = (counts[d.listing.status] ?? 0) + 1;
      if (d.isOverdue) overdue++;
      if (d.isDueToday) reviewDue++;
      const days = d.daysSinceLastAction ?? d.age;
      if (d.listing.status !== 'Dropped' && days >= settings.untouchedWarningDays) noAction++;
    }
    const totalActive = derived.filter((d) => d.listing.status !== 'Dropped').length;
    return { counts, overdue, reviewDue, noAction, totalActive };
  }, [derived, settings.untouchedWarningDays]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'shop' ? 'asc' : 'desc' }));
  }
  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.listing.id));
  function toggleAll() {
    setSelected((s) => {
      if (allSelected) {
        const n = new Set(s);
        rows.forEach((r) => n.delete(r.listing.id));
        return n;
      }
      const n = new Set(s);
      rows.forEach((r) => n.add(r.listing.id));
      return n;
    });
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${pool.totalActive} active listings in your pool.`} />

      <div className="mb-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        <StatCard label="Active" value={pool.totalActive} tone="accent" />
        <StatCard label="New" value={pool.counts['New'] ?? 0} />
        <StatCard label="Observe" value={pool.counts['Observe'] ?? 0} tone="info" />
        <StatCard label="Testing" value={pool.counts['Testing'] ?? 0} tone="warning" />
        <StatCard label="Follow-up" value={pool.counts['Follow-up'] ?? 0} />
        <StatCard label="Growing" value={pool.counts['Growing'] ?? 0} tone="positive" />
        <StatCard label="Winner" value={pool.counts['Winner'] ?? 0} tone="positive" />
        <StatCard label="Review Due" value={pool.reviewDue} tone="warning" />
        <StatCard label="Overdue" value={pool.overdue} tone="danger" />
      </div>

      <FiltersPanel
        filter={filter}
        onChange={(f) => {
          setFilter(f);
          setSelected(new Set());
        }}
        shops={shops}
        categories={categories}
        tags={tags}
        savedFilters={savedFilters}
        settings={settings}
      />

      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          Showing {rows.length} of {derived.length} · No-action ≥ {settings.untouchedWarningDays}d: {pool.noAction}
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-10 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No listings match" description="Adjust your filters or add a listing." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1100px] tnum">
            <thead className="border-b border-border">
              <tr>
                <th className="th w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={cx('th cursor-pointer hover:text-fg', c.num && 'text-right')}
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th className="th">Ads</th>
                <th className="th cursor-pointer hover:text-fg" onClick={() => toggleSort('daysSinceAction')}>
                  Last Action{sort.key === 'daysSinceAction' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="th cursor-pointer hover:text-fg" onClick={() => toggleSort('nextReview')}>
                  Next Review{sort.key === 'nextReview' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const l = d.listing;
                const m = l.currentMetrics;
                const sel = selected.has(l.id);
                return (
                  <tr key={l.id} className={cx('border-b border-border/60 hover:bg-surface-2/50', sel && 'bg-accent/5')}>
                    <td className="td">
                      <input type="checkbox" checked={sel} onChange={() => toggleRow(l.id)} />
                    </td>
                    <td className="td max-w-[15rem]">
                      <ListingLink id={l.id} className="font-medium hover:text-accent line-clamp-1">
                        {l.listingName}
                      </ListingLink>
                      {l.tags.length > 0 && (
                        <div className="text-2xs text-muted line-clamp-1">{l.tags.join(' · ')}</div>
                      )}
                    </td>
                    <td className="td text-muted">{l.shopName || '—'}</td>
                    <td className="td text-right">{d.age}d</td>
                    <td className="td"><StatusBadge status={l.status} /></td>
                    <td className="td text-right"><PriorityBadge priority={l.priority} /></td>
                    <td className={cx('td text-right', d.hasGoodPerformance && 'text-positive font-medium')}>{fmtPct(m.ctr)}</td>
                    <td className="td text-right">{fmtPct(m.cvr)}</td>
                    <td className="td text-right">{fmtRoas(m.roas)}</td>
                    <td className="td text-right">{fmtNum(m.orders)}</td>
                    <td className="td text-right">{fmtMoney(m.revenue, settings.currency)}</td>
                    <td className="td"><AdBadge enabled={l.adEnabled} strategy={l.adStrategy} /></td>
                    <td className="td whitespace-nowrap">
                      {d.lastAction ? (
                        <span title={formatDate(d.lastAction.date)}>
                          {d.lastAction.type} · <span className="text-muted">{agoLabel(d.lastAction.date)}</span>
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="td whitespace-nowrap">
                      {d.nextReviewDate ? (
                        <span className={d.isOverdue ? 'text-danger' : d.isDueToday ? 'text-warning' : ''}>
                          {formatDate(d.nextReviewDate)} <span className="text-muted">· {relativeLabel(d.nextReviewDate)}</span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="td">
                      <QuickActions derived={d} showDetail />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BulkBar ids={Array.from(selected)} onClear={() => setSelected(new Set())} />
    </div>
  );
}
