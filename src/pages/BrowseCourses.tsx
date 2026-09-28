import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig';
import { getManagedCourses } from '../utils/courseManagerStorage';

const CATEGORIES = ['All', 'Web Dev', 'AI/ML', 'Cloud', 'DSA', 'Soft Skills'];

export const BrowseCourses = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/courses`)
      .then((res) => res.json())
      .then((data) => {
        const localCourses = getManagedCourses().map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level,
          duration: `${course.content.length} resources`,
          link: course.link,
        }));
        setCourses([...(Array.isArray(data) ? data : []), ...localCourses]);
      })
      .catch(() => {
        const localCourses = getManagedCourses().map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level,
          duration: `${course.content.length} resources`,
          link: course.link,
        }));
        setCourses(localCourses);
      });
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      [course.title, course.description, course.category]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl flex-1 p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">Browse Courses</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick a route — skills, level, and one clear start action.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-4 md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search skills..."
              className="h-14 w-full rounded-2xl border bg-white pl-12 pr-6 text-sm dark:border-slate-700 dark:bg-slate-900 md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => {
          const inner = (
            <>
              <div className="er-route-card__media flex items-end p-4">
                <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-700 shadow-sm dark:bg-slate-900/80 dark:text-indigo-300">
                  {course.level || course.category || 'Course'}
                </span>
              </div>
              <div className="er-route-card__body">
                <h3 className="line-clamp-2 text-base font-bold text-[var(--text-primary)]">{course.title}</h3>
                <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{course.description}</p>
                <div className="flex flex-wrap gap-1">
                  {course.category && (
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                      {course.category}
                    </span>
                  )}
                  {course.duration && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" /> {course.duration}
                    </span>
                  )}
                </div>
                <span className="er-cta-primary mt-auto !w-full !py-2.5 !text-xs">
                  {course.link ? 'Open link' : 'Start route'}
                </span>
              </div>
            </>
          );
          return (
            <motion.div
              key={course._id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="er-route-card"
            >
              {course.link ? (
                <a href={course.link} target="_blank" rel="noreferrer" className="flex h-full flex-col">
                  {inner}
                </a>
              ) : (
                <Link to={`/course/${course._id}`} className="flex h-full flex-col">
                  {inner}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BrowseCourses;
