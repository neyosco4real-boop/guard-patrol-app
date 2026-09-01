'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

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

interface LocationItem {
  name: string;
  checkpoints: string[];
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGuard, setFilterGuard] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [selectedLog, setSelectedLog] = useState<PatrolLog | null>(null);

  // Modal states for Manager
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [selectedLocForCp, setSelectedLocForCp] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [managerMsg, setManagerMsg] = useState('');

  // QR Modal states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedCpForQr, setSelectedCpForQr] = useState('');
  const [selectedLocForQr, setSelectedLocForQr] = useState('');

  // Reset confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('patrol_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!logsError && logsData) {
        setLogs(logsData);
      }

      const { data: locsData, error: locsError } = await supabase
        .from('locations')
        .select('*');

      if (!locsError && locsData && locsData.length > 0) {
        // Filter out duplicate or junk locations like repetitive 'Multichoice' if needed, or map clean unique list
        const map = new Map<string, string[]>();
        locsData.forEach((item: any) => {
          const locName = (item.name || item.location_name || '').trim();
          if (!locName) return;
          let cps: string[] = [];
          if (Array.isArray(item.checkpoints)) {
            cps = item.checkpoints;
          } else if (typeof item.checkpoints === 'string') {
            try { cps = JSON.parse(item.checkpoints); } catch (e) { cps = [item.checkpoints]; }
          }
          if (!map.has(locName)) {
            map.set(locName, Array.from(new Set(cps)));
          } else {
            const existing = map.get(locName)!;
            map.set(locName, Array.from(new Set([...existing, ...cps])));
          }
        });

        const formatted: LocationItem[] = Array.from(map.entries()).map(([name, checkpoints]) => ({
          name,
          checkpoints: checkpoints.length > 0 ? checkpoints : ['Main Checkpoint']
        }));

        setLocations(formatted);
        localStorage.setItem('security_locations_data', JSON.stringify(formatted));
      } else {
        const saved = localStorage.getItem('security_locations_data');
        if (saved) {
          setLocations(JSON.parse(saved));
        } else {
          const defaultLocs = [
            { name: 'Tom Salem Head Office', checkpoints: ['Front Gate', 'Reception Desk', 'Server Room'] },
            { name: 'Client Facility Site', checkpoints: ['Gate Entrance', 'Perimeter Fence'] }
          ];
          setLocations(defaultLocs);
          localStorage.setItem('security_locations_data', JSON.stringify(defaultLocs));
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const locClean = newLocName.trim();
    const existing = locations.find(l => l.name.toLowerCase() === locClean.toLowerCase());
    if (existing) {
      setManagerMsg('Location already exists.');
      return;
    }

    const updated = [...locations, { name: locClean, checkpoints: ['Main Checkpoint'] }];
    setLocations(updated);
    localStorage.setItem('security_locations_data', JSON.stringify(updated));

    try {
      await supabase.from('locations').upsert({
        name: locClean,
        checkpoints: ['Main Checkpoint']
      }, { onConflict: 'name' });
    } catch (err) {
      console.error('Supabase location sync error:', err);
    }

    setManagerMsg(`✓ Location "${locClean}" created successfully!`);
    setNewLocName('');
    setTimeout(() => setManagerMsg(''), 3000);
    fetchData();
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocForCp || !newCpName.trim()) {
      setManagerMsg('Please select location and enter checkpoint name.');
      return;
    }

    const cpClean = newCpName.trim();
    const updated = locations.map(loc => {
      if (loc.name === selectedLocForCp) {
        if (!loc.checkpoints.includes(cpClean)) {
          return { ...loc, checkpoints: [...loc.checkpoints, cpClean] };
        }
      }
      return loc;
    });

    setLocations(updated);
    localStorage.setItem('security_locations_data', JSON.stringify(updated));

    try {
      const target = updated.find(l => l.name === selectedLocForCp);
      if (target) {
        await supabase.from('locations').upsert({
          name: target.name,
          checkpoints: target.checkpoints
        }, { onConflict: 'name' });
      }
    } catch (err) {
      console.error('Supabase checkpoint sync error:', err);
    }

    setManagerMsg(`✓ Checkpoint "${cpClean}" added to ${selectedLocForCp}!`);
    setNewCpName('');
    setTimeout(() => setManagerMsg(''), 3000);
    fetchData();
  };

  const handleDeleteLocation = async (locName: string) => {
    if (!confirm(`Are you sure you want to delete location "${locName}" and all its checkpoints?`)) return;

    const updated = locations.filter(l => l.name !== locName);
    setLocations(updated);
    localStorage.setItem('security_locations_data', JSON.stringify(updated));

    try {
      await supabase.from('locations').delete().eq('name', locName);
    } catch (err) {
      console.error('Error deleting location from Supabase:', err);
    }

    setManagerMsg(`✓ Location "${locName}" deleted.`);
    setTimeout(() => setManagerMsg(''), 3000);
    fetchData();
  };

  const handleDeleteCheckpoint = async (locName: string, cpName: string) => {
    if (!confirm(`Are you sure you want to delete checkpoint "${cpName}" from "${locName}"?`)) return;

    const updated = locations.map(loc => {
      if (loc.name === locName) {
        return { ...loc, checkpoints: loc.checkpoints.filter(cp => cp !== cpName) };
      }
      return loc;
    }).filter(loc => loc.checkpoints.length > 0);

    setLocations(updated);
    localStorage.setItem('security_locations_data', JSON.stringify(updated));

    try {
      const target = updated.find(l => l.name === locName);
      if (target) {
        await supabase.from('locations').upsert({
          name: target.name,
          checkpoints: target.checkpoints
        }, { onConflict: 'name' });
      } else {
        await supabase.from('locations').delete().eq('name', locName);
      }
    } catch (err) {
      console.error('Error deleting checkpoint from Supabase:', err);
    }

    setManagerMsg(`✓ Checkpoint "${cpName}" deleted.`);
    setTimeout(() => setManagerMsg(''), 3000);
    fetchData();
  };

  const handleCleanJunkLocations = async () => {
    // Remove duplicate/blurry entries like repetitive Multichoice or empty ones
    const cleanMap = new Map<string, string[]>();
    locations.forEach(loc => {
      const cleanName = loc.name.trim();
      if (!cleanName || cleanName.toLowerCase() === 'multichoice' && cleanMap.has('Multichoice')) {
        return;
      }
      cleanMap.set(cleanName, loc.checkpoints);
    });

    const cleanedList: LocationItem[] = Array.from(cleanMap.entries()).map(([name, checkpoints]) => ({
      name,
      checkpoints
    }));

    setLocations(cleanedList);
    localStorage.setItem('security_locations_data', JSON.stringify(cleanedList));

    try {
      // Clear and re-sync
      await supabase.from('locations').delete().neq('name', 'NONEXISTENT');
      for (const loc of cleanedList) {
        await supabase.from('locations').upsert({
          name: loc.name,
          checkpoints: loc.checkpoints
        }, { onConflict: 'name' });
      }
    } catch (err) {
      console.error('Error cleaning locations:', err);
    }

    alert('Duplicate and blurry locations cleaned successfully!');
    fetchData();
  };

  const handleFullReset = async () => {
    if (resetPassword !== 'ADMINRESET') {
      alert('Incorrect master reset code. Enter ADMINRESET to confirm.');
      return;
    }

    try {
      await supabase.from('patrol_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('locations').delete().neq('name', 'NONEXISTENT');

      localStorage.removeItem('security_locations_data');

      setLogs([]);
      setLocations([
        { name: 'Tom Salem Head Office', checkpoints: ['Front Gate', 'Reception Desk'] }
      ]);
      setIsResetConfirmOpen(false);
      setResetPassword('');
      alert('System successfully wiped and reset to factory default!');
      fetchData();
    } catch (err) {
      console.error('Reset error:', err);
      alert('Error resetting system.');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchGuard = filterGuard === '' || log.guard_name.toLowerCase().includes(filterGuard.toLowerCase());
    const matchLoc = filterLocation === '' || log.location.toLowerCase().includes(filterLocation.toLowerCase());
    return matchGuard && matchLoc;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Live Patrol Command</h1>
              <p className="text-xs text-slate-400">Real-time guard patrol monitoring, telemetry, and QR management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsManagerOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <span>🏢</span> Location & Checkpoint Manager
            </button>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <span>🖨️</span> Generate & Print QR Tags
            </button>
            <button
              onClick={handleCleanJunkLocations}
              className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <span>🧹</span> Clean Blurry Locations
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <span>⚠️</span> Full System Reset
            </button>
            <button
              onClick={fetchData}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <span>🔄</span> Refresh Feed
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Filter by Guard Name</label>
            <input
              type="text"
              placeholder="Search guard..."
              value={filterGuard}
              onChange={(e) => setFilterGuard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Filter by Location</label>
            <input
              type="text"
              placeholder="Search location..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-end justify-end">
            <div className="text-xs text-slate-400 font-medium pb-2">
              Showing <span className="text-emerald-400 font-bold">{filteredLogs.length}</span> verified patrol logs
            </div>
          </div>
        </div>

        {/* Live Logs Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">Timestamp</th>
                  <th className="p-4 font-semibold">Guard Name</th>
                  <th className="p-4 font-semibold">Location / Checkpoint</th>
                  <th className="p-4 font-semibold">GPS / Geofence</th>
                  <th className="p-4 font-semibold">Incident / Notes</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">Loading patrol feeds...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">No patrol logs found matching criteria.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-4 text-slate-300 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-white whitespace-nowrap">
                        {log.guard_name}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-emerald-400">{log.location}</div>
                        <div className="text-[11px] text-slate-400">{log.checkpoint}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-300 whitespace-nowrap">
                        <div>{log.latitude}, {log.longitude}</div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">50m Active</span>
                      </td>
                      <td className="p-4 max-w-xs truncate text-slate-300">
                        {log.notes || 'Routine check'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-xl font-semibold transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Location & Checkpoint Manager Modal */}
      {isManagerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏢</span> Location & Checkpoint Manager
              </h2>
              <button onClick={() => setIsManagerOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            {managerMsg && (
              <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl text-center text-xs font-semibold">
                {managerMsg}
              </div>
            )}

            {/* Create Location Form */}
            <form onSubmit={handleCreateLocation} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="block text-[10px] text-slate-400 uppercase font-semibold">Create New Location Site</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Tom Salem Head Office"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                  Create
                </button>
              </div>
            </form>

            {/* Add Checkpoint Form */}
            <form onSubmit={handleAddCheckpoint} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <label className="block text-[10px] text-slate-400 uppercase font-semibold">Add Checkpoint to Location</label>
              <div className="space-y-2">
                <select
                  value={selectedLocForCp}
                  onChange={(e) => setSelectedLocForCp(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Select facility location...</option>
                  {locations.map((loc, idx) => (
                    <option key={idx} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Front Gate"
                    value={newCpName}
                    onChange={(e) => setNewCpName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                    Add Checkpoint
                  </button>
                </div>
              </div>
            </form>

            {/* Existing List Overview with Deletion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] text-slate-400 uppercase font-semibold">Active Locations & Checkpoints</label>
                <button
                  type="button"
                  onClick={handleCleanJunkLocations}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
                >
                  Clean Duplicates / Blurry
                </button>
              </div>

              {locations.map((loc, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>🏢 {loc.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.name)}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900"
                    >
                      Delete Location
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {loc.checkpoints.map((cp, cpidx) => (
                      <span key={cpidx} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 flex items-center gap-1.5">
                        {cp}
                        <button
                          type="button"
                          onClick={() => handleDeleteCheckpoint(loc.name, cp)}
                          className="text-slate-500 hover:text-rose-400 font-bold ml-1"
                          title="Delete Checkpoint"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setIsManagerOpen(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-semibold">
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-center">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🖨️</span> Printable Security QR Tag Generator
              </h2>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] text-slate-400 uppercase font-semibold text-left">Select Checkpoint to Generate QR Tag</label>
              <select
                value={selectedCpForQr}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCpForQr(val);
                  for (const loc of locations) {
                    if (loc.checkpoints.includes(val)) {
                      setSelectedLocForQr(loc.name);
                      break;
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Select checkpoint...</option>
                {locations.map((loc, idx) => (
                  <optgroup key={idx} label={loc.name}>
                    {loc.checkpoints.map((cp, cpidx) => (
                      <option key={cpidx} value={cp}>{loc.name} → {cp}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Printable QR Tag Card */}
            <div id="printable-qr-tag" className="bg-white text-slate-950 p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-3 border-4 border-slate-950">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-700">Security Checkpoint • Verified Site</div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                {selectedCpForQr ? (
                  <QRCodeSVG
                    value={JSON.stringify({ location: selectedLocForQr || 'Headquarters', checkpoint: selectedCpForQr })}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-[180px] h-[180px] bg-slate-100 flex items-center justify-center text-xs text-slate-400 text-center p-4">
                    Select a checkpoint above to generate QR code
                  </div>
                )}
              </div>
              <div className="font-bold text-sm tracking-tight text-slate-900">{selectedCpForQr || 'Select Checkpoint'}</div>
              <div className="text-[10px] text-slate-500 font-mono">Scan with active mobile guard scanner</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={!selectedCpForQr}
                onClick={() => {
                  const printContent = document.getElementById('printable-qr-tag')?.innerHTML;
                  const win = window.open('', '', 'height=600,width=600');
                  win?.document.write(`<html><head><title>Print QR Tag</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}</style></head><body>${printContent}</body></html>`);
                  win?.document.close();
                  win?.focus();
                  win?.print();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow"
              >
                Print QR Tag
              </button>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full System Reset Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-xl text-rose-400 mx-auto">
              ⚠️
            </div>
            <h2 className="text-base font-bold text-white">Full System Factory Reset</h2>
            <p className="text-xs text-slate-400">
              This action will permanently delete all patrol logs, locations, and checkpoints. Type <span className="text-rose-400 font-mono font-bold">ADMINRESET</span> below to confirm.
            </p>
            <input
              type="text"
              placeholder="Type ADMINRESET..."
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center text-rose-400 font-mono focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleFullReset}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => { setIsResetConfirmOpen(false); setResetPassword(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Patrol Log Verification Details</h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Guard Name</div>
                <div className="font-bold text-white text-sm">{selectedLog.guard_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Location Site</div>
                  <div className="font-semibold text-emerald-400">{selectedLog.location}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Checkpoint</div>
                  <div className="font-semibold text-white">{selectedLog.checkpoint}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Timestamp & GPS Telemetry</div>
                <div className="font-mono text-slate-300">Time: {new Date(selectedLog.created_at).toLocaleString()}</div>
                <div className="font-mono text-emerald-400">GPS: {selectedLog.latitude}, {selectedLog.longitude} (50m Geofence Active)</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Incident Report & Notes</div>
                <div className="text-slate-300 whitespace-pre-wrap">
                  {selectedLog.notes && selectedLog.notes.includes('[PHOTO_DATA:') 
                    ? selectedLog.notes.split('[PHOTO_DATA:')[0] 
                    : (selectedLog.notes || 'Routine check')}
                </div>
              </div>

              {selectedLog.notes && selectedLog.notes.includes('[PHOTO_DATA:') && (
                <div className="space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Attached Incident Photo Evidence</div>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <img 
                      src={selectedLog.notes.split('[PHOTO_DATA:')[1]?.split(']')[0]} 
                      alt="Incident Evidence" 
                      className="w-full h-auto max-h-60 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
