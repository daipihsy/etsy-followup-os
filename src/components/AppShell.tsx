'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDB } from '@/lib/db';
import { loadDemoData } from '@/lib/demo';
import { updateSettings } from '@/lib/repo';
import { cx } from '@/lib/util';
import { NewListingButton } from './forms';
import { LangProvider, LangToggle, useLang } from './lang';
import { SyncManager } from './SyncManager';
import { ToastProvider, useToast } from './ui';

const NAV = [
  { href: '/', label: 'Today', icon: '◆' },
  { href: '/dashboard', label: 'Dashboard', icon: '▤' },
  { href: '/pipeline', label: 'Pipeline', icon: '▥' },
  { href: '/experiments', label: 'Experiments', icon: '⚗' },
  { href: '/analytics', label: 'Analytics', icon: '▦' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

function normalize(path: string): string {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function ThemeToggle() {
  const { t } = useLang();
  const [dark, setDark] = useState(true);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('efos-theme', next ? 'dark' : 'light');
    } catch {}
    updateSettings({ theme: next ? 'dark' : 'light' });
  }
  return (
    <button className="btn-ghost btn-xs w-full justify-start" onClick={toggle} title="Toggle theme">
      <span className="w-4 text-center">{dark ? '☾' : '☀'}</span>
      {dark ? t('Dark mode') : t('Light mode')}
    </button>
  );
}

function FirstRunPrompt() {
  const toast = useToast();
  const { t } = useLang();
  const count = useLiveQuery(() => getDB().listings.count(), []);
  const settings = useLiveQuery(() => getDB().settings.get('app'), []);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only prompt on a truly empty database that hasn't loaded demo before.
  if (count === undefined || count > 0 || dismissed || settings?.demoLoaded) return null;

  async function load() {
    setBusy(true);
    await loadDemoData();
    await updateSettings({ demoLoaded: true });
    setBusy(false);
    toast('Demo data loaded', 'positive');
  }

  return (
    <div className="mb-4 card border-accent/40 bg-accent/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{t('Welcome to Etsy Listing Follow-up OS')}</p>
        <p className="text-xs text-muted">
          {t(
            'Your database is empty. Load a sample pool of listings to explore every feature, or add your first listing.',
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <button className="btn-outline btn-xs" onClick={() => setDismissed(true)}>
          {t('Start empty')}
        </button>
        <button className="btn-primary btn-xs" onClick={load} disabled={busy}>
          {busy ? t('Loading…') : t('Load Demo Data')}
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = normalize(usePathname() || '/');
  const { t } = useLang();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-4 py-4 border-b border-border">
          <div className="text-sm font-semibold leading-tight">{t('Etsy Follow-up')}</div>
          <div className="text-2xs text-muted">{t('Listing Operations OS')}</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-accent/15 text-accent font-medium' : 'text-muted hover:text-fg hover:bg-surface-2',
                )}
              >
                <span className="w-4 text-center opacity-80">{item.icon}</span>
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 py-3 border-t border-border space-y-1.5">
          <SyncManager />
          <LangToggle />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'shrink-0 rounded px-2.5 py-1 text-xs',
                active ? 'bg-accent/15 text-accent font-medium' : 'text-muted',
              )}
            >
              {t(item.label)}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-12">
        <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
          <FirstRunPrompt />
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </LangProvider>
  );
}

/** Page header used across routes. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions ?? <NewListingButton />}</div>
    </div>
  );
}
