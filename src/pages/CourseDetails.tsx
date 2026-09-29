import { Link, useNavigate, useParams } from 'react-router-dom';
import { Award, ChevronLeft, Clock, FileText, Globe, Play, Video } from 'lucide-react';
import { COURSES } from '../data/mockData';
import { getManagedCourses } from '../utils/courseManagerStorage';
import { getCurrentUser, updateEnrollment } from '../utils/userProfile';
import {
  computePlacementChance,
  courseTypeImage,
} from '../utils/placementChance';
import { PlacementChanceStrip } from '../components/PlacementChanceStrip';

const toCourseSummary = (courseId: string) => {
  const localCourse = getManagedCourses().find((course) => course.id === courseId);
  if (!localCourse) {
    return null;
  }

  return {
    id: localCourse.id,
    title: localCourse.title,
    description: localCourse.description,
    thumbnail: localCourse.thumbnailUrl,
    duration: `${localCourse.content.length} resources`,
    price: 0,
    category: localCourse.category,
    lessons: localCourse.content.map((item) => ({
      id: item.id,
      title: item.title,
      duration: item.type === 'video' ? 'Video' : 'Document',
      isLocked: false,
      type: item.type,
      topic: item.topic,
      url: item.url,
    })),
  };
};

export const CourseDetails = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const localCourse = toCourseSummary(id);
  const mockCourse = COURSES.find((course) => course.id === id);
  const course = localCourse || mockCourse;

  if (!course) {
    return <div className="p-20 text-center font-black">Course not found</div>;
  }

  const isLocalCourse = Boolean(localCourse);
  const isEnrolled = getCurrentUser().enrolledCourses.includes(id);
  const moduleLessons = mockCourse?.modules?.flatMap((module) => module.lessons) || [];
  const chance = computePlacementChance(course);
  const heroImg = courseTypeImage(course);

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="relative h-96 w-full">
        <img src={heroImg} alt={course.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/browse"
              className="mb-6 inline-flex items-center text-sm font-black uppercase tracking-widest text-white/60 transition-colors hover:text-white"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to Explore
            </Link>
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-white md:text-5xl">{course.title}</h1>
            <div className="mt-4 max-w-xl rounded-2xl border border-white/15 bg-black/40 p-4 backdrop-blur-sm">
              <PlacementChanceStrip result={chance} />
              <p className="mt-2 text-[11px] text-white/70">
                Score from your skill profile vs this course content — recalculates when your skills change.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-[11px] font-black uppercase tracking-[0.15em] text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {course.duration}
              </span>
              {'category' in course && course.category && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> {course.category}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Skill-matched
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-10 px-6 md:px-8 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">About this course</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{course.description}</p>

          <h2 className="mt-10 text-xl font-bold text-[var(--text-primary)]">Curriculum</h2>
          <div className="mt-4 space-y-3">
            {isLocalCourse &&
              'lessons' in course &&
              Array.isArray(course.lessons) &&
              course.lessons.map((lesson: any) => (
                <a
                  key={lesson.id}
                  href={lesson.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] p-4 hover:border-indigo-300"
                >
                  <div className="flex items-center gap-3">
                    {lesson.type === 'video' ? (
                      <Video className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-cyan-600" />
                    )}
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{lesson.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{lesson.topic}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Open</span>
                </a>
              ))}

            {!isLocalCourse &&
              moduleLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <Play className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{lesson.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{lesson.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <PlacementChanceStrip result={chance} />
          <div className="mt-4 text-3xl font-black text-[var(--text-primary)]">
            {isLocalCourse ? 'Free' : `₹${(course as any).price ?? '—'}`}
          </div>
          {(course as any).link ? (
            <a
              href={(course as any).link}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-bold text-white"
            >
              Open Course Link
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                updateEnrollment(id);
                navigate('/courses');
              }}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white"
            >
              {isEnrolled ? 'Continue Learning' : 'Enroll Now'}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CourseDetails;
