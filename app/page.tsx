'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';

export default function Home() {
  const [guardName, setGuardName] = useState('');
  const [location, setLocation] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [incidentReport, setIncidentReport] = useState('');
  const [status, setStatus] = useState('Completed');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Camera states
  const [scanningQR, setScanningQR] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start device camera and begin scanning frames for QR codes
  const startQRScanner = async () => {
    setScanningQR(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        requestAnimationFrame(tickQRScan);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera for QR scanning.');
      setScanningQR(false);
    }
  };

  const stopQRScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setScanningQR(false);
  };

  // Continuous frame analysis for QR codes
  const tickQRScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          // Parsed format: Location:XYZ|Checkpoint:ABC
          const qrText = code.data;
          try {
            if (qrText.includes('|')) {
              const parts = qrText.split('|');
              let locVal = '';
              let cpVal = '';
              parts.forEach((p) => {
                if (p.startsWith('Location:')) locVal = decodeURIComponent(p.replace('Location:', ''));
                if (p.startsWith('Checkpoint:')) cpVal = decodeURIComponent(p.replace('Checkpoint:', ''));
              });
              if (locVal) setLocation(locVal);
              if (cpVal) setCheckpoint(cpVal);
            } else {
              setCheckpoint(qrText);
            }
          } catch (e) {
            setCheckpoint(qrText);
          }

          stopQRScanner();
          alert('QR Code successfully scanned and matched!');
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickQRScan);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !location.trim() || !checkpoint.trim()) {
      alert('Please enter Guard Name, Location, and Checkpoint.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');

    let gpsCoords = 'Location Permission Denied';
    if (navigator.geolocation) {
      try {
        const position: GeolocationPosition = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        gpsCoords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      } catch (e) {
        gpsCoords = 'GPS Unavailable';
      }
    }

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName.trim(),
          location: location.trim(),
          checkpoint: checkpoint.trim(),
          gps_coordinates: gpsCoords,
          incident_report: (incidentReport.trim() || 'None') + (capturedPhoto ? ' [Photo Attached]' : ''),
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Patrol scan successfully recorded and transmitted to live feed!');
        setIncidentReport('');
        setCapturedPhoto(null);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to connect to patrol server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070913] text-white p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="max-w-md w-full flex flex-col gap-6">
        
        <div className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-2">
          <h1 className="text-lg font-extrabold text-white">🛡️ Guard Patrol Scanner</h1>
          <p className="text-xs text-slate-400">Scan physical checkpoint QRs and capture incident media in real time.</p>
        </div>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs font-bold text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmitScan} className="bg-[#0b0f19] border border-slate-800 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Guard Name</label>
            <input
              type="text"
              placeholder="e.g. Officer John Doe"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Location Site</label>
            <input
              type="text"
              placeholder="e.g. Multichoice HQ"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* QR Scanner Section */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Checkpoint Scanned</label>
              {!scanningQR ? (
                <button
                  type="button"
                  onClick={startQRScanner}
                  className="text-[10px] bg-cyan-400 text-slate-950 px-3 py-1 rounded-lg font-bold cursor-pointer"
                >
                  📷 Scan QR Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopQRScanner}
                  className="text-[10px] bg-red-500 text-white px-3 py-1 rounded-lg font-bold cursor-pointer"
                >
                  ❌ Close Camera
                </button>
              )}
            </div>

            {scanningQR && (
              <div className="relative bg-black rounded-2xl overflow-hidden border border-cyan-400 p-2 flex flex-col items-center gap-2">
                <video ref={videoRef} className="w-full h-48 object-cover rounded-xl" muted playsInline />
                <p className="text-[10px] text-cyan-300 font-mono animate-pulse">Point camera at Checkpoint QR code...</p>
              </div>
            )}

            <input
              type="text"
              placeholder="e.g. Server Room / Gate 2"
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="Completed">Completed (Normal)</option>
              <option value="Incident Reported">Incident Reported</option>
              <option value="Maintenance Needed">Maintenance Needed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Incident Report / Notes</label>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-[10px] bg-slate-800 border border-slate-700 text-cyan-400 px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-slate-700"
              >
                📸 Snap Incident Photo
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </div>

            <textarea
              placeholder="Describe any anomalies or leave blank..."
              value={incidentReport}
              onChange={(e) => setIncidentReport(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 h-24 resize-none"
            />

            {capturedPhoto && (
              <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <img src={capturedPhoto} alt="Incident snapshot" className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-emerald-400">Photo attached successfully</p>
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="text-[10px] text-red-400 underline cursor-pointer"
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? 'Transmitting Telemetry...' : 'Submit Patrol Log'}
          </button>
        </form>

      </div>
    </main>
  );
}
