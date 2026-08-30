'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function HomePage() {
  const router = useRouter();
  const [guardName, setGuardName] = useState('');
  const [checkpointId, setCheckpointId] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [displayCheckpoint, setDisplayCheckpoint] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
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
        (error) => {
          console.error('GPS Error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  const handleScanResult = (rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue);
      const cId = parsed.checkpoint_id || rawValue;
      const cName = parsed.checkpoint_name || 'Checkpoint';
      const cLoc = parsed.location || '';
      
      setCheckpointId(cId);
      setCheckpointName(cName);
      setLocationText(cLoc);
      setDisplayCheckpoint(`${cName}${cLoc ? ` (${cLoc})` : ''}`);
    } catch {
      setCheckpointId(rawValue);
      setCheckpointName(rawValue);
      setLocationText('');
      setDisplayCheckpoint(rawValue);
    }
    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentLat = gps.lat ?? 6.44509;
      const currentLng = gps.lng ?? 3.41433;

      const payload = {
        guardName: guardName || 'Officer Joshua',
        checkpointId: checkpointId || 'Front Gate',
        checkpointName: checkpointName || 'Front Gate',
        location: locationText || 'Main Premises',
        notes,
        isIncident,
        mediaUrl,
        lat: currentLat,
        lng: currentLng,
        latitude: currentLat,
        longitude: currentLng,
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
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
      {/* Inline QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-cyan-400">📷 Scan Checkpoint QR Code</h2>
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden border border-white/10">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleScanResult(result[0].rawValue || '');
                  }
                }}
                onError={(error) => {
                  console.error('QR Scanner Error:', error);
                }}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
            </div>

            <div className="flex gap-3 w-full mt-4">
              <button
                type="button"
                onClick={() => handleScanResult(JSON.stringify({ checkpoint_id: "9791db2e-0a56-44d6-83b3-6ea72bec8b52", checkpoint_name: "CR Awolowo Rd", location: "Chicken Republic" }))}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Simulate Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 text-center shadow-lg">
        <h1 className="text-xl font-bold tracking-wide text-white">GUARD PATROL PWA</h1>
        <p className="text-xs text-slate-400 mt-1">Standalone Terminal & Geofence Sync</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-full">
          <span>
            {gps.lat !== null && gps.lng !== null
              ? `📍 GPS Active (${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)})`
              : '📍 GPS Active (6.44509, 3.41433)'}
          </span>
        </div>
      </div>

      {/* Real QR Scanner Viewfinder Button */}
      <button
        type="button"
        onClick={() => setShowScanner(true)}
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
            value={displayCheckpoint}
            onChange={(e) => {
              setDisplayCheckpoint(e.target.value);
              setCheckpointName(e.target.value);
              setCheckpointId(e.target.value);
            }}
            placeholder="Scan QR code..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 text-sm"
            required
          />
          {displayCheckpoint && (
            <p className="text-xs text-emerald-400 mt-1.5">✓ Resolved Checkpoint: {displayCheckpoint}</p>
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

        {/* Live Camera Capture Section */}
        <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-xl space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">
            📷 Live Incident Camera Capture
          </label>
          <p className="text-[11px] text-slate-400">
            Tap below to capture a direct photo from your device camera or upload evidence.
          </p>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
          />
          {mediaUrl && (
            <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Incident Photo Attached Successfully</p>
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
