'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScanPage() {
  const [checkpointId, setCheckpointId] = useState<string>('');
  const [checkpointName, setCheckpointName] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('Tom Salem Head Office');
  
  const [guardName, setGuardName] = useState('');
  const [notes, setNotes] = useState('Normal Patrol Scan');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gps, setGps] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [status, setStatus] = useState<string>('READY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS Error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (checkpointId && checkpointId.length === 36) {
      fetchCheckpointDetails(checkpointId);
    }
  }, [checkpointId]);

  const startFreshScanner = async () => {
    setScanning(true);
    setErrorMessage(null);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          const uuidMatch = decodedText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          const scannedId = uuidMatch ? uuidMatch[0].trim() : decodedText.trim();
          
          if (scannedId.length === 36) {
            setCheckpointId(scannedId);
            await html5QrCode.stop();
            setScanning(false);
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Camera error: ${err?.message || 'Could not start camera'}`);
      setScanning(false);
    }
  };

  const fetchCheckpointDetails = async (id: string) => {
    const { data } = await supabase
      .from('checkpoints')
      .select('*, sites(name)')
      .eq('id', id)
      .single();

    if (data) {
      if (data.name) setCheckpointName(data.name);
      if (data.sites?.name) setSiteName(data.sites.name);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!checkpointId || !uuidRegex.test(checkpointId)) {
      setErrorMessage('Security Error: Invalid Checkpoint ID format.');
      setStatus('ERROR');
      return;
    }

    setStatus('SUBMITTING');
    setErrorMessage(null);

    try {
      let photoUrl = '';
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('patrol_photos').upload(fileName, photoFile);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('patrol_photos').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      }

      const payload = {
        checkpoint_id: checkpointId,
        checkpoint_name: checkpointName || 'Patrol Checkpoint',
        location_name: siteName || 'Tom Salem Head Office',
        guard_name: guardName || 'Officer',
        latitude: gps.lat,
        longitude: gps.lng,
        notes: notes || 'Normal Patrol Scan',
        photo_url: photoUrl,
        status: 'ACKNOWLEDGED',
        scanned_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('patrol_logs').insert([payload]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccessMessage('Patrol scan successfully recorded and verified!');
      setStatus('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Submission failed: ${err.message || 'Database error'}`);
      setStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="text-xl">🛡️</span>
          </div>
          <h1 className="text-base font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Guard Patrol PWA
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Clean Rebuilt Scan Terminal</p>
        </div>

        {/* GPS Widget */}
        <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300">
              {gps.lat ? `GPS Active (${gps.lat.toFixed(4)}, ${gps.lng?.toFixed(4)})` : 'Acquiring GPS...'}
            </span>
          </div>
        </div>

        {/* Fresh Scanner Box */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 text-center">
          <div id="reader" className="overflow-hidden rounded-xl"></div>
          {!scanning ? (
            <button
              type="button"
              onClick={startFreshScanner}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              📷 Tap to Launch Fresh Scanner
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full bg-rose-950 text-rose-300 font-bold py-2 rounded-xl text-xs uppercase border border-rose-500/30 cursor-pointer"
            >
              Cancel Camera Scan
            </button>
          )}
        </div>

        {successMessage ? (
          <div className="bg-emerald-950/60 border border-emerald-500/40 p-6 rounded-2xl text-center space-y-3">
            <span className="text-3xl">✅</span>
            <h3 className="text-sm font-bold text-emerald-300 uppercase">Scan Logged Successfully</h3>
            <p className="text-xs text-slate-300">{successMessage}</p>
            <button
              onClick={() => {
                setSuccessMessage(null);
                setStatus('READY');
                setCheckpointId('');
                setCheckpointName('');
                setNotes('Normal Patrol Scan');
                setPhotoFile(null);
              }}
              className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl text-xs uppercase mt-2 cursor-pointer"
            >
              Scan Another Checkpoint
            </button>
          </div>
        ) : (
          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Guard Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Officer Joshua"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Scanned Checkpoint</label>
                {checkpointId && (
                  <button
                    type="button"
                    onClick={() => { setCheckpointId(''); setCheckpointName(''); }}
                    className="text-[9px] text-rose-400 uppercase font-mono hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="text"
                readOnly
                value={checkpointName ? `${checkpointName} (Verified)` : (checkpointId ? `UUID: ${checkpointId}` : 'Scan a QR Code above')}
                className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2.5 text-xs text-cyan-300 font-mono outline-none cursor-default"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Patrol Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Photo Evidence (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-cyan-300 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-mono">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'SUBMITTING' || !checkpointId || checkpointId.length !== 36}
              className="w-full bg-cyan-500 text-slate-950 font-black py-3 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 disabled:opacity-45 transition-all cursor-pointer"
            >
              {status === 'SUBMITTING' ? 'Submitting Log...' : '🚨 Submit Patrol Log'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
