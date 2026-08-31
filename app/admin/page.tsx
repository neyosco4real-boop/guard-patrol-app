'use client';

import { useState, useEffect } from 'react';

export default function AdminLiveCommandPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Error fetching patrol activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="max-w-6xl w-full flex flex-col gap-8">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0b0f19] border border-slate-800/80 p-6 rounded-3xl shadow-2xl">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Tom Salem Security Operations
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Guard Patrol Live Command</h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Real-time monitoring dashboard tracking checkpoint verifications, GPS logs, and incident photo evidence.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/admin/qr-generator"
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-3 px-4 rounded-xl uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              📷 QR GENERATOR
            </a>
            <a
              href="/admin/checkpoints"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              🗂️ MANAGE CHECKPOINTS
            </a>
          </div>
        </div>

        {/* Recent Patrol Activity Section */}
        <div className="bg-[#0b0f19] border border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white uppercase">Recent Patrol Activity</h2>
              <p className="text-xs text-slate-400">Click any patrol row to view full incident report and download attached photo evidence.</p>
            </div>
            <button
              type="button"
              onClick={fetchAlerts}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              🔄 REFRESH FEED
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500">Loading patrol activity feed...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/50 border border-slate-900 rounded-2xl">
              <p className="text-xs text-slate-400">No patrol logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Guard</th>
                    <th className="py-3 px-4">Checkpoint</th>
                    <th className="py-3 px-4">Notes / Incident</th>
                    <th className="py-3 px-4">Evidence</th>
                    <th className="py-3 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs font-medium">
                  {alerts.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{item.guardName || item.guard_name}</td>
                      <td className="py-4 px-4 text-cyan-400 font-bold">{item.checkpointName || item.checkpoint_name || item.checkpoint}</td>
                      <td className="py-4 px-4 text-slate-300">{item.notes || 'Normal Patrol Scan'}</td>
                      <td className="py-4 px-4">
                        {item.mediaUrl || item.media_url ? (
                          <a href={item.mediaUrl || item.media_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold">
                            View Photo
                          </a>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(item.created_at || Date.now()).toLocaleTimeString()}
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
