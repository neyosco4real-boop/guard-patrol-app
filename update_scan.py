code = ''''use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '@/app/components/QRScanner';

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
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log(err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    setCheckpointId(decodedText);
    setShowScanner(false);
    
    try {
      const res = await fetch('/api/checkpoints');
      if (res.ok) {
        const data = await res.json();
        const found = data.find((cp: any) => cp.id === decodedText || cp.qr_code === decodedText || cp.name === decodedText);
        if (found) {
          setCheckpointName(found.name);
        } else {
          setCheckpointName(decodedText);
        }
      } else {
        setCheckpointName(decodedText);
      }
    } catch (err) {
      setCheckpointName(decodedText);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName,
          checkpoint_id: checkpointName || checkpointId || 'Manual Checkpoint',
          notes,
          is_incident: isIncident,
          media_url: mediaUrl || null,
          lat: gps.lat,
          lng: gps.lng,
        }),
      });
      if (res.ok) {
        alert('Patrol log successfully submitted!');
        router.push('/scan');
        setCheckpointId('');
        setCheckpointName('');
        setNotes('Normal Patrol Scan');
        setIsIncident(false);
        setMediaUrl('');
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-cyan-400">Guard Patrol Scanner</h1>
        <a 
          href="/admin" 
          className="text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-lg transition-all"
        >
          Admin Portal
        </a>
      </div>

      {!showScanner ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border-2 border-dashed border-cyan-500/40 text-cyan-300 font-semibold py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="text-2xl">📷</span>
            <span>Tap to Open QR Scanner Camera</span>
          </button>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-slate-900 border border-cyan-500/30 rounded-2xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Active Camera Scanner</span>
            <button 
              type="button" 
              onClick={() => setShowScanner(false)}
              className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1"
            >
              Close Camera
            </button>
          </div>
          <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />
        </div>
      )}

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
          <label className="block text-slate-400 font-semibold mb-1">Checkpoint Name</label>
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
'''

with open('app/scan/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated scan page successfully!')
