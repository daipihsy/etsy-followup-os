'use client';

import { useState } from 'react';
import { bulkUpdate, type BulkPatch } from '@/lib/repo';
import { AD_STRATEGIES, LISTING_STATUSES, type AdStrategy, type ListingStatus, type Priority } from '@/lib/types';
import { Modal, Field, useToast } from './ui';

export function BulkBar({
  ids,
  onClear,
}: {
  ids: string[];
  onClear: () => void;
}) {
  const toast = useToast();
  const [modal, setModal] = useState<null | string>(null);
  const [status, setStatus] = useState<ListingStatus>('Follow-up');
  const [priority, setPriority] = useState<Priority>(3);
  const [tag, setTag] = useState('');
  const [reviewDays, setReviewDays] = useState(3);
  const [adStrategy, setAdStrategy] = useState<AdStrategy>('Efficient spending');

  if (ids.length === 0) return null;

  async function apply(patch: BulkPatch, label: string) {
    await bulkUpdate(ids, patch);
    setModal(null);
    toast(`${label} · ${ids.length} listing${ids.length > 1 ? 's' : ''}`, 'positive');
  }

  return (
    <div className="sticky bottom-3 z-30 mx-auto mb-3 flex max-w-3xl flex-wrap items-center gap-2 card px-3 py-2 shadow-xl">
      <span className="text-sm font-medium">{ids.length} selected</span>
      <div className="h-4 w-px bg-border" />
      <button className="btn-outline btn-xs" onClick={() => setModal('status')}>
        Status
      </button>
      <button className="btn-outline btn-xs" onClick={() => setModal('priority')}>
        Priority
      </button>
      <button className="btn-outline btn-xs" onClick={() => setModal('tag')}>
        Add Tag
      </button>
      <button className="btn-outline btn-xs" onClick={() => setModal('review')}>
        Set Review
      </button>
      <button className="btn-outline btn-xs" onClick={() => setModal('ads')}>
        Ads
      </button>
      <button className="btn-outline btn-xs" onClick={() => apply({ status: 'Follow-up' }, 'Moved to Follow-up')}>
        → Follow-up
      </button>
      <button className="btn-outline btn-xs" onClick={() => apply({ status: 'Hold' }, 'Moved to Hold')}>
        → Hold
      </button>
      <div className="ml-auto">
        <button className="btn-ghost btn-xs" onClick={onClear}>
          Clear
        </button>
      </div>

      {/* Status */}
      <Modal
        open={modal === 'status'}
        onClose={() => setModal(null)}
        title={`Set status · ${ids.length}`}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => apply({ status }, `Status → ${status}`)}>Apply</button>
          </>
        }
      >
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
            {LISTING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Priority */}
      <Modal
        open={modal === 'priority'}
        onClose={() => setModal(null)}
        title={`Set priority · ${ids.length}`}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => apply({ priority }, `Priority → P${priority}`)}>Apply</button>
          </>
        }
      >
        <Field label="Priority">
          <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)}>
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>P{p}</option>
            ))}
          </select>
        </Field>
      </Modal>

      {/* Tag */}
      <Modal
        open={modal === 'tag'}
        onClose={() => setModal(null)}
        title={`Add tag · ${ids.length}`}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => tag.trim() && apply({ addTag: tag.trim() }, `Tagged “${tag.trim()}”`)}>Apply</button>
          </>
        }
      >
        <Field label="Tag">
          <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="high-ctr" autoFocus />
        </Field>
      </Modal>

      {/* Review */}
      <Modal
        open={modal === 'review'}
        onClose={() => setModal(null)}
        title={`Set review date · ${ids.length}`}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={() => apply({ reviewInDays: reviewDays }, `Review in ${reviewDays}d`)}>Apply</button>
          </>
        }
      >
        <Field label="Review in (days from today)">
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 5, 7, 14].map((d) => (
              <button
                key={d}
                className={reviewDays === d ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}
                onClick={() => setReviewDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </Field>
      </Modal>

      {/* Ads */}
      <Modal
        open={modal === 'ads'}
        onClose={() => setModal(null)}
        title={`Ad settings · ${ids.length}`}
        footer={<button className="btn-outline" onClick={() => setModal(null)}>Close</button>}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => apply({ adEnabled: true }, 'Ads enabled')}>
              Turn Ads ON
            </button>
            <button className="btn-outline flex-1" onClick={() => apply({ adEnabled: false }, 'Ads disabled')}>
              Turn Ads OFF
            </button>
          </div>
          <Field label="Set ad strategy">
            <div className="flex gap-2">
              <select className="input" value={adStrategy} onChange={(e) => setAdStrategy(e.target.value as AdStrategy)}>
                {AD_STRATEGIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={() => apply({ adStrategy }, `Strategy → ${adStrategy}`)}>
                Apply
              </button>
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
