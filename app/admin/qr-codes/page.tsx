'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function QRCodesManager() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocation, setNewLocation] = useState('TOM SALEM HQ');
  const [newCheckpoint, setNewCheckpoint] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://guard-patrol-app.vercel.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    setLoading(true);
    const { data } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: false });
    if (data) {
      setCheckpoints(data);
    }
    setLoading(false);
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim() || !newCheckpoint.trim()) {
      alert('Please enter both location and checkpoint name.');
      return;
    }

    const loc = newLocation.trim();
    const chk = newCheckpoint.trim();

    const { error } = await supabase.from('checkpoints').insert([
      { location: loc, checkpoint: chk }
    ]);

    if (!error) {
      setNewCheckpoint('');
      fetchCheckpoints();
    } else {
      alert('Error adding checkpoint: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this checkpoint?')) {
      await supabase.from('checkpoints').delete().eq('id', id);
      fetchCheckpoints();
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl gap-4">
          <div>
            <div className="text-emerald-400 font-mono text-[10px] uppercase tracking-wider mb-1">🛡️ Tom Salem Security System</div>
            <h1 className="text-xl font-black tracking-wide text-white uppercase">Official Deployment QR Codes & Checkpoints</h1>
            <p className="text-xs text-slate-400 mt-1">Generate and print tamper-evident QR checkpoint badges for security guard patrols.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition shadow"
            >
              ← Back to Admin Dashboard
            </a>
            <button
              onClick={handlePrintAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer print:hidden"
            >
              🖨️ Print All QR Badges
            </button>
          </div>
        </div>

        {/* Add New Checkpoint Form */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl print:hidden">
          <h2 className="text-sm font-black text-white uppercase mb-4">Register New Deployment Checkpoint</h2>
          <form onSubmit={handleAddCheckpoint} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Site / Location Name</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. TOM SALEM HQ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Checkpoint Name</label>
              <input
                type="text"
                value={newCheckpoint}
                onChange={(e) => setNewCheckpoint(e.target.value)}
                placeholder="e.g. RECEPTION, GATE 1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                + Register Checkpoint & Generate QR
              </button>
            </div>
          </form>
        </div>

        {/* Checkpoints & QR Cards Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Active Standard Deployment Badges ({checkpoints.length})</h2>
          
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading checkpoints...</div>
          ) : checkpoints.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-xs text-slate-400">
              No checkpoints registered yet. Use the form above to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {checkpoints.map((cp) => {
                const cleanLoc = (cp.location || '').trim();
                const cleanChk = (cp.checkpoint || cp.name || '').trim();
                const scanUrl = `${baseUrl}/scan?location=${encodeURIComponent(cleanLoc)}&checkpoint=${encodeURIComponent(cleanChk)}`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scanUrl)}`;

                return (
                  <div key={cp.id} className="bg-white text-slate-900 border-2 border-slate-300 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative page-break-inside-avoid">
                    {/* Delete button (hidden on print) */}
                    <button
                      onClick={() => handleDelete(cp.id)}
                      className="absolute top-4 right-4 bg-red-100 hover:bg-red-200 text-red-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition print:hidden cursor-pointer"
                    >
                      Delete
                    </button>

                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-1">
                      🛡️ TOM SALEM SECURITY
                    </div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">
                      Official Patrol Checkpoint
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-inner mb-4">
                      <img src={qrImageUrl} alt={`QR for ${cleanChk}`} className="w-48 h-48 object-contain mx-auto" />
                    </div>

                    <div className="w-full space-y-1 mb-4 bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] font-mono uppercase text-slate-500">Location</div>
                      <div className="text-sm font-black text-slate-900">{cleanLoc}</div>
                      <div className="text-[10px] font-mono uppercase text-slate-500 mt-2">Checkpoint</div>
                      <div className="text-base font-black text-emerald-700">{cleanChk}</div>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 break-all px-2">
                      {scanUrl}
                    </div>
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
