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
  const locationText = checkpoint.location_name || checkpoint.location || 'Secure Site';
  const checkpointText = checkpoint.checkpoint_name || checkpoint.checkpoint || checkpoint.name || 'Checkpoint';
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col items-center relative group hover:border-emerald-500/50 transition-all">
      {/* Professional Security Placard Header */}
      <div className="w-full text-center pb-3 mb-3 border-b border-slate-800">
        <span className="text-[10px] tracking-widest uppercase text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
          SecureOps Verified Checkpoint
        </span>
      </div>

      {/* QR Code Container with High-Contrast Framing */}
      <div className="bg-white p-3 rounded-lg shadow-inner border-4 border-slate-100 mb-4 flex items-center justify-center">
        {qrImage ? (
          <img src={qrImage} alt="Checkpoint QR" className="w-36 h-36 object-contain" />
        ) : (
          <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">No QR Image</div>
        )}
      </div>

      {/* Site & Gate Labels */}
      <div className="text-center mb-4">
        <h4 className="text-white font-bold text-base tracking-wide">{locationText}</h4>
        <p className="text-emerald-400 text-sm font-medium">{checkpointText}</p>
      </div>

      {/* Action Controls */}
      <div className="w-full flex items-center gap-2 mt-auto">
        <button 
          onClick={downloadQRCode}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/20"
        >
          🖨️ Download Print Placard
        </button>
        <button 
          onClick={() => onDelete(checkpoint.id)}
          className="bg-slate-800 hover:bg-red-950/60 hover:text-red-400 text-slate-400 text-xs py-2 px-3 rounded-lg transition-colors border border-slate-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
