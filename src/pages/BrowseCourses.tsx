import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGetCourses } from '../utils/authApi';
import { getManagedCourses } from '../utils/courseManagerStorage';
import {
  computePlacementChance,
  courseTypeImage,
  getUserSkills,
} from '../utils/placementChance';
import { PlacementChanceStrip } from '../components/PlacementChanceStrip';

const categories = ['All', 'Development', 'Design', 'Data Science', 'Business'];

export const BrowseCourses = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const { skills } = useMemo(() => getUserSkills(), []);

  useEffect(() => {
    apiGetCourses()
      .then((response) => {
        const localCourses = getManagedCourses().map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: 'Beginner',
          duration: `${course.content.length} resources`,
        }));
        setCourses([...localCourses, ...response.data]);
      })
      .catch(() => {
        const localCourses = getManagedCourses().map((course) => ({
          _id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          level: 'Beginner',
          duration: `${course.content.length} resources`,
        }));
        setCourses(localCourses);
      });
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [course.title, course.description, course.category].some((value) =>
        String(value || '').toLowerCase().includes(query),
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl flex-1 p-4 md:p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Browse Courses
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Placement chance is computed from your skill profile vs each course — not fixed marketing numbers.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
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
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="search"
            placeholder="Search skills..."
            className="h-12 w-full rounded-2xl border bg-white pl-12 pr-4 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map((course) => {
          const id = course._id || course.id;
          const chance = computePlacementChance(course, skills);
          const img = courseTypeImage(course);
          const inner = (
            <>
              <div className="relative h-36 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute left-2 top-2">
                  <PlacementChanceStrip result={chance} compact />
                </div>
              </div>
              <div className="mt-3 text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                {course.level || course.category}
              </div>
              <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">{course.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{course.description}</p>
              <div className="mt-3">
                <PlacementChanceStrip result={chance} />
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-[var(--text-muted)]">
                <Clock className="h-3.5 w-3.5" />
                {course.duration || 'Self-paced'}
              </div>
            </>
          );

          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="er-route-card flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-sm"
            >
              {course.link ? (
                <a href={course.link} target="_blank" rel="noreferrer" className="flex h-full flex-col">
                  {inner}
                </a>
              ) : (
                <Link to={`/course/${id}`} className="flex h-full flex-col">
                  {inner}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <p className="mt-12 text-center text-sm text-slate-500">No courses match your filters.</p>
      )}
    </div>
  );
};

export default BrowseCourses;
