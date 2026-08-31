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

interface CheckpointItem {
  id: string | number;
  created_at: string;
  location_name: string;
  checkpoint_name: string;
  qr_url: string;
}

export default function AdminTelemetryPage() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'checkpoints'>('feed');

  // Checkpoint Generator State
  const [siteName, setSiteName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [scansRes, cpRes] = await Promise.all([
        fetch('/api/scans'),
        fetch('/api/checkpoints')
      ]);
      const scansData = await scansRes.json();
      const cpData = await cpRes.json();

      if (scansData.success) setLogs(scansData.logs || []);
      if (cpData.success) setCheckpoints(cpData.checkpoints || []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.guard_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.checkpoint?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !checkpointName) return;

    setSubmitting(true);
    try {
      const payloadStr = `Location: ${siteName} | Checkpoint: ${checkpointName}`;
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payloadStr)}`;

      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_name: siteName,
          checkpoint_name: checkpointName,
          qr_url: qrApi
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSiteName('');
      setCheckpointName('');
      fetchData();
    } catch (err: any) {
      alert('Error creating checkpoint: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCheckpoint = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return;
    try {
      const res = await fetch(`/api/checkpoints?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchData();
    } catch (err: any) {
      alert('Error deleting checkpoint: ' + err.message);
    }
  };

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
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">Guard Patrol Operations</h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'feed' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Live Feed
            </button>
            <button 
              onClick={() => setActiveTab('checkpoints')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'checkpoints' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Checkpoint & QR Manager
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'feed' ? (
        <>
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

          {/* Search & Refresh Bar */}
          <div className="max-w-7xl mx-auto flex justify-between items-center mb-6">
            <input 
              type="text" 
              placeholder="Search guard or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 w-full max-w-sm transition-all"
            />
            <button 
              onClick={() => { setLoading(true); fetchData(); }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-400 font-medium px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shrink-0"
            >
              <span>🔄 Refresh Feed</span>
            </button>
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
        </>
      ) : (
        /* Checkpoint & QR Manager Section */
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-2">🏷️ Generate New Checkpoint QR Tag</h2>
            <p className="text-sm text-slate-400 mb-6">Create and save verifiable physical checkpoint QR tags into the database.</p>
            
            <form onSubmit={handleCreateCheckpoint} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Location Site Name</label>
                <input 
                  type="text" 
                  value={siteName} 
                  onChange={(e) => setSiteName(e.target.value)} 
                  placeholder="e.g. Multichoice HQ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Checkpoint / Gate Name</label>
                <input 
                  type="text" 
                  value={checkpointName} 
                  onChange={(e) => setCheckpointName(e.target.value)} 
                  placeholder="e.g. Front Gate / Server Room"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
                  required 
                />
              </div>
              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Saving Checkpoint...' : 'Save & Generate QR Tag'}
              </button>
            </form>
          </div>

          {/* Saved Checkpoints List Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-4">🗂️ Deployed Checkpoint Database ({checkpoints.length})</h2>
            
            {checkpoints.length === 0 ? (
              <p className="text-slate-500 text-sm">No checkpoints created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {checkpoints.map((cp) => (
                  <div key={cp.id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col items-center text-center relative group">
                    <button 
                      onClick={() => handleDeleteCheckpoint(cp.id)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 text-xs font-mono bg-slate-900 px-2 py-1 rounded-lg border border-slate-800"
                    >
                      Delete
                    </button>
                    <div className="bg-white p-3 rounded-xl shadow-md mb-3 mt-4">
                      <img src={cp.qr_url} alt="QR" className="w-36 h-36" />
                    </div>
                    <p className="text-sm font-semibold text-white">{cp.location_name}</p>
                    <p className="text-xs text-teal-400 font-mono mb-4">{cp.checkpoint_name}</p>
                    <a 
                      href={cp.qr_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold py-2 rounded-xl transition-all"
                    >
                      📥 Download QR
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
