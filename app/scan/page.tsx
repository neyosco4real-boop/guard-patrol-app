"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import jsQR from "jsqr";

const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner), { ssr: false });


  const handleDeleteLocation = async (locId: string, locName: string, e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${locName}" and all associated checkpoints?`)) return;
    try {
      const { error } = await supabase.from('locations').delete().eq('id', locId);
      if (error) throw error;
      toast.success("Site deleted successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to delete site: " + err.message);
    }
  };

export default function MobileGuardScanner() {
  const isProcessingRef = useRef(false);
  const [guardName, setGuardName] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Incident State
  const [hasIncident, setHasIncident] = useState(true);
  const [incidentNotes, setIncidentNotes] = useState(
    " "
  );
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  // Live Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startLiveCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
    isProcessingRef.current = false;
      alert("Unable to access camera for live capture: " + err);
      setIsCameraActive(false);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(dataUrl);
      setBase64Image(dataUrl);
    }
    stopLiveCamera();
  };

  const stopLiveCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileSelect = (file: File) => {
    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBase64Image(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const processQrCode = async (qrHash: string) => {
    if (!qrHash || loading) return;
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const guardLat = position.coords.latitude;
        const guardLng = position.coords.longitude;

        const { data: cp, error } = await supabase
          .from("checkpoints_view")
          .select("*")
          .eq("id", qrHash)
          .single();

        if (error || !cp) {
          alert("Invalid or unregistered QR code.");
          setLoading(false);
          return;
        }

        const R = 6371e3;
        const φ1 = (guardLat * Math.PI) / 180;
        const φ2 = (cp.latitude * Math.PI) / 180;
        const Δφ = ((cp.latitude - guardLat) * Math.PI) / 180;
        const Δλ = ((cp.longitude - guardLng) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const isValid = distance <= (cp.radius_meters || 50);

        let fileUrl = null;
        if (attachmentFile || capturedPhoto) {
          try {
            let blob: Blob;
            let fileName = `incident_${Date.now()}.jpg`;

            if (capturedPhoto) {
              const res = await fetch(capturedPhoto);
              blob = await res.blob();
            } else {
              blob = attachmentFile!;
              fileName = `${Date.now()}_${attachmentFile!.name}`;
            }

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from("incident-attachments")
              .upload(fileName, blob);

            if (!uploadErr && uploadData) {
              const { data: publicUrlData } = supabase.storage
                .from("incident-attachments")
                .getPublicUrl(uploadData.path);
              fileUrl = publicUrlData.publicUrl;
            }
          } catch (e) {
    isProcessingRef.current = false;
            console.error("Attachment upload error:", e);
          }
        }

        if (loading) return;
    setLoading(true);
    const scanTimestamp = new Date().toISOString();

        const { data: insertedScan, error: insertErr } = await supabase
          .from("patrol_feeds")
          .insert([
            {
              checkpoint_id: cp.id,
              checkpoint_name: cp.checkpoint_name || cp.name,
              location_name: cp.location_name,
              guard_name: guardName && guardName.trim() ? guardName.trim() : "Guard #26158",
              latitude: guardLat,
              longitude: guardLng,
              distance_variance: Math.round(distance),
              is_valid: isValid,
              scanned_at: scanTimestamp,
              incident_notes: hasIncident ? incidentNotes : null,
              attachment_url: fileUrl,
            },
          ])
          .select()
          .single();

        setLoading(false);

        if (insertErr) {
          alert("Error saving patrol scan: " + insertErr.message);
        } else {
          setScanResult({
            scanId: insertedScan?.id || `SCAN-${Date.now()}`,
            checkpoint: cp.checkpoint_name || cp.name,
            location: cp.location_name,
            latitude: guardLat,
            longitude: guardLng,
            coordinates: `${guardLat.toFixed(6)}, ${guardLng.toFixed(6)}`,
            isValid,
            variance: Math.round(distance),
            incidentReported: hasIncident,
            timestamp: new Date(scanTimestamp).toLocaleString(),
            notes: hasIncident ? incidentNotes : null,
            image: base64Image,
          });
        }
      },
      (err) => {
        alert("Location access required for geofence verification: " + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleScan = (result: any) => {
    if (!result || !result[0]?.rawValue) return;
    setIsScanning(false);
    processQrCode(result[0].rawValue.trim());
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processQrCode(code.data.trim());
        } else {
          alert("No readable QR code found in the uploaded image.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetScanner = () => {
    setScanResult(null);
    setHasIncident(false);
    setIncidentNotes("");
    setAttachmentFile(null);
    setCapturedPhoto(null);
    setBase64Image(null);
    setIsScanning(false);
  };

  return (
    <main className="min-h-screen bg-[#070b19] text-slate-200 flex items-center justify-center p-4">
      <div className="bg-[#0b1026] border border-slate-800/80 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <span className="bg-[#12193b] text-[#5b63d3] border border-[#232b5d] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            MOBILE PATROL UNIT
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ONLINE
          </span>
        </div>

        {/* QR Scanner Controls */}
        {!scanResult && (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Scan Physical QR Code</h1>
              <p className="text-xs text-slate-400">Point camera at wall checkpoint tag</p>
            </div>

            <div className="bg-[#050814] border border-slate-800/90 rounded-2xl min-h-[220px] flex flex-col items-center justify-center relative p-6">
              {isScanning ? (
                <div className="w-full h-56 rounded-xl overflow-hidden relative">
                  <Scanner onScan={handleScan} onError={() => setCameraError(true)} />
                  <button
                    onClick={() => setIsScanning(false)}
                    className="absolute top-2 right-2 bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4 w-full flex flex-col items-center">
                  <div className="w-10 h-14 border-2 border-emerald-400/80 rounded-lg p-1 flex flex-col justify-between items-center bg-[#070e24]">
                    <div className="w-full grid grid-cols-3 gap-0.5 pt-0.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-1 rounded-[1px] bg-indigo-400/80"></div>
                      ))}
                    </div>
                    <div className="w-2 h-2 rounded-full border border-slate-400"></div>
                  </div>

                  <div className="w-full space-y-2">
                    <button
                      onClick={() => setIsScanning(true)}
                      className="w-full py-3 bg-[#5046e5] hover:bg-[#4338ca] text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20"
                    >
                      Request Camera Permissions
                    </button>

                    <label className="inline-block text-xs font-semibold text-indigo-300 hover:text-indigo-200 cursor-pointer underline underline-offset-4 pt-1">
                      Scan an Image File
                      <input type="file" accept="image/*" className="hidden" onChange={handleQrImageUpload} />
                    </label>
                  </div>

                  {cameraError && (
                    <p className="text-[10px] text-rose-400">Camera permission denied or unreadable.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] font-medium mb-1.5">Guard Personnel</label>
              <input
                type="text"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                className="w-full bg-[#050814] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Incident Reporting Block */}
            <div className="border-t border-slate-800/80 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  ⚠️ Report Incident / Flag Area
                </span>
                <input
                  type="checkbox"
                  checked={hasIncident}
                  onChange={(e) => setHasIncident(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {hasIncident && (
                <div className="space-y-3 bg-[#050814]/80 p-3.5 rounded-2xl border border-slate-800/90 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold mb-1">
                      Incident Observation Notes
                    </label>
                    <textarea
                      rows={3}
                      value={incidentNotes}
                      onChange={(e) => setIncidentNotes(e.target.value)}
                      className="w-full bg-[#090e24] border border-slate-700/80 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-slate-400 text-[10px] font-semibold">
                      Proof Photo / Media Attachment
                    </label>

                    {isCameraActive && (
                      <div className="space-y-2 bg-[#090e24] p-2 rounded-xl border border-slate-700">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-40 rounded-lg object-cover bg-black" />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhotoFromCamera}
                            className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-[11px] rounded-lg"
                          >
                            📸 Snap Photo
                          </button>
                          <button
                            type="button"
                            onClick={stopLiveCamera}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[11px] rounded-lg"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {base64Image && (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-700 bg-black">
                        <img src={base64Image} alt="Captured incident" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setCapturedPhoto(null);
                            setBase64Image(null);
                            setAttachmentFile(null);
                          }}
                          className="absolute top-1 right-1 bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded-md"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {!isCameraActive && !base64Image && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={startLiveCamera}
                          className="py-2.5 bg-[#12193b] text-[#7178f0] border border-[#21295b] hover:bg-indigo-600 hover:text-white rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
                        >
                          📷 Live Camera
                        </button>

                        <label className="py-2.5 bg-[#12193b] text-slate-300 border border-[#21295b] hover:bg-slate-700 rounded-xl font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition">
                          📎 Attach File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {attachmentFile && (
                      <div className="text-[10px] text-emerald-400 font-mono truncate pt-1">
                        Attached: {attachmentFile.name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Confirmation Screen After Scan */}
        {scanResult && (
          <div className="space-y-4 text-center">
            <div className="bg-[#050814] p-5 rounded-2xl border border-slate-800 text-slate-200 space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-xl font-bold">
                ✓
              </div>

              <div>
                <h2 className="text-sm font-bold tracking-wide text-white uppercase">Patrol Record Submitted</h2>
                <p className="text-[11px] text-slate-400 mt-1">Logged securely to audit database</p>
              </div>

              <div className="text-left text-xs font-mono bg-[#090e24] p-3 rounded-xl border border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-500 text-[10px] block">SCAN ID</span>
                  <span className="font-semibold text-white">{scanResult.scanId}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">CHECKPOINT</span>
                  <span className="font-semibold text-white">{scanResult.location} — {scanResult.checkpoint}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">TIMESTAMPS</span>
                  <span className="font-semibold text-white">{scanResult.timestamp}</span>
                </div>
              </div>
            </div>

            <button
              onClick={resetScanner}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              Scan Next Checkpoint
            </button>
          </div>
        )}

<div className="border-t border-slate-800/60 pt-4 text-center"><button onClick={() => window.location.href = '/scan'} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition duration-200">✓ Complete & Scan Next Checkpoint</button></div>
      </div>
    </main>
  );
}
