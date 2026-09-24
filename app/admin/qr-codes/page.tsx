'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function QrCodeManager() {
  const [parentSite, setParentSite] = useState('');
  const [childCheckpoint, setChildCheckpoint] = useState('');
  const [directory, setDirectory] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDirectory(data);
      if (data.length > 0 && !selectedItem) {
        setSelectedItem(data[0]);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentSite || !childCheckpoint) return;

    setLoading(true);
    const { data, error } = await supabase.from('checkpoints').insert([
      {
        name: childCheckpoint,
        checkpoint: childCheckpoint,
        location: parentSite,
        status: 'Active QR Ready'
      }
    ]).select();

    setLoading(false);

    if (error) {
      alert('Error registering checkpoint: ' + error.message);
    } else {
      setParentSite('');
      setChildCheckpoint('');
      fetchDirectory();
      if (data && data[0]) {
        setSelectedItem(data[0]);
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete checkpoint "${name}"?`)) return;

    const { error } = await supabase
      .from('checkpoints')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting item: ' + error.message);
    } else {
      fetchDirectory();
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-xl flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">QR Code Directory & Deployment Manager</h1>
            <p className="text-xs text-slate-400 mt-1">Create parent locations, assign child checkpoints, and manage physical QR codes.</p>
          </div>
          <Link
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        {/* Registration Section */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Register New Parent Site & Child Checkpoint</h2>
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Parent Site / Location Name</label>
              <input
                type="text"
                required
                value={parentSite}
                onChange={(e) => setParentSite(e.target.value)}
                placeholder="e.g. CR REPUBLIC, GRAND TOWERS"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Child Checkpoint Name</label>
              <input
                type="text"
                required
                value={childCheckpoint}
                onChange={(e) => setChildCheckpoint(e.target.value)}
                placeholder="e.g. AWOLOWO RD, GATE 1, SERVER ROOM"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                {loading ? 'Generating...' : '+ Register & Generate QR'}
              </button>
            </div>
          </form>
        </div>

        {/* Directory and Preview Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Locations Table */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Locations & Checkpoints Directory</h2>
              <p className="text-[11px] text-slate-400">Click any checkpoint to inspect and print its deployment QR code label.</p>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Parent Location</th>
                    <th className="py-3 px-4">Child Checkpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {directory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No checkpoints registered yet.
                      </td>
                    </tr>
                  ) : (
                    directory.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className={`cursor-pointer transition hover:bg-slate-800/50 ${selectedItem?.id === item.id ? 'bg-cyan-950/20 border-l-2 border-cyan-500' : ''}`}
                      >
                        <td className="py-3 px-4 font-bold text-white">{item.location || item.parent_site}</td>
                        <td className="py-3 px-4 text-cyan-400 font-semibold">{item.name || item.checkpoint}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {item.status || 'Active QR Ready'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition border border-slate-700"
                          >
                            {selectedItem?.id === item.id ? 'Viewing QR ✓' : 'View QR Code'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.name || item.checkpoint);
                            }}
                            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition border border-rose-800 cursor-pointer"
                          >
                            Delete ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Printable Label Preview Card */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Printable Label Preview</h2>
              <p className="text-[11px] text-slate-400 mb-6">Selected site deployment label.</p>

              {selectedItem ? (
                <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-4 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                    <span>🛡️</span> TOM SALEM SECURITY
                  </div>
                  
                  {/* QR Code Graphic Representation */}
                  <div className="w-40 h-40 bg-slate-900 p-2 rounded-xl flex items-center justify-center text-white shadow-inner">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        JSON.stringify({ location: selectedItem.location, checkpoint: selectedItem.name || selectedItem.checkpoint })
                      )}`}
                      alt="Checkpoint QR"
                      className="w-full h-full object-contain rounded-lg bg-white p-1"
                    />
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wide">{selectedItem.location}</h3>
                    <p className="text-[11px] font-bold text-rose-600 mt-0.5">📍 {selectedItem.name || selectedItem.checkpoint}</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-500 text-center p-4">
                  Select a location from the directory to preview its printable QR label.
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => window.print()}
                disabled={!selectedItem}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                🖨️ Print QR Code Label
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
