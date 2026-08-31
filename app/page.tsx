'use client';
import { useState } from 'react';

export default function PatrolApp() {
  const [guardName, setGuardName] = useState('');
  const [locationSite, setLocationSite] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [gpsCoords, setGpsCoords] = useState('N/A');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Completed');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName || !locationSite) {
      alert('Please fill in Guard Name and Location Site.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName,
          location: locationSite,
          checkpoint: checkpoint || 'Main Entrance',
          gps_coordinates: gpsCoords,
          incident_report: notes || 'None',
          status: status
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      alert('Telemetry transmitted successfully!');
      setCheckpoint('');
      setNotes('');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold mb-1">🛡️ Guard Patrol Scanner</h1>
        <p className="text-sm text-slate-400 mb-6">Scan physical checkpoint QRs and transmit telemetry.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Guard Name</label>
            <input 
              type="text" 
              value={guardName} 
              onChange={(e) => setGuardName(e.target.value)} 
              placeholder="Enter guard name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Location Site</label>
            <input 
              type="text" 
              value={locationSite} 
              onChange={(e) => setLocationSite(e.target.value)} 
              placeholder="e.g. Multichoice"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Checkpoint</label>
            <input 
              type="text" 
              value={checkpoint} 
              onChange={(e) => setCheckpoint(e.target.value)} 
              placeholder="e.g. Gate 2 / Server Room"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Incident Report / Notes</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Describe any anomalies or leave blank..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 h-24 resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2 disabled:opacity-50"
          >
            {loading ? 'TRANSMITTING TELEMETRY...' : 'SUBMIT PATROL LOG'}
          </button>
        </form>
      </div>
    </main>
  );
}
