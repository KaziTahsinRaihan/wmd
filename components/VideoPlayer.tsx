"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Captions,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RectangleHorizontal,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoPlayer({
  src,
  captionsSrc,
  poster,
  onEnded,
  completeAfterSeconds,
  onComplete,
  wide = false,
  onToggleWide,
}: {
  src: string;
  captionsSrc?: string;
  poster?: string;
  onEnded?: () => void;
  /** Fire `onComplete` once the viewer has actually watched this many seconds
   *  (forward playback only — seeking ahead doesn't count). */
  completeAfterSeconds?: number;
  /** Called once when the watch threshold is reached, or when the video ends. */
  onComplete?: () => void;
  /** Whether the page is rendering the player in wide/theater layout. */
  wide?: boolean;
  /** Toggle the page's Normal ↔ Wide layout. Omit to hide the control. */
  onToggleWide?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch-time tracking for auto-completion. Kept in refs so the <video>
  // listener effect doesn't need to re-subscribe as props/state change.
  const watchedRef = useRef(0);
  const lastTimeRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const completeAfterRef = useRef(completeAfterSeconds);
  onCompleteRef.current = onComplete;
  completeAfterRef.current = completeAfterSeconds;

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);

  // ---- Playback ----------------------------------------------------------
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(
      Math.max(0, v.currentTime + delta),
      v.duration || Infinity,
    );
  }, []);

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
  };

  const changeVolume = useCallback((next: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.min(1, Math.max(0, next));
    v.volume = clamped;
    v.muted = clamped === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const setSpeed = (r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setRate(r);
    setSpeedOpen(false);
  };

  const toggleCaptions = useCallback(() => {
    const v = videoRef.current;
    const track = v?.textTracks?.[0];
    if (!track) return;
    const next = track.mode !== "showing";
    track.mode = next ? "showing" : "hidden";
    setCaptionsOn(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }, []);

  // ---- Sync from the <video> element ------------------------------------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const fireComplete = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current?.();
    };

    const onTime = () => {
      setCurrent(v.currentTime);
      // Accumulate only forward, real-time playback (delta ≈ one tick); ignore
      // seeks so skipping ahead can't fake watch time.
      const delta = v.currentTime - lastTimeRef.current;
      if (delta > 0 && delta < 1.5) watchedRef.current += delta;
      lastTimeRef.current = v.currentTime;
      const threshold = completeAfterRef.current;
      if (threshold && watchedRef.current >= Math.min(threshold, v.duration || threshold)) {
        fireComplete();
      }
    };
    const onSeeking = () => {
      lastTimeRef.current = v.currentTime;
    };
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const onRate = () => setRate(v.playbackRate);
    const onProgress = () => {
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnd = () => {
      setPlaying(false);
      onEnded?.();
      fireComplete();
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("ratechange", onRate);
    v.addEventListener("progress", onProgress);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnd);
    // Captions start hidden regardless of the browser default.
    if (v.textTracks?.[0]) v.textTracks[0].mode = "hidden";

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("ratechange", onRate);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnd);
    };
  }, [onEnded]);

  // Track fullscreen state from the document (covers Esc-to-exit).
  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- Auto-hide controls while playing ---------------------------------
  const nudgeControls = useCallback(() => {
    setControlsShown(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimer.current = setTimeout(() => {
        setControlsShown(false);
        setSpeedOpen(false);
      }, 2600);
    }
  }, []);

  useEffect(() => {
    if (!playing) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setControlsShown(true);
    } else {
      nudgeControls();
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, nudgeControls]);

  // ---- Keyboard shortcuts (when the player is focused) ------------------
  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        e.preventDefault();
        skip(-10);
        break;
      case "ArrowRight":
        e.preventDefault();
        skip(10);
        break;
      case "ArrowUp":
        e.preventDefault();
        changeVolume((videoRef.current?.volume ?? 0) + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        changeVolume((videoRef.current?.volume ?? 0) - 0.1);
        break;
      case "m":
        toggleMute();
        break;
      case "c":
        toggleCaptions();
        break;
      case "f":
        toggleFullscreen();
        break;
      default:
        return;
    }
    nudgeControls();
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={nudgeControls}
      onMouseLeave={() => playing && setControlsShown(false)}
      className={`group relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black outline-none ring-1 ring-white/10 ${
        controlsShown ? "" : "cursor-none"
      }`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        onClick={togglePlay}
        className="h-full w-full bg-black"
      >
        {captionsSrc && (
          <track
            kind="subtitles"
            src={captionsSrc}
            srcLang="en"
            label="English"
            default={false}
          />
        )}
      </video>

      {/* Buffering spinner */}
      {buffering && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Big center play button when paused */}
      {!playing && !buffering && (
        <button
          type="button"
          aria-label="Play"
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/20 transition hover:bg-black/30"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-gradient text-ink-950 shadow-gold">
            <Play className="ml-1 h-7 w-7" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${
          controlsShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div className="group/seek relative mb-2 h-4 w-full cursor-pointer">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/35"
            style={{ width: `${bufPct}%` }}
          />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold-gradient"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 opacity-0 shadow transition-opacity group-hover/seek:opacity-100"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex items-center gap-1.5 text-white">
          <ControlButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </ControlButton>

          <ControlButton label="Back 10 seconds" onClick={() => skip(-10)}>
            <span className="relative grid place-items-center">
              <RotateCcw className="h-5 w-5" />
              <span className="absolute text-[8px] font-bold">10</span>
            </span>
          </ControlButton>

          <ControlButton label="Forward 10 seconds" onClick={() => skip(10)}>
            <span className="relative grid place-items-center">
              <RotateCw className="h-5 w-5" />
              <span className="absolute text-[8px] font-bold">10</span>
            </span>
          </ControlButton>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <ControlButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
              <VolumeIcon className="h-5 w-5" />
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-16 cursor-pointer accent-gold-400"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/85">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Playback speed */}
            <div className="relative">
              <ControlButton
                label="Playback speed"
                onClick={() => setSpeedOpen((o) => !o)}
                active={rate !== 1}
              >
                <span className="flex items-center gap-1">
                  <Gauge className="h-5 w-5" />
                  <span className="text-xs font-semibold tabular-nums">{rate}×</span>
                </span>
              </ControlButton>
              {speedOpen && (
                <div className="absolute bottom-10 right-0 z-10 rounded-lg border border-white/15 bg-ink-900/95 p-1 shadow-xl backdrop-blur">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`block w-full rounded px-3 py-1 text-right text-xs tabular-nums transition hover:bg-white/10 ${
                        s === rate ? "text-gold-300" : "text-white/80"
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {captionsSrc && (
              <ControlButton
                label="Captions"
                onClick={toggleCaptions}
                active={captionsOn}
              >
                <Captions className="h-5 w-5" />
              </ControlButton>
            )}

            {onToggleWide && (
              <ControlButton
                label={wide ? "Normal view" : "Wide view"}
                onClick={onToggleWide}
                active={wide}
              >
                <RectangleHorizontal className="h-5 w-5" />
              </ControlButton>
            )}

            <ControlButton
              label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid place-items-center rounded p-1.5 transition hover:bg-white/15 ${
        active ? "text-gold-300" : "text-white"
      }`}
    >
      {children}
    </button>
  );
}
