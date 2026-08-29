'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        requestAnimationFrame(scanTick);
      } catch (err) {
        setStatusMsg('Camera access denied or unavailable.');
        setScanning(false);
      }
    }

    startCamera();

    function scanTick() {
      if (!scanning) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, canvas.width, canvas.height);
            // Note: If using jsQR or native barcode detector, process here.
            // For now, let's make sure manual or automated decoding correctly parses JSON.
          }
        }
      }
      animId = requestAnimationFrame(scanTick);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scanning]);

  // Handle successful QR scan data string
  const handleSuccessfulScan = async (rawText: string) => {
    if (!rawText) return;
    setScanning(false);
    
    let checkpointId = null;
    let checkpointName = rawText;

    try {
      const parsed = JSON.parse(rawText);
      if (parsed.checkpoint_id) {
        checkpointId = parsed.checkpoint_id;
        checkpointName = parsed.checkpoint_name || rawText;
      }
    } catch (e) {
      // Not JSON, treat as raw name/ID
      checkpointName = rawText;
    }

    try {
      const { error } = await supabase.from('patrol_logs').insert([
        {
          checkpoint_id: checkpointId,
          guard_id: null,
          scanned_at: new Date().toISOString(),
          scanned_location: gps.lat && gps.lng ? `Lat: ${gps.lat}, Lng: ${gps.lng}` : 'GPS Unavailable',
          notes: `${guardName}: ${isIncident ? '[INCIDENT] ' : ''}${notes || 'Normal Patrol Scan'} (Checkpoint: ${checkpointName})`,
        },
      ]);

      if (error) throw error;
      setStatusMsg(`Success! Logged checkpoint: ${checkpointName}`);
      alert(`Patrol logged successfully for ${checkpointName}!`);
      if (onClose) onClose();
    } catch (err: any) {
      setStatusMsg('Error saving scan: ' + err.message);
      setScanning(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">QR Viewfinder</h2>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1 bg-slate-800 rounded-xl">
              ✕ Close
            </button>
          )}
        </div>

        <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-8 border-2 border-cyan-500/50 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono bg-slate-950/80 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/30">
              {statusMsg}
            </span>
          </div>
        </div>

        {/* Manual Fallback / Testing simulator input for debugging or desktop testing */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-[10px] font-mono uppercase text-cyan-400">Simulate / Paste QR Scan Payload</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste or test QR JSON string here..."
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSuccessfulScan((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase transition-all">
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
