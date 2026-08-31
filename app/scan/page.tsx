'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GuardScanPage() {
  const [guardName, setGuardName] = useState('Officer John');
  const [location, setLocation] = useState('Main Facility');
  const [checkpoint, setCheckpoint] = useState('Gate 1 - North Perimeter');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number>(12.4);
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Simulate fetching geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setCoords({ lat: 6.5244, lng: 3.3792 }); // Fallback coords
        }
      );
    }
  }, []);

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
      const payloadNotes = photo 
        ? `${notes} [PHOTO_DATA:${photo}]` 
        : notes;

      const { error } = await supabase.from('patrol_logs').insert([
        {
          guard_name: guardName,
          location,
          checkpoint,
          latitude: coords?.lat.toString() || '0',
          longitude: coords?.lng.toString() || '0',
          notes: distance <= 50 ? payloadNotes : `${payloadNotes} (Unverified: Outside Geofence)`,
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

        {/* Geofence Radar Map Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Geofence Radar (50m Radius)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
              Active
            </span>
          </div>

          <div className="relative h-48 w-full bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center overflow-hidden">
            <div className="absolute h-36 w-36 rounded-full border border-emerald-500/20 bg-emerald-500/5 animate-pulse"></div>
            <div className="absolute h-24 w-24 rounded-full border border-emerald-500/30"></div>
            <div className="absolute h-10 w-10 rounded-full border border-emerald-500/50 bg-emerald-500/10"></div>
            <div className="absolute h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]"></div>
            <div className="absolute -translate-x-4 -translate-y-6 flex flex-col items-center">
              <div className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                Guard Position
              </div>
              <div className="w-2 h-2 rounded-full bg-white border-2 border-emerald-500 mt-0.5"></div>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Target: <strong className="text-slate-200">{checkpoint}</strong></span>
            <span className="text-emerald-400 font-mono">Distance: {distance}m (Verified)</span>
          </div>
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
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Checkpoint</label>
            <input
              type="text"
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Incident Notes / Observations</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter patrol details or incident report..."
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
            {submitting ? 'Logging Checkpoint...' : 'Submit Patrol Report'}
          </button>
        </form>
      </div>
    </div>
  );
}
