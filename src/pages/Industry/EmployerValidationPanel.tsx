import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Check,
  ClipboardList,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { StarfieldBackground } from '../../components/StarfieldBackground';
import { RECOMMENDATIONS } from '../Admin/curriculumGapData';
import {
  ROLE_SKILL_PRESETS,
  VALIDATABLE_COURSES,
  addCourseRating,
  addSurvey,
  readCourseRatings,
  readCurriculumDecisions,
  readSkillValidations,
  readSurveys,
  setCurriculumDecision,
  upsertSkillValidation,
  type CourseRating,
  type CurriculumDecision,
  type SkillValidation,
} from '../../utils/employerValidationStore';

export function EmployerValidationPanel({ companyName = 'EduRoute Partners' }: { companyName?: string }) {
  const [ratings, setRatings] = useState<CourseRating[]>([]);
  const [skills, setSkills] = useState<SkillValidation[]>([]);
  const [decisions, setDecisions] = useState<CurriculumDecision[]>([]);
  const [surveyCount, setSurveyCount] = useState(0);

  const [courseId, setCourseId] = useState(VALIDATABLE_COURSES[0].id);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');

  const [roleTitle, setRoleTitle] = useState(ROLE_SKILL_PRESETS[0].role);
  const preset = ROLE_SKILL_PRESETS.find((r) => r.role === roleTitle) || ROLE_SKILL_PRESETS[0];

  const [survey, setSurvey] = useState({
    qHiringDifficulty: 3,
    qCurriculumRelevance: 4,
    qWouldHireAgain: 4,
    openFeedback: '',
  });
  const [savedMsg, setSavedMsg] = useState('');

  const refresh = useCallback(() => {
    setRatings(readCourseRatings());
    setSkills(readSkillValidations());
    setDecisions(readCurriculumDecisions());
    setSurveyCount(readSurveys().length);
  }, []);

  useEffect(() => {
    refresh();
    const onUp = () => refresh();
    window.addEventListener('eduroute:employer-validation-updated', onUp);
    return () => window.removeEventListener('eduroute:employer-validation-updated', onUp);
  }, [refresh]);

  const flash = (msg: string) => {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(''), 2500);
  };

  const courseName =
    VALIDATABLE_COURSES.find((c) => c.id === courseId)?.name || courseId;

  const decisionFor = (recId: string) =>
    decisions.find((d) => d.recommendationId === recId);

  const field =
    'mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/40';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)]/80 text-[var(--text-primary)] shadow-[var(--shadow-card)]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-60">
        <StarfieldBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-[var(--bg-card)]" />
      </div>

      <div className="relative z-10 space-y-6 p-5 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            SIH26134 · Employer validation
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Validate skills & courses</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Rate job-readiness of programmes, mark must-have skills, approve curriculum changes, and
            submit short surveys — feeds Demand Intelligence.
          </p>
          {savedMsg && (
            <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">{savedMsg}</p>
          )}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Course ratings', value: ratings.length },
            { label: 'Skills validated', value: skills.length },
            { label: 'Surveys', value: surveyCount },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/80 px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{k.label}</p>
              <p className="text-2xl font-black">{k.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold">Course job-readiness (1–5)</h3>
          </div>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Is this course producing job-ready candidates?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[var(--text-muted)]">
              Course
              <select className={field} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {VALIDATABLE_COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-[var(--text-muted)]">
              Rating
              <select
                className={field}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} — {n >= 4 ? 'Job-ready' : n === 3 ? 'Mixed' : 'Not ready'}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-xs font-bold text-[var(--text-muted)]">
              Comment
              <textarea
                className={field}
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Strong React, weak TypeScript depth"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              addCourseRating({
                courseId,
                courseName,
                rating,
                comment,
                company: companyName,
              });
              setComment('');
              flash('Course rating saved');
              refresh();
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Submit rating
          </button>
          {ratings[0] && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Latest: {ratings[0].courseName} · {ratings[0].rating}/5
              {ratings[0].comment ? ` — ${ratings[0].comment}` : ''}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold">Skill list for a role</h3>
          </div>
          <label className="text-xs font-bold text-[var(--text-muted)]">
            Role
            <select className={field} value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)}>
              {ROLE_SKILL_PRESETS.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
          </label>
          <ul className="mt-3 space-y-2">
            {preset.skills.map((sk) => {
              const existing = skills.find((s) => s.roleTitle === roleTitle && s.skill === sk);
              return (
                <li
                  key={sk}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <span className="text-sm font-bold">{sk}</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        upsertSkillValidation({
                          roleTitle,
                          skill: sk,
                          kind: 'must-have',
                          company: companyName,
                        });
                        flash(`${sk} → must-have`);
                        refresh();
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                        existing?.kind === 'must-have'
                          ? 'bg-rose-600 text-white'
                          : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Must-have
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        upsertSkillValidation({
                          roleTitle,
                          skill: sk,
                          kind: 'nice-to-have',
                          company: companyName,
                        });
                        flash(`${sk} → nice-to-have`);
                        refresh();
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                        existing?.kind === 'nice-to-have'
                          ? 'bg-sky-600 text-white'
                          : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Nice-to-have
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold">Curriculum change suggestions</h3>
          </div>
          <ul className="space-y-3">
            {RECOMMENDATIONS.slice(0, 6).map((r) => {
              const d = decisionFor(r.id);
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3"
                >
                  <p className="text-sm font-bold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{r.detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurriculumDecision({
                          recommendationId: r.id,
                          title: r.title,
                          decision: 'approved',
                          company: companyName,
                        });
                        flash('Approved curriculum change');
                        refresh();
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                        d?.decision === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : 'border border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurriculumDecision({
                          recommendationId: r.id,
                          title: r.title,
                          decision: 'rejected',
                          company: companyName,
                        });
                        flash('Rejected curriculum change');
                        refresh();
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase ${
                        d?.decision === 'rejected'
                          ? 'bg-rose-600 text-white'
                          : 'border border-rose-500/40 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                    {d && (
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        You {d.decision}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold">Employer survey</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['qHiringDifficulty', 'Hiring difficulty'],
                ['qCurriculumRelevance', 'Curriculum relevance'],
                ['qWouldHireAgain', 'Would hire again'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs font-bold text-[var(--text-muted)]">
                {label} (1–5)
                <select
                  className={field}
                  value={survey[key]}
                  onChange={(e) =>
                    setSurvey((s) => ({ ...s, [key]: Number(e.target.value) }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="sm:col-span-3 text-xs font-bold text-[var(--text-muted)]">
              Open feedback
              <textarea
                className={field}
                rows={2}
                value={survey.openFeedback}
                onChange={(e) => setSurvey((s) => ({ ...s, openFeedback: e.target.value }))}
                placeholder="Optional comments for training providers"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              addSurvey({ ...survey, company: companyName });
              setSurvey({
                qHiringDifficulty: 3,
                qCurriculumRelevance: 4,
                qWouldHireAgain: 4,
                openFeedback: '',
              });
              flash('Survey submitted');
              refresh();
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white"
          >
            <ThumbsDown className="h-3.5 w-3.5 rotate-180" /> Submit survey
          </button>
        </section>
      </div>
    </div>
  );
}

export default EmployerValidationPanel;
