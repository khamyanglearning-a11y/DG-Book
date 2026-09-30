import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  src?: string | null;
  label?: string;
  subLabel?: string;
  variant?: 'full' | 'compact' | 'mini';
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  label,
  subLabel,
  variant = 'compact',
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasAudio = Boolean(src && src.trim().length > 0 && !hasError);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || !hasAudio) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Audio playback error:', err);
          setIsPlaying(false);
          setIsLoading(false);
        });
    }
  };

  const handleReplay = () => {
    if (!audioRef.current || !hasAudio) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.25, 0.75];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    audioRef.current.playbackRate = nextSpeed;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!hasAudio) {
    if (variant === 'mini') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400 border border-stone-200 dark:border-stone-800">
          <VolumeX className="w-3.5 h-3.5 text-stone-500" />
          <span>Audio not available</span>
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-stone-100/90 border border-stone-300 dark:bg-stone-900/90 dark:border-stone-800 text-stone-700 dark:text-stone-300 text-xs sm:text-sm">
        <VolumeX className="w-4 h-4 text-stone-500 flex-shrink-0" />
        <span className="font-medium">Audio not available</span>
        {label && <span className="text-stone-500">({label})</span>}
      </div>
    );
  }

  // Mini variant: just a big rounded button, perfect for inside word cards
  if (variant === 'mini') {
    return (
      <div className="inline-flex items-center">
        <audio
          ref={audioRef}
          src={src || ''}
          preload="metadata"
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
        />
        <button
          type="button"
          onClick={togglePlay}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-xs border ${
            isPlaying
              ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white ring-2 ring-stone-400'
              : 'bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 border-black dark:border-white'
          }`}
          title={isPlaying ? 'Pause' : 'Listen'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'Playing...' : label || 'Listen'}</span>
        </button>
      </div>
    );
  }

  // Full / Compact variant (for Full Page Audio or Summary Audio)
  return (
    <div className="w-full bg-white dark:bg-black border border-black/15 dark:border-white/20 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all">
      <audio
        ref={audioRef}
        src={src || ''}
        preload="metadata"
        autoPlay={autoPlay}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />

      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div>
          <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-black dark:text-white" />
            {label || 'Page Audio'}
          </h4>
          {subLabel && <p className="text-xs text-stone-500 dark:text-stone-400">{subLabel}</p>}
        </div>

        {/* Speed toggle */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="text-xs px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-900 text-black dark:text-white border border-stone-200 dark:border-stone-800 font-bold hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          title="Audio speed"
        >
          {playbackRate}x
        </button>
      </div>

      {/* Progress slider */}
      <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 mb-3">
        <span className="w-10 text-right font-mono">{formatTime(currentTime)}</span>
        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
          />
        </div>
        <span className="w-10 font-mono">{formatTime(duration)}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleReplay}
          className="p-2.5 rounded-full text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 active:scale-95 transition"
          title="Replay from start"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 active:scale-95 shadow-md transition border border-black dark:border-white"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            if (!audioRef.current) return;
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            audioRef.current.muted = nextMuted;
          }}
          className="p-2.5 rounded-full text-black dark:text-white hover:bg-stone-100 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 active:scale-95 transition"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
