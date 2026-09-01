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
  
  const [newLocName, setNewLocName] = useState('');
  const [selectedParentLoc, setSelectedParentLoc] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const [activeQrCp, setActiveQrCp] = useState<{ location: string; checkpoint: string } | null>(null);

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
          checkpoints: checkpoints.length > 0 ? checkpoints : ['Main Gate']
        }));
        setLocations(formatted);
      } else {
        const defaultLocs = [
          { name: 'Headquarters Facility', checkpoints: ['Main Entrance', 'Reception Desk', 'Perimeter Fence North'] }
        ];
        setLocations(defaultLocs);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const locName = newLocName.trim();
    if (locations.some(l => l.name.toLowerCase() === locName.toLowerCase())) {
      setStatusMsg('Location already exists.');
      return;
    }

    const updated = [...locations, { name: locName, checkpoints: ['Main Checkpoint'] }];
    setLocations(updated);

    try {
      await supabase.from('locations').upsert({
        name: locName,
        checkpoints: ['Main Checkpoint']
      }, { onConflict: 'name' });
    } catch (err) {
      console.error('Supabase error:', err);
    }

    setStatusMsg(`✓ Location "${locName}" created successfully!`);
    setNewLocName('');
    setTimeout(() => setStatusMsg(''), 3000);
    fetchData();
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentLoc || !newCpName.trim()) {
      setStatusMsg('Please select a parent location and enter a checkpoint name.');
      return;
    }

    const cpName = newCpName.trim();
    const updated = locations.map(loc => {
      if (loc.name === selectedParentLoc) {
        if (!loc.checkpoints.includes(cpName)) {
          return { ...loc, checkpoints: [...loc.checkpoints, cpName] };
        }
      }
      return loc;
    });

    setLocations(updated);

    try {
      const target = updated.find(l => l.name === selectedParentLoc);
      if (target) {
        await supabase.from('locations').upsert({
          name: target.name,
          checkpoints: target.checkpoints
        }, { onConflict: 'name' });
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }

    setStatusMsg(`✓ Checkpoint "${cpName}" added under ${selectedParentLoc}!`);
    setNewCpName('');
    setTimeout(() => setStatusMsg(''), 3000);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Patrol Command Center</h1>
              <p className="text-xs text-slate-400">Live telemetry monitoring and unified site & checkpoint manager</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow"
          >
            <span>🔄</span> Refresh Live Feed
          </button>
        </div>

        {statusMsg && (
          <div className="p-3.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-2xl text-center text-xs font-semibold">
            {statusMsg}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📡</span> Live Patrol Telemetry Feed
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Total Logs: {logs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Guard Name</th>
                  <th className="p-3 font-semibold">Location</th>
                  <th className="p-3 font-semibold">Checkpoint</th>
                  <th className="p-3 font-semibold">Patrol Type</th>
                  <th className="p-3 font-semibold">GPS & Geofence</th>
                  <th className="p-3 font-semibold">Notes / Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">Loading live telemetry...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">No patrol scans submitted yet.</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    let patrolType = 'Normal Patrol';
                    let cleanNotes = log.notes || '';
                    if (cleanNotes.includes('[PATROL_TYPE:Incident]')) {
                      patrolType = 'Incident Patrol';
                      cleanNotes = cleanNotes.replace('[PATROL_TYPE:Incident]', '');
                    } else if (cleanNotes.includes('[PATROL_TYPE:Normal]')) {
                      cleanNotes = cleanNotes.replace('[PATROL_TYPE:Normal]', '');
                    }

                    const hasPhoto = cleanNotes.includes('[PHOTO_DATA:');
                    let photoUrl = '';
                    if (hasPhoto) {
                      photoUrl = cleanNotes.split('[PHOTO_DATA:')[1]?.split(']')[0] || '';
                      cleanNotes = cleanNotes.split('[PHOTO_DATA:')[0];
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 text-slate-300 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {log.guard_name}
                        </td>
                        <td className="p-3 text-emerald-400 font-semibold">{log.location}</td>
                        <td className="p-3 text-slate-200">{log.checkpoint}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${patrolType === 'Incident Patrol' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                            {patrolType}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                          <div>{log.latitude}, {log.longitude}</div>
                          <span className="text-[9px] text-emerald-400">50m Geofence Active</span>
                        </td>
                        <td className="p-3 max-w-xs text-slate-300 space-y-1">
                          <p className="truncate">{cleanNotes || 'Routine patrol scan'}</p>
                          {hasPhoto && photoUrl && (
                            <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline text-[10px] block">
                              📸 View Evidence Photo
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏢</span> Site Manager Tab (Locations & Checkpoints)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Create and manage parent locations, sub-checkpoints, and printable QR tags</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>➕</span> Add Site / Parent Location
              </h3>
              <form onSubmit={handleCreateLocation} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate Head Office"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow"
                >
                  Create Location Site
                </button>
              </form>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>➕</span> Add Checkpoint (Under Parent Location)
              </h3>
              <form onSubmit={handleCreateCheckpoint} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Select Parent Location</label>
                  <select
                    value={selectedParentLoc}
                    onChange={(e) => setSelectedParentLoc(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Choose parent location...</option>
                    {locations.map((loc, idx) => (
                      <option key={idx} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Checkpoint Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gate Entrance A"
                    value={newCpName}
                    onChange={(e) => setNewCpName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow"
                >
                  Create Checkpoint & Generate QR
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🖨️</span> Active Location Tree & Checkpoint QR Codes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="font-bold text-emerald-400 text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <span>🏢</span> {loc.name}
                  </div>
                  <div className="space-y-2">
                    {loc.checkpoints.map((cp, cpidx) => (
                      <div key={cpidx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-medium">📍 {cp}</span>
                        <button
                          onClick={() => setActiveQrCp({ location: loc.name, checkpoint: cp })}
                          className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          View QR
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {activeQrCp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Checkpoint QR Tag</h3>
              <button onClick={() => setActiveQrCp(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <div id="printable-qr" className="bg-white p-5 rounded-2xl shadow-inner flex flex-col items-center space-y-3">
              <span className="text-[10px] uppercase font-black text-emerald-700">{activeQrCp.location}</span>
              <QRCodeSVG
                value={JSON.stringify({ location: activeQrCp.location, checkpoint: activeQrCp.checkpoint })}
                size={180}
                level="H"
                includeMargin={true}
              />
              <span className="text-xs font-bold text-slate-900">{activeQrCp.checkpoint}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const content = document.getElementById('printable-qr')?.innerHTML;
                  const win = window.open('', '', 'height=500,width=500');
                  win?.document.write(`<html><head><title>QR Code</title><style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;}</style></head><body>${content}</body></html>`);
                  win?.document.close();
                  win?.focus();
                  win?.print();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Print QR Tag
              </button>
              <button
                onClick={() => setActiveQrCp(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
