'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CheckpointsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showAddCheckpointModal, setShowAddCheckpointModal] = useState(false);
  const [selectedSiteForCheckpoint, setSelectedSiteForCheckpoint] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrCheckpoint, setActiveQrCheckpoint] = useState<any>(null);

  // Location form state
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [submittingLoc, setSubmittingLoc] = useState(false);

  // Checkpoint form state
  const [checkpointName, setCheckpointName] = useState('');
  const [submittingCp, setSubmittingCp] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from('locations').select('*').order('name');
    if (locs) setLocations(locs);

    const { data: cps } = await supabase.from('checkpoints').select('*').order('name');
    if (cps) setCheckpoints(cps);

    const { data: patrolLogs } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('scanned_at', { ascending: false });
    if (patrolLogs) setLogs(patrolLogs);

    setLoading(false);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) return alert('Please enter a location name.');
    setSubmittingLoc(true);

    const { error } = await supabase.from('locations').insert([
      {
        name: locationName,
        address: locationAddress,
      },
    ]);

    if (error) {
      alert('Error creating location: ' + error.message);
    } else {
      setLocationName('');
      setLocationAddress('');
      setShowAddLocationModal(false);
      fetchData();
    }
    setSubmittingLoc(false);
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointName || !selectedSiteForCheckpoint) return alert('Please provide checkpoint name.');
    setSubmittingCp(true);

    // Completely schema-safe: inserts only columns that exist in the checkpoints table (name and location)
    const { error } = await supabase.from('checkpoints').insert([
      {
        name: checkpointName,
        location: selectedSiteForCheckpoint.name,
      },
    ]);

    if (error) {
      alert('Error creating checkpoint: ' + error.message);
    } else {
      setCheckpointName('');
      setShowAddCheckpointModal(false);
      setSelectedSiteForCheckpoint(null);
      fetchData();
    }
    setSubmittingCp(false);
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete site "${name}" and all its checkpoints?`)) return;
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      alert('Error deleting location: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleDeleteCheckpoint = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete checkpoint "${name}"?`)) return;
    const { error } = await supabase.from('checkpoints').delete().eq('id', id);
    if (error) {
      alert('Error deleting checkpoint: ' + error.message);
    } else {
      fetchData();
    }
  };

  // Filter logs based on selected location
  const filteredLogs = logs.filter((log) => {
    if (selectedLocationId === 'all') return true;
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return true;
    return (
      log.location_id === loc.id ||
      log.location_name?.toLowerCase() === loc.name.toLowerCase() ||
      log.location?.toLowerCase() === loc.name.toLowerCase()
    );
  });

  const handleDownloadCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No telemetry records found for export.');
      return;
    }

    const headers = ['Date & Time', 'Guard Name', 'Location', 'Checkpoint', 'Latitude', 'Longitude', 'Geofence Status', 'Notes', 'Photo URL'];
    const rows = filteredLogs.map((l) => [
      new Date(l.scanned_at).toISOString(),
      `"${l.guard_name || ''}"`,
      `"${l.location_name || l.location || ''}"`,
      `"${l.checkpoint_name || ''}"`,
      l.latitude || '',
      l.longitude || '',
      'Verified',
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${l.photo_url || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `patrol_report_${selectedLocationId === 'all' ? 'global' : selectedLocationId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      
      {/* Add Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white uppercase">+ Create Location Site</h3>
              <button onClick={() => setShowAddLocationModal(false)} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400">Location Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tom Salem Head Office"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400">Address / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Ikoyi, Lagos."
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLoc}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submittingLoc ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {showAddCheckpointModal && selectedSiteForCheckpoint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400">Site: {selectedSiteForCheckpoint.name}</span>
                <h3 className="text-lg font-black text-white uppercase">+ Add Checkpoint</h3>
              </div>
              <button onClick={() => setShowAddCheckpointModal(false)} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateCheckpoint} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400">Checkpoint Name</label>
                <input
                  type="text"
                  placeholder="e.g. Back Gate, Server Room"
                  value={checkpointName}
                  onChange={(e) => setCheckpointName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddCheckpointModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCp}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submittingCp ? 'Saving...' : 'Save Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal for Checkpoint */}
      {showQrModal && activeQrCheckpoint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-6 shadow-2xl text-center">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white uppercase">Checkpoint QR Code</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>

            <div className="space-y-2">
              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    JSON.stringify({
                      checkpoint: activeQrCheckpoint.name,
                      location: activeQrCheckpoint.location,
                    })
                  )}`}
                  alt="Checkpoint QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="pt-2">
                <p className="text-sm font-black text-white">{activeQrCheckpoint.name}</p>
                <p className="text-xs font-mono text-cyan-400 uppercase">Location: {activeQrCheckpoint.location}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
                  JSON.stringify({
                    checkpoint: activeQrCheckpoint.name,
                    location: activeQrCheckpoint.location,
                  })
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md shadow-cyan-500/20"
              >
                Download HQ QR
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Report View Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-300 pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">Tom Salem Security Operations</h1>
                <p className="text-xs font-bold text-slate-600">Official Certified Patrol & Incident Telemetry Report</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer"
              >
                ✕ Close Report
              </button>
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-600">
              <p>Generated: {new Date().toLocaleString()}</p>
              <p>Scope: {selectedLocationId === 'all' ? 'All Locations (Global Report)' : locations.find(l => l.id === selectedLocationId)?.name || 'Selected Site'}</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase border-b border-slate-300 pb-1">Telemetry Summary ({filteredLogs.length} Records)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400 bg-slate-100 font-bold">
                      <th className="p-2 border border-slate-300">Date & Time</th>
                      <th className="p-2 border border-slate-300">Guard</th>
                      <th className="p-2 border border-slate-300">Location</th>
                      <th className="p-2 border border-slate-300">Checkpoint</th>
                      <th className="p-2 border border-slate-300">GPS Coordinates</th>
                      <th className="p-2 border border-slate-300">Status</th>
                      <th className="p-2 border border-slate-300">Notes / Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-200">
                        <td className="p-2 border border-slate-300">{new Date(log.scanned_at).toLocaleString()}</td>
                        <td className="p-2 border border-slate-300 font-bold">{log.guard_name}</td>
                        <td className="p-2 border border-slate-300">{log.location_name || log.location || 'N/A'}</td>
                        <td className="p-2 border border-slate-300">{log.checkpoint_name}</td>
                        <td className="p-2 border border-slate-300 font-mono text-[10px]">
                          {log.latitude ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}` : 'N/A'}
                        </td>
                        <td className="p-2 border border-slate-300 text-emerald-700 font-bold">Verified</td>
                        <td className="p-2 border border-slate-300">
                          <div>{log.notes || 'Normal patrol scan.'}</div>
                          {log.photo_url && <a href={log.photo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline font-bold mt-1 block">[View Photo Evidence]</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-6 flex justify-between text-xs font-mono border-t border-slate-300 items-center">
              <div>Authorized By: Tom Salem Security Command</div>
              <button
                onClick={() => window.print()}
                className="bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
              >
                🖨️ Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main UI */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Site Management & Certified Report Exports
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Checkpoint & Location Command
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg">
              Manage physical locations, site geofences, checkpoints, generate QR codes, and view certified patrol report HTML summaries instantly.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddLocationModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              + Create Location
            </button>
            <a
              href="/admin/qr-codes"
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-5 py-3 rounded-2xl text-xs uppercase border border-cyan-500/30 transition-all"
            >
              📷 QR Generator
            </a>
            <a
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-3 rounded-2xl text-xs uppercase border border-white/10 transition-all"
            >
              📊 Dashboard
            </a>
          </div>
        </div>

        {/* Registered Location Sites */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black uppercase text-white tracking-wider">Registered Location Sites ({locations.length})</h2>
            <button
              onClick={() => setShowAddLocationModal(true)}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer transition-all"
            >
              + Add Location Site
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">Loading sites...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">No location sites registered yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((loc) => {
                const siteCheckpoints = checkpoints.filter((cp) => cp.location_id === loc.id || cp.location?.toLowerCase() === loc.name.toLowerCase());
                return (
                  <div key={loc.id} className="bg-slate-950 border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-cyan-400 font-black text-sm">
                            <span>🏢</span> {loc.name}
                          </div>
                          <p className="text-xs text-slate-400">{loc.address || 'No address specified.'}</p>
                        </div>
                      </div>

                      {/* Checkpoints list for this location with QR action */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 uppercase">
                          <span>Checkpoints ({siteCheckpoints.length})</span>
                        </div>
                        {siteCheckpoints.length === 0 ? (
                          <div className="text-[11px] text-slate-600 italic">No checkpoints added yet.</div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {siteCheckpoints.map((cp) => (
                              <div key={cp.id} className="flex items-center justify-between bg-slate-900 border border-white/10 px-3 py-2 rounded-xl text-xs text-slate-200">
                                <div className="flex items-center gap-2 font-mono truncate">
                                  <span>📍</span>
                                  <span className="truncate">{cp.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      setActiveQrCheckpoint(cp);
                                      setShowQrModal(true);
                                    }}
                                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold px-2 py-1 rounded-lg text-[10px] uppercase cursor-pointer border border-cyan-500/30"
                                    title="View QR Code"
                                  >
                                    📷 QR
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCheckpoint(cp.id, cp.name)}
                                    className="text-rose-400 hover:text-rose-200 font-bold text-sm cursor-pointer px-1"
                                    title="Delete checkpoint"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedSiteForCheckpoint(loc);
                          setShowAddCheckpointModal(true);
                        }}
                        className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold px-3 py-2 rounded-xl text-[11px] uppercase border border-indigo-500/30 cursor-pointer transition-all"
                      >
                        + Add Checkpoint
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(loc.id, loc.name)}
                        className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-bold px-3 py-2 rounded-xl text-[11px] uppercase border border-rose-500/30 cursor-pointer transition-all"
                      >
                        🗑️ Delete Site
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Patrol Reports & Incident Exports */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wider">Patrol Reports & Incident Exports</h2>
              <p className="text-xs text-slate-400">Select a specific location site to filter and view certified reports.</p>
            </div>
            
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">🌍 All Locations (Global Report)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  🏢 {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleDownloadCSV}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 font-black p-5 rounded-2xl text-xs uppercase border border-emerald-500/30 flex items-center justify-center gap-3 cursor-pointer shadow-lg transition-all"
            >
              📊 Download Excel (CSV) for Selected Location
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black p-5 rounded-2xl text-xs uppercase shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-3 cursor-pointer transition-all"
            >
              👁️ View HTML Report for Selected Location
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
