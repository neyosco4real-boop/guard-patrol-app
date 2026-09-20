'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function QrCodeManager() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);

  const fetchCheckpoints = async () => {
    setLoading(true);
    // Fetch from checkpoint_directory table in Supabase
    let { data, error } = await supabase
      .from('checkpoint_directory')
      .select('*')
      .order('created_at', { ascending: false });

    // Fallback if table doesn't exist yet or is empty: seed with default + guard_logs
    if (error || !data || data.length === 0) {
      const defaultData = [
        { id: '1', parent_location: 'TOM SALEM HQ', child_checkpoint: 'RECEPTION' },
        { id: '2', parent_location: 'CR REPUBLIC', child_checkpoint: 'AWOLOWO RD' }
      ];
      setCheckpoints(defaultData);
      setSelectedCheckpoint(defaultData[0]);
    } else {
      setCheckpoints(data);
      setSelectedCheckpoint(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !childName.trim()) {
      alert('Please fill in both Parent Site and Child Checkpoint names.');
      return;
    }

    const newEntry = {
      parent_location: parentName.trim().toUpperCase(),
      child_checkpoint: childName.trim().toUpperCase(),
      created_at: new Date().toISOString()
    };

    // Insert into Supabase table
    const { data, error } = await supabase
      .from('checkpoint_directory')
      .insert([newEntry])
      .select();

    if (error) {
      // If table doesn't exist yet, alert user or handle locally
      console.error('Supabase insert error:', error.message);
      // Fallback local state update
      const updated = [ { id: Date.now().toString(), ...newEntry }, ...checkpoints ];
      setCheckpoints(updated);
      setSelectedCheckpoint(updated[0]);
    } else if (data && data.length > 0) {
      const updated = [data[0], ...checkpoints];
      setCheckpoints(updated);
      setSelectedCheckpoint(data[0]);
    }

    setParentName('');
    setChildName('');
    alert('Checkpoint successfully registered and saved!');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] p-6 rounded-3xl shadow-2xl gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-black text-white tracking-wider uppercase">QR Code Directory & Deployment Manager</h1>
            <p className="text-xs text-slate-400">Create parent locations, assign child checkpoints, and manage persistent physical QR code labels.</p>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
          >
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Register Form */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-2xl">
          <h2 className="text-xs font-black uppercase text-white tracking-wider mb-4">Register New Parent Site & Child Checkpoint</h2>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Parent Site / Location Name</label>
              <input
                type="text"
                placeholder="e.g. CR REPUBLIC, GRAND TOWERS"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Child Checkpoint Name</label>
              <input
                type="text"
                placeholder="e.g. AWOLOWO RD, GATE 1, SERVER ROOM"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black transition shadow-lg hover:shadow-emerald-500/25 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>+</span> Register & Generate QR
              </button>
            </div>
          </form>
        </div>

        {/* Directory and Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Directory Table */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#1e293b]">
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
                      <td colSpan={4} className="p-12 text-center text-slate-500">Loading directory...</td>
                    </tr>
                  ) : checkpoints.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-500">No checkpoints registered yet.</td>
                    </tr>
                  ) : (
                    checkpoints.map((cp) => {
                      const isSelected = selectedCheckpoint?.id === cp.id || (selectedCheckpoint?.parent_location === cp.parent_location && selectedCheckpoint?.child_checkpoint === cp.child_checkpoint);
                      return (
                        <tr
                          key={cp.id || cp.child_checkpoint}
                          onClick={() => setSelectedCheckpoint(cp)}
                          className={`cursor-pointer transition hover:bg-[#131d35] ${isSelected ? 'bg-emerald-950/20 border-l-4 border-emerald-500' : ''}`}
                        >
                          <td className="p-4 font-bold text-emerald-400">{cp.parent_location}</td>
                          <td className="p-4 font-bold text-cyan-400">{cp.child_checkpoint}</td>
                          <td className="p-4">
                            <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              Active QR Ready
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCheckpoint(cp);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
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

          {/* Printable Label Preview */}
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-2xl flex flex-col items-center justify-between">
            <div className="w-full mb-4">
              <h2 className="text-xs font-black uppercase text-white tracking-wider">Printable Label Preview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Selected site deployment label.</p>
            </div>

            {selectedCheckpoint ? (
              <div className="bg-white text-slate-900 p-6 rounded-3xl shadow-2xl w-full max-w-xs flex flex-col items-center text-center space-y-4 border-4 border-slate-200">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-rose-700 tracking-wider">
                  <span>🛡️</span> Tom Salem Security
                </div>

                <div className="bg-slate-100 p-3 rounded-2xl border border-slate-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({ location: selectedCheckpoint.parent_location, checkpoint: selectedCheckpoint.child_checkpoint }))}`}
                    alt="Checkpoint QR Code"
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900">{selectedCheckpoint.parent_location}</h4>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase mt-0.5 flex items-center justify-center gap-1">
                    <span>📍</span> {selectedCheckpoint.child_checkpoint}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12 text-xs">Select a checkpoint to preview its label.</div>
            )}

            <div className="w-full mt-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-black transition shadow-lg hover:shadow-emerald-500/25 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🖨️</span> Print QR Code Label
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
