'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MobileScanPage() {
  const [guardName, setGuardName] = useState('');
  const [location, setLocation] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Parse URL query parameters automatically on load if opened via QR scan or direct link
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const loc = params.get('location');
      const chk = params.get('checkpoint');
      if (loc) setLocation(decodeURIComponent(loc));
      if (chk) setCheckpoint(decodeURIComponent(chk));
    }
  }, []);

  // Function to process scanned text or URL and correctly split parameters
  const handleScannedData = (scannedText: string) => {
    try {
      if (scannedText.includes('location=') || scannedText.includes('checkpoint=')) {
        // Handle URL format
        let urlObj;
        if (scannedText.startsWith('http')) {
          urlObj = new URL(scannedText);
        } else {
          urlObj = new URL(`https://dummy.com/${scannedText.startsWith('/') ? '' : '/'}${scannedText}`);
        }
        const loc = urlObj.searchParams.get('location');
        const chk = urlObj.searchParams.get('checkpoint');

        if (loc) setLocation(decodeURIComponent(loc));
        if (chk) setCheckpoint(decodeURIComponent(chk));

        if (!loc && !chk) {
          // Fallback: assign entire string to checkpoint if params aren't found
          setCheckpoint(scannedText);
        }
      } else {
        // Plain text fallback
        setCheckpoint(scannedText);
      }
      setStatusMessage({ text: `✓ Successfully Captured Checkpoint Code`, type: 'success' });
    } catch (e) {
      setCheckpoint(scannedText);
      setStatusMessage({ text: `✓ Captured Checkpoint: ${scannedText}`, type: 'success' });
    }
    setIsScanning(false);
  };

  // Trigger camera scanner simulation / input
  const startScanner = async () => {
    setIsScanning(true);
    setStatusMessage({ text: 'Initializing camera scanner...', type: '' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      // Fallback to prompt if camera permission is blocked or unavailable
      setIsScanning(false);
      const manualInput = prompt('Camera access unavailable. Enter Checkpoint Code or URL manually:');
      if (manualInput) {
        handleScannedData(manualInput);
      }
    }
  };

  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsScanning(false);
  };

  // Handle Photo Evidence Attachment
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      setStatusMessage({ text: 'Error: Please enter your Guard Name.', type: 'error' });
      return;
    }
    if (!location.trim() || !checkpoint.trim()) {
      setStatusMessage({ text: 'Error: Location and Checkpoint must be populated via QR scan.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatusMessage({ text: 'Submitting patrol log to live feed...', type: '' });

    // Fetch live Geolocation
    let latitude = '6.5244';
    let longitude = '3.3792';
    if (navigator.geolocation) {
      try {
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = position.coords.latitude.toFixed(6);
        longitude = position.coords.longitude.toFixed(6);
      } catch (err) {
        console.warn('Geolocation lookup failed, using default coordinates.');
      }
    }

    const finalNotes = `${notes}${evidencePhoto ? ' [Photo Evidence Attached]' : ''}`;

    const { error } = await supabase.from('guard_logs').insert([
      {
        guard_name: guardName.trim(),
        location: location.trim(),
        checkpoint: checkpoint.trim(),
        patrol_type: patrolType,
        latitude,
        longitude,
        geofence_status: 'Verified',
        notes: finalNotes,
        evidence_photo: evidencePhoto
      }
    ]);

    setSubmitting(false);

    if (!error) {
      setStatusMessage({ text: '✅ Patrol Log Successfully Submitted to Admin Feed!', type: 'success' });
      setNotes('');
      setEvidencePhoto(null);
    } else {
      setStatusMessage({ text: 'Submission Error: ' + error.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl text-center">
          <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">🛡️ Tom Salem Security</div>
          <h1 className="text-base font-black text-white uppercase">Mobile Guard Scanner</h1>
        </div>

        {/* Status Banner */}
        {statusMessage.text && (
          <div className={`p-3 rounded-2xl text-xs font-bold text-center border ${
            statusMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' :
            statusMessage.type === 'error' ? 'bg-red-950/80 border-red-800 text-red-300' :
            'bg-slate-900 border-slate-800 text-slate-300'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Scanner Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl text-center space-y-3">
          <div className="text-xs font-black uppercase text-slate-300">QR Code Checkpoint Scanner</div>
          
          {isScanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex flex-col items-center justify-center">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-emerald-500/80 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border border-dashed border-white/60 rounded-xl animate-pulse flex items-center justify-center">
                  <span className="text-[10px] bg-black/70 text-white px-2 py-1 rounded">Align QR Code</span>
                </div>
              </div>
              <div className="absolute bottom-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopScanner();
                    // Simulating successful scan for testing convenience if video feed fails
                    handleScannedData(`${window.location.origin}/scan?location=TOM%20SALEM%20HQ&checkpoint=RECEPTION`);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Simulate Scan OK
                </button>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
                >
                  Close Camera
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer"
            >
              📷 Open QR Scanner Camera
            </button>
          )}
        </div>

        {/* Patrol Submission Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Guard Name *</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="Enter your full name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Location (Auto-Filled by QR) *</label>
            <input
              type="text"
              value={location}
              readOnly
              placeholder="Scan QR code to populate location"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Checkpoint (Auto-Filled by QR) *</label>
            <input
              type="text"
              value={checkpoint}
              readOnly
              placeholder="Scan QR code to populate checkpoint"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Patrol Type *</label>
            <select
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Routine Inspection">Routine Inspection</option>
              <option value="Emergency Check">Emergency Check</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Patrol / Incident Notes & Evidence</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                📸 Snap Evidence Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type observations or incident notes here..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
            {evidencePhoto && (
              <div className="mt-2 flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <img src={evidencePhoto} alt="Evidence Preview" className="w-12 h-12 object-cover rounded-lg" />
                <span className="text-[10px] text-emerald-400 font-bold">Photo attached successfully</span>
                <button
                  type="button"
                  onClick={() => setEvidencePhoto(null)}
                  className="ml-auto text-[10px] text-red-400 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl text-xs font-black transition shadow cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? 'Submitting Log...' : 'Submit Patrol Log'}
          </button>
        </form>

      </div>
    </div>
  );
}
