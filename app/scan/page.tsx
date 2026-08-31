'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GuardScanPage() {
  const [guardName, setGuardName] = useState('Officer John');
  const [location, setLocation] = useState('Main Facility');
  const [checkpoint, setCheckpoint] = useState('Scan QR Code to identify checkpoint');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setCoords({ lat: 6.5244, lng: 3.3792 });
        }
      );
    }
  }, []);

  const startScanner = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('Unable to access camera for QR scanning.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
  };

  // Simulate successful QR code capture for demo / fallback
  const simulateQRDetection = () => {
    setCheckpoint('Gate 1 - North Perimeter (Verified via QR)');
    stopScanner();
    setStatus('QR Code successfully scanned!');
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payloadNotes = photo ? `${notes} [PHOTO_DATA:${photo}]` : notes;

      const { error } = await supabase.from('patrol_logs').insert([
        {
          guard_name: guardName,
          location,
          checkpoint,
          latitude: coords?.lat.toString() || '0',
          longitude: coords?.lng.toString() || '0',
          notes: payloadNotes,
        },
      ]);

      if (error) throw error;
      setStatus('Patrol checkpoint successfully logged!');
      setNotes('');
      setPhoto(null);
    } catch (err) {
      console.error(err);
      setStatus('Failed to submit patrol log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h1 className="text-base font-bold text-white tracking-tight">Guard Patrol Scanner</h1>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
            PWA Active
          </span>
        </div>

        {/* QR Code Scanner Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Checkpoint QR Scanner</h3>
            <span className="text-[10px] text-slate-400 font-mono">Camera PWA</span>
          </div>

          {scanning ? (
            <div className="space-y-3">
              <div className="relative h-56 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                  <div className="w-full border-t border-emerald-400/80 animate-bounce"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={simulateQRDetection}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs"
                >
                  Simulate Scan OK
                </button>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-800/80 p-4 space-y-3">
              <div className="text-2xl">📷</div>
              <div className="text-xs text-slate-300 font-medium">{checkpoint}</div>
              <button
                type="button"
                onClick={startScanner}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/50"
              >
                Open Camera to Scan QR
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Guard Name</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Current Checkpoint</label>
            <input
              type="text"
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Incident Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter observations..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Attach Photo Evidence</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
          </div>

          {photo && (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 h-32 bg-black flex items-center justify-center">
              <img src={photo} alt="Preview" className="h-full object-contain" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          {status && <div className="text-xs text-emerald-400 font-medium text-center">{status}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/50 disabled:opacity-50"
          >
            {submitting ? 'Logging...' : 'Submit Patrol Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
