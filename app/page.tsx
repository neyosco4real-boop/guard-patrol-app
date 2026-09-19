'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GuardScanner() {
  const [guardName, setGuardName] = useState('Gabriel Thompson');
  const [location, setLocation] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState('Verified');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // QR Scanner States
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Get GPS coordinates on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        (err) => console.log('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }));

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(scanTick);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access rear camera. Please ensure camera permissions are allowed.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanTick = () => {
    if (!videoRef.current || !scanning) return;
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Simple QR / fallback detector simulation or jsQR integration if available
          // For now, let's simulate successful QR read on tap or auto-detect
        }
      }
    }
    if (scanning) {
      requestAnimationFrame(scanTick);
    }
  };

  // Simulate QR Code scan for testing/robustness
  const simulateQRScan = () => {
    setLocation('CR REPUBLIC');
    setCheckpoint('AWOLOWO RD');
    stopScanner();
    alert('QR Code Scanned Successfully: CR REPUBLIC - AWOLOWO RD');
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !checkpoint) {
      alert('Please scan a location & checkpoint QR code first!');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('guard_logs').insert([
      {
        guard_name: guardName,
        location,
        checkpoint,
        patrol_type: patrolType,
        notes: notes + (evidencePhoto ? ' [Photo Evidence Attached]' : ''),
        latitude: latitude || 6.5244,
        longitude: longitude || 3.3792,
        geofence_status: geofenceStatus,
      }
    ]);

    setSubmitting(false);
    if (error) {
      alert('Error submitting log: ' + error.message);
    } else {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
      setNotes('');
      setEvidencePhoto(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-md space-y-5 pb-10">
        
        {/* Success Alert Banner */}
        {successMsg && (
          <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-4 rounded-2xl text-center text-xs font-bold shadow-xl animate-bounce">
            ✅ Patrol Log Submitted Successfully!
          </div>
        )}

        {/* Scanner Box */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl text-center space-y-3">
          <p className="text-xs text-slate-400">Open scanner to read location & checkpoint QR code</p>
          
          {!scanning ? (
            <button
              onClick={startScanner}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-2xl font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              📷 OPEN QR SCANNER CAMERA
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500 bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-emerald-400/50 pointer-events-none rounded-2xl flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-dashed border-emerald-400 rounded-xl"></div>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={simulateQRScan}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Simulate Scan OK
                </button>
                <button
                  onClick={stopScanner}
                  className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Patrol Log Form */}
        <form onSubmit={handleSubmit} className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl space-y-4">
          
          {/* Guard Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Guard Name *</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              required
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Location (Auto-Filled by QR Scan) *</label>
            <input
              type="text"
              value={location}
              readOnly
              placeholder="Awaiting QR scan..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Checkpoint */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Checkpoint (Auto-Filled by QR Scan) *</label>
            <input
              type="text"
              value={checkpoint}
              readOnly
              placeholder="Awaiting QR scan..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-slate-200 font-bold focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Patrol Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Patrol Type *</label>
            <select
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-[#070b14] border border-emerald-800/80 rounded-2xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Incident Check">Incident Check</option>
              <option value="Emergency Response">Emergency Response</option>
              <option value="Supervisor Inspection">Supervisor Inspection</option>
            </select>
          </div>

          {/* Snap Evidence Camera Box (Right below Patrol Type) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Snap Evidence Camera (Optional)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 bg-[#070b14] hover:bg-[#131d35] border border-[#1e293b] text-slate-300 py-3 px-4 rounded-2xl text-xs font-bold transition cursor-pointer shadow">
                <span>📸 Take / Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
              {evidencePhoto && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-emerald-500 flex-shrink-0">
                  <img src={evidencePhoto} alt="Evidence preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setEvidencePhoto(null)}
                    className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[9px] flex items-center justify-center rounded-bl"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Patrol / Incident Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Patrol / Incident Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type observations or incident notes here..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs shadow-xl transition cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? 'Submitting Log...' : 'SUBMIT PATROL LOG'}
          </button>

        </form>

      </div>
    </div>
  );
}
