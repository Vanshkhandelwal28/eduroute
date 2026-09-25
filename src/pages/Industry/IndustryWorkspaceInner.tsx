import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  IndianRupee,
  Users,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  addApplicantMentorFeedback,
  addIndustryPosting,
  advanceApplicantStatus,
  APPLICANT_STATUS_FLOW,
  readIndustryApplicants,
  readIndustryPostings,
  setApplicantStatus,
  type ApplicantStatus,
  type IndustryApplicant,
  type IndustryPosting,
  type WorkMode,
  type RoleCategory,
} from '../../utils/industryStore';

function applicantBadge(status: ApplicantStatus): string {
  switch (status) {
    case 'Applied':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/25 dark:text-indigo-200';
    case 'Shortlisted':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-500/25 dark:text-sky-200';
    case 'Interview':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200';
    case 'Offer':
      return 'bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-violet-200';
    case 'Hired':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200';
    case 'Completed':
      return 'bg-teal-100 text-teal-900 dark:bg-teal-500/25 dark:text-teal-200';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}

/** Openings + applicants only — used inside IndustryShell (no page header). */
export function IndustryWorkspaceInner() {
  const [postings, setPostings] = useState<IndustryPosting[]>(() => readIndustryPostings());
  const [applicants, setApplicants] = useState<IndustryApplicant[]>(() => readIndustryApplicants());
  const [selectedPostingId, setSelectedPostingId] = useState(() => readIndustryPostings()[0]?.id || '');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [postingBusy, setPostingBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    skills: '',
    stipend: '',
    location: '',
    description: '',
    duration: '3 Months',
    mode: 'Hybrid' as WorkMode,
    roleCategory: 'internship' as RoleCategory,
    eligibility: 'CGPA ≥ 7.0 · Final year preferred',
  });
  const [sortBy, setSortBy] = useState<'match' | 'recent'>('match');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [mentorDraft, setMentorDraft] = useState<
    Record<string, { name: string; rating: number; comment: string }>
  >({});

  const refresh = useCallback(() => {
    const p = readIndustryPostings();
    setPostings(p);
    setApplicants(readIndustryApplicants());
    setSelectedPostingId((prev) => prev || p[0]?.id || '');
  }, []);

  useEffect(() => {
    refresh();
    const onUp = () => refresh();
    window.addEventListener('eduroute:industry-updated', onUp);
    return () => window.removeEventListener('eduroute:industry-updated', onUp);
  }, [refresh]);

  const filteredApplicants = useMemo(() => {
    let list = applicants.filter((a) => a.postingId === selectedPostingId);
    if (eligibleOnly) list = list.filter((a) => a.eligible !== false);
    if (sortBy === 'match') list = [...list].sort((a, b) => b.matchPercent - a.matchPercent);
    else list = [...list].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    return list;
  }, [applicants, selectedPostingId, sortBy, eligibleOnly]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const title = form.title.trim();
    const stipend = form.stipend.trim();
    const location = form.location.trim();
    if (!title || !stipend || !location) {
      setFormError('Title, stipend/package, and location are required.');
      return;
    }
    const skills = form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setPostingBusy(true);
    try {
      const created = addIndustryPosting({
        title,
        skills: skills.length ? skills : ['General'],
        stipend,
        location,
        description: form.description.trim(),
        duration: form.duration,
        mode: form.mode,
        roleCategory: form.roleCategory,
        eligibility: form.eligibility,
      });
      setForm({
        title: '',
        skills: '',
        stipend: '',
        location: '',
        description: '',
        duration: form.roleCategory === 'full-time' ? 'Permanent' : '3 Months',
        mode: 'Hybrid',
        roleCategory: form.roleCategory,
        eligibility: 'CGPA ≥ 7.0 · Final year preferred',
      });
      setShowForm(false);
      setSelectedPostingId(created.id);
      refresh();
    } finally {
      setPostingBusy(false);
    }
  };

  const nextLabel = (status: ApplicantStatus) => {
    const i = APPLICANT_STATUS_FLOW.indexOf(status as (typeof APPLICANT_STATUS_FLOW)[number]);
    if (i < 0 || i >= APPLICANT_STATUS_FLOW.length - 1) return null;
    return APPLICANT_STATUS_FLOW[i + 1];
  };

  return (
    <div className="text-slate-900 dark:text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Openings & placement</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Post internships or full-time jobs · sort applicants by skill match · full recruiter pipeline
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg"
        >
          <Plus className="h-4 w-4" /> {showForm ? 'Hide form' : 'Post opening'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handlePost}
          className="mb-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2"
        >
          {formError && (
            <p
              className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              role="alert"
            >
              {formError}
            </p>
          )}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {(
              [
                { id: 'internship' as RoleCategory, label: 'Internship' },
                { id: 'full-time' as RoleCategory, label: 'Full-time job' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    roleCategory: opt.id,
                    duration: opt.id === 'full-time' ? 'Permanent' : '3 Months',
                  })
                }
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase ${
                  form.roleCategory === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Role title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={
                form.roleCategory === 'full-time'
                  ? 'e.g. Graduate Software Engineer'
                  : 'e.g. Frontend Intern'
              }
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Eligibility</label>
            <input
              value={form.eligibility}
              onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
              placeholder="CGPA ≥ 7.5 · Final year · No backlogs"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Skills required (comma-separated)
            </label>
            <input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, TypeScript, DSA"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {form.roleCategory === 'full-time' ? 'Package (CTC / LPA) *' : 'Stipend *'}
            </label>
            <input
              required
              value={form.stipend}
              onChange={(e) => setForm({ ...form, stipend: e.target.value })}
              placeholder={form.roleCategory === 'full-time' ? '8-12 or ₹10 LPA' : '25000'}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Location *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Bangalore / Remote"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Duration</label>
            <select
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {(form.roleCategory === 'full-time'
                ? ['Permanent', '1 Year contract', '2 Years']
                : ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months']
              ).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Mode</label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as WorkMode })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {(['Remote', 'Hybrid', 'Onsite'] as WorkMode[]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={postingBusy}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" /> {postingBusy ? 'Posting…' : 'Publish opening'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wide text-slate-400">Openings</h2>
          {postings.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPostingId(p.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedPostingId === p.id
                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="text-sm font-bold">{p.title}</div>
              <div className="mt-0.5 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                {p.roleCategory === 'full-time' ? 'Full-time' : 'Internship'}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {p.duration}
                </span>
                <span>{p.mode}</span>
                <span className="inline-flex items-center gap-0.5">
                  <IndianRupee className="h-3 w-3" /> {p.stipend}
                </span>
              </div>
            </button>
          ))}
          {postings.length === 0 && (
            <p className="text-xs text-slate-500">No openings yet. Post one above.</p>
          )}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-black">Applicants</h2>
            <span className="text-xs font-bold text-slate-400">{filteredApplicants.length}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSortBy('match')}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${
                  sortBy === 'match'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700'
                }`}
              >
                Sort by match %
              </button>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${
                  sortBy === 'recent'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700'
                }`}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setEligibleOnly((v) => !v)}
                className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase ${
                  eligibleOnly
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700'
                }`}
              >
                Eligible only
              </button>
            </div>
          </div>

          {filteredApplicants.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No applicants for this filter.</p>
          )}

          <ul className="space-y-4">
            {filteredApplicants.map((a) => {
              const nxt = nextLabel(a.status);
              const draft = mentorDraft[a.id] || { name: '', rating: 5, comment: '' };
              return (
                <li
                  key={a.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{a.studentName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {a.college} · {a.email}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          applicantBadge(a.status)
                        }`}
                      >
                        {a.status}
                      </span>
                      <div className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {a.matchPercent}% match
                      </div>
                      <div
                        className={`mt-1 text-[10px] font-bold ${
                          a.eligible !== false
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {a.eligible !== false ? 'Eligible' : 'Not eligible'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nxt && (
                      <button
                        type="button"
                        onClick={() => {
                          advanceApplicantStatus(a.id);
                          refresh();
                        }}
                        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Advance → {nxt}
                      </button>
                    )}
                    {APPLICANT_STATUS_FLOW.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setApplicantStatus(a.id, st);
                          refresh();
                        }}
                        className={`rounded-xl border px-2 py-1 text-[10px] font-bold ${
                          a.status === st
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200'
                            : 'border-slate-200 text-slate-500 dark:border-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-3">
                    <input
                      placeholder="Mentor name"
                      value={draft.name}
                      onChange={(e) =>
                        setMentorDraft((m) => ({
                          ...m,
                          [a.id]: { ...draft, name: e.target.value },
                        }))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={draft.rating}
                      onChange={(e) =>
                        setMentorDraft((m) => ({
                          ...m,
                          [a.id]: { ...draft, rating: Number(e.target.value) || 5 },
                        }))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!draft.name.trim()) return;
                        addApplicantMentorFeedback(a.id, {
                          mentorName: draft.name.trim(),
                          rating: draft.rating,
                          comment: draft.comment,
                        });
                        setMentorDraft((m) => {
                          const n = { ...m };
                          delete n[a.id];
                          return n;
                        });
                        refresh();
                      }}
                      className="rounded-lg bg-slate-800 px-2 py-1.5 text-[10px] font-bold text-white dark:bg-slate-200 dark:text-slate-900"
                    >
                      Save mentor note
                    </button>
                    <input
                      placeholder="Comment"
                      value={draft.comment}
                      onChange={(e) =>
                        setMentorDraft((m) => ({
                          ...m,
                          [a.id]: { ...draft, comment: e.target.value },
                        }))
                      }
                      className="sm:col-span-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default IndustryWorkspaceInner;
