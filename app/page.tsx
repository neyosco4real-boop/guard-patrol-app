'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import QRScanner from '@/app/components/QRScanner';

export default function GuardPWA() {
  const [guardName, setGuardName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointId, setCheckpointId] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [gps, setGps] = useState({ lat: 6.4451, lng: 3.4143 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => console.warn('GPS Warning:', e),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(decodedText);
      setCheckpointName(parsed.checkpoint_name || decodedText);
      const rawId = parsed.checkpoint_id || parsed.id || decodedText;
      const uuidMatch = String(rawId).match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      setCheckpointId(uuidMatch ? uuidMatch[0] : '');
    } catch (e) {
      setCheckpointName(decodedText);
      const uuidMatch = decodedText.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      setCheckpointId(uuidMatch ? uuidMatch[0] : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !checkpointName.trim()) {
      alert('Please provide both Guard Name and Checkpoint Name.');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('patrol_logs').insert([
        {
          checkpoint_id: checkpointId || null,
          guard_name: guardName.trim(),
          checkpoint_name: checkpointName.trim(),
          scanned_at: new Date().toISOString(),
          scanned_location: `Lat: ${gps.lat}, Lng: ${gps.lng}`,
          notes: notes.trim(),
        },
      ]);

      if (error) throw error;

      setSuccess(true);
      setCheckpointName('');
      setCheckpointId('');
      setNotes('Normal Patrol Scan');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert('Submission failed: ' + err.message);
    } finally {
      setLoading(false);
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

        {scanning ? (
          <div className="bg-slate-900 border border-white/10 p-4 rounded-3xl shadow-xl space-y-3">
            <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setScanning(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            📷 Open QR Scanner Viewfinder
          </button>
        )}

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
            <label className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">Scanned Checkpoint Name</label>
            <input
              type="text"
              placeholder="Scan QR code..."
              value={checkpointName}
              readOnly
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-cyan-300 focus:outline-none"
              required
            />
            {checkpointName && (
              <p className="text-[10px] font-mono text-emerald-400">
                ✓ Resolved Checkpoint: {checkpointName}
              </p>
            )}
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
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Submitting Log...' : '🚀 Submit Patrol Log'}
          </button>

          {success && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-xl text-xs font-bold text-center">
              ✓ Log Submitted Successfully!
            </div>
          )}

        </form>

      </div>
    </main>
  );
}
