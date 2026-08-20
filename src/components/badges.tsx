'use client';

import { Badge, type BadgeTone } from './ui';
import { useLang } from './lang';
import type { AgeStage } from '@/lib/date';
import type { ExperimentStatus, ListingStatus, Priority } from '@/lib/types';

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  New: 'neutral',
  Observe: 'info',
  Signal: 'info',
  Testing: 'warning',
  'Follow-up': 'accent',
  Growing: 'positive',
  Scale: 'positive',
  Winner: 'positive',
  Hold: 'neutral',
  Dropped: 'danger',
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const { t } = useLang();
  return <Badge tone={STATUS_TONE[status]}>{t(status)}</Badge>;
}

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  1: 'neutral',
  2: 'neutral',
  3: 'info',
  4: 'warning',
  5: 'danger',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} title={`Priority ${priority} of 5`}>
      P{priority}
    </Badge>
  );
}

const AGE_TONE: Record<AgeStage, BadgeTone> = {
  New: 'accent',
  Early: 'info',
  Growing: 'positive',
  Mature: 'neutral',
};

export function AgeBadge({ stage, days }: { stage: AgeStage; days: number }) {
  const { t } = useLang();
  return (
    <Badge tone={AGE_TONE[stage]} title={`${stage} stage`}>
      {days}d · {t(stage)}
    </Badge>
  );
}

export function AdBadge({ enabled, strategy }: { enabled: boolean; strategy?: string }) {
  const { t } = useLang();
  if (!enabled) return <Badge tone="neutral">{t('Ads off')}</Badge>;
  return (
    <Badge tone="info" title={strategy}>
      {t('Ads')} · {strategy ?? 'on'}
    </Badge>
  );
}

const EXP_TONE: Record<ExperimentStatus, BadgeTone> = {
  Planned: 'neutral',
  Running: 'warning',
  Positive: 'positive',
  Neutral: 'info',
  Negative: 'danger',
  Cancelled: 'neutral',
};

export function ExperimentBadge({ status }: { status: ExperimentStatus }) {
  const { t } = useLang();
  return <Badge tone={EXP_TONE[status]}>{t(status)}</Badge>;
}
