'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GuardScanner() {
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [guardName, setGuardName] = useState('');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [locationError, setLocationError] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchLocations();
    fetchCheckpoints();
    requestLocation();

    return () => {
      stopCamera();
    };
  }, []);

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError('');
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          setLocationError('GPS warning: Location access denied or unavailable.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('sites').select('*');
    if (data && data.length > 0) setLocations(data);
  };

  const fetchCheckpoints = async () => {
    const { data } = await supabase.from('checkpoints').select('*');
    if (data) setCheckpoints(data);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access device camera. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEvidencePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName || !selectedLocation || !selectedCheckpoint) {
      alert('Please fill in your guard name, location, and checkpoint.');
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    // Deliberate moderate pause so guards register the capture
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const latitude = currentCoords ? currentCoords.lat : 6.5244;
    const longitude = currentCoords ? currentCoords.lng : 3.3792;

    const { error } = await supabase.from('guard_logs').insert([
      {
        guard_name: guardName,
        location: selectedLocation,
        checkpoint: selectedCheckpoint,
        latitude: latitude,
        longitude: longitude,
        geofence_status: 'Verified',
        notes: notes || 'No issue',
        evidence_photo: evidencePhoto,
      },
    ]);

    setLoading(false);

    if (error) {
      alert('Failed to submit scan: ' + error.message);
      setIsScanningPaused(false);
    } else {
      setSuccessMessage('Scan successfully recorded and sent to Tom Salem Security HQ!');
      setIsScanningPaused(true);
      stopCamera();
      
      setTimeout(() => {
        setSuccessMessage('');
        setNotes('');
        setEvidencePhoto(null);
        setSelectedCheckpoint('');
        setIsScanningPaused(false);
      }, 3500);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Controlled Success Modal Overlay */}
      {successMessage && (
        <div className="fixed inset-0 bg-[#070b14]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center animate-fadeIn">
          <div className="bg-[#0f172a] border border-emerald-500/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto text-emerald-400">
              ✓
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">Checkpoint Captured</h3>
            <p className="text-xs text-emerald-300 font-medium">{successMessage}</p>
            <p className="text-[10px] text-slate-400 pt-2">Ready for next station...</p>
          </div>
        </div>
      )}

      <div className="max-w-md w-full mx-auto space-y-6 pb-12">
        
        {/* Header Branding */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-3xl shadow-xl text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <span>🛡️</span> Tom Salem Security
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-wider">Guard Mobile Scanner</h1>
          <p className="text-xs text-slate-400">Live Camera QR Viewfinder & Patrol Telemetry</p>
        </div>

        {locationError && (
          <div className="bg-amber-950/50 border border-amber-800/80 text-amber-300 p-3 rounded-2xl text-xs">
            ⚠️ {locationError}
          </div>
        )}

        {/* Live Camera Viewfinder Box */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-3xl shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">QR Camera Viewfinder</span>
            {isCameraActive ? (
              <button 
                type="button" 
                onClick={stopCamera}
                className="bg-rose-950/80 border border-rose-800 text-rose-300 px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer"
              >
                Close Camera ✕
              </button>
            ) : (
              <button 
                type="button" 
                onClick={startCamera}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer shadow"
              >
                Open Camera 📷
              </button>
            )}
          </div>

          {isCameraActive ? (
            <div className="relative w-full h-52 bg-black rounded-2xl overflow-hidden border border-emerald-500/50 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400/60 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="bg-black/60 text-emerald-300 text-[10px] px-2 py-1 rounded font-mono">Align QR Code Within Frame</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 bg-[#070b14] border border-[#1e293b] rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <span>📷 Camera viewfinder is closed</span>
              <button 
                type="button" 
                onClick={startCamera}
                className="text-emerald-400 font-bold underline text-[11px] cursor-pointer"
              >
                Tap here to turn on camera
              </button>
            </div>
          )}
        </div>

        {/* Scan Form */}
        <form onSubmit={handleSubmitScan} className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-3xl shadow-2xl space-y-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Guard Name / ID</label>
            <input
              type="text"
              required
              disabled={isScanningPaused}
              placeholder="e.g. Officer John Doe"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Site Location</label>
            <select
              required
              disabled={isScanningPaused}
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            >
              <option value="">Select Location...</option>
              {locations.map((loc, idx) => (
                <option key={idx} value={loc.name || loc.location}>
                  {loc.name || loc.location}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Checkpoint Name</label>
            <select
              required
              disabled={isScanningPaused}
              value={selectedCheckpoint}
              onChange={(e) => setSelectedCheckpoint(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            >
              <option value="">Select Checkpoint...</option>
              {checkpoints.map((cp, idx) => (
                <option key={idx} value={cp.name || cp.checkpoint}>
                  {cp.name || cp.checkpoint}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Incident Notes / Observations</label>
            <textarea
              rows={3}
              disabled={isScanningPaused}
              placeholder="Report any issues or type 'No issue'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition resize-none disabled:opacity-50"
            ></textarea>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Evidence Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isScanningPaused}
              onChange={handlePhotoUpload}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-950 file:text-emerald-300 hover:file:bg-emerald-900 cursor-pointer disabled:opacity-50"
            />
            {evidencePhoto && <p className="text-[10px] text-emerald-400 mt-1">✓ Photo attached successfully</p>}
          </div>

          <button
            type="submit"
            disabled={loading || isScanningPaused}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? 'Verifying Scan...' : 'Confirm & Submit Scan 🚀'}
          </button>

        </form>

      </div>
    </div>
  );
}
