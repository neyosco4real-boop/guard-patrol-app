'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [guardName, setGuardName] = useState('Olawale');
  const [checkpointId, setCheckpointId] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
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
        guardName,
        checkpointId: checkpointId || 'CP-MAIN',
        checkpointName: checkpointName || 'Main Gate',
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
    <main className="min-h-screen bg-slate-950 text-white p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-cyan-400">🛡️ Guard Patrol Scanner</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Guard Name</label>
          <input
            type="text"
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Checkpoint Name / ID</label>
          <input
            type="text"
            value={checkpointName || checkpointId}
            onChange={(e) => {
              setCheckpointName(e.target.value);
              setCheckpointId(e.target.value);
            }}
            placeholder="Scan QR or enter checkpoint name"
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Patrol Notes / Incident Description</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Enter notes or describe incident..."
          />
        </div>

        <div className="flex items-center gap-3 bg-slate-900/50 border border-white/10 p-3 rounded-xl">
          <input
            type="checkbox"
            id="incidentToggle"
            checked={isIncident}
            onChange={(e) => {
              setIsIncident(e.target.checked);
              if (e.target.checked) setNotes('INCIDENT REPORT: ');
            }}
            className="w-5 h-5 accent-red-500 cursor-pointer"
          />
          <label htmlFor="incidentToggle" className="text-sm font-bold text-red-400 cursor-pointer">
            Mark as Incident / Emergency
          </label>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">📷 Live Incident Photo Capture</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
          />
          {mediaUrl && (
            <p className="text-xs text-emerald-400 mt-2">✓ Photo attached successfully</p>
          )}
        </div>

        <div className="text-xs text-cyan-400 bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20">
          📍 GPS Coordinates locked: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-xl uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Submitting...' : '🚀 Submit Patrol Log'}
        </button>
      </form>
    </main>
  );
}
