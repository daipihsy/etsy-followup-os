'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { AdBadge, AgeBadge, PriorityBadge, StatusBadge } from '@/components/badges';
import { QuickActions, ListingLink } from '@/components/QuickActions';
import { EmptyState, Metric, StatCard } from '@/components/ui';
import { useAppData, useQueue, useTodayStats } from '@/hooks/useData';
import type { DerivedListing } from '@/lib/derive';
import { agoLabel, formatAge, formatDate, relativeLabel } from '@/lib/date';
import { fmtMoney, fmtNum, fmtPct, fmtRoas } from '@/lib/util';

type FocusKey = 'all' | 'overdue' | 'due' | 'growing' | 'testing' | 'untouched';

function FollowupCard({ d, currency }: { d: DerivedListing; currency: string }) {
  const l = d.listing;
  const m = l.currentMetrics;
  const ctrTone = d.hasGoodPerformance ? 'positive' : undefined;
  const reviewTone = d.isOverdue ? 'danger' : d.isDueToday ? 'warning' : undefined;
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <ListingLink id={l.id} className="text-base font-semibold hover:text-accent">
            {l.listingName}
          </ListingLink>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span>{l.shopName || '—'}</span>
            <span>·</span>
            <span>{l.category || 'Uncategorized'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={l.status} />
          <PriorityBadge priority={l.priority} />
          <AgeBadge stage={d.ageStage} days={d.age} />
          <AdBadge enabled={l.adEnabled} strategy={l.adStrategy} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-3">
        <Metric label="CTR" value={fmtPct(m.ctr)} tone={ctrTone} />
        <Metric label="CVR" value={fmtPct(m.cvr)} />
        <Metric label="ROAS" value={fmtRoas(m.roas)} />
        <Metric label="Orders" value={fmtNum(m.orders)} />
        <Metric label="Revenue" value={fmtMoney(m.revenue, currency)} />
        <Metric label="Age" value={formatAge(d.age)} />
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-2xs uppercase text-muted">Last Action</div>
          <div className="font-medium">{d.lastAction ? d.lastAction.type : 'None yet'}</div>
          <div className="text-muted">
            {d.lastAction ? `${formatDate(d.lastAction.date)} · ${agoLabel(d.lastAction.date)}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">Days Since Action</div>
          <div className="font-medium tnum">{d.daysSinceLastAction ?? '—'}</div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">Next Review</div>
          <div className={'font-medium ' + (reviewTone === 'danger' ? 'text-danger' : reviewTone === 'warning' ? 'text-warning' : '')}>
            {d.nextReviewDate ? formatDate(d.nextReviewDate) : 'Not set'}
          </div>
          <div className="text-muted">{d.nextReviewDate ? relativeLabel(d.nextReviewDate) : '—'}</div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">Experiment</div>
          <div className="font-medium truncate">{d.runningExperiment ? d.runningExperiment.name : 'None'}</div>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-xs">
        <span className="font-medium text-fg">Why: </span>
        <span className="text-muted">{d.primaryReason}</span>
      </div>

      <div className="mt-3">
        <QuickActions derived={d} />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { derived, settings, loading } = useAppData();
  const queue = useQueue(derived);
  const stats = useTodayStats(derived);
  const [focus, setFocus] = useState<FocusKey>('all');

  const filtered = useMemo(() => {
    switch (focus) {
      case 'overdue':
        return queue.filter((d) => d.isOverdue);
      case 'due':
        return queue.filter((d) => d.isDueToday);
      case 'growing':
        return queue.filter((d) => d.listing.status === 'Growing');
      case 'testing':
        return queue.filter((d) => d.listing.status === 'Testing');
      case 'untouched':
        return queue.filter((d) => d.isUntouchedWinner);
      default:
        return queue;
    }
  }, [queue, focus]);

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle="The listings that need your attention right now, in priority order."
      />

      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard label="Need Action" value={stats.needAction} tone="accent" active={focus === 'all'} onClick={() => setFocus('all')} />
        <StatCard label="Review Due" value={stats.reviewDueToday} tone="warning" active={focus === 'due'} onClick={() => setFocus('due')} />
        <StatCard label="Overdue" value={stats.overdue} tone="danger" active={focus === 'overdue'} onClick={() => setFocus('overdue')} />
        <StatCard label="Growing" value={stats.growing} tone="positive" active={focus === 'growing'} onClick={() => setFocus('growing')} />
        <StatCard label="Testing" value={stats.testing} tone="info" active={focus === 'testing'} onClick={() => setFocus('testing')} />
        <StatCard label="Untouched Winners" value={stats.untouchedWinners} tone="warning" active={focus === 'untouched'} onClick={() => setFocus('untouched')} />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Today’s Follow-up Queue <span className="text-muted font-normal">({filtered.length})</span>
        </h2>
        {focus !== 'all' && (
          <button className="btn-ghost btn-xs" onClick={() => setFocus('all')}>
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted py-10 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="✓"
          title={focus === 'all' ? 'Nothing needs attention right now' : 'Nothing in this view'}
          description={
            focus === 'all'
              ? 'No overdue reviews, no reviews due today, and nothing flagged. Add a listing or check the Dashboard.'
              : 'Try another stat or clear the filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <FollowupCard key={d.listing.id} d={d} currency={settings.currency} />
          ))}
        </div>
      )}
    </div>
  );
}
