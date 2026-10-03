import { pushUserData, pullUserData } from './userDataStore';

export type StoredUserProfile = {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
  bio?: string;
  username?: string;
  phone?: string;
  college?: string;
  enrolledCourses?: string[];
  [key: string]: unknown;
};

const USER_PROFILE_KEY = 'eduroute:user-profile-v1';

export const saveUserProfile = (profile: StoredUserProfile) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    void pushUserData('user-profile', profile);
  } catch {
    /* ignore */
  }
};

export const getStoredUserProfile = (): StoredUserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredUserProfile) : null;
  } catch {
    return null;
  }
};

export const getCurrentUser = () => getStoredUserProfile();

export const updateEnrollment = (courseId: string) => {
  const profile = getStoredUserProfile() || {};
  const enrolled = Array.isArray(profile.enrolledCourses) ? [...profile.enrolledCourses] : [];
  if (!enrolled.includes(courseId)) {
    enrolled.push(courseId);
    saveUserProfile({ ...profile, enrolledCourses: enrolled });
  }
};

export const getDisplayFirstName = () => {
  const name = getStoredUserProfile()?.name || '';
  return String(name).split(' ')[0] || 'Student';
};

export const parseGoogleCredential = (credential: string) => {
  try {
    const payload = credential.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      name: json.name as string | undefined,
      email: json.email as string | undefined,
      avatar: json.picture as string | undefined,
    };
  } catch {
    return null;
  }
};

export async function syncUserProfileFromServer(): Promise<void> {
  const remote = await pullUserData<StoredUserProfile>('user-profile');
  if (!remote || typeof remote !== 'object') return;
  const local = getStoredUserProfile();
  saveUserProfile({ ...(local || {}), ...remote });
}
