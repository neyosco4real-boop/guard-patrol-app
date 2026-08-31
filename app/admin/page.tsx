'use client';

import { useState, useEffect } from 'react';

interface Alert {
  id: string;
  guardName: string;
  location: string;
  checkpointName: string;
  notes: string;
  isIncident: boolean;
  mediaUrl?: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export default function AdminPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const clearAlerts = async () => {
    if (confirm('Are you sure you want to clear all live patrol feeds?')) {
      await fetch('/api/alerts', { method: 'DELETE' });
      setAlerts([]);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center bg-slate-900 border border-white/10 p-5 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-cyan-400">ADMIN LIVE PATROL FEED</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time multi-location guard telemetry monitoring</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={fetchAlerts}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-cyan-500/30 cursor-pointer"
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            onClick={clearAlerts}
            className="bg-red-950/60 hover:bg-red-900 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-red-500/30 cursor-pointer"
          >
            Clear Feeds
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">
          Live Patrol Submissions ({alerts.length})
        </h2>

        {loading ? (
          <p className="text-xs text-slate-500 text-center py-8">Loading telemetry feed...</p>
        ̉i) : alerts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <p className="text-sm text-slate-400 font-semibold">No patrol logs received yet.</p>
            <p className="text-xs text-slate-500 mt-1">Submissions from the mobile scanner app will appear here instantly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  alert.isIncident
                    ? 'bg-red-950/30 border-red-500/50 shadow-red-950/50 shadow-md'
                    : 'bg-slate-950 border-white/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                      📍 {alert.location}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">Checkpoint: {alert.checkpointName}</h3>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${alert.isIncident ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'}`}>
                    {alert.isIncident ? '🚨 INCIDENT EMERGENCY' : '✓ Normal Scan'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-white/5">
                  <p><span className="text-slate-500">Officer:</span> <strong className="text-white">{alert.guardName}</strong></p>
                  <p><span className="text-slate-500">Timestamp:</span> <strong className="text-white">{new Date(alert.createdAt).toLocaleString()}</strong></p>
                  <p className="sm:col-span-2"><span className="text-slate-500">GPS Coordinates:</span> <strong className="text-cyan-400">{alert.lat}, {alert.lng}</strong></p>
                </div>

                {alert.notes && (
                  <p className="text-xs text-slate-200 bg-slate-900 p-3 rounded-lg border border-white/5">
                    <span className="text-slate-500 block mb-1 uppercase font-semibold">Notes / Details:</span>
                    {alert.notes}
                  </p>
                )}

                {alert.mediaUrl && (
                  <div className="mt-1">
                    <span className="text-xs text-slate-500 block mb-1 uppercase font-semibold">Attached Incident Capture:</span>
                    <img src={alert.mediaUrl} alt="Incident capture" className="w-full max-h-48 object-cover rounded-lg border border-white/10" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
