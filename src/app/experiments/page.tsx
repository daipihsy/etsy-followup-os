'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { ExperimentBadge } from '@/components/badges';
import { ConcludeExperimentModal } from '@/components/forms';
import { ListingLink } from '@/components/QuickActions';
import { ConfirmButton, EmptyState, Segmented } from '@/components/ui';
import { useAppData } from '@/hooks/useData';
import { deleteExperiment } from '@/lib/repo';
import { type Experiment, type Metrics } from '@/lib/types';
import { formatDate } from '@/lib/date';
import { cx, fmtDiff, fmtNum } from '@/lib/util';

const DIFF_ROWS: { key: keyof Metrics; label: string; digits: number }[] = [
  { key: 'ctr', label: 'CTR %', digits: 2 },
  { key: 'cvr', label: 'CVR %', digits: 2 },
  { key: 'roas', label: 'ROAS', digits: 1 },
  { key: 'orders', label: 'Orders', digits: 0 },
];

function BeforeAfter({ exp }: { exp: Experiment }) {
  const before = exp.beforeSnapshot ?? {};
  const after = exp.afterSnapshot ?? {};
  if (!exp.afterSnapshot) return null;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="text-xs tnum">
        <thead>
          <tr className="text-muted">
            <th className="pr-3 text-left font-medium">Metric</th>
            <th className="px-2 text-right font-medium">Before</th>
            <th className="px-2 text-right font-medium">After</th>
            <th className="pl-2 text-right font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {DIFF_ROWS.map((r) => {
            const b = before[r.key];
            const a = after[r.key];
            const d = b !== undefined && a !== undefined ? a - b : undefined;
            return (
              <tr key={r.key}>
                <td className="pr-3">{r.label}</td>
                <td className="px-2 text-right">{fmtNum(b, r.digits)}</td>
                <td className="px-2 text-right">{fmtNum(a, r.digits)}</td>
                <td className={cx('pl-2 text-right font-medium', d === undefined ? '' : d > 0 ? 'text-positive' : d < 0 ? 'text-danger' : 'text-muted')}>
                  {fmtDiff(b, a, r.digits)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ExperimentsPage() {
  const { experiments, byId } = useAppData();
  const [filter, setFilter] = useState<'all' | 'active' | 'concluded'>('all');
  const [concluding, setConcluding] = useState<Experiment | null>(null);

  const sorted = useMemo(() => {
    const order = (e: Experiment) => (e.status === 'Running' ? 0 : e.status === 'Planned' ? 1 : 2);
    return [...experiments]
      .filter((e) => {
        if (filter === 'active') return e.status === 'Running' || e.status === 'Planned';
        if (filter === 'concluded') return ['Positive', 'Neutral', 'Negative', 'Cancelled'].includes(e.status);
        return true;
      })
      .sort((a, b) => order(a) - order(b) || b.startDate.localeCompare(a.startDate));
  }, [experiments, filter]);

  return (
    <div>
      <PageHeader
        title="Experiments"
        subtitle="One variable at a time. Capture before/after and record what you learned."
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Concluded', value: 'concluded' },
            ]}
          />
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon="⚗"
          title="No experiments yet"
          description="Open a listing (or use its Quick Actions) and choose “Experiment” to start one."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((exp) => {
            const d = byId.get(exp.listingId);
            const active = exp.status === 'Running' || exp.status === 'Planned';
            return (
              <div key={exp.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{exp.name}</div>
                    <div className="text-xs text-muted">
                      {d ? (
                        <ListingLink id={exp.listingId} className="hover:text-accent">
                          {d.listing.listingName}
                        </ListingLink>
                      ) : (
                        'Listing removed'
                      )}{' '}
                      · Variable: <span className="text-fg">{exp.variable}</span>
                    </div>
                  </div>
                  <ExperimentBadge status={exp.status} />
                </div>

                {exp.hypothesis && <p className="mt-2 text-xs text-muted">{exp.hypothesis}</p>}

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {(exp.beforeValue || exp.afterValue) && (
                    <span>
                      <span className="text-muted">Change: </span>
                      {exp.beforeValue || '—'} → {exp.afterValue || '—'}
                    </span>
                  )}
                  <span>
                    <span className="text-muted">Started: </span>
                    {formatDate(exp.startDate)}
                  </span>
                  {exp.reviewDate && (
                    <span>
                      <span className="text-muted">Review: </span>
                      {formatDate(exp.reviewDate)}
                    </span>
                  )}
                </div>

                <BeforeAfter exp={exp} />

                {exp.conclusion && (
                  <div className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-xs">
                    <div><span className="font-medium">Conclusion: </span>{exp.conclusion}</div>
                    {exp.decision && <div className="mt-1"><span className="font-medium">Decision: </span>{exp.decision}</div>}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {active ? (
                    <button className="btn-primary btn-xs" onClick={() => setConcluding(exp)}>
                      Conclude / Before-After
                    </button>
                  ) : (
                    <button className="btn-outline btn-xs" onClick={() => setConcluding(exp)}>
                      Edit conclusion
                    </button>
                  )}
                  <ConfirmButton
                    className="btn-ghost btn-xs text-danger ml-auto"
                    title="Delete experiment"
                    message={`Delete “${exp.name}”? This cannot be undone.`}
                    confirmLabel="Delete"
                    danger
                    onConfirm={() => deleteExperiment(exp.id)}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {concluding && (
        <ConcludeExperimentModal
          open={!!concluding}
          onClose={() => setConcluding(null)}
          experiment={concluding}
          currentMetrics={byId.get(concluding.listingId)?.listing.currentMetrics}
        />
      )}
    </div>
  );
}
