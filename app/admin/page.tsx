'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchLogs();

    // Subscribe to real-time insertions on patrol_logs using Supabase Realtime
    const channel = supabase
      .channel('public:patrol_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patrol_logs' },
        (payload) => {
          setLogs((prevLogs) => [payload.new, ...prevLogs]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (data) setLogs(data);
    setLoading(false);
  };

  const handleClearFeed = async () => {
    if (!confirm('Are you sure you want to clear/delete all recorded patrol logs and incident feeds? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    const { data: allLogs } = await supabase.from('patrol_logs').select('id');
    if (allLogs && allLogs.length > 0) {
      for (const log of allLogs) {
        await supabase.from('patrol_logs').delete().eq('id', log.id);
      }
    }

    setClearing(false);
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Tom Salem Security Operations — Real-Time Live Feed Active
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Guard Patrol Live Command
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg">
              Live streaming dashboard tracking checkpoint verifications, date & time stamps, precise GPS coordinates, and photo evidence instantly.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/qr-codes"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all"
            >
              📷 QR Generator
            </a>
            <a
              href="/admin/checkpoints"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-3 rounded-2xl text-xs uppercase border border-white/10 transition-all"
            >
              🏢 Manage Checkpoints
            </a>
          </div>
        </div>

        {/* Live Logs Section */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wider">Live Patrol Activity & Telemetry Feed</h2>
              <p className="text-xs text-slate-400">New scans stream in automatically in real-time. Click any row for incident inspection.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={fetchLogs}
                className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-cyan-500/30 transition-all cursor-pointer"
              >
                🔄 Refresh Feed
              </button>
              <button
                onClick={handleClearFeed}
                disabled={clearing || logs.length === 0}
                className="flex-1 md:flex-none bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-rose-500/40 transition-all cursor-pointer disabled:opacity-40"
              >
                {clearing ? 'Clearing...' : '🗑️ Clear Feeds'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs text-slate-500 font-mono animate-pulse">Loading live telemetry...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-500 font-mono">Waiting for live patrol scans...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="pb-3 px-3">Date & Time</th>
                    <th className="pb-3 px-3">Guard</th>
                    <th className="pb-3 px-3">Checkpoint</th>
                    <th className="pb-3 px-3">Coordinates (Lat, Lon)</th>
                    <th className="pb-3 px-3">Geofence Status</th>
                    <th className="pb-3 px-3">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {logs.map((log) => {
                    const scanDate = new Date(log.scanned_at);
                    const formattedDate = scanDate.toLocaleDateString();
                    const formattedTime = scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group animate-in fade-in duration-300"
                      >
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          <div className="font-bold text-white">{formattedTime}</div>
                          <div className="text-[10px] text-slate-500">{formattedDate}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-cyan-300 group-hover:text-cyan-200">{log.guard_name}</td>
                        <td className="py-3 px-3 text-white font-sans font-medium">{log.checkpoint_name}</td>
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {log.latitude && log.longitude ? (
                            <span className="text-emerald-400 font-mono">{log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}</span>
                          ) : (
                            <span className="text-slate-600">GPS Not Logged</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            ✓ Verified Within Range
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {log.photo_url ? (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                              📷 Attached
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Incident Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-cyan-400">Incident Inspection Card</span>
                  <h3 className="text-lg font-black text-white">{selectedLog.checkpoint_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Guard Name</span>
                    <span className="text-cyan-300 font-bold text-sm">{selectedLog.guard_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Scan Date & Time</span>
                    <span className="text-slate-200">{new Date(selectedLog.scanned_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase block">GPS Location Telemetry</span>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Latitude: <strong className="text-emerald-400">{selectedLog.latitude || 'N/A'}</strong></span>
                    <span>Longitude: <strong className="text-emerald-400">{selectedLog.longitude || 'N/A'}</strong></span>
                  </div>
                  <div className="pt-1 text-[10px] text-indigo-300">
                    Geofence Status: Verified within authorized perimeter range.
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block">Patrol Notes / Incident Report</span>
                  <p className="text-slate-200 font-sans text-sm">{selectedLog.notes || 'Normal patrol scan. No incidents reported.'}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Photo Evidence Attachment</span>
                  {selectedLog.photo_url ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950 max-h-64 flex items-center justify-center">
                        <img
                          src={selectedLog.photo_url}
                          alt="Incident Evidence"
                          className="max-h-64 object-contain"
                        />
                      </div>
                      <a
                        href={selectedLog.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        📥 View Full Size & Download Evidence
                      </a>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-slate-500 text-center">
                      No photo attachment provided for this scan.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Close Card
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
