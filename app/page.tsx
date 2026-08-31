'use client';

import { useState, useEffect, useRef } from 'react';

export default function GuardScannerPage() {
  const [guardName, setGuardName] = useState('');
  const [location, setLocation] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [isIncident, setIsIncident] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Get GPS coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('Geolocation error:', err);
          setCoords({ lat: 6.4451, lng: 3.4143 });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setCoords({ lat: 6.4451, lng: 3.4143 });
    }
  }, []);

  // Parse QR string formatted like: Location:Main Facility|Checkpoint:Front Gate
  const parseQRCodeData = (rawData: string) => {
    try {
      const parts = rawData.split('|');
      let parsedLoc = '';
      let parsedCp = '';

      parts.forEach((part) => {
        if (part.startsWith('Location:')) {
          parsedLoc = part.replace('Location:', '').trim();
        } else if (part.startsWith('Checkpoint:')) {
          parsedCp = part.replace('Checkpoint:', '').trim();
        }
      });

      if (parsedLoc && parsedCp) {
        setLocation(parsedLoc);
        setCheckpointName(parsedCp);
        stopScanner();
      } else if (rawData.trim()) {
        // Fallback if generic text or custom QR format
        setLocation('Main Facility');
        setCheckpointName(rawData.trim());
        stopScanner();
      }
    } catch (e) {
      console.error('Failed to parse QR code:', e);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Continuously scan frames if BarcodeDetector is supported
      if ('BarcodeDetector' in window) {
        //@ts-ignore
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const scannedText = barcodes[0].rawValue;
                parseQRCodeData(scannedText);
              }
            } catch (err) {
              // Detection frame skip error handling
            }
          }
        }, 500);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMsg('Camera access denied or unavailable.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      setErrorMsg('Please enter your Guard Name.');
      return;
    }
    if (!location || !checkpointName) {
      setErrorMsg('Please scan a valid Checkpoint QR code first.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        guardName: guardName.trim(),
        location,
        checkpointName,
        notes,
        isIncident,
        mediaUrl,
        lat: coords ? coords.lat : 6.4451,
        lng: coords ? coords.lng : 3.4143,
      };

      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Patrol Log Successfully Uploaded to Command!');
        setCheckpointName('');
        setLocation('');
        setNotes('Normal Patrol Scan');
        setIsIncident(false);
        setMediaUrl('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(data.error || 'Failed to submit log.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMsg('Network error while submitting patrol log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070913] text-white p-4 sm:p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center flex flex-col gap-1.5 border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-black tracking-wider text-white uppercase">GUARD PATROL PWA</h1>
          <p className="text-xs text-slate-400">Multi-Location Patrol Terminal</p>
          <div className="inline-flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-[11px] text-cyan-400 font-mono mt-1 w-fit mx-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            GPS Active ({coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Locating...'})
          </div>
        </div>

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold text-center">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/40 text-red-400 p-3.5 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Live Camera Viewfinder */}
        {scanning ? (
          <div className="flex flex-col gap-3 bg-slate-950 p-3 rounded-2xl border border-cyan-500/50">
            <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-0 border-2 border-cyan-400/30 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-cyan-400 rounded-xl animate-pulse"></div>
              </div>
            </div>
            <button
              type="button"
              onClick={stopScanner}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 rounded-xl cursor-pointer"
            >
              Close Camera
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startScanner}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-black text-xs py-3.5 px-4 rounded-2xl shadow-lg tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            📷 Open QR Scanner Viewfinder
          </button>
        )}

        {/* Patrol Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Guard Name - Blank by default, manual input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Guard Name</label>
            <input
              type="text"
              placeholder="Enter your full name..."
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
              required
            />
          </div>

          {/* Parent Location - Blank before scan, auto-filled by QR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Parent Location</label>
            <input
              type="text"
              readOnly
              placeholder="Will auto-fill upon QR scan..."
              value={location}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none placeholder:text-slate-600 cursor-not-allowed font-medium"
            />
          </div>

          {/* Scanned Checkpoint - Blank before scan, auto-filled by QR */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Scanned Checkpoint</label>
            <input
              type="text"
              readOnly
              placeholder="Will auto-fill upon QR scan..."
              value={checkpointName}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none placeholder:text-slate-600 cursor-not-allowed font-medium"
            />
            {location && <span className="text-[11px] text-emerald-400 font-semibold mt-0.5">✓ Assigned to Location: {location}</span>}
          </div>

          {/* Patrol Notes / Incident */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Patrol Notes / Incident</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Incident checkbox */}
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
            <input
              type="checkbox"
              id="incidentCheck"
              checked={isIncident}
              onChange={(e) => setIsIncident(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="incidentCheck" className="text-xs font-bold text-red-400 cursor-pointer select-none">
              Mark as Incident / Emergency Report
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-4 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 mt-2"
          >
            {submitting ? 'Transmitting Log...' : 'Submit Patrol Verification'}
          </button>
        </form>

      </div>
    </main>
  );
}
