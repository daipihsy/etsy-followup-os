'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { PageHeader } from '@/components/AppShell';
import { EntryCard } from '@/components/EntryCard';
import { useLang } from '@/components/lang';
import { EmptyState } from '@/components/ui';
import { getDB } from '@/lib/db';
import { formatDate, todayISO } from '@/lib/date';
import type { Action, Listing } from '@/lib/types';

export default function JournalPage() {
  const { t, lang } = useLang();
  const actions = useLiveQuery(() => getDB().actions.toArray(), [], undefined as Action[] | undefined);
  const listings = useLiveQuery(() => getDB().listings.toArray(), [], [] as Listing[]);

  const listingMap = useMemo(() => {
    const m = new Map<string, Listing>();
    for (const l of listings ?? []) m.set(l.id, l);
    return m;
  }, [listings]);

  const groups = useMemo(() => {
    const sorted = [...(actions ?? [])].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt),
    );
    const byDay = new Map<string, Action[]>();
    for (const a of sorted) {
      const arr = byDay.get(a.date) ?? [];
      arr.push(a);
      byDay.set(a.date, arr);
    }
    return Array.from(byDay.entries());
  }, [actions]);

  const todayCount = useMemo(() => (actions ?? []).filter((a) => a.date === todayISO()).length, [actions]);

  const loading = actions === undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={t('Journal')} subtitle={t('What you changed, day by day.')} />

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
          description={t('Tap “Record” to note what you changed on a listing today.')}
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
                {items.map((a) => (
                  <EntryCard key={a.id} action={a} listing={listingMap.get(a.listingId)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
