import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  FastForward,
  Radio,
  Sliders,
} from 'lucide-react';
import { formatAudioDuration } from '../utils/audioUtils';

export interface VoiceMessagePlayerProps {
  id?: string;
  audioUrl: string;
  duration?: number;
  category?: 'status' | 'delay' | 'arrival' | 'refill' | 'urgent' | 'general';
  caption?: string;
  isMe?: boolean;
  activeAudioId?: string | null;
  onPlayStart?: (id: string) => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { labelEn: string; labelSw: string; bg: string; text: string; icon: string; border: string }
> = {
  arrival: {
    labelEn: 'Arrival Notice',
    labelSw: 'Taarifa ya Kuwasili',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: '📍',
  },
  refill: {
    labelEn: 'Refill & Collection',
    labelSw: 'Ujazo & Chupa Tupu',
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: '📦',
  },
  delay: {
    labelEn: 'Traffic / Route Delay',
    labelSw: 'Foleni / Kuchelewa Njia',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: '⚠️',
  },
  urgent: {
    labelEn: 'Urgent Dispatch',
    labelSw: 'Dharura ya Safari',
    bg: 'bg-red-950/80',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: '🚨',
  },
  status: {
    labelEn: 'En Route Check-in',
    labelSw: 'Niko Njiani',
    bg: 'bg-teal-950/80',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    icon: '🚚',
  },
  general: {
    labelEn: 'Verbal Dispatch Update',
    labelSw: 'Ujumbe wa Sauti',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: '🎙️',
  },
};

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2];

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  id,
  audioUrl,
  duration = 0,
  category = 'general',
  caption,
  isMe = false,
  activeAudioId,
  onPlayStart,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showVolumeControl, setShowVolumeControl] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [timeMode, setTimeMode] = useState<'elapsed' | 'remaining'>('elapsed');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Initialize audio instance
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.max(1, Math.round(audio.duration)));
      }
    };

    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Coordinate with global active audio ID: pause if another message starts playing
  useEffect(() => {
    if (activeAudioId && id && activeAudioId !== id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [activeAudioId, id, isPlaying]);

  // Play / Pause Toggle
  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        if (id && onPlayStart) {
          onPlayStart(id);
        }
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.volume = isMuted ? 0 : volume;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('[VoicePlayer] Playback could not start:', err);
        setIsPlaying(false);
      }
    }
  };

  // Precise Seek to a fraction / timestamp
  const seekToTime = useCallback(
    (targetTime: number) => {
      if (!audioRef.current) return;
      const safeTime = Math.max(0, Math.min(targetTime, totalDuration || 0.1));
      audioRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
    },
    [totalDuration]
  );

  // Jump relative seconds (-5s / +5s)
  const seekDelta = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(currentTime + seconds, totalDuration));
    seekToTime(newTime);
  };

  // Replay from beginning
  const handleRestart = () => {
    seekToTime(0);
    if (!isPlaying) {
      togglePlay();
    }
  };

  // Click or drag on scrubber track
  const handleScrubberInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalDuration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const target = fraction * totalDuration;
    seekToTime(target);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || totalDuration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(fraction * totalDuration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // Cycle playback speed
  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % PLAYBACK_SPEEDS.length;
    const nextRate = PLAYBACK_SPEEDS[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Toggle Mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.volume = newMuted ? 0 : volume;
  };

  // Volume slider change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const categoryMeta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Render 24 dynamic waveform bars
  const waveformHeights = [
    25, 40, 70, 85, 60, 35, 60, 80, 95, 75, 50, 80, 100, 85, 65, 75, 90, 70, 55, 45, 65, 50, 35, 20,
  ];

  return (
    <div className="flex flex-col gap-2 w-full min-w-[260px] sm:min-w-[320px] select-none">
      {/* Header Info: Category Pill & Source Indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${categoryMeta.bg} ${categoryMeta.border} ${categoryMeta.text} shadow-sm`}
          >
            <span>{categoryMeta.icon}</span>
            <span>{categoryMeta.labelEn}</span>
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
              isMe
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/20'
                : 'bg-[#122416] text-[#A0B0C0] border border-white/5'
            }`}
          >
            {isMe ? 'Sent Update' : 'Received Update'}
          </span>
        </div>

        {/* Time Mode Badge (click to toggle between Elapsed and Remaining) */}
        <button
          type="button"
          onClick={() => setTimeMode(timeMode === 'elapsed' ? 'remaining' : 'elapsed')}
          className="text-[10px] font-mono text-[#A0B0C0] hover:text-white px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 transition-colors"
          title="Click to toggle elapsed / remaining time"
        >
          {timeMode === 'elapsed'
            ? `${formatAudioDuration(currentTime)} / ${formatAudioDuration(totalDuration)}`
            : `-${formatAudioDuration(Math.max(0, totalDuration - currentTime))}`}
        </button>
      </div>

      {/* Main Playback Control Deck */}
      <div
        className={`p-3 rounded-2xl border transition-all ${
          isMe
            ? 'bg-[#004A29]/95 border-[#00C46A]/40 shadow-lg shadow-[#004A29]/30'
            : 'bg-[#0E1C12]/95 border-[#2A5038] shadow-lg shadow-black/40'
        }`}
      >
        {/* Top Controls Row: Primary Buttons & Seek Actions */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {/* Left: Play/Pause and Seek Jump Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 ${
                isPlaying
                  ? 'bg-[#00C46A] text-[#0A1A0F] ring-4 ring-[#00C46A]/30 animate-pulse-subtle'
                  : 'bg-[#00C46A] hover:bg-[#00E57B] text-[#0A1A0F] hover:shadow-lg'
              }`}
              title={isPlaying ? 'Pause verbal note' : 'Play verbal note'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Seek Back -5s */}
            <button
              type="button"
              onClick={() => seekDelta(-5)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/25 hover:bg-black/40 border border-white/10 text-[#C0D0E0] hover:text-white transition-colors active:scale-90"
              title="Skip backward 5 seconds"
              aria-label="Skip backward 5 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Seek Forward +5s */}
            <button
              type="button"
              onClick={() => seekDelta(5)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/25 hover:bg-black/40 border border-white/10 text-[#C0D0E0] hover:text-white transition-colors active:scale-90"
              title="Skip forward 5 seconds"
              aria-label="Skip forward 5 seconds"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Replay to beginning if near end */}
            {currentTime > 0 && currentTime >= totalDuration - 0.5 && (
              <button
                type="button"
                onClick={handleRestart}
                className="px-2 py-1 rounded-lg bg-[#00C46A]/20 hover:bg-[#00C46A] text-[#00C46A] hover:text-[#0A1A0F] border border-[#00C46A]/30 text-[10px] font-bold transition-all flex items-center gap-1"
                title="Replay from start"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay</span>
              </button>
            )}
          </div>

          {/* Right: Playback Speed & Volume/Mute Controls */}
          <div className="flex items-center gap-1.5 relative">
            {/* Speed Multiplier Pill */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-white bg-black/30 hover:bg-black/50 border border-white/15 transition-colors shadow-inner flex items-center gap-1"
              title="Change playback speed"
            >
              <FastForward className="w-3 h-3 text-[#00C46A]" />
              <span>{playbackRate}x</span>
            </button>

            {/* Volume / Mute Button */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeControl(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/25 hover:bg-black/40 border border-white/10 text-[#C0D0E0] hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#00C46A]" />
                )}
              </button>

              {/* Volume Slider Popover */}
              {showVolumeControl && (
                <div
                  onMouseLeave={() => setShowVolumeControl(false)}
                  className="absolute right-0 bottom-full mb-2 bg-[#0A1A0F] border border-[#2A5038] rounded-xl p-2.5 shadow-2xl flex items-center gap-2 z-30 animate-in fade-in"
                >
                  <span className="text-[10px] text-[#A0B0C0] font-mono">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-[#00C46A] h-1.5 bg-[#1A2E1C] rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Interactive Dual Scrubbing & Waveform Track */}
        <div
          ref={progressRef}
          onClick={handleScrubberInteraction}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-pointer group pt-1 pb-1 relative select-none"
          title="Click or drag to seek to exact moment"
        >
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-5 -translate-x-1/2 bg-black/80 text-[#00C46A] text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/10 pointer-events-none shadow"
              style={{
                left: `${totalDuration > 0 ? (hoverTime / totalDuration) * 100 : 0}%`,
              }}
            >
              {formatAudioDuration(hoverTime)}
            </div>
          )}

          {/* Dynamic Waveform Visualizer */}
          <div className="flex items-center gap-[3px] h-7 mb-1.5 px-0.5">
            {waveformHeights.map((h, idx) => {
              const barFraction = (idx / waveformHeights.length) * 100;
              const isFilled = barFraction <= progressPercent;
              const isHovered =
                hoverTime !== null &&
                barFraction <= (hoverTime / (totalDuration || 1)) * 100;

              // Pulsing dynamic height when audio is actively playing
              const dynamicHeight = isPlaying
                ? Math.max(20, h * (0.85 + Math.sin(idx * 0.7 + currentTime * 6) * 0.2))
                : h;

              return (
                <div
                  key={idx}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${dynamicHeight}%`,
                    backgroundColor: isFilled
                      ? '#00C46A'
                      : isHovered
                      ? '#6EE7B7'
                      : isMe
                      ? 'rgba(255,255,255,0.22)'
                      : 'rgba(255,255,255,0.16)',
                  }}
                />
              );
            })}
          </div>

          {/* Precision Continuous Scrubber Track */}
          <div className="relative w-full h-2 bg-black/30 rounded-full overflow-visible border border-white/10 flex items-center">
            {/* Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-[#00A859] to-[#00E57B] rounded-full transition-all duration-75 relative"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              {/* Scrub Handle Thumb */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-[#00A859] group-hover:scale-125 transition-transform" />
            </div>
          </div>
        </div>

        {/* Bottom Time Indicators */}
        <div className="flex items-center justify-between text-[10px] text-[#A0B0C0] font-mono mt-1 px-0.5">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
            <span>{formatAudioDuration(currentTime)}</span>
          </span>
          <span className="text-[#8899AA]">
            {formatAudioDuration(totalDuration)}
          </span>
        </div>
      </div>

      {/* Verbal Message Caption / Transcription Note */}
      {caption && (
        <div
          className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
            isMe
              ? 'bg-[#00381F]/70 border-[#00C46A]/20 text-[#E0F2E9]'
              : 'bg-[#0A160D]/80 border-[#2A5038]/70 text-[#C8DCD0]'
          }`}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-[#00C46A] font-bold text-xs mt-0.5">&ldquo;</span>
            <p className="flex-1 italic">{caption}</p>
            <span className="text-[#00C46A] font-bold text-xs mt-0.5">&rdquo;</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default VoiceMessagePlayer;
