import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, SwitchCamera, Zap, ZapOff, Upload, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (token: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  const animationFrameId = useRef<number | null>(null);

  // Extract token from either raw token "ABC123XYZ" or URL "https://.../learn/ABC123XYZ"
  const extractToken = (raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.includes('/learn/')) {
      const parts = trimmed.split('/learn/');
      const tokenWithQuery = parts[parts.length - 1];
      return tokenWithQuery.split('?')[0].split('#')[0].replace(/\/+$/, '');
    }
    return trimmed;
  };

  const startCamera = async (facing: 'environment' | 'user') => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check torch capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser settings, or enter the code manually below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      }
      setCameraError(msg);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setTorchOn(false);
  };

  // Continuous frame analysis loop
  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const token = extractToken(code.data);
            if (token) {
              setScannedFeedback(token);
              // Trigger vibration if available
              if ('vibrate' in navigator) {
                try {
                  navigator.vibrate(100);
                } catch (e) {}
              }
              setTimeout(() => {
                stopCamera();
                onScanSuccess(token);
              }, 400);
              return;
            }
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isOpen) {
      setScannedFeedback(null);
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraFacing]);

  useEffect(() => {
    if (stream && isOpen && !scannedFeedback) {
      animationFrameId.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [stream, isOpen, scannedFeedback]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
  };

  // Image file QR scanner fallback
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          setIsProcessingFile(false);

          if (code && code.data) {
            const token = extractToken(code.data);
            setScannedFeedback(token);
            setTimeout(() => {
              stopCamera();
              onScanSuccess(token);
            }, 300);
          } else {
            alert('No valid QR code was detected in this image. Please ensure the QR is clear and well-lit.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const token = extractToken(manualCode);
      stopCamera();
      onScanSuccess(token);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-stone-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800/80 bg-stone-900/90 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Scan Book Page QR</h3>
              <p className="text-xs text-stone-400">Point your camera at the page code</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition active:scale-95"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Reticle Overlay */}
          {!cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer dimmed mask */}
              <div className="absolute inset-0 border-[36px] border-black/55 sm:border-[44px]" />

              {/* Viewfinder Box */}
              <div className="relative w-64 h-64 border-2 border-dashed border-white/40 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                {/* 4 White Corners */}
                <span className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <span className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <span className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <span className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-xl" />

                {/* Animated scanning laser line */}
                {!scannedFeedback && (
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#ffffff] animate-scan" />
                )}

                {/* Scanned success animation */}
                {scannedFeedback && (
                  <div className="absolute inset-0 bg-black/90 border border-white flex flex-col items-center justify-center text-white rounded-xl animate-scaleUp">
                    <CheckCircle2 className="w-12 h-12 text-white mb-2 animate-bounce" />
                    <span className="text-sm font-bold">QR Detected!</span>
                    <span className="text-xs text-stone-300 font-mono mt-1">{scannedFeedback}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera controls toolbar inside camera overlay */}
          {!cameraError && (
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-3 rounded-full backdrop-blur-md transition active:scale-90 ${
                    torchOn ? 'bg-white text-black' : 'bg-black/60 text-white hover:bg-black/80'
                  }`}
                  title="Toggle Flashlight"
                >
                  {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={switchCamera}
                className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md active:scale-90 transition"
                title="Switch Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md active:scale-90 transition"
                title="Scan QR from photo"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-stone-950 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-stone-800 text-white flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1.5">Camera Not Accessible</h4>
              <p className="text-xs text-stone-400 max-w-xs mb-4 leading-relaxed">{cameraError}</p>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacing)}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-white transition"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-stone-200 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo from Gallery
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input for Gallery upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Manual Code Fallback & Alternative */}
        <div className="p-4 sm:p-5 bg-stone-900 border-t border-stone-800">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
            <span className="font-medium">Or enter QR Token manually:</span>
            <span className="text-[11px] text-stone-500">e.g. ABC123XYZ</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123XYZ or full link"
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-white font-mono uppercase"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessingFile}
              className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-stone-200 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Go</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
