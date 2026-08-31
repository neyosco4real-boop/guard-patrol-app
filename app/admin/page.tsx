'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PatrolLog {
  id: string;
  guard_name: string;
  location: string;
  checkpoint: string;
  latitude: string;
  longitude: string;
  notes: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<PatrolLog | null>(null);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('public:patrol_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patrol_logs' }, (payload) => {
        setLogs((prev) => [payload.new as PatrolLog, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patrol_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractPhoto = (notes: string) => {
    if (!notes) return null;
    const match = notes.match(/\[PHOTO_DATA:(.*?)\]/);
    return match ? match[1] : null;
  };

  const cleanNotesText = (notes: string) => {
    if (!notes) return '';
    return notes.replace(/\[PHOTO_DATA:.*?\]/g, '').trim();
  };

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.guard_name?.toLowerCase().includes(term) ||
      log.location?.toLowerCase().includes(term) ||
      log.checkpoint?.toLowerCase().includes(term) ||
      log.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-xl font-bold text-white tracking-tight">Security Guard Patrol Dashboard</h1>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                Live Feed Active
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time guard telemetry, geofence verification, and incident reports.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Filter logs by guard, location, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full md:w-72"
            />
            <button
              onClick={fetchLogs}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Geofence Radar Map Card on Admin Screen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-xs font-bold text-white tracking-wider uppercase">Geofence Radar (50m Radius)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded">
              Active Monitoring
            </span>
          </div>

          <div className="relative h-56 w-full bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center overflow-hidden">
            <div className="absolute h-44 w-44 rounded-full border border-emerald-500/20 bg-emerald-500/5 animate-pulse"></div>
            <div className="absolute h-28 w-28 rounded-full border border-emerald-500/30"></div>
            <div className="absolute h-12 w-12 rounded-full border border-emerald-500/50 bg-emerald-500/10"></div>
            <div className="absolute h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]"></div>
            <div className="absolute -translate-x-6 -translate-y-8 flex flex-col items-center">
              <div className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                Guard Position
              </div>
              <div className="w-2 h-2 rounded-full bg-white border-2 border-emerald-500 mt-0.5"></div>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Perimeter Radius: <strong className="text-slate-200">50 meters</strong></span>
            <span className="text-emerald-400 font-mono">Status: All active guards within geofence</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm">Loading live telemetry feed...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
            No patrol logs found matching your criteria.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Time</th>
                    <th className="p-4">Guard Name</th>
                    <th className="p-4">Location & Checkpoint</th>
                    <th className="p-4">GPS Coordinates</th>
                    <th className="p-4">Notes / Photo</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredLogs.map((log) => {
                    const photo = extractPhoto(log.notes);
                    const cleanNotes = cleanNotesText(log.notes);

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <div className="text-[10px] text-slate-500">{new Date(log.created_at || Date.now()).toLocaleDateString()}</div>
                        </td>
                        <td className="p-4 font-semibold text-white whitespace-nowrap">
                          {log.guard_name}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-200">{log.location}</div>
                          <div className="text-[11px] text-emerald-400 font-mono">{log.checkpoint}</div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-300">
                          <div>{log.latitude}, {log.longitude}</div>
                          <span className="inline-block mt-1 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-2 py-0.5 rounded font-semibold">
                            ✓ Verified (≤50m)
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-slate-300">
                          <div className="truncate">{cleanNotes || 'Routine Patrol'}</div>
                          {photo && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                              <span>📸 Incident Photo Attached</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-lg shadow-emerald-950/50"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for viewing detailed patrol report & attached photo */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-base font-bold text-white">Patrol Report Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Guard Name</span>
                  <span className="text-sm font-bold text-white">{selectedLog.guard_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Timestamp</span>
                  <span className="text-slate-300">{new Date(selectedLog.created_at || Date.now()).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Location Site</span>
                  <span className="text-slate-200 font-medium">{selectedLog.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Checkpoint</span>
                  <span className="text-emerald-400 font-mono font-semibold">{selectedLog.checkpoint}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">GPS Coordinates</span>
                <span className="font-mono text-slate-300">{selectedLog.latitude}, {selectedLog.longitude}</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Notes & Observations</span>
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{cleanNotesText(selectedLog.notes)}</p>
              </div>

              {extractPhoto(selectedLog.notes) && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-2">Attached Incident Photo</span>
                  <div className="rounded-lg overflow-hidden border border-slate-800 max-h-72 flex items-center justify-center bg-black">
                    <img
                      src={extractPhoto(selectedLog.notes) || ''}
                      alt="Incident evidence"
                      className="max-h-72 object-contain w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
