'use client';

import React from 'react';

interface CheckpointCardProps {
  checkpoint: {
    id: string;
    name?: string;
    checkpoint?: string;
    checkpoint_name?: string;
    location?: string;
    location_name?: string;
    qr_url?: string;
    qr_code?: string;
  };
  onDelete: (id: string) => void;
}

export default function CheckpointCard({ checkpoint, onDelete }: CheckpointCardProps) {
  const locationText = checkpoint.location_name || checkpoint.location || 'Secure Facility';
  const checkpointText = checkpoint.checkpoint_name || checkpoint.checkpoint || checkpoint.name || 'Checkpoint Alpha';
  const qrImage = checkpoint.qr_url || checkpoint.qr_code;

  const downloadQRCode = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `${locationText}-${checkpointText}-placard.png`.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center relative group hover:border-emerald-500/40 transition-all duration-300">
      {/* Modern Security Placard Header Badge */}
      <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] tracking-widest uppercase text-emerald-400 font-bold">
            SecureOps Node
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">ENCRYPTED-QR</span>
      </div>

      {/* High-Contrast QR Code Frame */}
      <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-slate-200/20 mb-5 relative group-hover:scale-[1.02] transition-transform">
        {qrImage ? (
          <img src={qrImage} alt="Assigned Checkpoint QR" className="w-36 h-36 object-contain" />
        ) : (
          <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">No QR Code</div>
        )}
      </div>

      {/* Site & Checkpoint Typography */}
      <div className="text-center mb-6 w-full px-2">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
          {locationText}
        </span>
        <h3 className="text-white font-bold text-lg tracking-wide truncate">
          {checkpointText}
        </h3>
      </div>

      {/* Action Controls */}
      <div className="w-full flex items-center gap-2.5 mt-auto pt-2 border-t border-slate-800/50">
        <button 
          onClick={downloadQRCode}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
        >
          <span>🖨️</span> Download Placard
        </button>
        <button 
          onClick={() => onDelete(checkpoint.id)}
          className="bg-slate-800/60 hover:bg-red-950/40 hover:text-red-400 text-slate-400 text-xs py-2.5 px-3 rounded-xl transition-all border border-slate-700/60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
