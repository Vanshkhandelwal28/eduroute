import { TrendingUp, Briefcase } from 'lucide-react';
import type { PlacementChanceResult } from '../utils/placementChance';

type Props = {
  result: PlacementChanceResult;
  compact?: boolean;
  className?: string;
};

/**
 * Shows real skill-match lift only — no fabricated placement names.
 */
export function PlacementChanceStrip({ result, compact = false, className = '' }: Props) {
  const { boostPercent, chancePercent, matchedSkills, roleHints, hasProfile } = result;

  if (!hasProfile && boostPercent === 0) {
    return (
      <div className={`rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 ${className}`}>
        Complete skill quiz for a real placement-chance score on this course.
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        {boostPercent > 0
          ? `High placement chance by +${boostPercent}%`
          : `Skill fit ${chancePercent}%`}
      </div>
      {!compact && matchedSkills.length > 0 && (
        <p className="text-[11px] text-[var(--text-secondary)]">
          Matched skills: <span className="font-semibold text-[var(--text-primary)]">{matchedSkills.slice(0, 6).join(', ')}</span>
        </p>
      )}
      {!compact && roleHints.length > 0 && (
        <ul className="space-y-0.5">
          {roleHints.slice(0, 2).map((h) => (
            <li key={h.role} className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
              <span>
                Roles for these skills: <span className="font-semibold text-[var(--text-primary)]">{h.role}</span>
                {' · '}
                {h.viaSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
