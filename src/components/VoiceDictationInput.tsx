import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  Globe,
  Trash2,
  Check,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface VoiceDictationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US / Field)' },
  { code: 'en-TZ', label: 'English (Tanzania)' },
  { code: 'sw-TZ', label: 'Kiswahili (Tanzania)' },
  { code: 'ar-SA', label: 'العربية (Arabic)' },
];

const FIELD_OBSERVATION_SHORTCUTS = [
  'All 65 empty 20L bottles verified and returned to depot rack.',
  'Van odometer checked. Fuel voucher 20L diesel filed.',
  'All cash and mobile collections balanced with shift orders.',
  'Depot security handover completed without any damaged bottles.',
];

export const VoiceDictationInput: React.FC<VoiceDictationInputProps> = ({
  value,
  onChange,
  placeholder = 'Dictate or type end-of-day field observations...',
  label = 'End-of-Day Site Observations & Handover Remarks',
  id = 'voice-notes-input',
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('en-US');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundLevel, setSoundLevel] = useState<number>(1);
  const [showQuickPhrases, setShowQuickPhrases] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const soundIntervalRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore cleanup error
        }
      }
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
    };
  }, []);

  // Simulate audio pulsation wave when dictation is active
  useEffect(() => {
    if (isListening) {
      soundIntervalRef.current = setInterval(() => {
        setSoundLevel(Math.floor(Math.random() * 4) + 1);
      }, 150);
    } else {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      setSoundLevel(1);
    }
  }, [isListening]);

  const startListening = () => {
    setErrorMessage(null);
    setInterimTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage(
        'Google Web Speech API is not supported in this browser. Please use Google Chrome on desktop or Android.'
      );
      return;
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscripts = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscripts += transcriptChunk;
          } else {
            interim += transcriptChunk;
          }
        }

        setInterimTranscript(interim);

        if (finalTranscripts) {
          onChange(
            value ? `${value.trim()} ${finalTranscripts.trim()}` : finalTranscripts.trim()
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permission in your browser address bar to dictate.'
          );
        } else if (event.error === 'no-speech') {
          // Normal timeout if user was silent
          setErrorMessage('No voice detected. Tap the mic and speak clearly.');
        } else if (event.error === 'network') {
          setErrorMessage(
            'Speech recognition network error. Ensure internet connection is active for Google Web Speech API transcription.'
          );
        } else {
          setErrorMessage(`Speech recognition error: ${event.error || 'Unknown error'}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start SpeechRecognition:', err);
      setErrorMessage(err.message || 'Could not initialize Google Web Speech API.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAppendPhrase = (phrase: string) => {
    onChange(value ? `${value.trim()} ${phrase}` : phrase);
    setShowQuickPhrases(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClear = () => {
    if (value && window.confirm('Clear observations text?')) {
      onChange('');
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header bar with Dictate Action */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#00C46A]" />
          <span>{label}</span>
          <span className="text-[10px] lowercase font-normal text-[#8899AA]">(voice-to-text enabled)</span>
        </label>

        {/* Controls: Language and Mic */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex items-center gap-1 bg-[#1A2E1C] border border-[#2A5038] rounded-lg px-2 py-1 text-[11px] text-[#D0E8F0]">
            <Globe className="w-3 h-3 text-[#00C46A]" />
            <select
              value={selectedLang}
              disabled={isListening}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent text-[11px] text-[#D0E8F0] focus:outline-none cursor-pointer"
              title="Dictation Language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-[#122010] text-white">
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Observation Chips toggle */}
          <button
            type="button"
            onClick={() => setShowQuickPhrases(!showQuickPhrases)}
            className="text-[11px] bg-[#1A2E1C] hover:bg-[#253D28] text-[#8899AA] hover:text-white px-2.5 py-1 rounded-lg border border-[#2A5038] flex items-center gap-1 transition-all"
            title="Quick Field Phrases"
          >
            <Sparkles className="w-3 h-3 text-[#00C46A]" />
            <span>Templates</span>
          </button>

          {/* Clear Button if text present */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-[#8899AA] hover:text-rose-400 p-1 rounded transition-colors"
              title="Clear notes"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Primary Voice-to-Text Button */}
          <button
            type="button"
            id="btn-voice-dictation-toggle"
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400/50'
                : 'bg-gradient-to-r from-[#006B3C] to-[#00C46A] hover:from-[#008F50] hover:to-[#00D674] text-white shadow-[#006B3C]/30'
            }`}
            title={isListening ? 'Stop voice dictation' : 'Start Google Web Speech dictation'}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5 animate-bounce" />
                <span>Stop Dictating</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Dictate Observation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Voice Listening Live Visualizer Banner */}
      {isListening && (
        <div className="bg-[#0A2616] border border-[#00C46A] p-3 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#00C46A]/20 text-[#00C46A]">
              <Radio className="w-4 h-4 animate-spin text-[#00C46A]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1">
                  Listening via Google Web Speech API
                </span>
                <span className="text-[10px] bg-[#00C46A]/20 text-[#00C46A] px-1.5 py-0.2 rounded font-mono font-bold">
                  {selectedLang}
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA] mt-0.5">
                {interimTranscript ? (
                  <span className="text-emerald-300 font-medium italic">"{interimTranscript}..."</span>
                ) : (
                  'Speak into your mobile or computer microphone now...'
                )}
              </p>
            </div>
          </div>

          {/* Sound Wave Graphic Simulation */}
          <div className="flex items-end gap-1 h-5 shrink-0 px-2 py-0.5 bg-black/30 rounded-lg">
            {[1, 2, 3, 4, 5].map((bar) => {
              const height = ((bar * soundLevel) % 4) + 1;
              return (
                <span
                  key={bar}
                  className="w-1 bg-[#00C46A] rounded-full transition-all duration-150"
                  style={{ height: `${height * 4}px` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Field Template Dropdown / Chips */}
      {showQuickPhrases && (
        <div className="bg-[#162719] border border-[#2A5038] rounded-xl p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>Tap to append standard field observations:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowQuickPhrases(false)}
              className="text-[#8899AA] hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {FIELD_OBSERVATION_SHORTCUTS.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAppendPhrase(phrase)}
                className="text-left bg-[#1A2E1C] hover:bg-[#253D28] border border-[#2A5038]/60 hover:border-[#00C46A]/50 p-2 rounded-lg text-[11px] text-[#D0E8F0] flex items-start gap-1.5 transition-all"
              >
                <Check className="w-3 h-3 text-[#00C46A] shrink-0 mt-0.5" />
                <span>{phrase}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error or Browser Warning Message */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/50 p-2.5 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-[11px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {!isSupported && !errorMessage && (
        <div className="bg-[#1A2E1C] border border-[#3A5068]/40 p-2.5 rounded-xl text-[11px] text-[#8899AA] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Google Web Speech API is supported best in Chrome on Android and Desktop. You can still type observation remarks manually below.
          </span>
        </div>
      )}

      {/* Primary Observations Textarea */}
      <div className="relative">
        <textarea
          id={id}
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[#1A2E1C] border ${
            isListening ? 'border-[#00C46A] ring-1 ring-[#00C46A]/50' : 'border-[#3A5068]'
          } rounded-xl p-3 text-xs text-white placeholder-[#8899AA] focus:outline-none focus:border-[#00C46A] transition-all`}
        />
        {isListening && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#00C46A]/20 border border-[#00C46A]/40 text-[#00C46A] px-2 py-0.5 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A] animate-ping" />
            <span>Dictating Live</span>
          </div>
        )}
      </div>
    </div>
  );
};
