'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface PatrolLog {
    id: string;
    guard_id?: string;
    guard_name: string;
    location: string;
    checkpoint: string;
    geofence: string;
    latitude: string;
    longitude: string;
    status?: string;
    incident_type?: string;
    severity?: string;
    notes: string;
    attachment_url?: string;
    verified?: boolean;
    created_at: string;
    updated_at?: string;
    incident_photo?: string;
    geofence_status?: string;
    gps?: string;
}

interface LocationItem {
    name: string;
    checkpoints: string[];
}

type QrSelection = { location: string; checkpoint: string } | null;


type CpInputsMap = Record<string, string>;

export default function AdminDashboard() {
  const [logs, setLogs] = useState<PatrolLog[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLocName, setNewLocName] = useState('');
  const [selectedParentLoc, setSelectedParentLoc] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [inlineCpInputs, setInlineCpInputs] = useState<CpInputsMap>({});
  const [statusMsg, setStatusMsg] = useState('');
  const [activeQrCp, setActiveQrCp] = useState<QrSelection>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<PatrolLog | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);

  // Auto-refresh feeds in the background every 10 seconds without resetting UI
  // Instant real-time WebSocket listener for immediate log delivery
  useEffect(() => {
    const channel = supabase
      .channel('public:patrol_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'patrol_logs' },
        (payload) => {
          setLogs((prevLogs) => [payload.new as PatrolLog, ...prevLogs]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
// Handle deleting a checkpoint from a location
  const handleDeleteCheckpoint = async (locationName: string, checkpointName: string) => {
    try {
      const updatedLocations = locations.map(loc => {
        if (loc.name === locationName) {
          return {
            ...loc,
            checkpoints: loc.checkpoints.filter(cp => cp !== checkpointName)
          };
        }
        return loc;
      });

      setLocations(updatedLocations);

      // Update Supabase database accordingly
      const { error } = await supabase
        .from('locations') // Adjust table name if yours differs
        .update({ checkpoints: updatedLocations.find(l => l.name === locationName)?.checkpoints })
        .eq('name', locationName);

      if (error) console.error('Error deleting checkpoint:', error);
    } catch (err) {
      console.error('Failed to delete checkpoint:', err);
    }
  };

  // Handle adding a new inline checkpoint via form input
  const handleAddInlineCheckpoint = async (locationName: string, e: React.FormEvent) => {
    e.preventDefault();
    const newCp = inlineCpInputs[locationName]?.trim();
    if (!newCp) return;

    try {
      const updatedLocations = locations.map(loc => {
        if (loc.name === locationName) {
          if (loc.checkpoints.includes(newCp)) return loc; // Prevent duplicates
          return {
            ...loc,
            checkpoints: [...loc.checkpoints, newCp]
          };
        }
        return loc;
      });

      setLocations(updatedLocations);
      // Clear the input field for this specific location
      setInlineCpInputs({ ...inlineCpInputs, [locationName]: '' });

      // Update Supabase database accordingly
      const { error } = await supabase
        .from('locations')
        .update({ checkpoints: updatedLocations.find(l => l.name === locationName)?.checkpoints })
        .eq('name', locationName);

      if (error) console.error('Error adding checkpoint:', error);
    } catch (err) {
      console.error('Failed to add checkpoint:', err);
    }
  };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* 1. Dashboard Header & Controls */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Guard Patrol Dashboard</h1>
          <p className="text-xs text-slate-400">Real-time checkpoint monitoring system</p>
        </div>
      </header>

      {/* 2. Main Locations & Checkpoints Grid Mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="font-bold text-sm text-emerald-400">{loc.name}</h3>
            
            <div className="space-y-2">
              {loc.checkpoints?.map((cp, cpidx) => (
                <div key={cpidx} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                  <span className="text-slate-200 truncate">📍 {cp}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setActiveQrCp({ location: loc.name, checkpoint: cp })} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">QR</button>
                    <button onClick={() => handleDeleteCheckpoint(loc.name, cp)} className="text-[10px] bg-red-950/40 hover:bg-red-900/60 text-red-400 px-2 py-1 rounded-lg">Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={(e) => handleAddInlineCheckpoint(loc.name, e)} className="pt-3 border-t border-slate-800 flex gap-2">
              <input 
                type="text" 
                placeholder="Add checkpoint..." 
                value={inlineCpInputs[loc.name] || ''} 
                onChange={(e) => setInlineCpInputs({ ...inlineCpInputs, [loc.name]: e.target.value })} 
                className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 text-slate-200 w-full focus:outline-none focus:border-emerald-500"
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0">+</button>
            </form>
          </div>
        ))}
      </div>

      {/* 3. Log Details Modal (Safe Render Scope with Scoped Parsing) */}
      {selectedLogDetail && (() => {
        let rawNotes = selectedLogDetail.notes || '';
        let extractedImg: string | null = selectedLogDetail.attachment_url ?? null;
        if (!extractedImg && rawNotes.includes('[PHOTO_DATA:]')) {
          const parts = rawNotes.split('[PHOTO_DATA:]');
          rawNotes = parts[0].trim();
          extractedImg = parts[1] ? parts[1].trim() : null;
        }

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Patrol Log Details</span>
                  <h3 className="text-base font-extrabold text-white">{selectedLogDetail.guard_name}</h3>
                </div>
                <button onClick={() => setSelectedLogDetail(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl">
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Facility Location</span>
                  <span className="text-white font-semibold">{selectedLogDetail.location}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-mono text-slate-200">{new Date(selectedLogDetail.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Notes</span>
                  <p className="text-slate-200 mt-1 whitespace-pre-wrap">{rawNotes}</p>
                </div>
                {extractedImg && (
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-2">Attached Photo</span>
                    <img src={extractedImg} alt="Patrol attachment" className="rounded-xl max-h-48 w-object-contain border border-slate-800" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}