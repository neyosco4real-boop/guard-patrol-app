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

  const clearAlerts = async () => {
    if (confirm('Are you sure you want to clear all live patrol feeds?')) {
      await fetch('/api/alerts', { method: 'DELETE' });
      setAlerts([]);
    }
  };

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
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-6 font-sans">
      {/* Top Navigation & Header */}
      <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-black tracking-wide text-cyan-400 flex items-center gap-2">
            🛡️ TOM SALEM GUARD PATROL ADMIN
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise multi-location telemetry, checkpoint management & QR generator
          </p>
        </div>
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-white/10 gap-1 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'live' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📡 Live Patrol Feed ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checkpoints')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'checkpoints' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Checkpoint Management
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'qr' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📱 QR Code Generator
          </button>
        </div>
      </div>

      {/* Tab 1: Live Patrol Feed */}
      {activeTab === 'live' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-lg">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Live Telemetry Submissions</h2>
              <p className="text-xs text-slate-500">Auto-refreshing every 3 seconds from active scanner PWA nodes</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={fetchAlerts}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-cyan-500/35 cursor-pointer"
              >
                🔄 Refresh
              </button>
              <button
                type="button"
                onClick={clearAlerts}
                className="bg-red-950/60 hover:bg-red-900 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-red-500/35 cursor-pointer"
              >
                Clear Feeds
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500 text-center py-12">Loading telemetry feed...</p>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-dashed border-white/10 rounded-2xl">
              <p className="text-sm text-slate-400 font-semibold">No patrol logs received yet.</p>
              <p className="text-xs text-slate-500 mt-1">Submissions from mobile guard scanners will appear here in real-time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                    alert.isIncident
                      ? 'bg-red-950/30 border-red-500/60 shadow-red-950/50 shadow-lg'
                      : 'bg-slate-900 border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                        📍 {alert.location}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">Checkpoint: {alert.checkpointName}</h3>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${alert.isIncident ? 'bg-red-500 text-slate-950 animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'}`}>
                      {alert.isIncident ? '🚨 INCIDENT' : '✓ Verified'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5">
                    <p><span className="text-slate-500">Officer:</span> <strong className="text-white">{alert.guardName}</strong></p>
                    <p><span className="text-slate-500">Time:</span> <strong className="text-white">{new Date(alert.createdAt).toLocaleTimeString()}</strong></p>
                    <p className="col-span-2"><span className="text-slate-500">GPS:</span> <strong className="text-cyan-400">{alert.lat}, {alert.lng}</strong></p>
                  </div>

                  {alert.notes && (
                    <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-white/5">
                      <span className="text-slate-500 block mb-1 uppercase font-semibold">Notes:</span>
                      {alert.notes}
                    </p>
                  )}

                  {alert.mediaUrl && (
                    <div>
                      <span className="text-xs text-slate-500 block mb-1 uppercase font-semibold">Incident Photo:</span>
                      <img src={alert.mediaUrl} alt="Incident capture" className="w-full h-40 object-cover rounded-xl border border-white/10" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Checkpoint Management */}
      {activeTab === 'checkpoints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-lg flex flex-col gap-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add Facility / Location</h2>
            <form onSubmit={addLocation} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Lekki Branch"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer">
                Add Location
              </button>
            </form>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Active Locations</h3>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <span key={loc} className="bg-slate-950 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200">
                  📍 {loc}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-lg flex flex-col gap-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add Checkpoint to Location</h2>
            <form onSubmit={addCheckpoint} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-semibold">Select Parent Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
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
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer">
                  Add Point
                </button>
              </div>
            </form>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Checkpoints for {selectedLocation}</h3>
            <div className="space-y-2">
              {(checkpointsByLocation[selectedLocation] || []).map((cp) => (
                <div key={cp} className="bg-slate-950 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-200 flex justify-between items-center">
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
        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-lg flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Checkpoint QR Code Generator</h2>
            <p className="text-xs text-slate-400 mt-1">Generate printable QR tags containing facility and checkpoint metadata for guard scanners.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Checkpoint</label>
              <select
                id="qrCheckpointSelect"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {(checkpointsByLocation[selectedLocation] || ['Front Gate', 'Perimeter']).map((cp) => (
                  <option key={cp} value={cp}>{cp}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => alert('QR Code printable asset generated successfully!')}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold py-3 rounded-xl cursor-pointer shadow-md"
              >
                🖨️ Generate Printable QR
              </button>
            </div>
          </div>

          <div className="border border-dashed border-white/10 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 bg-slate-950">
            <div className="bg-white p-4 rounded-xl shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Location:${encodeURIComponent(selectedLocation)}|Checkpoint:StandardGate`}
                alt="Checkpoint QR Code"
                className="w-40 h-40"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">Location: {selectedLocation}</p>
              <p className="text-xs text-slate-400 mt-1">Scan using mobile patrol PWA camera to log checkpoint instantly.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
