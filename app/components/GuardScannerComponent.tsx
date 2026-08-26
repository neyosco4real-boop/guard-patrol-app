'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import jsQR from 'jsqr';

export default function GuardScannerComponent() {
  const supabase = createClientComponentClient();
  const [guardName, setGuardName] = useState('Guard Alpha');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [checkpointName, setCheckpointName] = useState<string | null>(null);
  const [patrolStatus, setPatrolStatus] = useState<'NORMAL' | 'INCIDENT'>('NORMAL');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          animId = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.error('Camera access error:', err);
      }
    };

    const scanFrame = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleCodeDetected(code.data);
            return;
          }
        }
      }
      animId = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  const handleCodeDetected = async (code: string) => {
    setScannedCode(code);
    try {
      const { data } = await supabase.from('checkpoints').select('name').eq('id', code).single();
      setCheckpointName(data?.name || 'Checkpoint Detected');
    } catch {
      setCheckpointName('Checkpoint Detected');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('incidents').upload(fileName, file);
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('incidents').getPublicUrl(fileName);
      setMediaUrl(data.publicUrl);
    } catch (err: any) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!scannedCode) return alert('Please scan a QR code first!');
    setSubmitting(true);
    try {
      const isIncident = patrolStatus === 'INCIDENT';
      const payload = {
        checkpoint_id: scannedCode,
        guard_name: guardName,
        status: isIncident ? 'INCIDENT' : 'VERIFIED',
        notes: isIncident ? incidentNotes : 'Normal Patrol Scan',
        incident_description: isIncident ? incidentNotes : null,
        media_url: isIncident ? mediaUrl : null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('logs').insert([payload]);
      if (error) throw error;

      alert(isIncident ? '🚨 Incident Logged & Dispatched to Live Feed!' : '✓ Patrol Verified!');
      setScannedCode(null);
      setCheckpointName(null);
      setIncidentNotes('');
      setMediaUrl(null);
      setPatrolStatus('NORMAL');
    } catch (err: any) {
      alert('Error saving scan log: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4">
      <div className="text-center pb-2 border-b border-slate-800">
        <h1 className="text-lg font-bold">Guard Patrol Scanner</h1>
        <p className="text-xs text-slate-400">Point camera at checkpoint QR code</p>
      </div>

      {/* Guard Name Input */}
      <div>
        <label className="text-xs text-slate-400 block mb-1">Guard Name</label>
        <input 
          type="text" 
          value={guardName} 
          onChange={(e) => setGuardName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white"
        />
      </div>

      {/* Camera Area */}
      <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 aspect-square flex items-center justify-center">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        {scannedCode && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-10 space-y-2">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">✓ Checkpoint Detected</span>
            <h3 className="text-lg font-bold">{checkpointName}</h3>
            <p className="text-xs text-slate-400 break-all">{scannedCode}</p>
            <button onClick={() => setScannedCode(null)} className="mt-2 text-xs text-slate-400 underline">Rescan Code</button>
          </div>
        )}
      </div>

      {/* Patrol Status Toggle */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Patrol Status</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPatrolStatus('NORMAL')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
              patrolStatus === 'NORMAL' 
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/50' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            ✓ Verified Normal
          </button>

          <button
            type="button"
            onClick={() => setPatrolStatus('INCIDENT')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
              patrolStatus === 'INCIDENT' 
                ? 'bg-red-950 text-red-400 border-red-500/50' 
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            ⚠️ Report Incident
          </button>
        </div>
      </div>

      {/* Incident Panel */}
      {patrolStatus === 'INCIDENT' && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 space-y-3">
          <div>
            <label className="text-xs text-red-300 block mb-1 font-semibold">Incident Log Notes</label>
            <textarea
              rows={3}
              value={incidentNotes}
              onChange={(e) => setIncidentNotes(e.target.value)}
              placeholder="Describe what occurred at this checkpoint..."
              className="w-full bg-slate-900 border border-red-950 rounded p-2 text-xs text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs text-red-300 block mb-1 font-semibold">Incident Evidence</label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            {mediaUrl ? (
              <div className="relative rounded overflow-hidden border border-red-500/30">
                <img src={mediaUrl} alt="Incident media" className="w-full h-32 object-cover" />
                <button 
                  onClick={() => setMediaUrl(null)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2 bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 rounded hover:bg-slate-800"
              >
                {uploading ? 'Uploading Photo...' : '📷 Snap / Attach Media'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !scannedCode}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
      >
        {submitting ? 'Submitting Log...' : '✓ Complete & Scan Next Checkpoint'}
      </button>
    </div>
  );
}
