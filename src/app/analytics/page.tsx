'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { PageHeader } from '@/components/AppShell';
import { StatusBadge } from '@/components/badges';
import { ListingLink } from '@/components/QuickActions';
import { Badge, EmptyState, StatCard } from '@/components/ui';
import { useAppData } from '@/hooks/useData';
import { daysSince } from '@/lib/date';
import type { Metrics } from '@/lib/types';
import { cx, fmtPct, fmtRoas } from '@/lib/util';

interface Point {
  id: string;
  x: number;
  y: number;
  name: string;
  roas?: number;
  orders?: number;
  age: number;
  status: string;
  quadrant: 'hh' | 'hl' | 'lh' | 'll';
}

const QUAD_COLOR: Record<Point['quadrant'], string> = {
  hh: 'rgb(var(--positive))',
  hl: 'rgb(var(--warning))',
  lh: 'rgb(var(--info))',
  ll: 'rgb(var(--muted))',
};

function MatrixTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: Point = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold">{p.name}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted">
        <span>CTR: <span className="text-fg tnum">{fmtPct(p.x)}</span></span>
        <span>CVR: <span className="text-fg tnum">{fmtPct(p.y)}</span></span>
        <span>ROAS: <span className="text-fg tnum">{fmtRoas(p.roas)}</span></span>
        <span>Orders: <span className="text-fg tnum">{p.orders ?? '—'}</span></span>
        <span>Age: <span className="text-fg tnum">{p.age}d</span></span>
        <span>Status: <span className="text-fg">{p.status}</span></span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { derived, experiments, actions, reviews, settings } = useAppData();

  // ---- Product Matrix ----
  const points = useMemo<Point[]>(() => {
    const ctrT = settings.matrixCtrThreshold;
    const cvrT = settings.matrixCvrThreshold;
    return derived
      .filter((d) => d.listing.status !== 'Dropped' && d.listing.currentMetrics.ctr !== undefined && d.listing.currentMetrics.cvr !== undefined)
      .map((d) => {
        const m = d.listing.currentMetrics;
        const x = m.ctr!;
        const y = m.cvr!;
        const quadrant: Point['quadrant'] = x >= ctrT ? (y >= cvrT ? 'hh' : 'hl') : y >= cvrT ? 'lh' : 'll';
        return { id: d.listing.id, x, y, name: d.listing.listingName, roas: m.roas, orders: m.orders, age: d.age, status: d.listing.status, quadrant };
      });
  }, [derived, settings.matrixCtrThreshold, settings.matrixCvrThreshold]);

  const grouped = useMemo(() => {
    return {
      hh: points.filter((p) => p.quadrant === 'hh'),
      hl: points.filter((p) => p.quadrant === 'hl'),
      lh: points.filter((p) => p.quadrant === 'lh'),
      ll: points.filter((p) => p.quadrant === 'll'),
    };
  }, [points]);

  // ---- Untouched Winners ----
  const untouched = useMemo(
    () => derived.filter((d) => d.isUntouchedWinner).sort((a, b) => (b.daysSinceLastAction ?? 0) - (a.daysSinceLastAction ?? 0)),
    [derived],
  );

  // ---- Playbook (experiments by variable) ----
  const playbook = useMemo(() => {
    const concluded = experiments.filter((e) => ['Positive', 'Neutral', 'Negative'].includes(e.status));
    const map = new Map<string, { total: number; positive: number; dCtr: number[]; dCvr: number[]; dRoas: number[] }>();
    for (const e of concluded) {
      const key = String(e.variable);
      if (!map.has(key)) map.set(key, { total: 0, positive: 0, dCtr: [], dCvr: [], dRoas: [] });
      const g = map.get(key)!;
      g.total++;
      if (e.status === 'Positive') g.positive++;
      const b = e.beforeSnapshot;
      const a = e.afterSnapshot;
      if (b && a) {
        if (b.ctr !== undefined && a.ctr !== undefined) g.dCtr.push(a.ctr - b.ctr);
        if (b.cvr !== undefined && a.cvr !== undefined) g.dCvr.push(a.cvr - b.cvr);
        if (b.roas !== undefined && a.roas !== undefined) g.dRoas.push(a.roas - b.roas);
      }
    }
    const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : undefined);
    return Array.from(map.entries())
      .map(([variable, g]) => ({
        variable,
        total: g.total,
        positive: g.positive,
        positiveRate: g.total ? Math.round((g.positive / g.total) * 100) : 0,
        avgCtr: avg(g.dCtr),
        avgCvr: avg(g.dCvr),
        avgRoas: avg(g.dRoas),
      }))
      .sort((a, b) => b.total - a.total);
  }, [experiments]);

  // ---- Action frequency (last 7 days) ----
  const freq = useMemo(() => {
    const within = (iso: string | undefined | null) => {
      const s = daysSince(iso);
      return s !== null && s >= 0 && s <= 6;
    };
    const actionsN = actions.filter((a) => within(a.date)).length;
    const reviewsN = reviews.filter((r) => within(r.date)).length;
    const startedN = experiments.filter((e) => within(e.startDate)).length;
    const completedN = experiments.filter(
      (e) => ['Positive', 'Neutral', 'Negative', 'Cancelled'].includes(e.status) && within(e.updatedAt.slice(0, 10)),
    ).length;
    const listingsReviewed = new Set(reviews.filter((r) => within(r.date)).map((r) => r.listingId)).size;
    return { actionsN, reviewsN, startedN, completedN, listingsReviewed };
  }, [actions, reviews, experiments]);

  const totalExperiments = experiments.length;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Your Etsy playbook — what you’ve tried and what has worked." />

      {/* Action frequency */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Activity — last 7 days</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatCard label="Actions" value={freq.actionsN} tone="accent" />
          <StatCard label="Reviews" value={freq.reviewsN} tone="info" />
          <StatCard label="Listings Reviewed" value={freq.listingsReviewed} />
          <StatCard label="Experiments Started" value={freq.startedN} tone="warning" />
          <StatCard label="Experiments Completed" value={freq.completedN} tone="positive" />
        </div>
      </section>

      {/* Product Matrix */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Product Matrix — CTR × CVR</h2>
          <div className="flex gap-1">
            <Badge tone="positive">High CTR · High CVR</Badge>
            <Badge tone="warning">High CTR · Low CVR</Badge>
            <Badge tone="info">Low CTR · High CVR</Badge>
            <Badge tone="neutral">Low · Low</Badge>
          </div>
        </div>
        <div className="card p-3">
          {points.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">No listings with both CTR and CVR recorded yet.</div>
          ) : (
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="CTR"
                    unit="%"
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    label={{ value: 'CTR %', position: 'insideBottom', offset: -10, fill: 'rgb(var(--muted))', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="CVR"
                    unit="%"
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    label={{ value: 'CVR %', angle: -90, position: 'insideLeft', fill: 'rgb(var(--muted))', fontSize: 11 }}
                  />
                  <ZAxis type="number" range={[70, 70]} />
                  <ReferenceLine x={settings.matrixCtrThreshold} stroke="rgb(var(--accent))" strokeDasharray="4 4" />
                  <ReferenceLine y={settings.matrixCvrThreshold} stroke="rgb(var(--accent))" strokeDasharray="4 4" />
                  <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={grouped.hh} fill={QUAD_COLOR.hh} />
                  <Scatter data={grouped.hl} fill={QUAD_COLOR.hl} />
                  <Scatter data={grouped.lh} fill={QUAD_COLOR.lh} />
                  <Scatter data={grouped.ll} fill={QUAD_COLOR.ll} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded bg-positive/10 px-2 py-1.5"><span className="font-medium text-positive">{grouped.hh.length}</span> High CTR · High CVR — <span className="text-muted">scale these</span></div>
            <div className="rounded bg-warning/10 px-2 py-1.5"><span className="font-medium text-warning">{grouped.hl.length}</span> High CTR · Low CVR — <span className="text-muted">fix conversion</span></div>
            <div className="rounded bg-info/10 px-2 py-1.5"><span className="font-medium text-info">{grouped.lh.length}</span> Low CTR · High CVR — <span className="text-muted">improve click</span></div>
            <div className="rounded bg-surface-2 px-2 py-1.5"><span className="font-medium">{grouped.ll.length}</span> Low · Low — <span className="text-muted">reassess</span></div>
          </div>
        </div>
      </section>

      {/* Untouched Winners */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">
          Untouched Winners <span className="font-normal text-muted">({untouched.length})</span>
        </h2>
        {untouched.length === 0 ? (
          <div className="card px-4 py-6 text-center text-sm text-muted">
            No strong listings are being neglected. Nicely kept up.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {untouched.map((d) => (
              <div key={d.listing.id} className="card p-3">
                <div className="flex items-center justify-between gap-2">
                  <ListingLink id={d.listing.id} className="font-medium hover:text-accent line-clamp-1">
                    {d.listing.listingName}
                  </ListingLink>
                  <StatusBadge status={d.listing.status} />
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-1 text-2xs tnum">
                  <div><div className="text-muted">CTR</div><div className="text-positive font-medium">{fmtPct(d.listing.currentMetrics.ctr)}</div></div>
                  <div><div className="text-muted">CVR</div><div className="font-medium">{fmtPct(d.listing.currentMetrics.cvr)}</div></div>
                  <div><div className="text-muted">ROAS</div><div className="font-medium">{fmtRoas(d.listing.currentMetrics.roas)}</div></div>
                  <div><div className="text-muted">No action</div><div className="text-warning font-medium">{d.daysSinceLastAction ?? d.age}d</div></div>
                </div>
                <p className="mt-1.5 text-2xs text-muted">Strong performance but no recent action — consider a review.</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Playbook */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">
          My Etsy Playbook <span className="font-normal text-muted">({totalExperiments} experiments)</span>
        </h2>
        {playbook.length === 0 ? (
          <EmptyState icon="⚗" title="No concluded experiments yet" description="Conclude a few experiments to build your win-rate history by variable." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] tnum">
              <thead className="border-b border-border">
                <tr>
                  <th className="th">Variable</th>
                  <th className="th text-right">Tests</th>
                  <th className="th text-right">Positive</th>
                  <th className="th text-right">Positive Rate</th>
                  <th className="th text-right">Avg ΔCTR</th>
                  <th className="th text-right">Avg ΔCVR</th>
                  <th className="th text-right">Avg ΔROAS</th>
                </tr>
              </thead>
              <tbody>
                {playbook.map((p) => (
                  <tr key={p.variable} className="border-b border-border/60">
                    <td className="td font-medium">{p.variable}</td>
                    <td className="td text-right">{p.total}</td>
                    <td className="td text-right">{p.positive}</td>
                    <td className="td text-right">
                      <span className={cx('font-medium', p.positiveRate >= 50 ? 'text-positive' : p.positiveRate >= 30 ? 'text-warning' : 'text-danger')}>
                        {p.positiveRate}%
                      </span>
                    </td>
                    <td className={cx('td text-right', p.avgCtr !== undefined && (p.avgCtr > 0 ? 'text-positive' : p.avgCtr < 0 ? 'text-danger' : ''))}>
                      {p.avgCtr !== undefined ? `${p.avgCtr > 0 ? '+' : ''}${p.avgCtr.toFixed(2)}` : '—'}
                    </td>
                    <td className={cx('td text-right', p.avgCvr !== undefined && (p.avgCvr > 0 ? 'text-positive' : p.avgCvr < 0 ? 'text-danger' : ''))}>
                      {p.avgCvr !== undefined ? `${p.avgCvr > 0 ? '+' : ''}${p.avgCvr.toFixed(2)}` : '—'}
                    </td>
                    <td className={cx('td text-right', p.avgRoas !== undefined && (p.avgRoas > 0 ? 'text-positive' : p.avgRoas < 0 ? 'text-danger' : ''))}>
                      {p.avgRoas !== undefined ? `${p.avgRoas > 0 ? '+' : ''}${p.avgRoas.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
