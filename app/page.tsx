'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsQR from 'jsqr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MobileScannerPage() {
  const [guardName, setGuardName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState('Verified within Geofence');
  
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');
      if (codeFromUrl) {
        verifyAndFetchCheckpoint(codeFromUrl);
      }
    }
    captureGpsLocation();

    return () => {
      stopCameraScanner();
    };
  }, []);

  const captureGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          });
        },
        () => {
          setGeofenceStatus('GPS Unavailable');
        }
      );
    }
  };

  const verifyAndFetchCheckpoint = async (code: string) => {
    let cleanCode = code.trim();
    if (cleanCode.includes('?code=')) {
      cleanCode = cleanCode.split('?code=')[1];
    }

    setStatusMessage({ type: 'info', text: `Verifying checkpoint code: ${cleanCode}...` });

    try {
      const { data: cpData, error: cpError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (cpError || !cpData) {
        const { data: cpById } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('id', cleanCode)
          .maybeSingle();

        if (cpById) {
          setCheckpointName(cpById.name);
          fetchParentLocation(cpById.location_id);
          setStatusMessage({ type: 'success', text: `✓ Verified Checkpoint: ${cpById.name}` });
          return;
        }

        setStatusMessage({ type: 'error', text: `Unregistered Checkpoint Code: ${cleanCode}` });
        setCheckpointName(cleanCode);
        setLocationName('Unassigned Site');
        return;
      }

      setCheckpointName(cpData.name);
      fetchParentLocation(cpData.location_id);
      setStatusMessage({ type: 'success', text: `✓ Verified Checkpoint: ${cpData.name}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error connecting to database server.' });
    }
  };

  const fetchParentLocation = async (locationId: string) => {
    if (!locationId) {
      setLocationName('Main Facility');
      return;
    }
    const { data: locData } = await supabase
      .from('locations')
      .select('name')
      .eq('id', locationId)
      .maybeSingle();

    if (locData) {
      setLocationName(locData.name);
    } else {
      setLocationName('Main Site');
    }
  };

  const startCameraScanner = async () => {
    setIsScanning(true);
    setStatusMessage({ type: 'info', text: 'Initializing camera scanner...' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(scanQRCodeTick);
      }
    } catch (err) {
      alert('Unable to access camera. Please check camera permissions.');
      setIsScanning(false);
    }
  };

  const scanQRCodeTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas) {
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
            stopCameraScanner();
            verifyAndFetchCheckpoint(code.data);
            return;
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanQRCodeTick);
  };

  const stopCameraScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsScanning(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guardName.trim()) {
      alert('Please enter your Guard Name.');
      return;
    }

    if (!checkpointName) {
      alert('Please scan a checkpoint QR code before submitting.');
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const payload = {
      guard_name: guardName,
      location: locationName || 'Tom Salem HQ',
      checkpoint: checkpointName,
      patrol_type: patrolType,
      latitude: coords ? coords.lat : 0,
      longitude: coords ? coords.lng : 0,
      geofence_status: geofenceStatus,
      notes: notes + (evidencePhoto ? ' [Photo Evidence Attached]' : ''),
    };

    const { error } = await supabase.from('guard_logs').insert([payload]);

    setLoading(false);

    if (error) {
      setStatusMessage({ type: 'error', text: `Error transmitting log: ${error.message}` });
    } else {
      setStatusMessage({ type: 'success', text: '🚀 Patrol Log Successfully Transmitted!' });
      setNotes('');
      setEvidencePhoto(null);
      setCheckpointName('');
      setLocationName('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto space-y-4">
      {/* Top Header Card Matching Screenshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-950/80 border border-red-800 rounded-xl flex items-center justify-center text-red-400 font-black text-sm">
              🛡️
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-white leading-tight">Guard Patrol</h1>
              <h2 className="text-sm font-black tracking-wide text-white leading-tight">Scanner</h2>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400">Live Feed Connected</span>
          </div>
        </div>

        {/* QR Scanner Box Container */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">QR Code Checkpoint Scanner</span>
            <span className="text-[10px] font-mono text-emerald-400">{new Date().toLocaleTimeString()}</span>
          </div>

          {/* Reduced Camera Viewfinder */}
          {isScanning ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-3 border border-emerald-500/50">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400/60 pointer-events-none animate-pulse"></div>
            </div>
          ) : (
            <div 
              onClick={startCameraScanner}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-3 cursor-pointer hover:border-emerald-500/50 transition group"
            >
              <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                <span className="text-xl">📷</span>
              </div>
              <p className="text-xs text-slate-300 font-bold">Open scanner to read checkpoint QR code</p>
            </div>
          )}

          {isScanning ? (
            <button
              onClick={stopCameraScanner}
              className="w-full bg-red-950/80 border border-red-800 text-red-300 font-bold py-3 rounded-xl text-xs uppercase"
            >
              Stop Camera
            </button>
          ) : (
            <button
              onClick={startCameraScanner}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              📷 Open QR Scanner Camera
            </button>
          )}
        </div>
      </div>

      {/* Verification Status Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-bold text-center border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/60 border-red-800 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Patrol Form */}
      <form onSubmit={handleSubmitLog} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Guard Name *</label>
          <input
            type="text"
            placeholder="Enter your full name..."
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Location (Auto-filled by QR) *</label>
          <input
            type="text"
            value={locationName || 'Awaiting QR scan...'}
            readOnly
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-bold cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Checkpoint (Auto-filled by QR) *</label>
          <input
            type="text"
            value={checkpointName || 'Awaiting QR scan...'}
            readOnly
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-cyan-400 font-bold cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Patrol Type *</label>
          <select
            value={patrolType}
            onChange={(e) => setPatrolType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-emerald-500"
          >
            <option value="Normal Patrol">Normal Patrol</option>
            <option value="Incident Response">Incident Response</option>
            <option value="Night Inspection">Night Inspection</option>
            <option value="Emergency Check">Emergency Check</option>
          </select>
        </div>

        {/* Snap Evidence Placement */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] uppercase font-bold text-slate-400">Patrol / Incident Notes &</label>
            <label className="text-[10px] uppercase font-black text-emerald-400 cursor-pointer flex items-center gap-1 hover:underline">
              📷 Snap Evidence
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
            </label>
          </div>
          {evidencePhoto && (
            <div className="mb-2 p-2 bg-emerald-950/40 border border-emerald-800 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-bold">✓ Photo Evidence Attached</span>
              <button type="button" onClick={() => setEvidencePhoto(null)} className="text-[10px] text-red-400 font-bold">Remove</button>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
            placeholder="Type observations or incident notes here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Transmitting Log...' : 'SUBMIT PATROL LOG'}
        </button>
      </form>
    </div>
  );
}
