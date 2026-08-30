'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CheckpointsPage() {
  const [locations, setLocations] = useState<any[]>([
    {
      id: '1',
      name: 'Chicken Republic',
      address: 'Nigeria',
      checkpoints: [{ id: 'c1', name: 'CR Awolowo Rd' }]
    },
    {
      id: '2',
      name: 'Multichoice',
      address: 'Victoria Island',
      checkpoints: [{ id: 'c2', name: 'Swimming Pool' }]
    },
    {
      id: '3',
      name: 'Tom Salem Head Office',
      address: 'No address specified.',
      checkpoints: [{ id: 'c3', name: 'Front Gate' }]
    }
  ]);

  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [showAddCheckpointModal, setShowAddCheckpointModal] = useState(false);

  // Export & Report State
  const [selectedExportLocation, setSelectedExportLocation] = useState('all');
  const [htmlReportData, setHtmlReportData] = useState<any[] | null>(null);
  const [showHtmlModal, setShowHtmlModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tom_salem_locations');
    if (saved) {
      try {
        setLocations(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveLocations = (updated: any[]) => {
    setLocations(updated);
    localStorage.setItem('tom_salem_locations', JSON.stringify(updated));
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    const newLoc = {
      id: Date.now().toString(),
      name: newLocationName.trim(),
      address: newLocationAddress.trim() || 'No address specified.',
      checkpoints: []
    };
    saveLocations([...locations, newLoc]);
    setNewLocationName('');
    setNewLocationAddress('');
    setShowAddLocationModal(false);
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('Are you sure you want to delete this location site?')) {
      saveLocations(locations.filter(loc => loc.id !== id));
    }
  };

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim() || !activeLocationId) return;
    const updated = locations.map(loc => {
      if (loc.id === activeLocationId) {
        return {
          ...loc,
          checkpoints: [...loc.checkpoints, { id: Date.now().toString(), name: newCheckpointName.trim() }]
        };
      }
      return loc;
    });
    saveLocations(updated);
    setNewCheckpointName('');
    setShowAddCheckpointModal(false);
    setActiveLocationId(null);
  };

  const handleDeleteCheckpoint = (locId: string, cpId: string) => {
    const updated = locations.map(loc => {
      if (loc.id === locId) {
        return {
          ...loc,
          checkpoints: loc.checkpoints.filter((cp: any) => cp.id !== cpId)
        };
      }
      return loc;
    });
    saveLocations(updated);
  };

  const getFilteredAlerts = () => {
    const cached = localStorage.getItem('tom_salem_patrol_alerts');
    let alerts = [];
    if (cached) {
      try {
        alerts = JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }

    if (selectedExportLocation === 'all') {
      return alerts;
    }

    return alerts.filter((alert: any) => {
      const locName = alert.location || 'Tom Salem Head Office';
      return locName.toLowerCase() === selectedExportLocation.toLowerCase();
    });
  };

  const handleDownloadCSV = () => {
    const alerts = getFilteredAlerts();
    if (alerts.length === 0) {
      alert('No patrol logs found for the selected location.');
      return;
    }

    const headers = ['Date/Time', 'Guard Name', 'Location', 'Checkpoint', 'GPS Coordinates', 'Report Attached', 'Status', 'Notes'];
    const rows = alerts.map((a: any) => [
      `"${new Date(a.createdAt).toLocaleString()}"`,
      `"${a.guardName || 'Officer'}"`,
      `"${a.location || 'Tom Salem Head Office'}"`,
      `"${a.checkpointName || 'Unknown'}"`,
      `"${Number(a.lat).toFixed(5)}, ${Number(a.lng).toFixed(5)}"`,
      `"${a.mediaUrl ? 'Yes' : 'None'}"`,
      `"${a.isIncident ? 'Incident' : 'Normal'}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `patrol_report_${selectedExportLocation.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewHTML = () => {
    const alerts = getFilteredAlerts();
    setHtmlReportData(alerts);
    setShowHtmlModal(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Bar */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full mb-2">
            <span>● Site Management & Certified Report Exports</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Checkpoint & Location Command</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage physical locations, site geofences, checkpoints, generate QR codes, and view certified patrol report HTML summaries instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddLocationModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md"
          >
            + Create Location
          </button>
          <Link
            href="/admin/qr-codes"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer border border-white/10 transition-all"
          >
            QR Generator
          </Link>
          <Link
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer border border-white/10 transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Registered Location Sites */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Registered Location Sites ({locations.length})</h2>
          <button
            onClick={() => setShowAddLocationModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 cursor-pointer"
          >
            + Add Location Site
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-slate-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-cyan-300">🏢 {loc.name}</h3>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-950/40 rounded-lg border border-red-500/30 cursor-pointer"
                  >
                    Delete Site
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">{loc.address}</p>
              </div>

              <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Checkpoints ({loc.checkpoints.length})
                </span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {loc.checkpoints.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">No checkpoints added yet.</span>
                  ) : (
                    loc.checkpoints.map((cp: any) => (
                      <div key={cp.id} className="bg-slate-950 border border-white/10 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">📍 {cp.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/qr-codes?location=${encodeURIComponent(loc.name)}&checkpoint=${encodeURIComponent(cp.name)}`}
                            className="bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-bold hover:bg-cyan-900"
                          >
                            QR
                          </Link>
                          <button
                            onClick={() => handleDeleteCheckpoint(loc.id, cp.id)}
                            className="text-red-400 hover:text-red-300 font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveLocationId(loc.id);
                  setShowAddCheckpointModal(true);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold py-2 rounded-xl text-xs uppercase cursor-pointer border border-white/10 transition-all"
              >
                + Add Checkpoint
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Patrol Reports & Incident Exports */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Patrol Reports & Incident Exports</h2>
            <p className="text-xs text-slate-400 mt-1">Select a specific location site to filter and view certified reports.</p>
          </div>
          <select
            value={selectedExportLocation}
            onChange={(e) => setSelectedExportLocation(e.target.value)}
            className="bg-slate-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs px-4 py-2.5 rounded-xl focus:outline-none cursor-pointer"
          >
            <option value="all">🌍 All Locations (Global Report)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                🏢 {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleDownloadCSV}
            className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold py-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
          >
            📊 Download Excel (CSV) for Selected Location
          </button>
          <button
            onClick={handleViewHTML}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            🌐 View HTML Report for Selected Location
          </button>
        </div>
      </div>

      {/* Add Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLocation} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Create New Location Site</h3>
              <button
                type="button"
                onClick={() => setShowAddLocationModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Site Name</label>
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g. Sterling Bank Branch"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Address / Region</label>
              <input
                type="text"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                placeholder="e.g. Marina, Lagos"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl uppercase text-xs tracking-wider cursor-pointer"
            >
              Save Location Site
            </button>
          </form>
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {showAddCheckpointModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleAddCheckpoint} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Add Checkpoint to Location</h3>
              <button
                type="button"
                onClick={() => setShowAddCheckpointModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Checkpoint Name</label>
              <input
                type="text"
                value={newCheckpointName}
                onChange={(e) => setNewCheckpointName(e.target.value)}
                placeholder="e.g. Vault Room / Server Room"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl uppercase text-xs tracking-wider cursor-pointer"
            >
              Save Checkpoint
            </button>
          </form>
        </div>
      )}

      {/* HTML Report View Modal */}
      {showHtmlModal && htmlReportData && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col gap-4 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Certified HTML Patrol Report</h3>
                <p className="text-xs text-slate-400">Filter: {selectedExportLocation === 'all' ? 'All Locations (Global Report)' : selectedExportLocation}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  onClick={() => setShowHtmlModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              <div className="bg-slate-950 border border-white/10 p-4 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block text-sm">Tom Salem Security Operations</span>
                  <span className="text-slate-400">Automated Telemetry Audit Report</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Generated On:</span>
                  <span className="font-mono text-cyan-400">{new Date().toLocaleString()}</span>
                </div>
              </div>

              {htmlReportData.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No patrol logs recorded for this selection.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date/Time</th>
                      <th className="py-2.5 px-3">Guard</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Checkpoint</th>
                      <th className="py-2.5 px-3">GPS</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {htmlReportData.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{item.guardName}</td>
                        <td className="py-2.5 px-3 text-slate-300">{item.location || 'Tom Salem Head Office'}</td>
                        <td className="py-2.5 px-3 text-cyan-300 font-medium">{item.checkpointName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${item.isIncident ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                            {item.isIncident ? 'Incident' : 'Normal'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
