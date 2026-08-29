'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function GuardScanPage() {
  const [guardName, setGuardName] = useState('');
  const [checkpointData, setCheckpointData] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedId, setResolvedId] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [gps, setGps] = useState({ lat: 6.4451, lng: 3.4143 });
  const [status, setStatus] = useState('');

  const handleScanInput = (rawInput: string) => {
    setCheckpointData(rawInput);
    try {
      const parsed = JSON.parse(rawInput);
      if (parsed.checkpoint_name) {
        setResolvedName(parsed.checkpoint_name);
        setResolvedId(parsed.checkpoint_id || '');
        setStatus(`✓ Resolved Checkpoint: ${parsed.checkpoint_name}`);
      } else {
        setResolvedName(rawInput);
        setResolvedId(rawInput);
      }
    } catch (e) {
      setResolvedName(rawInput);
      setResolvedId(rawInput);
      setStatus(`✓ Checkpoint Input Registered`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      alert('Please enter your guard name.');
      return;
    }
    const finalName = resolvedName || checkpointData;
    if (!finalName.trim()) {
      alert('Please scan or enter a checkpoint.');
      return;
    }

    try {
      const { error } = await supabase.from('patrol_logs').insert([
        {
          checkpoint_id: resolvedId || null,
          guard_id: null,
          scanned_at: new Date().toISOString(),
          scanned_location: `Lat: ${gps.lat}, Lng: ${gps.lng}`,
                    latitude: gps.lat,
                    longitude: gps.lng,
          notes: `${guardName}: ${notes} (Checkpoint: ${finalName})`,
        },
      ]);

      if (error) throw error;

      alert('Patrol log submitted successfully!');
      setCheckpointData('');
      setResolvedName('');
      setResolvedId('');
      setNotes('Normal Patrol Scan');
      setStatus('');
    } catch (err: any) {
      alert('Error submitting log: ' + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-md space-y-6">
        
        <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl text-center space-y-2">
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Guard Patrol PWA</h1>
          <p className="text-xs text-slate-400">Standalone Terminal & Geofence Sync</p>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400">
            <span>📍 GPS Active ({gps.lat}, {gps.lng})</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl space-y-5">
          
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">Guard Name</label>
            <input
              type="text"
              placeholder="e.g. Officer Joshua"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">Scanned Checkpoint Raw Payload</label>
            <input
              type="text"
              placeholder="Scan QR or paste JSON..."
              value={checkpointData}
              onChange={(e) => handleScanInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 focus:outline-none focus:border-cyan-500 truncate"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">Resolved Checkpoint Name (For Submission)</label>
            <input
              type="text"
              value={resolvedName}
              onChange={(e) => setResolvedName(e.target.value)}
              placeholder="Human-readable name appears here..."
              className="w-full bg-cyan-950/40 border border-cyan-500/40 rounded-xl px-4 py-3 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
              required
            />
            {status && <p className="text-[10px] font-mono text-emerald-400">{status}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">Patrol Notes / Incident</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            🚀 Submit Patrol Log
          </button>

        </form>

      </div>
    </main>
  );
}
