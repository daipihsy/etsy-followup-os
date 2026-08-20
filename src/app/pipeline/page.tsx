'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { ListingLink } from '@/components/QuickActions';
import { useLang } from '@/components/lang';
import { useToast } from '@/components/ui';
import { useAppData } from '@/hooks/useData';
import { updateListing } from '@/lib/repo';
import { PIPELINE_STATUSES, type ListingStatus } from '@/lib/types';
import type { DerivedListing } from '@/lib/derive';
import { relativeLabel } from '@/lib/date';
import { cx, fmtPct, fmtRoas } from '@/lib/util';

const COLUMN_ACCENT: Partial<Record<ListingStatus, string>> = {
  Growing: 'border-t-positive',
  Scale: 'border-t-positive',
  Winner: 'border-t-positive',
  Testing: 'border-t-warning',
  Signal: 'border-t-info',
  Observe: 'border-t-info',
  'Follow-up': 'border-t-accent',
  Dropped: 'border-t-danger',
};

function Card({ d, onDragStart }: { d: DerivedListing; onDragStart: (id: string) => void }) {
  const l = d.listing;
  const m = l.currentMetrics;
  const { t } = useLang();
  return (
    <div
      draggable
      onDragStart={() => onDragStart(l.id)}
      className="card cursor-grab active:cursor-grabbing p-2.5 hover:border-accent/50"
    >
      <ListingLink id={l.id} className="text-sm font-medium leading-tight hover:text-accent line-clamp-2">
        {l.listingName}
      </ListingLink>
      <div className="mt-1.5 flex items-center justify-between text-2xs text-muted">
        <span>{d.age}d · {t(d.ageStage)}</span>
        {d.isOverdue && <span className="text-danger">{t('Overdue')}</span>}
        {d.isDueToday && <span className="text-warning">{t('Due today')}</span>}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1 text-2xs">
        <div><div className="text-muted">CTR</div><div className={cx('tnum font-medium', d.hasGoodPerformance && 'text-positive')}>{fmtPct(m.ctr)}</div></div>
        <div><div className="text-muted">CVR</div><div className="tnum font-medium">{fmtPct(m.cvr)}</div></div>
        <div><div className="text-muted">ROAS</div><div className="tnum font-medium">{fmtRoas(m.roas)}</div></div>
        <div><div className="text-muted">Ord</div><div className="tnum font-medium">{m.orders ?? '—'}</div></div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-2xs text-muted">
        <span className="truncate">{d.lastAction ? d.lastAction.type : t('No action')}</span>
        <span>{d.nextReviewDate ? relativeLabel(d.nextReviewDate) : ''}</span>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { derived } = useAppData();
  const toast = useToast();
  const { t } = useLang();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ListingStatus | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<ListingStatus, DerivedListing[]>();
    for (const s of PIPELINE_STATUSES) map.set(s, []);
    for (const d of derived) map.get(d.listing.status)?.push(d);
    // Highest attention first within each column.
    for (const s of PIPELINE_STATUSES) {
      map.get(s)?.sort((a, b) => b.attentionScore - a.attentionScore);
    }
    return map;
  }, [derived]);

  async function drop(status: ListingStatus) {
    setOverCol(null);
    if (!dragId) return;
    const d = derived.find((x) => x.listing.id === dragId);
    setDragId(null);
    if (!d || d.listing.status === status) return;
    await updateListing(d.listing.id, { status });
    toast(`${d.listing.listingName} → ${status}`, 'positive');
  }

  return (
    <div>
      <PageHeader title={t('Pipeline')} subtitle={t('Drag a listing between stages. Changes save immediately.')} />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((status) => {
          const items = byStatus.get(status) ?? [];
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(status);
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={() => drop(status)}
              className={cx(
                'w-64 shrink-0 rounded-lg border-t-2 bg-surface-2/40 p-2',
                COLUMN_ACCENT[status] ?? 'border-t-border',
                overCol === status && 'ring-1 ring-accent bg-accent/5',
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold">{t(status)}</span>
                <span className="text-2xs text-muted tnum">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[3rem]">
                {items.map((d) => (
                  <Card key={d.listing.id} d={d} onDragStart={setDragId} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
