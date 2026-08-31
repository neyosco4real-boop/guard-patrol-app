'use client';

import { useState } from 'react';

export default function Home() {
  const [guardName, setGuardName] = useState('');
  const [location, setLocation] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [incidentReport, setIncidentReport] = useState('');
  const [status, setStatus] = useState('Completed');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmitScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !location.trim() || !checkpoint.trim()) {
      alert('Please enter Guard Name, Location, and Checkpoint.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');

    let gpsCoords = 'Location Permission Denied';
    if (navigator.geolocation) {
      try {
        const position: GeolocationPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        gpsCoords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      } catch (e) {
        gpsCoords = 'GPS Unavailable';
      }
    }

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName.trim(),
          location: location.trim(),
          checkpoint: checkpoint.trim(),
          gps_coordinates: gpsCoords,
          incident_report: incidentReport.trim() || 'None',
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Patrol scan successfully recorded and transmitted to live feed!');
        setIncidentReport('');
        // Optional: clear checkpoint after successful scan
        // setCheckpoint('');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to connect to patrol server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="max-w-md w-full flex flex-col gap-6">
        
        <div className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-2">
          <h1 className="text-lg font-extrabold text-white">🛡️ Guard Patrol Scanner</h1>
          <p className="text-xs text-slate-400">Scan checkpoints or submit manual logs with real-time GPS telemetry.</p>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs font-bold text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmitScan} className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Guard Name</label>
            <input
              type="text"
              placeholder="e.g. Officer John Doe"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Location Site</label>
            <input
              type="text"
              placeholder="e.g. Multichoice HQ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Checkpoint Scanned</label>
            <input
              type="text"
              placeholder="e.g. Server Room / Gate 2"
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="Completed">Completed (Normal)</option>
              <option value="Incident Reported">Incident Reported</option>
              <option value="Maintenance Needed">Maintenance Needed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Incident Report / Notes</label>
            <textarea
              placeholder="Describe any anomalies or leave blank..."
              value={incidentReport}
              onChange={(e) => setIncidentReport(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 h-24 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? 'Transmitting Telemetry...' : 'Submit Patrol Log'}
          </button>
        </form>

      </div>
    </main>
  );
}
