'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GuardScannerPage() {
  const [guardName, setGuardName] = useState('');
  const [checkpointId, setCheckpointId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointId.trim()) return alert('Please enter or scan a Checkpoint ID.');

    setLoading(true);
    setStatusMsg(null);

    let scanLat: number | null = null;
    let scanLng: number | null = null;

    // Fetch live device GPS coordinates
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 0,
          });
        });
        scanLat = position.coords.latitude;
        scanLng = position.coords.longitude;
      } catch (geoError) {
        console.warn('Geolocation access denied or timed out:', geoError);
      }
    }

    // Insert telemetry log with live coordinates
    const payload = {
      checkpoint_id: checkpointId.trim(),
      guard_name: guardName.trim() || 'Officer On Duty',
      incident_notes: notes.trim() || 'Normal Patrol Scan',
      latitude: scanLat,
      longitude: scanLng,
      scanned_at: new Date().toISOString(),
      status: notes.trim() ? 'INCIDENT' : 'VERIFIED',
    };

    const { error } = await supabase.from('patrol_logs').insert([payload]);

    setLoading(false);

    if (error) {
      setStatusMsg({ type: 'error', text: `Scan failed: ${error.message}` });
    } else {
      setStatusMsg({ 
        type: 'success', 
        text: scanLat && scanLng 
          ? `Scan logged with GPS (${scanLat.toFixed(4)}, ${scanLng.toFixed(4)})` 
          : 'Scan logged successfully (No GPS captured)' 
      });
      setCheckpointId('');
      setNotes('');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-block p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-2xl mb-2">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-wider uppercase">Guard Scanner Portal</h1>
          <p className="text-xs text-slate-400">Live Checkpoint Logging & Geofence Intelligence</p>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div className={`p-3 rounded-2xl text-xs font-bold border text-center ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Scan Form */}
        <form onSubmit={handleScanSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">Officer Name</label>
            <input
              type="text"
              placeholder="e.g. Samuel"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 transition-all font-medium"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Checkpoint ID or QR Code *</label>
            <input
              type="text"
              required
              placeholder="Paste or scan Checkpoint UUID"
              value={checkpointId}
              onChange={(e) => setCheckpointId(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Incident Report / Observations</label>
            <textarea
              rows={3}
              placeholder="Leave empty for routine scan, or type observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-cyan-400 transition-all font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? '📍 Acquiring Location & Submitting...' : '📡 Submit Scan & GPS Data'}
          </button>
        </form>
      </div>
    </div>
  );
}
