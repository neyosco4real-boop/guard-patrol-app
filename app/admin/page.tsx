'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAlerts(data);
        localStorage.setItem('tom_salem_patrol_alerts', JSON.stringify(data));
      } else if (Array.isArray(data) && data.length === 0) {
        // If API is empty, check localStorage backup
        const cached = localStorage.getItem('tom_salem_patrol_alerts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAlerts(parsed);
          } else {
            setAlerts([]);
          }
        } else {
          setAlerts([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry alerts:', err);
      // Fallback to localStorage on network error
      const cached = localStorage.getItem('tom_salem_patrol_alerts');
      if (cached) {
        setAlerts(JSON.parse(cached));
      }
    }
  };

  useEffect(() => {
    // Load initial state from localStorage immediately to prevent blank flash on refresh
    const cached = localStorage.getItem('tom_salem_patrol_alerts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setAlerts(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearFeed = async () => {
    if (confirm('Are you sure you want to clear the live telemetry feed?')) {
      await fetch('/api/alerts', { method: 'DELETE' });
      localStorage.removeItem('tom_salem_patrol_alerts');
      setAlerts([]);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Bar */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full mb-2">
            <span>● Tom Salem Security Operations — Real-Time Live Feed Active</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Guard Patrol Live Command</h1>
          <p className="text-xs text-slate-400 mt-1">
            Live streaming dashboard tracking checkpoint verifications, date & time stamps, precise GPS coordinates, and photo evidence instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/qr-codes"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md"
          >
            QR Generator
          </Link>
          <Link
            href="/admin/checkpoints"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer border border-white/10 transition-all"
          >
            Checkpoints
          </Link>
        </div>
      </div>

      {/* Feed Table Section */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Live Patrol Activity & Telemetry Feed</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer flex items-center gap-1.5"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearFeed}
              className="bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/30 cursor-pointer"
            >
              🗑️ Clear Feed
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No patrol logs received yet. Scan a QR code on the PWA scanner to start streaming telemetry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Date/Time</th>
                  <th className="py-3 px-3">Guard Name</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Checkpoint</th>
                  <th className="py-3 px-3">GPS Coordinates</th>
                  <th className="py-3 px-3">Report Attached</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-xs text-slate-300 whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{alert.guardName}</td>
                    <td className="py-3 px-3 text-slate-300 font-medium">{alert.location || 'Tom Salem Head Office'}</td>
                    <td className="py-3 px-3 text-cyan-300 font-medium">{alert.checkpointName}</td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-300 whitespace-nowrap">
                      📍 {Number(alert.lat).toFixed(5)}, {Number(alert.lng).toFixed(5)}
                    </td>
                    <td className="py-3 px-3">
                      {alert.mediaUrl ? (
                        <span className="inline-flex items-center gap-1 bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          📷 Yes
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${alert.isIncident ? 'bg-red-950 text-red-400 border border-red-500/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'}`}>
                        {alert.isIncident ? '🚨 Incident' : '✓ Normal'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inspector */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Patrol Telemetry Details</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">Date / Time:</span>
                <span className="font-medium text-slate-200">{new Date(selectedAlert.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">Guard Officer:</span>
                <span className="font-bold text-white text-sm">{selectedAlert.guardName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">Parent Location:</span>
                <span className="font-bold text-white text-sm">{selectedAlert.location || 'Tom Salem Head Office'}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">Assigned Checkpoint:</span>
                <span className="font-bold text-cyan-300 text-sm">{selectedAlert.checkpointName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">GPS Coordinates:</span>
                <span className="font-mono text-emerald-400">Lat: {selectedAlert.lat}, Lng: {selectedAlert.lng}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wide block">Notes / Incident Report:</span>
                <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-white/10 mt-1">{selectedAlert.notes}</p>
              </div>
              {selectedAlert.mediaUrl && (
                <div>
                  <span className="text-slate-400 uppercase tracking-wide block mb-1">Attached Incident Photo:</span>
                  <img src={selectedAlert.mediaUrl} alt="Incident" className="w-full h-48 object-cover rounded-xl border border-white/10" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
