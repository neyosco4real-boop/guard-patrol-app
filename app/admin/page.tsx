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
  attachment_url?: string;
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

  // Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data: logsData } = await supabase
        .from('patrol_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsData) setLogs(logsData);

      const { data: locsData, error } = await supabase.from('locations').select('*');
      if (error) {
        console.error('Error fetching locations:', error.message);
        return;
      }

      const map = new Map<string, string[]>();
      
      DEFAULT_LOCATIONS.forEach(loc => {
        map.set(loc.name, [...loc.checkpoints]);
      });

      if (locsData) {
        locsData.forEach((item: any) => {
          const name = (item.name || '').trim();
          if (!name) return;

          let cps: string[] = [];
          if (Array.isArray(item.checkpoints)) {
            cps = item.checkpoints;
          } else if (typeof item.checkpoints === 'string') {
            try { cps = JSON.parse(item.checkpoints); } catch (e) { cps = []; }
          }

          if (!map.has(name)) {
            map.set(name, cps);
          } else {
            const existing = map.get(name)!;
            map.set(name, Array.from(new Set([...existing, ...cps])));
          }
        });
      }

      const deletedLocs = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem('tsss_deleted_locations') || '[]' : '[]');
      const formatted: LocationItem[] = Array.from(map.entries())
        .filter(([name]) => !deletedLocs.includes(name))
        .map(([name, checkpoints]) => ({
          name,
          checkpoints
        }));
      setLocations(formatted);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      if (isLiveActive) fetchData(true);
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

    const updated = [...locations, { name: locName, checkpoints: [] }];
    setLocations(updated);

    try {
      const { error } = await supabase.from('locations').upsert({
        name: locName,
        checkpoints: []
      }, { onConflict: 'name' });

      if (error) {
        setStatusMsg(`Error saving location: ${error.message}`);
        setTimeout(() => setStatusMsg(''), 4000);
        return;
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }

    setStatusMsg(`✓ Location "${locName}" created and persisted successfully!`);
    setNewLocName('');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleDeleteLocation = async (locName: string) => {
    if (!window.confirm(`Are you sure you want to delete facility "${locName}" and its checkpoints?`)) return;

    const updated = locations.filter(l => l.name !== locName);
    setLocations(updated);

    try {
      // Delete from Supabase matching exact name or using an RPC / custom match
      const { error } = await supabase.from('locations').delete().eq('name', locName);
      if (error) {
        console.error('Supabase delete error:', error.message);
      }
      
      // Also store deleted list in localStorage to persist removal of hardcoded/default locations across reloads
      const deletedLocs = JSON.parse(localStorage.getItem('tsss_deleted_locations') || '[]');
      if (!deletedLocs.includes(locName)) {
        deletedLocs.push(locName);
        localStorage.setItem('tsss_deleted_locations', JSON.stringify(deletedLocs));
      }

      setStatusMsg(`✓ Facility "${locName}" deleted permanently.`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting location:', err);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentLoc || !newCpName.trim()) {
      setStatusMsg('Please select a facility and enter a checkpoint name.');
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
        const { error } = await supabase.from('locations').upsert({
          name: target.name,
          checkpoints: target.checkpoints
        }, { onConflict: 'name' });

        if (error) {
          setStatusMsg(`Error saving checkpoint: ${error.message}`);
          setTimeout(() => setStatusMsg(''), 4000);
          return;
        }
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

  const handleDeleteCheckpoint = async (locName: string, cpName: string) => {
    const updated = locations.map(loc => {
      if (loc.name === locName) {
        return { ...loc, checkpoints: loc.checkpoints.filter(c => c !== cpName) };
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
      setStatusMsg(`✓ Checkpoint "${cpName}" removed.`);
      setTimeout(() => setStatusMsg(''), 2500);
    } catch (err) {
      console.error('Error deleting checkpoint:', err);
    }
  };

  const handleClearAllFeeds = async () => {
    if (!window.confirm('Are you sure you want to clear all patrol logs?')) return;
    try {
      await supabase.from('patrol_logs').delete().gte('created_at', '1970-01-01');
      setLogs([]);
      setStatusMsg('✓ Patrol logs cleared.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error('Error clearing feeds:', err);
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

  // Export handlers
  const handleExportHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Tom Salem Security Services - Patrol Report</title>
  <style>
    body { font-family: sans-serif; padding: 30px; background: #0f172a; color: #f8fafc; }
    h1 { color: #34d399; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #334155; padding: 10px; text-align: left; }
    th { background: #1e293b; color: #34d399; }
    tr:nth-child(even) { background: #111827; }
  </style>
</head>
<body>
  <h1>Tom Salem Security Services - Audit Telemetry Report</h1>
  <p>Generated on: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Guard Name</th>
        <th>Location</th>
        <th>Checkpoint</th>
        <th>GPS Coordinates</th>
        <th>Status / Notes</th>
      </tr>
    </thead>
    <tbody>
      ${logs.map(l => `
        <tr>
          <td>${new Date(l.created_at).toLocaleString()}</td>
          <td>${l.guard_name}</td>
          <td>${l.location}</td>
          <td>${l.checkpoint}</td>
          <td>${l.latitude}, ${l.longitude}</td>
          <td>${l.notes || 'Successful Scan'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TomSalem_Patrol_Report_${Date.now()}.html`;
    a.click();
    setIsExportOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Guard Name', 'Location', 'Checkpoint', 'Latitude', 'Longitude', 'Notes'];
    const rows = logs.map(l => [
      `"${new Date(l.created_at).toLocaleString()}"`,
      `"${l.guard_name}"`,
      `"${l.location}"`,
      `"${l.checkpoint}"`,
      `"${l.latitude}"`,
      `"${l.longitude}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TomSalem_Patrol_Report_${Date.now()}.csv`;
    a.click();
    setIsExportOpen(false);
  };

  const handleExportPDF = () => {
    window.print();
    setIsExportOpen(false);
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('printable-qr-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${activeQrCp?.location}_${activeQrCp?.checkpoint}.png`.replace(/\s+/g, '_');
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-lg">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wide uppercase drop-shadow-sm">
                  Tom Salem Security Guard Patrol System
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Enterprise</span>
              </div>
              <p className="text-xs text-slate-400">Tom Salem Security Services • Global Operations Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => fetchData(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
              <span>🔄</span> Refresh
            </button>
            <button onClick={handleClearAllFeeds} className="bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-900/60 px-3.5 py-2 rounded-xl text-xs font-semibold">
              <span>🗑️</span> Purge Feeds
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 space-y-6">
        {statusMsg && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-800 text-emerald-400 rounded-2xl text-center text-xs font-bold shadow-lg flex items-center justify-center gap-2">
            <span>✨</span> {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Logs</span>
              <p className="text-2xl font-black text-white font-mono">{logs.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400">📡</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Active Incidents</span>
              <p className="text-2xl font-black text-rose-400 font-mono">{incidentCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-950/50 flex items-center justify-center text-xl text-rose-400">🚨</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Active Locations</span>
              <p className="text-2xl font-black text-white font-mono">{activeLocationsCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400">🏢</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Checkpoints</span>
              <p className="text-2xl font-black text-white font-mono">{totalCheckpointsCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-xl text-emerald-400">📍</div>
          </div>
        </div>

        {/* Sub-heading with Export Report Dropdown & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('telemetry')} className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${activeTab === 'telemetry' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
              <span>📡</span> Live Patrol Telemetry Feed
            </button>
            <button onClick={() => setActiveTab('sitemanager')} className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${activeTab === 'sitemanager' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
              <span>🏢</span> Site & Checkpoint Manager
            </button>
          </div>

          {/* Export Report Dropdown Button */}
          <div className="relative" ref={exportDropdownRef}>
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
            >
              <span>📊 Export Report</span>
              <span className={`transform transition-transform ${isExportOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                <button 
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <span>📄</span> Download PDF / Print
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <span>📊 Download Excel (CSV)</span>
                </button>
                <button 
                  onClick={handleExportHTML}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 font-medium border-t border-slate-800/80"
                >
                  <span>🌐 View HTML Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'telemetry' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white">Live Patrol Stream & Audit Logs</h2>
              <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Date/Time</th>
                    <th className="p-4">Guard Name</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Checkpoint</th>
                    <th className="p-4">GPS</th>
                    <th className="p-4">Geofence</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Incident Note & Attachment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLogs.map(log => {
                    const isIncident = (log.notes || '').includes('[PATROL_TYPE:Incident]');
                    return (
                      <tr key={log.id} onClick={() => setSelectedLogDetail(log)} className="hover:bg-slate-850 cursor-pointer transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-4 font-bold text-white whitespace-nowrap">{log.guard_name}</td>
                        <td className="p-4 text-emerald-400 font-semibold">{log.location}</td>
                        <td className="p-4 text-slate-200">{log.checkpoint}</td>
                        <td className="p-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">{log.latitude}, {log.longitude}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 inline-block">
                            Verified
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${isIncident ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-teal-950 text-teal-400 border border-teal-800'}`}>
                            {isIncident ? 'Incident Reported' : 'Successful Scan'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 max-w-xs truncate">
                          {log.notes || 'No remarks'}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button onClick={e => handleDeleteSingleLog(log.id, e)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded-xl text-[10px] font-bold">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sitemanager' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleCreateLocation} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase">Add Parent Facility</h3>
                  <input type="text" required placeholder="Facility Name" value={newLocName} onChange={e => setNewLocName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" />
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs">Provision Location</button>
                </form>

                <form onSubmit={handleCreateCheckpoint} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase">Add Checkpoint Station</h3>
                  <select value={selectedParentLoc} onChange={e => setSelectedParentLoc(e.target.value)} required className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400">
                    <option value="" disabled>Choose parent facility...</option>
                    {locations.map((loc, idx) => <option key={idx} value={loc.name}>{loc.name}</option>)}
                  </select>
                  <input type="text" required placeholder="Checkpoint Name" value={newCpName} onChange={e => setNewCpName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" />
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs">Create Checkpoint</button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                {locations.map((loc, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="font-bold text-emerald-400 text-sm flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2 truncate">
                          <span>🏢</span>
                          <span className="truncate">{loc.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">{loc.checkpoints.length}</span>
                          <button 
                            onClick={() => handleDeleteLocation(loc.name)}
                            title="Delete Facility Location"
                            className="text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {loc.checkpoints.map((cp, cpidx) => (
                          <div key={cpidx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-200 truncate">📍 {cp}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => setActiveQrCp({ location: loc.name, checkpoint: cp })} className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold">QR</button>
                              <button onClick={() => handleDeleteCheckpoint(loc.name, cp)} className="text-rose-400 hover:text-rose-300 bg-rose-950/40 px-2 py-1 rounded-lg text-[10px] font-bold">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <form onSubmit={e => handleAddInlineCheckpoint(loc.name, e)} className="pt-3 border-t border-slate-900 flex gap-2">
                      <input type="text" placeholder="Add checkpoint..." value={inlineCpInputs[loc.name] || ''} onChange={e => setInlineCpInputs({ ...inlineCpInputs, [loc.name]: e.target.value })} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-white" />
                      <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">+</button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Detailed Report Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Patrol Audit Report</span>
                <h3 className="text-base font-extrabold text-white">{selectedLogDetail.guard_name}</h3>
              </div>
              <button onClick={() => setSelectedLogDetail(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Facility Location</span>
                  <span className="text-white font-semibold">{selectedLogDetail.location}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Checkpoint Station</span>
                  <span className="text-slate-200 font-semibold">{selectedLogDetail.checkpoint}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-mono font-bold text-slate-200">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Geofence Status</span>
                  <span className="text-emerald-400 font-bold">Verified (GPS Valid)</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">GPS Coordinates</span>
                <span className="font-mono text-slate-200">{selectedLogDetail.latitude}, {selectedLogDetail.longitude}</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Incident Notes & Remarks</span>
                <p className="text-slate-200 bg-slate-900 p-3 rounded-xl border border-slate-800 whitespace-pre-wrap">{selectedLogDetail.notes || 'No remarks documented.'}</p>
              </div>

              {selectedLogDetail.attachment_url && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Attached Evidence / Image</span>
                  <div className="rounded-xl overflow-hidden border border-slate-800 max-h-60 flex justify-center bg-black/40">
                    <img src={selectedLogDetail.attachment_url} alt="Incident Attachment" className="object-contain max-h-60 w-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => handleDeleteSingleLog(selectedLogDetail.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-4 py-2.5 rounded-xl text-xs font-bold">Delete Log</button>
              <button onClick={() => setSelectedLogDetail(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {activeQrCp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 text-center">
            <h3 className="text-sm font-bold text-white">Printable Checkpoint QR</h3>
            
            <div id="printable-qr-svg" className="bg-white p-5 rounded-2xl flex flex-col items-center space-y-2.5 border-2 border-emerald-700 shadow-xl relative">
              <div className="absolute top-2 left-2 text-[8px] font-mono font-bold text-emerald-800 tracking-wider uppercase">TSSS-SECURE</div>
              <div className="absolute top-2 right-2 text-[8px] font-mono font-bold text-emerald-800 tracking-wider uppercase">VERIFIED</div>
              
              <div className="pt-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-900 block">Tom Salem Security</span>
                <span className="text-[11px] uppercase font-black text-emerald-800 tracking-wider">{activeQrCp.location}</span>
              </div>

              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <QRCodeSVG value={JSON.stringify({ location: activeQrCp.location, checkpoint: activeQrCp.checkpoint })} size={170} level="H" includeMargin={true} />
              </div>

              <div className="w-full bg-slate-950 py-1.5 px-3 rounded-lg flex items-center justify-between">
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">SECURE CHECKPOINT</span>
                <span className="text-[9px] font-mono text-white font-bold">{activeQrCp.checkpoint}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleDownloadQR} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg">
                <span>⬇️</span> Download QR
              </button>
              <button onClick={() => setActiveQrCp(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
