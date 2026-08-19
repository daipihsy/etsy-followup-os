// ============================================================================
// GitHub-backed cross-device sync.
//
// The app stores its data in IndexedDB (local to one browser). This module
// mirrors that data as a single JSON file committed to a PRIVATE GitHub repo
// via the Contents API, so the same data can be pulled on another device —
// the "Obsidian git sync" model, but for this app's database.
//
// The user supplies a fine-grained Personal Access Token (Contents: R/W on the
// data repo only). It is stored in localStorage on their device and sent only
// to api.github.com in the Authorization header — never in a URL or to any
// other host.
// ============================================================================

import { exportBackup, importBackup, validateBackup, type ImportMode } from './repo';

export interface SyncConfig {
  owner: string;
  repo: string;
  path: string;
  branch: string;
  token: string;
  auto: boolean;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  lastSha: string | null;
  lastError: string | null;
  lastDirection: 'push' | 'pull' | null;
}

const CONFIG_KEY = 'efos-sync';
const STATUS_KEY = 'efos-sync-status';

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  owner: '',
  repo: '',
  path: 'etsy-followup-data.json',
  branch: 'main',
  token: '',
  auto: false,
};

export function getSyncConfig(): SyncConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SYNC_CONFIG };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_SYNC_CONFIG };
    return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function setSyncConfig(cfg: SyncConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearSyncConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(STATUS_KEY);
}

export function isConfigured(cfg: SyncConfig = getSyncConfig()): boolean {
  return Boolean(cfg.owner && cfg.repo && cfg.path && cfg.branch && cfg.token);
}

export function getStatus(): SyncStatus {
  if (typeof window === 'undefined') return { lastSyncedAt: null, lastSha: null, lastError: null, lastDirection: null };
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return { lastSyncedAt: null, lastSha: null, lastError: null, lastDirection: null };
    return JSON.parse(raw);
  } catch {
    return { lastSyncedAt: null, lastSha: null, lastError: null, lastDirection: null };
  }
}

function setStatus(patch: Partial<SyncStatus>): void {
  const next = { ...getStatus(), ...patch };
  localStorage.setItem(STATUS_KEY, JSON.stringify(next));
}

// ---- UTF-8 safe base64 (notes may contain Chinese etc.) ----
function encodeB64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}
function decodeB64(b64: string): string {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
}

function apiUrl(cfg: SyncConfig): string {
  return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(
    cfg.repo,
  )}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}`;
}

function headers(cfg: SyncConfig): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j.message ? `${res.status} ${j.message}` : `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** Fetch the remote file. Returns null if it does not exist yet (404). */
export async function fetchRemote(
  cfg: SyncConfig,
): Promise<{ sha: string; json: unknown } | null> {
  const res = await fetch(`${apiUrl(cfg)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json();
  const content = decodeB64(data.content ?? '');
  let json: unknown = null;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error('Remote file is not valid JSON.');
  }
  return { sha: data.sha as string, json };
}

/** Verify credentials/repo by attempting a metadata read. Throws on failure. */
export async function testConnection(cfg: SyncConfig): Promise<'ok-empty' | 'ok-exists'> {
  const remote = await fetchRemote(cfg);
  return remote ? 'ok-exists' : 'ok-empty';
}

/** Upload the entire local database as the JSON file (create or update). */
export async function pushBackup(cfg: SyncConfig): Promise<string> {
  const backup = await exportBackup();
  const body = JSON.stringify(backup, null, 2);
  // Get the current sha (required to update an existing file).
  let sha: string | undefined;
  try {
    const remote = await fetchRemote(cfg);
    sha = remote?.sha;
  } catch {
    sha = undefined;
  }
  const res = await fetch(apiUrl(cfg), {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Sync from Etsy Follow-up OS — ${new Date().toISOString()}`,
      content: encodeB64(body),
      branch: cfg.branch,
      sha,
    }),
  });
  if (!res.ok) {
    const msg = await readError(res);
    setStatus({ lastError: msg });
    throw new Error(msg);
  }
  const data = await res.json();
  const newSha = data.content?.sha ?? null;
  setStatus({ lastSyncedAt: new Date().toISOString(), lastSha: newSha, lastError: null, lastDirection: 'push' });
  return newSha;
}

/** Download the remote JSON and import it (merge or replace). */
export async function pullBackup(cfg: SyncConfig, mode: ImportMode): Promise<'empty' | 'done'> {
  const remote = await fetchRemote(cfg);
  if (!remote) {
    setStatus({ lastError: null });
    return 'empty';
  }
  if (!validateBackup(remote.json)) {
    const msg = 'Remote file is not a valid backup.';
    setStatus({ lastError: msg });
    throw new Error(msg);
  }
  await importBackup(remote.json, mode);
  setStatus({ lastSyncedAt: new Date().toISOString(), lastSha: remote.sha, lastError: null, lastDirection: 'pull' });
  return 'done';
}
