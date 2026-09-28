/**
 * Empty / loading coach UI — short guide line + one next action.
 * Frontend-only; no backend changes.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Loader2, Sparkles } from 'lucide-react';

type Props = {
  title: string;
  tip: string;
  /** Primary next step label */
  actionLabel?: string;
  /** Internal route */
  actionTo?: string;
  /** External or button click */
  onAction?: () => void;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function EmptyCoach({
  title,
  tip,
  actionLabel,
  actionTo,
  onAction,
  loading,
  icon,
  className = '',
}: Props) {
  const btnClass = 'er-cta-primary !text-xs !px-4 !py-2';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-elevated)]/40 px-5 py-10 text-center ${className}`}
      role={loading ? 'status' : undefined}
    >
      <div className="flex items-center justify-center gap-2 text-indigo-500/80 dark:text-indigo-300/90">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin opacity-70" aria-hidden />
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20">
              {icon || <Compass className="h-5 w-5" aria-hidden />}
            </span>
            <Sparkles className="h-4 w-4 opacity-60" aria-hidden />
          </>
        )}
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tip}</p>
      </div>
      {actionLabel && (actionTo || onAction) && !loading && (
        actionTo ? (
          <Link to={actionTo} className={btnClass}>
            {actionLabel}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={btnClass}>
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

export default EmptyCoach;
