'use client';
import { useState, useEffect } from 'react';

interface PatrolLog {
  id: string | number;
  created_at: string;
  guard_name: string;
  location: string;
  checkpoint: string;
  gps_coordinates: string;
  status: string;
  incident_report: string;
}

export default function AdminTelemetryPage() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10s for live updates
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.guard_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.checkpoint?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 shadow-[0_0_15px_#14b8a6]"></div>
        
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
            <span className="text-xs uppercase tracking-widest text-teal-400 font-mono font-semibold">SecureOps Command Center</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">Live Guard Telemetry Feed</h1>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search guard or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-full md:w-64 transition-all"
          />
          <button 
            onClick={() => { setLoading(true); fetchLogs(); }}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-400 font-medium px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shrink-0"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stats Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
          <p className="text-xs font-mono uppercase text-slate-400 mb-1">Total Scans Recorded</p>
          <p className="text-3xl font-extrabold text-white font-mono">{logs.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
          <p className="text-xs font-mono uppercase text-slate-400 mb-1">Operational Status</p>
          <p className="text-xl font-bold text-teal-400 flex items-center gap-2 mt-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_#14b8a6]"></span>
            Active & Secure
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-sm">
          <p className="text-xs font-mono uppercase text-slate-400 mb-1">Encryption Protocol</p>
          <p className="text-xl font-bold text-slate-200 font-mono">TLS 1.3 / Supabase</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="max-w-7xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6">Guard Name</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Checkpoint</th>
                <th className="py-4 px-6">GPS Coordinates</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Incident Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono animate-pulse">
                    Decrypting live telemetry streams...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No patrol telemetry records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString();
                  const isCompleted = log.status?.toLowerCase() === 'completed';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-6 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-4 px-6 font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500/50 group-hover:bg-teal-400 transition-colors"></span>
                        {log.guard_name}
                      </td>
                      <td className="py-4 px-6 text-slate-200 whitespace-nowrap font-medium">
                        {log.location || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-slate-300 whitespace-nowrap">
                        <span className="bg-slate-800 text-teal-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700">
                          {log.checkpoint || 'General Scan'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-teal-400/90 whitespace-nowrap">
                        {log.gps_coordinates || 'N/A'}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                          isCompleted 
                            ? 'bg-teal-950/60 border-teal-500/40 text-teal-300' 
                            : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-teal-400' : 'bg-amber-400'}`}></span>
                          {log.status || 'Completed'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300 max-w-xs truncate" title={log.incident_report}>
                        {log.incident_report || 'No issue'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
