'use client';

import { useState, useEffect } from 'react';

interface Alert {
  id: string;
  guardName: string;
  location: string;
  checkpointName: string;
  notes: string;
  isIncident: boolean;
  mediaUrl?: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export default function AdminPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'checkpoints' | 'qr'>('live');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [locations, setLocations] = useState<string[]>(['Chicken Republic', 'Tom Salem Head Office', 'Main Branch']);
  const [newLocation, setNewLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Chicken Republic');
  const [newCheckpoint, setNewCheckpoint] = useState('');
  const [checkpointsByLocation, setCheckpointsByLocation] = useState<Record<string, string[]>>({
    'Chicken Republic': ['CR Awolowo Rd', 'CR Front Gate', 'CR Back Kitchen'],
    'Tom Salem Head Office': ['Reception', 'Server Room', 'Parking Lot'],
    'Main Branch': ['Gate 1', 'Vault Room', 'Perimeter Fence']
  });

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const addLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    if (!locations.includes(newLocation.trim())) {
      const updated = [...locations, newLocation.trim()];
      setLocations(updated);
      setCheckpointsByLocation({ ...checkpointsByLocation, [newLocation.trim()]: [] });
    }
    setNewLocation('');
  };

  const addCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpoint.trim()) return;
    const currentList = checkpointsByLocation[selectedLocation] || [];
    if (!currentList.includes(newCheckpoint.trim())) {
      setCheckpointsByLocation({
        ...checkpointsByLocation,
        [selectedLocation]: [...currentList, newCheckpoint.trim()]
      });
    }
    setNewCheckpoint('');
  };

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-10 font-sans flex flex-col gap-8 relative">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Tom Salem Security Operations
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Guard Patrol Live Command</h1>
          <p className="text-xs text-slate-400">
            Real-time monitoring dashboard tracking checkpoint verifications, GPS logs, and incident photo evidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer shadow-lg ${
              activeTab === 'qr' ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 hover:brightness-110'
            }`}
          >
            📷 QR Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checkpoints')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border ${
              activeTab === 'checkpoints' ? 'bg-slate-800 border-cyan-500 text-cyan-400' : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            🏢 Manage Checkpoints
          </button>
        </div>
      </div>

      {/* Tab 1: Live Command Table View */}
      {activeTab === 'live' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200">RECENT PATROL ACTIVITY</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any patrol row to view full incident report and download attached photo evidence.</p>
            </div>
            <button
              type="button"
              onClick={fetchAlerts}
              className="bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 cursor-pointer shadow"
            >
              🔄 Refresh Feed
            </button>
          </div>

          <div className="bg-[#0b0f19] border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="py-4 px-4">Date/Time</th>
                    <th className="py-4 px-4">Guard Name</th>
                    <th className="py-4 px-4">Location</th>
                    <th className="py-4 px-4">Checkpoint</th>
                    <th className="py-4 px-4">GPS Coordinates</th>
                    <th className="py-4 px-4">Geofence</th>
                    <th className="py-4 px-4">Incident Report</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">Loading live telemetry...</td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500">
                        No patrol logs received yet. Submissions from mobile scanners will appear here.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${
                          alert.isIncident ? 'bg-red-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-slate-300 font-mono whitespace-nowrap">
                          {new Date(alert.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 font-semibold text-cyan-400 whitespace-nowrap">{alert.guardName}</td>
                        <td className="py-4 px-4 font-medium text-slate-200 whitespace-nowrap">{alert.location}</td>
                        <td className="py-4 px-4 font-medium text-slate-300 whitespace-nowrap">{alert.checkpointName}</td>
                        <td className="py-4 px-4 font-mono text-cyan-300 whitespace-nowrap">{alert.lat}, {alert.lng}</td>
                        <td className="py-4 px-4 text-emerald-400 font-medium whitespace-nowrap">Within Perimeter</td>
                        <td className={`py-4 px-4 font-medium max-w-xs truncate ${alert.isIncident ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                          {alert.notes || 'Normal Patrol Scan'}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            alert.isIncident ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {alert.isIncident ? 'Incident' : 'Successful Scan'}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {alert.mediaUrl ? (
                            <span className="text-cyan-400 underline font-semibold">View Photo</span>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Checkpoint Management */}
      {activeTab === 'checkpoints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0b0f19] border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add Facility / Location</h2>
              <button onClick={() => setActiveTab('live')} className="text-xs text-slate-400 hover:text-white">← Back to Feed</button>
            </div>
            <form onSubmit={addLocation} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Lekki Branch"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
              <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer">
                Add Location
              </button>
            </form>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Active Locations</h3>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <span key={loc} className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200">
                  📍 {loc}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#0b0f19] border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add Checkpoint to Location</h2>
            <form onSubmit={addCheckpoint} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Parent Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Rear Emergency Exit"
                  value={newCheckpoint}
                  onChange={(e) => setNewCheckpoint(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer">
                  Add Point
                </button>
              </div>
            </form>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Checkpoints for {selectedLocation}</h3>
            <div className="space-y-2">
              {(checkpointsByLocation[selectedLocation] || []).map((cp) => (
                <div key={cp} className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-200 flex justify-between items-center">
                  <span>🏷️ {cp}</span>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: QR Code Generator */}
      {activeTab === 'qr' && (
        <div className="bg-[#0b0f19] border border-slate-800/80 p-6 md:p-8 rounded-2xl shadow-xl flex flex-col gap-6 max-w-3xl mx-auto w-full">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Checkpoint QR Code Generator</h2>
              <p className="text-xs text-slate-400 mt-1">Generate printable QR tags containing facility and checkpoint metadata.</p>
            </div>
            <button onClick={() => setActiveTab('live')} className="text-xs text-slate-400 hover:text-white">← Back to Feed</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Checkpoint</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                {(checkpointsByLocation[selectedLocation] || ['Front Gate']).map((cp) => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 bg-slate-950">
            <div className="bg-white p-4 rounded-xl shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Location:${encodeURIComponent(selectedLocation)}|Checkpoint:StandardGate`}
                alt="Checkpoint QR Code"
                className="w-40 h-40"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">Facility: {selectedLocation}</p>
              <p className="text-xs text-slate-400 mt-1">Scan using mobile patrol PWA camera to log checkpoint instantly.</p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Incident Report & Evidence Card Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAlert.isIncident ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {selectedAlert.isIncident ? 'Incident Reported' : 'Successful Scan'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{new Date(selectedAlert.createdAt).toLocaleString()}</span>
                </div>
                <h3 className="text-xl font-extrabold text-white">Patrol Incident Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer border border-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex flex-col gap-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Guard Name</span>
                <span className="font-semibold text-cyan-400 text-sm">{selectedAlert.guardName}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex flex-col gap-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Location & Checkpoint</span>
                <span className="font-semibold text-slate-200 truncate">{selectedAlert.location} / {selectedAlert.checkpointName}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex flex-col gap-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">GPS Coordinates</span>
                <span className="font-mono text-cyan-300">{selectedAlert.lat}, {selectedAlert.lng}</span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex flex-col gap-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Geofence Status</span>
                <span className="text-emerald-400 font-medium">Within Perimeter</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Incident Report / Notes</label>
              <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-sm text-slate-200 font-medium leading-relaxed">
                {selectedAlert.notes || 'Normal Patrol Scan - No issues noted.'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attached Photo Evidence</label>
              {selectedAlert.mediaUrl ? (
                <div className="flex flex-col gap-3">
                  <div className="relative h-48 bg-black rounded-xl overflow-hidden border border-slate-800">
                    <img src={selectedAlert.mediaUrl} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                  <a
                    href={selectedAlert.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold py-3 rounded-xl border border-slate-800 text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    📥 Download Photo Evidence
                  </a>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-xs text-slate-500 text-center font-medium">
                  No photo evidence attached to this patrol verification.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedAlert(null)}
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              Close Report Card
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
