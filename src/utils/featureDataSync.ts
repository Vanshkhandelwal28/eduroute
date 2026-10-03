/**
 * Pull all feature data from Neon (Render) once on app shell load.
 */
import { syncAiCoursesFromServer } from './aiCourseStore';
import { syncCourseProgressFromServer } from './courseProgressStore';
import { syncAssessmentsFromServer } from './courseAssessmentStore';
import { syncUserProfileFromServer } from './userProfile';
import { syncOnboardingFromServer } from './onboardingStore';
import { syncCvFromServer } from './cvStore';
import { syncAchievementsFromServer } from './courseAchievementsStore';

export async function syncAllFeatureData(): Promise<void> {
  await Promise.allSettled([
    syncAiCoursesFromServer(),
    syncCourseProgressFromServer(),
    syncAssessmentsFromServer(),
    syncUserProfileFromServer(),
    syncOnboardingFromServer(),
    syncCvFromServer(),
    syncAchievementsFromServer(),
  ]);
}
