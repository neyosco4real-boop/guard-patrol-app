'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

export default function QrCodesAdminPage() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cpRes, siteRes] = await Promise.all([
      supabase.from('checkpoints').select('*, sites(name)').order('name', { ascending: true }),
      supabase.from('sites').select('*').order('name', { ascending: true })
    ]);

    if (cpRes.data) {
      // Filter out archived/old ones if desired, or show active ones
      const activeCheckpoints = cpRes.data.filter((cp: any) => !cp.name.includes('[ARCHIVED]'));
      setCheckpoints(activeCheckpoints);
    }
    if (siteRes.data) {
      setSites(siteRes.data);
      if (siteRes.data.length > 0) setSelectedSite(siteRes.data[0].id);
    }
    setLoading(false);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('checkpoints').insert([{
      name: newName.trim(),
      site_id: selectedSite || null
    }]);

    if (!error) {
      setNewName('');
      fetchData();
    } else {
      alert(`Error creating checkpoint: ${error.message}`);
    }
    setSubmitting(false);
  };

  const handleArchiveAndRebuild = async (cp: any) => {
    if (!confirm(`Generate a fresh QR code for "${cp.name}"?`)) {
      return;
    }

    setActionLoadingId(cp.id);
    try {
      // 1. Mark old one as archived
      await supabase
        .from('checkpoints')
        .update({ name: `[ARCHIVED] ${cp.name}` })
        .eq('id', cp.id);

      // 2. Insert fresh new checkpoint with brand new UUID
      const cleanName = cp.name.replace(/(\s*\(Fresh\))+/g, '').replace(/\[ARCHIVED\]/g, '').trim();
      const { error: insError } = await supabase
        .from('checkpoints')
        .insert([{ name: `${cleanName} (Fresh)`, site_id: cp.site_id || null }]);

      if (insError) {
        alert(`Failed to create fresh QR: ${insError.message}`);
      } else {
        fetchData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setActionLoadingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Checkpoint QR Generator & Manager
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Regenerate fresh UUID barcodes instantly without permission errors.
            </p>
          </div>
          <a
            href="/admin/checkpoints"
            className="bg-slate-800 text-cyan-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-cyan-500/30"
          >
            Manage Sites
          </a>
        </div>

        {/* Quick Creator Box */}
        <form onSubmit={handleCreateNew} className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">New Checkpoint Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Gate 2 Perimeter"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div className="w-full md:w-64 space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Select Site / Location</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto bg-cyan-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating...' : '+ Create Fresh QR'}
          </button>
        </form>

        {/* Checkpoints Grid */}
        {loading ? (
          <div className="text-center py-20 text-xs text-slate-500 font-mono">Loading checkpoints...</div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-500 font-mono">No checkpoints found. Create one above!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checkpoints.map((cp) => {
              const qrValue = cp.id; // Pure UUID string
              const isActioning = actionLoadingId === cp.id;

              return (
                <div key={cp.id} className="bg-slate-900 border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-xl">
                  <div className="space-y-1 w-full">
                    <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-full uppercase border border-cyan-500/35">
                      {cp.sites?.name || 'Tom Salem Head Office'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{cp.name}</h3>
                    <p className="text-[9px] text-slate-400 font-mono truncate">ID: {cp.id}</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-inner">
                    <QRCodeSVG value={qrValue} size={160} level="M" />
                  </div>

                  <div className="w-full space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] text-emerald-400 font-mono">✓ Raw UUID Encoded</p>
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleArchiveAndRebuild(cp)}
                      className="w-full bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isActioning ? 'Generating...' : '🔄 Regenerate Fresh QR'}
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
