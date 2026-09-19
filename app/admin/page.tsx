'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'manager'>('feed');

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
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteLog = async (id: string | number) => {
    if (!confirm('Are you sure you want to permanently delete this patrol log?')) return;

    const { error } = await supabase
      .from('guard_logs')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Failed to delete log: ' + error.message);
      return;
    }

    setLogs(prevLogs => prevLogs.filter(log => log.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">ADMIN LIVE PATROL STREAM & AUDIT</h1>
            <p className="text-xs text-slate-400 mt-1">Real-time monitoring of security guard checkpoint scans and incident logs</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => alert('Export feature coming soon!')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer flex items-center gap-2"
            >
              📊 Export Report (HTML/PDF)
            </button>
            <button
              onClick={() => alert('QR Codes modal coming soon!')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b] flex items-center gap-2"
            >
              📷 View Checkpoint QR Codes
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
            >
              Open Mobile Scanner ↗
            </a>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">Total Logs</p>
              <h2 className="text-2xl font-black text-white mt-1">{logs.length}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-900/50 flex items-center justify-center text-indigo-400">📊</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">Active Incidents</p>
              <h2 className="text-2xl font-black text-amber-400 mt-1">{logs.filter(l => l.notes && l.notes.trim() !== '').length}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-900/50 flex items-center justify-center text-amber-400">🚨</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">Active Locations</p>
              <h2 className="text-2xl font-black text-cyan-400 mt-1">{new Set(logs.map(l => l.location)).size}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-900/50 flex items-center justify-center text-cyan-400">🏢</div>
          </div>
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-xl flex justify-between items-center">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">Total Checkpoints</p>
              <h2 className="text-2xl font-black text-emerald-400 mt-1">{new Set(logs.map(l => l.checkpoint)).size}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-900/50 flex items-center justify-center text-emerald-400">📍</div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0f172a] border border-[#1e293b] px-5 py-3 rounded-2xl gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'feed'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 Live Patrol Telemetry Feed
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'manager'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏢 Site & Checkpoint Manager
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full">
              Auto-refresh active (15s)
            </span>
            <button
              onClick={fetchLogs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b] flex items-center gap-1.5"
            >
              🔄 Refresh Feed
            </button>
          </div>
        </div>

        {/* Patrol Log Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-[#1e293b]">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">LIVE PATROL FEED & AUDIT TRAIL</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Review real-time guard checkpoints, incident notes, attachments, and manage entries.</p>
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
                    <td colSpan={9} className="p-8 text-center text-slate-500">Loading live patrol telemetry...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">No patrol logs found yet. Start scanning from the mobile app!</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const dateObj = new Date(log.created_at || Date.now());
                    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;

                    return (
                      <tr key={log.id} className="hover:bg-[#131d35] transition">
                        <td className="p-4 font-mono text-slate-300 whitespace-nowrap">
                          {formattedDate}<br/>
                          <span className="text-[10px] text-slate-500">{formattedTime}</span>
                        </td>
                        <td className="p-4 font-bold text-white">{log.guard_name}</td>
                        <td className="p-4 font-bold text-emerald-400">{log.location}</td>
                        <td className="p-4 font-bold text-slate-200">{log.checkpoint}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-400">{log.latitude}, {log.longitude}</td>
                        <td className="p-4">
                          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            {log.geofence_status || 'Verified'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            Successful Scan
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate text-slate-300">
                          {log.notes || <span className="text-slate-600 italic">No issue</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
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
    </div>
  );
}
