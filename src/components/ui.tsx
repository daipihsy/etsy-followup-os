'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cx } from '@/lib/util';

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type BadgeTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-fg border-border',
  accent: 'bg-accent/15 text-accent border-accent/30',
  positive: 'bg-positive/15 text-positive border-positive/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  tone = 'neutral',
  hint,
  onClick,
  active,
}: {
  label: string;
  value: React.ReactNode;
  tone?: BadgeTone;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneText: Record<BadgeTone, string> = {
    neutral: 'text-fg',
    accent: 'text-accent',
    positive: 'text-positive',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cx(
        'card px-3 py-2.5 text-left flex flex-col gap-0.5 min-w-[7rem]',
        onClick && 'hover:border-accent/50 transition-colors cursor-pointer',
        active && 'border-accent ring-1 ring-accent',
      )}
    >
      <span className="text-2xs uppercase tracking-wide text-muted">{label}</span>
      <span className={cx('text-2xl font-semibold tnum leading-none', toneText[tone])}>{value}</span>
      {hint && <span className="text-2xs text-muted mt-0.5">{hint}</span>}
    </Comp>
  );
}

// ---------------------------------------------------------------------------
// Metric (label + value stacked)
// ---------------------------------------------------------------------------

export function Metric({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const toneText: Record<BadgeTone, string> = {
    neutral: 'text-fg',
    accent: 'text-accent',
    positive: 'text-positive',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  return (
    <div className={cx('flex flex-col', className)}>
      <span className="text-2xs uppercase tracking-wide text-muted">{label}</span>
      <span className={cx('text-sm font-semibold tnum', tone ? toneText[tone] : 'text-fg')}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          'relative z-10 my-4 w-full card shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-xs" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-4 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form field wrapper
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-2xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control (radio-style pills)
// ---------------------------------------------------------------------------

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  icon = '◎',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="text-3xl opacity-40">{icon}</div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  tone: BadgeTone;
}
const ToastCtx = createContext<(message: string, tone?: BadgeTone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((message: string, tone: BadgeTone = 'neutral') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'card px-3 py-2 text-sm shadow-lg animate-[fadein_.15s_ease-out]',
              t.tone === 'positive' && 'border-positive/40',
              t.tone === 'danger' && 'border-danger/40',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// ---------------------------------------------------------------------------
// Confirm dialog hook (returns a component + trigger)
// ---------------------------------------------------------------------------

export function ConfirmButton({
  onConfirm,
  children,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  className,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <button className="btn-outline" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className={danger ? 'btn-danger' : 'btn-primary'}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">{message}</p>
      </Modal>
    </>
  );
}
