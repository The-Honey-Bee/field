// Audio utility functions for voice updates and dispatch walkie-talkie communication

/**
 * Format duration in seconds to M:SS (e.g. 0:08, 1:24)
 */
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Convert recorded Audio Blob to Base64 Data URL for persistent offline storage
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert audio blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Detect best supported audio mime type for the current browser/platform
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

/**
 * Generate a valid synthetic radio-tone WAV data URL for previews or fallback testing
 */
export function generateSampleRadioTone(
  durationSec: number = 3,
  type: 'arrival' | 'refill' | 'delay' | 'general' | 'status' | 'urgent' = 'arrival'
): string {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const headerSize = 44;
  const totalSize = headerSize + numSamples;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 1, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 8, true); // BitsPerSample (8 bits)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples, true);

  // Write radio walkie-talkie tones
  const baseFreq = type === 'arrival' ? 520 : type === 'delay' ? 380 : 440;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let freq = baseFreq;
    if (t < 0.12) {
      freq = 780; // walkie talkie beep in
    } else if (t > durationSec - 0.15) {
      freq = 620; // radio squelch out
    } else {
      freq = baseFreq + Math.sin(t * 8) * 40;
    }
    const amplitude = (t < 0.05 || t > durationSec - 0.05) ? 30 : 65;
    const sample = Math.floor(128 + amplitude * Math.sin(2 * Math.PI * freq * t));
    view.setUint8(headerSize + i, Math.max(0, Math.min(255, sample)));
  }

  // Convert arrayBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
