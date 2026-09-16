import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Sparkles, SwitchCamera } from 'lucide-react';
import { ProofImage } from '../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (proof: ProofImage) => void;
  onFallbackToNativeInput: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToNativeInput,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProofImage['category']>('bottles');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);

  // Start camera stream
  const startCamera = async (mode: 'environment' | 'user') => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser or environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.warn('Live camera stream initialization failed:', err);
      setCameraError(err.message || 'Camera permission denied or camera unavailable');
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null);
      startCamera(facingMode);
    } else {
      // Cleanup stream when closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const handleToggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash animation trigger
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhotoUrl(dataUrl);

    // Pause video while reviewing
    video.pause();
  };

  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleConfirmProof = () => {
    if (!capturedPhotoUrl) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const proof: ProofImage = {
      id: `proof-cam-${Date.now()}`,
      name: `Photo Proof ${timestamp}`,
      dataUrl: capturedPhotoUrl,
      category: selectedCategory,
      uploadedAt: timestamp,
      size: `${Math.round((capturedPhotoUrl.length * 0.75) / 1024)} KB`,
    };

    onCapture(proof);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#122010] border border-[#00C46A]/50 rounded-2xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-[#2A5038] flex items-center justify-between bg-[#0A1A0F]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#00C46A]/20 rounded-lg text-[#00C46A]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Staff Proof Camera</h3>
              <p className="text-[11px] text-[#8899AA]">Direct photo capture for delivery verification</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1A2E1C] hover:bg-[#253D28] text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Captured Image Area */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {/* Shutter flash overlay */}
          {flashAnimation && <div className="absolute inset-0 bg-white z-20 animate-ping opacity-90" />}

          {/* Captured Preview */}
          {capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Captured Proof"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : cameraError ? (
            /* Error / Permission Fallback Screen */
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white">Camera Access Notice</div>
              <p className="text-xs text-[#8899AA] max-w-xs mx-auto">
                {cameraError.includes('permission')
                  ? 'Camera permission is required. You can also trigger the device native camera app directly.'
                  : 'Live viewfinder is restricted in this window. Triggering native device camera directly...'}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFallbackToNativeInput();
                  }}
                  className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Native Device Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="text-xs text-[#8899AA] hover:text-white flex items-center justify-center gap-1 py-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera Permission</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Video Viewfinder */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Grid overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/20 m-4 rounded-xl flex items-center justify-center">
                <div className="w-12 h-12 border-t-2 border-l-2 border-[#00C46A] absolute top-2 left-2" />
                <div className="w-12 h-12 border-t-2 border-r-2 border-[#00C46A] absolute top-2 right-2" />
                <div className="w-12 h-12 border-b-2 border-l-2 border-[#00C46A] absolute bottom-2 left-2" />
                <div className="w-12 h-12 border-b-2 border-r-2 border-[#00C46A] absolute bottom-2 right-2" />
              </div>

              {/* Toggle camera facing (front/back) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full border border-white/20 backdrop-blur-sm z-10 transition-transform active:scale-95"
                title="Switch Camera (Rear/Front)"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {isInitializing && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-[#00C46A] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Starting camera hardware...</span>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls and Categorization */}
        <div className="p-4 bg-[#0A1A0F] border-t border-[#2A5038] space-y-3">
          {capturedPhotoUrl ? (
            /* Photo Confirmation & Tagging */
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="text-xs font-semibold text-[#8899AA] block mb-1">
                  Tag Evidence Type:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ProofImage['category'])}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] text-white text-xs rounded-xl p-2.5 focus:border-[#00C46A] focus:outline-none"
                >
                  <option value="empty_bottles">Empty Bottles Return Tally (18.9L / 13L)</option>
                  <option value="odometer">Vehicle Odometer / Shift End Mileage</option>
                  <option value="fuel_slip">Fuel Expense / Petrocity Receipt</option>
                  <option value="signed_challan">Signed Customer Delivery Note</option>
                  <option value="damage">Damaged / Leaking Water Bottle</option>
                  <option value="other">General Field Proof</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 bg-[#1A2E1C] hover:bg-[#253D28] text-[#D0E8F0] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-[#3A5068]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmProof}
                  className="flex-1 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#00C46A]/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Attach Proof</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Shutter Controls */
            !cameraError && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFallbackToNativeInput();
                  }}
                  className="text-xs text-[#8899AA] hover:text-[#00C46A] transition-colors flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Use OS Camera App</span>
                </button>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={isInitializing}
                  className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  title="Capture Photo"
                >
                  <div className="w-11 h-11 rounded-full border-2 border-[#0A1A0F] bg-white flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[#0A1A0F]" />
                  </div>
                </button>

                <div className="w-20 text-right">
                  <span className="text-[10px] text-[#8899AA] block">High Res</span>
                  <span className="text-[10px] text-[#00C46A] font-bold">1080p</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
