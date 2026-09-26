import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Youtube } from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
};

let apiLoading: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    }
    const t = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(t);
        resolve();
      }
    }, 50);
  });
  return apiLoading;
}

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

type Props = {
  youtubeUrl: string;
  title?: string;
  /** Called with high-water watch ratio 0–1 while playing */
  onProgress?: (ratio: number) => void;
  className?: string;
};

/**
 * In-page YouTube player. Tracks watch high-water mark without remounting the iframe.
 * IMPORTANT: onProgress is stored in a ref so parent re-renders do NOT destroy the player.
 */
export function YouTubeCoursePlayer({ youtubeUrl, title, onProgress, className = '' }: Props) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `yt-player-${reactId}`;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const maxRatioRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const videoId = extractYoutubeId(youtubeUrl);

  // Keep latest callback without re-running effect (prevents destroy/recreate → blank page)
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    maxRatioRef.current = 0;
    setReady(false);
    setError('');
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    let cancelled = false;

    const report = (ratio: number) => {
      if (ratio > maxRatioRef.current) {
        maxRatioRef.current = ratio;
        try {
          onProgressRef.current?.(ratio);
        } catch {
          /* parent handler must not crash player */
        }
      }
    };

    const tick = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const dur = p.getDuration();
        const cur = p.getCurrentTime();
        if (dur > 0 && Number.isFinite(dur) && Number.isFinite(cur)) {
          report(Math.min(1, Math.max(0, cur / dur)));
        }
      } catch {
        /* player may be mid-destroy */
      }
    };

    const startPoll = () => {
      if (pollRef.current != null) return; // already polling
      pollRef.current = window.setInterval(tick, 1000);
    };

    const stopPoll = () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;

      // Ensure a clean host node — YT replaces the element with an iframe
      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = '';
      const mount = document.createElement('div');
      mount.id = containerId;
      mount.style.width = '100%';
      mount.style.height = '100%';
      host.appendChild(mount);

      try {
        playerRef.current?.destroy();
      } catch {
        /* */
      }
      playerRef.current = null;

      try {
        playerRef.current = new window.YT.Player(mount, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            // Do NOT pass origin on Netlify previews — mismatched origin can blank the embed
          },
          events: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onStateChange: (e) => {
              const PS = window.YT?.PlayerState;
              if (!PS) return;
              if (e.data === PS.PLAYING || e.data === PS.BUFFERING) {
                startPoll();
              } else if (e.data === PS.PAUSED) {
                tick();
              } else if (e.data === PS.ENDED) {
                report(1);
                stopPoll();
              }
            },
            onError: () => {
              if (!cancelled) {
                setError('Video failed to load. Try again or open on YouTube.');
              }
            },
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError('Could not start player');
          console.error(err);
        }
      }
    });

    return () => {
      cancelled = true;
      stopPoll();
      try {
        playerRef.current?.destroy();
      } catch {
        /* */
      }
      playerRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = '';
    };
    // Only recreate when the video itself changes — never on onProgress identity
  }, [videoId, containerId]);

  if (!videoId) {
    return (
      <div
        className={`rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 ${className}`}
      >
        Cannot embed video — open externally:{' '}
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="underline">
          {title || 'YouTube'}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--border-default)] bg-black ${className}`}
    >
      <div className="relative aspect-video w-full">
        {!ready && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-900 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading player…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-900 p-4 text-center text-sm text-rose-300">
            <span>{error}</span>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-white underline"
            >
              Open on YouTube
            </a>
          </div>
        )}
        {/* Stable host — YT injects iframe inside; we never replace this ref node from React */}
        <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        <Youtube className="h-3.5 w-3.5 text-rose-500" />
        <span className="truncate">
          {title || 'Lesson video'} · watch on EduRoute · speed controls available
        </span>
      </div>
    </div>
  );
}

export default YouTubeCoursePlayer;
