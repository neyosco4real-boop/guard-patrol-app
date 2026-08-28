'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Checkpoint {
  id: string;
  site_id?: string;
  name: string;
  radius: string;
  lat?: number | null;
  lng?: number | null;
}

interface Site {
  id: string;
  name: string;
  checkpoints: Checkpoint[];
}

export default function GuardScannerPage() {
  const [guardName, setGuardName] = useState('');
  const [scannedCheckpoint, setScannedCheckpoint] = useState<Checkpoint | null>(null);
  const [matchedSite, setMatchedSite] = useState<Site | null>(null);
  
  // Patrol Modes
  const [patrolType, setPatrolType] = useState<'normal' | 'incident'>('normal');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  // Geofence & Status
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceVariance, setDistanceVariance] = useState<number | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Camera Capture Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const savedGuard = localStorage.getItem('guard_patrol_name');
    if (savedGuard) setGuardName(savedGuard);
  }, []);

  const handleGuardNameChange = (name: string) => {
    setGuardName(name);
    localStorage.setItem('guard_patrol_name', name);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleQRSuccess = async (decodedText: string) => {
    setIsScanningActive(false);

    const { data: dbCheckpoints } = await supabase.from('checkpoints').select('*');
    const { data: dbSites } = await supabase.from('sites').select('*');

    const matchedCp = dbCheckpoints?.find(
      (cp) => cp.name.trim().toLowerCase() === decodedText.trim().toLowerCase()
    );

    if (matchedCp) {
      setScannedCheckpoint(matchedCp);
      const site = dbSites?.find((s) => s.id === matchedCp.site_id);
      setMatchedSite(site || { id: 'default', name: 'Main Station', checkpoints: [] });
    } else {
      setScannedCheckpoint({
        id: 'manual-' + Date.now(),
        name: decodedText,
        radius: '50m'
      });
      setMatchedSite({ id: 'default', name: 'General Precinct', checkpoints: [] });
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setUserCoords({ lat: uLat, lng: uLng });

          if (matchedCp && matchedCp.lat && matchedCp.lng) {
            const dist = calculateDistance(uLat, uLng, matchedCp.lat, matchedCp.lng);
            setDistanceVariance(dist);
          }
        },
        () => console.warn("Location permission unavailable."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  useEffect(() => {
    if (!isScanningActive) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        handleQRSuccess(decodedText);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [isScanningActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera for photo proof.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (patrolType === 'incident' && !photoDataUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [patrolType, photoDataUrl]);

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.6));
      stopCamera();
    }
  };

  const handleSubmitReport = async () => {
    if (!guardName.trim()) {
      alert("Please enter Guard Name before submitting report.");
      return;
    }

    if (!scannedCheckpoint) {
      alert("Please scan a valid checkpoint QR code first.");
      return;
    }

    setSubmitting(true);

    let allowedRadiusMeters = 50;
    if (scannedCheckpoint.radius) {
      const parsed = parseInt(scannedCheckpoint.radius.replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) allowedRadiusMeters = parsed;
    }

    let finalStatus = 'VERIFIED';
    if (patrolType === 'incident') {
      finalStatus = 'INCIDENT';
    } else if (distanceVariance !== null && distanceVariance > allowedRadiusMeters) {
      finalStatus = 'REJECTED';
    }

    const payload = {
      guard_name: guardName.trim(),
      location_name: matchedSite?.name || 'Main Station',
      checkpoint_name: scannedCheckpoint.name,
      status: finalStatus,
      notes: patrolType === 'incident' ? 'Incident Reported' : 'Normal Patrol Scan',
      incident_notes: incidentNotes,
      photo_url: photoDataUrl || '',
      distance_meters: distanceVariance ? Math.round(distanceVariance) : 0,
      scanned_at: new Date().toISOString()
    };

    // DIRECT SUPABASE UPLOAD (Bypasses Local IndexedDB Downloads)
    const { error } = await supabase.from('patrol_logs').insert([payload]);

    if (error) {
      alert("Error submitting report: " + error.message);
      setToastMessage("❌ Failed to send scan to Command Dashboard.");
    } else {
      setToastMessage("⚡ Report Sent Live to Command Dashboard!");
    }

    setSubmitting(false);

    // Reset Form State
    setScannedCheckpoint(null);
    setPatrolType('normal');
    setIncidentNotes('');
    setPhotoDataUrl(null);
    setDistanceVariance(null);
    setIsScanningActive(true);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#070b18] text-white p-4 font-sans max-w-lg mx-auto space-y-5">
      
      {/* Top Header */}
      <div className="border-b border-[#1a233d] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Guard Patrol Terminal</h1>
          <p className="text-xs text-[#828cb0]">Direct Command Feed Scanner</p>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border bg-[#064e3b] text-[#10b981] border-[#10b981]/40">
          LIVE DIRECT FEED
        </span>
      </div>

      {/* Toast Pop-up Notification */}
      {toastMessage && (
        <div className="bg-[#0c1226] border-2 border-[#3b82f6] text-white p-3.5 rounded-xl text-xs font-bold shadow-2xl flex items-center justify-between animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white font-black">✕</button>
        </div>
      )}

      {/* Guard Name Input */}
      <div className="bg-[#0b1021] border border-[#1a233d] p-4 rounded-2xl space-y-2">
        <label className="text-xs font-bold text-[#828cb0] uppercase tracking-wider block">
          👮 Guard Identification
        </label>
        <input 
          type="text"
          placeholder="Enter Guard Full Name or ID..."
          value={guardName}
          onChange={(e) => handleGuardNameChange(e.target.value)}
          className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#3b82f6]"
        />
      </div>

      {/* Camera QR Reader */}
      {isScanningActive ? (
        <div className="bg-[#0b1021] border border-[#1a233d] p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#828cb0] uppercase">1. Scan Checkpoint QR</span>
            <span className="text-[10px] bg-[#2563eb] text-white px-2 py-0.5 rounded-full font-bold">CAMERA ACTIVE</span>
          </div>
          <div id="qr-reader-container" className="overflow-hidden rounded-xl bg-black border border-[#1a233d]"></div>
        </div>
      ) : (
        <div className="bg-[#0c1226] border border-[#3b82f6]/50 p-4 rounded-2xl space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#60a5fa] uppercase">📍 Checkpoint Scanned</span>
            <button 
              onClick={() => { setIsScanningActive(true); setScannedCheckpoint(null); }}
              className="text-xs text-[#ef4444] underline font-bold"
            >
              Rescan QR
            </button>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">{scannedCheckpoint?.name}</h3>
            <p className="text-xs text-[#828cb0]">{matchedSite?.name || 'Assigned Site'}</p>
          </div>

          {distanceVariance !== null && (
            <div className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center ${
              distanceVariance > (parseInt(scannedCheckpoint?.radius || '50', 10))
                ? 'bg-[#450a0a] border-[#ef4444] text-[#ef4444]'
                : 'bg-[#064e3b]/30 border-[#10b981] text-[#10b981]'
            }`}>
              <span>{distanceVariance > (parseInt(scannedCheckpoint?.radius || '50', 10)) ? '🚨 OUT OF STATION (Unverified)' : '✅ WITHIN STATION GEOFENCE'}</span>
              <span>{Math.round(distanceVariance)}m away</span>
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      {scannedCheckpoint && (
        <div className="bg-[#0b1021] border border-[#1a233d] p-4 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-[#828cb0] uppercase block">2. Select Patrol Status</span>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setPatrolType('normal')}
              className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                patrolType === 'normal' 
                  ? 'bg-[#2563eb] border-[#3b82f6] text-white shadow-lg' 
                  : 'bg-[#070b18] border-[#1e293b] text-[#828cb0]'
              }`}
            >
              🟢 Normal Patrol
            </button>
            <button 
              onClick={() => setPatrolType('incident')}
              className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                patrolType === 'incident' 
                  ? 'bg-[#f59e0b] border-[#f59e0b] text-black shadow-lg' 
                  : 'bg-[#070b18] border-[#1e293b] text-[#828cb0]'
              }`}
            >
              ⚠️ Report Incident
            </button>
          </div>

          {patrolType === 'incident' && (
            <div className="space-y-3 pt-2 border-t border-[#1a233d]">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#828cb0] uppercase">Note Incident Details</label>
                <textarea 
                  rows={3}
                  placeholder="Describe breach, hazard, or damaged checkpoint..."
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl p-3 text-xs text-white outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#828cb0] uppercase">Attach Photo Proof</label>
                {!photoDataUrl ? (
                  <div className="space-y-2">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-44 object-cover rounded-xl border border-[#1e293b] bg-black" />
                    <button 
                      type="button" 
                      onClick={takeSnapshot}
                      className="w-full py-2.5 bg-[#f59e0b] text-black font-extrabold text-xs rounded-xl shadow-md"
                    >
                      📸 Snap Photo Evidence
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <img src={photoDataUrl} alt="Incident Proof" className="w-full h-44 object-cover rounded-xl border border-[#f59e0b]" />
                    <button 
                      type="button" 
                      onClick={() => setPhotoDataUrl(null)}
                      className="w-full py-2 bg-[#1e293b] text-xs font-bold text-white rounded-xl"
                    >
                      Retake Photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <button 
            onClick={handleSubmitReport}
            disabled={submitting}
            className="w-full py-3.5 bg-[#10b981] hover:bg-[#059669] active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
          >
            {submitting ? 'Transmitting Scan Report...' : '📡 Send Scan Report Directly'}
          </button>
        </div>
      )}

    </div>
  );
}
