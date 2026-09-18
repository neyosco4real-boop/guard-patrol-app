'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Haversine formula to calculate distance in meters between two GPS coordinates
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
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

export default function GuardScanner() {
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [guardName, setGuardName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Camera Scanning State
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppData();
  }, []);

  const fetchAppData = async () => {
    const { data: locs } = await supabase.from('locations').select('*');
    if (locs) setLocations(locs);

    const { data: cps } = await supabase.from('checkpoints').select('*');
    if (cps) setCheckpoints(cps);
  };

  // Start Camera for QR Scanning
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
              setSelectedLocation(parsedData.location);
              setSelectedCheckpoint(parsedData.checkpoint);
              setStatusMessage({ 
                text: `Successfully scanned! Location: ${parsedData.location} | Checkpoint: ${parsedData.checkpoint}`, 
                type: 'success' 
              });
              stopScanner();
              return;
            }
          } catch {
            // Fallback if raw text
            setSelectedCheckpoint(code.data);
            setStatusMessage({ text: `Scanned Checkpoint: ${code.data}`, type: 'success' });
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
    if (!guardName || !selectedLocation || !selectedCheckpoint) {
      setStatusMessage({ text: 'Please fill in Guard Name, Location, and Checkpoint (or scan QR code).', type: 'error' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // 1. Get Guard GPS Telemetry
    if (!navigator.geolocation) {
      setStatusMessage({ text: 'Geolocation is not supported by your browser.', type: 'error' });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // 2. Perform Haversine Geofence Calculation against Location
        const matchedLocation = locations.find((l) => l.name === selectedLocation);
        let geofenceStatus = 'Verified Within Radius';

        if (matchedLocation && matchedLocation.latitude && matchedLocation.longitude) {
          const distance = calculateDistanceMeters(lat, lng, Number(matchedLocation.latitude), Number(matchedLocation.longitude));
          const allowedRadius = matchedLocation.radius_meters || 100; // default 100 meters tolerance

          if (distance > allowedRadius) {
            geofenceStatus = `⚠️ FRAUD: Out of Geofence Bounds (${Math.round(distance)}m away)`;
          }
        }

        // 3. Upload Image Evidence if present
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

        // 4. Insert into Supabase guard_logs
        const { error } = await supabase.from('guard_logs').insert([
          {
            guard_name: guardName,
            location: selectedLocation,
            checkpoint: selectedCheckpoint,
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
          setStatusMessage({ text: 'Patrol scan successfully logged and verified!', type: 'success' });
          setNotes('');
          setImageFile(null);
          setImagePreview(null);
          setSelectedCheckpoint('');
        }
      },
      (error) => {
        setLoading(false);
        setStatusMessage({ text: `GPS Error: ${error.message}. Please enable location permissions.`, type: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const filteredCheckpoints = checkpoints.filter((cp) => cp.location_name === selectedLocation);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header - Strictly Guard Portal with NO Admin link */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-black">
              TOM SALEM SECURITY GUARD PORTAL
            </span>
          </div>
          <h1 className="text-lg font-black uppercase text-white">Mobile Checkpoint Scanner</h1>
          <p className="text-xs text-slate-400 mt-0.5">Scan facility QR codes and transmit live GPS telemetry</p>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`p-4 mb-6 rounded-2xl text-xs font-bold ${statusMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-red-950/80 border border-red-800 text-red-300'}`}>
            {statusMessage.text}
          </div>
        )}

        {/* Camera Scanner View Modal */}
        {scanning && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl relative text-center">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-xs font-mono text-emerald-400 font-bold">Scanning QR Code...</span>
              <button onClick={stopScanner} className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer">
                Close Camera
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
              <video ref={videoRef} className="w-full h-64 object-cover" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}

        {scanError && (
          <div className="p-3 mb-6 bg-red-950 border border-red-800 text-red-300 text-xs rounded-xl">
            {scanError}
          </div>
        )}

        {/* Patrol Submission Form */}
        <form onSubmit={handleSubmitPatrol} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          
          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Guard Full Name</label>
            <input 
              type="text" 
              required
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="e.g. Bright James" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Assigned Location (Site)</label>
            <select 
              required
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setSelectedCheckpoint('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold uppercase"
            >
              <option value="">-- Select Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Checkpoint</label>
              <select 
                required
                value={selectedCheckpoint}
                onChange={(e) => setSelectedCheckpoint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold uppercase"
              >
                <option value="">-- Select Checkpoint --</option>
                {filteredCheckpoints.map((cp) => (
                  <option key={cp.id} value={cp.name}>{cp.name}</option>
                ))}
              </select>
            </div>
            <button 
              type="button"
              onClick={startScanner}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-3 rounded-xl text-xs font-black uppercase transition cursor-pointer flex items-center justify-center shrink-0 shadow"
            >
              📷 Scan QR
            </button>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Patrol Type</label>
            <select 
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Incident Response">Incident Response</option>
              <option value="Perimeter Check">Perimeter Check</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Attach Evidence Photo (Optional)</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-800" />
            )}
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Incident Notes / Observations</label>
            <textarea 
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Report any issues or leave blank if all clear..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium resize-none"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Verifying GPS & Transmitting...' : 'Submit Patrol Log'}
          </button>

        </form>

      </div>
    </div>
  );
}
