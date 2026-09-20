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
          setSelectedLocation(uniqueLocs[0]);
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

  // Function to generate and download standalone HTML file
  const handleDownloadHTML = () => {
    const tableRows = logs.length === 0 
      ? `<tr><td colspan="8" style="padding: 40px; text-align: center; color: #64748b; border: 1px solid #cbd5e1;">No patrol records found for this location.</td></tr>`
      : logs.map((log) => {
          const d = new Date(log.created_at || Date.now());
          const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
          
          const evidenceHTML = log.evidence_photo 
            ? `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                 <img src="${log.evidence_photo}" alt="Evidence" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />
                 <a href="${log.evidence_photo}" target="_blank" style="font-size: 9px; color: #4f46e5; text-decoration: underline; font-weight: bold;">Open Full</a>
               </div>`
            : `<span style="color: #94a3b8; font-style: italic; font-size: 11px;">No photo</span>`;

          const notesHTML = log.notes || `<span style="color: #94a3b8; font-style: italic;">No issue</span>`;

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px; white-space: nowrap;">${dateStr}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; white-space: nowrap;">${log.guard_name}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857; white-space: nowrap;">${log.location}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; white-space: nowrap;">${log.checkpoint}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; white-space: nowrap;">QR Scan Verified</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px; white-space: nowrap;">${log.latitude}, ${log.longitude}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">${evidenceHTML}</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1;">${notesHTML}</td>
            </tr>
          `;
        }).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Patrol Report - ${selectedLocation}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; padding: 40px; margin: 0; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { color: #065f46; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0 0 4px 0; }
    .meta { font-size: 11px; font-family: monospace; color: #64748b; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-family: monospace; text-transform: uppercase; font-size: 10px; color: #334155; }
    td { padding: 10px; border: 1px solid #cbd5e1; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; font-family: monospace; color: #64748b; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">🛡️ Tom Salem Security Guard Patrol System</div>
      <h1>Official Patrol Audit & Telemetry Report</h1>
      <div style="font-weight: bold; color: #047857; text-transform: uppercase; font-size: 12px; margin-top: 4px;">Target Facility: ${selectedLocation}</div>
      <div class="meta">Generated on: ${generatedString} | Verified Logs: ${logs.length}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Guard Name</th>
          <th>Location</th>
          <th>Checkpoint</th>
          <th>Patrol Type</th>
          <th>GPS Telemetry</th>
          <th style="text-align: center;">Evidence Image</th>
          <th>Incident Notes</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <div class="footer">
      <span>Verified Compliance Audit Document — Tom Salem Security Systems</span>
      <span>Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Patrol_Report_${selectedLocation.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              <p className="text-[11px] text-slate-400">Select location, then download standalone HTML or print PDF.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
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
              onClick={handleDownloadHTML}
              disabled={loadingLogs || logs.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider whitespace-nowrap flex items-center gap-2"
            >
              📥 Download HTML Report
            </button>

            <button
              onClick={() => window.print()}
              disabled={loadingLogs || logs.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider whitespace-nowrap flex items-center gap-2"
            >
              🖨️ Print PDF
            </button>
          </div>
        </div>

        {/* Printable Report Preview Container */}
        <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-2xl space-y-6 print:shadow-none print:p-0">
          
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

          <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
            <p>Verified Compliance Audit Document — Tom Salem Security Systems</p>
            <p>Page 1 of 1</p>
          </div>

        </div>

      </div>
    </div>
  );
}
