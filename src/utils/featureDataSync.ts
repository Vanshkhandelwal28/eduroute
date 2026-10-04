/**
 * Pull feature data from Neon (Render) on app shell load.
 * Each listed store must export its sync*FromServer function.
 */
import { syncAiCoursesFromServer } from './aiCourseStore';
import { syncCourseProgressFromServer } from './courseProgressStore';
import { syncAssessmentsFromServer } from './courseAssessmentStore';
import { syncUserProfileFromServer } from './userProfile';
import { syncCvFromServer } from './cvStore';
import { syncAchievementsFromServer } from './courseAchievementsStore';
import { syncLearningPathFromServer } from './learningPathStore';
import { syncGamificationFromServer } from './gamificationStore';

export async function syncAllFeatureData(): Promise<void> {
  await Promise.allSettled([
    syncAiCoursesFromServer(),
    syncCourseProgressFromServer(),
    syncAssessmentsFromServer(),
    syncUserProfileFromServer(),
    syncCvFromServer(),
    syncAchievementsFromServer(),
    syncLearningPathFromServer(),
    syncGamificationFromServer(),
  ]);

  // Onboarding: optional dynamic import so build does not fail if export missing
  try {
    const mod = await import('./onboardingStore');
    if (typeof (mod as any).syncOnboardingFromServer === 'function') {
      await (mod as any).syncOnboardingFromServer();
    }
  } catch {
    /* optional */
  }
}
