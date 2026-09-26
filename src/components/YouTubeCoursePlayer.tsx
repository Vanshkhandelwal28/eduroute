import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Youtube } from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
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
    // Already loaded race
    const t = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(t);
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
 * In-page YouTube player. Tracks continuous watch time high-water mark.
 * Playback speed remains available via native YT controls.
 */
export function YouTubeCoursePlayer({ youtubeUrl, title, onProgress, className = '' }: Props) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `yt-player-${reactId}`;
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const maxRatioRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const videoId = extractYoutubeId(youtubeUrl);

  useEffect(() => {
    maxRatioRef.current = 0;
    setReady(false);
    setError('');
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }

    let cancelled = false;

    const tick = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const dur = p.getDuration();
        const cur = p.getCurrentTime();
        if (dur > 0) {
          const ratio = Math.min(1, cur / dur);
          if (ratio > maxRatioRef.current) {
            maxRatioRef.current = ratio;
            onProgress?.(ratio);
          }
        }
      } catch {
        /* player may be destroyed */
      }
    };

    const startPoll = () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(tick, 800);
    };

    const stopPoll = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      try {
        playerRef.current?.destroy();
      } catch {
        /* */
      }
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onStateChange: (e) => {
            const playing = window.YT?.PlayerState?.PLAYING;
            if (e.data === playing) startPoll();
            else {
              tick();
              // keep light poll on pause so last frame counts
              if (e.data === window.YT?.PlayerState?.PAUSED) tick();
              if (e.data === window.YT?.PlayerState?.ENDED) {
                maxRatioRef.current = 1;
                onProgress?.(1);
                stopPoll();
              }
            }
          },
        },
      });
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
    };
  }, [videoId, containerId, onProgress]);

  if (!videoId) {
    return (
      <div className={`rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 ${className}`}>
        Cannot embed video — open externally:{" "}
        <a href={youtubeUrl} target="_blank" rel="noreferrer" className="underline">
          {title || 'YouTube'}
        </a>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--border-default)] bg-black ${className}`}>
      <div className="relative aspect-video w-full">
        {!ready && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-900 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading player…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div id={containerId} className="h-full w-full" />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        <Youtube className="h-3.5 w-3.5 text-rose-500" />
        <span className="truncate">{title || 'Lesson video'} · watch on EduRoute · speed controls available</span>
      </div>
    </div>
  );
}

export default YouTubeCoursePlayer;
