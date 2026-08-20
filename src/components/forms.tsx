'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { getDB } from '@/lib/db';
import { addAction, countTodayRecords, createListing, updateAction, updateListing } from '@/lib/repo';
import { imageFileToDataUrl, extractImageFile } from '@/lib/image';
import { ACTION_TYPES, type Action, type Listing } from '@/lib/types';
import { todayISO } from '@/lib/date';
import { cx } from '@/lib/util';
import { DateInput, Field, Modal, useToast } from './ui';
import { useLang } from './lang';

// ---------------------------------------------------------------------------
// Image picker — drag / paste / click to upload (compact data URL) or a URL.
// ---------------------------------------------------------------------------

export function ImagePicker({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { t } = useLang();

  async function handleFile(file: File) {
    setBusy(true);
    try {
      onChange(await imageFileToDataUrl(file));
    } catch {
      toast(t('Could not read that image'), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = extractImageFile(e.dataTransfer);
          if (f) handleFile(f);
        }}
        onPaste={(e) => {
          const f = extractImageFile(e.clipboardData);
          if (f) {
            e.preventDefault();
            handleFile(f);
          }
        }}
        className={cx(
          'flex items-center gap-3 rounded-md border border-dashed p-3 cursor-pointer focus:outline-none',
          drag ? 'border-accent bg-accent/5' : 'border-border',
        )}
      >
        {value ? (
          <img
            src={value}
            alt="preview"
            className="h-14 w-14 shrink-0 rounded object-cover border border-border"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-surface-2 text-2xl text-muted">
            🖼
          </div>
        )}
        <div className="text-xs text-muted">{busy ? t('Processing…') : t('Drag / paste (Ctrl+V) / click to upload')}</div>
        {value && (
          <button
            type="button"
            className="btn-ghost btn-xs text-danger ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            {t('Remove')}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) handleFile(f);
          }}
        />
      </div>
      <input
        className="input mt-2"
        value={value.startsWith('data:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint ?? t('or paste an image link https://…')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listing create / edit — just a name, an image, and an optional Etsy link.
// ---------------------------------------------------------------------------

export function ListingForm({
  open,
  onClose,
  listing,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  listing?: Listing;
  onCreated?: (l: Listing) => void;
}) {
  const toast = useToast();
  const { t } = useLang();
  const editing = !!listing;
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [etsyUrl, setEtsyUrl] = useState('');
  const [notes, setNotes] = useState('');

  const key = listing?.id ?? 'new';
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setName(listing?.listingName ?? '');
    setImageUrl(listing?.imageUrl ?? '');
    setEtsyUrl(listing?.etsyUrl ?? '');
    setNotes(listing?.notes ?? '');
  }
  if (!open && lastKey !== null) setLastKey(null);

  async function submit() {
    if (!name.trim()) {
      toast(t('Please enter a name'), 'danger');
      return;
    }
    const payload = {
      listingName: name.trim(),
      imageUrl: imageUrl.trim() || undefined,
      etsyUrl: etsyUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (editing && listing) {
      await updateListing(listing.id, payload);
      toast(t('Saved'), 'positive');
    } else {
      const created = await createListing(payload);
      toast(t('Listing added'), 'positive');
      onCreated?.(created);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('Edit Listing') : t('New Listing')}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn-primary" onClick={submit}>
            {editing ? t('Save') : t('Add')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Name')}>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. UK shop confetti basket')} />
        </Field>
        <Field label={t('Image')}>
          <ImagePicker value={imageUrl} onChange={setImageUrl} />
        </Field>
        <Field label={t('Etsy link')}>
          <input className="input" value={etsyUrl} onChange={(e) => setEtsyUrl(e.target.value)} placeholder="https://www.etsy.com/listing/…" />
        </Field>
        <Field label={t('Note')}>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function NewListingButton({ className = 'btn-primary', onCreated }: { className?: string; onCreated?: (l: Listing) => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        + {t('New Listing')}
      </button>
      <ListingForm open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Entry modal — the core "what did I change today" record.
// ---------------------------------------------------------------------------

export function EntryModal({
  open,
  onClose,
  fixedListingId,
  action,
}: {
  open: boolean;
  onClose: () => void;
  fixedListingId?: string;
  action?: Action;
}) {
  const toast = useToast();
  const { t } = useLang();
  const listings = useLiveQuery(() => getDB().listings.orderBy('updatedAt').reverse().toArray(), [], [] as Listing[]);
  const editing = !!action;

  const [listingId, setListingId] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [date, setDate] = useState(todayISO());
  const [showNew, setShowNew] = useState(false);

  const key = (action?.id ?? 'new') + (fixedListingId ?? '');
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && key !== lastKey) {
    setLastKey(key);
    setListingId(action?.listingId ?? fixedListingId ?? '');
    setTypes(action?.types ?? (action?.type ? [action.type] : []));
    setNote(action?.reason ?? '');
    setLinkUrl(action?.linkUrl ?? '');
    setLinkName(action?.linkName ?? '');
    setImageUrl(action?.imageUrl ?? '');
    setDate(action?.date ?? todayISO());
  }
  if (!open && lastKey !== null) setLastKey(null);

  function toggleType(x: string) {
    setTypes((cur) => (cur.includes(x) ? cur.filter((c) => c !== x) : [...cur, x]));
  }

  async function submit() {
    const lid = fixedListingId ?? listingId;
    if (!lid) {
      toast(t('Pick a listing first'), 'danger');
      return;
    }
    if (types.length === 0 && !note.trim()) {
      toast(t('Tick what changed, or write a note'), 'danger');
      return;
    }
    if (editing && action) {
      await updateAction(action.id, {
        date,
        types,
        reason: note.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        linkName: linkName.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });
      toast(t('Saved'), 'positive');
    } else {
      await addAction({
        listingId: lid,
        date,
        types,
        reason: note.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        linkName: linkName.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
      });
      const n = await countTodayRecords();
      toast(`${t('Recorded')} · ${t('#{n} today').replace('{n}', String(n))}`, 'positive');
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('Edit entry') : t('Record a change')}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn-primary" onClick={submit}>
            {editing ? t('Save') : t('Record')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {!fixedListingId && (
          <Field label={t('Listing')}>
            <div className="flex gap-2">
              <select className="input" value={listingId} onChange={(e) => setListingId(e.target.value)}>
                <option value="">{t('— select —')}</option>
                {(listings ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.listingName}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-outline shrink-0" onClick={() => setShowNew(true)}>
                + {t('New')}
              </button>
            </div>
          </Field>
        )}

        <Field label={t('What changed')} hint={t('Tick any that apply')}>
          <div className="flex flex-wrap gap-1.5">
            {ACTION_TYPES.map((x) => (
              <button key={x} type="button" onClick={() => toggleType(x)} className={types.includes(x) ? 'btn-primary btn-xs' : 'btn-outline btn-xs'}>
                {x}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('Note')}>
          <textarea
            className="input min-h-[64px]"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('What did you change and why…')}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t('Link name')} className="col-span-1">
            <input className="input" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder={t('e.g. new main image')} />
          </Field>
          <Field label={t('Link (URL)')} className="col-span-2">
            <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <Field label={t('Image (optional)')}>
          <ImagePicker value={imageUrl} onChange={setImageUrl} />
        </Field>

        <Field label={t('Date')}>
          <DateInput value={date} onChange={setDate} />
        </Field>
      </div>

      <ListingForm
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(l) => {
          setListingId(l.id);
          setShowNew(false);
        }}
      />
    </Modal>
  );
}

/** Global "+ Record" button (no preselected listing). */
export function AddEntryButton({ className = 'btn-primary' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        + {t('Record')}
      </button>
      <EntryModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** "+ Record" button bound to one listing. */
export function RecordButton({ listingId, className = 'btn-primary btn-xs' }: { listingId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        + {t('Record')}
      </button>
      <EntryModal open={open} onClose={() => setOpen(false)} fixedListingId={listingId} />
    </>
  );
}
