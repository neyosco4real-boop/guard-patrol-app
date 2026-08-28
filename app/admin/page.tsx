'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Site {
  id: string;
  name: string;
  address?: string;
}

interface Checkpoint {
  id: string;
  site_id: string;
  name: string;
  radius?: string;
}

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showHtmlReportModal, setShowHtmlReportModal] = useState(false);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const previousLogsRef = useRef<any[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');

  // Modal States
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<{ name: string; id: string } | null>(null);
  const [selectedLogForMinute, setSelectedLogForMinute] = useState<any | null>(null);
  const [adminMinuteText, setAdminMinuteText] = useState('');

  // Creation Modal States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [newCpSiteId, setNewCpSiteId] = useState('');
  const [newCpRadius, setNewCpRadius] = useState('50m');

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [{ data: rawLogs }, { data: rawSites }, { data: rawCheckpoints }] = await Promise.all([
      supabase.from('patrol_logs').select('*').order('scanned_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('checkpoints').select('*').order('name'),
    ]);

    if (rawLogs) {
      if (previousLogsRef.current.length > 0) {
        const prevIds = new Set(previousLogsRef.current.map((l) => l.id));
        const newlyAdded = rawLogs.filter((l) => !prevIds.has(l.id)).map((l) => l.id);

        if (newlyAdded.length > 0) {
          setNewLogIds((prev) => new Set([...Array.from(prev), ...newlyAdded]));
          setTimeout(() => {
            setNewLogIds((prev) => {
              const updated = new Set(prev);
              newlyAdded.forEach((id) => updated.delete(id));
              return updated;
            });
          }, 3000);
        }
      }
      previousLogsRef.current = rawLogs;
      setLogs(rawLogs);
    }
    if (rawSites) setSites(rawSites);
    if (rawCheckpoints) setCheckpoints(rawCheckpoints);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime_admin_telemetry_v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_logs' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleClearLiveFeed = async () => {
    if (!confirm('Are you sure you want to clear the entire live patrol feed? This action cannot be undone.')) {
      return;
    }
    const { error } = await supabase.from('patrol_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      alert(`Error clearing feed: ${error.message}`);
    } else {
      setLogs([]);
    }
  };

  const handleDeleteLocation = async (siteId: string, siteName: string) => {
    if (!confirm(`Are you sure you want to delete "${siteName}"? This will permanently flush all related checkpoints and patrol logs.`)) {
      return;
    }

    const cpIds = checkpoints.filter((cp) => cp.site_id === siteId).map((cp) => cp.id);

    if (cpIds.length > 0) {
      await supabase.from('patrol_logs').delete().in('checkpoint_id', cpIds);
    }
    await supabase.from('patrol_logs').delete().eq('location_name', siteName);
    await supabase.from('checkpoints').delete().eq('site_id', siteId);
    const { error } = await supabase.from('sites').delete().eq('id', siteId);

    if (error) {
      alert(`Error deleting location: ${error.message}`);
    } else {
      fetchData();
    }
  };

  const resolveLocationName = (log: any) => {
    const cpVal = log.checkpoint_id || log.checkpoint_name;
    const matchedCp = checkpoints.find((cp) => cp.id === cpVal || cp.name === cpVal);
    if (matchedCp) {
      const matchedSite = sites.find((s) => s.id === matchedCp.site_id);
      if (matchedSite) return matchedSite.name;
    }
    return log.location_name && log.location_name !== 'General Precinct' 
      ? log.location_name 
      : sites[0]?.name || 'Unassigned Location';
  };

  const resolveCheckpointName = (log: any) => {
    const rawVal = log.checkpoint_name || log.checkpoint_id || '';
    const found = checkpoints.find((cp) => cp.id === rawVal || cp.name === rawVal);
    if (found) return found.name;
    return rawVal || 'Zone Checkpoint';
  };

  const handleAcknowledgeLog = async (logId: string) => {
    setLogs((prevLogs) =>
      prevLogs.map((log) => (log.id === logId ? { ...log, status: 'ACKNOWLEDGED' } : log))
    );

    await supabase
      .from('patrol_logs')
      .update({ status: 'ACKNOWLEDGED' })
      .eq('id', logId);
  };

  const handleSaveAdminMinute = async () => {
    if (!selectedLogForMinute) return;

    const { error } = await supabase
      .from('patrol_logs')
      .update({ admin_minute: adminMinuteText, status: 'ACKNOWLEDGED' })
      .eq('id', selectedLogForMinute.id);

    if (error) {
      alert(`Failed to save minute: ${error.message}`);
    } else {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === selectedLogForMinute.id ? { ...l, admin_minute: adminMinuteText, status: 'ACKNOWLEDGED' } : l
        )
      );
      setSelectedLogForMinute(null);
      setAdminMinuteText('');
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return alert('Please enter a location name.');

    const { error } = await supabase.from('sites').insert([{ name: newLocName, address: newLocAddress }]);
    if (error) {
      alert(`Error creating location: ${error.message}`);
    } else {
      setNewLocName('');
      setNewLocAddress('');
      setShowLocationModal(false);
      fetchData();
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpName.trim() || !newCpSiteId) return alert('Please complete required fields.');

    const payload = {
      name: newCpName,
      site_id: newCpSiteId,
      radius: newCpRadius,
    };

    const { error } = await supabase.from('checkpoints').insert([payload]);

    if (error) {
      alert(`Error creating checkpoint: ${error.message}`);
    } else {
      setNewCpName('');
      setShowCheckpointModal(false);
      fetchData();
    }
  };

  const filteredLogs = logs.filter((log) => {
    const guardName = (log.guard_name || log.notes || '').toLowerCase();
    const cpName = resolveCheckpointName(log).toLowerCase();
    const locName = resolveLocationName(log);
    const currentStatus = log.status || 'VERIFIED';

    const matchesSearch = guardName.includes(searchTerm.toLowerCase()) || cpName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
    const matchesLocation = selectedLocationFilter === 'ALL' || locName === selectedLocationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert('No patrol logs to export.');

    const headers = ['Timestamp,Guard Name,Location,Checkpoint,Latitude,Longitude,Status,Incident Notes,Admin Minute\n'];
    const rows = filteredLogs.map((l) => {
      const gName = l.guard_name || 'Officer';
      const locName = resolveLocationName(l);
      const cpName = resolveCheckpointName(l);
      return `"${new Date(l.scanned_at || l.created_at || Date.now()).toLocaleString()}","${gName}","${locName}","${cpName}","${l.latitude || ''}","${l.longitude || ''}","${l.status || 'VERIFIED'}","${(l.incident_notes || l.notes || '').replace(/"/g, '""')}","${(l.admin_minute || '').replace(/"/g, '""')}"`;
    });

    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Patrol_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 font-sans p-4 md:p-6 lg:p-8 space-y-6 overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      
      {/* Background Ambient Glows */}
      <div className="fixed -top-32 -left-32 w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-32 -right-32 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Glass Header */}
      <header className="relative bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 z-20">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-2xl shadow-[inset_0_0_20px_rgba(6,182,212,0.2)]">
            <span className="text-2xl">🛡️</span>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-lg md:text-xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                Guard Patrol System
              </h1>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">Live Security Operations & Geofence Intelligence</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex items-center space-x-2 bg-slate-950/50 border border-white/10 px-3.5 py-2 rounded-2xl shadow-inner backdrop-blur-md">
            <span className="text-xs text-cyan-400 font-bold">📍 Site:</span>
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-100 outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL" className="bg-[#030712]">All Locations</option>
              {sites.map((site) => (
                <option key={site.id} value={site.name} className="bg-[#030712]">
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative inline-block text-left" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="bg-slate-800/60 hover:bg-slate-700/60 text-white font-bold px-4 py-2 rounded-2xl text-xs transition-all border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2"
            >
              <span>📥 Export</span>
              <span className={`text-[10px] transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 z-50 w-52 mt-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden">
                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    setShowHtmlReportModal(true);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors gap-2"
                >
                  <span>🌐</span> HTML View Report
                </button>
                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    exportToCSV();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors gap-2 border-t border-white/5"
                >
                  <span>📊</span> Download CSV / Excel
                </button>
              </div>
            )}
          </div>

          <button
            onClick={fetchData}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all backdrop-blur-md shadow-lg flex items-center gap-1.5"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span> Sync Stream
          </button>

          <button
            onClick={handleLogout}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all backdrop-blur-md shadow-lg flex items-center gap-1.5"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
        
        {/* Left Column: Locations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex justify-between items-center shadow-lg">
            <h2 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <span>🏢</span> Locations ({sites.length})
            </h2>
            <button
              onClick={() => setShowLocationModal(true)}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              + Add Location
            </button>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {sites.length === 0 ? (
              <div className="bg-slate-900/30 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center text-xs text-slate-400">
                No sites configured yet.
              </div>
            ) : (
              sites
                .filter(s => selectedLocationFilter === 'ALL' || s.name === selectedLocationFilter)
                .map((site) => {
                  const siteCheckpoints = checkpoints.filter((cp) => cp.site_id === site.id);

                  return (
                    <div 
                      key={site.id} 
                      className="bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 rounded-3xl p-4 space-y-3 shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex-1 pr-2">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            📍 {site.name}
                          </h3>
                          {site.address && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{site.address}</p>}
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              setNewCpSiteId(site.id);
                              setShowCheckpointModal(true);
                            }}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all shadow-md"
                          >
                            + Checkpoint
                          </button>

                          <button
                            onClick={() => handleDeleteLocation(site.id, site.name)}
                            title="Delete Location"
                            className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-600 border border-red-400/40 text-red-300 hover:text-white text-xs font-black flex items-center justify-center transition-all shadow-md active:scale-95"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        {siteCheckpoints.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic pl-1">No checkpoints mapped.</p>
                        ) : (
                          siteCheckpoints.map((cp) => (
                            <div 
                              key={cp.id}
                              className="bg-slate-950/40 border border-white/5 p-2.5 rounded-2xl flex items-center justify-between hover:border-cyan-400/30 transition-all"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-200 block">🎯 {cp.name}</span>
                                <span className="text-slate-400 text-[10px] font-mono">Radius: {cp.radius || '50m'}</span>
                              </div>

                              <button
                                onClick={() => setActiveQrModal({ name: cp.name, id: cp.id })}
                                className="bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 hover:text-white px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all"
                              >
                                📱 QR
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Column: Telemetry Log Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-3">
                <h2 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📡</span> Telemetry Feed ({filteredLogs.length})
                </h2>

                <button
                  onClick={handleClearLiveFeed}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-rose-300 border-none px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all shadow-md flex items-center gap-1"
                >
                  🗑️ Clear Feed
                </button>
              </div>

              <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                {['ALL', 'VERIFIED', 'INCIDENT', 'ACKNOWLEDGED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                      statusFilter === st 
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md' 
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <input 
              type="text"
              placeholder="Filter logs by officer or checkpoint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white outline-none focus:border-cyan-400 transition-all placeholder:text-slate-500"
            />
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[calc(100vh-270px)] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950/80 border-b border-white/10 text-[10px] font-bold text-cyan-300 uppercase z-10 backdrop-blur-xl">
                <tr>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Guard</th>
                  <th className="p-3.5">Location / Checkpoint</th>
                  <th className="p-3.5">GPS Coordinates</th>
                  <th className="p-3.5">Incident Report</th>
                  <th className="p-3.5">Attachment</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <div className="inline-block animate-spin text-xl mb-2 text-cyan-400">🔄</div>
                      <p className="animate-pulse text-xs">Loading live telemetry feed...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                      No patrol logs matching active status or location filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const checkpointDisplayName = resolveCheckpointName(log);
                    const locationDisplayName = resolveLocationName(log);
                    const incidentText = log.incident_notes || log.notes || '—';
                    const isNewEntry = newLogIds.has(log.id);

                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => {
                          setSelectedLogForMinute(log);
                          setAdminMinuteText(log.admin_minute || '');
                        }}
                        className={`cursor-pointer transition-colors duration-200 hover:bg-white/5 ${
                          isNewEntry ? 'bg-cyan-500/10 font-bold border-l-2 border-l-cyan-400' : ''
                        }`}
                      >
                        <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.scanned_at || log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3.5 font-bold text-white whitespace-nowrap">
                          👮 {log.guard_name || 'Officer'}
                        </td>
                        <td className="p-3.5 space-y-0.5 min-w-[140px]">
                          <span className="text-slate-300 font-medium block text-[11px]">{locationDisplayName}</span>
                          <span className="text-cyan-400 font-bold text-[10px] block truncate">🎯 {checkpointDisplayName}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                          {log.latitude && log.longitude ? (
                            <a
                              href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold flex items-center gap-1"
                            >
                              📍 {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-slate-600">No GPS</span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-[150px]">
                          <p className="text-slate-300 truncate text-[11px]" title={incidentText}>
                            {incidentText}
                          </p>
                          {log.admin_minute && (
                            <span className="inline-block mt-0.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[9px] px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                              💬 Minuted
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {log.photo_url || log.attachment_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhoto(log.photo_url || log.attachment_url);
                              }}
                              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 px-2.5 py-1 rounded-xl font-bold text-[10px] transition-all"
                            >
                              📎 View
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {log.status !== 'ACKNOWLEDGED' ? (
                            <button
                              onClick={() => handleAcknowledgeLog(log.id)}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                            >
                              ✓ Ack
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-cyan-300 font-bold px-2.5 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-xl">
                              ✓ Acked
                            </span>
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
      </div>

      {/* Admin Minute Modal */}
      {selectedLogForMinute && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl backdrop-blur-2xl">
            <button 
              onClick={() => setSelectedLogForMinute(null)}
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider">Incident Details & Admin Minute</h3>
                <p className="text-[11px] text-slate-400">
                  Officer: <strong className="text-white">{selectedLogForMinute.guard_name || 'Officer'}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">🚨 Guard Notes</label>
              <div className="bg-slate-950/50 border border-white/10 p-3 rounded-xl text-xs text-amber-200 font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">
                {selectedLogForMinute.incident_notes || selectedLogForMinute.notes || 'No notes attached to this scan.'}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">✍️ Admin Minute Directive</label>
              <textarea
                rows={3}
                value={adminMinuteText}
                onChange={(e) => setAdminMinuteText(e.target.value)}
                placeholder="Enter administrative directive or response..."
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedLogForMinute(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdminMinute}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                💾 Save Minute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Report Modal */}
      {showHtmlReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div className="bg-slate-950/80 border-b border-white/10 p-5 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">HTML Patrol Report</h3>
                  <p className="text-[11px] text-slate-400">
                    Location: <span className="text-cyan-400 font-bold">{selectedLocationFilter === 'ALL' ? 'All Locations' : selectedLocationFilter}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setShowHtmlReportModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-100 bg-[#030712]">
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 border-b border-white/10 text-[10px] text-cyan-300 uppercase font-bold">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Guard</th>
                      <th className="p-3.5">Location</th>
                      <th className="p-3.5">Checkpoint</th>
                      <th className="p-3.5">GPS Coordinates</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="p-3.5 font-mono text-slate-400">
                          {new Date(log.scanned_at || log.created_at || Date.now()).toLocaleString()}
                        </td>
                        <td className="p-3.5 font-bold text-white">{log.guard_name || 'Officer'}</td>
                        <td className="p-3.5 text-slate-300">{resolveLocationName(log)}</td>
                        <td className="p-3.5 text-cyan-400 font-bold">{resolveCheckpointName(log)}</td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {log.latitude && log.longitude ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}` : 'N/A'}
                        </td>
                        <td className="p-3.5 font-bold">{log.status || 'VERIFIED'}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{log.incident_notes || log.notes || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Modal */}
      {showCheckpointModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCheckpoint} className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button 
              type="button"
              onClick={() => setShowCheckpointModal(false)}
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-cyan-300 uppercase">🎯 Add Checkpoint</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Target Location *</label>
                <select 
                  required
                  value={newCpSiteId}
                  onChange={(e) => setNewCpSiteId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Select Location...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Checkpoint Name *</label>
                <input 
                  type="text" 
                  required 
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  placeholder="e.g. Main Gate" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg">
              Save Checkpoint
            </button>
          </form>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLocation} className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button 
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-cyan-300 uppercase">📍 Add New Location</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Location Name *</label>
                <input 
                  type="text" 
                  required 
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Headquarters" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Address</label>
                <input 
                  type="text" 
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  placeholder="e.g. 100 Plaza Way" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg">
              Save Location
            </button>
          </form>
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-xs w-full p-6 space-y-4 text-center relative shadow-2xl">
            <button 
              onClick={() => setActiveQrModal(null)}
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-white uppercase">{activeQrModal.name}</h3>
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeQrModal.id)}`} 
                alt="QR Code"
                className="w-44 h-44"
              />
            </div>
            <p className="font-mono text-[10px] text-cyan-400 truncate">ID: {activeQrModal.id}</p>
          </div>
        </div>
      )}

      {/* Photo Attachment Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-5 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="text-xs font-bold text-cyan-300 uppercase">📸 Photo Attachment</h3>
            <img src={selectedPhoto} alt="Evidence" className="w-full h-72 object-cover rounded-2xl border border-white/10" />
          </div>
        </div>
      )}
    </div>
  );
}
