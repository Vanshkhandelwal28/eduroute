/**
 * YouTube duration helpers — unique-video min watch time for courses.
 */

/** Extract 11-char YouTube video id from common URL forms. */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').slice(0, 11);
      return id.length === 11 ? id : null;
    }
    const v = u.searchParams.get('v');
    if (v && v.length >= 11) return v.slice(0, 11);
    const parts = u.pathname.split('/');
    const embedIdx = parts.indexOf('embed');
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1].slice(0, 11);
  } catch {
    /* fall through */
  }
  const m = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
  return m ? m[1] : null;
}

/**
 * Approximate lengths (seconds) for videos used in EduRoute resource packs.
 * Refined live via YT player getDuration() when a lesson is opened.
 */
export const KNOWN_YT_DURATION_SEC: Record<string, number> = {
  j5Zsa_e1XeE: 45 * 60,
  WvfzA1_JVqA: 3 * 3600 + 20 * 60,
  '3c-iBn73dDE': 2 * 3600 + 10 * 60,
  fqMOX6JJhGo: 2 * 3600 + 40 * 60,
  X48VuDVv0do: 4 * 3600,
  s_o8dwzRlu4: 3 * 3600 + 30 * 60,
  ulprqHHWlng: 13 * 3600,
  '3hLmDS179YE': 2 * 3600 + 30 * 60,
  sWBHKfXTAqM: 5 * 3600,
  GtovwKUrOZQ: 1 * 3600 + 20 * 60,
  U_P23SqJeZQ: 12 * 3600,
  fNzpcB7OeRI: 2 * 3600,
  '8hly31xKli0': 5 * 3600 + 22 * 60,
  RBSGKlAvoiM: 8 * 3600,
  bMknfKXIFA8: 11 * 3600 + 55 * 60,
  LDB4uaJ87e0: 1 * 3600 + 30 * 60,
  PkZNo7MFNFg: 3 * 3600 + 26 * 60,
  G3e-cpL7ydc: 6 * 3600 + 30 * 60,
  Oe421EPjeBE: 8 * 3600 + 16 * 60,
  fBNz5xF_Kx4: 1 * 3600 + 30 * 60,
  YS4e4q9oBaU: 6 * 3600 + 40 * 60,
  un6ZyFkq_e0: 1 * 3600 + 40 * 60,
  fgTGADljAeg: 1 * 3600,
  rfscVS0vtbw: 4 * 3600 + 26 * 60,
  _uQrJ0TkZlc: 6 * 3600,
  r_uOLxNrNk8: 4 * 3600 + 30 * 60,
  ua_CiDNNj30: 1 * 3600 + 10 * 60,
  HXV3zeQKqGY: 4 * 3600 + 20 * 60,
  '7S_tz1z_5bA': 3 * 3600 + 10 * 60,
  '30LWjhZzg50': 1 * 3600 + 30 * 60,
  BwuLxPH8IDs: 1 * 3600,
  AGrl_H87pRU: 6 * 3600,
  TPMlZxRRaBQ: 5 * 3600,
  i_LwzRVPQbw: 4 * 3600,
  c9Wg6CbTfgw: 3 * 3600 + 30 * 60,
  UB1O30fR_EE: 2 * 3600,
  '1Rs2ND1ryYc': 1 * 3600 + 25 * 60,
  W6NZfCO5SIk: 3 * 3600 + 15 * 60,
  '0ik6X4DJKCc': 1 * 3600,
  TNhaISOUy6Q: 1 * 3600 + 10 * 60,
  Ul3y1LXxzdU: 1 * 3600 + 5 * 60,
  lCxcTsO1lYU: 1 * 3600 + 30 * 60,
  '7dTTFW7yACQ': 1 * 3600,
  QwQuro7ekvc: 45 * 60,
};

const liveCache = new Map<string, number>();

export function cacheVideoDuration(videoIdOrUrl: string, seconds: number) {
  const id = videoIdOrUrl.length === 11 ? videoIdOrUrl : extractYoutubeId(videoIdOrUrl);
  if (!id || !Number.isFinite(seconds) || seconds <= 0) return;
  liveCache.set(id, Math.round(seconds));
}

export function getVideoDurationSeconds(youtubeUrl: string): number | undefined {
  const id = extractYoutubeId(youtubeUrl);
  if (!id) return undefined;
  if (liveCache.has(id)) return liveCache.get(id);
  if (KNOWN_YT_DURATION_SEC[id] != null) return KNOWN_YT_DURATION_SEC[id];
  return undefined;
}

export type TopicWithVideo = {
  youtubeUrl?: string;
  videoDurationSeconds?: number;
  estimatedHours?: number;
};

/**
 * Minimum watch time = sum of **unique** video lengths
 * (same long video linked on many topics counts once).
 */
export function minWatchSecondsFromTopics(topics: TopicWithVideo[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const t of topics) {
    const url = t.youtubeUrl || '';
    const id = extractYoutubeId(url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const sec =
      (t.videoDurationSeconds && t.videoDurationSeconds > 0
        ? t.videoDurationSeconds
        : undefined) ?? getVideoDurationSeconds(url);
    if (sec && sec > 0) total += sec;
  }
  return total;
}

export function formatWatchDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${Math.max(1, m)}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function secondsToHoursRounded(sec: number): number {
  if (sec <= 0) return 0;
  return Math.round((sec / 3600) * 10) / 10;
}
