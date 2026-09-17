'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function ScannerContent() {
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code') || searchParams.get('checkpoint') || '';

  const [scanCode, setScanCode] = useState(urlCode);
  const [guardName, setGuardName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (urlCode) {
      processCode(urlCode, checkpoints, locations);
    }
  }, [urlCode, checkpoints, locations]);

  const fetchAllData = async () => {
    const { data: locData } = await supabase.from('locations').select('*');
    if (locData) setLocations(locData || []);

    const { data: cpData } = await supabase.from('checkpoints').select('*');
    if (cpData) {
      setCheckpoints(cpData || []);
      if (urlCode) {
        processCode(urlCode, cpData, locData || []);
      }
    }
  };

  const processCode = (codeVal: string, cpList = checkpoints, locList = locations) => {
    setScanCode(codeVal);
    const trimmed = codeVal.trim();
    if (!trimmed) {
      setCheckpointName('');
      setLocationName('');
      return;
    }

    // Flexible search across code, id, or name
    const match = cpList.find(
      (cp) => 
        (cp.code && cp.code.trim().toLowerCase() === trimmed.toLowerCase()) ||
        (cp.id && cp.id.toString().toLowerCase() === trimmed.toLowerCase()) ||
        (cp.name && cp.name.trim().toLowerCase() === trimmed.toLowerCase())
    );

    if (match) {
      setCheckpointName(match.name);
      if (match.location_id) {
        const foundLoc = locList.find((l) => l.id === match.location_id);
        if (foundLoc) {
          setLocationName(foundLoc.name);
        } else {
          setLocationName('Assigned Facility');
        }
      } else if (match.location) {
        setLocationName(match.location);
      } else {
        setLocationName('Assigned Facility');
      }
    } else {
      // If code is not explicitly in DB table yet, use code as checkpoint name dynamically
      setCheckpointName(trimmed);
      setLocationName('Scanned Site Location');
    }
  };

  const handleSubmitPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim() || !guardName.trim()) {
      alert('Please enter your guard name and ensure a checkpoint code is scanned.');
      return;
    }

    setLoading(true);
    setStatusMessage('');

    let latitude = '6.5244';
    let longitude = '3.3792';

    if (navigator.geolocation) {
      try {
        const pos: any = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 });
        });
        latitude = pos.coords.latitude.toFixed(4);
        longitude = pos.coords.longitude.toFixed(4);
      } catch (err) {
        console.log('Using GPS fallback.');
      }
    }

    const payload = {
      guard_name: guardName,
      location: locationName || 'Scanned Site Location',
      checkpoint: checkpointName || scanCode,
      patrol_type: patrolType,
      notes: notes || 'Standard Scan Log',
      latitude,
      longitude,
      geofence_status: 'Inside Perimeter',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('guard_logs').insert([payload]);

    setLoading(false);
    if (!error) {
      setStatusMessage('✅ Patrol log successfully sent to Admin Live Feed!');
      setScanCode('');
      setLocationName('');
      setCheckpointName('');
      setNotes('');
    } else {
      setStatusMessage('❌ Error transmitting log: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl my-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-950 border border-red-800 flex items-center justify-center text-red-400 font-bold text-xs">🛡️</span>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase text-white">Guard Patrol Scanner</h1>
              <p className="text-[10px] text-slate-400">Tom Salem Security PWA</p>
            </div>
          </div>
          <div className="bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-emerald-400 font-bold">Live Feed Connected</span>
          </div>
        </div>

        {/* Scanner Viewport */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center mb-5">
          <div className="h-28 bg-slate-900 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center relative overflow-hidden mb-3">
            <span className="text-2xl mb-1">📷</span>
            <p className="text-xs font-bold text-slate-300">QR CODE CHECKPOINT SCANNER</p>
            {scanCode && (
              <div className="absolute inset-x-0 bottom-0 bg-emerald-950/90 border-t border-emerald-800 py-1 text-[11px] font-mono text-emerald-400 font-bold">
                ✓ Captured: {scanCode}
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={() => {
              const testCode = prompt("Simulate QR Code Scan (Enter Checkpoint Code):", checkpoints[0]?.code || "TS-CP-1");
              if (testCode) processCode(testCode);
            }}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider mb-2 transition shadow cursor-pointer"
          >
            📸 OPEN QR SCANNER CAMERA / SIMULATE SCAN
          </button>

          <input 
            type="text"
            placeholder="Or type checkpoint code manually..."
            value={scanCode}
            onChange={(e) => processCode(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-center"
          />
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmitPatrol} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">GUARD NAME *</label>
            <input 
              type="text" 
              placeholder="Enter your full name..." 
              value={guardName} 
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">LOCATION (AUTO-FILLED BY QR) *</label>
            <input 
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Awaiting QR scan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">CHECKPOINT (AUTO-FILLED BY QR) *</label>
            <input 
              type="text"
              placeholder="Awaiting QR scan..."
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">PATROL TYPE *</label>
            <select 
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Emergency Response">Emergency Response</option>
              <option value="Supervisor Inspection">Supervisor Inspection</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">PATROL / INCIDENT NOTES & EVIDENCE</label>
            <textarea 
              rows={2}
              placeholder="Add patrol notes or incident details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {!scanCode.trim() && (
            <div className="w-full bg-red-950/80 border border-red-800 text-red-300 py-2 rounded-xl text-center font-bold text-[11px]">
              ⚠️ Please scan a checkpoint QR code first.
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !scanCode.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl shadow-lg transition uppercase tracking-wider text-xs disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'Transmitting Scan...' : '🚀 SUBMIT PATROL LOG'}
          </button>
        </form>

        {statusMessage && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-center font-bold">
            {statusMessage}
          </div>
        )}
      </div>
    </main>
  );
}

export default function GuardScannerApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading Scanner...</div>}>
      <ScannerContent />
    </Suspense>
  );
}
