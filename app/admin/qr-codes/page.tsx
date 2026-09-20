'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CheckpointItem {
  id: string;
  location: string;
  checkpoint: string;
}

export default function QrCodeGeneratorPage() {
  const [items, setItems] = useState<CheckpointItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new site/checkpoint
  const [newLocation, setNewLocation] = useState('');
  const [newCheckpoint, setNewCheckpoint] = useState('');

  // Active preview modal state
  const [activePreview, setActivePreview] = useState<{ location: string; checkpoint: string } | null>(null);
  const [originUrl, setOriginUrl] = useState('https://guard-patrol-app.vercel.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
    fetchCheckpointDirectory();
  }, []);

  async function fetchCheckpointDirectory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('guard_logs')
      .select('id, location, checkpoint')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Filter out unique combinations of location + checkpoint
      const uniqueMap = new Map();
      data.forEach((item) => {
        if (item.location && item.checkpoint) {
          const key = `${item.location.trim().toUpperCase()}||${item.checkpoint.trim().toUpperCase()}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, {
              id: item.id,
              location: item.location.trim().toUpperCase(),
              checkpoint: item.checkpoint.trim().toUpperCase(),
            });
          }
        }
      });
      const uniqueList = Array.from(uniqueMap.values());
      setItems(uniqueList);
      if (uniqueList.length > 0 && !activePreview) {
        setActivePreview(uniqueList[0]);
      }
    }
    setLoading(false);
  }

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim() || !newCheckpoint.trim()) {
      alert('Please provide both a parent location name and a child checkpoint name.');
      return;
    }

    const loc = newLocation.trim().toUpperCase();
    const chk = newCheckpoint.trim().toUpperCase();

    // Insert a dummy log or configuration record so it persists and registers as an active location/checkpoint
    const { data, error } = await supabase.from('guard_logs').insert([
      {
        guard_name: 'System Config',
        location: loc,
        checkpoint: chk,
        latitude: 6.4451,
        longitude: 3.4143,
        geofence_status: 'Configured',
        notes: 'Checkpoint QR Registered',
      },
    ]).select();

    if (error) {
      alert('Failed to register checkpoint: ' + error.message);
      return;
    }

    setNewLocation('');
    setNewCheckpoint('');
    await fetchCheckpointDirectory();

    // Set active preview to the newly created one
    setActivePreview({ location: loc, checkpoint: chk });
  };

  const previewTargetUrl = activePreview 
    ? `${originUrl}/?location=${encodeURIComponent(activePreview.location)}&checkpoint=${encodeURIComponent(activePreview.checkpoint)}`
    : '';
  const previewQrUrl = activePreview 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(previewTargetUrl)}`
    : '';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">QR CODE DIRECTORY & DEPLOYMENT MANAGER</h1>
            <p className="text-xs text-slate-400 mt-1">Create parent locations, assign child checkpoints, and manage physical QR code labels.</p>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Top Section: Create New Parent Site & Child Checkpoint */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl space-y-4">
          <h2 className="text-xs font-black uppercase text-white tracking-wider">Register New Parent Site & Child Checkpoint</h2>
          
          <form onSubmit={handleCreateCheckpoint} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Parent Site / Location Name</label>
              <input
                type="text"
                placeholder="e.g. CR REPUBLIC, GRAND TOWERS"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Child Checkpoint Name</label>
              <input
                type="text"
                placeholder="e.g. AWOLOWO RD, GATE 1, SERVER ROOM"
                value={newCheckpoint}
                onChange={(e) => setNewCheckpoint(e.target.value)}
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-6 rounded-xl text-xs font-black transition cursor-pointer uppercase tracking-wider shadow"
            >
              + Register & Generate QR
            </button>
          </form>
        </div>

        {/* Main Content Grid: Directory List & Active QR Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Active Locations & Checkpoints Directory Table */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#1e293b]">
              <h2 className="text-xs font-black uppercase text-white tracking-wider">Active Locations & Checkpoints Directory</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any checkpoint to inspect and print its deployment QR code label.</p>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#070b14] border-b border-[#1e293b] text-slate-400 font-mono text-[10px] uppercase">
                    <th className="p-4">Parent Location</th>
                    <th className="p-4">Child Checkpoint</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">Loading active checkpoint directory...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No locations registered yet. Use the form above to add one.</td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isSelected = activePreview?.location === item.location && activePreview?.checkpoint === item.checkpoint;
                      return (
                        <tr 
                          key={item.id + item.checkpoint} 
                          className={`transition cursor-pointer ${isSelected ? 'bg-emerald-950/30 border-l-4 border-emerald-500' : 'hover:bg-[#131d35]'}`}
                          onClick={() => setActivePreview(item)}
                        >
                          <td className="p-4 font-bold text-emerald-400 whitespace-nowrap">{item.location}</td>
                          <td className="p-4 font-bold text-white whitespace-nowrap">{item.checkpoint}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Active QR Ready
                            </span>
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePreview(item);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer ${
                                isSelected 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#1e293b]'
                              }`}
                            >
                              {isSelected ? 'Viewing QR ✓' : 'View QR Code'}
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

          {/* Right Column: Printable Label Preview Card */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col justify-between items-center text-center space-y-6">
            <div className="w-full text-left">
              <h2 className="text-xs font-black uppercase text-white tracking-wider">Printable Label Preview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Selected site deployment label.</p>
            </div>

            {activePreview ? (
              <div className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 max-w-xs w-full flex flex-col items-center border-4 border-slate-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  🛡️ TOM SALEM SECURITY
                </div>
                
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <img src={previewQrUrl} alt="Checkpoint QR Code" className="w-48 h-48 object-contain" />
                </div>

                <div className="space-y-1 w-full text-center">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                    {activePreview.location}
                  </h3>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide truncate">
                    📍 {activePreview.checkpoint}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs py-16">Select a checkpoint from the list to preview its label.</div>
            )}

            <button
              onClick={() => window.print()}
              disabled={!activePreview}
              className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-2xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              🖨️ Print QR Code Label
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
