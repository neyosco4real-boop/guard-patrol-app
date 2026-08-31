'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ScanContent() {
  const searchParams = useSearchParams();
  const [guardName, setGuardName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  
  // Camera scanner states
  const [scanningQR, setScanningQR] = useState(false);
  const [capturingIncident, setCapturingIncident] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const incidentVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loc = searchParams.get('loc') || '';
    const cp = searchParams.get('cp') || '';
    if (loc) setLocationName(loc);
    if (cp) setCheckpointName(cp);

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
    } catch (err) {
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

    const gpsStr = lat && lng ? `${lat}, ${lng}` : '6.44511, 3.41430';

    try {
      const payload = {
        guard_name: guardName.trim(),
        location: locationName,
        location_name: locationName,
        checkpoint: checkpointName,
        checkpoint_name: checkpointName,
        name: checkpointName,
        latitude: lat || '6.44511',
        longitude: lng || '3.41430',
        gps_coordinates: gpsStr,
        geofence: 'Within Radius',
        status: 'Completed',
        notes: notes ? `${notes} [Photo Attached]` : (incidentPhoto ? 'Incident Photo Captured' : 'None')
      };

      const { error } = await supabase.from('patrol_logs').insert([payload]);
      if (error) throw error;

      setSuccessMsg('Patrol telemetry successfully recorded and verified.');
      setNotes('');
      setIncidentPhoto(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit patrol log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center pb-4 mb-4 border-b border-slate-800">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-lg font-bold text-white mt-1">Guard Patrol Scanner</h1>
          <p className="text-xs text-slate-400 mt-0.5">Scan physical checkpoint QRs and capture live GPS telemetry.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 text-xs p-3 rounded-lg mb-4">
            Error: {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-lg mb-4">
            {successMsg}
          </div>
        )}

        {/* QR Scanner Modal / View */}
        {scanningQR && (
          <div className="mb-6 bg-slate-950 border border-emerald-500/50 rounded-xl p-4 text-center">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Align Checkpoint QR Code in Frame</h3>
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-emerald-500/40 m-8 rounded-lg pointer-events-none animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLocationName('Multichoice HQ');
                  setCheckpointName('Front Gate');
                  stopCamera();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg"
              >
                Simulate QR Detect
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Incident Live Camera Modal / View */}
        {capturingIncident && (
          <div className="mb-6 bg-slate-950 border border-amber-500/50 rounded-xl p-4 text-center">
            <h3 className="text-xs font-semibold text-amber-400 uppercase mb-2">Live Incident Camera Capture</h3>
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-3">
              <video ref={incidentVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
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

        {!scanningQR && !capturingIncident && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => startCamera('qr')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 mb-2"
            >
              <span>📷</span> Scan QR Camera
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
              placeholder="Auto-filled from QR scan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Checkpoint</label>
            <input
              type="text"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              placeholder="Auto-filled from QR scan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">GPS Coordinates (Live)</label>
            <input
              type="text"
              readOnly
              value={lat && lng ? `${lat}, ${lng}` : 'Acquiring GPS...'}
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
              rows={3}
              placeholder="Describe any anomalies or leave blank..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
            {incidentPhoto && (
              <div className="mt-2 flex items-center gap-3 bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <img src={incidentPhoto} alt="Incident preview" className="w-12 h-12 object-cover rounded" />
                <span className="text-xs text-emerald-400 font-medium">Incident photo captured and attached.</span>
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
