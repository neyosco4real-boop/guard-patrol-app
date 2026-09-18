'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Haversine formula for GPS geofencing verification
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function GuardPatrolScanner() {
  const [currentTime, setCurrentTime] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [guardName, setGuardName] = useState('');
  const [scannedLocation, setScannedLocation] = useState('');
  const [scannedCheckpoint, setScannedCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live Feed Scanner State
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    // Live clock update
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    fetchLocations();
    return () => clearInterval(timer);
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*');
    if (data) setLocations(data);
  };

  const startScanner = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(scanQRCode);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setScanError('Unable to access camera. Please check camera permissions.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          try {
            const parsedData = JSON.parse(code.data);
            if (parsedData.location && parsedData.checkpoint) {
              setScannedLocation(parsedData.location);
              setScannedCheckpoint(parsedData.checkpoint);
              setStatusMessage({ 
                text: `QR Scanned Successfully! Location & Checkpoint Auto-Filled.`, 
                type: 'success' 
              });
              stopScanner();
              return;
            }
          } catch {
            // Fallback: If raw text scanned, auto-fill checkpoint field
            setScannedCheckpoint(code.data);
            setScannedLocation('General Facility');
            setStatusMessage({ text: `Checkpoint Auto-Filled: ${code.data}`, type: 'success' });
            stopScanner();
            return;
          }
        }
      }
    }
    if (scanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName || !scannedLocation || !scannedCheckpoint) {
      setStatusMessage({ text: 'Please enter Guard Name and scan the Checkpoint QR code.', type: 'error' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    if (!navigator.geolocation) {
      setStatusMessage({ text: 'Geolocation is not supported by your browser.', type: 'error' });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const matchedLocation = locations.find((l) => l.name === scannedLocation);
        let geofenceStatus = 'Verified Within Radius';

        if (matchedLocation && matchedLocation.latitude && matchedLocation.longitude) {
          const distance = calculateDistanceMeters(lat, lng, Number(matchedLocation.latitude), Number(matchedLocation.longitude));
          const allowedRadius = matchedLocation.radius_meters || 100;

          if (distance > allowedRadius) {
            geofenceStatus = `⚠️ FRAUD: Out of Geofence Bounds (${Math.round(distance)}m away)`;
          }
        }

        let imageUrl = null;
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, imageFile);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('evidence').getPublicUrl(fileName);
            imageUrl = publicUrlData.publicUrl;
          }
        }

        const { error } = await supabase.from('guard_logs').insert([
          {
            guard_name: guardName,
            location: scannedLocation,
            checkpoint: scannedCheckpoint,
            patrol_type: patrolType,
            latitude: lat,
            longitude: lng,
            geofence_status: geofenceStatus,
            image_url: imageUrl,
            notes: notes || 'No reported issues',
          },
        ]);

        setLoading(false);
        if (error) {
          setStatusMessage({ text: `Error logging patrol: ${error.message}`, type: 'error' });
        } else {
          setStatusMessage({ text: 'Patrol report submitted successfully!', type: 'success' });
          setNotes('');
          setImageFile(null);
          setImagePreview(null);
          setScannedCheckpoint('');
          setScannedLocation('');
        }
      },
      (error) => {
        setLoading(false);
        setStatusMessage({ text: `GPS Error: ${error.message}. Please enable location permissions.`, type: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex justify-center">
      <div className="w-full max-w-sm space-y-4">
        
        {/* Top Header Card matching the exact requested UI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-500 shadow-inner">
              🛡️
            </div>
            <div>
              <h1 className="text-sm font-black uppercase text-white tracking-wide">Guard Patrol Scanner</h1>
            </div>
          </div>
          <div className="bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Live Feed Connected</span>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-bold ${statusMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-red-950/80 border border-red-800 text-red-300'}`}>
            {statusMessage.text}
          </div>
        )}

        {/* QR Code Checkpoint Scanner Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex justify-between items-center mb-3 text-xs font-mono text-slate-400">
            <span className="font-bold uppercase tracking-wider text-slate-300">QR CODE CHECKPOINT SCANNER</span>
            <span className="text-emerald-400 font-bold">{currentTime}</span>
          </div>

          {scanning ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black mb-3">
              <video ref={videoRef} className="w-full h-48 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-emerald-500/40 pointer-events-none rounded-xl flex items-center justify-center">
                <div className="w-36 h-36 border-2 border-dashed border-emerald-400/60 rounded-lg"></div>
              </div>
              <button 
                type="button" 
                onClick={stopScanner}
                className="absolute top-2 right-2 bg-red-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <div className="bg-black/40 border border-slate-800/80 rounded-xl p-6 text-center mb-3">
              <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-700/50 rounded-full mx-auto flex items-center justify-center mb-2 shadow-inner">
                📷
              </div>
              <p className="text-xs text-slate-300 font-medium">Open scanner to read checkpoint QR code</p>
            </div>
          )}

          {scanError && (
            <div className="p-2 mb-3 bg-red-950 text-red-300 text-xs rounded-lg">{scanError}</div>
          )}

          {!scanning && (
            <button 
              type="button"
              onClick={startScanner}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer flex items-center justify-center gap-2"
            >
              📷 OPEN QR SCANNER CAMERA
            </button>
          )}
        </div>

        {/* Patrol Report Submission Form */}
        <form onSubmit={handleSubmitPatrol} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
          
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">Guard Name *</label>
            <input 
              type="text" 
              required
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="Enter your full name..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">Location (Auto-filled by QR) *</label>
            <input 
              type="text" 
              readOnly
              required
              value={scannedLocation}
              placeholder="Awaiting QR scan..." 
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 focus:outline-none font-bold uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">Checkpoint (Auto-filled by QR) *</label>
            <input 
              type="text" 
              readOnly
              required
              value={scannedCheckpoint}
              placeholder="Awaiting QR scan..." 
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 focus:outline-none font-bold uppercase"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1 font-bold">Patrol Type *</label>
            <select 
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Incident Response">Incident Response</option>
              <option value="Perimeter Check">Perimeter Check</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Patrol / Incident Notes &</label>
              <label className="text-[10px] text-emerald-400 font-bold cursor-pointer hover:underline flex items-center gap-1">
                📷 Snap Evidence
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
            <textarea 
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Report any issues or leave blank..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none font-medium resize-none"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 w-full h-24 object-cover rounded-xl border border-slate-800" />
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verifying GPS & Sending...' : 'Submit Patrol Report'}
          </button>

        </form>

      </div>
    </div>
  );
}
