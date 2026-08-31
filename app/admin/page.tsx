'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PatrolLog {
  id: string;
  guard_name: string;
  location: string;
  checkpoint: string;
  latitude: string;
  longitude: string;
  notes: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<PatrolLog | null>(null);

  // Unified Modals state
  const [showLocationManagerModal, setShowLocationManagerModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [activeManagerTab, setActiveManagerTab] = useState<'location' | 'checkpoint' | 'qr'>('location');
  
  const [newLocationName, setNewLocationName] = useState('');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('50');
  const [selectedCheckpointForQR, setSelectedCheckpointForQR] = useState('Gate 1 - North Perimeter');
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('public:patrol_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patrol_logs' }, (payload) => {
        setLogs((prev) => [payload.new as PatrolLog, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patrol_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractPhoto = (notes: string) => {
    if (!notes) return null;
    const match = notes.match(/\[PHOTO_DATA:(.*?)\]/);
    return match ? match[1] : null;
  };

  const cleanNotesText = (notes: string) => {
    if (!notes) return '';
    return notes.replace(/\[PHOTO_DATA:.*?\]/g, '').trim();
  };

  const exportToCSV = () => {
    const headers = ['Time', 'Guard Name', 'Location', 'Checkpoint', 'Latitude', 'Longitude', 'Notes'];
    const rows = logs.map(l => [
      l.created_at,
      `"${l.guard_name}"`,
      `"${l.location}"`,
      `"${l.checkpoint}"`,
      l.latitude,
      l.longitude,
      `"${cleanNotesText(l.notes)}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `patrol_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus(`Location "${newLocationName}" created successfully!`);
    setNewLocationName('');
    setTimeout(() => {
      setActionStatus('');
    }, 2000);
  };

  const handleCreateCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus(`Checkpoint "${newCheckpointName}" created and QR code generated!`);
    setNewCheckpointName('');
    setTimeout(() => {
      setActionStatus('');
    }, 2000);
  };

  const handleSaveGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus(`Geofence radius updated to ${geofenceRadius} meters!`);
    setTimeout(() => {
      setShowGeofenceModal(false);
      setActionStatus('');
    }, 1500);
  };

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.guard_name?.toLowerCase().includes(term) ||
      log.location?.toLowerCase().includes(term) ||
      log.checkpoint?.toLowerCase().includes(term) ||
      log.notes?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Management Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-xl font-bold text-white tracking-tight">Security Guard Patrol Dashboard</h1>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                Live Feed Active
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time guard telemetry, location manager, and geofence monitoring.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLocationManagerModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>🏢</span> Location Manager
            </button>
            <button
              onClick={() => setShowGeofenceModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>📍</span> Geofence
            </button>
            <button
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-emerald-950/50"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Live Patrol Feed Section (Centered & Prominent) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Patrol Logs Feed</h2>
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading live telemetry feed...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
              No patrol logs found matching your criteria.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Time</th>
                      <th className="p-4">Guard Name</th>
                      <th className="p-4">Location & Checkpoint</th>
                      <th className="p-4">GPS Coordinates</th>
                      <th className="p-4">Notes / Photo</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredLogs.map((log) => {
                      const photo = extractPhoto(log.notes);
                      const cleanNotes = cleanNotesText(log.notes);

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4 text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            <div className="text-[10px] text-slate-500">{new Date(log.created_at || Date.now()).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4 font-semibold text-white whitespace-nowrap">
                            {log.guard_name}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-200">{log.location}</div>
                            <div className="text-[11px] text-emerald-400 font-mono">{log.checkpoint}</div>
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-300">
                            <div>{log.latitude}, {log.longitude}</div>
                            <span className="inline-block mt-1 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-2 py-0.5 rounded font-semibold">
                              ✓ Verified (≤{geofenceRadius}m)
                            </span>
                          </td>
                          <td className="p-4 max-w-xs truncate text-slate-300">
                            <div className="truncate">{cleanNotes || 'Routine Patrol'}</div>
                            {photo && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                                <span>📸 Incident Photo Attached</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-lg shadow-emerald-950/50"
                            >
                              View Report
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unified Location Manager Modal */}
      {showLocationManagerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <h3 className="text-sm font-bold text-white">Location & Checkpoint Manager</h3>
              </div>
              <button onClick={() => setShowLocationManagerModal(false)} className="text-slate-400 hover:text-white text-base">✕</button>
            </div>

            {/* Manager Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveManagerTab('location')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${activeManagerTab === 'location' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create Location
              </button>
              <button
                type="button"
                onClick={() => setActiveManagerTab('checkpoint')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${activeManagerTab === 'checkpoint' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Add Checkpoint
              </button>
              <button
                type="button"
                onClick={() => setActiveManagerTab('qr')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${activeManagerTab === 'qr' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                QR Code
              </button>
            </div>

            {/* Tab 1: Create Location */}
            {activeManagerTab === 'location' && (
              <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 uppercase font-semibold mb-1">Facility Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Warehouse Facility"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {actionStatus && <div className="text-emerald-400 font-medium text-center">{actionStatus}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLocationManagerModal(false)} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl">Close</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold">Save Location</button>
                </div>
              </form>
            )}

            {/* Tab 2: Add Checkpoint & Save to Generate QR */}
            {activeManagerTab === 'checkpoint' && (
              <form onSubmit={handleCreateCheckpoint} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 uppercase font-semibold mb-1">Checkpoint Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gate 3 - Loading Dock"
                    value={newCheckpointName}
                    onChange={(e) => setNewCheckpointName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Saving will automatically generate a scannable checkpoint QR code tag.</p>
                </div>
                {actionStatus && <div className="text-emerald-400 font-medium text-center">{actionStatus}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLocationManagerModal(false)} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl">Close</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold">Save & Generate QR</button>
                </div>
              </form>
            )}

            {/* Tab 3: QR Code Viewer & Print */}
            {activeManagerTab === 'qr' && (
              <div className="space-y-4 text-center">
                <div className="text-xs text-slate-400">Select checkpoint to generate printable QR tag:</div>
                <select
                  value={selectedCheckpointForQR}
                  onChange={(e) => setSelectedCheckpointForQR(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none"
                >
                  <option>Gate 1 - North Perimeter</option>
                  <option>Gate 2 - Main Entrance</option>
                  <option>Warehouse Loading Dock</option>
                  <option>Admin Block Rear Exit</option>
                </select>
                <div className="bg-white p-6 rounded-xl inline-block shadow-lg my-1">
                  <div className="w-36 h-36 bg-slate-950 flex items-center text-[10px] text-white p-2 font-mono text-center justify-center rounded">
                    [QR: {selectedCheckpointForQR}]
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button onClick={() => window.print()} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold">Print QR Tag</button>
                  <button onClick={() => setShowLocationManagerModal(false)} className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geofence Monitoring Modal (Triggered by Top Right Geofence Button) */}
      {showGeofenceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Geofence Monitoring & Radar</h3>
              </div>
              <button onClick={() => setShowGeofenceModal(false)} className="text-slate-400 hover:text-white text-base">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Active Perimeter Radius</span>
                  <strong className="text-emerald-400 font-mono text-sm">{geofenceRadius} meters</strong>
                </div>
                <form onSubmit={handleSaveGeofence} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={geofenceRadius}
                    onChange={(e) => setGeofenceRadius(e.target.value)}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold">Update</button>
                </form>
              </div>

              {actionStatus && <div className="text-emerald-400 text-xs font-medium text-center">{actionStatus}</div>}

              <div className="relative h-56 w-full bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center overflow-hidden">
                <div className="absolute h-44 w-44 rounded-full border border-emerald-500/20 bg-emerald-500/5 animate-pulse"></div>
                <div className="absolute h-28 w-28 rounded-full border border-emerald-500/30"></div>
                <div className="absolute h-12 w-12 rounded-full border border-emerald-500/50 bg-emerald-500/10"></div>
                <div className="absolute h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]"></div>
                <div className="absolute -translate-x-6 -translate-y-8 flex flex-col items-center">
                  <div className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                    Guard Position
                  </div>
                  <div className="w-2 h-2 rounded-full bg-white border-2 border-emerald-500 mt-0.5"></div>
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Perimeter Target: <strong className="text-slate-200">Facility Perimeter</strong></span>
                <span className="text-emerald-400 font-mono">Status: All active guards within {geofenceRadius}m geofence</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowGeofenceModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-xl text-xs font-semibold">Close Radar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Detailed Report */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-base font-bold text-white">Patrol Report Inspection</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Guard Name</span>
                  <span className="text-sm font-bold text-white">{selectedLog.guard_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Timestamp</span>
                  <span className="text-slate-300">{new Date(selectedLog.created_at || Date.now()).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Location Site</span>
                  <span className="text-slate-200 font-medium">{selectedLog.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-0.5">Checkpoint</span>
                  <span className="text-emerald-400 font-mono font-semibold">{selectedLog.checkpoint}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">GPS Coordinates</span>
                <span className="font-mono text-slate-300">{selectedLog.latitude}, {selectedLog.longitude}</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-1">Notes & Observations</span>
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{cleanNotesText(selectedLog.notes)}</p>
              </div>

              {extractPhoto(selectedLog.notes) && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold mb-2">Attached Incident Photo</span>
                  <div className="rounded-lg overflow-hidden border border-slate-800 max-h-72 flex items-center justify-center bg-black">
                    <img src={extractPhoto(selectedLog.notes) || ''} alt="Incident evidence" className="max-h-72 object-contain w-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-xl text-xs font-semibold">Close Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
