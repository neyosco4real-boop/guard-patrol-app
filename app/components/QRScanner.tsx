'use client';

import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { submitPatrolScan } from '@/lib/supabase';

export default function QRScanner({ guardName = 'Guard Alpha', onClose }: { guardName?: string; onClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Align QR code in frame...');
  const [isIncident, setIsIncident] = useState(false);
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => console.warn('GPS Warning:', e),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    let animId: number;
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } }
        }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        setStatusMsg('Camera access denied.');
      }
    }

    function scanFrame() {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleCodeFound(code.data);
            return;
          }
        }
      }
      if (scanning) {
        animId = requestAnimationFrame(scanFrame);
      }
    }

    initCamera();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  const handleCodeFound = async (decodedText: string) => {
    setScanning(false);
    setStatusMsg('QR Detected! Saving scan...');

    let locationName = 'Multichoice - Customer hall';
    let checkpointName = decodedText;
    let targetLat: number | undefined;
    let targetLng: number | undefined;

    try {
      const parsed = JSON.parse(decodedText);
      locationName = parsed.location_name || parsed.location || locationName;
      checkpointName = parsed.checkpoint_name || parsed.name || checkpointName;
      targetLat = parsed.latitude || parsed.lat;
      targetLng = parsed.longitude || parsed.lng;
    } catch (e) {}

    const res = await submitPatrolScan({
      guardName,
      locationName,
      checkpointName,
      guardLat: gps.lat,
      guardLng: gps.lng,
      targetLat,
      targetLng,
      isIncident,
      notes
    });

    if (res.error) {
      setStatusMsg('Storage error! Check table permissions.');
    } else {
      setStatusMsg('Scan Delivered to Live Feed 32!');
    }

    setTimeout(() => {
      if (onClose) onClose();
      else setScanning(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-4 max-w-sm mx-auto">
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-black border-2 border-emerald-500">
        <video ref={videoRef} className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-2 border-dashed border-emerald-400 opacity-70 pointer-events-none m-10 rounded-lg animate-pulse" />
      </div>

      <p className="text-xs text-center text-emerald-400 font-mono font-bold">{statusMsg}</p>

      <div className="w-full space-y-2">
        <label className="flex items-center space-x-2 text-xs text-red-400 font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={isIncident}
            onChange={(e) => setIsIncident(e.target.checked)}
            className="rounded bg-slate-900 border-red-800 text-red-600 focus:ring-0"
          />
          <span>Report Incident</span>
        </label>

        {isIncident && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe incident details..."
            className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-white"
            rows={2}
          />
        )}
      </div>

      {onClose && (
        <button onClick={onClose} className="w-full py-2 bg-slate-800 text-xs text-slate-300 font-bold rounded">
          Close Scanner
        </button>
      )}
    </div>
  );
}
