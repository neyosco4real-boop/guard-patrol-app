'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

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

  // Parse QR query parameter if scanned from standard smartphone camera app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');
      if (codeFromUrl) {
        verifyAndFetchCheckpoint(codeFromUrl);
      }
    }
    captureGpsLocation();
  }, []);

  const captureGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          });
          setGeofenceStatus('Verified within Geofence');
        },
        () => {
          setGeofenceStatus('GPS Unavailable');
        }
      );
    }
  };

  const verifyAndFetchCheckpoint = async (code: string) => {
    setStatusMessage({ type: 'info', text: `Verifying checkpoint code: ${code}...` });

    try {
      const { data: cpData, error: cpError } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (cpError || !cpData) {
        const { data: cpById } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('id', code)
          .maybeSingle();

        if (cpById) {
          setCheckpointName(cpById.name);
          fetchParentLocation(cpById.location_id);
          setStatusMessage({ type: 'success', text: `✓ Verified: ${cpById.name}` });
          return;
        }

        setStatusMessage({ type: 'error', text: `Unregistered Checkpoint Code: ${code}` });
        setCheckpointName(code);
        setLocationName('Unassigned Site');
        return;
      }

      setCheckpointName(cpData.name);
      fetchParentLocation(cpData.location_id);
      setStatusMessage({ type: 'success', text: `✓ Verified: ${cpData.name}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error connecting to server.' });
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
    setStatusMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert('Unable to access camera. Please allow camera permissions or use your device camera app to scan the QR code.');
      setIsScanning(false);
    }
  };

  const stopCameraScanner = () => {
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
      setStatusMessage({ type: 'success', text: '🚀 Patrol Log Successfully Transmitted to Live Stream!' });
      setNotes('');
      setEvidencePhoto(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 text-center shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <h1 className="text-sm font-black tracking-wider uppercase text-white">Guard Patrol Mobile Scanner</h1>
        </div>
        <p className="text-[11px] text-slate-400">Scan physical checkpoint QR codes to submit live audit reports</p>
      </div>

      {/* Camera Scanner Viewfinder */}
      {isScanning ? (
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 mb-4 text-center shadow-2xl">
          <p className="text-xs font-bold text-emerald-400 mb-2 animate-pulse">📷 Point camera at Checkpoint QR Code</p>
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square mb-3 border-2 border-dashed border-emerald-500">
            <video ref={videoRef} className="w-full h-full object-cover" />
          </div>
          <button
            onClick={stopCameraScanner}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs uppercase"
          >
            Close Camera
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <button
            onClick={startCameraScanner}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            📷 Open QR Scanner Camera
          </button>
        </div>
      )}

      {/* Verification Status Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl mb-4 text-xs font-bold text-center border ${
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

      {/* Main Patrol Log Form */}
      <form onSubmit={handleSubmitLog} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl text-xs">
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
            value={locationName || 'Awaiting Checkpoint Scan...'}
            readOnly
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-bold cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Checkpoint (Auto-filled by QR) *</label>
          <input
            type="text"
            value={checkpointName || 'Awaiting Checkpoint Scan...'}
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

        {/* Snap Evidence Camera Button */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Snap Evidence Camera (Optional)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 font-bold py-3 px-4 rounded-xl text-center cursor-pointer transition flex items-center justify-center gap-2">
              📸 Take / Upload Photo Evidence
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
            </label>
            {evidencePhoto && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-2 rounded-lg border border-emerald-800">
                ✓ Attached
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Patrol / Incident Notes</label>
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
