'use client';

import { useState, useEffect } from 'react';

export default function AdminLiveFeed() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');

  const loadAlerts = () => {
    const cached = localStorage.getItem('tom_salem_patrol_alerts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setAlerts(parsed);
        }
      } catch (err) {
        console.error('Failed to parse patrol alerts:', err);
      }
    }
  };

  useEffect(() => {
    loadAlerts();

    const handleUpdate = () => {
      loadAlerts();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('patrol_update', handleUpdate);

    // Polling fallback to guarantee instant live feed synchronization
    const interval = setInterval(loadAlerts, 1500);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('patrol_update', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'INCIDENTS') return alert.isIncident;
    if (filter === 'NORMAL') return !alert.isIncident;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold tracking-wide text-white">TOM SALEM LIVE TELEMETRY FEED</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time guard patrol tracking & emergency monitoring</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filter === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
          >
            All Logs ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('INCIDENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filter === 'INCIDENTS' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Incidents ({alerts.filter(a => a.isIncident).length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-10 text-center text-slate-400 text-sm">
            No patrol logs or telemetry data recorded yet. Submit a log from the Guard PWA to see it live here!
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col gap-3 ${
                alert.isIncident ? 'border-red-500/60 bg-red-950/10' : 'border-white/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{alert.guardName}</span>
                    {alert.isIncident && (
                      <span className="bg-red-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        ⚠️ INCIDENT EMERGENCY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cyan-400 mt-0.5 font-semibold">📍 Checkpoint: {alert.checkpointName}</p>
                </div>
                <span className="text-[11px] text-slate-400">{new Date(alert.createdAt).toLocaleTimeString()} ({new Date(alert.createdAt).toLocaleDateString()})</span>
              </div>

              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                <p><strong className="text-slate-400">Location:</strong> {alert.location}</p>
                <p><strong className="text-slate-400">Notes:</strong> {alert.notes}</p>
                <p><strong className="text-slate-400">GPS Coordinates:</strong> {alert.lat?.toFixed(5)}, {alert.lng?.toFixed(5)}</p>
              </div>

              {alert.mediaUrl && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-cyan-300 mb-1">Attached Incident Capture:</p>
                  <img src={alert.mediaUrl} alt="Incident Evidence" className="max-h-48 rounded-xl border border-white/10 object-cover" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
