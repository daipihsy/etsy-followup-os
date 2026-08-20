'use client';

import Link from 'next/link';
import { useState } from 'react';
import { snoozeReview } from '@/lib/repo';
import type { DerivedListing } from '@/lib/derive';
import { ActionModal, ExperimentModal, ReviewModal, SnapshotModal } from './forms';
import { useLang } from './lang';
import { useToast } from './ui';

export function ListingLink({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={{ pathname: '/listing', query: { id } }} className={className}>
      {children}
    </Link>
  );
}

interface Props {
  derived: DerivedListing;
  size?: 'xs' | 'sm';
  showDetail?: boolean;
}

export function QuickActions({ derived, size = 'xs', showDetail = true }: Props) {
  const toast = useToast();
  const { t } = useLang();
  const [modal, setModal] = useState<null | 'action' | 'snapshot' | 'experiment' | 'review'>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const btn = size === 'xs' ? 'btn-outline btn-xs' : 'btn-outline';
  const l = derived.listing;

  async function snooze(days: number) {
    await snoozeReview(l.id, days);
    setSnoozeOpen(false);
    toast(`Review snoozed ${days}d`, 'neutral');
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {showDetail && (
        <ListingLink id={l.id} className={btn}>
          {t('Open')}
        </ListingLink>
      )}
      <button className={btn} onClick={() => setModal('action')}>
        {t('Action')}
      </button>
      <button className={btn} onClick={() => setModal('snapshot')}>
        {t('Snapshot')}
      </button>
      <button className={btn} onClick={() => setModal('experiment')}>
        {t('Experiment')}
      </button>
      <button className={btn} onClick={() => setModal('review')}>
        {t('Review')}
      </button>
      <div className="relative">
        <button className={btn} onClick={() => setSnoozeOpen((v) => !v)} onBlur={() => setTimeout(() => setSnoozeOpen(false), 150)}>
          {t('Snooze')} ▾
        </button>
        {snoozeOpen && (
          <div className="absolute z-30 mt-1 card p-1 shadow-lg flex flex-col min-w-[7rem]">
            {[1, 2, 3, 5, 7].map((d) => (
              <button key={d} className="btn-ghost btn-xs justify-start" onMouseDown={() => snooze(d)}>
                {d} day{d > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <ActionModal
        open={modal === 'action'}
        onClose={() => setModal(null)}
        listingId={l.id}
        listingName={l.listingName}
      />
      <SnapshotModal
        open={modal === 'snapshot'}
        onClose={() => setModal(null)}
        listingId={l.id}
        listingName={l.listingName}
        prefill={l.currentMetrics}
      />
      <ExperimentModal
        open={modal === 'experiment'}
        onClose={() => setModal(null)}
        listingId={l.id}
        listingName={l.listingName}
        currentMetrics={l.currentMetrics}
      />
      <ReviewModal open={modal === 'review'} onClose={() => setModal(null)} derived={derived} />
    </div>
  );
}
