'import { useState, useEffect } from \'react\';'
import { useRouter } from 'next/navigation';
import QRScanner from '@/app/components/QRScanner';

export default function ScanPage() {
  const router = useRouter();
  const [guardName, setGuardName] = useState('Olawale');
  const [checkpointData, setCheckpointData] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [gps, setGps] = useState({ lat: 6.4451, lng: 3.4143 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName,
          checkpoint_id: checkpointData || 'Manual Checkpoint',
          notes,
          is_incident: isIncident,
          media_url: mediaUrl || null,
          lat: gps.lat,
          lng: gps.lng,
        }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        alert('Failed to submit patrol log');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting patrol log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto pb-12">
      <h1 className="text-2xl font-bold mb-4 text-cyan-400">Guard Patrol Scanner</h1>

      {/* 1. Live QR Camera Scanner at the top */}
      <div className="mb-6">
        <label className="block text-slate-400 font-semibold mb-2">📷 Scan Checkpoint QR Code</label>
        <QRScanner onScanSuccess={(decoded) => setCheckpointData(decoded)} />
      </div>

      <form onSubmit={handleScanSubmit} className="space-y-4">
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
            value={checkpointData}
            onChange={(e) => setCheckpointData(e.target.value)}
            placeholder="Scan QR or enter checkpoint ID"
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
            required
          />
        </div>

        <div className="flex items-center gap-3 bg-slate-900/50 border border-white/10 p-3 rounded-xl">
          <input
            type="checkbox"
            id="incident"
            checked={isIncident}
            onChange={(e) => setIsIncident(e.target.checked)}
            className="w-5 h-5 accent-red-500 rounded"
          />
          <label htmlFor="incident" className="text-red-400 font-semibold cursor-pointer">
            Mark as Security Incident / Emergency
          </label>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Incident / Patrol Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
          />
        </div>

        {/* 2. Live Camera Incident Photo Capture below notes */}
        <div>
          <label className="block text-slate-400 font-semibold mb-1">📸 Live Incident Photo Capture</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setMediaUrl(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
          />
          <p className="text-xs text-slate-500 mt-1">Tap to snap a live incident photo using your phone camera.</p>
        </div>

        <div className="text-xs text-cyan-400 bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20">
          📍 GPS Coordinates locked: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-xl uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Submitting...' : '🚀 Submit Patrol Log with GPS & Telemetry'}
        </button>
      </form>
    </main>
  );
}
