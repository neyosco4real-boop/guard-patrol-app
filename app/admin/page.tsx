'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'manager'>('feed');

  // Stats
  const [totalLogs, setTotalLogs] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [activeLocations, setActiveLocations] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guard_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setLogs(data);
      setTotalLogs(data.length);
      const incidents = data.filter((l) => l.notes && l.notes.trim() !== '' && !l.notes.includes('No reported issues')).length;
      setActiveIncidents(incidents);
      const uniqueLocs = new Set(data.map((l) => l.location)).size;
      setActiveLocations(uniqueLocs);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await supabase.from('checkpoints').select('*');
    if (data) {
      setTotalCheckpoints(data.length);
    }
  };

  const handleDeleteLog = async (id: string, guardName: string) => {
    if (confirm(`Are you sure you want to delete the patrol log for "${guardName}"?`)) {
      const { error } = await supabase.from('guard_logs').delete().eq('id', id);
      if (!error) {
        setLogs(logs.filter((l) => l.id !== id));
        setTotalLogs((prev) => prev - 1);
      } else {
        alert('Error deleting log: ' + error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black tracking-wide text-white uppercase">Admin Live Patrol Stream & Audit</h1>
            <p className="text-xs text-slate-400 mt-1">Real-time monitoring of security guard checkpoint scans and incident logs</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/qr-codes"
              className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
            >
              📷 View Checkpoint QR Codes
            </a>
            <a
              href="/scan"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
            >
              Open Mobile Scanner ↗
            </a>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Logs</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalLogs}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 font-bold">📊</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Incidents</p>
              <h3 className="text-2xl font-black text-red-400 mt-1">{activeIncidents}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-red-950/60 border border-red-900/50 flex items-center justify-center text-red-400 font-bold">🚨</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Active Locations</p>
              <h3 className="text-2xl font-black text-white mt-1">{activeLocations}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold">🏢</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Checkpoints</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalCheckpoints}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-purple-400 font-bold">📍</div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'feed' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              Live Patrol Telemetry Feed
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🏢 Site & Checkpoint Manager
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              🔄 Refresh Feed
            </button>
          </div>
        </div>

        {/* Conditional Tab Content */}
        {activeTab === 'feed' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6">
            <div className="mb-6">
              <h2 className="text-base font-black tracking-wide text-white uppercase">LIVE PATROL FEED & AUDIT TRAIL</h2>
              <p className="text-xs text-slate-400 mt-0.5">Review real-time guard checkpoints, incident notes, attachments, and manage entries.</p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No patrol logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">DATE/TIME</th>
                      <th className="p-4">GUARD NAME</th>
                      <th className="p-4">LOCATION</th>
                      <th className="p-4">CHECKPOINT</th>
                      <th className="p-4">GPS</th>
                      <th className="p-4">GEOFENCE</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">INCIDENT NOTE & ATTACHMENT</th>
                      <th className="p-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {logs.map((log) => {
                      const isFraud = log.geofence_status && log.geofence_status.toLowerCase().includes('fraud');
                      const photoData = log.evidence_photo || (log.notes && log.notes.startsWith('data:image') ? log.notes : null);
                      const cleanNotes = log.notes ? log.notes.replace('[Photo Evidence Attached]', '').trim() : '';

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4 font-mono text-slate-300 whitespace-nowrap">
                            <div>{new Date(log.created_at).toLocaleDateString('en-GB').replace(/\//g, '/')}</div>
                            <div className="text-[11px] text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                          </td>
                          <td className="p-4 font-bold text-white whitespace-nowrap">{log.guard_name}</td>
                          <td className="p-4 text-emerald-400 font-bold whitespace-nowrap">{log.location}</td>
                          <td className="p-4 text-slate-200 font-bold whitespace-nowrap">{log.checkpoint}</td>
                          <td className="p-4 font-mono text-slate-300 whitespace-nowrap">
                            {log.latitude}, {log.longitude}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold">
                              Verified
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold">
                              {isFraud ? 'Fraudulent Scan' : 'Successful Scan'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 max-w-xs">
                            <div className="font-semibold text-white mb-1">{cleanNotes || 'Incident report'}</div>
                            {photoData && (
                              <div className="mt-1">
                                <img
                                  src={photoData}
                                  alt="Attachment"
                                  onClick={() => setSelectedImage(photoData)}
                                  className="w-16 h-12 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-80 transition shadow"
                                />
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteLog(log.id, log.guard_name)}
                              className="bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
            <h2 className="text-lg font-bold text-white">Site & Checkpoint Manager</h2>
            <p className="text-xs text-slate-400">Manage registered locations, security checkpoints, and guard assignments.</p>
            <a
              href="/admin/qr-codes"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow"
            >
              Open Checkpoint Management & QR Codes ↗
            </a>
          </div>
        )}

      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <img src={selectedImage} alt="Expanded Attachment" className="max-h-[85vh] mx-auto rounded-lg object-contain" />
            <p className="text-xs text-slate-400 mt-3 font-bold">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
