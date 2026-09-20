'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ExportReportPage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch unique available locations on load
  useEffect(() => {
    async function fetchLocations() {
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from('guard_logs')
        .select('location');

      if (!error && data) {
        const uniqueLocs = Array.from(new Set(data.map(item => item.location))).filter(Boolean) as string[];
        setLocations(uniqueLocs);
        if (uniqueLocs.length > 0) {
          setSelectedLocation(uniqueLocs[0]); // Default to first location
        }
      }
      setLoadingLocations(false);
    }
    fetchLocations();
  }, []);

  // Fetch logs whenever selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) return;

    async function fetchLogsForLocation() {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('guard_logs')
        .select('*')
        .eq('location', selectedLocation)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLogs(data);
      }
      setLoadingLogs(false);
    }
    fetchLogsForLocation();
  }, [selectedLocation]);

  const now = new Date();
  const generatedString = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
            >
              ← Back to Admin
            </a>
            <div>
              <h1 className="text-xs font-black text-white uppercase tracking-wider">Secure Multi-Site Report Export</h1>
              <p className="text-[11px] text-slate-400">Select a specific location to generate isolated compliance telemetry.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                disabled={loadingLocations || locations.length === 0}
                className="bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 w-full cursor-pointer"
              >
                {loadingLocations ? (
                  <option>Loading locations...</option>
                ) : locations.length === 0 ? (
                  <option>No locations found</option>
                ) : (
                  locations.map((loc) => (
                    <option key={loc} value={loc}>
                      📍 Site: {loc}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={() => window.print()}
              disabled={loadingLogs || logs.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider whitespace-nowrap flex items-center gap-2"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* Printable Report Container (Styled clean white for print/PDF output) */}
        <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl space-y-6 print:shadow-none print:p-0">
          
          {/* Official Report Title Section */}
          <div className="space-y-1.5 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
              <span>🛡️</span>
              <span>TOM SALEM SECURITY GUARD PATROL SYSTEM</span>
            </div>
            <div className="flex justify-between items-end flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  OFFICIAL PATROL AUDIT & TELEMETRY REPORT
                </h1>
                <p className="text-xs font-bold text-emerald-700 uppercase mt-0.5">
                  Target Facility / Location: {selectedLocation || 'None Selected'}
                </p>
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Generated on: {generatedString} | Verified Logs: {logs.length}
              </p>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-mono text-[10px] uppercase">
                  <th className="p-3.5 border border-slate-300">Timestamp</th>
                  <th className="p-3.5 border border-slate-300">Guard Name</th>
                  <th className="p-3.5 border border-slate-300">Location</th>
                  <th className="p-3.5 border border-slate-300">Checkpoint</th>
                  <th className="p-3.5 border border-slate-300">Patrol Type</th>
                  <th className="p-3.5 border border-slate-300">GPS Telemetry</th>
                  <th className="p-3.5 border border-slate-300 text-center">Evidence Image</th>
                  <th className="p-3.5 border border-slate-300">Incident Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 border border-slate-300">Loading isolated site telemetry...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 border border-slate-300">No patrol records found for this location.</td>
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
                        <td className="p-3.5 border border-slate-300 text-center align-middle">
                          {log.evidence_photo ? (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <img src={log.evidence_photo} alt="Evidence" className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-sm" />
                              <a href={log.evidence_photo} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-600 underline font-bold print:hidden">Open Full</a>
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

          {/* Report Footer Signature Area */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
            <p>Verified Compliance Audit Document — Tom Salem Security Systems</p>
            <p>Page 1 of 1</p>
          </div>

        </div>

      </div>
    </div>
  );
}
