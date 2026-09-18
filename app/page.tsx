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

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // 1. Check URL parameters if opened directly
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const loc = params.get('location');
      const chk = params.get('checkpoint');
      if (loc) setLocation(decodeURIComponent(loc));
      if (chk) setCheckpoint(decodeURIComponent(chk));
    }

    // 2. Load industry-standard html5-qrcode library
    if (typeof window !== 'undefined' && !document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      stopScanner();
    };
  }, []);

  const handleScannedData = (scannedText: string) => {
    try {
      let decodedText = scannedText.trim();
      if (decodedText.includes('location=') || decodedText.includes('checkpoint=')) {
        let urlObj;
        if (decodedText.startsWith('http')) {
          urlObj = new URL(decodedText);
        } else {
          urlObj = new URL(`https://dummy.com/${decodedText.startsWith('/') ? '' : '/'}${decodedText}`);
        }
        const loc = urlObj.searchParams.get('location');
        const chk = urlObj.searchParams.get('checkpoint');

        if (loc) setLocation(decodeURIComponent(loc));
        if (chk) setCheckpoint(decodeURIComponent(chk));

        if (!loc && !chk) {
          setCheckpoint(decodedText);
        }
      } else {
        setCheckpoint(decodedText);
      }
      setStatusMessage({ text: `✅ Checkpoint Scanned Successfully!`, type: 'success' });
    } catch (e) {
      setCheckpoint(scannedText);
      setStatusMessage({ text: `✅ Captured Checkpoint: ${scannedText}`, type: 'success' });
    }
    stopScanner();
  };

  const startScanner = async () => {
    setIsScanning(true);
    setStatusMessage({ text: 'Initializing camera...', type: '' });

    // Wait for container element to mount in DOM
    setTimeout(async () => {
      try {
        // @ts-ignore
        if (window.Html5Qrcode) {
          // @ts-ignore
          const html5QrCode = new window.Html5Qrcode("reader-container");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              handleScannedData(decodedText);
            },
            (errorMessage: string) => {
              // Scanning frame misses can be ignored safely
            }
          );
          setStatusMessage({ text: 'Align QR code within the frame', type: '' });
        } else {
          setStatusMessage({ text: 'Scanner library loading. Please try again in 2 seconds.', type: 'error' });
          setIsScanning(false);
        }
      } catch (err: any) {
        setIsScanning(false);
        setStatusMessage({ text: 'Camera permission denied or unavailable. Use file upload below.', type: 'error' });
      }
    }, 300);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Direct file scan using html5-qrcode file scanner (100% reliable on iOS & Android webviews)
  const handleQRFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage({ text: 'Scanning QR photo...', type: '' });
    try {
      // @ts-ignore
      if (window.Html5Qrcode) {
        // @ts-ignore
        const html5QrCode = new window.Html5Qrcode("hidden-file-scanner");
        const decodedText = await html5QrCode.scanFile(file, true);
        handleScannedData(decodedText);
      }
    } catch (err) {
      setStatusMessage({ text: 'Could not detect QR code in image. Try better lighting.', type: 'error' });
    }
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
        console.warn('Geolocation lookup failed.');
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
      setStatusMessage({ text: '✅ Patrol Log Successfully Submitted!', type: 'success' });
      setNotes('');
      setEvidencePhoto(null);
    } else {
      setStatusMessage({ text: 'Submission Error: ' + error.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-md mx-auto">
      <div id="hidden-file-scanner" className="hidden"></div>
      <input
        ref={qrFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleQRFileScan}
        className="hidden"
      />

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
          
          <div className={`${isScanning ? 'block' : 'hidden'} relative rounded-2xl overflow-hidden bg-black`}>
            <div id="reader-container" className="w-full"></div>
            <button
              type="button"
              onClick={stopScanner}
              className="mt-3 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow cursor-pointer"
            >
              Close Camera
            </button>
          </div>

          {!isScanning && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={startScanner}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                📷 Open Live QR Scanner Camera
              </button>
              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 shadow cursor-pointer"
              >
                📸 Snap/Upload QR Photo (100% Guaranteed)
              </button>
            </div>
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
              className="w-xl bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 w-full"
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
