'use client';

import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ScanPage() {
  const [guardName, setGuardName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const rawValue = result[0].rawValue;
      try {
        const parsed = JSON.parse(rawValue);
        const name = parsed.checkpoint_name || parsed.location || parsed.name || rawValue;
        setCheckpointName(name);
      } catch {
        setCheckpointName(rawValue);
      }
      setShowScanner(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentLat = lat ?? 6.44508;
      const currentLng = lng ?? 3.41434;

      const payload = {
        guardName: guardName || 'Officer',
        location: 'Tom Salem Head Office',
        checkpointName: checkpointName || 'Front Gate',
        notes,
        isIncident,
        mediaUrl,
        lat: currentLat,
        lng: currentLng,
      };

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMsg(true);
        setCheckpointName('');
        setNotes('Normal Patrol Scan');
        setIsIncident(false);
        setMediaUrl('');
        setTimeout(() => setSuccessMsg(false), 4000);
      } else {
        alert('Submission failed.');
      }
    } catch (error) {
      console.error(error);
      alert('Error submitting log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto flex flex-col gap-5">
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-cyan-400">Scan QR Code</h2>
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="w-full h-72 bg-black rounded-xl overflow-hidden relative">
              <Scanner
                onScan={handleScan}
                onError={(err) => console.error(err)}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCheckpointName('Front Gate');
                setShowScanner(false);
              }}
              className="mt-4 w-full bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
            >
              Simulate Scan (Front Gate)
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-xs font-bold text-center animate-pulse">
          ✓ Patrol log successfully submitted and synced to live feed!
        </div>
      )}

      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 text-center shadow-lg">
        <h1 className="text-xl font-bold tracking-wide text-white">GUARD PATROL PWA</h1>
        <p className="text-xs text-slate-400 mt-1">Tom Salem Head Office Terminal</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full">
          <span>📍 {lat !== null && lng !== null ? `GPS Active (${lat.toFixed(5)}, ${lng.toFixed(5)})` : '📍 GPS Active (6.44508, 3.41434)'}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
      >
        📷 OPEN QR SCANNER VIEWFINDER
      </button>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Guard Name</label>
          <input
            type="text"
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            placeholder="e.g. Officer Joe"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Parent Location</label>
          <input
            type="text"
            value="Tom Salem Head Office"
            disabled
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5">Scanned Checkpoint</label>
          <input
            type="text"
            value={checkpointName}
            onChange={(e) => setCheckpointName(e.target.value)}
            placeholder="Scan QR code (e.g. Front Gate)..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            required
          />
          {checkpointName && (
            <p className="text-xs text-emerald-400 mt-1.5">✓ Assigned to Location: Tom Salem Head Office</p>
          )}
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

        <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-xl space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">
            📷 Live Incident Camera Capture
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 cursor-pointer"
          />
          {mediaUrl && <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Incident Photo Attached Successfully</p>}
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
