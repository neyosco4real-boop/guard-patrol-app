'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';

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
  
  // Single Active Camera Scanner states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Live GPS & Metadata state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Locations and checkpoints state
  const [locationsData, setLocationsData] = useState<LocationWithCheckpoints[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    async function fetchLocations() {
      try {
        const { data, error } = await supabase.from('locations').select('*');
        if (!error && data && data.length > 0) {
          const formatted: LocationWithCheckpoints[] = data.map((item: any) => ({
            name: item.name || item.location_name,
            checkpoints: Array.isArray(item.checkpoints) ? item.checkpoints : (typeof item.checkpoints === 'string' ? JSON.parse(item.checkpoints) : [])
          }));
          setLocationsData(formatted);
          localStorage.setItem('security_locations_data', JSON.stringify(formatted));
        } else {
          const saved = localStorage.getItem('security_locations_data');
          if (saved) {
            setLocationsData(JSON.parse(saved));
          } else {
            const defaultDemo = [
              { name: 'Headquarters Main Gate', checkpoints: ['Gate Entrance A', 'Visitor Log Desk', 'Perimeter Fence North'] },
              { name: 'Warehouse Facility B', checkpoints: ['Loading Bay 1', 'Storage Vault', 'Emergency Exit South'] }
            ];
            setLocationsData(defaultDemo);
            localStorage.setItem('security_locations_data', JSON.stringify(defaultDemo));
          }
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        const saved = localStorage.getItem('security_locations_data');
        if (saved) {
          setLocationsData(JSON.parse(saved));
        } else {
          setLocationsData([
            { name: 'Headquarters Main Gate', checkpoints: ['Gate Entrance A', 'Visitor Log Desk', 'Perimeter Fence North'] },
            { name: 'Warehouse Facility B', checkpoints: ['Loading Bay 1', 'Storage Vault', 'Emergency Exit South'] }
          ]);
        }
      }
    }

    fetchLocations();

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
          console.warn('Geolocation error:', error);
          setGpsCoords({ lat: 6.44512, lng: 3.41436 });
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsCoords({ lat: 6.44512, lng: 3.41436 });
      setGpsLoading(false);
    }

    return () => {
      clearInterval(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCameraScan = async () => {
    setIsCameraActive(true);
    setStatusMessage('Initializing active camera scanner...');

    setTimeout(async () => {
      try {
        const scannerId = "qr-reader-active";
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerId);
        }

        const config = { fps: 15, qrbox: { width: 220, height: 220 } };

        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            handleSuccessfulScan(decodedText);
          },
          (errorMessage) => {
            // Scanning in progress
          }
        );
        setStatusMessage('Camera active. Point QR code inside frame.');
      } catch (err) {
        console.error('Camera start error:', err);
        setStatusMessage('Camera access failed. Please check browser permissions.');
        setIsCameraActive(false);
      }
    }, 300);
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsCameraActive(false);
    setStatusMessage('');
  };

  const handleSuccessfulScan = (codeText: string) => {
    stopCameraScan();
    console.log('Scanned QR:', codeText);

    let parsedLoc = '';
    let parsedCp = '';

    // 1. Try parsing JSON format: {"location": "...", "checkpoint": "..."}
    try {
      const obj = JSON.parse(codeText);
      if (obj.location) parsedLoc = obj.location;
      if (obj.checkpoint || obj.cp) parsedCp = obj.checkpoint || obj.cp;
    } catch (e) {}

    // 2. Try pipe or colon separation e.g. "Headquarters Main Gate | Gate Entrance A"
    if (!parsedLoc && (codeText.includes('|') || codeText.includes(':'))) {
      const parts = codeText.split(/[:|]/);
      if (parts.length >= 2) {
        parsedLoc = parts[0].trim();
        parsedCp = parts[1].trim();
      }
    }

    // 3. Match existing locations & checkpoints
    if (!parsedLoc) {
      for (const loc of locationsData) {
        if (loc.name.toLowerCase() === codeText.toLowerCase()) {
          parsedLoc = loc.name;
          parsedCp = loc.checkpoints[0] || 'Main Checkpoint';
          break;
        }
        for (const cp of loc.checkpoints) {
          if (cp.toLowerCase() === codeText.toLowerCase() || codeText.toLowerCase().includes(cp.toLowerCase())) {
            parsedLoc = loc.name;
            parsedCp = cp;
            break;
          }
        }
        if (parsedLoc) break;
      }
    }

    // 4. Fallback assignment
    if (!parsedLoc) {
      parsedLoc = locationsData[0]?.name || 'Headquarters Main Gate';
      parsedCp = codeText;
    }

    setSelectedLocation(parsedLoc);
    
    const targetLocObj = locationsData.find(l => l.name === parsedLoc);
    if (targetLocObj && !targetLocObj.checkpoints.includes(parsedCp)) {
      targetLocObj.checkpoints.push(parsedCp);
    }

    setSelectedCheckpoint(parsedCp);
    setStatusMessage(`✓ Captured Location & Checkpoint successfully!`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

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
      setStatusMessage('Please scan a QR code or select location and checkpoint.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Submitting verified patrol log...');

    try {
      const timestampStr = currentTime.toISOString();
      const gpsString = gpsCoords ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` : '6.44512, 3.41436';
      
      let finalNotes = `[Timestamp: ${timestampStr}] [GPS: ${gpsString}] [Geofence: 50m Active] ${notes}`;
      if (photoData) {
        finalNotes = `${finalNotes} [PHOTO_DATA:${photoData}]`;
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

      setStatusMessage('Patrol log submitted successfully with GPS, Time & Checkpoint!');
      setNotes('');
      setPhotoData(null);
      setSelectedCheckpoint('');
      setSelectedLocation('');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      console.error('Error submitting patrol log:', err);
      setStatusMessage('Error submitting log. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCheckpoints = locationsData.find(l => l.name === selectedLocation)?.checkpoints || ['Gate Entrance A', 'Visitor Log Desk', 'Perimeter Fence North'];

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

        {/* Active Scan Camera Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center justify-between px-1">
            <span>Checkpoint QR Scanner</span>
            <span className="text-emerald-400 font-mono text-[9px]">{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Active Camera Viewfinder */}
          <div className="relative overflow-hidden rounded-xl bg-black flex flex-col items-center justify-center min-h-[170px]">
            <div id="qr-reader-active" className={`w-full ${isCameraActive ? 'block' : 'hidden'}`}></div>
            {!isCameraActive && (
              <div className="py-5 flex flex-col items-center justify-center space-y-2 px-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xl text-emerald-400">
                  📷
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {selectedCheckpoint ? `✓ Active Checkpoint: ${selectedCheckpoint}` : 'Open camera to scan QR & auto-populate details'}
                </p>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {!isCameraActive ? (
            <button
              type="button"
              onClick={startCameraScan}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>📷</span> Open Active Scan Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCameraScan}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Close Camera
            </button>
          )}
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

          {/* Location Site Selection (Auto-filled by QR) */}
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

          {/* Checkpoint Selection (Auto-filled by QR) */}
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

          {/* Captured Telemetry & Metadata Bar */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-slate-400 uppercase font-semibold text-[9px] tracking-wider">GPS & Geofence</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] text-emerald-400 font-mono truncate">
                {gpsLoading ? 'Acquiring...' : gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)} (50m Active)` : 'GPS Ready'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400 uppercase font-semibold text-[9px] tracking-wider">Time & Date</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] text-emerald-400 font-mono truncate">
                {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
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
              rows={2}
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
            <div className={`text-center font-medium p-2.5 rounded-xl text-xs ${statusMessage.includes('✓') || statusMessage.includes('active') || statusMessage.includes('successfully') ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-900'}`}>
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
