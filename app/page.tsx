'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';

export default function GuardScannerPage() {
  const [guardName, setGuardName] = useState('');
  const [scannedCheckpointId, setScannedCheckpointId] = useState('');
  const [checkpointDetails, setCheckpointDetails] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [gpsStatus, setGpsStatus] = useState<string>('Acquiring GPS...');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    requestGps();
    return () => {
      stopScanner();
    };
  }, []);

  const requestGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus(`GPS Active (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      (err) => setGpsStatus(`GPS Error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await handleSuccessfulScan(decodedText);
            await stopScanner();
          },
          (errorMessage) => {}
        );
      } catch (err) {
        console.error(err);
        alert('Camera access denied or PWA permission issue.');
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccessfulScan = async (rawText: string) => {
    const cleanId = rawText.trim();
    setScannedCheckpointId(cleanId);
    
    // Attempt standard UUID match
    let { data, error } = await supabase
      .from('checkpoints')
      .select('id, name, sites(name)')
      .eq('id', cleanId)
      .maybeSingle();

    // Fallback search by name if ID lookup fails
    if (!data || error) {
      const { data: nameData } = await supabase
        .from('checkpoints')
        .select('id, name, sites(name)')
        .ilike('name', `%${cleanId}%`)
        .maybeSingle();
      if (nameData) data = nameData;
    }

    if (data) {
      setCheckpointDetails(data);
    } else {
      setCheckpointDetails({
        name: cleanId,
        sites: { name: 'Active Field Site' }
      });
    }
  };

  const getFreshPosition = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: coords.lat, lng: coords.lng });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: coords.lat, lng: coords.lng }),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName) return alert('Please enter guard name.');
    if (!scannedCheckpointId) return alert('Please scan a checkpoint QR code first.');

    setLoading(true);
    const freshCoords = await getFreshPosition();

    let photoUrl = '';
    if (photo) {
      const fileName = `${Date.now()}_${photo.name}`;
      const { data: uploadData } = await supabase.storage.from('patrol_photos').upload(fileName, photo);
      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from('patrol_photos').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('patrol_logs').insert([
      {
        guard_name: guardName,
        checkpoint_id: scannedCheckpointId,
        checkpoint_name: checkpointDetails?.name || scannedCheckpointId,
        location_name: checkpointDetails?.sites?.name || 'Field Site',
        latitude: freshCoords.lat,
        longitude: freshCoords.lng,
        notes: notes || 'Normal Patrol Scan',
        photo_url: photoUrl || null,
        status: 'VERIFIED',
        scanned_at: new Date().toISOString(),
      },
    ]);

    setLoading(false);
    if (error) {
      alert(`Submission failed: ${error.message}`);
    } else {
      setSuccess(true);
      setNotes('');
      setPhoto(null);
      setScannedCheckpointId('');
      setCheckpointDetails(null);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans">
      <header className="border-b border-white/10 pb-3 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-cyan-400 uppercase">🛡️ Guard Patrol PWA</h1>
          <p className="text-xs text-slate-400">Standalone Terminal & Geofence Sync</p>
        </div>
      </header>

      {/* GPS Status Bar */}
      <div className={`p-3 rounded-2xl border text-xs font-mono flex items-center justify-between ${
        coords.lat ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
      }`}>
        <span>📍 {gpsStatus}</span>
        <button type="button" onClick={requestGps} className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-xl text-[10px] font-bold text-white">
          Refresh
        </button>
      </div>

      {/* QR Scanner Viewfinder Box */}
      {isScanning ? (
        <div className="bg-slate-900 border border-cyan-500/40 p-4 rounded-3xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-cyan-300 uppercase">📷 Align QR Code inside Box</span>
            <button type="button" onClick={stopScanner} className="text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-xl font-bold">
              Cancel
            </button>
          </div>
          <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black"></div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startScanner}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-4 rounded-3xl text-xs uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="text-base">📷</span> Open QR Scanner Viewfinder
        </button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 p-4 border border-white/10 rounded-3xl">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Guard Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Officer Joshua"
            value={guardName}
            onChange={(e) => setGuardName(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Scanned Checkpoint Name</label>
          <input
            type="text"
            readOnly
            placeholder="Scan QR code with camera above"
            value={checkpointDetails ? `${checkpointDetails.name} (${checkpointDetails.sites?.name})` : scannedCheckpointId}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-cyan-300 outline-none font-mono"
          />
          {checkpointDetails && (
            <p className="text-[10px] text-emerald-400 mt-1 font-mono">
              ✓ Resolved Checkpoint: {checkpointDetails.name}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Patrol Notes / Incident</label>
          <textarea
            rows={2}
            placeholder="Normal Patrol Scan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Attach Photo Evidence (Optional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Submitting Log...' : '🚀 Submit Patrol Log'}
        </button>

        {success && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-xl text-xs font-bold text-center">
            ✓ Log Submitted with GPS & Checkpoint Name!
          </div>
        )}
      </form>
    </div>
  );
}
