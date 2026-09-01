'use client';

import React, { useState, useEffect, useRef } from 'react';
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

const DEFAULT_LOCATIONS: LocationItem[] = [
  { name: 'Headquarters Facility', checkpoints: ['Main Entrance', 'Reception Desk', 'Perimeter Fence North'] }
];

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>(DEFAULT_LOCATIONS);
  const [loading, setLoading] = useState(true);
  
  const [newLocName, setNewLocName] = useState('');
  const [selectedParentLoc, setSelectedParentLoc] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [inlineCpInputs, setInlineCpInputs] = useState<{ [key: string]: string }>({});
  const [statusMsg, setStatusMsg] = useState('');

  const [activeQrCp, setActiveQrCp] = useState<{ location: string; checkpoint: string } | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<PatrolLog | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'telemetry' | 'sitemanager'>('telemetry');

  // Use a ref to prevent periodic polling from overwriting local optimistic updates before DB sync settles
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
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
        
        // Always include currently loaded/local locations first to prevent ghosting
        locationsRef.current.forEach(loc => {
          map.set(loc.name, [...loc.checkpoints]);
        });

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
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      if (isLiveActive) {
        fetchData(true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isLiveActive]);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const locName = newLocName.trim();
    if (locations.some(l => l.name.toLowerCase() === locName.toLowerCase())) {
      setStatusMsg(`Location "${locName}" already exists.`);
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }

    const updated = [...locations, { name: locName, checkpoints: ['Main Checkpoint'] }];
    setLocations(updated);

    try {
      const { error } = await supabase.from('locations').upsert({
        name: locName,
        checkpoints: ['Main Checkpoint']
      }, { onConflict: 'name' });

      if (error) {
        console.error('Supabase upsert error:', error);
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }

    setStatusMsg(`✓ Location "${locName}" created successfully and added to active list!`);
    setNewLocName('');
    setTimeout(() => setStatusMsg(''), 3500);
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentLoc || !newCpName.trim()) {
      setStatusMsg('Please select a parent facility and enter a checkpoint name.');
      setTimeout(() => setStatusMsg(''), 3000);
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
  };

  const handleAddInlineCheckpoint = async (locName: string, e: React.FormEvent) => {
    e.preventDefault();
    const cpName = (inlineCpInputs[locName] || '').trim();
    if (!cpName) return;

    const updated = locations.map(loc => {
      if (loc.name === locName) {
        if (!loc.checkpoints.includes(cpName)) {
          return { ...loc, checkpoints: [...loc.checkpoints, cpName] };
        }
      }
      return loc;
    });

    setLocations(updated);

    try {
      const target = updated.find(l => l.name === locName);
      if (target) {
        await supabase.from('locations').upsert({
          name: target.name,
          checkpoints: target.checkpoints
        }, { onConflict: 'name' });
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }

    setStatusMsg(`✓ Checkpoint "${cpName}" added to ${locName}!`);
    setInlineCpInputs({ ...inlineCpInputs, [locName]: '' });
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleClearAllFeeds = async () => {
    if (!window.confirm('Are you sure you want to clear/delete all patrol logs from the live feed? This action cannot be undone.')) {
      return;
    }

    try {
      await supabase.from('patrol_logs').delete().gte('created_at', '1970-01-01');
      setLogs([]);
      setStatusMsg('✓ All patrol logs cleared successfully.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error('Error clearing feeds:', err);
      setStatusMsg('Error clearing logs. Check console.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleDeleteSingleLog = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await supabase.from('patrol_logs').delete().eq('id', id);
      setLogs(logs.filter(l => l.id !== id));
      setSelectedLogDetail(null);
      setStatusMsg('✓ Patrol log deleted.');
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.guard_name?.toLowerCase().includes(query) ||
      log.location?.toLowerCase().includes(query) ||
      log.checkpoint?.toLowerCase().includes(query) ||
      log.notes?.toLowerCase().includes(query)
    );
  });

  const incidentCount = logs.filter(l => (l.notes || '').includes('[PATROL_TYPE:Incident]')).length;
  const activeLocationsCount = locations.length;
  const totalCheckpointsCount = locations.reduce((acc, curr) => acc + curr.checkpoints.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-12">
      
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xl shadow-lg shadow-emerald-900/40">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">Security Command Center</h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Tom Salem Security Services • Global Operations Dashboard</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${isLiveActive ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 shadow-sm shadow-emerald-950' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              {isLiveActive ? 'Live Polling: Active' : 'Polling: Paused'}
            </button>

            <button
              onClick={() => fetchData(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <span>🔄</span> Refresh
            </button>

            <button
              onClick={handleClearAllFeeds}
              className="bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-900/60 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>🗑️</span> Purge Feeds
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">

        {statusMsg && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-400 rounded-2xl text-center text-xs font-bold shadow-lg animate-fade-in flex items-center justify-center gap-2">
            <span>✨</span> {statusMsg}
          </div>
        )}

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Logs</span>
              <p className="text-2xl font-black text-white font-mono">{logs.length}</p>
              <span className="text-[10px] text-emerald-400 font-medium">Real-time telemetry records</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400 border border-slate-700">
              📡
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Incidents</span>
              <p className="text-2xl font-black text-rose-400 font-mono">{incidentCount}</p>
              <span className="text-[10px] text-rose-400/80 font-medium">Requires attention</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-950/50 flex items-center justify-center text-xl text-rose-400 border border-rose-900/60">
              🚨
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Locations</span>
              <p className="text-2xl font-black text-white font-mono">{activeLocationsCount}</p>
              <span className="text-[10px] text-emerald-400 font-medium">Managed facilities</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400 border border-slate-700">
              🏢
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Checkpoints</span>
              <p className="text-2xl font-black text-white font-mono">{totalCheckpointsCount}</p>
              <span className="text-[10px] text-emerald-400 font-medium">QR tagged stations</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400 border border-slate-700">
              📍
            </div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'telemetry' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            <span>📡</span> Live Patrol Telemetry Feed
          </button>
          <button
            onClick={() => setActiveTab('sitemanager')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'sitemanager' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            <span>🏢</span> Site & Checkpoint Manager
          </button>
        </div>

        {/* TAB 1: TELEMETRY FEED */}
        {activeTab === 'telemetry' && (
          <div className="bg-slate-900 border border-slate-800/80 rounded-3xl shadow-xl overflow-hidden space-y-4">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🛰️</span> Live Patrol Stream & Audit Logs
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Click any record row to inspect full details, notes, and evidence photos.</p>
              </div>

              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search guard, location, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Guard Name</th>
                    <th className="p-4 font-semibold">Facility Location</th>
                    <th className="p-4 font-semibold">Checkpoint</th>
                    <th className="p-4 font-semibold">Patrol Type</th>
                    <th className="p-4 font-semibold">GPS Coordinates</th>
                    <th className="p-4 font-semibold">Notes / Evidence</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading && filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">Loading secure live feed...</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">No patrol log records found.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      let patrolType = 'Normal Patrol';
                      let cleanNotes = log.notes || '';
                      if (cleanNotes.includes('[PATROL_TYPE:Incident]')) {
                        patrolType = 'Incident Patrol';
                        cleanNotes = cleanNotes.replace('[PATROL_TYPE:Incident]', '');
                      } else if (cleanNotes.includes('[PATROL_TYPE:Normal]')) {
                        cleanNotes = cleanNotes.replace('[PATROL_TYPE:Normal]', '');
                      }

                      const hasPhoto = cleanNotes.includes('[PHOTO_DATA:');
                      if (hasPhoto) {
                        cleanNotes = cleanNotes.split('[PHOTO_DATA:')[0];
                      }

                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogDetail(log)}
                          className="hover:bg-slate-850/60 cursor-pointer transition-colors group"
                        >
                          <td className="p-4 text-slate-300 font-mono whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </td>
                          <td className="p-4 font-bold text-white whitespace-nowrap group-hover:text-emerald-400 transition-colors">
                            {log.guard_name}
                          </td>
                          <td className="p-4 text-emerald-400 font-semibold">{log.location}</td>
                          <td className="p-4 text-slate-200">{log.checkpoint}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${patrolType === 'Incident Patrol' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'}`}>
                              {patrolType}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-300 whitespace-nowrap">
                            <div className="text-slate-200">{log.latitude}, {log.longitude}</div>
                            <span className="text-[9px] text-emerald-400 font-medium">✓ Geofence Verified</span>
                          </td>
                          <td className="p-4 max-w-xs text-slate-300 space-y-1">
                            <p className="truncate">{cleanNotes || 'Routine patrol scan'}</p>
                            {hasPhoto && <span className="text-emerald-400 text-[10px] block font-bold">📸 Evidence Photo Attached</span>}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleDeleteSingleLog(log.id, e)}
                              className="bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-900/60 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SITE & CHECKPOINT MANAGER */}
        {activeTab === 'sitemanager' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🏢</span> Site & Checkpoint Operations Manager
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Provision corporate facilities, sub-checkpoints, and generate printable high-density QR tags.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>➕</span> Add Parent Location Facility
                  </h3>
                  <form onSubmit={handleCreateLocation} className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Facility Name</label>
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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
                    >
                      Provision Location Site
                    </button>
                  </form>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>➕</span> Add Checkpoint Station
                  </h3>
                  <form onSubmit={handleCreateCheckpoint} className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Select Parent Facility</label>
                      <select
                        value={selectedParentLoc}
                        onChange={(e) => setSelectedParentLoc(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>Choose parent facility...</option>
                        {locations.map((loc, idx) => (
                          <option key={idx} value={loc.name}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Checkpoint Station Name</label>
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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
                    >
                      Create Checkpoint & QR Tag
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🖨️</span> Active Facility Tree & Printable QR Codes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="font-bold text-emerald-400 text-sm flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <span className="flex items-center gap-2">🏢 {loc.name}</span>
                          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-md text-slate-400 font-mono">
                            {loc.checkpoints.length} {loc.checkpoints.length === 1 ? 'Checkpoint' : 'Checkpoints'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {loc.checkpoints.map((cp, cpidx) => (
                            <div key={cpidx} className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
                              <span className="text-slate-200 font-medium truncate pr-2">📍 {cp}</span>
                              <button
                                onClick={() => setActiveQrCp({ location: loc.name, checkpoint: cp })}
                                className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                              >
                                View QR Tag
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Inline Add Checkpoint Form per Parent Location */}
                      <form onSubmit={(e) => handleAddInlineCheckpoint(loc.name, e)} className="pt-3 border-t border-slate-900 flex gap-2">
                        <input
                          type="text"
                          placeholder="Add new checkpoint..."
                          value={inlineCpInputs[loc.name] || ''}
                          onChange={(e) => setInlineCpInputs({ ...inlineCpInputs, [loc.name]: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-[11px] transition-colors whitespace-nowrap shadow"
                        >
                          + Add
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* DETAIL MODAL CARD */}
      {selectedLogDetail && (() => {
        let patrolType = 'Normal Patrol';
        let cleanNotes = selectedLogDetail.notes || '';
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📋</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Patrol Telemetry Audit Card</h3>
                    <p className="text-[10px] text-slate-400">Record ID: {selectedLogDetail.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLogDetail(null)} className="text-slate-400 hover:text-white text-base font-bold bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Security Guard</span>
                    <span className="text-white font-bold text-sm">{selectedLogDetail.guard_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Scan Timestamp</span>
                    <span className="text-emerald-400 font-mono font-medium">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Facility Location</span>
                    <span className="text-emerald-400 font-semibold">{selectedLogDetail.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Checkpoint Station</span>
                    <span className="text-white font-semibold">{selectedLogDetail.checkpoint}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Patrol Status</span>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full font-bold ${patrolType === 'Incident Patrol' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                      {patrolType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">GPS Coordinates</span>
                    <span className="text-slate-300 font-mono">{selectedLogDetail.latitude}, {selectedLogDetail.longitude}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Patrol Notes / Details</span>
                  <p className="text-slate-200 bg-slate-900 p-3 rounded-xl leading-relaxed">{cleanNotes.trim() || 'No additional notes provided by guard.'}</p>
                </div>

                {hasPhoto && photoUrl && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                    <span className="text-slate-400 uppercase text-[10px] font-semibold block">Attached Evidence Photo</span>
                    <div className="rounded-xl overflow-hidden border border-slate-800 max-h-64 flex justify-center bg-black">
                      <img src={photoUrl} alt="Evidence attachment" className="object-contain max-h-64 w-full" />
                    </div>
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-emerald-400 hover:underline font-semibold text-[11px]"
                    >
                      Open Full Size Image ↗
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleDeleteSingleLog(selectedLogDetail.id)}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-4 py-3 rounded-xl text-xs font-bold transition-colors"
                >
                  Delete Log
                </button>
                <button
                  onClick={() => setSelectedLogDetail(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl text-xs transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR CODE PREVIEW MODAL */}
      {activeQrCp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Printable Checkpoint QR</h3>
              <button onClick={() => setActiveQrCp(null)} className="text-slate-400 hover:text-white text-base font-bold bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
            </div>

            <div id="printable-qr" className="bg-white p-6 rounded-2xl shadow-inner flex flex-col items-center space-y-3">
              <span className="text-[11px] uppercase font-black tracking-wider text-emerald-800">{activeQrCp.location}</span>
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md"
              >
                Print QR Tag
              </button>
              <button
                onClick={() => setActiveQrCp(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-xs font-semibold"
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
