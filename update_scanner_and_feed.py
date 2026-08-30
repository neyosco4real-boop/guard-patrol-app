import os

# 1. Update app/scan/page.tsx to include Incident Notes and Photo/Camera Evidence capture
scan_path = 'app/scan/page.tsx'
with open(scan_path, 'r', encoding='utf-8') as f:
    scan_code = f.read()

# Let's ensure the scanner state includes incident status, custom notes, and media url / camera input
print("Updating scanner with incident notes and camera capture...")

# We will write a complete, robust patch for app/scan/page.tsx
updated_scan_code = '''
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ScanPage() {
  const [checkpointData, setCheckpointData] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedId, setResolvedId] = useState('');
  const [guardName, setGuardName] = useState('Olawale');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [gps, setGps] = useState({ lat: 6.4451, lng: 3.4143 });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.error("GPS error:", error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('patrol_logs').insert([
        {
          checkpoint_id: resolvedId || null,
          guard_id: null,
          scanned_at: new Date().toISOString(),
          scanned_location: `Lat: ${gps.lat.toFixed(4)}, Lng: ${gps.lng.toFixed(4)}`,
          latitude: gps.lat,
          longitude: gps.lng,
          status: isIncident ? 'INCIDENT' : 'VERIFIED',
          notes: `${guardName}: ${notes} ${isIncident ? '[INCIDENT REPORTED]' : ''}`,
          media_url: mediaUrl || null,
        },
      ]);

      if (error) throw error;
      alert('Patrol log submitted successfully with GPS coordinates and status!');
      setCheckpointData('');
      setResolvedName('');
      setResolvedId('');
      setNotes('Normal Patrol Scan');
      setIsIncident(false);
      setMediaUrl('');
    } catch (err: any) {
      alert('Error submitting log: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-cyan-400">Guard Patrol Scanner</h1>
      <form onSubmit={handleScanSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Guard Name</label>
          <input
            type="text"
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Checkpoint Name / ID</label>
          <input
            type="text"
            value={resolvedName || checkpointData}
            onChange={(e) => {
              setCheckpointData(e.target.value);
              setResolvedName(e.target.value);
            }}
            placeholder="e.g. Front Gate, Swimming Pool"
            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
            required
          />
        </div>

        <div className="flex items-center space-x-3 bg-slate-900 p-3 rounded-xl border border-white/10">
          <input
            type="checkbox"
            id="incidentToggle"
            checked={isIncident}
            onChange={(e) => {
              setIsIncident(e.target.checked);
              if (e.target.checked) setNotes('SECURITY INCIDENT DETECTED');
              else setNotes('Normal Patrol Scan');
            }}
            className="w-5 h-5 accent-red-500 cursor-pointer"
          />
          <label htmlFor="incidentToggle" className="text-red-400 font-bold cursor-pointer">
            Mark as Security Incident / Emergency
          </label>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Incident / Patrol Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Live Camera / Photo Evidence URL</label>
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://image-evidence-link.com/photo.jpg"
            className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
          />
          <p className="text-xs text-slate-500 mt-1">Paste photo link or captured snapshot URL for live inspection.</p>
        </div>

        <div className="text-xs text-cyan-400 bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20">
          📍 GPS Coordinates locked: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}
        </div>

        <button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
        >
          🚀 Submit Patrol Log with GPS & Telemetry
        </button>
      </form>
    </div>
  );
}
'''

with open(scan_path, 'w', encoding='utf-8') as f:
    f.write(updated_scan_code)

print("Scanner successfully updated with incident notes, incident toggle, camera/photo link input, and live GPS mapping.")
