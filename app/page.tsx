'use client';
import { compressImage } from '@/utils/compressor';
import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';

export default function PatrolApp() {
  const [guardName, setGuardName] = useState('');
  const [locationSite, setLocationSite] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('Acquiring GPS...');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Completed');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsCoordinates('Not Supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lon = position.coords.longitude.toFixed(5);
        setGpsCoordinates(`${lat}, ${lon}`);
      },
      (error) => {
        setGpsCoordinates('Permission Denied / Unavailable');
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  }, []);

  const startScanner = async () => {
    setScanning(true);
    setFeedback(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      setFeedback('Camera access denied or unavailable.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scanTick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              const rawData = code.data;
              let parsedLoc = '';
              let parsedCp = '';

              if (rawData.includes('|')) {
                const parts = rawData.split('|');
                for (const part of parts) {
                  const lower = part.toLowerCase();
                  if (lower.includes('location')) {
                    parsedLoc = part.split(':')[1]?.trim() || part.trim();
                  } else if (lower.includes('checkpoint')) {
                    parsedCp = part.split(':')[1]?.trim() || part.trim();
                  }
                }
                if (!parsedLoc && !parsedCp && parts.length >= 2) {
                  parsedLoc = parts[0].replace(/location[:\s]*/i, '').trim();
                  parsedCp = parts[1].replace(/checkpoint[:\s]*/i, '').trim();
                }
              }

              if (parsedLoc) setLocationSite(parsedLoc);
              if (parsedCp) setCheckpoint(parsedCp);
              
              if (!parsedLoc && !parsedCp) {
                setCheckpoint(rawData.replace(/checkpoint[:\s]*/i, '').trim());
              }

              stopScanner();
              setFeedback('QR Code captured successfully!');
              return;
            }
          }
        }
      }
      if (scanning) {
        timeoutId = setTimeout(scanTick, 250);
      }
    };

    if (scanning) {
      scanTick();
    }

    return () => clearTimeout(timeoutId);
  }, [scanning]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    try {
      const compressedFile = await compressImage(file, 800, 0.7);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIncidentPhoto(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Image compression failed:', error);
    }
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName || !locationSite) {
      setFeedback('Please fill in Guard Name and Location Site.');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guard_name: guardName,
          location: locationSite,
          checkpoint: checkpoint || 'Main Entrance',
          gps_coordinates: gpsCoordinates,
          incident_report: notes || 'No issue',
          attachment_url: incidentPhoto,
          status: status
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setFeedback('Telemetry transmitted successfully!');
      setCheckpoint('');
      setNotes('');
      setIncidentPhoto(null);
    } catch (err: any) {
      setFeedback('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold mb-1">🛡️ Guard Patrol Scanner</h1>
        <p className="text-sm text-slate-400 mb-4">Scan physical checkpoint QRs and capture live GPS telemetry.</p>
        
        {feedback && (
          <div className="mb-4 p-3 bg-teal-950 border border-teal-500/50 text-teal-300 text-xs rounded-xl text-center font-medium">
            {feedback}
          </div>
        )}

        {scanning ? (
          <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-teal-500/50 text-center">
            <video ref={videoRef} className="w-full h-48 object-cover rounded-lg mb-3" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <button 
              type="button" 
              onClick={stopScanner}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-sm w-full"
            >
              Cancel Scanner
            </button>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={startScanner}
            className="w-full mb-6 bg-slate-800 hover:bg-slate-700 border border-teal-500/40 text-teal-400 font-semibold py-3 rounded-xl transition-all shadow flex items-center justify-center gap-2"
          >
            <span>📷 Scan QR Camera</span>
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Guard Name</label>
            <input 
              type="text" 
              value={guardName} 
              onChange={(e) => setGuardName(e.target.value)} 
              placeholder="Enter guard name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Location Site</label>
            <input 
              type="text" 
              value={locationSite} 
              onChange={(e) => setLocationSite(e.target.value)} 
              placeholder="e.g. Multichoice"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
              required 
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">Checkpoint</label>
            <input 
              type="text" 
              value={checkpoint} 
              onChange={(e) => setCheckpoint(e.target.value)} 
              placeholder="e.g. Gate 2 / Server Room"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">GPS Coordinates (Live)</label>
            <input 
              type="text" 
              value={gpsCoordinates} 
              readOnly
              className="w-full bg-slate-950 border border-slate-800 text-teal-400 font-mono rounded-xl p-3 text-sm focus:outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs uppercase font-semibold text-slate-400">Incident Report / Notes</label>
              <button 
                type="button" 
                onClick={() => photoInputRef.current?.click()}
                className="text-xs text-teal-400 hover:underline flex items-center gap-1"
              >
                📸 {incidentPhoto ? 'Photo Attached ✅' : 'Snap Incident Photo'}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={photoInputRef} 
                onChange={handlePhotoCapture} 
                className="hidden" 
              />
            </div>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Describe any anomalies or leave blank..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 h-24 resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2 disabled:opacity-50"
          >
            {loading ? 'TRANSMITTING TELEMETRY...' : 'SUBMIT PATROL LOG'}
          </button>
        </form>
      </div>
    </main>
  );
}
