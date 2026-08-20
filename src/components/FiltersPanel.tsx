'use client';

import { useState } from 'react';
import {
  EMPTY_FILTER,
  PRESETS,
  countActiveFilters,
  type FilterState,
} from '@/lib/filters';
import { AD_STRATEGIES, LISTING_STATUSES, type ListingStatus, type Priority, type AdStrategy } from '@/lib/types';
import type { AgeStage } from '@/lib/date';
import { parseNum } from '@/lib/util';
import { saveFilter, deleteSavedFilter } from '@/lib/repo';
import type { SavedFilter, Settings } from '@/lib/types';
import { Field } from './ui';
import { useLang } from './lang';
import { cx } from '@/lib/util';

const AGE_STAGES: AgeStage[] = ['New', 'Early', 'Growing', 'Mature'];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
        active ? 'bg-accent text-accent-fg border-accent' : 'border-border text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function NumRange({
  label,
  min,
  max,
  onMin,
  onMax,
  step = '1',
}: {
  label: string;
  min: number | null;
  max: number | null;
  onMin: (v: number | null) => void;
  onMax: (v: number | null) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          className="input"
          placeholder="min"
          value={min ?? ''}
          onChange={(e) => onMin(parseNum(e.target.value) ?? null)}
        />
        <span className="text-muted text-xs">–</span>
        <input
          type="number"
          step={step}
          className="input"
          placeholder="max"
          value={max ?? ''}
          onChange={(e) => onMax(parseNum(e.target.value) ?? null)}
        />
      </div>
    </Field>
  );
}

export function FiltersPanel({
  filter,
  onChange,
  shops,
  categories,
  tags,
  savedFilters,
  settings,
}: {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  shops: string[];
  categories: string[];
  tags: string[];
  savedFilters: SavedFilter[];
  settings: Settings;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const set = (patch: Partial<FilterState>) => onChange({ ...filter, ...patch });
  const activeCount = countActiveFilters(filter);

  const presetOpts = {
    ctr: settings.positiveCtrThreshold,
    cvr: settings.positiveCvrThreshold,
    roas: settings.positiveRoasThreshold,
    noAction: settings.untouchedWarningDays,
  };

  async function handleSave() {
    const name = window.prompt('Name this filter:');
    if (name && name.trim()) await saveFilter(name.trim(), filter);
  }

  return (
    <div className="card mb-3">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <input
          className="input max-w-xs"
          placeholder={t('Search name, shop, category, tag, id…')}
          value={filter.search}
          onChange={(e) => set({ search: e.target.value })}
        />
        <button className="btn-outline btn-xs" onClick={() => setOpen((v) => !v)}>
          {t('Filters')} {activeCount > 0 ? `(${activeCount})` : ''} {open ? '▴' : '▾'}
        </button>
        {activeCount > 0 && (
          <button className="btn-ghost btn-xs" onClick={() => onChange(EMPTY_FILTER)}>
            {t('Clear all')}
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <span className="text-2xs text-muted">{t('Presets:')}</span>
          {PRESETS.map((p) => (
            <button key={p.name} className="btn-ghost btn-xs" onClick={() => onChange(p.build(presetOpts))}>
              {t(p.name)}
            </button>
          ))}
        </div>
      </div>

      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5">
          <span className="text-2xs text-muted">{t('Saved:')}</span>
          {savedFilters.map((sf) => (
            <span key={sf.id} className="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs">
              <button onClick={() => onChange({ ...EMPTY_FILTER, ...(sf.filter as FilterState) })} className="hover:text-accent">
                {sf.name}
              </button>
              <button onClick={() => deleteSavedFilter(sf.id)} className="text-muted hover:text-danger" title="Delete">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border-t border-border p-3 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="label">{t('Status')}</div>
              <div className="flex flex-wrap gap-1">
                {LISTING_STATUSES.map((s) => (
                  <Chip key={s} active={filter.statuses.includes(s)} onClick={() => set({ statuses: toggle<ListingStatus>(filter.statuses, s) })}>
                    {t(s)}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="label">{t('Priority')}</div>
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <Chip key={p} active={filter.priorities.includes(p as Priority)} onClick={() => set({ priorities: toggle<Priority>(filter.priorities, p as Priority) })}>
                    P{p}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="label">{t('Age stage')}</div>
              <div className="flex flex-wrap gap-1">
                {AGE_STAGES.map((a) => (
                  <Chip key={a} active={filter.ageStages.includes(a)} onClick={() => set({ ageStages: toggle<AgeStage>(filter.ageStages, a) })}>
                    {t(a)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {(shops.length > 0 || categories.length > 0) && (
            <div className="flex flex-wrap gap-4">
              {shops.length > 0 && (
                <div>
                  <div className="label">{t('Shop')}</div>
                  <div className="flex flex-wrap gap-1">
                    {shops.map((s) => (
                      <Chip key={s} active={filter.shops.includes(s)} onClick={() => set({ shops: toggle(filter.shops, s) })}>
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {categories.length > 0 && (
                <div>
                  <div className="label">{t('Category')}</div>
                  <div className="flex flex-wrap gap-1">
                    {categories.map((c) => (
                      <Chip key={c} active={filter.categories.includes(c)} onClick={() => set({ categories: toggle(filter.categories, c) })}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div>
              <div className="label">{t('Ads')}</div>
              <div className="flex gap-1">
                {(['any', 'on', 'off'] as const).map((v) => (
                  <Chip key={v} active={filter.ad === v} onClick={() => set({ ad: v })}>
                    {v === 'any' ? t('Any') : v === 'on' ? t('On') : t('Off')}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="label">{t('Ad strategy')}</div>
              <div className="flex flex-wrap gap-1">
                {AD_STRATEGIES.map((s) => (
                  <Chip key={s} active={filter.adStrategies.includes(s)} onClick={() => set({ adStrategies: toggle<AdStrategy>(filter.adStrategies, s) })}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
            {tags.length > 0 && (
              <div>
                <div className="label">{t('Tags (all)')}</div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tg) => (
                    <Chip key={tg} active={filter.tags.includes(tg)} onClick={() => set({ tags: toggle(filter.tags, tg) })}>
                      {tg}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <NumRange label="Age (days)" min={filter.ageMin} max={filter.ageMax} onMin={(v) => set({ ageMin: v })} onMax={(v) => set({ ageMax: v })} />
            <NumRange label="CTR %" step="0.1" min={filter.ctrMin} max={filter.ctrMax} onMin={(v) => set({ ctrMin: v })} onMax={(v) => set({ ctrMax: v })} />
            <NumRange label="CVR %" step="0.1" min={filter.cvrMin} max={filter.cvrMax} onMin={(v) => set({ cvrMin: v })} onMax={(v) => set({ cvrMax: v })} />
            <NumRange label="ROAS" step="0.1" min={filter.roasMin} max={filter.roasMax} onMin={(v) => set({ roasMin: v })} onMax={(v) => set({ roasMax: v })} />
            <NumRange label="Orders" min={filter.ordersMin} max={filter.ordersMax} onMin={(v) => set({ ordersMin: v })} onMax={(v) => set({ ordersMax: v })} />
            <NumRange label="Revenue" min={filter.revenueMin} max={filter.revenueMax} onMin={(v) => set({ revenueMin: v })} onMax={(v) => set({ revenueMax: v })} />
            <Field label="No action ≥ (days)">
              <input
                type="number"
                className="input"
                value={filter.noActionDays ?? ''}
                onChange={(e) => set({ noActionDays: parseNum(e.target.value) ?? null })}
              />
            </Field>
            <Field label="Publish from">
              <input type="date" className="input" value={filter.publishFrom ?? ''} onChange={(e) => set({ publishFrom: e.target.value || null })} />
            </Field>
            <Field label="Publish to">
              <input type="date" className="input" value={filter.publishTo ?? ''} onChange={(e) => set({ publishTo: e.target.value || null })} />
            </Field>
            <Field label="Next review from">
              <input type="date" className="input" value={filter.nextReviewFrom ?? ''} onChange={(e) => set({ nextReviewFrom: e.target.value || null })} />
            </Field>
            <Field label="Next review to">
              <input type="date" className="input" value={filter.nextReviewTo ?? ''} onChange={(e) => set({ nextReviewTo: e.target.value || null })} />
            </Field>
            <Field label="Last action from">
              <input type="date" className="input" value={filter.lastActionFrom ?? ''} onChange={(e) => set({ lastActionFrom: e.target.value || null })} />
            </Field>
            <Field label="Last action to">
              <input type="date" className="input" value={filter.lastActionTo ?? ''} onChange={(e) => set({ lastActionTo: e.target.value || null })} />
            </Field>
          </div>

          <div className="flex justify-end">
            <button className="btn-outline btn-xs" onClick={handleSave}>
              {t('Save current filter')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
