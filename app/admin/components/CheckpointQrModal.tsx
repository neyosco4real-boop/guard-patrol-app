import React from "react";
"use client";

interface CheckpointQrModalProps {
  isOpen: boolean;
  checkpointName?: string;
  qrHash?: string;
  onClose: () => void;
}

export default function CheckpointQrModal({
  isOpen,
  checkpointName = "Checkpoint",
  qrHash = "fb8ee5a6-a4a9-476c-b1b3-757b03b55f74",
  onClose,
}: CheckpointQrModalProps) {
  if (!isOpen) return null;

  // Render SVG QR representation directly inline without dynamic library or network dependencies
  const renderQrSvg = (text: string) => {
    const size = 180;
    const dots = [];
    let hashVal = 0;
    const str = text || "default-hash";

    for (let i = 0; i < str.length; i++) {
      hashVal = (hashVal << 5) - hashVal + str.charCodeAt(i);
      hashVal |= 0;
    }

    const cols = 15;
    const cellSize = size / cols;

    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r < 4 && c < 4) || (r < 4 && c > 10) || (r > 10 && c < 4)) continue;
        const bit = Math.abs((hashVal ^ (r * 29 + c * 13)) % 3);
        if (bit === 0) {
          dots.push(
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize - 0.4}
              height={cellSize - 0.4}
              fill="#0F172A"
            />
          );
        }
      }
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
        <rect width={size} height={size} fill="#FFFFFF" />
        <rect x="0" y="0" width="48" height="48" fill="#0F172A" />
        <rect x="6" y="6" width="36" height="36" fill="#FFFFFF" />
        <rect x="12" y="12" width="24" height="24" fill="#0F172A" />

        <rect x={size - 48} y="0" width="48" height="48" fill="#0F172A" />
        <rect x={size - 42} y="6" width="36" height="36" fill="#FFFFFF" />
        <rect x={size - 36} y="12" width="24" height="24" fill="#0F172A" />

        <rect x="0" y={size - 48} width="48" height="48" fill="#0F172A" />
        <rect x="6" y={size - 42} width="36" height="36" fill="#FFFFFF" />
        <rect x="12" y={size - 36} width="24" height="24" fill="#0F172A" />

        {dots}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl">
        <div>
          <h3 className="text-lg font-bold text-white">Checkpoint QR Code Assigned</h3>
          <p className="text-sm font-semibold text-indigo-400 mt-1">{checkpointName}</p>
        </div>

        <div className="bg-white p-4 rounded-3xl flex items-center justify-center shadow-inner mx-auto w-fit">
          {renderQrSvg(qrHash)}
        </div>

        <div>
          <p className="text-[11px] font-mono text-slate-400 break-all bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            Scan ID Hash: {qrHash}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition"
        >
          Close & Complete
        </button>
      </div>
    </div>
  );
}
