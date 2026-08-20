'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { AdBadge, AgeBadge, PriorityBadge, StatusBadge } from '@/components/badges';
import { QuickActions, ListingLink } from '@/components/QuickActions';
import { Badge, EmptyState, Metric, StatCard } from '@/components/ui';
import { useLang } from '@/components/lang';
import { useAppData, useQueue, useTodayStats } from '@/hooks/useData';
import type { DerivedListing } from '@/lib/derive';
import { agoLabel, formatAge, formatDate, relativeLabel, todayISO } from '@/lib/date';
import { fmtMoney, fmtNum, fmtPct, fmtRoas } from '@/lib/util';

type FocusKey = 'all' | 'overdue' | 'due' | 'growing' | 'testing' | 'untouched';

function FollowupCard({ d, currency }: { d: DerivedListing; currency: string }) {
  const l = d.listing;
  const m = l.currentMetrics;
  const ctrTone = d.hasGoodPerformance ? 'positive' : undefined;
  const reviewTone = d.isOverdue ? 'danger' : d.isDueToday ? 'warning' : undefined;
  const { t } = useLang();
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3">
          {l.imageUrl && (
            <img
              src={l.imageUrl}
              alt={l.listingName}
              className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <div className="min-w-0">
            <ListingLink id={l.id} className="text-base font-semibold hover:text-accent">
              {l.listingName}
            </ListingLink>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span>{l.shopName || '—'}</span>
            </div>
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
        <Metric label={t('Orders')} value={fmtNum(m.orders)} />
        <Metric label={t('Revenue')} value={fmtMoney(m.revenue, currency)} />
        <Metric label={t('Age')} value={formatAge(d.age)} />
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-2xs uppercase text-muted">{t('Last Action')}</div>
          <div className="font-medium">{d.lastAction ? d.lastAction.type : t('None yet')}</div>
          <div className="text-muted">
            {d.lastAction ? `${formatDate(d.lastAction.date)} · ${agoLabel(d.lastAction.date)}` : '—'}
          </div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">{t('Days Since Action')}</div>
          <div className="font-medium tnum">{d.daysSinceLastAction ?? '—'}</div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">{t('Next Review')}</div>
          <div className={'font-medium ' + (reviewTone === 'danger' ? 'text-danger' : reviewTone === 'warning' ? 'text-warning' : '')}>
            {d.nextReviewDate ? formatDate(d.nextReviewDate) : t('Not set')}
          </div>
          <div className="text-muted">{d.nextReviewDate ? relativeLabel(d.nextReviewDate) : '—'}</div>
        </div>
        <div>
          <div className="text-2xs uppercase text-muted">{t('Experiment')}</div>
          <div className="font-medium truncate">{d.runningExperiment ? d.runningExperiment.name : t('None')}</div>
        </div>
      </div>

      <div className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-xs">
        <span className="font-medium text-fg">{t('Why: ')}</span>
        <span className="text-muted">{d.primaryReason}</span>
      </div>

      <div className="mt-3">
        <QuickActions derived={d} />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const { derived, settings, loading, actions, snapshots, reviews } = useAppData();
  const queue = useQueue(derived);
  const stats = useTodayStats(derived);
  const [focus, setFocus] = useState<FocusKey>('all');

  const { t, lang } = useLang();
  const todayCount = useMemo(() => {
    const today = todayISO();
    return (
      actions.filter((a) => a.date === today).length +
      snapshots.filter((s) => s.date === today).length +
      reviews.filter((r) => r.date === today).length
    );
  }, [actions, snapshots, reviews]);

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
        title={t('Today')}
        subtitle={t('The listings that need your attention right now, in priority order.')}
      />

      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard label={t('Need Action')} value={stats.needAction} tone="accent" active={focus === 'all'} onClick={() => setFocus('all')} />
        <StatCard label={t('Review Due')} value={stats.reviewDueToday} tone="warning" active={focus === 'due'} onClick={() => setFocus('due')} />
        <StatCard label={t('Overdue')} value={stats.overdue} tone="danger" active={focus === 'overdue'} onClick={() => setFocus('overdue')} />
        <StatCard label={t('Growing')} value={stats.growing} tone="positive" active={focus === 'growing'} onClick={() => setFocus('growing')} />
        <StatCard label={t('Testing')} value={stats.testing} tone="info" active={focus === 'testing'} onClick={() => setFocus('testing')} />
        <StatCard label={t('Untouched Winners')} value={stats.untouchedWinners} tone="warning" active={focus === 'untouched'} onClick={() => setFocus('untouched')} />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          {t('Today’s Follow-up Queue')} <span className="text-muted font-normal">({filtered.length})</span>
          <Badge tone={todayCount > 0 ? 'positive' : 'neutral'}>
            {lang === 'zh' ? `今天已记录 ${todayCount} 次` : `Recorded today: ${todayCount}`}
          </Badge>
        </h2>
        {focus !== 'all' && (
          <button className="btn-ghost btn-xs" onClick={() => setFocus('all')}>
            {t('Clear filter')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted py-10 text-center">{t('Loading…')}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="✓"
          title={focus === 'all' ? t('Nothing needs attention right now') : t('Nothing in this view')}
          description={
            focus === 'all'
              ? t('No overdue reviews, no reviews due today, and nothing flagged. Add a listing or check the Dashboard.')
              : t('Try another stat or clear the filter.')
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
