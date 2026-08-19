'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { ConfirmButton, Field, useToast } from '@/components/ui';
import { loadDemoData } from '@/lib/demo';
import { getDB } from '@/lib/db';
import { useAppData } from '@/hooks/useData';
import {
  exportBackup,
  importBackup,
  updateSettings,
  validateBackup,
  wipeAll,
  type ImportMode,
} from '@/lib/repo';
import { todayISO } from '@/lib/date';
import { parseNum } from '@/lib/util';
import type { BackupData, Settings } from '@/lib/types';

export default function SettingsPage() {
  const { settings } = useAppData();
  const toast = useToast();
  const [form, setForm] = useState<Settings>(settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);

  // Keep the form in sync once settings load.
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const set = (patch: Partial<Settings>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    await updateSettings(form);
    try {
      localStorage.setItem('efos-theme', form.theme);
    } catch {}
    document.documentElement.classList.toggle('dark', form.theme === 'dark');
    toast('Settings saved', 'positive');
  }

  async function doExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etsy-followup-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Backup exported', 'positive');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validateBackup(data)) {
        toast('Invalid backup file', 'danger');
        return;
      }
      setPendingImport(data);
    } catch {
      toast('Could not read file', 'danger');
    }
  }

  async function runImport(mode: ImportMode) {
    if (!pendingImport) return;
    await importBackup(pendingImport, mode);
    setPendingImport(null);
    toast(`Imported (${mode})`, 'positive');
  }

  async function counts() {
    const db = getDB();
    return {
      listings: await db.listings.count(),
      actions: await db.actions.count(),
      snapshots: await db.snapshots.count(),
      experiments: await db.experiments.count(),
    };
  }
  const [dbCounts, setDbCounts] = useState<{ listings: number; actions: number; snapshots: number; experiments: number } | null>(null);
  useEffect(() => {
    counts().then(setDbCounts);
  }, [settings]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        actions={
          <button className="btn-primary" onClick={save}>
            Save Settings
          </button>
        }
      />

      {/* Thresholds */}
      <section className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Signal Thresholds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Positive CTR %" hint="Default 2.5">
            <input type="number" step="0.1" className="input" value={form.positiveCtrThreshold} onChange={(e) => set({ positiveCtrThreshold: parseNum(e.target.value) ?? 0 })} />
          </Field>
          <Field label="Positive CVR %">
            <input type="number" step="0.1" className="input" value={form.positiveCvrThreshold} onChange={(e) => set({ positiveCvrThreshold: parseNum(e.target.value) ?? 0 })} />
          </Field>
          <Field label="Positive ROAS" hint="Default 2.5">
            <input type="number" step="0.1" className="input" value={form.positiveRoasThreshold} onChange={(e) => set({ positiveRoasThreshold: parseNum(e.target.value) ?? 0 })} />
          </Field>
          <Field label="Untouched Warning (days)" hint="Default 5">
            <input type="number" className="input" value={form.untouchedWarningDays} onChange={(e) => set({ untouchedWarningDays: parseNum(e.target.value) ?? 0 })} />
          </Field>
          <Field label="Default Review Interval (days)" hint="Default 3">
            <input type="number" className="input" value={form.defaultReviewIntervalDays} onChange={(e) => set({ defaultReviewIntervalDays: parseNum(e.target.value) ?? 0 })} />
          </Field>
        </div>
      </section>

      {/* Matrix thresholds */}
      <section className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">Product Matrix Quadrants</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matrix CTR threshold %">
            <input type="number" step="0.1" className="input" value={form.matrixCtrThreshold} onChange={(e) => set({ matrixCtrThreshold: parseNum(e.target.value) ?? 0 })} />
          </Field>
          <Field label="Matrix CVR threshold %">
            <input type="number" step="0.1" className="input" value={form.matrixCvrThreshold} onChange={(e) => set({ matrixCvrThreshold: parseNum(e.target.value) ?? 0 })} />
          </Field>
        </div>
      </section>

      {/* General */}
      <section className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">General</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Currency">
            <select className="input" value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Default Shop">
            <input className="input" value={form.defaultShop} onChange={(e) => set({ defaultShop: e.target.value })} />
          </Field>
          <Field label="Theme">
            <select className="input" value={form.theme} onChange={(e) => set({ theme: e.target.value as 'light' | 'dark' })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Data */}
      <section className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">Data & Backup</h2>
        <p className="text-xs text-muted mb-3">
          All data lives only in this browser (IndexedDB). It is not synced anywhere — export regularly.
          {dbCounts && (
            <> Currently storing {dbCounts.listings} listings, {dbCounts.actions} actions, {dbCounts.snapshots} snapshots, {dbCounts.experiments} experiments.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-xs" onClick={doExport}>
            Export All Data (JSON)
          </button>
          <button className="btn-outline btn-xs" onClick={() => fileRef.current?.click()}>
            Import Backup…
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          <ConfirmButton
            className="btn-outline btn-xs"
            title="Load demo data"
            message="This adds ~15 sample listings to your database. Continue?"
            confirmLabel="Load demo"
            onConfirm={async () => {
              await loadDemoData();
              await updateSettings({ demoLoaded: true });
              toast('Demo data loaded', 'positive');
            }}
          >
            Load Demo Data
          </ConfirmButton>
          <ConfirmButton
            className="btn-danger btn-xs ml-auto"
            title="Reset all data"
            message="This permanently deletes ALL listings, actions, snapshots, experiments and reviews from this browser. Export a backup first. This cannot be undone."
            confirmLabel="Delete everything"
            danger
            onConfirm={async () => {
              await wipeAll();
              toast('All data reset', 'danger');
            }}
          >
            Reset All Data
          </ConfirmButton>
        </div>
      </section>

      {/* Import mode chooser */}
      {pendingImport && (
        <div className="card p-4 border-accent/40">
          <h3 className="text-sm font-semibold">Import backup</h3>
          <p className="text-xs text-muted mt-1">
            Loaded {pendingImport.listings.length} listings, {pendingImport.actions.length} actions,{' '}
            {pendingImport.snapshots.length} snapshots, {pendingImport.experiments.length} experiments.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary btn-xs" onClick={() => runImport('merge')}>
              Merge (keep existing, add/overwrite by id)
            </button>
            <ConfirmButton
              className="btn-danger btn-xs"
              title="Replace all data"
              message="Replace wipes your current database and loads only the backup’s contents. This cannot be undone. Continue?"
              confirmLabel="Replace everything"
              danger
              onConfirm={() => runImport('replace')}
            >
              Replace (wipe then load)
            </ConfirmButton>
            <button className="btn-ghost btn-xs" onClick={() => setPendingImport(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
