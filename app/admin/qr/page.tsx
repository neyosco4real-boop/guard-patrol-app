'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminQRManager() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [location, setLocation] = useState('');
  const [checkpointName, setCheckpointName] = useState('');

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: false });
    if (data) {
      setCheckpoints(data);
    }
    setLoading(false);
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !checkpointName) {
      alert('Please fill in location and checkpoint name.');
      return;
    }

    const { error } = await supabase.from('checkpoints').insert([
      {
        location: location.toUpperCase(),
        name: checkpointName.toUpperCase(),
        latitude: 6.44514, // default fallback
        longitude: 3.41435,
        radius_meters: 50,
      },
    ]);

    if (error) {
      alert(`Error creating checkpoint: ${error.message}`);
    } else {
      setLocation('');
      setCheckpointName('');
      fetchCheckpoints();
    }
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this checkpoint?')) return;
    const { error } = await supabase.from('checkpoints').delete().eq('id', id);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setCheckpoints(checkpoints.filter((cp) => cp.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-xl font-black tracking-wide text-white uppercase">Site & Checkpoint QR Generator</h1>
            <p className="text-xs text-slate-400 mt-1">Create, manage, and print QR codes for guard tour verification points</p>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Create Form */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <h2 className="text-sm font-black text-white uppercase mb-4">Add New Checkpoint</h2>
          <form onSubmit={handleAddCheckpoint} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Location (e.g. CHICKEN REPUBLIC)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Checkpoint Name (e.g. BACK GATE)"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow cursor-pointer"
            >
              + Create Checkpoint & QR
            </button>
          </form>
        </div>

        {/* Checkpoints Grid with QR Codes */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <h2 className="text-sm font-black text-white uppercase mb-4">Active Checkpoints & QR Codes</h2>
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading checkpoints...</div>
          ) : checkpoints.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No checkpoints created yet. Add one above.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {checkpoints.map((cp) => {
                const scanUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan?location=${encodeURIComponent(cp.location || '')}&checkpoint=${encodeURIComponent(cp.name || '')}`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;

                return (
                  <div key={cp.id} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-lg">
                    <div className="w-full flex justify-between items-start">
                      <div className="text-left">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">{cp.location}</span>
                        <h3 className="text-base font-black text-white">{cp.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteCheckpoint(cp.id)}
                        className="text-red-400 hover:text-red-300 bg-red-950/60 border border-red-900 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-2xl shadow-inner">
                      <img src={qrImageUrl} alt="Checkpoint QR Code" className="w-36 h-36 object-contain" />
                    </div>

                    <a
                      href={qrImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer"
                    >
                      🖨️ Print / Download QR
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
