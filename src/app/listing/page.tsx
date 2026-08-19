'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdBadge, AgeBadge, ExperimentBadge, PriorityBadge, StatusBadge } from '@/components/badges';
import { ConcludeExperimentModal, ListingForm } from '@/components/forms';
import { QuickActions } from '@/components/QuickActions';
import { Badge, ConfirmButton, EmptyState, Metric, useToast } from '@/components/ui';
import { useAppData } from '@/hooks/useData';
import { deleteAction, deleteListing, deleteSnapshot } from '@/lib/repo';
import { agoLabel, formatAge, formatDate } from '@/lib/date';
import type { Action, Experiment, Review, Snapshot } from '@/lib/types';
import { fmtMoney, fmtNum, fmtPct, fmtRoas } from '@/lib/util';

type TimelineItem =
  | { date: string; kind: 'published' }
  | { date: string; kind: 'action'; action: Action }
  | { date: string; kind: 'snapshot'; snapshot: Snapshot }
  | { date: string; kind: 'review'; review: Review }
  | { date: string; kind: 'experiment'; experiment: Experiment }
  | { date: string; kind: 'experiment-end'; experiment: Experiment };

function DetailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id');
  const { byId, actions, snapshots, experiments, reviews, settings } = useAppData();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [concluding, setConcluding] = useState<Experiment | null>(null);

  const d = id ? byId.get(id) : undefined;

  const mine = useMemo(() => {
    if (!id) return { actions: [], snapshots: [], experiments: [], reviews: [] };
    return {
      actions: actions.filter((a) => a.listingId === id),
      snapshots: snapshots.filter((s) => s.listingId === id),
      experiments: experiments.filter((e) => e.listingId === id),
      reviews: reviews.filter((r) => r.listingId === id),
    };
  }, [id, actions, snapshots, experiments, reviews]);

  const chartData = useMemo(() => {
    return [...mine.snapshots]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ date: formatDate(s.date), ctr: s.ctr, cvr: s.cvr, roas: s.roas }));
  }, [mine.snapshots]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!d) return [];
    const items: TimelineItem[] = [];
    if (d.listing.publishDate) items.push({ date: d.listing.publishDate, kind: 'published' });
    mine.actions.forEach((a) => items.push({ date: a.date, kind: 'action', action: a }));
    mine.snapshots.forEach((s) => items.push({ date: s.date, kind: 'snapshot', snapshot: s }));
    mine.reviews.forEach((r) => items.push({ date: r.date, kind: 'review', review: r }));
    mine.experiments.forEach((e) => {
      items.push({ date: e.startDate, kind: 'experiment', experiment: e });
      if (['Positive', 'Neutral', 'Negative'].includes(e.status)) {
        items.push({ date: e.reviewDate || e.updatedAt.slice(0, 10), kind: 'experiment-end', experiment: e });
      }
    });
    return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [d, mine]);

  if (!id || !d) {
    return (
      <EmptyState
        title="Listing not found"
        description="It may have been deleted."
        action={
          <Link href="/dashboard" className="btn-outline btn-xs">
            Back to Dashboard
          </Link>
        }
      />
    );
  }

  const l = d.listing;
  const m = l.currentMetrics;
  const runningExp = mine.experiments.find((e) => e.status === 'Running' || e.status === 'Planned');

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted">
        <button onClick={() => router.back()} className="hover:text-fg">
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            {l.imageUrl && (
              <img
                src={l.imageUrl}
                alt={l.listingName}
                className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
            <div className="min-w-0">
            <h1 className="text-xl font-semibold">{l.listingName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{l.shopName || '—'}</span>
              <span>·</span>
              <span>{l.category || 'Uncategorized'}</span>
              {l.etsyUrl && (
                <>
                  <span>·</span>
                  <a href={l.etsyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Open on Etsy ↗
                  </a>
                </>
              )}
              {l.currentPrice !== undefined && (
                <>
                  <span>·</span>
                  <span>{fmtMoney(l.currentPrice, settings.currency)}</span>
                </>
              )}
            </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={l.status} />
            <PriorityBadge priority={l.priority} />
            <AgeBadge stage={d.ageStage} days={d.age} />
            <AdBadge enabled={l.adEnabled} strategy={l.adStrategy} />
            <button className="btn-outline btn-xs" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        </div>

        {l.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {l.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}

        {/* Metrics */}
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Metric label="CTR" value={fmtPct(m.ctr)} tone={d.hasGoodPerformance ? 'positive' : undefined} />
          <Metric label="CVR" value={fmtPct(m.cvr)} />
          <Metric label="ROAS" value={fmtRoas(m.roas)} />
          <Metric label="Orders" value={fmtNum(m.orders)} />
          <Metric label="Revenue" value={fmtMoney(m.revenue, settings.currency)} />
          <Metric label="Ad Spend" value={fmtMoney(m.adSpend, settings.currency)} />
          <Metric label="Favorites" value={fmtNum(m.favorites)} />
        </div>

        {/* Status strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border pt-3">
          <div>
            <div className="text-2xs uppercase text-muted">Age</div>
            <div className="font-medium">{formatAge(d.age)} · {d.ageStage}</div>
          </div>
          <div>
            <div className="text-2xs uppercase text-muted">Last Action</div>
            <div className="font-medium">{d.lastAction ? `${d.lastAction.type} · ${agoLabel(d.lastAction.date)}` : 'None'}</div>
          </div>
          <div>
            <div className="text-2xs uppercase text-muted">Next Review</div>
            <div className={'font-medium ' + (d.isOverdue ? 'text-danger' : d.isDueToday ? 'text-warning' : '')}>
              {d.nextReviewDate ? formatDate(d.nextReviewDate) : 'Not set'}
            </div>
          </div>
          <div>
            <div className="text-2xs uppercase text-muted">Current Experiment</div>
            <div className="font-medium truncate">{runningExp ? runningExp.name : 'None'}</div>
          </div>
        </div>

        {l.notes && <p className="mt-3 rounded bg-surface-2 px-3 py-2 text-xs text-muted">{l.notes}</p>}

        <div className="mt-4">
          <QuickActions derived={d} showDetail={false} size="sm" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Timeline</h2>
          {timeline.length === 0 ? (
            <div className="card px-4 py-6 text-center text-sm text-muted">No events yet.</div>
          ) : (
            <div className="card p-4">
              <ol className="relative border-l border-border pl-4 space-y-4">
                {timeline.map((item, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="text-2xs text-muted">{formatDate(item.date)}</div>
                    <TimelineRow item={item} currency={settings.currency} onConclude={setConcluding} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right column: trend + experiments */}
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Metric Trend</h2>
            <div className="card p-3">
              {chartData.length < 2 ? (
                <div className="py-10 text-center text-xs text-muted">Add at least two snapshots to see a trend.</div>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgb(var(--surface))',
                          border: '1px solid rgb(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="ctr" name="CTR%" stroke="rgb(var(--positive))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cvr" name="CVR%" stroke="rgb(var(--info))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="roas" name="ROAS" stroke="rgb(var(--warning))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Experiments ({mine.experiments.length})</h2>
            <div className="space-y-2">
              {mine.experiments.length === 0 ? (
                <div className="card px-3 py-4 text-center text-xs text-muted">None yet.</div>
              ) : (
                mine.experiments
                  .slice()
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))
                  .map((e) => (
                    <div key={e.id} className="card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{e.name}</span>
                        <ExperimentBadge status={e.status} />
                      </div>
                      <div className="text-2xs text-muted mt-0.5">
                        {e.variable} · {formatDate(e.startDate)}
                      </div>
                      {(e.status === 'Running' || e.status === 'Planned') && (
                        <button className="btn-outline btn-xs mt-2" onClick={() => setConcluding(e)}>
                          Conclude
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          <ConfirmButton
            className="btn-ghost btn-xs text-danger"
            title="Delete listing"
            message={`Delete “${l.listingName}” and all its actions, snapshots, experiments and reviews? This cannot be undone.`}
            confirmLabel="Delete listing"
            danger
            onConfirm={async () => {
              await deleteListing(l.id);
              toast('Listing deleted', 'danger');
              router.push('/dashboard');
            }}
          >
            Delete this listing
          </ConfirmButton>
        </div>
      </div>

      <ListingForm open={editing} onClose={() => setEditing(false)} listing={l} />
      {concluding && (
        <ConcludeExperimentModal open={!!concluding} onClose={() => setConcluding(null)} experiment={concluding} currentMetrics={m} />
      )}
    </div>
  );
}

function TimelineRow({
  item,
  currency,
  onConclude,
}: {
  item: TimelineItem;
  currency: string;
  onConclude: (e: Experiment) => void;
}) {
  switch (item.kind) {
    case 'published':
      return <div className="text-sm">Listing published</div>;
    case 'action': {
      const a = item.action;
      const cats = a.types && a.types.length ? a.types : [a.type];
      return (
        <div className="group">
          <div className="text-sm">
            <span className="font-medium">调整：</span>
            <span>{cats.join(' · ')}</span>
            {(a.beforeValue || a.afterValue) && (
              <span className="text-muted">
                {' '}
                {a.beforeValue || '—'} → {a.afterValue || '—'}
              </span>
            )}
          </div>
          {a.reason && <div className="text-xs text-muted">{a.reason}</div>}
          {a.linkUrl && (
            <div className="text-xs">
              <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                🔗 {a.linkName || a.linkUrl}
              </a>
            </div>
          )}
          {a.reviewDate && <div className="text-2xs text-muted">Review scheduled {formatDate(a.reviewDate)}</div>}
          <button className="text-2xs text-danger opacity-0 group-hover:opacity-100" onClick={() => deleteAction(a.id)}>
            delete
          </button>
        </div>
      );
    }
    case 'snapshot': {
      const s = item.snapshot;
      const parts = [
        s.ctr !== undefined && `CTR ${s.ctr}%`,
        s.cvr !== undefined && `CVR ${s.cvr}%`,
        s.roas !== undefined && `ROAS ${s.roas}`,
        s.orders !== undefined && `${s.orders} orders`,
        s.revenue !== undefined && fmtMoney(s.revenue, currency),
      ].filter(Boolean);
      return (
        <div className="group">
          <div className="text-sm">
            <span className="font-medium">Snapshot</span> <span className="text-muted">{parts.join(' · ') || 'recorded'}</span>
          </div>
          {s.notes && <div className="text-xs text-muted">{s.notes}</div>}
          <button className="text-2xs text-danger opacity-0 group-hover:opacity-100" onClick={() => deleteSnapshot(s.id)}>
            delete
          </button>
        </div>
      );
    }
    case 'review': {
      const r = item.review;
      return (
        <div>
          <div className="text-sm">
            <span className="font-medium">Review</span> <span className="text-muted">— {r.decision}</span>
          </div>
          {r.note && <div className="text-xs text-muted">{r.note}</div>}
        </div>
      );
    }
    case 'experiment': {
      const e = item.experiment;
      return (
        <div>
          <div className="text-sm">
            <span className="font-medium">Experiment started</span> <span className="text-muted">— {e.name}</span>
          </div>
          {e.hypothesis && <div className="text-xs text-muted">{e.hypothesis}</div>}
          {(e.status === 'Running' || e.status === 'Planned') && (
            <button className="text-2xs text-accent" onClick={() => onConclude(e)}>
              conclude →
            </button>
          )}
        </div>
      );
    }
    case 'experiment-end': {
      const e = item.experiment;
      return (
        <div>
          <div className="text-sm">
            <span className="font-medium">Experiment concluded</span> <span className="text-muted">— {e.status}</span>
          </div>
          {e.conclusion && <div className="text-xs text-muted">{e.conclusion}</div>}
        </div>
      );
    }
  }
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted py-10 text-center">Loading…</div>}>
      <DetailInner />
    </Suspense>
  );
}
