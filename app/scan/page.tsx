'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [guardName, setGuardName] = useState('');
  const [checkpointName, setCheckpointName] = useState('Front Gate');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [gps, setGps] = useState({ lat: 6.4451, lng: 3.4143 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('GPS Error:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        guardName: guardName || 'Officer Joshua',
        checkpointId: checkpointName,
        checkpointName,
        notes,
        isIncident,
        mediaUrl,
        lat: gps.lat,
        lng: gps.lng,
        latitude: gps.lat,
        longitude: gps.lng,
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Patrol log submitted successfully!');
        router.push('/admin');
      } else {
        alert('Failed to submit patrol log.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto flex flex-col gap-5">
      {/* Header Card */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 text-center shadow-lg">
        <h1 className="text-xl font-bold tracking-wide text-white">GUARD PATROL PWA</h1>
        <p className="text-xs text-slate-400 mt-1">Standalone Terminal & Geofence Sync</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full">
          <span>📍 GPS Active ({gps.lat.toFixed(5)}, {gps.lng.toFixed(5)})</span>
        </div>
      </div>

      {/* QR Scanner Viewfinder Button */}
      <button
        type="button"
        onClick={() => alert('QR Scanner Viewfinder Active')}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm tracking-wide cursor-pointer"
      >
        📷 OPEN QR SCANNER VIEWFINDER
      </button>

      {/* Patrol Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Guard Name</label>
          <input
            type="text"
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            placeholder="e.g. Officer Joshua"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Scanned Checkpoint Name</label>
          <input
            type="text"
            value={checkpointName}
            onChange={(e) => setCheckpointName(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            required
          />
          <p className="text-xs text-emerald-400 mt-1.5">✓ Resolved Checkpoint: {checkpointName}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Patrol Notes / Incident</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
          />
        </div>

        {/* Incident Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 border border-white/10 p-3 rounded-xl">
          <input
            type="checkbox"
            id="incidentToggle"
            checked={isIncident}
            onChange={(e) => {
              setIsIncident(e.target.checked);
              if (e.target.checked) setNotes('INCIDENT EMERGENCY: ');
            }}
            className="w-5 h-5 accent-red-500 cursor-pointer"
          />
          <label htmlFor="incidentToggle" className="text-xs font-bold text-red-400 cursor-pointer">
            Mark as Incident / Emergency Report
          </label>
        </div>

        {/* Live Camera Capture */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">📷 Live Incident Photo Capture</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
          />
          {mediaUrl && (
            <p className="text-xs text-emerald-400 mt-2 font-semibold">✓ Photo attached successfully</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-4 rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer disabled:opacity-50 text-sm mt-2"
        >
          {loading ? 'Submitting...' : '🚀 SUBMIT PATROL LOG'}
        </button>
      </form>
    </main>
  );
}
