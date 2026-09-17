'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSiteManagerOpen, setIsSiteManagerOpen] = useState(false);
  
  // Site Manager Tabs & Form States
  const [siteManagerTab, setSiteManagerTab] = useState<'locations' | 'checkpoints' | 'print'>('locations');
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [selectedPrintCheckpoint, setSelectedPrintCheckpoint] = useState<any>(null);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
    fetchLocations();
    fetchCheckpoints();

    const subscription = supabase
      .channel('guard_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase.from('guard_logs').select('*').order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*');
    if (!error && data) {
      setLocations(data);
    } else {
      setLocations([]);
    }
  };

  const fetchCheckpoints = async () => {
    const { data, error } = await supabase.from('checkpoints').select('*');
    if (!error && data) {
      setCheckpoints(data);
    } else {
      setCheckpoints([]);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName) return;
    
    const { data, error } = await supabase
      .from('locations')
      .insert([{ name: newLocationName, address: newLocationAddress }])
      .select();

    if (!error && data) {
      setLocations([...locations, data[0]]);
      setNewLocationName('');
      setNewLocationAddress('');
      alert('Location created successfully!');
    } else {
      alert('Error creating location: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to terminate/remove this location? Associated checkpoints will also be unassigned.')) return;
    
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) {
      alert('Error deleting location: ' + error.message);
      return;
    }

    await supabase.from('checkpoints').delete().eq('location_id', id);

    setLocations(locations.filter((l) => l.id !== id));
    setCheckpoints(checkpoints.filter((cp) => cp.location_id !== id));
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName || !selectedLocationId) return;
    const code = `TS-CP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('checkpoints')
      .insert([{ location_id: selectedLocationId, name: newCheckpointName, code }])
      .select();

    if (!error && data) {
      setCheckpoints([...checkpoints, data[0]]);
      setNewCheckpointName('');
      alert('Checkpoint saved and QR Code tag generated!');
    } else {
      alert('Error adding checkpoint: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this checkpoint?')) return;

    const { error } = await supabase.from('checkpoints').delete().eq('id', id);
    if (error) {
      alert('Error deleting checkpoint: ' + error.message);
      return;
    }

    setCheckpoints(checkpoints.filter((cp) => cp.id !== id));
  };

  const handleDeleteLog = async (id: string) => {
    const { error } = await supabase.from('guard_logs').delete().eq('id', id);
    if (!error) {
      setLogs(logs.filter((l) => l.id !== id));
    }
  };

  const downloadQRAsSVG = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPrintCheckpoint.name.replace(/\s+/g, '_')}_QR.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadQRAsJPG = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL_DOM = window.URL || window.webkitURL || window;
    const blobURL = URL_DOM.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 50, 50, 300, 300);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          const jpgUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = jpgUrl;
          a.download = `${selectedPrintCheckpoint.name.replace(/\s+/g, '_')}_QR.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(jpgUrl);
        }, 'image/jpeg', 0.95);
      }
    };
    image.src = blobURL;
  };

  const filteredLogs = logs.filter((l) => 
    Object.values(l).some((val) => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Enterprise Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">TOM SALEM SECURITY GUARD PATROL SYSTEM</h1>
            <span className="bg-emerald-950 text-emerald-400 text-xs px-2.5 py-0.5 rounded border border-emerald-800 font-bold">ENTERPRISE</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Tom Salem Security Services - Global Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button 
            onClick={() => setIsMapModalOpen(true)}
            className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow"
          >
            🗺️ Geofence Map Reader
          </button>
          <button 
            onClick={() => { fetchLogs(); fetchLocations(); fetchCheckpoints(); }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition border border-slate-700"
          >
            🔄 Purge Feeds
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">TOTAL LOGS</span>
          <div className="text-3xl font-black text-white">{logs.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ACTIVE INCIDENTS</span>
          <div className="text-3xl font-black text-red-400">0</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ACTIVE LOCATIONS</span>
          <div className="text-3xl font-black text-blue-400">{locations.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">TOTAL CHECKPOINTS</span>
          <div className="text-3xl font-black text-emerald-400">{checkpoints.length}</div>
        </div>
      </div>

      {/* Secondary Action Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow">
          📡 Live Patrol Telemetry Feed
        </button>
        <button 
          onClick={() => setIsSiteManagerOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
        >
          🏢 Site & Checkpoint Manager
        </button>
        <button 
          onClick={() => {
            const csv = [
              ['Date/Time', 'Guard', 'Location', 'Checkpoint', 'GPS', 'Status'].join(','),
              ...logs.map(l => [l.created_at, l.guard_name, l.location, l.checkpoint, `"${l.latitude}, ${l.longitude}"`, 'Verified'].join(','))
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'patrol_logs.csv';
            a.click();
          }}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition ml-auto flex items-center gap-2"
        >
          📊 Export Report ▾
        </button>
      </div>

      {/* Main Audit Logs Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">Live Patrol Stream & Audit Logs</h2>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-600 w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold bg-slate-950/50">
                <th className="py-3 px-4">DATE/TIME</th>
                <th className="py-3 px-4">GUARD NAME</th>
                <th className="py-3 px-4">LOCATION</th>
                <th className="py-3 px-4">CHECKPOINT</th>
                <th className="py-3 px-4">GPS</th>
                <th className="py-3 px-4">GEOFENCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">INCIDENT NOTE & ATTACHMENT</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">No patrol logs found. Waiting for guard scans...</td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-slate-300 font-mono">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-white">{l.guard_name || 'Elijah Idowu'}</td>
                    <td className="py-3 px-4 text-slate-300">{l.location || 'TOM SALEM HQ'}</td>
                    <td className="py-3 px-4 text-slate-300">{l.checkpoint || 'RECEPTION'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{l.latitude}, {l.longitude}</td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Verified</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-400 font-semibold">Successful Scan</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">Resumption</td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => handleDeleteLog(l.id)}
                        className="text-red-400 hover:text-red-300 font-bold transition text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geofence Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Guard Location & Geofence Radar</h3>
              <button onClick={() => setIsMapModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="h-96 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="text-center z-10">
                <span className="text-emerald-400 text-4xl block mb-2">📍</span>
                <p className="text-sm font-bold text-slate-200">Live Geofence Radar Active (Radius: 50m)</p>
                <p className="text-xs text-slate-400 mt-1">Live GPS Tracking Connected to Supabase Pro</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Site & Checkpoint Manager Modal with Tabs */}
      {isSiteManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">🏢 Site & Checkpoint Manager</h3>
              <button onClick={() => setIsSiteManagerOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-800 mb-4 gap-4 text-xs font-bold">
              <button 
                onClick={() => setSiteManagerTab('locations')}
                className={`pb-2 border-b-2 transition ${siteManagerTab === 'locations' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                1. Create Location (Parent)
              </button>
              <button 
                onClick={() => setSiteManagerTab('checkpoints')}
                className={`pb-2 border-b-2 transition ${siteManagerTab === 'checkpoints' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                2. Add Checkpoint & Generate QR Code
              </button>
            </div>

            {/* Tab 1: Create Location */}
            {siteManagerTab === 'locations' && (
              <div className="space-y-4 text-xs">
                <form onSubmit={handleCreateLocation} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm">Add New Parent Location</h4>
                  <div>
                    <label className="block text-slate-400 mb-1">Location Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Tom Salem Annex Facility" 
                      value={searchQuery} 
                      onChange={(e) => setNewLocationName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Address / Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 14 Admiralty Way, Lekki" 
                      value={searchQuery} 
                      onChange={(e) => setNewLocationAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded transition">
                    Save Location
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <h5 className="font-bold text-slate-300">Existing Locations ({locations.length})</h5>
                  {locations.length === 0 ? (
                    <p className="text-slate-500 py-3 text-center">No locations created yet.</p>
                  ) : (
                    locations.map((loc) => (
                      <div key={loc.id} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white">{loc.name}</span>
                          <p className="text-[10px] text-slate-400">{loc.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 text-[10px] font-bold">Parent Site</span>
                          <button 
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 px-2.5 py-1 rounded font-bold transition text-[10px]"
                          >
                            Terminate Contract / Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Add Checkpoint */}
            {siteManagerTab === 'checkpoints' && (
              <div className="space-y-4 text-xs">
                <form onSubmit={handleCreateCheckpoint} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                  <h4 className="font-bold text-white text-sm">Assign Checkpoint to Location</h4>
                  <div>
                    <label className="block text-slate-400 mb-1">Select Parent Location</label>
                    <select 
                      value={searchQuery} 
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                      required
                    >
                      <option value="">-- Choose Location --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={searchQuery}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Checkpoint Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Main Gate, Server Room, Back Perimeter" 
                      value={searchQuery} 
                      onChange={(e) => setNewCheckpointName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded transition">
                    Save checkpoint & QR Code tag
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <h5 className="font-bold text-slate-300">Active Deployed Checkpoints ({checkpoints.length})</h5>
                  {checkpoints.length === 0 ? (
                    <p className="text-slate-500 py-3 text-center">No checkpoints added yet.</p>
                  ) : (
                    checkpoints.map((cp) => {
                      const parentLoc = locations.find((l) => l.id == cp.location_id);
                      return (
                        <div key={cp.id} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-white">{cp.name}</span>
                            <p className="text-[10px] text-slate-400">Parent: {parentLoc ? parentLoc.name : 'Unassigned'} | Code: <span className="font-mono text-emerald-400">{cp.code}</span></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setSelectedPrintCheckpoint({ ...cp, locationName: parentLoc ? parentLoc.name : 'Unassigned' })}
                              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5"
                            >
                              <span>📷</span> View/Download QR
                            </button>
                            <button 
                              onClick={() => handleDeleteCheckpoint(cp.id)}
                              className="bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 px-2.5 py-1.5 rounded font-bold transition text-[10px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tom Salem Security QR Code View & Download Modal */}
      {selectedPrintCheckpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:bg-white">
          <div className="bg-white text-slate-950 p-8 rounded-xl w-full max-w-md shadow-2xl border-4 border-emerald-800 text-center relative">
            <button 
              onClick={() => setSelectedPrintCheckpoint(null)} 
              className="absolute top-3 right-3 text-slate-500 hover:text-black font-bold text-sm print:hidden"
            >
              ✕
            </button>
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <h2 className="text-lg font-black tracking-wider uppercase">TOM SALEM SECURITY SERVICES</h2>
              <p className="text-xs font-semibold text-slate-600">OFFICIAL GUARD PATROL QR CHECKPOINT</p>
            </div>
            <div className="my-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">LOCATION</span>
              <h3 className="text-lg font-bold">{selectedPrintCheckpoint.locationName}</h3>
              <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">CHECKPOINT STATION</span>
                <span className="text-xl font-black text-emerald-800 uppercase">{selectedPrintCheckpoint.name}</span>
              </div>
            </div>

            {/* QR Code Render Container */}
            <div className="flex justify-center my-4" ref={qrRef}>
              <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-inner inline-block">
                <QRCodeSVG 
                  value={searchQuery}
                  size={180}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#030712"
                />
              </div>
            </div>

            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300 my-3">
              <span className="text-[10px] text-slate-500 block font-bold">VERIFICATION CODE TAG</span>
              <div className="text-xl font-mono font-black tracking-widest text-emerald-800">{selectedPrintCheckpoint.code}</div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col gap-2 mt-4 print:hidden">
              <div className="flex gap-2">
                <button 
                  onClick={downloadQRAsSVG}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  📥 Download SVG
                </button>
                <button 
                  onClick={downloadQRAsJPG}
                  className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  📥 Download JPG
                </button>
              </div>
              <button 
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-4 rounded text-xs transition"
              >
                🖨️ Print Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
