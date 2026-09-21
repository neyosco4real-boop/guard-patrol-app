'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefreshTime, setAutoRefreshTime] = useState(15);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guard_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const interval = setInterval(() => {
      setAutoRefreshTime((prev) => {
        if (prev <= 1) {
          fetchLogs();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this log entry?')) return;
    const { error } = await supabase.from('guard_logs').delete().eq('id', id);
    if (!error) {
      setLogs(logs.filter((log) => log.id !== id));
      if (selectedLog?.id === id) setSelectedLog(null);
    } else {
      alert('Failed to delete log: ' + error.message);
    }
  };

  const totalLogs = logs.length;
  const activeIncidents = logs.filter(l => l.notes && l.notes.toLowerCase().includes('issue') && !l.notes.toLowerCase().includes('no issue')).length;
  const uniqueLocations = Array.from(new Set(logs.map(l => l.location))).filter(Boolean).length;
  const uniqueCheckpoints = Array.from(new Set(logs.map(l => l.checkpoint))).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Custom Keyframe Animations Style Tag */}
      <style jsx global>{`
        @keyframes slideUpFade {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUpFade {
          animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Control Banner */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] p-6 rounded-3xl shadow-2xl gap-4 transition-all duration-300 hover:border-slate-700">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <span>🛡️</span> Tom Salem Security
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <h1 className="text-lg font-black text-white tracking-wider uppercase">Admin Live Patrol Stream & Audit</h1>
              </div>
              <p className="text-xs text-slate-400">Real-time monitoring of security guard checkpoint scans and incident telemetry.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/admin/export"
              className="bg-indigo-600/90 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <span>📊</span> Export Report (HTML/PDF) ↗
            </a>
            <a
              href="/admin/qr-codes"
              className="bg-cyan-600/90 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <span>🖨️</span> View Checkpoint QR Codes ↗
            </a>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <span>📱</span> Open Mobile Scanner ↗
            </a>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/50 group">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Total Logs</p>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-3xl font-black text-white">{totalLogs}</h3>
              <div className="w-10 h-10 rounded-2xl bg-emerald-950/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">📈</div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/50 group">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Active Incidents</p>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-3xl font-black text-rose-400">{activeIncidents}</h3>
              <div className="w-10 h-10 rounded-2xl bg-rose-950/50 border border-rose-800/50 flex items-center justify-center text-rose-400 group-hover:scale-110 transition duration-300 animate-pulse">🚨</div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/50 group">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Active Locations</p>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-3xl font-black text-cyan-400">{uniqueLocations}</h3>
              <div className="w-10 h-10 rounded-2xl bg-cyan-950/50 border border-cyan-800/50 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-300">📍</div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/50 group">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Total Checkpoints</p>
            <div className="flex justify-between items-end mt-2">
              <h3 className="text-3xl font-black text-amber-400">{uniqueCheckpoints}</h3>
              <div className="w-10 h-10 rounded-2xl bg-amber-950/50 border border-amber-800/50 flex items-center justify-center text-amber-400 group-hover:scale-110 transition duration-300">🏁</div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-[#0f172a] border border-[#1e293b] px-6 py-4 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Live Patrol Telemetry Stream Active</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-slate-400 bg-[#070b14] px-3 py-1.5 rounded-xl border border-[#1e293b]">
              Auto-refresh in <strong className="text-emerald-400">{autoRefreshTime}s</strong>
            </span>
            <button
              onClick={fetchLogs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b] flex items-center gap-2 active:scale-95"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh Feed
            </button>
          </div>
        </div>

        {/* Live Patrol Feed Table with Slide-Up Transitions */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-[#1e293b]">
            <h2 className="text-xs font-black uppercase text-white tracking-wider">Live Patrol Feed & Audit Trail</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Click any row to inspect full telemetry, geofence data, and evidence attachments.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#070b14] border-b border-[#1e293b] text-slate-400 font-mono text-[10px] uppercase">
                  <th className="p-4">Date/Time</th>
                  <th className="p-4">Guard Name</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Checkpoint</th>
                  <th className="p-4">GPS</th>
                  <th className="p-4">Geofence</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Incident Note & Attachment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">Loading live telemetry stream...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">No patrol logs recorded yet.</td>
                  </tr>
                ) : (
                  logs.map((log, index) => {
                    const d = new Date(log.created_at || Date.now());
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-emerald-950/20 transition-all duration-200 cursor-pointer animate-slideUpFade group"
                        style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
                      >
                        <td className="p-4 font-mono text-slate-300 whitespace-nowrap group-hover:text-emerald-300 transition">{dateStr}</td>
                        <td className="p-4 font-bold text-white whitespace-nowrap">{log.guard_name}</td>
                        <td className="p-4 font-bold text-emerald-400 whitespace-nowrap">{log.location}</td>
                        <td className="p-4 font-bold text-cyan-400 whitespace-nowrap">{log.checkpoint}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.latitude}, {log.longitude}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            {log.geofence_status || 'Verified'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Successful Scan
                          </span>
                        </td>
                        <td className="p-4 max-w-xs text-slate-300">
                          <div>{log.notes || 'No issue'}</div>
                          {log.evidence_photo && (
                            <div className="mt-2">
                              <span className="inline-flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-700 text-indigo-300 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                <span>📷</span> Photo Attached
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => handleDelete(e, log.id)}
                            className="bg-rose-950/50 hover:bg-rose-900 border border-rose-800/80 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer active:scale-95"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Interactive Log Details Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slideUpFade"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-[#0f172a] border border-[#1e293b] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#1e293b] pb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Detailed Patrol Telemetry</span>
                <h3 className="text-lg font-black text-white uppercase mt-0.5">Scan Audit Report</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition cursor-pointer border border-[#1e293b]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Guard Name</span>
                <p className="font-bold text-white text-sm">{selectedLog.guard_name}</p>
              </div>

              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Timestamp</span>
                <p className="font-mono text-emerald-400 font-bold">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>

              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Parent Location</span>
                <p className="font-bold text-emerald-400 text-sm">{selectedLog.location}</p>
              </div>

              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Child Checkpoint</span>
                <p className="font-bold text-cyan-400 text-sm">{selectedLog.checkpoint}</p>
              </div>

              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">GPS Coordinates</span>
                <p className="font-mono text-slate-300">{selectedLog.latitude}, {selectedLog.longitude}</p>
              </div>

              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Geofence Status</span>
                <p className="font-bold text-emerald-400">{selectedLog.geofence_status || 'Verified'}</p>
              </div>
            </div>

            {/* Incident Notes */}
            <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Incident Notes / Observations</span>
              <p className="text-slate-200 text-xs">{selectedLog.notes || 'No issue noted.'}</p>
            </div>

            {/* Evidence Photo Preview */}
            {selectedLog.evidence_photo && (
              <div className="bg-[#070b14] p-4 rounded-2xl border border-[#1e293b] space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Attached Evidence Photo</span>
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedLog.evidence_photo} 
                    alt="Evidence Preview" 
                    className="w-24 h-24 object-cover rounded-xl border border-[#1e293b] shadow"
                  />
                  <div>
                    <a
                      href={selectedLog.evidence_photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>🔍</span> Open Full Resolution Image ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-[#1e293b]">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border border-[#1e293b]"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
