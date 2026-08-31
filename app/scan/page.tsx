'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ScanContent() {
  const searchParams = useSearchParams();
  const [guardName, setGuardName] = useState('James John');
  const [locationName, setLocationName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loc = searchParams.get('loc') || '';
    const cp = searchParams.get('cp') || '';
    if (loc) setLocationName(loc);
    if (cp) setCheckpointName(cp);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(5));
          setLng(position.coords.longitude.toFixed(5));
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, [searchParams]);

  const handleSubmitPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const gpsStr = lat && lng ? `${lat}, ${lng}` : '';

    try {
      const payload = {
        guard_name: guardName,
        location: locationName,
        location_name: locationName,
        checkpoint: checkpointName,
        checkpoint_name: checkpointName,
        name: checkpointName,
        latitude: lat,
        longitude: lng,
        gps_coordinates: gpsStr,
        notes: notes
      };

      const { error } = await supabase.from('patrol_logs').insert([payload]);
      if (error) throw error;

      setSuccessMsg('Patrol telemetry successfully recorded and verified.');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit patrol log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center pb-4 mb-4 border-b border-slate-800">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-lg font-bold text-white mt-1">Guard Patrol Scanner</h1>
          <p className="text-xs text-slate-400 mt-0.5">Scan physical checkpoint QRs and capture live GPS telemetry.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 text-xs p-3 rounded-lg mb-4">
            Error: {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-lg mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmitPatrol} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Guard Name</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location Site</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Checkpoint</label>
            <input
              type="text"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">GPS Coordinates (Live)</label>
            <input
              type="text"
              readOnly
              value={lat && lng ? `${lat}, ${lng}` : 'Acquiring GPS...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Incident Report / Notes</label>
            <textarea
              rows={3}
              placeholder="Describe any anomalies or leave blank..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950/50"
          >
            {submitting ? 'Submitting Patrol...' : 'Submit Patrol Log'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-10 text-center">Loading Scanner...</div>}>
      <ScanContent />
    </Suspense>
  );
}
