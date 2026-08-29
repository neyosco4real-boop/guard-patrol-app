'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function QrCodesPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: locs } = await supabase.from('locations').select('*').order('name');
    if (locs) setLocations(locs);

    const { data: cps } = await supabase.from('checkpoints').select('*').order('name');
    if (cps) setCheckpoints(cps);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Master Registry</div>
            <h1 className="text-2xl font-black text-white uppercase">Checkpoint QR Code Hub</h1>
            <p className="text-xs text-slate-400">Direct 1:1 mapping of active checkpoints to secure scannable QR tokens.</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/admin/checkpoints"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase transition-all shadow-md shadow-cyan-500/20"
            >
              Manage Checkpoints
            </a>
            <a
              href="/admin"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 rounded-xl text-xs uppercase border border-white/10"
            >
              Dashboard
            </a>
          </div>
        </div>

        {/* QR Grid */}
        {loading ? (
          <div className="text-center py-20 text-xs font-mono text-slate-500">Loading checkpoints...</div>
        ) : checkpoints.length === 0 ? (
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-12 text-center space-y-4">
            <p className="text-sm font-bold text-slate-400">No checkpoints found in the system.</p>
            <a
              href="/admin/checkpoints"
              className="inline-block bg-cyan-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase"
            >
              Create Checkpoints Now
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checkpoints.map((cp) => {
              const matchedLocation = locations.find((l) => l.id === (cp.location_id || cp.site_id));
              const locationName = matchedLocation ? matchedLocation.name : 'General Site';

              // QR Data payload containing exact checkpoint ID & Name for the guard scanner
              const qrPayload = JSON.stringify({
                checkpoint_id: cp.id,
                checkpoint_name: cp.name,
                location: locationName,
              });

              return (
                <div key={cp.id} className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
                  <div className="space-y-4 text-center">
                    <div>
                      <span className="inline-block bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase text-indigo-300">
                        {locationName}
                      </span>
                      <h3 className="text-lg font-black text-white uppercase mt-2">{cp.name}</h3>
                      <p className="text-[10px] font-mono text-slate-500 truncate">ID: {cp.id}</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`}
                        alt={`QR for ${cp.name}`}
                        className="w-44 h-44 mx-auto"
                      />
                    </div>

                    <div className="text-[10px] font-mono text-emerald-400">✓ Secure UUID & Metadata Encoded</div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex gap-2">
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase text-center transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                    >
                      Download HQ QR
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
