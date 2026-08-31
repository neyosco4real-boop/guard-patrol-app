'use client';

import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <span className="text-4xl mb-4 inline-block">🛡️</span>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">SecureOps Guard Patrol PWA</h1>
        <p className="text-sm text-slate-400 mb-6">Enterprise security telemetry, QR deployment, and live guard monitoring system.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/admin/dashboard"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-950/50"
          >
            Admin Command Center
          </a>
          <a
            href="/scan"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-3 px-6 rounded-xl border border-slate-700 transition-all"
          >
            Open Patrol Scanner
          </a>
        </div>
      </div>
    </div>
  );
}
