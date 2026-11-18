import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  RotateCw,
  Check,
  Loader2
} from 'lucide-react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiReadyCallbacks?: Array<() => void>;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  posterUrl?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const QUALITY_LABELS: Record<string, string> = {
  auto: 'خودکار',
  highres: '4K / بالا',
  hd2160: '2160p',
  hd1440: '1440p',
  hd1080: '1080p',
  hd720: '720p',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p'
};

function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();

  return new Promise((resolve) => {
    window.__ytApiReadyCallbacks = window.__ytApiReadyCallbacks || [];
    window.__ytApiReadyCallbacks.push(resolve);

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        const queue = window.__ytApiReadyCallbacks || [];
        window.__ytApiReadyCallbacks = [];
        queue.forEach((cb) => cb());
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    } else {
      const poll = window.setInterval(() => {
        if (window.YT && window.YT.Player) {
          window.clearInterval(poll);
          const queue = window.__ytApiReadyCallbacks || [];
          window.__ytApiReadyCallbacks = [];
          queue.forEach((cb) => cb());
        }
      }, 100);
    }
  });
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  posterUrl
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto']);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality'>('main');
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverSeekRatio, setHoverSeekRatio] = useState<number | null>(null);

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    setShowControls(true);
    if (isPlaying && !showSettings && !isSeeking) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, [isPlaying, showSettings, isSeeking]);

  useEffect(() => {
    if (!isPlaying || showSettings || isSeeking) {
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
      setShowControls(true);
    } else {
      scheduleHideControls();
    }
  }, [isPlaying, showSettings, isSeeking, scheduleHideControls]);

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    setHasStarted(false);
    setIsPlaying(false);
    setIsEnded(false);
    setCurrentTime(0);
    setDuration(0);
    setShowSettings(false);
    setSettingsTab('main');

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !mountNodeRef.current || !window.YT?.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      const targetDiv = document.createElement('div');
      targetDiv.style.width = '100%';
      targetDiv.style.height = '100%';
      mountNodeRef.current.innerHTML = '';
      mountNodeRef.current.appendChild(targetDiv);

      playerRef.current = new window.YT.Player(targetDiv, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (cancelled) return;
            setIsReady(true);
            try {
              const dur = event.target.getDuration?.() || 0;
              if (dur > 0) setDuration(dur);
              event.target.unMute?.();
              const vol = event.target.getVolume?.();
              if (typeof vol === 'number' && vol > 0) {
                setVolume(vol);
              } else {
                event.target.setVolume?.(80);
                setVolume(80);
              }
              setIsMuted(false);
              const levels = event.target.getAvailableQualityLevels?.();
              if (Array.isArray(levels) && levels.length > 0) {
                setAvailableQualities(['auto', ...levels.filter((l: string) => l !== 'auto')]);
              }
              event.target.playVideo?.();
            } catch {}
          },
          onStateChange: (event: any) => {
            if (cancelled || !window.YT?.PlayerState) return;
            const state = event.data;
            const PS = window.YT.PlayerState;
            if (state === PS.PLAYING) {
              setHasStarted(true);
              setIsPlaying(true);
              setIsEnded(false);
              setIsBuffering(false);
              try {
                const dur = event.target.getDuration?.() || 0;
                if (dur > 0) setDuration(dur);
                const muted = event.target.isMuted?.();
                if (typeof muted === 'boolean') setIsMuted(muted);
                const levels = event.target.getAvailableQualityLevels?.();
                if (Array.isArray(levels) && levels.length > 0) {
                  setAvailableQualities(['auto', ...levels.filter((l: string) => l !== 'auto')]);
                }
              } catch {}
            } else if (state === PS.PAUSED || state === PS.UNSTARTED || state === PS.CUED) {
              setIsPlaying(false);
              setIsBuffering(false);
            } else if (state === PS.ENDED) {
              setIsPlaying(false);
              setIsEnded(true);
              setIsBuffering(false);
              setShowControls(true);
            } else if (state === PS.BUFFERING) {
              setIsBuffering(true);
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Poll playback progress while playing or seeking
  useEffect(() => {
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || isSeeking) return;
      try {
        const cur = player.getCurrentTime?.();
        const dur = player.getDuration?.();
        if (typeof cur === 'number' && Number.isFinite(cur)) setCurrentTime(cur);
        if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) setDuration(dur);
      } catch {}
    }, 250);
    return () => window.clearInterval(interval);
  }, [isSeeking]);

  // Listen to fullscreen state changes
  useEffect(() => {
    const handleFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement;
      setIsFullscreen(Boolean(fsEl && containerRef.current && fsEl === containerRef.current));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    setShowSettings(false);
    try {
      if (isEnded) {
        if (!isMuted) {
          player.unMute?.();
          player.setVolume?.(volume > 0 ? volume : 80);
        }
        player.seekTo?.(0, true);
        player.playVideo?.();
        setIsEnded(false);
        setIsPlaying(true);
        setHasStarted(true);
      } else if (isPlaying) {
        setIsPlaying(false);
        player.pauseVideo?.();
      } else {
        if (!isMuted) {
          player.unMute?.();
          player.setVolume?.(volume > 0 ? volume : 80);
        }
        setIsPlaying(true);
        setHasStarted(true);
        player.playVideo?.();
      }
    } catch {}
    scheduleHideControls();
  }, [isPlaying, isEnded, isMuted, volume, scheduleHideControls]);

  const seekBySeconds = useCallback((delta: number) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const cur = player.getCurrentTime?.() ?? currentTime;
      const dur = player.getDuration?.() ?? duration;
      const target = Math.max(0, Math.min(dur || cur + delta, cur + delta));
      setCurrentTime(target);
      player.seekTo?.(target, true);
    } catch {}
    scheduleHideControls();
  }, [currentTime, duration, scheduleHideControls]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute?.();
        const targetVol = volume > 0 ? volume : 80;
        player.setVolume?.(targetVol);
        setVolume(targetVol);
        setIsMuted(false);
      } else {
        player.mute?.();
        setIsMuted(true);
      }
    } catch {}
    scheduleHideControls();
  }, [isMuted, volume, scheduleHideControls]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolume(clamped);
    const player = playerRef.current;
    if (!player) return;
    try {
      if (clamped === 0) {
        player.mute?.();
        setIsMuted(true);
      } else {
        player.unMute?.();
        player.setVolume?.(clamped);
        setIsMuted(false);
      }
    } catch {}
    scheduleHideControls();
  }, [scheduleHideControls]);

  const handleSpeedSelect = useCallback((rate: number) => {
    setPlaybackRate(rate);
    try {
      playerRef.current?.setPlaybackRate?.(rate);
    } catch {}
    setSettingsTab('main');
    setShowSettings(false);
  }, []);

  const handleQualitySelect = useCallback((quality: string) => {
    setSelectedQuality(quality);
    try {
      if (quality === 'auto') {
        playerRef.current?.setPlaybackQuality?.('default');
      } else {
        playerRef.current?.setPlaybackQuality?.(quality);
      }
    } catch {}
    setSettingsTab('main');
    setShowSettings(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const fsEl =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement;

    if (fsEl) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      }
    } else {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      } else if ((el as any).mozRequestFullScreen) {
        (el as any).mozRequestFullScreen();
      }
    }
    scheduleHideControls();
  }, [scheduleHideControls]);

  const seekToClientX = useCallback((clientX: number) => {
    const track = progressTrackRef.current;
    if (!track || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    setCurrentTime(targetTime);
    try {
      playerRef.current?.seekTo?.(targetTime, true);
    } catch {}
  }, [duration]);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsSeeking(true);
    seekToClientX(e.clientX);
    const onMove = (moveEvt: PointerEvent) => seekToClientX(moveEvt.clientX);
    const onUp = () => {
      setIsSeeking(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const showPausedCover = !isPlaying || isEnded || !hasStarted;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      tabIndex={0}
      onMouseMove={scheduleHideControls}
      onMouseLeave={() => {
        if (isPlaying && !showSettings && !isSeeking) setShowControls(false);
      }}
      onKeyDown={(e) => {
        if (e.code === 'Space' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          togglePlayPause();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          seekBySeconds(10);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          seekBySeconds(-10);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          toggleMute();
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          toggleFullscreen();
        }
      }}
      aria-label={title || 'پخش ویدیو یوتیوب'}
      className={`relative w-full mx-auto overflow-hidden bg-black select-none outline-none shadow-2xl ${
        isFullscreen
          ? 'h-full max-w-none rounded-none border-0'
          : 'aspect-video min-h-[220px] sm:min-h-[300px] shrink-0 rounded-2xl border border-slate-800'
      }`}
      style={isFullscreen ? undefined : { maxWidth: 'min(100%, max(480px, calc(56vh * 16 / 9)))' }}
    >
      {/* YouTube IFrame API Mount Container (controls=0, completely under custom interactive shield) */}
      <div
        ref={mountNodeRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Interactive Video Surface Shield: prevents native YouTube "More videos" / pause popup & handles Play/Pause */}
      <div
        onClick={() => {
          if (showSettings) {
            setShowSettings(false);
            return;
          }
          togglePlayPause();
        }}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-pointer"
      >
        {/* Paused / Initial / Ended Cover so YouTube's "More videos" overlay never shows */}
        {showPausedCover && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center transition-opacity duration-200">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={title || ''}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-black/45 pointer-events-none" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform duration-150 hover:scale-105">
              {!isReady ? (
                <Loader2 className="w-7 h-7 animate-spin text-white" />
              ) : isEnded ? (
                <RotateCcw className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 fill-white text-white ml-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Buffering Spinner */}
        {isPlaying && isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Unified Bottom Controls Bar (All tools together at the bottom edge of the frame) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 z-20 pt-10 pb-2.5 px-3 sm:px-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent transition-opacity duration-200 ${
          showControls || showPausedCover || showSettings ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline / Seek Bar */}
        <div
          ref={progressTrackRef}
          onPointerDown={handleTrackPointerDown}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverSeekRatio(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
          onMouseLeave={() => setHoverSeekRatio(null)}
          className="group/track relative w-full h-4 flex items-center cursor-pointer mb-1.5"
        >
          {hoverSeekRatio !== null && duration > 0 && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-[11px] font-mono pointer-events-none border border-white/15"
              style={{ left: `${hoverSeekRatio * 100}%` }}
            >
              {formatDuration(hoverSeekRatio * duration)}
            </div>
          )}
          <div className="relative w-full h-1 group-hover/track:h-1.5 bg-white/25 rounded-full overflow-hidden transition-all">
            <div
              className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-red-600 shadow-md -translate-x-1/2 scale-0 group-hover/track:scale-100 transition-transform pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Bottom Toolbar Buttons Row */}
        <div className="flex items-center justify-between gap-2 text-white">
          {/* Left Controls: Play/Pause, Skip, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={togglePlayPause}
              title={isPlaying ? 'توقف' : 'پخش'}
              aria-label={isPlaying ? 'توقف' : 'پخش'}
              className="w-8 h-8 p-0 m-0 inline-flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition cursor-pointer shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white text-white" />
              ) : isEnded ? (
                <RotateCcw className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekBySeconds(-10)}
              title="۱۰ ثانیه عقب"
              aria-label="۱۰ ثانیه عقب"
              className="hidden sm:inline-flex w-8 h-8 p-0 m-0 items-center justify-center rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => seekBySeconds(10)}
              title="۱۰ ثانیه جلو"
              aria-label="۱۰ ثانیه جلو"
              className="hidden sm:inline-flex w-8 h-8 p-0 m-0 items-center justify-center rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition cursor-pointer shrink-0"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Toggle + Custom Slider (avoids Light Mode input CSS overrides) */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'وصل صدا' : 'قطع صدا'}
                aria-label={isMuted ? 'وصل صدا' : 'قطع صدا'}
                className={`w-8 h-8 p-0 m-0 inline-flex items-center justify-center rounded-lg transition cursor-pointer shrink-0 ${
                  isMuted ? 'bg-red-600/85 hover:bg-red-600 text-white' : 'hover:bg-white/15 text-white'
                }`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>

              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const track = e.currentTarget;
                  const updateVol = (clientX: number) => {
                    const rect = track.getBoundingClientRect();
                    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100;
                    handleVolumeChange(pct);
                  };
                  updateVol(e.clientX);
                  const onMove = (mv: PointerEvent) => updateVol(mv.clientX);
                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                  };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
                title="تنظیم صدا"
                className="hidden sm:flex items-center w-16 h-5 cursor-pointer"
              >
                <div className="relative w-full h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white rounded-full"
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Time / Total Duration */}
            <span className="text-[11px] sm:text-xs font-mono text-white/90 tabular-nums px-1.5 whitespace-nowrap">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Right Controls: Speed/Quality Settings & Fullscreen */}
          <div className="relative flex items-center gap-1 shrink-0">
            {/* Settings Popover anchored directly above bottom bar */}
            {showSettings && (
              <div
                dir="rtl"
                className="absolute bottom-11 right-0 w-52 rounded-xl bg-zinc-950/95 border border-white/15 shadow-2xl p-1.5 text-xs text-white backdrop-blur-md z-30"
              >
                {settingsTab === 'main' && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('speed')}
                      className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-bold">سرعت پخش</span>
                      <span className="text-white/75 font-mono">
                        {playbackRate === 1 ? 'عادی' : `${playbackRate}x`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsTab('quality')}
                      className="w-full px-3 py-2 rounded-lg hover:bg-white/10 text-white flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-bold">کیفیت ویدیو</span>
                      <span className="text-white/75 font-mono">
                        {QUALITY_LABELS[selectedQuality] || selectedQuality}
                      </span>
                    </button>
                  </div>
                )}

                {settingsTab === 'speed' && (
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('main')}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/10 text-white/90 font-bold text-right mb-1 cursor-pointer"
                    >
                      بازگشت ← سرعت پخش
                    </button>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleSpeedSelect(rate)}
                        className="w-full px-3 py-1.5 rounded-lg hover:bg-white/10 text-white flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-mono">{rate === 1 ? '1x (عادی)' : `${rate}x`}</span>
                        {playbackRate === rate && <Check className="w-3.5 h-3.5 text-red-500" />}
                      </button>
                    ))}
                  </div>
                )}

                {settingsTab === 'quality' && (
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('main')}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/10 text-white/90 font-bold text-right mb-1 cursor-pointer"
                    >
                      بازگشت ← کیفیت
                    </button>
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleQualitySelect(q)}
                        className="w-full px-3 py-1.5 rounded-lg hover:bg-white/10 text-white flex items-center justify-between cursor-pointer"
                      >
                        <span>{QUALITY_LABELS[q] || q}</span>
                        {selectedQuality === q && <Check className="w-3.5 h-3.5 text-red-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowSettings((prev) => !prev);
                setSettingsTab('main');
              }}
              title="تنظیمات سرعت و کیفیت"
              aria-label="تنظیمات سرعت و کیفیت"
              className={`w-8 h-8 p-0 m-0 inline-flex items-center justify-center rounded-lg transition cursor-pointer shrink-0 ${
                showSettings ? 'bg-white/20 text-white' : 'hover:bg-white/15 text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-white" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
              aria-label={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
              className="w-8 h-8 p-0 m-0 inline-flex items-center justify-center rounded-lg hover:bg-white/15 text-white transition cursor-pointer shrink-0"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-white" />
              ) : (
                <Maximize className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
