'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { PageHeader } from '@/components/AppShell';
import { EntryCard } from '@/components/EntryCard';
import { DataCard } from '@/components/DataViews';
import { AddDataButton, AddEntryButton } from '@/components/forms';
import { useLang } from '@/components/lang';
import { EmptyState } from '@/components/ui';
import { getDB } from '@/lib/db';
import { formatDate, todayISO } from '@/lib/date';
import type { Action, Listing, Snapshot } from '@/lib/types';

type Item =
  | { kind: 'action'; date: string; createdAt: string; action: Action }
  | { kind: 'data'; date: string; createdAt: string; snapshot: Snapshot };

export default function JournalPage() {
  const { t, lang } = useLang();
  const actions = useLiveQuery(() => getDB().actions.toArray(), [], undefined as Action[] | undefined);
  const snapshots = useLiveQuery(() => getDB().snapshots.toArray(), [], [] as Snapshot[]);
  const listings = useLiveQuery(() => getDB().listings.toArray(), [], [] as Listing[]);

  const listingMap = useMemo(() => {
    const m = new Map<string, Listing>();
    for (const l of listings ?? []) m.set(l.id, l);
    return m;
  }, [listings]);

  const groups = useMemo(() => {
    const items: Item[] = [];
    for (const a of actions ?? []) items.push({ kind: 'action', date: a.date, createdAt: a.createdAt, action: a });
    for (const s of snapshots ?? []) items.push({ kind: 'data', date: s.date, createdAt: s.createdAt, snapshot: s });
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
    const byDay = new Map<string, Item[]>();
    for (const it of items) {
      const arr = byDay.get(it.date) ?? [];
      arr.push(it);
      byDay.set(it.date, arr);
    }
    return Array.from(byDay.entries());
  }, [actions, snapshots]);

  const todayCount = useMemo(() => {
    const d = todayISO();
    return (actions ?? []).filter((a) => a.date === d).length + (snapshots ?? []).filter((s) => s.date === d).length;
  }, [actions, snapshots]);

  const loading = actions === undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={t('Journal')}
        subtitle={t('What you changed and your numbers, day by day.')}
        actions={
          <>
            <AddEntryButton />
            <AddDataButton />
          </>
        }
      />

      {!loading && (
        <div className="mb-4 text-sm text-muted">
          {lang === 'zh' ? `今天已记录 ${todayCount} 条` : `${todayCount} recorded today`}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-muted">{t('Loading…')}</div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="📓"
          title={t('Nothing logged yet')}
          description={t('Tap “Record” to note a change, or “Data” to enter today’s numbers.')}
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{formatDate(day)}</h2>
                {day === todayISO() && <span className="text-2xs text-accent">{t('Today')}</span>}
                <span className="text-2xs text-muted">· {items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((it) =>
                  it.kind === 'action' ? (
                    <EntryCard key={it.action.id} action={it.action} listing={listingMap.get(it.action.listingId)} />
                  ) : (
                    <DataCard key={it.snapshot.id} snapshot={it.snapshot} listing={listingMap.get(it.snapshot.listingId)} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
