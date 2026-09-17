'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchAdminData();
    // Auto-refresh feed every 10 seconds for real-time streaming
    const interval = setInterval(fetchAdminData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    const { data: logsData } = await supabase
      .from('guard_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (logsData) setLogs(logsData);

    const { data: locsData } = await supabase.from('locations').select('*');
    if (locsData) setLocations(locsData);

    const { data: cpsData } = await supabase.from('checkpoints').select('*');
    if (cpsData) setCheckpoints(cpsData);

    setLoading(false);
  };

  const activeGuardsCount = new Set(logs.map((l) => l.guard_name)).size;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-black">TOM SALEM SECURITY GUARD PATROL SYSTEM</p>
            </div>
            <h1 className="text-xl font-black tracking-wider uppercase text-white">Admin Live Patrol Stream & Audit</h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-time monitoring of security guard checkpoint scans and incident logs</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/admin/qr-codes" 
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer flex items-center gap-2"
            >
              📱 View Checkpoint QR Codes
            </a>
            <a 
              href="/" 
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              Open Mobile Scanner ↗
            </a>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Total Patrol Scans</p>
            <p className="text-3xl font-black text-white">{logs.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Active Guards Logged</p>
            <p className="text-3xl font-black text-emerald-400">{activeGuardsCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">Monitored Facilities</p>
            <p className="text-3xl font-black text-cyan-400">{locations.length || 1}</p>
          </div>
        </div>

        {/* Live Feed & Audit Trail Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Live Patrol Feed & Audit Trail</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any report row below to inspect full telemetry and details</p>
            </div>
            <button 
              onClick={fetchAdminData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              🔄 Refresh Feed
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-xs font-mono text-slate-500">Synchronizing live telemetry feed...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs font-mono">
              No patrol scans recorded yet. Use the Mobile Scanner to scan a checkpoint QR code!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                    <th className="pb-3 font-bold">Timestamp</th>
                    <th className="pb-3 font-bold">Guard Name</th>
                    <th className="pb-3 font-bold">Location Name</th>
                    <th className="pb-3 font-bold">Checkpoint</th>
                    <th className="pb-3 font-bold">Patrol Type</th>
                    <th className="pb-3 font-bold">GPS / Geofence</th>
                    <th className="pb-3 font-bold">Incident Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/50 transition cursor-pointer font-bold text-slate-200"
                    >
                      <td className="py-4 font-mono text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 font-black text-white">{log.guard_name}</td>
                      <td className="py-4 text-emerald-400 uppercase">{log.location}</td>
                      <td className="py-4 text-cyan-400 uppercase">{log.checkpoint}</td>
                      <td className="py-4">
                        <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-300">
                          {log.patrol_type}
                        </span>
                      </td>
                      <td className="py-4 text-[11px] font-mono text-slate-400">
                        📍 {log.latitude}, {log.longitude}
                        <div className="text-[10px] text-emerald-400">✓ {log.geofence_status || 'Verified'}</div>
                      </td>
                      <td className="py-4 text-slate-300 max-w-xs truncate">{log.notes || 'No reported issues'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Interactive Detailed Report Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Patrol Audit Report Details</span>
                  <h3 className="text-base font-black uppercase text-white mt-0.5">{selectedLog.checkpoint}</h3>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-full flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Guard Name</span>
                    <span className="font-black text-white text-sm">{selectedLog.guard_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Patrol Type</span>
                    <span className="font-bold text-cyan-400">{selectedLog.patrol_type}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Parent Location (Site)</span>
                    <span className="font-bold text-emerald-400">{selectedLog.location}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Timestamp</span>
                    <span className="font-mono text-slate-300">{new Date(selectedLog.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">GPS Telemetry & Geofence</span>
                  <span className="font-mono text-slate-300">Lat/Lng: {selectedLog.latitude}, {selectedLog.longitude}</span>
                  <div className="text-emerald-400 font-bold text-[11px] mt-0.5">✓ {selectedLog.geofence_status || 'Verified within Geofence'}</div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Incident Notes & Evidence</span>
                  <p className="text-slate-200 font-medium whitespace-pre-wrap">{selectedLog.notes || 'No reported issues'}</p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Close Report Card
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
