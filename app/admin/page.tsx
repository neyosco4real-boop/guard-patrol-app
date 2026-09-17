'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalScans: 0, activeGuards: 0, locationsCount: 0 });

  useEffect(() => {
    fetchAuditLogs();

    // Set up Realtime subscription to guard_logs table for instant streaming
    const channel = supabase
      .channel('admin-live-patrol-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guard_logs' },
        (payload) => {
          setLogs((prevLogs) => [payload.new, ...prevLogs]);
          updateStats([payload.new, ...logs]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guard_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setLogs(data);
      updateStats(data);
    }
    
    // Fetch counts for summary metrics
    const { count: locCount } = await supabase.from('locations').select('*', { count: 'exact', head: true });
    const { count: cpCount } = await supabase.from('checkpoints').select('*', { count: 'exact', head: true });
    
    setStats((prev) => ({
      ...prev,
      locationsCount: locCount || 0,
    }));

    setLoading(false);
  };

  const updateStats = (currentLogs: any[]) => {
    const uniqueGuards = new Set(currentLogs.map((l) => l.guard_name)).size;
    setStats((prev) => ({
      ...prev,
      totalScans: currentLogs.length,
      activeGuards: uniqueGuards,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
              <h1 className="text-xl font-black tracking-wider uppercase text-white">Admin Live Patrol Stream & Audit</h1>
            </div>
            <p className="text-xs text-slate-400">Real-time monitoring of security guard checkpoint scans and incident logs</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/admin/qr-codes" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow"
            >
              📱 View Checkpoint QR Codes
            </a>
            <a 
              href="/" 
              target="_blank" 
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Open Mobile Scanner ↗
            </a>
          </div>
        </div>

        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Patrol Scans</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{stats.totalScans}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Active Guards Logged</p>
            <p className="text-2xl font-black text-cyan-400 font-mono">{stats.activeGuards}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Monitored Facilities</p>
            <p className="text-2xl font-black text-purple-400 font-mono">{stats.locationsCount}</p>
          </div>
        </div>

        {/* Live Audit Stream Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Live Patrol Feed & Audit Trail</h2>
            <button 
              onClick={fetchAuditLogs}
              className="text-xs bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-bold transition"
            >
              🔄 Refresh Feed
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs font-mono text-slate-500">Connecting to live feed stream...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-xs text-slate-400 space-y-2">
              <p className="font-bold">No patrol logs recorded yet.</p>
              <p className="text-[11px] text-slate-500">Scan a checkpoint QR code from the mobile scanner to see real-time data appear here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Guard Name</th>
                    <th className="pb-3 px-3">Location Name</th>
                    <th className="pb-3 px-3">Checkpoint</th>
                    <th className="pb-3 px-3">Patrol Type</th>
                    <th className="pb-3 px-3">GPS / Geofence</th>
                    <th className="pb-3 px-3">Incident Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {logs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-slate-950/50 transition">
                      <td className="py-3 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                        {log.guard_name}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold whitespace-nowrap">
                        {log.location}
                      </td>
                      <td className="py-3 px-3 text-cyan-400 whitespace-nowrap">
                        {log.checkpoint}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-lg text-[10px]">
                          {log.patrol_type || 'Normal Patrol'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                        <div>📍 {log.latitude}, {log.longitude}</div>
                        <div className="text-emerald-400 font-sans font-bold">✓ {log.geofence_status || 'Verified'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans max-w-xs truncate">
                        {log.notes || 'No notes provided'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
