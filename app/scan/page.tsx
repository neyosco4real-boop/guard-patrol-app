'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';

export default function GuardScanner() {
  const [guardName, setGuardName] = useState('');
  const [scannedLocation, setScannedLocation] = useState('');
  const [scannedCheckpoint, setScannedCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState<'Normal' | 'Incident'>('Normal');
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setGpsLoading(false);
        },
        (error) => {
          console.warn('GPS error:', error);
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
    setStatusMessage('Starting active QR camera...');

    setTimeout(async () => {
      try {
        const scannerId = "guard-qr-reader";
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerId);
        }

        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleSuccessfulScan(decodedText);
          },
          (errorMessage) => {}
        );
        setStatusMessage('Camera active. Point at checkpoint QR tag.');
      } catch (err) {
        console.error('Camera start error:', err);
        setStatusMessage('Camera error. Please verify browser permissions.');
        setIsCameraActive(false);
      }
    }, 250);
  };

  const stopCameraScan = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
    }
    setIsCameraActive(false);
    setStatusMessage('');
  };

  const handleSuccessfulScan = (codeText: string) => {
    stopCameraScan();

    let parsedLoc = '';
    let parsedCp = '';

    try {
      const obj = JSON.parse(codeText);
      if (obj.location) parsedLoc = obj.location;
      if (obj.checkpoint || obj.cp) parsedCp = obj.checkpoint || obj.cp;
    } catch (e) {}

    if (!parsedLoc && (codeText.includes('|') || codeText.includes(':'))) {
      const parts = codeText.split(/[:|]/);
      if (parts.length >= 2) {
        parsedLoc = parts[0].trim();
        parsedCp = parts[1].trim();
      }
    }

    if (!parsedLoc) {
      parsedLoc = 'Headquarters Facility';
      parsedCp = codeText;
    }

    setScannedLocation(parsedLoc);
    setScannedCheckpoint(parsedCp);
    setStatusMessage(`✓ Successfully Captured: ${parsedCp} @ ${parsedLoc}`);
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
      setStatusMessage('Please enter your Guard Name.');
      return;
    }
    if (!scannedLocation || !scannedCheckpoint) {
      setStatusMessage('Please scan a checkpoint QR code first.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Submitting log to Admin live feed...');

    try {
      let finalNotes = notes.trim() ? notes.trim() : '';
      if (photoData) {
        finalNotes = finalNotes ? `${finalNotes} [PHOTO_DATA:${photoData}]` : `[PHOTO_DATA:${photoData}]`;
      }

      const { error } = await supabase.from('patrol_logs').insert([
        {
          guard_name: guardName.trim(),
          location: scannedLocation,
          checkpoint: scannedCheckpoint,
          latitude: gpsCoords ? gpsCoords.lat.toFixed(5) : '6.44512',
          longitude: gpsCoords ? gpsCoords.lng.toFixed(5) : '3.41436',
          notes: finalNotes,
        },
      ]);

      if (error) throw error;

      setStatusMessage('Patrol log submitted successfully to Admin live feed!');
      setNotes('');
      setPhotoData(null);
      setScannedLocation('');
      setScannedCheckpoint('');
      setPatrolType('Normal');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      console.error('Submission error:', err);
      setStatusMessage('Error submitting patrol log. Check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <h1 className="text-base font-bold text-white tracking-tight">Guard Patrol Scanner</h1>
          </div>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Feed Connected
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center justify-between px-1">
            <span>QR Code Checkpoint Scanner</span>
            <span className="text-emerald-400 font-mono text-[9px]">{currentTime.toLocaleTimeString()}</span>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-black flex flex-col items-center justify-center min-h-[180px]">
            <div id="guard-qr-reader" className={`w-full ${isCameraActive ? 'block' : 'hidden'}`}></div>
            {!isCameraActive && (
              <div className="py-5 flex flex-col items-center justify-center space-y-2 px-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xl text-emerald-400">
                  📷
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {scannedCheckpoint ? `✓ Captured: ${scannedCheckpoint}` : 'Open scanner to read checkpoint QR code'}
                </p>
              </div>
            )}
          </div>

          {!isCameraActive ? (
            <button
              type="button"
              onClick={startCameraScan}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-md uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <span>📷</span> Open QR Scanner Camera
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Location (Auto-Filled by QR) *</label>
            <input
              type="text"
              readOnly
              required
              placeholder="Awaiting QR scan..."
              value={scannedLocation}
              className="w-full bg-slate-950/90 border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium cursor-not-allowed placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Checkpoint (Auto-Filled by QR) *</label>
            <input
              type="text"
              readOnly
              required
              placeholder="Awaiting QR scan..."
              value={scannedCheckpoint}
              className="w-full bg-slate-950/90 border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium cursor-not-allowed placeholder-slate-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Patrol Type *</label>
            <select
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value as 'Normal' | 'Incident')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="Normal">Normal Patrol</option>
              <option value="Incident">Incident Patrol</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Patrol / Incident Notes & Evidence</label>
              <label className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1">
                <span>📸</span> Snap Evidence Photo
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
              </label>
            </div>
            <textarea
              rows={2}
              placeholder="Add patrol notes or incident details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
            {photoData && (
              <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-emerald-900/50 text-[11px] text-emerald-400">
                <span>✓ Evidence photo attached</span>
                <button type="button" onClick={() => setPhotoData(null)} className="text-rose-400 hover:text-rose-300 font-semibold">Remove</button>
              </div>
            )}
          </div>

          {statusMessage && (
            <div className={`text-center font-medium p-2.5 rounded-xl text-xs ${statusMessage.includes('✓') || statusMessage.includes('active') || statusMessage.includes('successfully') ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-900'}`}>
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs transition-colors shadow-lg tracking-wider uppercase"
          >
            {isSubmitting ? 'Submitting to Admin...' : 'Submit Patrol Log'}
          </button>
        </form>
      </div>
    </div>
  );
}
