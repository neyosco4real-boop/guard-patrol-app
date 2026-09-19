'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CheckpointQRManager() {
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating new location/checkpoint
  const [newLocationName, setNewLocationName] = useState('');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('CR REPUBLIC');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('AWOLOWO RD');

  // Fetch locations and checkpoints from Supabase if tables exist, or manage locally
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch distinct locations or custom list from database
      const { data: logsData } = await supabase.from('guard_logs').select('location, checkpoint');
      if (logsData && logsData.length > 0) {
        const locs = Array.from(new Set(logsData.map(l => l.location))).filter(Boolean);
        const cks = Array.from(new Set(logsData.map(l => l.checkpoint))).filter(Boolean);
        if (locs.length > 0) setLocations(locs);
        if (cks.length > 0) setCheckpoints(cks);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const appDomain = typeof window !== 'undefined' ? window.location.origin : 'https://guard-patrol-app.vercel.app';
  
  // Encodes location and checkpoint directly into the scanner query link
  const qrPayload = `${appDomain}/?location=${encodeURIComponent(selectedLocation)}&checkpoint=${encodeURIComponent(selectedCheckpoint)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-black text-xl shadow">
              🖨️
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wider">QR CODE LINK GENERATOR</h1>
              <p className="text-xs text-slate-400">Create and deploy physical checkpoint labels linking to the mobile scanner</p>
            </div>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Configuration & Selectors */}
          <div className="space-y-6">
            <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl space-y-4">
              <div>
                <h2 className="text-xs font-black uppercase text-white tracking-wider">1. Select or Create Checkpoint</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Configure the target site and checkpoint name for physical deployment.</p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">LOCATION / SITE NAME</label>
                  <input
                    type="text"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    placeholder="e.g. CR REPUBLIC"
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">CHECKPOINT NAME</label>
                  <input
                    type="text"
                    value={selectedCheckpoint}
                    onChange={(e) => setSelectedCheckpoint(e.target.value)}
                    placeholder="e.g. AWOLOWO RD"
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[10px] font-mono text-slate-400 uppercase mb-1">Encoded Target URL Payload:</p>
                <div className="bg-[#070b14] border border-[#1e293b] p-3 rounded-xl font-mono text-[10px] text-emerald-400 break-all">
                  {qrPayload}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Printable QR Card Preview */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl flex flex-col items-center justify-between space-y-4">
            <div className="w-full">
              <h2 className="text-xs font-black uppercase text-white tracking-wider">2. Printable Label Preview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready for printing and mounting at physical site checkpoints.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-2xl border-4 border-slate-200 w-full max-w-xs">
              <img src={qrCodeImageUrl} alt="Checkpoint QR Code" className="w-48 h-48 object-contain" />
              <div className="text-center space-y-0.5">
                <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{selectedLocation || 'LOCATION'}</p>
                <p className="text-[11px] font-bold text-slate-600 uppercase">📍 {selectedCheckpoint || 'CHECKPOINT'}</p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-black text-xs shadow-xl transition cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              🖨️ Print QR Code Label
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
