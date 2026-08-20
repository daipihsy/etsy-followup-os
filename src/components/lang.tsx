'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { makeT, type Lang } from '@/lib/i18n';
import { updateSettings } from '@/lib/repo';
import { cx } from '@/lib/util';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, t: (s) => s });

function readInitial(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = localStorage.getItem('efos-lang');
    return v === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  // Read the saved preference on mount (avoids SSR/localStorage mismatch).
  useEffect(() => {
    setLangState(readInitial());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('efos-lang', l);
    } catch {}
    updateSettings({ lang: l });
  }, []);

  const t = useMemo(() => makeT(lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

/** Sidebar EN / 中文 toggle. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex gap-1">
      {(['en', 'zh'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cx(
            'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
            lang === l ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2',
          )}
        >
          {l === 'en' ? 'EN' : '中文'}
        </button>
      ))}
    </div>
  );
}
