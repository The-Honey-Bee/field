import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Mic,
  MicOff,
  Square,
  Send,
  Trash2,
  Play,
  Pause,
  AlertCircle,
  Radio,
  Sparkles,
  Volume2,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  blobToBase64,
  formatAudioDuration,
  getSupportedAudioMimeType,
  generateSampleRadioTone,
} from '../utils/audioUtils';

export interface VoiceMessagePayload {
  audioUrl: string;
  audioDuration: number;
  voiceCategory: 'status' | 'delay' | 'arrival' | 'refill' | 'urgent' | 'general';
  content: string; // Brief caption or description of the voice note
}

interface VoiceMessageRecorderProps {
  onSendVoiceMessage: (payload: VoiceMessagePayload) => void;
  receiverName: string;
  disabled?: boolean;
}

const CATEGORY_PRESETS = [
  {
    id: 'arrival' as const,
    labelEn: '📍 Arrived at Site',
    labelSw: '📍 Nimefika Eneo la Kazi',
    defaultCaptionEn: 'Arrived at delivery location, checking in with receiving team.',
    defaultCaptionSw: 'Nimefika eneo la mteja, ninakabidhi mzigo kwa mpokeaji.',
  },
  {
    id: 'delay' as const,
    labelEn: '⚠️ Traffic / Route Delay',
    labelSw: '⚠️ Foleni / Kuchelewa Njia',
    defaultCaptionEn: 'Encountered route congestion along Mwanza corridor, slight ETA delay.',
    defaultCaptionSw: 'Kuna msongamano wa magari njia ya Mwanza, nitachelewa kidogo.',
  },
  {
    id: 'refill' as const,
    labelEn: '📦 Refill & Empties Collected',
    labelSw: '📦 Maji Yamefika & Chupa Tupu',
    defaultCaptionEn: 'Pure water bottles offloaded and empty returns counted and secured.',
    defaultCaptionSw: 'Chupa za maji zimeshushwa na chupa tupu zimehesabiwa kwenye gari.',
  },
  {
    id: 'status' as const,
    labelEn: '🚚 En Route Check-in',
    labelSw: '🚚 Niko Njiani',
    defaultCaptionEn: 'Departing previous stop, proceeding to next scheduled delivery.',
    defaultCaptionSw: 'Nimeondoka kituo kilichopita, ninaelekea kituo kinachofuata.',
  },
  {
    id: 'urgent' as const,
    labelEn: '🚨 Urgent Supervisor Notice',
    labelSw: '🚨 Taarifa ya Dharura',
    defaultCaptionEn: 'Urgent field notice requiring supervisor decision or assistance.',
    defaultCaptionSw: 'Taarifa ya haraka ya uwanjani inayohitaji uamuzi wa kiongozi.',
  },
];

export const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onSendVoiceMessage,
  receiverName,
  disabled = false,
}) => {
  const { isSwahili } = useLanguage();

  // Recorder states: 'idle' | 'recording' | 'preview'
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Preview playback state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Metadata tags
  const [selectedCategory, setSelectedCategory] = useState<
    'status' | 'delay' | 'arrival' | 'refill' | 'urgent' | 'general'
  >('status');
  const [captionText, setCaptionText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(1);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioStreams();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const cleanupAudioStreams = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Start voice recording
  const startRecording = async () => {
    setErrorMessage(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone recording is not supported on this browser or platform.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Audio analysis for live visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateMeter = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(5, Math.max(1, Math.round((avg / 255) * 5) + 1));
              setVolumeLevel(normalized);
              animFrameRef.current = window.requestAnimationFrame(updateMeter);
            }
          };
          updateMeter();
        }
      } catch {
        // Non-fatal if AudioContext is blocked
      }

      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupAudioStreams();
        const mime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);

        try {
          const base64 = await blobToBase64(blob);
          setAudioUrl(base64);
          setAudioDuration(recordingSeconds || 1);
          setRecorderState('preview');
        } catch (err: any) {
          setErrorMessage('Failed to process voice note recording: ' + err.message);
          setRecorderState('idle');
        }
      };

      mediaRecorder.start(250); // Slice every 250ms
      setRecorderState('recording');

      // Elapsed seconds counter
      let elapsed = 0;
      timerIntervalRef.current = window.setInterval(() => {
        elapsed++;
        setRecordingSeconds(elapsed);
        // Max 120s limit for field updates
        if (elapsed >= 120) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.warn('[VoiceRecorder] Mic access error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? isSwahili
            ? 'Ruhusa ya maikrofoni imekataliwa. Tafadhali ruhusu maikrofoni kwenye kivinjari au tumia sampuli ya jaribio.'
            : 'Microphone access denied. Please allow microphone permissions in your browser or test with a simulated update.'
          : err.message || 'Unable to access microphone'
      );
      setRecorderState('idle');
    }
  };

  // Stop recording and proceed to preview
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Discard recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanupAudioStreams();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setRecorderState('idle');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setIsPreviewPlaying(false);
  };

  // Preview Play / Pause
  const togglePreviewPlayback = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        setPreviewTime(audio.currentTime);
      });
      audio.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
        setPreviewTime(0);
      });
      audio.addEventListener('pause', () => {
        setIsPreviewPlaying(false);
      });
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch(() => setIsPreviewPlaying(false));
    }
  };

  // Send confirmed voice message
  const handleSend = () => {
    if (!audioUrl) return;

    const chosenPreset = CATEGORY_PRESETS.find((p) => p.id === selectedCategory);
    const fallbackCaption = isSwahili
      ? chosenPreset?.defaultCaptionSw || 'Taarifa ya sauti kutoka uwanjani'
      : chosenPreset?.defaultCaptionEn || 'Verbal field dispatch update';

    const finalCaption = captionText.trim() || fallbackCaption;

    onSendVoiceMessage({
      audioUrl,
      audioDuration: Math.max(1, audioDuration || recordingSeconds),
      voiceCategory: selectedCategory,
      content: finalCaption,
    });

    cancelRecording();
  };

  // Fallback / simulated verbal note generator for devices without mic or for rapid testing
  const handleSimulateVerbalUpdate = (category: 'arrival' | 'delay' | 'refill' | 'status') => {
    const toneData = generateSampleRadioTone(4, category);
    setAudioUrl(toneData);
    setAudioDuration(4);
    setSelectedCategory(category);
    const preset = CATEGORY_PRESETS.find((p) => p.id === category);
    setCaptionText(isSwahili ? preset?.defaultCaptionSw || '' : preset?.defaultCaptionEn || '');
    setRecorderState('preview');
  };

  return (
    <div className="w-full">
      {/* Idle State: Compact Microphone Action Button */}
      {recorderState === 'idle' && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="p-2.5 rounded-xl bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#2A5038] hover:border-[#00C46A] text-[#00C46A] hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5 group disabled:opacity-40"
            title={isSwahili ? 'Rekodi ujumbe wa sauti' : 'Record voice dispatch note'}
          >
            <Mic className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="hidden lg:inline text-[11px] font-semibold">
              {isSwahili ? 'Sauti' : 'Voice'}
            </span>
          </button>
        </div>
      )}

      {/* Recording In-Progress Banner */}
      {recorderState === 'recording' && (
        <div className="flex items-center justify-between gap-3 bg-[#1A1212] border border-red-500/40 rounded-xl px-3 py-2 animate-pulse-subtle shadow-lg">
          {/* Live indicator & Timer */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400 font-mono">
              REC {formatAudioDuration(recordingSeconds)}
            </span>
          </div>

          {/* Sound waves visualization */}
          <div className="flex items-center gap-1 h-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => {
              const isActive = (bar % 3) <= volumeLevel;
              return (
                <div
                  key={bar}
                  className="w-1 bg-red-500 rounded-full transition-all duration-75"
                  style={{
                    height: isActive ? `${Math.min(20, 6 + bar * 1.8)}px` : '4px',
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* Actions: Cancel or Stop & Review */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 transition-colors"
              title={isSwahili ? 'Ghairi' : 'Cancel & Discard'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>{isSwahili ? 'Kamilisha' : 'Stop & Preview'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Error or Permission Alert with Simulation Fallback */}
      {errorMessage && recorderState === 'idle' && (
        <div className="mt-2 p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="leading-snug">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Quick Simulation Option for testing */}
          <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#00C46A]" />
              {isSwahili ? 'Au tumia taarifa ya redio ya majaribio:' : 'Or test with dispatch radio audio:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSimulateVerbalUpdate('arrival')}
                className="px-2 py-1 bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#2A5038] text-[10px] text-white rounded-lg font-medium transition-colors"
              >
                📍 {isSwahili ? 'Kuwasili' : 'Arrival'}
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVerbalUpdate('delay')}
                className="px-2 py-1 bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#2A5038] text-[10px] text-white rounded-lg font-medium transition-colors"
              >
                ⚠️ {isSwahili ? 'Foleni' : 'Delay'}
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVerbalUpdate('refill')}
                className="px-2 py-1 bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#2A5038] text-[10px] text-white rounded-lg font-medium transition-colors"
              >
                📦 {isSwahili ? 'Ujazo' : 'Refill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Review Drawer Before Sending */}
      {recorderState === 'preview' && audioUrl && (
        <div className="bg-[#102014] border border-[#00C46A]/50 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#243447] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#00C46A]/20 flex items-center justify-center text-[#00C46A]">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">
                {isSwahili ? 'Kagua Ujumbe wa Sauti wa Uwanjani' : 'Review Verbal Dispatch Note'}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelRecording}
              className="text-[#8899AA] hover:text-white p-1 rounded-lg hover:bg-white/5"
              title={isSwahili ? 'Ghairi' : 'Discard'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mini Playback Preview */}
          <div className="flex items-center gap-3 bg-[#0A1A0F] p-2.5 rounded-xl border border-[#2A5038]">
            <button
              type="button"
              onClick={togglePreviewPlayback}
              className="w-8 h-8 rounded-full bg-[#00C46A] text-[#0A1A0F] flex items-center justify-center hover:bg-[#008F50] transition-colors shrink-0 shadow"
            >
              {isPreviewPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[10px] text-[#8899AA] mb-1 font-mono">
                <span>{formatAudioDuration(previewTime)}</span>
                <span>{formatAudioDuration(audioDuration)}</span>
              </div>
              <div className="w-full bg-[#1A2E1C] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00C46A] h-full transition-all duration-100"
                  style={{
                    width: `${audioDuration > 0 ? (previewTime / audioDuration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Category Dispatch Selector */}
          <div>
            <label className="text-[10px] font-bold text-[#A0B0C0] uppercase tracking-wider mb-1.5 block">
              {isSwahili ? 'Aina ya Taarifa:' : 'Update Category:'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.map((preset) => {
                const isSelected = selectedCategory === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(preset.id);
                      if (!captionText) {
                        setCaptionText(isSwahili ? preset.defaultCaptionSw : preset.defaultCaptionEn);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                      isSelected
                        ? 'bg-[#00C46A] text-[#0A1A0F] border-[#00C46A] shadow'
                        : 'bg-[#1A2E1C] text-[#D0E8F0] border-[#2A5038] hover:border-[#00C46A]/50'
                    }`}
                  >
                    {isSwahili ? preset.labelSw : preset.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Caption / Summary Note */}
          <div>
            <label className="text-[10px] font-bold text-[#A0B0C0] uppercase tracking-wider mb-1 block">
              {isSwahili ? 'Maelezo ya Kiongozi (Hiari):' : 'Brief Supervisor Note (Optional):'}
            </label>
            <input
              type="text"
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder={
                isSwahili
                  ? 'Mfano: Nimefika lango la Tilapia Hotel, chupa 20 zimeshushwa...'
                  : 'e.g. Arrived at Tilapia Hotel gate, 20 bottles offloaded...'
              }
              className="w-full bg-[#1A2E1C] border border-[#2A5038] focus:border-[#00C46A] rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#8899AA] focus:outline-none"
            />
          </div>

          {/* Action Buttons: Discard / Retake vs Send */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={startRecording}
              className="px-3 py-2 rounded-xl bg-[#1A2E1C] hover:bg-[#243E26] border border-[#2A5038] text-xs text-[#D0E8F0] font-medium transition-colors flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Rekodi Upya' : 'Re-record'}</span>
            </button>

            <button
              type="button"
              onClick={handleSend}
              className="flex-1 max-w-[220px] px-4 py-2 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSwahili ? `Tuma kwa ${receiverName}` : `Send to ${receiverName}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
