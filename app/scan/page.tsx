'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateDistanceMeters } from '@/utils/geofence';
import jsQR from 'jsqr';

interface QueuedPatrol {
  id: string;
  guard_name: string;
  location: string;
  checkpoint: string;
  latitude: string;
  longitude: string;
  notes: string;
  timestamp: string;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const [guardName, setGuardName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  
  // Camera & NFC scanner states
  const [scanningQR, setScanningQR] = useState(false);
  const [capturingIncident, setCapturingIncident] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const incidentVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Target base coordinates
  const targetLat = 6.44511;
  const targetLng = 3.41430;

  useEffect(() => {
    const loc = searchParams.get('loc') || '';
    const cp = searchParams.get('cp') || '';
    if (loc) setLocationName(loc);
    if (cp) setCheckpointName(cp);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    updateQueueCount();

    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(5));
          setLng(position.coords.longitude.toFixed(5));
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [searchParams]);

  const updateQueueCount = () => {
    try {
      const queue: QueuedPatrol[] = JSON.parse(localStorage.getItem('patrol_offline_queue') || '[]');
      setOfflineQueueCount(queue.length);
    } catch {
      setOfflineQueueCount(0);
    }
  };

  // Sync offline queue when coming online
  useEffect(() => {
    if (isOnline) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  const syncOfflineQueue = async () => {
    try {
      const queue: QueuedPatrol[] = JSON.parse(localStorage.getItem('patrol_offline_queue') || '[]');
      if (queue.length === 0) return;

      const remaining: QueuedPatrol[] = [];
      for (const item of queue) {
        const { error } = await supabase.from('patrol_logs').insert([{
          guard_name: item.guard_name,
          location: item.location,
          checkpoint: item.checkpoint,
          latitude: item.latitude,
          longitude: item.longitude,
          notes: item.notes + ' [Synced Offline]'
        }]);
        if (error) {
          remaining.push(item);
        }
      }
      localStorage.setItem('patrol_offline_queue', JSON.stringify(remaining));
      updateQueueCount();
      if (queue.length > remaining.length) {
        setSuccessMsg(`Successfully synced ${queue.length - remaining.length} offline patrol logs!`);
      }
    } catch (e) {
      console.error('Offline sync error:', e);
    }
  };

  // Web NFC Scanning
  const startNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      alert('Web NFC is not supported on this device/browser (try Chrome on Android).');
      return;
    }
    try {
      setNfcScanning(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      ndef.onreading = (event: any) => {
        const decoder = new TextDecoder();
        for (const record of event.message.records) {
          const text = decoder.decode(record.data);
          setCheckpointName(text);
          if (!locationName) setLocationName('Main Site');
        }
        setNfcScanning(false);
        playBeep();
      };
      ndef.onreadingerror = () => {
        alert('Cannot read NFC tag. Try again.');
        setNfcScanning(false);
      };
    } catch (error) {
      alert('NFC scan failed to start: ' + error);
      setNfcScanning(false);
    }
  };

  // Web Audio Beep on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880; // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // QR Scanning Loop
  useEffect(() => {
    let animationFrameId: number;

    const scanFrame = () => {
      if (scanningQR && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code) {
              const scannedText = code.data.trim();
              try {
                if (scannedText.startsWith('{')) {
                  const parsed = JSON.parse(scannedText);
                  if (parsed.location || parsed.loc) setLocationName(parsed.location || parsed.loc);
                  if (parsed.checkpoint || parsed.cp || parsed.name) setCheckpointName(parsed.checkpoint || parsed.cp || parsed.name);
                } else if (scannedText.includes('loc=') || scannedText.includes('cp=')) {
                  const urlParams = new URLSearchParams(scannedText.includes('?') ? scannedText.split('?')[1] : scannedText);
                  const loc = urlParams.get('loc');
                  const cp = urlParams.get('cp');
                  if (loc) setLocationName(loc);
                  if (cp) setCheckpointName(cp);
                } else if (scannedText.includes('|')) {
                  const parts = scannedText.split('|');
                  let foundLoc = '';
                  let foundCp = '';
                  parts.forEach(part => {
                    const trimmed = part.trim();
                    const lower = trimmed.toLowerCase();
                    if (lower.startsWith('loc') || lower.includes('site') || lower.includes('location')) {
                      foundLoc = trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : trimmed;
                    } else if (lower.startsWith('cp') || lower.includes('checkpoint') || lower.includes('gate')) {
                      foundCp = trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : trimmed;
                    }
                  });
                  if (!foundLoc && parts[0]) foundLoc = parts[0].replace(/location:/i, '').trim();
                  if (!foundCp && parts[1]) foundCp = parts[1].replace(/checkpoint:/i, '').trim();
                  if (foundLoc) setLocationName(foundLoc);
                  if (foundCp) setCheckpointName(foundCp);
                } else if (scannedText.includes(':')) {
                  const [key, ...valParts] = scannedText.split(':');
                  const val = valParts.join(':').trim();
                  if (key.toLowerCase().includes('loc')) {
                    setLocationName(val);
                  } else {
                    setCheckpointName(val);
                  }
                } else {
                  setCheckpointName(scannedText);
                  if (!locationName) setLocationName('Main Site');
                }
              } catch {
                setCheckpointName(scannedText);
              }

              playBeep();
              stopCamera();
              return;
            }
          }
        }
      }
      if (scanningQR) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    if (scanningQR) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [scanningQR, locationName]);

  const startCamera = async (type: 'qr' | 'incident') => {
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setMediaStream(stream);

      if (type === 'qr') {
        setScanningQR(true);
        setCapturingIncident(false);
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);
      } else {
        setCapturingIncident(true);
        setScanningQR(false);
        setTimeout(() => {
          if (incidentVideoRef.current) incidentVideoRef.current.srcObject = stream;
        }, 100);
      }
    } catch {
      alert('Unable to access camera. Please check camera permissions.');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setScanningQR(false);
    setCapturingIncident(false);
  };

  const captureIncidentSnap = () => {
    if (!incidentVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = incidentVideoRef.current.videoWidth || 640;
    canvas.height = incidentVideoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(incidentVideoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setIncidentPhoto(dataUrl);
    }
    stopCamera();
  };

  const handleSubmitPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      setErrorMsg('Please enter your guard name before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const currentLat = parseFloat(lat || '6.44511');
    const currentLng = parseFloat(lng || '3.41430');

    const distanceMeters = calculateDistanceMeters(targetLat, targetLng, currentLat, currentLng);
    const isOutsideGeofence = distanceMeters > 50;

    if (isOutsideGeofence) {
      setErrorMsg(`⚠️ GEOFENCE ALERT: You are ${Math.round(distanceMeters)}m away from the checkpoint! Maximum allowed radius is 50m. Log flagged as Unverified.`);
    }

    const payload = {
      id: 'patrol_' + Date.now(),
      guard_name: guardName.trim(),
      location: locationName || 'Main Site',
      checkpoint: checkpointName || 'General Checkpoint',
      latitude: currentLat.toString(),
      longitude: currentLng.toString(),
      notes: notes ? `${notes} [Distance: ${Math.round(distanceMeters)}m]${incidentPhoto ? ' [Has Photo]' : ''}` : `Distance: ${Math.round(distanceMeters)}m`
    };

    if (!isOnline) {
      try {
        const queue: QueuedPatrol[] = JSON.parse(localStorage.getItem('patrol_offline_queue') || '[]');
        queue.push(payload);
        localStorage.setItem('patrol_offline_queue', JSON.stringify(queue));
        updateQueueCount();
        setSuccessMsg('📴 Offline: Patrol log safely queued locally. Will auto-sync when online.');
        setNotes('');
        setIncidentPhoto(null);
      } catch (err: any) {
        setErrorMsg('Failed to queue offline patrol: ' + err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const { error } = await supabase.from('patrol_logs').insert([{
        guard_name: payload.guard_name,
        location: payload.location,
        checkpoint: payload.checkpoint,
        latitude: payload.latitude,
        longitude: payload.longitude,
        notes: payload.notes
      }]);
      if (error) throw error;

      if (!isOutsideGeofence) {
        setSuccessMsg('Patrol telemetry successfully recorded and verified within 50m radius.');
      }
      setNotes('');
      setIncidentPhoto(null);
    } catch (err: any) {
      // Fallback to queue if network drop occurs during submit
      try {
        const queue: QueuedPatrol[] = JSON.parse(localStorage.getItem('patrol_offline_queue') || '[]');
        queue.push(payload);
        localStorage.setItem('patrol_offline_queue', JSON.stringify(queue));
        updateQueueCount();
        setSuccessMsg('📴 Network interruption detected. Patrol saved to offline queue.');
      } catch {
        setErrorMsg(err.message || 'Failed to submit patrol log.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <h1 className="text-base font-bold text-white">Guard Patrol Scanner</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
              {isOnline ? '🟢 Online' : '📴 Offline'}
            </span>
            {offlineQueueCount > 0 && (
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-semibold">
                Queue: {offlineQueueCount}
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 text-xs p-3 rounded-lg mb-4 leading-relaxed font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-lg mb-4">
            {successMsg}
          </div>
        )}

        {scanningQR && (
          <div className="mb-6 bg-slate-950 border border-emerald-500/50 rounded-xl p-4 text-center">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Align Checkpoint QR Code in Frame</h3>
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-emerald-500/50 m-8 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                <span className="bg-black/60 text-emerald-300 text-[10px] px-2 py-1 rounded">Scanning QR...</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLocationName('Multichoice HQ');
                  setCheckpointName('Front Gate');
                  playBeep();
                  stopCamera();
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg"
              >
                Simulate Scan
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {nfcScanning && (
          <div className="mb-6 bg-slate-950 border border-blue-500/50 rounded-xl p-4 text-center animate-pulse">
            <h3 className="text-xs font-semibold text-blue-400 uppercase mb-2">Tap NFC / RFID Tag to Device Back</h3>
            <p className="text-xs text-slate-400 mb-3">Ready for contactless tag read...</p>
            <button
              type="button"
              onClick={() => setNfcScanning(false)}
              className="bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded-lg"
            >
              Cancel NFC
            </button>
          </div>
        )}

        {capturingIncident && (
          <div className="mb-6 bg-slate-950 border border-amber-500/50 rounded-xl p-4 text-center">
            <h3 className="text-xs font-semibold text-amber-400 uppercase mb-2">Live Incident Camera Capture</h3>
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3">
              <video ref={incidentVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={captureIncidentSnap}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2 rounded-lg"
              >
                Capture Photo
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!scanningQR && !capturingIncident && !nfcScanning && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => startCamera('qr')}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📷</span> QR Scan
            </button>
            <button
              type="button"
              onClick={startNfcScan}
              className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <span>📡</span> NFC / RFID
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitPatrol} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Guard Name *</label>
            <input
              type="text"
              required
              placeholder="Enter your full name..."
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location Site</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Auto-filled from QR / NFC scan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Checkpoint</label>
            <input
              type="text"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              placeholder="Auto-filled from QR / NFC scan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">GPS Coordinates (Live)</label>
            <input
              type="text"
              readOnly
              value={lat && lng ? `${lat}, ${lng} (50m Geofence Active)` : 'Acquiring GPS...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Incident Report / Notes</label>
              <button
                type="button"
                onClick={() => startCamera('incident')}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>📸</span> Snap Incident Photo
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Describe any anomalies or leave blank..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
            {incidentPhoto && (
              <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <img src={incidentPhoto} alt="Incident preview" className="w-12 h-12 object-cover rounded" />
                <span className="text-xs text-emerald-400 font-medium">Incident photo attached.</span>
                <button type="button" onClick={() => setIncidentPhoto(null)} className="ml-auto text-xs text-red-400 hover:underline">Remove</button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950/50"
          >
            {submitting ? 'Submitting Patrol...' : 'Submit Patrol Log'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-10 text-center">Loading Scanner...</div>}>
      <ScanContent />
    </Suspense>
  );
}
