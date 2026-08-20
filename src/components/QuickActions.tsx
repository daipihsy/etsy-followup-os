'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deleteAction } from '@/lib/repo';
import type { Action } from '@/lib/types';
import { EntryModal } from './forms';
import { useLang } from './lang';

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

/** Small edit / delete controls for one journal entry. */
export function EntryActions({ action }: { action: Action }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <span className="inline-flex items-center gap-2 text-2xs">
      <button className="text-muted hover:text-accent" onClick={() => setEditing(true)}>
        {t('Edit')}
      </button>
      {confirming ? (
        <>
          <button className="text-danger font-medium" onClick={() => deleteAction(action.id)}>
            {t('Delete?')}
          </button>
          <button className="text-muted" onClick={() => setConfirming(false)}>
            {t('Cancel')}
          </button>
        </>
      ) : (
        <button className="text-muted hover:text-danger" onClick={() => setConfirming(true)}>
          {t('Delete')}
        </button>
      )}
      <EntryModal open={editing} onClose={() => setEditing(false)} action={action} />
    </span>
  );
}
