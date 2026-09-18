'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SiteAndCheckpointManager() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  // Form states
  const [activeTab, setActiveTab] = useState<'hub' | 'add-location' | 'add-checkpoint'>('hub');
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  
  const [cpName, setCpName] = useState('');
  const [cpCode, setCpCode] = useState('');
  const [selectedLocId, setSelectedLocId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from('locations').select('*');
    if (locs) {
      setLocations(locs);
      if (locs.length > 0 && !selectedLocId) setSelectedLocId(locs[0].id);
    }

    const { data: cps } = await supabase.from('checkpoints').select('*');
    if (cps) setCheckpoints(cps);
    setLoading(false);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const { error } = await supabase.from('locations').insert([{ name: newLocName, address: newLocAddress }]);
    if (!error) {
      alert('Parent Location (Site) created successfully!');
      setNewLocName('');
      setNewLocAddress('');
      setActiveTab('hub');
      fetchData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim() || !selectedLocId) {
      alert('Please select a parent location and enter a checkpoint name.');
      return;
    }

    const generatedCode = cpCode.trim() || 'TS-CP-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from('checkpoints').insert([
      {
        name: cpName,
        code: generatedCode,
        location_id: selectedLocId,
      }
    ]);

    if (!error) {
      alert('Checkpoint & QR Token created successfully!');
      setCpName('');
      setCpCode('');
      setActiveTab('hub');
      fetchData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase mb-1">Hierarchical Registry</p>
            <h1 className="text-xl font-black tracking-wider uppercase text-white">Site & Checkpoint Manager</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage parent facility locations and generate corresponding scannable checkpoint QR tokens.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('add-location')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer"
            >
              + Add Parent Location
            </button>
            <button 
              onClick={() => {
                if (locations.length === 0) {
                  alert('Please create a Parent Location (Site) first before adding checkpoints.');
                  setActiveTab('add-location');
                  return;
                }
                setActiveTab('add-checkpoint');
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer"
            >
              + Add Checkpoint QR
            </button>
            <a 
              href="/admin" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* Dynamic Modal / Form Views */}
        {activeTab === 'add-location' && (
          <div className="bg-slate-900 border border-purple-900/50 rounded-3xl p-6 mb-8 shadow-2xl max-w-lg mx-auto">
            <h2 className="text-sm font-black uppercase text-purple-400 mb-4">Step 1: Create Parent Location (Site)</h2>
            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Location / Site Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Tom Salem Headquarters"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Facility Address / Zone</label>
                <input 
                  type="text"
                  placeholder="e.g. 12 Victoria Island, Lagos"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-3 rounded-xl uppercase transition cursor-pointer">
                  Save Parent Location
                </button>
                <button type="button" onClick={() => setActiveTab('hub')} className="bg-slate-800 text-slate-300 px-4 py-3 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'add-checkpoint' && (
          <div className="bg-slate-900 border border-cyan-900/50 rounded-3xl p-6 mb-8 shadow-2xl max-w-lg mx-auto">
            <h2 className="text-sm font-black uppercase text-cyan-400 mb-4">Step 2: Add Checkpoint & Generate QR Token</h2>
            <form onSubmit={handleCreateCheckpoint} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Parent Location (Site) *</label>
                <select 
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Checkpoint Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Main Reception, Gate 2, Vault"
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Checkpoint Code (Optional, Auto-generated if blank)</label>
                <input 
                  type="text"
                  placeholder="e.g. TS-CP-RECEPTION"
                  value={cpCode}
                  onChange={(e) => setCpCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl uppercase transition cursor-pointer">
                  Create Checkpoint & QR
                </button>
                <button type="button" onClick={() => setActiveTab('hub')} className="bg-slate-800 text-slate-300 px-4 py-3 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Checkpoints & QR Tokens Grid */}
        {loading ? (
          <div className="text-center py-20 text-xs font-mono text-slate-500">Loading hierarchical records...</div>
        ) : checkpoints.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <p className="text-sm font-bold text-slate-400">No checkpoints registered under any parent location yet.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setActiveTab('add-location')} className="bg-purple-600 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer">
                1. Add Parent Location
              </button>
              <button onClick={() => setActiveTab('add-checkpoint')} className="bg-cyan-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase cursor-pointer">
                2. Add Checkpoint QR
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checkpoints.map((cp) => {
              const matchedLocation = locations.find((l) => l.id === cp.location_id);
              const locationName = matchedLocation ? matchedLocation.name : 'Unassigned Facility';
              const checkpointCode = cp.code || cp.id;

              // Include both location and checkpoint parameters properly in the QR link
              const qrPayload = `${origin || 'https://guard-patrol-app.vercel.app'}/scan?location=${encodeURIComponent(locationName)}&checkpoint=${encodeURIComponent(cp.name)}`;

              return (
                <div key={cp.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">📍 {locationName}</span>
                        <h2 className="text-sm font-black text-white mt-0.5">{cp.name}</h2>
                      </div>
                      <span className="bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px] px-2 py-1 rounded-lg">
                        {checkpointCode}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl flex items-center justify-center my-4 shadow-inner">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`}
                        alt={`QR for ${cp.name}`}
                        className="w-44 h-44 mx-auto"
                      />
                    </div>

                    <div className="text-[10px] font-mono text-emerald-400 text-center mb-4">
                      ✓ Linked to Parent Site & Encoded
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex gap-2">
                    <a 
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase text-center transition shadow cursor-pointer"
                    >
                      Download QR
                    </a>
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete checkpoint "${cp.name}"?`)) {
                          await supabase.from('checkpoints').delete().eq('id', cp.id);
                          fetchData();
                        }
                      }}
                      className="bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900 px-3 py-3 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
