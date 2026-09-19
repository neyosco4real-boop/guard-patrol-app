'use client';

import React, { useState } from 'react';

export default function CheckpointQRPage() {
  const [qrLocation, setQrLocation] = useState('CR REPUBLIC');
  const [qrCheckpoint, setQrCheckpoint] = useState('AWOLOWO RD');

  const appDomain = typeof window !== 'undefined' ? window.location.origin : 'https://guard-patrol-app.vercel.app';
  const qrPayload = `${appDomain}/?location=${encodeURIComponent(qrLocation)}&checkpoint=${encodeURIComponent(qrCheckpoint)}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6 pb-12">
        
        {/* Header Bar */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 font-black text-lg shadow">
              🖨️
            </div>
            <div>
              <h1 className="text-xs font-black text-white uppercase tracking-wider">CHECKPOINT QR CODE</h1>
              <p className="text-[10px] font-mono text-slate-400">Generator & Deployment Station</p>
            </div>
          </div>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-[#1e293b]"
          >
            ← Back to Admin
          </a>
        </div>

        {/* Generator Card */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-xl space-y-5">
          <div>
            <h2 className="text-xs font-black uppercase text-white tracking-wider">Create Site & Checkpoint Code</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Enter location and checkpoint name to generate a scannable QR code label for physical printing.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase">LOCATION NAME</label>
              <input
                type="text"
                value={qrLocation}
                onChange={(e) => setQrLocation(e.target.value)}
                placeholder="e.g. CR REPUBLIC"
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase">CHECKPOINT NAME</label>
              <input
                type="text"
                value={qrCheckpoint}
                onChange={(e) => setQrCheckpoint(e.target.value)}
                placeholder="e.g. AWOLOWO RD"
                className="w-full bg-[#070b14] border border-[#1e293b] rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>
          </div>

          {/* Printable QR Preview Card */}
          <div className="bg-white p-6 rounded-3xl flex flex-col items-center justify-center space-y-3 shadow-2xl border-4 border-slate-200">
            <img src={qrCodeImageUrl} alt="Checkpoint QR Code" className="w-56 h-56 object-contain" />
            <div className="text-center space-y-0.5">
              <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{qrLocation}</p>
              <p className="text-xs font-bold text-slate-600 uppercase">📍 {qrCheckpoint}</p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs shadow-xl transition cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            🖨️ PRINT QR CODE LABEL
          </button>
        </div>

      </div>
    </div>
  );
}
