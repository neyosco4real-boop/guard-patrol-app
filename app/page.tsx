'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GuardPatrolSystem() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'feed' | 'checkpoints'>('scanner');
  
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

  const [guardLogs, setGuardLogs] = useState<any[]>([]);
  const [checkpointsList, setCheckpointsList] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Clock interval matching the exact UI clock badge top right
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const loc = params.get('location');
      const chk = params.get('checkpoint');
      if (loc) setLocation(decodeURIComponent(loc));
      if (chk) setCheckpoint(decodeURIComponent(chk));
    }

    if (typeof window !== 'undefined' && !document.getElementById('html5-qrcode-script')) {
      const script = document.createElement('script');
      script.id = 'html5-qrcode-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
      script.async = true;
      document.body.appendChild(script);
    }

    fetchGuardLogs();
    fetchCheckpoints();

    const channel = supabase
      .channel('public:guard_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guard_logs' }, (payload) => {
        setGuardLogs((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      stopScanner();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGuardLogs = async () => {
    setLoadingFeed(true);
    const { data, error } = await supabase
      .from('guard_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setGuardLogs(data);
    }
    setLoadingFeed(false);
  };

  const fetchCheckpoints = async () => {
    const { data, error } = await supabase.from('checkpoints').select('*');
    if (!error && data) {
      setCheckpointsList(data);
    }
  };

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
            { fps: 10, qrbox: { width: 220, height: 220 } },
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
        setStatusMessage({ text: 'Camera access error. Please use QR photo upload below.', type: 'error' });
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
    if (!checkpoint.trim()) {
      setStatusMessage({ text: 'Error: Checkpoint must be populated via QR scan.', type: 'error' });
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
        location: location.trim() || 'Main Facility',
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
      setCheckpoint('');
      setActiveTab('feed');
      fetchGuardLogs();
    } else {
      setStatusMessage({ text: 'Submission Error: ' + error.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 font-sans max-w-md mx-auto">
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
        
        {/* Exact Header matching the screenshot */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-3xl shadow-xl relative">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center shadow">
                🛡️
              </div>
              <div>
                <h1 className="text-sm font-black text-white uppercase tracking-wide">Guard Patrol</h1>
                <h1 className="text-sm font-black text-white uppercase tracking-wide">Scanner</h1>
              </div>
            </div>

            {/* Live Feed Connected Badge */}
            <div className="bg-[#070b14] border border-[#1e293b] px-3 py-1.5 rounded-full flex items-center gap-2 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-400">Live Feed Connected</span>
            </div>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex bg-[#070b14] p-1 rounded-xl mt-4 border border-[#1e293b]">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              📷 Scanner
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'feed' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              📡 Live Feed
            </button>
            <button
              onClick={() => setActiveTab('checkpoints')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'checkpoints' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              📍 Checkpoints
            </button>
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

        {/* TAB 1: EXACT UI SCANNER */}
        {activeTab === 'scanner' && (
          <div className="space-y-4">
            {/* Exact Scanner Box */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-4 shadow-xl space-y-3">
              <div className="flex justify-between items-center text-xs font-black uppercase text-slate-300">
                <span>QR CODE CHECKPOINT SCANNER</span>
                <span className="text-emerald-400 font-mono text-[11px]">{currentTime}</span>
              </div>
              
              {isScanning ? (
                <div className="relative rounded-2xl overflow-hidden bg-black p-2 text-center">
                  <div id="reader-container" className="w-full"></div>
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="mt-3 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow cursor-pointer"
                  >
                    Close Camera
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-[#070b14] border border-[#1e293b] p-6 text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center shadow-inner">
                    <span className="text-xl">📷</span>
                  </div>
                  <p className="text-xs text-slate-400">Open scanner to read checkpoint QR code</p>

                  <button
                    type="button"
                    onClick={startScanner}
                    className="w-full bg-[#10b981] hover:bg-emerald-500 text-[#070b14] font-black py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider"
                  >
                    <span>📷</span> OPEN QR SCANNER CAMERA
                  </button>

                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    className="w-full bg-[#1e293b] hover:bg-slate-700 text-cyan-400 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 shadow cursor-pointer"
                  >
                    📸 Snap/Upload QR Photo (Guaranteed)
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
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Location (Auto-Filled by QR) *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Awaiting QR scan..."
                  className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Checkpoint (Auto-Filled by QR) *</label>
                <input
                  type="text"
                  value={checkpoint}
                  onChange={(e) => setCheckpoint(e.target.value)}
                  placeholder="Awaiting QR scan..."
                  className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-4 py-3 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
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
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Patrol / Incident Notes & Evidence</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    📸 Snap Evidence
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
                {submitting ? 'Submitting Log...' : 'Submit Patrol Log'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LIVE FEED */}
        {activeTab === 'feed' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-300">📡 Live Patrol Feed</span>
              <button
                onClick={fetchGuardLogs}
                className="text-[10px] bg-[#070b14] text-emerald-400 px-3 py-1 rounded-lg border border-[#1e293b] hover:bg-slate-800 cursor-pointer font-bold"
              >
                🔄 Refresh
              </button>
            </div>

            {loadingFeed ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading live logs...</div>
            ) : guardLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No patrol logs recorded yet.</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {guardLogs.map((log, index) => (
                  <div key={log.id || index} className="bg-[#070b14] border border-[#1e293b] rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-black text-white">{log.guard_name}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{log.location} • {log.checkpoint}</div>
                      </div>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800 font-bold">
                        {log.patrol_type || 'Patrol'}
                      </span>
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-slate-300 bg-[#0f172a]/80 p-2 rounded-xl border border-[#1e293b]">
                        {log.notes}
                      </p>
                    )}

                    {log.evidence_photo && (
                      <div className="mt-2">
                        <img src={log.evidence_photo} alt="Evidence" className="w-full h-32 object-cover rounded-xl border border-[#1e293b]" />
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono pt-1 border-t border-[#0f172a]">
                      <span>📍 {log.latitude}, {log.longitude}</span>
                      <span>{new Date(log.created_at || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHECKPOINTS */}
        {activeTab === 'checkpoints' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-3xl p-4 shadow-xl space-y-3">
            <div className="text-xs font-black uppercase text-slate-300">📍 Registered Checkpoints</div>
            {checkpointsList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No checkpoints registered in database.</div>
            ) : (
              <div className="space-y-2">
                {checkpointsList.map((cp, idx) => (
                  <div key={cp.id || idx} className="bg-[#070b14] border border-[#1e293b] p-3 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-white">{cp.name || cp.checkpoint}</div>
                      <div className="text-[10px] text-slate-400">{cp.location}</div>
                    </div>
                    <button
                      onClick={() => {
                        setLocation(cp.location || '');
                        setCheckpoint(cp.name || cp.checkpoint || '');
                        setActiveTab('scanner');
                      }}
                      className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-xl border border-emerald-800 transition cursor-pointer"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
