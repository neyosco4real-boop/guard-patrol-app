'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchLogs();
    const subscription = supabase
      .channel('patrol_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patrol_logs' }, (payload) => {
        setLogs((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('scanned_at', { ascending: false });
    if (data) setLogs(data);
  };

  const acknowledgeLog = async (id: string) => {
    await supabase.from('patrol_logs').update({ status: 'ACKNOWLEDGED' }).eq('id', id);
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6 font-sans">
      <header className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-cyan-400 uppercase tracking-wider">🛡️ COMMAND TELEMETRY SYSTEM</h1>
          <p className="text-sm text-slate-400">Real-Time Geofence Intelligence & Field Monitoring</p>
        </div>
      </header>

      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-white uppercase tracking-wide">Live Telemetry Feed ({logs.length})</h2>
          <button onClick={fetchLogs} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">
            Sync Stream
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-4 font-black">Date & Time Stamp</th>
                <th className="py-4 px-4 font-bold">Guard</th>
                <th className="py-4 px-4 font-bold">Location / Checkpoint</th>
                <th className="py-4 px-4 font-bold">GPS Coordinates</th>
                <th className="py-4 px-4 font-bold">Incident Report</th>
                <th className="py-4 px-4 font-bold">Attachment</th>
                <th className="py-4 px-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {logs.map((log) => {
                const dateObj = new Date(log.scanned_at || log.created_at);
                const formattedDate = dateObj.toLocaleDateString();
                const formattedTime = dateObj.toLocaleTimeString();

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* ENLARGED & BOLD DATE/TIME CENTRE OF ATTRACTION */}
                    <td className="py-5 px-4 font-black text-cyan-300 text-base tracking-tight whitespace-nowrap">
                      <div className="text-white text-lg font-black">{formattedTime}</div>
                      <div className="text-xs text-slate-400 font-semibold">{formattedDate}</div>
                    </td>
                    <td className="py-5 px-4 font-bold text-white flex items-center gap-2">
                      <span>👮‍♂️</span> {log.guard_name}
                    </td>
                    <td className="py-5 px-4">
                      <div className="font-bold text-white">{log.location_name}</div>
                      <div className="text-xs text-cyan-400 font-mono">🎯 {log.checkpoint_name}</div>
                    </td>
                    <td className="py-5 px-4 font-mono text-emerald-400 font-bold">
                      {log.latitude && log.longitude ? `📍 ${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}` : <span className="text-rose-400">No GPS</span>}
                    </td>
                    <td className="py-5 px-4 font-medium text-slate-300">{log.notes}</td>
                    <td className="py-5 px-4">
                      {log.photo_url ? (
                        <a href={log.photo_url} target="_blank" rel="noreferrer" className="bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-cyan-500/30 transition-all inline-block">
                          View Photo
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-5 px-4">
                      <button
                        onClick={() => acknowledgeLog(log.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          log.status === 'ACKNOWLEDGED' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                        }`}
                      >
                        {log.status === 'ACKNOWLEDGED' ? '✓ Ack' : 'Ack'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
