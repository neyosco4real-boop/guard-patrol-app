'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function QrCodeGeneratorPage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [newLocationInput, setNewLocationInput] = useState<string>('');
  
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string>('');
  const [newCheckpointInput, setNewCheckpointInput] = useState<string>('');

  const [originUrl, setOriginUrl] = useState<string>('https://guard-patrol-app.vercel.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
    fetchExistingSitesAndCheckpoints();
  }, []);

  // Fetch unique existing locations and checkpoints from past guard logs or saved configs
  async function fetchExistingSitesAndCheckpoints() {
    const { data, error } = await supabase
      .from('guard_logs')
      .select('location, checkpoint');

    if (!error && data) {
      const uniqueLocs = Array.from(new Set(data.map(item => item.location))).filter(Boolean) as string[];
      setLocations(uniqueLocs);
      if (uniqueLocs.length > 0 && !selectedLocation) {
        setSelectedLocation(uniqueLocs[0]);
      }
    }
  }

  // Update checkpoints when location changes
  useEffect(() => {
    if (!selectedLocation) return;
    async function fetchCheckpointsForLocation() {
      const { data, error } = await supabase
        .from('guard_logs')
        .select('checkpoint')
        .eq('location', selectedLocation);

      if (!error && data) {
        const uniqueChecks = Array.from(new Set(data.map(item => item.checkpoint))).filter(Boolean) as string[];
        setCheckpoints(uniqueChecks);
        if (uniqueChecks.length > 0) {
          setSelectedCheckpoint(uniqueChecks[0]);
        } else {
          setSelectedCheckpoint('MAIN GATE');
        }
      }
    }
    fetchCheckpointsForLocation();
  }, [selectedLocation]);

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationInput.trim()) return;
    const formattedLoc = newLocationInput.trim().toUpperCase();
    if (!locations.includes(formattedLoc)) {
      setLocations([formattedLoc, ...locations]);
    }
    setSelectedLocation(formattedLoc);
    setNewLocationInput('');
  };

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointInput.trim()) return;
    const formattedCheck = newCheckpointInput.trim().toUpperCase();
    if (!checkpoints.includes(formattedCheck)) {
      setCheckpoints([formattedCheck, ...checkpoints]);
    }
    setSelectedCheckpoint(formattedCheck);
    setNewCheckpointInput('');
  };

  const targetUrl = `${originUrl}/?location=${encodeURIComponent(selectedLocation || 'MAIN SITE')}&checkpoint=${encodeURIComponent(selectedCheckpoint || 'CHECKPOINT 1')}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">QR CODE LINK & HIERARCHY GENERATOR</h1>
            <p className="text-xs text-slate-400 mt-1">Configure parent client locations and assign child checkpoints for physical QR deployment.</p>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Hierarchy Configuration */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl space-y-6">
            <h2 className="text-xs font-black uppercase text-white tracking-wider">1. Configure Parent Site & Child Checkpoint</h2>

            {/* Parent Site Section */}
            <div className="space-y-3 bg-[#070b14] p-4 rounded-2xl border border-[#1e293b]">
              <label className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Parent Site / Client Location</label>
              
              <div className="flex gap-2">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {locations.length === 0 ? (
                    <option value="MAIN SITE">MAIN SITE</option>
                  ) : (
                    locations.map(loc => <option key={loc} value={loc}>{loc}</option>)
                  )}
                </select>
              </div>

              {/* Add New Parent Site */}
              <form onSubmit={handleAddLocation} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Or type new client location..."
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  + Add Site
                </button>
              </form>
            </div>

            {/* Child Checkpoint Section */}
            <div className="space-y-3 bg-[#070b14] p-4 rounded-2xl border border-[#1e293b]">
              <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Assigned Child Checkpoint</label>
              
              <div className="flex gap-2">
                <select
                  value={selectedCheckpoint}
                  onChange={(e) => setSelectedCheckpoint(e.target.value)}
                  className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {checkpoints.length === 0 ? (
                    <option value="MAIN GATE">MAIN GATE</option>
                  ) : (
                    checkpoints.map(chk => <option key={chk} value={chk}>{chk}</option>)
                  )}
                </select>
              </div>

              {/* Add New Child Checkpoint */}
              <form onSubmit={handleAddCheckpoint} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Or type new checkpoint (e.g. Gate 2, Vault)..."
                  value={newCheckpointInput}
                  onChange={(e) => setNewCheckpointInput(e.target.value)}
                  className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  + Add Checkpoint
                </button>
              </form>
            </div>

            {/* Encoded URL Payload Display */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Encoded Target URL Payload</label>
              <div className="bg-[#070b14] border border-[#1e293b] p-3 rounded-xl font-mono text-[11px] text-emerald-400 break-all">
                {targetUrl}
              </div>
            </div>

          </div>

          {/* Right Column: Printable Label Preview */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col justify-between items-center text-center space-y-6">
            <div className="w-full text-left">
              <h2 className="text-xs font-black uppercase text-white tracking-wider">2. Printable Label Preview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready for physical mounting at client site checkpoints.</p>
            </div>

            {/* QR Card Preview Box */}
            <div className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl space-y-4 max-w-xs w-full flex flex-col items-center border-4 border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                🛡️ TOM SALEM SECURITY
              </div>
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <img src={qrCodeImageUrl} alt="Checkpoint QR Code" className="w-48 h-48 object-contain" />
              </div>

              <div className="space-y-1 w-full text-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                  {selectedLocation || 'PARENT SITE'}
                </h3>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide truncate">
                  📍 {selectedCheckpoint || 'CHECKPOINT'}
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              🖨️ Print QR Code Label
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
