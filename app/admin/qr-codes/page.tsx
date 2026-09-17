'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function QRCodesAdminPage() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from('locations').select('*');
    if (locs) setLocations(locs);

    const { data: cps } = await supabase.from('checkpoints').select('*');
    if (cps) setCheckpoints(cps);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header matching your sleek new UI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase mb-1">Master Registry</p>
            <h1 className="text-xl font-black tracking-wider uppercase text-white">Checkpoint QR Code Hub</h1>
            <p className="text-xs text-slate-400 mt-0.5">Direct 1:1 mapping of active checkpoints to secure scannable QR tokens.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const name = prompt("Enter new Checkpoint Name:");
                if (!name) return;
                const code = prompt("Enter Checkpoint Code (e.g. TS-CP-5):", "TS-CP-" + Math.floor(Math.random()*100));
                if (!code) return;
                supabase.from('checkpoints').insert([{ name, code }]).then(({ error }) => {
                  if (!error) {
                    alert('Checkpoint created successfully!');
                    fetchData();
                  } else {
                    alert('Error: ' + error.message);
                  }
                });
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer"
            >
              + Manage / Add Checkpoints
            </button>
            <a 
              href="/admin" 
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Dashboard
            </a>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-xs font-mono text-slate-500">Loading checkpoint registry...</div>
        ) : checkpoints.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <p className="text-sm font-bold text-slate-400">No checkpoints found in the master registry.</p>
            <button 
              onClick={() => {
                const name = prompt("Enter first Checkpoint Name (e.g. Reception):", "Reception");
                if (!name) return;
                supabase.from('checkpoints').insert([{ name, code: 'TS-CP-1' }]).then(() => fetchData());
              }}
              className="inline-block bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase cursor-pointer"
            >
              Create First Checkpoint Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checkpoints.map((cp) => {
              const matchedLocation = locations.find((l) => l.id === cp.location_id);
              const locationName = matchedLocation ? matchedLocation.name : 'TOM SALEM HQ';
              const checkpointCode = cp.code || cp.id;

              const qrPayload = `${origin || 'https://guard-patrol-app.vercel.app'}/?code=${encodeURIComponent(checkpointCode)}`;

              return (
                <div key={cp.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{locationName}</span>
                        <h2 className="text-sm font-black text-white">{cp.name}</h2>
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
                      ✓ Secure URL & Metadata Encoded
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <a 
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase text-center transition shadow cursor-pointer"
                    >
                      Download {cp.name} QR
                    </a>
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
