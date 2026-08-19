'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import React, { useMemo, useState } from 'react';
import { getDB, DEFAULT_SETTINGS } from '@/lib/db';
import {
  addAction,
  addSnapshot,
  completeReview,
  countTodayRecords,
  createExperiment,
  createListing,
  concludeExperiment,
  updateListing,
} from '@/lib/repo';
import { todayISO } from '@/lib/date';
import {
  ACTION_TYPES,
  AD_STRATEGIES,
  LISTING_STATUSES,
  REVIEW_DECISIONS,
  type AdStrategy,
  type Experiment,
  type ExperimentStatus,
  type Listing,
  type Metrics,
  type Priority,
  type ReviewDecision,
} from '@/lib/types';
import { fmtDiff, fmtNum, parseNum } from '@/lib/util';
import { DateInput, Field, Modal, Segmented, useToast } from './ui';
import type { DerivedListing } from '@/lib/derive';

function useSettings() {
  const s = useLiveQuery(() => getDB().settings.get('app'), []);
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

// ---------------------------------------------------------------------------
// Review interval picker (shared)
// ---------------------------------------------------------------------------

function ReviewIntervalPicker({
  value,
  onChange,
  defaultDays,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  defaultDays: number;
}) {
  const [custom, setCustom] = useState(false);
  const presets: { label: string; value: number | null }[] = [
    { label: 'No Review', value: null },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '3 Days', value: 3 },
    { label: '5 Days', value: 5 },
    { label: '7 Days', value: 7 },
  ];
  const isPreset = value === null || presets.some((p) => p.value === value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={String(p.value)}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(p.value);
            }}
            className={
              !custom && value === p.value
                ? 'btn-primary btn-xs'
                : 'btn-outline btn-xs'
            }
          >
            {p.label}
            {p.value === defaultDays ? ' ·' : ''}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustom(true);
            if (isPreset) onChange(defaultDays);
          }}
          className={custom ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}
        >
          Custom
        </button>
      </div>
      {custom && (
        <input
          type="number"
          min={1}
          className="input w-28"
          value={value ?? ''}
          onChange={(e) => onChange(parseNum(e.target.value) ?? null)}
          placeholder="days"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics grid input (shared by Snapshot + Experiment conclude)
// ---------------------------------------------------------------------------

const METRIC_FIELDS: { key: keyof Metrics; label: string; step?: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'visits', label: 'Visits' },
  { key: 'ctr', label: 'CTR %', step: '0.01' },
  { key: 'cvr', label: 'CVR %', step: '0.01' },
  { key: 'orders', label: 'Orders' },
  { key: 'revenue', label: 'Revenue', step: '0.01' },
  { key: 'adSpend', label: 'Ad Spend', step: '0.01' },
  { key: 'roas', label: 'ROAS', step: '0.01' },
  { key: 'favorites', label: 'Favorites' },
];

function MetricsGrid({
  value,
  onChange,
}: {
  value: Metrics;
  onChange: (m: Metrics) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {METRIC_FIELDS.map((f) => (
        <Field key={f.key} label={f.label}>
          <input
            type="number"
            step={f.step ?? '1'}
            className="input"
            value={value[f.key] ?? ''}
            onChange={(e) => onChange({ ...value, [f.key]: parseNum(e.target.value) })}
          />
        </Field>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing create / edit
// ---------------------------------------------------------------------------

export function ListingForm({
  open,
  onClose,
  listing,
}: {
  open: boolean;
  onClose: () => void;
  listing?: Listing;
}) {
  const settings = useSettings();
  const toast = useToast();
  const editing = !!listing;
  const [form, setForm] = useState(() => ({
    listingName: listing?.listingName ?? '',
    etsyUrl: listing?.etsyUrl ?? '',
    imageUrl: listing?.imageUrl ?? '',
    shopName: listing?.shopName ?? settings.defaultShop ?? '',
    publishDate: listing?.publishDate ?? '',
    currentPrice: listing?.currentPrice?.toString() ?? '',
    adEnabled: listing?.adEnabled ?? false,
    adStrategy: (listing?.adStrategy ?? 'Greater visibility') as AdStrategy,
    status: listing?.status ?? 'New',
    priority: (listing?.priority ?? 3) as Priority,
    notes: listing?.notes ?? '',
  }));

  // Reset the form whenever the modal is (re)opened for a different listing.
  const key = listing?.id ?? 'new';
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) {
    setLastKey(key);
    setForm({
      listingName: listing?.listingName ?? '',
      etsyUrl: listing?.etsyUrl ?? '',
      imageUrl: listing?.imageUrl ?? '',
      shopName: listing?.shopName ?? settings.defaultShop ?? '',
      publishDate: listing?.publishDate ?? '',
      currentPrice: listing?.currentPrice?.toString() ?? '',
      adEnabled: listing?.adEnabled ?? false,
      adStrategy: (listing?.adStrategy ?? 'Greater visibility') as AdStrategy,
      status: listing?.status ?? 'New',
      priority: (listing?.priority ?? 3) as Priority,
      notes: listing?.notes ?? '',
    });
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    if (!form.listingName.trim()) {
      toast('Listing name is required', 'danger');
      return;
    }
    const payload = {
      listingName: form.listingName.trim(),
      etsyUrl: form.etsyUrl.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      shopName: form.shopName.trim() || undefined,
      publishDate: form.publishDate || undefined,
      currentPrice: parseNum(form.currentPrice),
      adEnabled: form.adEnabled,
      adStrategy: form.adEnabled ? form.adStrategy : undefined,
      status: form.status,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
    };
    if (editing && listing) {
      await updateListing(listing.id, payload);
      toast('Listing updated', 'positive');
    } else {
      await createListing(payload);
      toast('Listing added', 'positive');
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editing ? 'Edit Listing' : 'New Listing'}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            {editing ? 'Save' : 'Add Listing'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Listing Name *">
          <input
            className="input"
            autoFocus
            value={form.listingName}
            onChange={(e) => set({ listingName: e.target.value })}
            placeholder="Personalized Nursery Basket"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shop">
            <input className="input" value={form.shopName} onChange={(e) => set({ shopName: e.target.value })} />
          </Field>
          <Field label="Etsy URL">
            <input className="input" value={form.etsyUrl} onChange={(e) => set({ etsyUrl: e.target.value })} />
          </Field>
        </div>
        <Field label="图片链接 (Image URL)" hint="贴一张图片的链接，会显示成缩略图">
          <input
            className="input"
            value={form.imageUrl}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="https://…/main.jpg"
          />
        </Field>
        {form.imageUrl.trim() && (
          <img
            src={form.imageUrl.trim()}
            alt="preview"
            className="h-24 w-24 rounded-md border border-border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            onLoad={(e) => ((e.target as HTMLImageElement).style.display = '')}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Publish Date" hint="Drives Listing Age">
            <input
              type="date"
              className="input"
              value={form.publishDate}
              onChange={(e) => set({ publishDate: e.target.value })}
            />
          </Field>
          <Field label="Price">
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.currentPrice}
              onChange={(e) => set({ currentPrice: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set({ status: e.target.value as any })}>
              {LISTING_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="input"
              value={form.priority}
              onChange={(e) => set({ priority: Number(e.target.value) as Priority })}
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  P{p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ads">
            <div className="flex items-center gap-2 pt-1">
              <input
                id="adEnabled"
                type="checkbox"
                checked={form.adEnabled}
                onChange={(e) => set({ adEnabled: e.target.checked })}
              />
              <label htmlFor="adEnabled" className="text-sm">
                Ads enabled
              </label>
            </div>
          </Field>
          <Field label="Ad Strategy">
            <select
              className="input"
              disabled={!form.adEnabled}
              value={form.adStrategy}
              onChange={(e) => set({ adStrategy: e.target.value as AdStrategy })}
            >
              {AD_STRATEGIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className="input min-h-[70px]"
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}

export function NewListingButton({ className = 'btn-primary' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        + New Listing
      </button>
      <ListingForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Action
// ---------------------------------------------------------------------------

export function ActionModal({
  open,
  onClose,
  listingId,
  listingName,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingName?: string;
}) {
  const settings = useSettings();
  const toast = useToast();
  const [types, setTypes] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reviewDays, setReviewDays] = useState<number | null>(settings.defaultReviewIntervalDays);

  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setReviewDays(settings.defaultReviewIntervalDays);
    setDate(todayISO());
    setTypes([]);
    setLinkUrl('');
    setLinkName('');
    setNote('');
  }
  if (!open && seeded) setSeeded(false);

  function toggleType(t: string) {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function submit() {
    await addAction({
      listingId,
      date,
      types,
      linkUrl: linkUrl.trim() || undefined,
      linkName: linkName.trim() || undefined,
      reason: note.trim() || undefined,
      reviewAfterDays: reviewDays,
    });
    const n = await countTodayRecords();
    toast(`已记录 · 今天第 ${n} 次`, 'positive');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`记录动作${listingName ? ` — ${listingName}` : ''}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={submit}>
            记录
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="调整了什么" hint="可多选">
          <div className="flex flex-wrap gap-1.5">
            {ACTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={types.includes(t) ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="链接名称" className="col-span-1">
            <input className="input" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="新主图 v2" />
          </Field>
          <Field label="链接 (URL)" className="col-span-2">
            <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <Field label="备注">
          <textarea
            className="input min-h-[64px]"
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            placeholder="为什么这么改、想验证什么…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="日期">
            <DateInput value={date} onChange={setDate} />
          </Field>
          <Field label="下次复盘" hint="· 是你的默认间隔">
            <ReviewIntervalPicker
              value={reviewDays}
              onChange={setReviewDays}
              defaultDays={settings.defaultReviewIntervalDays}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add Snapshot
// ---------------------------------------------------------------------------

export function SnapshotModal({
  open,
  onClose,
  listingId,
  listingName,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingName?: string;
  prefill?: Metrics;
}) {
  const toast = useToast();
  const [metrics, setMetrics] = useState<Metrics>(prefill ?? {});
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayISO());

  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setMetrics(prefill ?? {});
    setDate(todayISO());
  }
  if (!open && seeded) setSeeded(false);

  async function submit() {
    await addSnapshot({ listingId, date, ...metrics, notes: notes.trim() || undefined });
    const n = await countTodayRecords();
    toast(`已记录快照 · 今天第 ${n} 次`, 'positive');
    setNotes('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Add Snapshot${listingName ? ` — ${listingName}` : ''}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Save Snapshot
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs text-muted">
        Every field is optional — record whatever you have. The latest snapshot becomes the listing’s current metrics.
      </p>
      <MetricsGrid value={metrics} onChange={setMetrics} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="日期">
          <DateInput value={date} onChange={setDate} />
        </Field>
        <Field label="Notes">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Complete Review
// ---------------------------------------------------------------------------

export function ReviewModal({
  open,
  onClose,
  derived,
}: {
  open: boolean;
  onClose: () => void;
  derived: DerivedListing;
}) {
  const settings = useSettings();
  const toast = useToast();
  const [decision, setDecision] = useState<ReviewDecision>('Keep Current Setup');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reviewDays, setReviewDays] = useState<number | null>(settings.defaultReviewIntervalDays);

  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setReviewDays(settings.defaultReviewIntervalDays);
    setDecision('Keep Current Setup');
    setNote('');
    setDate(todayISO());
  }
  if (!open && seeded) setSeeded(false);

  const m = derived.listing.currentMetrics;

  async function submit() {
    await completeReview({
      listingId: derived.listing.id,
      decision,
      note: note.trim() || undefined,
      nextReviewInDays: reviewDays,
      date,
    });
    const n = await countTodayRecords();
    toast(`已复盘 · 今天第 ${n} 次`, 'positive');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Review — ${derived.listing.listingName}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Complete Review
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ['CTR', m.ctr !== undefined ? `${m.ctr}%` : '—'],
            ['CVR', m.cvr !== undefined ? `${m.cvr}%` : '—'],
            ['ROAS', m.roas ?? '—'],
            ['Orders', m.orders ?? '—'],
          ].map(([l, v]) => (
            <div key={l} className="card px-2 py-2">
              <div className="text-2xs uppercase text-muted">{l}</div>
              <div className="text-lg font-semibold tnum">{String(v)}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted">
          <div>
            <span className="text-fg font-medium">Last action: </span>
            {derived.lastAction
              ? `${derived.lastAction.type} (${derived.daysSinceLastAction}d ago)`
              : 'None yet'}
          </div>
          <div>
            <span className="text-fg font-medium">Experiment: </span>
            {derived.runningExperiment ? derived.runningExperiment.name : 'None running'}
          </div>
        </div>
        <Field label="Decision" hint="“Keep Current Setup” is a valid, deliberate outcome — not doing anything is a decision.">
          <div className="flex flex-wrap gap-1">
            {REVIEW_DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={decision === d ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Review note">
          <textarea className="input min-h-[60px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="复盘日期">
            <DateInput value={date} onChange={setDate} />
          </Field>
          <Field label="Set next review in">
            <ReviewIntervalPicker
              value={reviewDays}
              onChange={setReviewDays}
              defaultDays={settings.defaultReviewIntervalDays}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Start Experiment
// ---------------------------------------------------------------------------

export function ExperimentModal({
  open,
  onClose,
  listingId,
  listingName,
  currentMetrics,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingName?: string;
  currentMetrics?: Metrics;
}) {
  const settings = useSettings();
  const toast = useToast();
  const [name, setName] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [variable, setVariable] = useState<string>('Price');
  const [beforeValue, setBefore] = useState('');
  const [afterValue, setAfter] = useState('');
  const [reviewDays, setReviewDays] = useState<number | null>(settings.defaultReviewIntervalDays);

  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setReviewDays(settings.defaultReviewIntervalDays);
  }
  if (!open && seeded) setSeeded(false);

  async function submit() {
    if (!name.trim()) {
      toast('Experiment name is required', 'danger');
      return;
    }
    await createExperiment({
      listingId,
      name: name.trim(),
      hypothesis: hypothesis.trim() || undefined,
      variable,
      beforeValue: beforeValue.trim() || undefined,
      afterValue: afterValue.trim() || undefined,
      reviewInDays: reviewDays,
      beforeSnapshot: currentMetrics,
    });
    toast('Experiment started', 'positive');
    setName('');
    setHypothesis('');
    setBefore('');
    setAfter('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Start Experiment${listingName ? ` — ${listingName}` : ''}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Start Experiment
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted">
          Try to change only one main variable at a time so the result is readable.
        </p>
        <Field label="Name *">
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Price Test — $49.99 → $44.99"
          />
        </Field>
        <Field label="Hypothesis">
          <textarea
            className="input min-h-[60px]"
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="CTR is 3.4% but CVR is only 1.5% — a lower price may lift conversion."
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Variable">
            <select className="input" value={variable} onChange={(e) => setVariable(e.target.value)}>
              {ACTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Before">
            <input className="input" value={beforeValue} onChange={(e) => setBefore(e.target.value)} />
          </Field>
          <Field label="After">
            <input className="input" value={afterValue} onChange={(e) => setAfter(e.target.value)} />
          </Field>
        </div>
        <Field label="Review in">
          <ReviewIntervalPicker
            value={reviewDays}
            onChange={setReviewDays}
            defaultDays={settings.defaultReviewIntervalDays}
          />
        </Field>
        {currentMetrics && (
          <p className="text-2xs text-muted">
            Current metrics will be captured as the “before” snapshot (CTR {currentMetrics.ctr ?? '—'}%, CVR{' '}
            {currentMetrics.cvr ?? '—'}%, ROAS {currentMetrics.roas ?? '—'}).
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Conclude Experiment (Before / After)
// ---------------------------------------------------------------------------

const DIFF_ROWS: { key: keyof Metrics; label: string; digits: number }[] = [
  { key: 'ctr', label: 'CTR %', digits: 2 },
  { key: 'cvr', label: 'CVR %', digits: 2 },
  { key: 'roas', label: 'ROAS', digits: 1 },
  { key: 'orders', label: 'Orders', digits: 0 },
  { key: 'revenue', label: 'Revenue', digits: 0 },
];

export function ConcludeExperimentModal({
  open,
  onClose,
  experiment,
  currentMetrics,
}: {
  open: boolean;
  onClose: () => void;
  experiment: Experiment;
  currentMetrics?: Metrics;
}) {
  const toast = useToast();
  const [after, setAfter] = useState<Metrics>(experiment.afterSnapshot ?? currentMetrics ?? {});
  const [outcome, setOutcome] = useState<ExperimentStatus>('Positive');
  const [conclusion, setConclusion] = useState(experiment.conclusion ?? '');
  const [decision, setDecision] = useState(experiment.decision ?? '');

  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setAfter(experiment.afterSnapshot ?? currentMetrics ?? {});
    setConclusion(experiment.conclusion ?? '');
    setDecision(experiment.decision ?? '');
  }
  if (!open && seeded) setSeeded(false);

  const before = experiment.beforeSnapshot ?? {};

  async function submit() {
    await concludeExperiment(experiment.id, outcome, {
      afterSnapshot: after,
      conclusion: conclusion.trim() || undefined,
      decision: decision.trim() || undefined,
    });
    toast('Experiment concluded', 'positive');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Conclude — ${experiment.name}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            Save Conclusion
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="label">After metrics</div>
          <MetricsGrid value={after} onChange={setAfter} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="th">Metric</th>
                <th className="th text-right">Before</th>
                <th className="th text-right">After</th>
                <th className="th text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {DIFF_ROWS.map((r) => {
                const b = before[r.key];
                const a = after[r.key];
                const d = b !== undefined && a !== undefined ? a - b : undefined;
                return (
                  <tr key={r.key} className="border-b border-border/60">
                    <td className="td">{r.label}</td>
                    <td className="td text-right tnum">{fmtNum(b, r.digits)}</td>
                    <td className="td text-right tnum">{fmtNum(a, r.digits)}</td>
                    <td
                      className={
                        'td text-right tnum font-medium ' +
                        (d === undefined ? '' : d > 0 ? 'text-positive' : d < 0 ? 'text-danger' : 'text-muted')
                      }
                    >
                      {fmtDiff(b, a, r.digits)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Field label="Outcome">
          <div className="flex gap-1">
            {(['Positive', 'Neutral', 'Negative'] as ExperimentStatus[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={outcome === o ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}
              >
                {o}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Conclusion">
          <textarea className="input min-h-[60px]" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </Field>
        <Field label="Next decision" hint="e.g. Keep new price / Restore previous price">
          <input className="input" value={decision} onChange={(e) => setDecision(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
