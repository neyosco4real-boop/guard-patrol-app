'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchLogs();

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
    if (!confirm('Are you sure you want to clear/delete all recorded patrol logs?')) return;
    setClearing(true);
    const { data: allLogs } = await supabase.from('patrol_logs').select('id');
    if (allLogs) {
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
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wider">Live Patrol Activity & Telemetry Feed</h2>
              <p className="text-xs text-slate-400">New scans stream in automatically in real-time.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={fetchLogs} className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-cyan-500/30 cursor-pointer">
                🔄 Refresh
              </button>
              <button onClick={handleClearFeed} disabled={clearing || logs.length === 0} className="bg-rose-950/60 text-rose-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-rose-500/40 cursor-pointer disabled:opacity-40">
                {clearing ? 'Clearing...' : '🗑️ Clear'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs text-slate-500 font-mono animate-pulse">Loading live telemetry...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-500 font-mono">Waiting for scans...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="pb-3 px-3">Date & Time</th>
                    <th className="pb-3 px-3">Guard</th>
                    <th className="pb-3 px-3">Location</th>
                    <th className="pb-3 px-3">Checkpoint</th>
                    <th className="pb-3 px-3">Coordinates</th>
                    <th className="pb-3 px-3">Geofence Status</th>
                    <th className="pb-3 px-3">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {logs.map((log) => {
                    const scanDate = new Date(log.scanned_at);
                    return (
                      <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-white/[0.04] cursor-pointer">
                        <td className="py-3 px-3 text-slate-300">
                          <div className="font-bold text-white">{scanDate.toLocaleTimeString()}</div>
                          <div className="text-[10px] text-slate-500">{scanDate.toLocaleDateString()}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-cyan-300">{log.guard_name}</td>
                        <td className="py-3 px-3 text-indigo-300 font-sans font-medium">{log.location_name || log.location || 'N/A'}</td>
                        <td className="py-3 px-3 text-white font-sans font-medium">{log.checkpoint_name}</td>
                        <td className="py-3 px-3 text-[11px] text-emerald-400">
                          {log.latitude ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}` : 'N/A'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">✓ Verified</span>
                        </td>
                        <td className="py-3 px-3">
                          {log.photo_url ? <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-[10px]">📷 Attached</span> : <span className="text-slate-600 text-[10px]">None</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
