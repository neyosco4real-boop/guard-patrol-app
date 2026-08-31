'use client';

import { useState, useEffect } from 'react';

export default function CheckpointManagementPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [checkpointInputs, setCheckpointInputs] = useState<{ [key: string]: string }>({});

  const fetchData = async () => {
    try {
      const res = await fetch('/api/checkpoints');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim(), address: newLocationAddress.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLocationName('');
        setNewLocationAddress('');
        fetchData();
      } else {
        alert(data.error || 'Failed to create location');
      }
    } catch (err) {
      console.error('Error creating location:', err);
    }
  };

  const handleDeleteLocation = async (locId: string, locName: string) => {
    if (!confirm(`Delete location "${locName}" and all its checkpoints?`)) return;
    try {
      const res = await fetch(`/api/locations?id=${locId}&name=${encodeURIComponent(locName)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to delete location');
      }
    } catch (err) {
      console.error('Error deleting location:', err);
    }
  };

  const handleAddCheckpoint = async (locationName: string) => {
    const cpName = checkpointInputs[locationName];
    if (!cpName || !cpName.trim()) return;

    try {
      const res = await fetch('/api/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationName,
          name: cpName.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCheckpointInputs({ ...checkpointInputs, [locationName]: '' });
        fetchData();
      } else {
        alert(data.error || 'Failed to add checkpoint');
      }
    } catch (err) {
      console.error('Error adding checkpoint:', err);
    }
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (!confirm('Delete this checkpoint and its QR code?')) return;
    try {
      const res = await fetch(`/api/checkpoints?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error('Error deleting checkpoint:', err);
    }
  };

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl shadow-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white">Checkpoint & QR Deployment Hub</h1>
            <p className="text-xs text-slate-400">Manage locations, add checkpoints, and print high-res QR codes.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg"
            >
              🖨️ Print All QRs
            </button>
            <a href="/admin" className="text-xs font-bold text-cyan-400 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-800">
              ← Back
            </a>
          </div>
        </div>

        {/* Register Location Form */}
        <form onSubmit={handleCreateLocation} className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">+ Register New Location Site</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Location Name (e.g. Multichoice HQ)..."
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
            <input
              type="text"
              placeholder="Address / Description (e.g. Victoria Island, Lagos)..."
              value={newLocationAddress}
              onChange={(e) => setNewLocationAddress(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button type="submit" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer">
            Create Location Site
          </button>
        </form>

        {/* Locations List */}
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-12">Loading locations and checkpoints...</p>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 bg-[#0b0f19] border border-slate-800 rounded-3xl">
            <p className="text-xs text-slate-400">No location sites found. Create one above to begin adding checkpoints.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {locations.map((loc) => (
              <div key={loc.name} className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">🏢 {loc.name}</h3>
                    <p className="text-[11px] text-slate-400">{loc.address || 'Active Location Site'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-cyan-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                      {loc.checkpoints?.length || 0} Checkpoints
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold print:hidden"
                    >
                      Delete Location
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Checkpoint Name (e.g. Server Room, Gate 2)..."
                    value={checkpointInputs[loc.name] || ''}
                    onChange={(e) => setCheckpointInputs({ ...checkpointInputs, [loc.name]: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCheckpoint(loc.name)}
                    className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    + Add Checkpoint & QR
                  </button>
                </div>

                {/* QR Cards Grid */}
                {loc.checkpoints && loc.checkpoints.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4">
                    {loc.checkpoints.map((cp: any) => (
                      <div key={cp.id} className="bg-white text-slate-950 border-2 border-slate-300 p-6 rounded-3xl flex flex-col items-center text-center gap-3 shadow-2xl print:shadow-none print:border-black">
                        <div className="w-full border-b border-slate-200 pb-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">{loc.name}</span>
                          <span className="text-sm font-black text-slate-900">📍 {cp.name}</span>
                        </div>
                        
                        <div className="bg-white p-2 rounded-xl">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Location:${encodeURIComponent(loc.name)}|Checkpoint:${encodeURIComponent(cp.name)}`}
                            alt={`QR for ${cp.name}`}
                            className="w-44 h-44 object-contain mx-auto"
                          />
                        </div>

                        <p className="text-[9px] text-slate-400 font-mono">Scan via Guard Patrol PWA</p>

                        <button
                          type="button"
                          onClick={() => handleDeleteCheckpoint(cp.id)}
                          className="text-[10px] text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer w-full font-bold print:hidden"
                        >
                          Delete Checkpoint
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
