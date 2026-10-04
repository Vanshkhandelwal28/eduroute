/**
 * Clears learning path + progress from localStorage and Neon.
 * Imported by onboarding retake flow.
 */
import { pushUserData } from './userDataStore';
import { getAuthUser } from './rbacAuth';

const STORE_PREFIX = 'eduroute:learning-path-v2:';
const PATH_KEY = 'learning-path';
const PROGRESS_KEY = 'learning-path-progress';

function storageKey() {
  const id = (getAuthUser()?.email || 'guest').trim().toLowerCase();
  return `${STORE_PREFIX}${id}`;
}

export function clearLearningPath(): void {
  try {
    const key = storageKey();
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}:done`);
    window.dispatchEvent(new CustomEvent('eduroute:learning-path-updated'));
    const clearedAt = new Date().toISOString();
    void pushUserData(PATH_KEY, {
      nodes: [],
      track: '',
      source: 'cleared',
      updatedAt: clearedAt,
    });
    void pushUserData(PROGRESS_KEY, {
      completedNodeIds: [],
      updatedAt: clearedAt,
    });
  } catch {
    /* ignore */
  }
}
