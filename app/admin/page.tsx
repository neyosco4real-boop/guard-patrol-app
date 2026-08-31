'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching patrol logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds for live updates
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl shadow-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white">🛡️ Tom Salem Security - Live Patrol Command</h1>
            <p className="text-xs text-slate-400">Real-time telemetry monitoring, guard scans, and incident logs.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/admin/checkpoints"
              className="text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg"
            >
              📍 Manage Checkpoints & QRs
            </a>
            <a
              href="/"
              className="text-xs font-bold text-cyan-400 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-800"
            >
              📱 Open Scanner PWA
            </a>
          </div>
        </div>

        {/* Live Logs Table */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">Live Telemetry Feed ({logs.length} Scans Recorded)</h2>
            <button
              onClick={fetchLogs}
              className="text-[10px] text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-800 font-bold"
            >
              🔄 Refresh Feed
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500 text-center py-12">Connecting to telemetry feed...</p>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xs text-slate-400">No patrol scans recorded yet. Use the Scanner PWA to submit logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Guard Name</th>
                    <th className="py-3 px-4">Location & Checkpoint</th>
                    <th className="py-3 px-4">GPS Coordinates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Incident Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-bold text-white">{log.guard_name}</td>
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-cyan-400 block">{log.location}</span>
                        <span className="text-slate-300">📍 {log.checkpoint}</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-400">
                        {log.gps_coordinates}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          log.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-300 max-w-xs truncate">
                        {log.incident_report || 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
