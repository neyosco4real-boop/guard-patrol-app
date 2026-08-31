'use client';

import React, { useEffect, useState } from 'react';
import CheckpointCard from '@/app/components/CheckpointCard';

export default function AdminHubPage() {
  const [checkpointName, setCheckpointName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckpoints = async () => {
    try {
      const res = await fetch('/api/checkpoints');
      const data = await res.json();
      if (data.success) {
        setCheckpoints(data.checkpoints || []);
      }
    } catch (err) {
      console.error('Error fetching checkpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointName.trim()) {
      alert('Please enter a checkpoint name.');
      return;
    }

    const cpName = checkpointName.trim();
    const locName = locationName.trim() || 'Main Site';
    const uniqueId = Math.random().toString(36).substring(2, 9);
    
    const targetUrl = `${window.location.origin}/scan?loc=${encodeURIComponent(locName)}&cp=${encodeURIComponent(cpName)}&id=${uniqueId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`;

    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_name: locName,
          checkpoint_name: cpName,
          qr_url: qrUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        setCheckpointName('');
        setLocationName('');
        fetchCheckpoints();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Failed to save checkpoint: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this checkpoint and its QR placard?')) return;
    try {
      const res = await fetch(`/api/checkpoints?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCheckpoints(checkpoints.filter(cp => cp.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Command Center</h1>
            <p className="text-sm text-slate-400 mt-1">Manage checkpoints and deploy QR codes.</p>
          </div>
          <a 
            href="/scan" 
            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors"
          >
            Open Scanner →
          </a>
        </div>

        {/* Create Checkpoint & Assign QR Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-4">
            + Create Checkpoint & Generate Assigned QR Code
          </h2>
          <form onSubmit={handleCreateCheckpoint} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Checkpoint Name (e.g. Back Gate, Vault)..."
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Location Site (e.g. Hotel 57)..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
            >
              Generate Checkpoint QR
            </button>
          </form>
        </div>

        {/* Deployed Checkpoints Database */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-300 mb-6">
            Active Checkpoints & Assigned QR Codes ({checkpoints.length})
          </h2>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading database records...</div>
          ) : checkpoints.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No checkpoints created yet. Add one above to assign a QR code.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {checkpoints.map((cp) => (
                <CheckpointCard key={cp.id} checkpoint={cp} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
