import { Suspense, lazy, type ReactElement } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isAdminSessionActive } from './utils/adminSession';
import { getAuthUser, type UserRole } from './utils/rbacAuth';
import './index.css';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage ?? module.default })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard ?? module.default })));
const MyCourses = lazy(() => import('./pages/MyCourses').then((module) => ({ default: module.MyCourses ?? module.default })));
const BrowseCourses = lazy(() => import('./pages/BrowseCourses').then((module) => ({ default: module.BrowseCourses ?? module.default })));
const CourseDetails = lazy(() => import('./pages/CourseDetails').then((module) => ({ default: module.CourseDetails ?? module.default })));
const Pathways = lazy(() => import('./pages/Pathways').then((module) => ({ default: module.Pathways ?? module.default })));
const MainLayout = lazy(() => import('./layouts/MainLayout').then((module) => ({ default: module.MainLayout ?? module.default })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout ?? module.default })));
const AuthCallback = lazy(() =>
  import('./pages/Auth/AuthCallback').then((module) => ({ default: module.AuthCallback ?? module.default })),
);
const Signup = lazy(() => import('./pages/Auth/Signup').then((module) => ({ default: module.Signup ?? module.default })));
const Login = lazy(() => import('./pages/Auth/Login').then((module) => ({ default: module.Login ?? module.default })));
const VerifyOTP = lazy(() => import('./pages/Auth/VerifyOTP').then((module) => ({ default: module.VerifyOTP ?? module.default })));
const VerifyCollege = lazy(() => import('./pages/Auth/VerifyCollege').then((module) => ({ default: module.VerifyCollege ?? module.default })));
const OnboardingAnalyze = lazy(() => import('./pages/Auth/OnboardingAnalyze').then((module) => ({ default: module.OnboardingAnalyze ?? module.default })));
const RoadmapList = lazy(() => import('./pages/Roadmaps/RoadmapList').then((module) => ({ default: module.RoadmapList ?? module.default })));
const RoadmapDetail = lazy(() => import('./pages/Roadmaps/RoadmapDetail').then((module) => ({ default: module.RoadmapDetail ?? module.default })));
const Assessments = lazy(() => import('./pages/Assessments/Assessments').then((module) => ({ default: module.Assessments ?? module.default })));
const BuddyChat = lazy(() => import('./pages/Buddy/BuddyChat').then((module) => ({ default: module.BuddyChat ?? module.default })));
const Leaderboard = lazy(() => import('./pages/Gamification/Leaderboard').then((module) => ({ default: module.Leaderboard ?? module.default })));
const Rewards = lazy(() => import('./pages/Gamification/Rewards').then((module) => ({ default: module.Rewards ?? module.default })));
const SoftSkills = lazy(() => import('./pages/SoftSkills/SoftSkills').then((module) => ({ default: module.SoftSkills ?? module.default })));
const Internships = lazy(() => import('./pages/Internships/Internships').then((module) => ({ default: module.Internships ?? module.default })));
const Events = lazy(() => import('./pages/Events/Events').then((module) => ({ default: module.Events ?? module.default })));
const Profile = lazy(() => import('./pages/Profile/Profile').then((module) => ({ default: module.Profile ?? module.default })));
const PublicProfile = lazy(() =>
  import('./pages/Profile/PublicProfile').then((module) => ({ default: module.PublicProfile ?? module.default })),
);
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard ?? module.default })));
const AdminStudents = lazy(() => import('./pages/Admin/AdminStudents').then((module) => ({ default: module.AdminStudents ?? module.default })));
const AdminCourses = lazy(() => import('./pages/Admin/AdminCourses').then((module) => ({ default: module.AdminCourses ?? module.default })));
const AdminRoadmaps = lazy(() => import('./pages/Admin/AdminRoadmaps').then((module) => ({ default: module.AdminRoadmaps ?? module.default })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound ?? module.default })));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      Loading…
    </div>
  );
}

function RoleRoute({ role, children }: { role: UserRole; children: ReactElement }) {
  const user = getAuthUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && user.role !== 'admin' && !isAdminSessionActive()) {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === 'student' && user.role === 'admin') {
    // allow admin to view student routes
  }
  return children;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<PageLoader />} key={location.pathname}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/verify-college" element={<VerifyCollege />} />
        <Route path="/onboarding" element={<OnboardingAnalyze />} />
        <Route path="/u/:username" element={<PublicProfile />} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleRoute role="student"><Dashboard /></RoleRoute>} />
          <Route path="/my-courses" element={<RoleRoute role="student"><MyCourses /></RoleRoute>} />
          <Route path="/browse" element={<RoleRoute role="student"><BrowseCourses /></RoleRoute>} />
          <Route path="/courses/:id" element={<RoleRoute role="student"><CourseDetails /></RoleRoute>} />
          <Route path="/pathways" element={<RoleRoute role="student"><Pathways /></RoleRoute>} />
          <Route path="/roadmaps" element={<RoleRoute role="student"><RoadmapList /></RoleRoute>} />
          <Route path="/roadmaps/:slug" element={<RoleRoute role="student"><RoadmapDetail /></RoleRoute>} />
          <Route path="/assessments" element={<RoleRoute role="student"><Assessments /></RoleRoute>} />
          <Route path="/buddy" element={<RoleRoute role="student"><BuddyChat /></RoleRoute>} />
          <Route path="/leaderboard" element={<RoleRoute role="student"><Leaderboard /></RoleRoute>} />
          <Route path="/rewards" element={<RoleRoute role="student"><Rewards /></RoleRoute>} />
          <Route path="/soft-skills" element={<RoleRoute role="student"><SoftSkills /></RoleRoute>} />
          <Route path="/internships" element={<RoleRoute role="student"><Internships /></RoleRoute>} />
          <Route path="/events" element={<RoleRoute role="student"><Events /></RoleRoute>} />
          <Route path="/profile" element={<RoleRoute role="student"><Profile /></RoleRoute>} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
          <Route path="students" element={<RoleRoute role="admin"><AdminStudents /></RoleRoute>} />
          <Route path="courses" element={<RoleRoute role="admin"><AdminCourses /></RoleRoute>} />
          <Route path="roadmaps" element={<RoleRoute role="admin"><AdminRoadmaps /></RoleRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
