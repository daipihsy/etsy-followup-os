'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getDB } from '@/lib/db';
import {
  clearSyncConfig,
  getStatus,
  getSyncConfig,
  isConfigured,
  pullBackup,
  pushBackup,
  setSyncConfig,
  testConnection,
  type SyncConfig,
} from '@/lib/sync';
import { agoLabel } from '@/lib/date';
import { cx } from '@/lib/util';
import { ConfirmButton, Field, useToast } from './ui';

// A stable fingerprint of the whole database — changes whenever data changes.
async function fingerprint(): Promise<string> {
  const db = getDB();
  const [listings, experiments, aC, sC, rC] = await Promise.all([
    db.listings.toArray(),
    db.experiments.toArray(),
    db.actions.count(),
    db.snapshots.count(),
    db.reviews.count(),
  ]);
  const maxL = listings.reduce((m, x) => (x.updatedAt > m ? x.updatedAt : m), '');
  const maxE = experiments.reduce((m, x) => (x.updatedAt > m ? x.updatedAt : m), '');
  return `${listings.length}/${aC}/${sC}/${experiments.length}/${rC}|${maxL}|${maxE}`;
}

// ---------------------------------------------------------------------------
// SyncManager: auto pull-on-open + debounced push-on-change. Renders a compact
// status line (used in the sidebar footer).
// ---------------------------------------------------------------------------

export function SyncManager() {
  const fp = useLiveQuery(fingerprint, []);
  const readyRef = useRef(false);
  const baselineRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  // On open: if auto sync is on, pull the latest, then set the baseline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = getSyncConfig();
      if (cfg.auto && isConfigured(cfg)) {
        try {
          await pullBackup(cfg, 'replace');
        } catch {
          /* error is recorded in status */
        }
      }
      if (!cancelled) {
        baselineRef.current = await fingerprint();
        readyRef.current = true;
        rerender();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // On change: debounce a push.
  useEffect(() => {
    if (fp === undefined || !readyRef.current) return;
    if (baselineRef.current === null) {
      baselineRef.current = fp;
      return;
    }
    if (fp === baselineRef.current) return;
    const cfg = getSyncConfig();
    if (!(cfg.auto && isConfigured(cfg))) {
      baselineRef.current = fp;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await pushBackup(cfg);
        baselineRef.current = fp;
      } catch {
        /* recorded in status */
      }
      rerender();
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fp]);

  const cfg = getSyncConfig();
  if (!isConfigured(cfg) || !cfg.auto) return null;
  const status = getStatus();
  return (
    <div className="px-3 pb-1 text-2xs text-muted">
      <span className={cx('inline-block h-1.5 w-1.5 rounded-full mr-1', status.lastError ? 'bg-danger' : 'bg-positive')} />
      {status.lastError ? 'Sync error' : status.lastSyncedAt ? `Synced ${agoLabel(status.lastSyncedAt.slice(0, 10))}` : 'Sync ready'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SyncPanel: the configuration + manual controls, used on the Settings page.
// ---------------------------------------------------------------------------

export function SyncPanel() {
  const toast = useToast();
  const [cfg, setCfg] = useState<SyncConfig>(getSyncConfig());
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatusState] = useState(getStatus());

  const refresh = useCallback(() => setStatusState(getStatus()), []);
  useEffect(() => {
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const set = (patch: Partial<SyncConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const configured = isConfigured(cfg);

  function save() {
    setSyncConfig(cfg);
    toast('Sync settings saved', 'positive');
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sync failed', 'danger');
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <section className="card p-4 mb-4">
      <h2 className="text-sm font-semibold mb-1">Cloud Sync (GitHub)</h2>
      <p className="text-xs text-muted mb-3">
        Mirror your data as a JSON file in a <strong>private</strong> GitHub repo so it follows you across devices.
        Your token is stored only in this browser and sent only to GitHub. Use a{' '}
        <a
          href="https://github.com/settings/tokens?type=beta"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          fine-grained token
        </a>{' '}
        scoped to just the data repo with <strong>Contents: Read and write</strong>.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Owner">
          <input className="input" value={cfg.owner} onChange={(e) => set({ owner: e.target.value.trim() })} placeholder="your-username" />
        </Field>
        <Field label="Data repo">
          <input className="input" value={cfg.repo} onChange={(e) => set({ repo: e.target.value.trim() })} placeholder="etsy-followup-data" />
        </Field>
        <Field label="Branch">
          <input className="input" value={cfg.branch} onChange={(e) => set({ branch: e.target.value.trim() })} />
        </Field>
        <Field label="File path">
          <input className="input" value={cfg.path} onChange={(e) => set({ path: e.target.value.trim() })} />
        </Field>
      </div>
      <Field label="GitHub token" className="mt-3" hint="Fine-grained PAT · Contents Read/Write · this repo only. Stored locally.">
        <input
          type="password"
          className="input font-mono"
          value={cfg.token}
          onChange={(e) => set({ token: e.target.value.trim() })}
          placeholder="github_pat_…"
          autoComplete="off"
        />
      </Field>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={cfg.auto} onChange={(e) => set({ auto: e.target.checked })} />
        Auto-sync — pull on open, push after changes
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-primary btn-xs" onClick={save}>
          Save
        </button>
        <button
          className="btn-outline btn-xs"
          disabled={!configured || !!busy}
          onClick={() =>
            run('test', async () => {
              const r = await testConnection(cfg);
              toast(r === 'ok-exists' ? 'Connected — remote data found' : 'Connected — no data file yet', 'positive');
            })
          }
        >
          {busy === 'test' ? 'Testing…' : 'Test connection'}
        </button>
        <button
          className="btn-outline btn-xs"
          disabled={!configured || !!busy}
          onClick={() =>
            run('push', async () => {
              await pushBackup(cfg);
              toast('Pushed to GitHub', 'positive');
            })
          }
        >
          {busy === 'push' ? 'Pushing…' : 'Push now →'}
        </button>
        <ConfirmButton
          className="btn-outline btn-xs"
          title="Pull & replace"
          message="Download the GitHub copy and REPLACE all local data with it. Local changes not yet pushed will be lost. Continue?"
          confirmLabel="Pull & replace"
          danger
          onConfirm={() =>
            run('pull', async () => {
              const r = await pullBackup(cfg, 'replace');
              toast(r === 'empty' ? 'No remote data yet' : 'Pulled from GitHub', 'positive');
            })
          }
        >
          ← Pull (replace)
        </ConfirmButton>
        <button
          className="btn-ghost btn-xs"
          disabled={!configured || !!busy}
          onClick={() =>
            run('pullm', async () => {
              const r = await pullBackup(cfg, 'merge');
              toast(r === 'empty' ? 'No remote data yet' : 'Merged from GitHub', 'positive');
            })
          }
        >
          ← Pull (merge)
        </button>
        {configured && (
          <ConfirmButton
            className="btn-ghost btn-xs text-danger ml-auto"
            title="Disconnect sync"
            message="Remove the sync settings and token from this browser? Your GitHub data file is left untouched."
            confirmLabel="Disconnect"
            danger
            onConfirm={() => {
              clearSyncConfig();
              setCfg(getSyncConfig());
              toast('Sync disconnected', 'neutral');
            }}
          >
            Disconnect
          </ConfirmButton>
        )}
      </div>

      <div className="mt-2 text-2xs text-muted">
        {status.lastError ? (
          <span className="text-danger">Last error: {status.lastError}</span>
        ) : status.lastSyncedAt ? (
          <>Last {status.lastDirection === 'pull' ? 'pulled' : 'pushed'}: {new Date(status.lastSyncedAt).toLocaleString()}</>
        ) : (
          'Not synced yet.'
        )}
      </div>
      <p className="mt-2 text-2xs text-muted">
        Tip: with auto-sync, edit on one device at a time. Whichever device pushes last wins. Keep occasional JSON
        exports as a hard backup.
      </p>
    </section>
  );
}
