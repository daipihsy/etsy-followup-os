'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { SyncPanel } from '@/components/SyncManager';
import { useLang } from '@/components/lang';
import { ConfirmButton, useToast } from '@/components/ui';
import { loadDemoData } from '@/lib/demo';
import { getDB } from '@/lib/db';
import {
  exportBackup,
  importBackup,
  updateSettings,
  validateBackup,
  wipeAll,
  type ImportMode,
} from '@/lib/repo';
import { todayISO } from '@/lib/date';
import type { BackupData } from '@/lib/types';

export default function SettingsPage() {
  const { t } = useLang();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [counts, setCounts] = useState<{ listings: number; actions: number } | null>(null);

  useEffect(() => {
    const db = getDB();
    Promise.all([db.listings.count(), db.actions.count()]).then(([listings, actions]) =>
      setCounts({ listings, actions }),
    );
  }, [pendingImport]);

  async function doExport() {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etsy-journal-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t('Backup exported'), 'positive');
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!validateBackup(data)) {
        toast(t('Invalid backup file'), 'danger');
        return;
      }
      setPendingImport(data);
    } catch {
      toast(t('Could not read file'), 'danger');
    }
  }

  async function runImport(mode: ImportMode) {
    if (!pendingImport) return;
    await importBackup(pendingImport, mode);
    setPendingImport(null);
    toast(t('Imported'), 'positive');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={t('Settings')} actions={<span />} />

      {/* Cloud sync */}
      <SyncPanel />

      {/* Data */}
      <section className="card p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">{t('Data & Backup')}</h2>
        <p className="text-xs text-muted mb-3">
          {t('Everything is stored only in this browser. Export a backup now and then.')}
          {counts && ` · ${counts.listings} ${t('listings')}, ${counts.actions} ${t('entries')}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-xs" onClick={doExport}>
            {t('Export backup (JSON)')}
          </button>
          <button className="btn-outline btn-xs" onClick={() => fileRef.current?.click()}>
            {t('Import backup…')}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          <ConfirmButton
            className="btn-outline btn-xs"
            title={t('Load sample data')}
            message={t('This adds some sample listings and entries so you can see how it works. Continue?')}
            confirmLabel={t('Load')}
            onConfirm={async () => {
              await loadDemoData();
              await updateSettings({ demoLoaded: true });
              toast(t('Sample data loaded'), 'positive');
            }}
          >
            {t('Load sample data')}
          </ConfirmButton>
          <ConfirmButton
            className="btn-danger btn-xs ml-auto"
            title={t('Reset all data')}
            message={t('This permanently deletes ALL listings and entries in this browser. Export a backup first. This cannot be undone.')}
            confirmLabel={t('Delete everything')}
            danger
            onConfirm={async () => {
              await wipeAll();
              toast(t('All data reset'), 'danger');
            }}
          >
            {t('Reset all data')}
          </ConfirmButton>
        </div>
      </section>

      {pendingImport && (
        <div className="card p-4 border-accent/40">
          <h3 className="text-sm font-semibold">{t('Import backup')}</h3>
          <p className="text-xs text-muted mt-1">
            {pendingImport.listings.length} {t('listings')}, {pendingImport.actions.length} {t('entries')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary btn-xs" onClick={() => runImport('merge')}>
              {t('Merge')}
            </button>
            <ConfirmButton
              className="btn-danger btn-xs"
              title={t('Replace all data')}
              message={t('Replace wipes your current data and loads only the backup. This cannot be undone. Continue?')}
              confirmLabel={t('Replace')}
              danger
              onConfirm={() => runImport('replace')}
            >
              {t('Replace')}
            </ConfirmButton>
            <button className="btn-ghost btn-xs" onClick={() => setPendingImport(null)}>
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-2xs text-muted">
        {t('Language: use the EN / 中文 switch at the bottom of the sidebar.')}
      </p>
    </div>
  );
}
