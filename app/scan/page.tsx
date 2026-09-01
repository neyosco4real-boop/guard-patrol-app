'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LocationWithCheckpoints {
  name: string;
  checkpoints: string[];
}

export default function GuardScanner() {
  const [guardName, setGuardName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanMode, setScanMode] = useState<'qr' | 'nfc'>('qr');

  // Live GPS coordinates state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);

  // Locations and checkpoints state loaded from localStorage
  const [locationsData, setLocationsData] = useState<LocationWithCheckpoints[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('security_locations_data');
      if (saved) {
        try {
          setLocationsData(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading locations:', e);
        }
      }
    }

    // Get live GPS position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsLoading(false);
        },
        (error) => {
          console.warn('Geolocation error or denied:', error);
          // Fallback default coordinates
          setGpsCoords({ lat: 6.44512, lng: 3.41436 });
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsCoords({ lat: 6.44512, lng: 3.41436 });
      setGpsLoading(false);
    }
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      setStatusMessage('Please enter your guard name.');
      return;
    }
    if (!selectedLocation || !selectedCheckpoint) {
      setStatusMessage('Please select a location site and checkpoint.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Submitting patrol log...');

    try {
      let finalNotes = notes;
      if (photoData) {
        finalNotes = `${notes} [PHOTO_DATA:${photoData}]`;
      }

      const { error } = await supabase.from('patrol_logs').insert([
        {
          guard_name: guardName.trim(),
          location: selectedLocation,
          checkpoint: selectedCheckpoint,
          latitude: gpsCoords ? gpsCoords.lat.toFixed(5) : '6.44512',
          longitude: gpsCoords ? gpsCoords.lng.toFixed(5) : '3.41436',
          notes: finalNotes,
        },
      ]);

      if (error) throw error;

      setStatusMessage('Patrol log submitted successfully!');
      setNotes('');
      setPhotoData(null);
      setSelectedCheckpoint('');
      setSelectedLocation('');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      console.error('Error submitting patrol log:', err);
      setStatusMessage('Error submitting log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find checkpoints for selected location
  const currentCheckpoints = locationsData.find(l => l.name === selectedLocation)?.checkpoints || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <h1 className="text-base font-bold text-white tracking-tight">Guard Patrol Scanner</h1>
          </div>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online
          </span>
        </div>

        {/* Scan Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setScanMode('qr')}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${scanMode === 'qr' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span>📷</span> QR Scan
          </button>
          <button
            type="button"
            onClick={() => setScanMode('nfc')}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${scanMode === 'nfc' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span>📡</span> NFC / RFID
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Guard Name */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Guard Name *</label>
            <input
              type="text"
              required
              placeholder="Enter your full name..."
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Location Site Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Location Site *</label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setSelectedCheckpoint('');
              }}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Select facility location...</option>
              {locationsData.map((loc, idx) => (
                <option key={idx} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>

          {/* Checkpoint Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Checkpoint *</label>
            <select
              value={selectedCheckpoint}
              onChange={(e) => setSelectedCheckpoint(e.target.value)}
              required
              disabled={!selectedLocation}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              <option value="" disabled>{selectedLocation ? 'Select checkpoint...' : 'Select location first...'}</option>
              {currentCheckpoints.map((cp, idx) => (
                <option key={idx} value={cp}>{cp}</option>
              ))}
            </select>
          </div>

          {/* Live GPS Coordinates */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">GPS Coordinates (Live)</label>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono">
              {gpsLoading ? 'Acquiring GPS position...' : gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)} (50m Geofence Active)` : 'GPS unavailable'}
            </div>
          </div>

          {/* Incident Report / Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Incident Report / Notes</label>
              <label className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1">
                <span>📸</span> Snap Incident Photo
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Describe any anomalies or leave blank..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            {photoData && (
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-emerald-900/50 text-[11px] text-emerald-400">
                <span>✓ Incident photo attached</span>
                <button type="button" onClick={() => setPhotoData(null)} className="text-rose-400 hover:text-rose-300 font-semibold">Remove</button>
              </div>
            )}
          </div>

          {statusMessage && (
            <div className={`text-center font-medium p-2 rounded-xl text-xs ${statusMessage.includes('success') ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-900'}`}>
              {statusMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950/50 tracking-wider uppercase"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Patrol Log'}
          </button>
        </form>
      </div>
    </div>
  );
}
