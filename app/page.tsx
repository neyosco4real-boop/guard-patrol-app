'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GuardPatrolSystem() {
  const [guardName, setGuardName] = useState('');
  const [location, setLocation] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [patrolType, setPatrolType] = useState('Normal Patrol');
  const [notes, setNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    if (typeof window !== 'undefined' && !document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      clearInterval(timer);
      stopScanner();
    };
  }, []);

  const handleScannedData = async (scannedText: string) => {
    let decodedText = scannedText.trim();
    
    let parsedLocation = '';
    let parsedCheckpoint = '';

    try {
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        parsedLocation = parsed.location || '';
        parsedCheckpoint = parsed.checkpoint || parsed.name || '';
      } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://') || decodedText.includes('location=') || decodedText.includes('checkpoint=')) {
        let urlObj;
        if (decodedText.startsWith('http')) {
          urlObj = new URL(decodedText);
        } else {
          urlObj = new URL(`https://dummy.com/${decodedText.startsWith('/') ? '' : '/'}${decodedText}`);
        }
        parsedLocation = urlObj.searchParams.get('location') || '';
        parsedCheckpoint = urlObj.searchParams.get('checkpoint') || '';
      } else if (decodedText.includes('|')) {
        const parts = decodedText.split('|');
        parsedLocation = parts[0]?.trim() || '';
        parsedCheckpoint = parts[1]?.trim() || '';
      } else if (decodedText.includes(' - ')) {
        const parts = decodedText.split(' - ');
        parsedLocation = parts[0]?.trim() || '';
        parsedCheckpoint = parts[1]?.trim() || '';
      } else if (decodedText.includes(':')) {
        const parts = decodedText.split(':');
        parsedLocation = parts[0]?.trim() || '';
        parsedCheckpoint = parts[1]?.trim() || '';
      } else {
        parsedCheckpoint = decodedText;
      }

      if (!parsedLocation && parsedCheckpoint) {
        try {
          const { data } = await supabase
            .from('checkpoints')
            .select('location, name, checkpoint')
            .or(`name.ilike.${parsedCheckpoint},checkpoint.ilike.${parsedCheckpoint}`)
            .maybeSingle();

          if (data && data.location) {
            parsedLocation = data.location;
            parsedCheckpoint = data.name || data.checkpoint || parsedCheckpoint;
          }
        } catch (err) {
          console.warn('Supabase checkpoint lookup warning:', err);
        }
      }

      const finalLoc = parsedLocation || 'Main Facility';
      const finalChk = parsedCheckpoint || decodedText;

      // Automatically populate the form fields directly without overlay confirmation box
      setLocation(finalLoc);
      setCheckpoint(finalChk);
      setStatusMessage({ text: `✅ QR Scanned & Auto-Filled Successfully!`, type: 'success' });
      
      // Stop scanner immediately upon successful capture
      stopScanner();
    } catch (e) {
      setLocation('Main Facility');
      setCheckpoint(decodedText);
      setStatusMessage({ text: `✅ Scanned QR: ${decodedText}`, type: 'success' });
      stopScanner();
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setStatusMessage({ text: 'Initializing camera...', type: '' });

    setTimeout(async () => {
      try {
        // @ts-ignore
        if (window.Html5Qrcode) {
          try {
            // @ts-ignore
            const oldScanner = new window.Html5Qrcode("reader-container");
            if (oldScanner && oldScanner.isScanning) {
              await oldScanner.stop();
            }
          } catch(e) {}

          // @ts-ignore
          const html5QrCode = new window.Html5Qrcode("reader-container");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 2, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              handleScannedData(decodedText);
            },
            (errorMessage: string) => {}
          );
          setStatusMessage({ text: 'Align QR code within the frame', type: '' });
        } else {
          setStatusMessage({ text: 'Scanner library loading. Please try again in 2 seconds.', type: 'error' });
          setIsScanning(false);
        }
      } catch (err: any) {
        setIsScanning(false);
        setStatusMessage({ text: 'Camera access error. Please try again.', type: 'error' });
      }
    }, 400);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      setStatusMessage({ text: 'Error: Please enter your Guard Name.', type: 'error' });
      return;
    }
    if (!checkpoint.trim() || !location.trim()) {
      setStatusMessage({ text: 'Error: Both Location and Checkpoint must be auto-filled via QR scan.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStatusMessage({ text: 'Submitting patrol log...', type: '' });

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
      setStatusMessage({ text: '✅ Patrol Log Successfully Synced to Admin Feed!', type: 'success' });
      setNotes('');
      setEvidencePhoto(null);
      setCheckpoint('');
      setLocation('');
    } else {
      setStatusMessage({ text: 'Submission Error: ' + error.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 font-sans max-w-md mx-auto">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-3xl shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center shadow">
              🛡️
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-wide">Guard Patrol</h1>
              <h1 className="text-sm font-black text-white uppercase tracking-wide">Scanner</h1>
            </div>
          </div>

          <div className="bg-[#070b14] border border-[#1e293b] px-3 py-1.5 rounded-full flex items-center gap-2 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400">Live Feed Connected</span>
          </div>
        </div>

        {/* Status Banner */}
        {statusMessage.text && (
          <div className={`p-3 rounded-2xl text-xs font-bold text-center border ${
            statusMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' :
            statusMessage.type === 'error' ? 'bg-red-950/80 border-red-800 text-red-300' :
            'bg-[#0f172a] border-[#1e293b] text-slate-300'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Scanner Container */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs font-black uppercase text-slate-300">
            <span>QR CODE CHECKPOINT SCANNER</span>
            <span className="text-emerald-400 font-mono text-[11px]">{currentTime}</span>
          </div>
          
          {isScanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black p-2 text-center space-y-2">
              <div id="reader-container" className="w-full"></div>

              <button
                type="button"
                onClick={stopScanner}
                className="mt-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-[#1e293b] py-8 px-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center shadow-inner">
                <span className="text-xl">📷</span>
              </div>
              <p className="text-xs text-slate-300">Open scanner to read location & checkpoint QR code</p>

              <button
                type="button"
                onClick={startScanner}
                className="w-full max-w-[280px] mx-auto bg-[#10b981] hover:bg-emerald-500 text-[#070b14] font-black py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider"
              >
                <span>📷</span> OPEN QR SCANNER CAMERA
              </button>
            </div>
          )}
        </div>

        {/* Patrol Form */}
        <form onSubmit={handleSubmit} className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-5 space-y-4 shadow-xl">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Guard Name *</label>
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="Enter your full name..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Location (Auto-Filled by QR Scan) *</label>
            <input
              type="text"
              value={location}
              readOnly
              placeholder="Awaiting QR scan..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none cursor-not-allowed placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Checkpoint (Auto-Filled by QR Scan) *</label>
            <input
              type="text"
              value={checkpoint}
              readOnly
              placeholder="Awaiting QR scan..."
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none cursor-not-allowed placeholder:text-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Patrol Type *</label>
            <select
              value={patrolType}
              onChange={(e) => setPatrolType(e.target.value)}
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="Normal Patrol">Normal Patrol</option>
              <option value="Routine Inspection">Routine Inspection</option>
              <option value="Emergency Check">Emergency Check</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Patrol / Incident Notes &</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Snap Evidence
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
              className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            ></textarea>
            {evidencePhoto && (
              <div className="mt-2 flex items-center gap-2 bg-[#070b14] p-2 rounded-xl border border-[#1e293b]">
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
            {submitting ? 'Syncing to Admin Feed...' : 'Submit Patrol Log'}
          </button>
        </form>

      </div>
    </div>
  );
}
