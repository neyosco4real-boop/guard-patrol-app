'use client';

import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
        <h2 className="text-sm font-bold text-cyan-400 mb-3">📷 Scan Checkpoint QR Code</h2>
        
        <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 border-2 border-cyan-500/50 rounded-xl pointer-events-none m-8 flex items-center justify-center">
            <div className="w-full h-0.5 bg-red-500/80 animate-pulse"></div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <div className="flex gap-3 w-full mt-4">
          <button
            type="button"
            onClick={() => {
              onScan('Front Gate Checkpoint #101');
              onClose();
            }}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
          >
            Simulate Scan
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
