import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Award,
  Flame,
  PenLine,
  Sparkles,
  Target,
  Trophy,
  ArrowRight,
  Download,
  Code2,
  CheckCircle2,
  Lock,
  Clock,
  Bus,
  Flag,
  Star,
  Zap,
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { getProfileDashboardData } from '../../services/profileDashboardApi';
import { PROFILE_DASHBOARD_MOCK, type ProfileDashboardData } from '../../data/profileMockData';
import { getAuthToken, getAuthUser, saveAuthSession } from '../../utils/rbacAuth';
import { getStoredUserProfile, saveUserProfile } from '../../utils/userProfile';
import { applyGamificationToProfile } from '../../utils/profileGamificationBridge';
import { readOnboarding } from '../../utils/onboardingStore';
import { readCompletions } from '../../utils/internshipApplications';
import {
  listCourseAchievements,
  getAllEarnedCourseSkills,
  type CourseAchievement,
} from '../../utils/courseAchievementsStore';
import { syncMyPublicData, isSupabaseConfigured } from '../../utils/supabaseAuth';
import { BuildCvCta } from '../../components/BuildCvCta';
import { CourseCertificate } from '../../components/CourseCertificate';
import {
  resolveLearningPath,
  continueHrefForNode,
  careerLabelForUser,
  type PathNode,
} from '../../utils/learningPathStore';

const difficultyColors = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-violet-600/12 blur-3xl" />
      <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-40 left-1/3 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
    </div>
  );
}

// FILE_TOO_LARGE_USE_GITHUB_UI_INSTEAD
export const ProfileDashboard = () => null;
export default ProfileDashboard;
