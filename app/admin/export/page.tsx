'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ExportReportPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data, error } = await supabase
        .from('guard_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    }
    fetchLogs();
  }, []);

  const now = new Date();
  const generatedString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-6 print:hidden">
          <a
            href="/admin"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm border border-slate-300"
          >
            ← Back to Admin Dashboard
          </a>
          <button
            onClick={() => window.print()}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider flex items-center gap-2"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>

        {/* Official Report Title Section */}
        <div className="space-y-1 pt-2">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
            <span>🛡️</span>
            <span>TOM SALEM SECURITY GUARD PATROL SYSTEM</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            OFFICIAL PATROL AUDIT & TELEMETRY REPORT
          </h1>
          <p className="text-xs font-mono text-slate-500">
            Generated on: {generatedString} | Total Logs: {logs.length}
          </p>
        </div>

        <hr className="border-t-2 border-slate-900 my-4" />

        {/* Data Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 text-slate-600 font-mono text-[10px] uppercase">
                <th className="p-3.5 border border-slate-300">Timestamp</th>
                <th className="p-3.5 border border-slate-300">Guard Name</th>
                <th className="p-3.5 border border-slate-300">Location</th>
                <th className="p-3.5 border border-slate-300">Checkpoint</th>
                <th className="p-3.5 border border-slate-300">Patrol Type</th>
                <th className="p-3.5 border border-slate-300">GPS Telemetry</th>
                <th className="p-3.5 border border-slate-300">Evidence Image</th>
                <th className="p-3.5 border border-slate-300">Incident Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 border border-slate-300">Loading patrol report telemetry...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 border border-slate-300">No patrol logs found.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const d = new Date(log.created_at || Date.now());
                  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3.5 border border-slate-300 font-mono text-slate-700 whitespace-nowrap">{dateStr}</td>
                      <td className="p-3.5 border border-slate-300 font-bold text-slate-900 whitespace-nowrap">{log.guard_name}</td>
                      <td className="p-3.5 border border-slate-300 font-bold text-emerald-700 whitespace-nowrap">{log.location}</td>
                      <td className="p-3.5 border border-slate-300 font-bold text-slate-800 whitespace-nowrap">{log.checkpoint}</td>
                      <td className="p-3.5 border border-slate-300 text-slate-700 whitespace-nowrap">QR Scan Verified</td>
                      <td className="p-3.5 border border-slate-300 font-mono text-[11px] text-slate-600 whitespace-nowrap">{log.latitude}, {log.longitude}</td>
                      <td className="p-3.5 border border-slate-300 text-center">
                        {log.evidence_photo ? (
                          <div className="flex flex-col items-center gap-1">
                            <img src={log.evidence_photo} alt="Evidence" className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-sm" />
                            <a href={log.evidence_photo} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-600 underline font-bold">Open Full</a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No photo</span>
                        )}
                      </td>
                      <td className="p-3.5 border border-slate-300 text-slate-700 max-w-xs">
                        {log.notes || <span className="text-slate-400 italic">No issue</span>}
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
  );
}
