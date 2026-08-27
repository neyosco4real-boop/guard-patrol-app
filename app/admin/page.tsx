'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface PatrolLog {
  id: string;
  guard_name?: string;
  location_name?: string;
  checkpoint_name?: string;
  status: string;
  notes?: string;
  incident_notes?: string;
  photo_url?: string;
  media_url?: string;
  image_url?: string;
  distance_meters?: number;
  scanned_at?: string;
  created_at: string;
}

interface Checkpoint {
  id: string;
  site_id?: string;
  name: string;
  radius: string;
  lat?: number | null;
  lng?: number | null;
}

interface Site {
  id: string;
  name: string;
  address: string;
  checkpoints: Checkpoint[];
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'incidents' | 'fraud'>('all');
  const [showFraudBanner, setShowFraudBanner] = useState(true);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Persist feed clear timestamp in localStorage across page refreshes
  const [clearedAt, setClearedAt] = useState<number | null>(null);

  // Dynamic Sites & Checkpoints State from Supabase
  const [sites, setSites] = useState<Site[]>([]);

  // Add Site State
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');

  // Add Checkpoint State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetSiteId, setTargetSiteId] = useState<string | null>(null);
  const [checkpointName, setCheckpointName] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('50 meters');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locStatusMsg, setLocStatusMsg] = useState<string | null>(null);

  // QR Modal State
  const [selectedQR, setSelectedQR] = useState<{ checkpoint: Checkpoint; siteName: string } | null>(null);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const savedClearedAt = localStorage.getItem('admin_feed_cleared_at');
    if (savedClearedAt) {
      setClearedAt(Number(savedClearedAt));
    }
  }, []);

  const fetchSitesAndCheckpoints = async () => {
    const { data: dbSites, error: sitesErr } = await supabase.from('sites').select('*').order('created_at', { ascending: true });
    const { data: dbCheckpoints, error: cpErr } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: true });

    if (!sitesErr && dbSites) {
      const formattedSites: Site[] = dbSites.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address || 'Address not specified',
        checkpoints: (dbCheckpoints || [])
          .filter((cp) => cp.site_id === s.id)
          .map((cp) => ({
            id: cp.id,
            site_id: cp.site_id,
            name: cp.name,
            radius: cp.radius || '50m',
            lat: cp.lat,
            lng: cp.lng
          }))
      }));
      setSites(formattedSites);
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(() => {
        const savedCleared = localStorage.getItem('admin_feed_cleared_at');
        const activeClearedAt = savedCleared ? Number(savedCleared) : clearedAt;
        if (activeClearedAt) {
          return data.filter((item) => new Date(item.created_at || item.scanned_at || 0).getTime() > activeClearedAt);
        }
        return data;
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSitesAndCheckpoints();
    fetchLogs();

    const channel = supabase
      .channel('admin-patrol-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patrol_logs' }, (payload) => {
        const newLog = payload.new as PatrolLog;
        const savedCleared = localStorage.getItem('admin_feed_cleared_at');
        const cutoff = savedCleared ? Number(savedCleared) : 0;
        if (new Date(newLog.created_at || newLog.scanned_at || 0).getTime() > cutoff) {
          setLogs((prev) => [newLog, ...prev]);
        }
      })
      .subscribe();

    const interval = setInterval(fetchLogs, 3000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [clearedAt]);

  const handleClearFeeds = () => {
    if (window.confirm("Are you sure you want to clear all current feed entries?")) {
      const now = Date.now();
      localStorage.setItem('admin_feed_cleared_at', now.toString());
      setClearedAt(now);
      setLogs([]);
    }
  };

  const handleExportReport = () => {
    alert(exportFormat === 'pdf' ? "Generating PDF Patrol Report..." : "Exporting Excel Spreadsheet (.xlsx)...");
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      window.location.href = "/login";
    }
  };

  const handleSaveSite = async () => {
    if (!newSiteName.trim()) {
      alert("Site name is required.");
      return;
    }

    const { data, error } = await supabase
      .from('sites')
      .insert([{ name: newSiteName.trim(), address: newSiteAddress.trim() || 'Address not specified' }])
      .select();

    if (error) {
      alert("Failed to save site to database: " + error.message);
      return;
    }

    if (data && data[0]) {
      setSites([...sites, { id: data[0].id, name: data[0].name, address: data[0].address, checkpoints: [] }]);
    }
    
    setNewSiteName('');
    setNewSiteAddress('');
    setIsAddSiteModalOpen(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    if (window.confirm("Are you sure you want to remove this site and all its checkpoints?")) {
      const { error } = await supabase.from('sites').delete().eq('id', siteId);
      if (error) {
        alert("Failed to delete site: " + error.message);
        return;
      }
      setSites(sites.filter((s) => s.id !== siteId));
    }
  };

  const handleOpenAddCheckpoint = (siteId: string) => {
    setTargetSiteId(siteId);
    setCheckpointName('');
    setGeofenceRadius('50 meters');
    setCoords({ lat: null, lng: null });
    setLocStatusMsg(null);
    setIsAddModalOpen(true);
  };

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported.");
      return;
    }
    setGettingLocation(true);
    setLocStatusMsg("Fetching GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatusMsg(`📍 Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)}`);
        setGettingLocation(false);
      },
      () => {
        setLocStatusMsg("⚠️ Failed to acquire location.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveCheckpoint = async () => {
    if (!checkpointName.trim() || !targetSiteId) {
      alert("Please enter a checkpoint name.");
      return;
    }

    const radiusVal = geofenceRadius.includes('m') ? geofenceRadius : `${geofenceRadius}m`;
    const payload: Record<string, any> = {
      site_id: targetSiteId,
      name: checkpointName.trim(),
      radius: radiusVal
    };
    if (coords.lat !== null) payload.lat = coords.lat;
    if (coords.lng !== null) payload.lng = coords.lng;

    const { data, error } = await supabase
      .from('checkpoints')
      .insert([payload])
      .select();

    if (error) {
      alert("Failed to save checkpoint: " + error.message);
      return;
    }

    if (data && data[0]) {
      const newCp: Checkpoint = {
        id: data[0].id,
        site_id: data[0].site_id,
        name: data[0].name,
        radius: data[0].radius,
        lat: data[0].lat,
        lng: data[0].lng
      };

      setSites(sites.map((site) => {
        if (site.id === targetSiteId) {
          return { ...site, checkpoints: [...site.checkpoints, newCp] };
        }
        return site;
      }));
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteCheckpoint = async (cpId: string) => {
    const { error } = await supabase.from('checkpoints').delete().eq('id', cpId);
    if (error) {
      alert("Failed to delete checkpoint: " + error.message);
      return;
    }
    setSites(sites.map((site) => ({
      ...site,
      checkpoints: site.checkpoints.filter((c) => c.id !== cpId)
    })));
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSVG = () => {
    if (!qrSvgRef.current || !selectedQR) return;
    const svgData = new XMLSerializer().serializeToString(qrSvgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(URL.createObjectURL(svgBlob), `QR_${selectedQR.checkpoint.name.replace(/\s+/g, '_')}.svg`);
  };

  const downloadPNG = () => {
    if (!qrSvgRef.current || !selectedQR) return;
    const svgData = new XMLSerializer().serializeToString(qrSvgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const URL_Obj = window.URL || window.webkitURL || window;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600; canvas.height = 600;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 600, 600);
        context.drawImage(image, 50, 50, 500, 500);
        triggerDownload(canvas.toDataURL("image/png"), `QR_${selectedQR.checkpoint.name.replace(/\s+/g, '_')}.png`);
      }
    };
    image.src = URL_Obj.createObjectURL(svgBlob);
  };

  const fraudAlerts = logs.filter(l => ['REJECTED', 'FLAGGED'].includes((l.status || '').toUpperCase()));
  const incidentLogs = logs.filter(l => (l.status || '').toUpperCase() === 'INCIDENT');

  const filteredLogs = logs.filter(l => {
    const s = (l.status || '').toUpperCase();
    if (activeTab === 'incidents') return s === 'INCIDENT';
    if (activeTab === 'fraud') return s === 'REJECTED' || s === 'FLAGGED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b18] text-white p-3 sm:p-6 font-sans space-y-6 relative">
      
      {/* Fully Responsive Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#151c33] pb-5">
        <div className="flex items-center space-x-3 justify-between sm:justify-start">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Guard Patrol Command</h1>
          <span className="bg-[#0c2e24] border border-[#10b981]/50 text-[#10b981] text-[10px] font-black px-3 py-1 rounded-full tracking-wider flex items-center space-x-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            <span className="hidden xs:inline">WEBSOCKETS</span> LIVE
          </span>
        </div>

        {/* Responsive Control Bar */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Sound / Alarm Toggle Button */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="flex-1 sm:flex-none justify-center items-center px-3.5 py-2.5 bg-[#0e172a] border border-[#1e293b] hover:border-[#3b82f6] active:scale-95 rounded-xl text-xs font-bold text-slate-200 transition-all flex space-x-2"
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span>{soundEnabled ? 'Alarm On' : 'Alarm Off'}</span>
          </button>

          {/* Export Report Dropdown & Action */}
          <div className="col-span-2 sm:col-span-1 flex items-center bg-[#0e172a] border border-[#1e293b] rounded-xl overflow-hidden p-0.5 w-full sm:w-auto">
            <select 
              value={exportFormat} 
              onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel')} 
              className="bg-transparent text-xs font-semibold text-slate-200 px-2 py-2 focus:outline-none border-r border-[#1e293b] cursor-pointer flex-1 sm:flex-none"
            >
              <option value="pdf" className="bg-[#0e172a] text-white">📄 Export PDF</option>
              <option value="excel" className="bg-[#0e172a] text-white">📊 Export Excel</option>
            </select>
            <button 
              onClick={handleExportReport} 
              className="px-3 py-2 bg-[#1e293b] hover:bg-[#3b82f6] text-white text-xs font-bold transition whitespace-nowrap"
            >
              Download
            </button>
          </div>

          {/* Guard Patrol Scanner Link */}
          <a 
            href="/scan" 
            target="_blank" 
            className="col-span-1 flex-1 sm:flex-none justify-center items-center px-3.5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#3b82f6]/20 transition-all text-center flex space-x-1.5"
          >
            <span>📱</span>
            <span>Guard Scanner</span>
          </a>

          {/* Responsive Logout Button */}
          <button 
            onClick={handleLogout} 
            className="col-span-1 flex-1 sm:flex-none justify-center items-center px-3.5 py-2.5 bg-[#450a0a] border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#7f1d1d] hover:text-white active:scale-95 text-xs font-bold rounded-xl transition-all flex space-x-1.5"
          >
            <span>🔒</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {showFraudBanner && fraudAlerts.length > 0 && (
        <div className="bg-[#1a080b] border border-[#ef4444] rounded-2xl p-4 shadow-2xl flex items-center justify-between transition-all">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#ef4444]">GEOFENCE VIOLATION DETECTED!</h3>
              <p className="text-[11px] sm:text-xs text-[#fca5a5]">{fraudAlerts.length} scan(s) performed outside set geofence perimeter.</p>
            </div>
          </div>
          <button onClick={() => setShowFraudBanner(false)} className="text-[#ef4444] hover:text-white transition font-black p-1">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Relational Sites & Checkpoints */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white">Active Locations ({sites.length})</h2>
            <button onClick={() => setIsAddSiteModalOpen(true)} className="px-3.5 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold rounded-xl transition">
              + Add Location
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="bg-[#0b1021] border border-[#1a233d] rounded-2xl p-8 text-center shadow-xl">
              <p className="text-sm text-[#828cb0]">No active locations in database. Add a site to get started.</p>
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="bg-[#0b1021] border border-[#1a233d] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl relative group">
                <div className="flex items-center justify-between border-b border-[#1a233d] pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 sm:p-3 bg-[#1e1b18] text-[#f59e0b] rounded-xl text-lg sm:text-xl">📁</div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">{site.name}</h3>
                      <p className="text-[11px] sm:text-xs text-[#828cb0]">{site.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="bg-[#12192e] border border-[#1e293b] text-[10px] sm:text-xs text-[#93c5fd] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl font-bold">
                      {site.checkpoints.length} Checkpoints
                    </span>
                    <button onClick={() => handleDeleteSite(site.id)} className="p-1.5 text-[#ef4444] hover:bg-[#450a0a] rounded-lg transition" title="Delete site">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {site.checkpoints.length === 0 && <p className="text-xs text-[#475569] italic px-2">No checkpoints assigned yet.</p>}
                  {site.checkpoints.map((cp) => (
                    <div key={cp.id} className="bg-[#070b18] border border-[#1a233d] rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{cp.name}</h4>
                        <p className="text-[10px] sm:text-[11px] text-[#828cb0]">Radius: {cp.radius} {cp.lat ? `• (${cp.lat.toFixed(4)}, ${cp.lng?.toFixed(4)})` : ''}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => setSelectedQR({ checkpoint: cp, siteName: site.name })} className="px-2.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[10px] sm:text-[11px] font-bold rounded-lg transition">View QR</button>
                        <button onClick={() => handleDeleteCheckpoint(cp.id)} className="px-2.5 py-1.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white text-[10px] sm:text-[11px] font-bold rounded-lg transition">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleOpenAddCheckpoint(site.id)} className="w-full py-2.5 bg-[#070b18] border border-dashed border-[#1a233d] hover:border-[#3b82f6] text-xs font-bold text-[#828cb0] hover:text-white rounded-xl transition">
                  + Add Checkpoint to {site.name}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right Column - Interactive & Responsive Live Feed */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between sm:justify-start space-x-3 text-xs font-bold">
              <span className="text-white text-base">Live Feed ({filteredLogs.length})</span>
              <button onClick={handleClearFeeds} className="text-[#ef4444] hover:underline text-xs bg-[#450a0a]/40 px-2 py-1 rounded-lg border border-[#ef4444]/30">Clear Feed</button>
            </div>

            {/* Interactive Status Filter Pills */}
            <div className="flex items-center bg-[#070b18] border border-[#1a233d] p-1 rounded-xl self-start sm:self-auto">
              <button 
                onClick={() => setActiveTab('all')} 
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'all' ? 'bg-[#2563eb] text-white shadow-md' : 'text-[#828cb0] hover:text-white'}`}
              >
                All ({logs.length})
              </button>
              <button 
                onClick={() => setActiveTab('incidents')} 
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'incidents' ? 'bg-[#f59e0b] text-black shadow-md' : 'text-[#828cb0] hover:text-white'}`}
              >
                Incidents ({incidentLogs.length})
              </button>
              <button 
                onClick={() => setActiveTab('fraud')} 
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'fraud' ? 'bg-[#ef4444] text-white shadow-md' : 'text-[#828cb0] hover:text-white'}`}
              >
                Fraud ({fraudAlerts.length})
              </button>
            </div>
          </div>

          <div className="bg-[#0b1021] border border-[#1a233d] rounded-2xl p-3 sm:p-4 shadow-xl max-h-[680px] overflow-y-auto space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#828cb0] flex flex-col items-center justify-center space-y-2">
                <span className="w-5 h-5 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></span>
                <span>Connecting live patrol feed...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#828cb0]">No logs matching current filter.</div>
            ) : (
              filteredLogs.map((log) => {
                const s = (log.status || '').toUpperCase();
                const isFraud = s === 'REJECTED' || s === 'FLAGGED';
                const isInc = s === 'INCIDENT';
                const isExpanded = expandedLogId === log.id;
                const timeStr = new Date(log.created_at || log.scanned_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div 
                    key={log.id} 
                    className={`border p-3.5 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                      isFraud 
                        ? 'border-[#ef4444]/60 bg-[#1a080b] hover:border-[#ef4444]' 
                        : isInc 
                        ? 'border-[#f59e0b]/60 bg-[#1a140b] hover:border-[#f59e0b]' 
                        : 'border-[#1a233d] bg-[#070b18] hover:border-[#3b82f6]/50'
                    }`}
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    {/* Log Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isFraud ? '#ef4444' : isInc ? '#f59e0b' : '#10b981' }}></span>
                        <span className="text-xs font-bold text-white">{log.guard_name || 'Guard Alpha'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isFraud && <span className="bg-[#450a0a] text-[#ef4444] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-[#ef4444]/40">FRAUD</span>}
                        {isInc && <span className="bg-[#451a03] text-[#f59e0b] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-[#f59e0b]/40">INCIDENT</span>}
                        {!isFraud && !isInc && <span className="bg-[#064e3b]/40 text-[#10b981] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-[#10b981]/30">VERIFIED</span>}
                        <span className="text-[10px] text-[#64748b]">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Location & Checkpoint */}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <p className="text-slate-300 font-medium">
                        {log.location_name || 'Main Campus'} → <span className="text-white font-bold">{log.checkpoint_name || 'Gate 1'}</span>
                      </p>
                      <span className="text-[10px] text-[#64748b] font-mono">{timeStr}</span>
                    </div>

                    {/* Quick Preview Notes */}
                    {(log.notes || log.incident_notes) && (
                      <p className="text-[11px] text-[#94a3b8] bg-[#0b1021]/80 p-2 rounded-lg border border-[#1a233d] mt-2 line-clamp-2">
                        💬 {log.notes || log.incident_notes}
                      </p>
                    )}

                    {/* Expandable Incident Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#1a233d] space-y-2.5 text-xs animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#0b1021] p-2 rounded-lg">
                            <span className="text-[#828cb0] block">Distance Variance</span>
                            <span className="font-bold text-white">{log.distance_meters ? `${log.distance_meters.toFixed(1)}m away` : 'Within range'}</span>
                          </div>
                          <div className="bg-[#0b1021] p-2 rounded-lg">
                            <span className="text-[#828cb0] block">Log ID</span>
                            <span className="font-mono text-[#60a5fa] truncate block">{log.id.slice(0, 8)}...</span>
                          </div>
                        </div>

                        {(log.photo_url || log.media_url || log.image_url) && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#828cb0] uppercase">Attached Evidence</span>
                            <img 
                              src={log.photo_url || log.media_url || log.image_url} 
                              alt="Incident Evidence" 
                              className="w-full h-36 object-cover rounded-xl border border-[#1a233d]"
                            />
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          <button 
                            onClick={() => alert(`Escalating Incident Report ID: ${log.id}`)}
                            className="flex-1 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[11px] font-bold rounded-lg transition text-center"
                          >
                            🚨 Escalate Supervisor
                          </button>
                          <button 
                            onClick={() => alert(`Marked Log #${log.id.slice(0, 5)} as Reviewed`)}
                            className="flex-1 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-white text-[11px] font-bold rounded-lg transition text-center"
                          >
                            ✓ Mark Reviewed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* View QR Modal */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-[#0c1226] border border-[#1e293b] w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3 text-left">
              <div>
                <h2 className="text-sm font-bold text-white">{selectedQR.checkpoint.name}</h2>
                <p className="text-[11px] text-[#828cb0]">{selectedQR.siteName} • Radius: {selectedQR.checkpoint.radius}</p>
              </div>
              <button onClick={() => setSelectedQR(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            <div className="bg-white p-5 rounded-2xl inline-block shadow-inner">
              <QRCodeSVG ref={qrSvgRef} value={selectedQR.checkpoint.name} size={200} level="H" includeMargin={true} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={downloadPNG} className="py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition">📥 PNG</button>
              <button onClick={downloadSVG} className="py-2.5 bg-[#0e172a] border border-[#3b82f6] text-[#60a5fa] hover:bg-[#3b82f6] hover:text-white text-xs font-bold rounded-xl transition">🎨 SVG</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {isAddSiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0c1226] border border-[#1e293b] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h2 className="text-lg font-extrabold text-white">Add New Location / Site</h2>
              <button onClick={() => setIsAddSiteModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#828cb0] uppercase">Site Name</label>
                <input type="text" placeholder="e.g. Chevron HQ" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#828cb0] uppercase">Address / Region</label>
                <input type="text" placeholder="e.g. Lekki Phase 1" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2 border-t border-[#1e293b]">
              <button onClick={() => setIsAddSiteModalOpen(false)} className="px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleSaveSite} className="px-5 py-2.5 bg-[#3b82f6] text-white text-xs font-bold rounded-xl">Create Site</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0c1226] border border-[#1e293b] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between border-b border-[#1e293b] pb-3">
              <h2 className="text-lg font-extrabold text-white">Add Checkpoint</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#828cb0] uppercase">Checkpoint Name</label>
                <input type="text" placeholder="e.g. Generator Area" value={checkpointName} onChange={(e) => setCheckpointName(e.target.value)} className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#828cb0] uppercase">Geofence Radius</label>
                <select value={geofenceRadius} onChange={(e) => setGeofenceRadius(e.target.value)} className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                  <option value="25 meters">25 meters</option><option value="50 meters">50 meters</option><option value="100 meters">100 meters</option>
                </select>
              </div>
              <button type="button" onClick={handleUseCurrentLocation} disabled={gettingLocation} className="w-full py-2.5 bg-[#1e293b] border border-[#3b82f6]/40 text-[#60a5fa] text-xs font-bold rounded-xl flex justify-center space-x-2">
                <span>📍</span><span>{gettingLocation ? 'Fetching GPS...' : 'Use My Current Location'}</span>
              </button>
              {locStatusMsg && <p className="text-[11px] text-[#38bdf8] text-center bg-[#071927] py-1.5 rounded-lg">{locStatusMsg}</p>}
            </div>
            <div className="flex justify-end space-x-3 pt-2 border-t border-[#1e293b]">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold rounded-xl">Cancel</button>
              <button onClick={handleSaveCheckpoint} className="px-5 py-2.5 bg-[#3b82f6] text-white text-xs font-bold rounded-xl">Save Checkpoint</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
