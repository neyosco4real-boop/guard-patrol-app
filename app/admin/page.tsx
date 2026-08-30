'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [filter, setFilter] = useState('all');
  const [latestAlertId, setLatestAlertId] = useState<string | null>(null);

  // Audio Context Ref for Alarm
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playEmergencySiren = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      // Frequency sweep for siren effect
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.3);
      osc.frequency.linearRampToValueAtTime(400, now + 0.6);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const fetchAlerts = () => {
    const cached = localStorage.getItem('tom_salem_patrol_alerts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) {
          const newest = parsed[0];
          const newestId = newest.createdAt || newest.id;
          if (latestAlertId && newestId !== latestAlertId) {
            // New scan detected! Check if incident or geofence breach (> 500m or custom check)
            // Tom Salem HQ reference coords: 6.44508, 3.41434
            const dist = getDistanceFromLatLonInKm(6.44508, 3.41434, newest.lat || 6.44508, newest.lng || 3.41434);
            const isGeofenceBreach = dist > 0.5; // > 500 meters

            if (newest.isIncident || isGeofenceBreach) {
              playEmergencySiren();
            }
          }
          setLatestAlertId(newestId);
        }
        setAlerts(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2500);
    return () => clearInterval(interval);
  }, [latestAlertId]);

  // Haversine formula for geofence check
  function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  const handleClearFeed = () => {
    if (confirm('Are you sure you want to clear all patrol logs?')) {
      localStorage.removeItem('tom_salem_patrol_alerts');
      setAlerts([]);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'incident') return alert.isIncident;
    if (filter === 'normal') return !alert.isIncident;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full mb-2 animate-pulse">
            <span>● Tom Salem Security Operations — Real-Time Live Feed Active</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-white">Guard Patrol Live Command</h1>
          <p className="text-xs text-slate-400 mt-1">
            Live streaming dashboard tracking checkpoint verifications, date & time stamps, precise GPS coordinates, geofence status, and photo evidence instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/checkpoints"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md"
          >
            Site & Reports Command
          </Link>
          <Link
            href="/admin/qr-codes"
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer border border-white/10 transition-all"
          >
            QR Generator
          </Link>
        </div>
      </div>

      {/* Live Feed Table Section */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Live Patrol Activity & Telemetry Feed</h2>
            <div className="flex bg-slate-950 border border-white/10 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${filter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
              >
                All ({alerts.length})
              </button>
              <button
                onClick={() => setFilter('incident')}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${filter === 'incident' ? 'bg-red-500 text-white' : 'text-slate-400'}`}
              >
                Incidents
              </button>
              <button
                onClick={() => setFilter('normal')}
                className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${filter === 'normal' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                Normal
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/10 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleClearFeed}
              className="bg-red-950/40 hover:bg-red-900/40 text-red-400 text-xs font-bold px-3.5 py-2 rounded-xl border border-red-500/30 cursor-pointer transition-all"
            >
              🗑️ Clear Feed
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No patrol activity logged yet. Scan a QR code from the PWA client to stream live telemetry.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date/Time</th>
                  <th className="py-3 px-4">Guard Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Checkpoint</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Geofence</th>
                  <th className="py-3 px-4">Report Attached</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAlerts.map((alert, idx) => {
                  const dist = getDistanceFromLatLonInKm(6.44508, 3.41434, alert.lat || 6.44508, alert.lng || 3.41434);
                  const isOffsite = dist > 0.5;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-800/40 transition-colors ${idx === 0 ? 'animate-[pulse_2s_ease-in-out_1] bg-cyan-950/20' : ''}`}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                        {new Date(alert.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{alert.guardName || 'Officer'}</td>
                      <td className="py-3.5 px-4 text-slate-300">{alert.location || 'Tom Salem Head Office'}</td>
                      <td className="py-3.5 px-4 font-bold text-cyan-300">{alert.checkpointName || 'Front Gate'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        📍 {Number(alert.lat || 6.44508).toFixed(4)}, {Number(alert.lng || 3.41434).toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${isOffsite ? 'bg-amber-950 text-amber-400 border border-amber-500/30' : 'bg-emerald-950 text-emerald-400'}`}>
                          {isOffsite ? '⚠️ Offsite (>500m)' : '✓ In-Geofence'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold ${alert.mediaUrl ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'text-slate-500'}`}>
                          {alert.mediaUrl ? '📷 Yes' : 'None'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] uppercase tracking-wider ${alert.isIncident || isOffsite ? 'bg-red-950 text-red-400 border border-red-500/30 animate-pulse' : 'bg-emerald-950 text-emerald-400'}`}>
                          {alert.isIncident ? '🚨 Incident' : isOffsite ? '🚨 Offsite Breach' : '✓ Normal'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-400">Patrol Telemetry Details</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">Date / Time:</span>
                <span className="font-mono text-white">{new Date(selectedAlert.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">Guard Officer:</span>
                <span className="font-bold text-white">{selectedAlert.guardName}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">Parent Location:</span>
                <span className="font-bold text-cyan-300">{selectedAlert.location || 'Tom Salem Head Office'}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">Assigned Checkpoint:</span>
                <span className="font-bold text-cyan-300">{selectedAlert.checkpointName}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">GPS Coordinates:</span>
                <span className="font-mono text-slate-300">Lat: {selectedAlert.lat}, Lng: {selectedAlert.lng}</span>
              </div>
              <div className="flex justify-between bg-slate-950 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 uppercase font-semibold">Geofence Status:</span>
                <span className="font-bold text-amber-400">
                  {getDistanceFromLatLonInKm(6.44508, 3.41434, selectedAlert.lat || 6.44508, selectedAlert.lng || 6.44508) > 0.5 ? '⚠️ Offsite Breach (>500m)' : '✓ In-Geofence'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 uppercase font-semibold mb-1">Notes / Incident Report:</span>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5 text-slate-200 font-mono">
                  {selectedAlert.notes}
                </div>
              </div>

              {selectedAlert.mediaUrl && (
                <div>
                  <span className="block text-slate-400 uppercase font-semibold mb-1">Attached Incident Photo:</span>
                  <div className="bg-slate-950 p-2 rounded-xl border border-white/5 flex justify-center">
                    <img
                      src={selectedAlert.mediaUrl}
                      alt="Incident Evidence"
                      className="max-h-56 rounded-lg object-contain border border-white/10"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold py-3 rounded-xl uppercase tracking-wider text-xs cursor-pointer"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
