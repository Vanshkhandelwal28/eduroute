import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Lightweight shell — full designer module is large; this keeps /ai-course-designer deployable.
 * Placement chance for mixed paths is available on Browse + Course detail via the same util.
 */
export function AiCourseDesigner() {
  const navigate = useNavigate();

  useEffect(() => {
    // Route stays protected under MainLayout
  }, []);

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">AI Course Designer</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Build a mixed learning path from your skills. Real placement-chance scores use the same skill-match engine as course cards.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Browse courses (placement chance)
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-full border border-[var(--border-default)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)]"
        >
          Dashboard skill analysis
        </button>
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Tip: complete the skill quiz so “High placement chance by +X%” is computed from your profile, not guesses.
      </p>
    </div>
  );
}

export default AiCourseDesigner;
