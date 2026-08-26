"use client";
// Helper function to calculate distance in meters between two GPS points
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};



import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import jsQR from "jsqr";


// ADMIN PASSCODE CONFIGURATION
const ADMIN_PASSCODE = "admin123";

interface LocationOption {
  id: string;
  name: string;
  address?: string;
}

interface Checkpoint {
  id: string;
  location_id: string;
  checkpoint_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface PatrolFeed {
  id: string;
  guard_name: string;
  location_name: string;
  checkpoint_name: string;
  status: "verified" | "flagged" | "incident";
  created_at: string;
  incident_photo?: string;
  notes?: string;
  incident_status?: "open" | "acknowledged" | "resolved";
  assigned_guard?: string;
  admin_notes?: string;
  is_archived?: boolean;
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


  const handleDeleteLocation = async (locId: string) => {
    if (!confirm("Are you sure you want to delete this site and its checkpoints?")) return;
    const { error } = await supabase.from('locations').delete().eq('id', locId);
    if (error) { toast.error("Error deleting site: " + error.message); }
    else { toast.success("Site deleted successfully!"); window.location.reload(); }
  };

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [patrolFeeds, setPatrolFeeds] = useState<PatrolFeed[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [selectedReportLocation, setSelectedReportLocation] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"live" | "archive">("live");

  const [feedFilter, setFeedFilter] = useState<"all" | "incident">("all");
  const [selectedIncident, setSelectedIncident] = useState<PatrolFeed | null>(null);
  const [assignedGuard, setAssignedGuard] = useState("");
  const [adminNoteInput, setAdminNoteInput] = useState("");

  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({});

  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isAddCheckpointOpen, setIsAddCheckpointOpen] = useState(false);
  const [isEditCheckpointOpen, setIsEditCheckpointOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ name: string; hash: string } | null>(null);

  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [checkpointName, setCheckpointName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("50");
  const [isLocating, setIsLocating] = useState(false);

  const [guardNameInput, setGuardNameInput] = useState("Guard Alpha");
  const [scannedCheckpoint, setScannedCheckpoint] = useState<Checkpoint | null>(null);
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null);
  const [isQrCameraActive, setIsQrCameraActive] = useState(false);

  const [patrolStatus, setPatrolStatus] = useState<"verified" | "incident">("verified");
  const [scannerNotes, setScannerNotes] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  const [isIncidentCameraActive, setIsIncidentCameraActive] = useState(false);

  const qrVideoRef = useRef<HTMLVideoElement | null>(null);
  const incidentVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    const authSession = sessionStorage.getItem("admin_authenticated");
    if (authSession === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchInitialData();

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    const channel = supabase
      .channel("realtime_patrol_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patrol_feeds" },
        (payload) => {
          const newRecord = payload.new as PatrolFeed;
          setPatrolFeeds((prev) => {
    if (prev.some((item) => item.id === newRecord.id)) return prev;
    return [newRecord, ...prev];
  });

          if (newRecord.status === "incident") {
            playAlertSound("incident");
            toast.error(`⚠️ INCIDENT REPORTED at ${newRecord.checkpoint_name}`, {
              description: newRecord.notes || "Guard logged an active alert.",
              duration: 8000,
            });
          } else {
            playAlertSound("verified");
            toast.success(`Check-in: ${newRecord.checkpoint_name}`, {
              description: `Scanned by ${newRecord.guard_name}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "patrol_feeds" },
        (payload) => {
          const updated = payload.new as PatrolFeed;
          setPatrolFeeds((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
          if (selectedIncident?.id === updated.id) {
            setSelectedIncident(updated);
          }
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      if (scanAnimationRef.current) cancelAnimationFrame(scanAnimationRef.current);
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSCODE) {
      sessionStorage.setItem("admin_authenticated", "true");
      setIsAuthenticated(true);
      toast.success("Authenticated successfully!");
    } else {
      toast.error("Incorrect Password! Access Denied.");
      setPasswordInput("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    toast.info("Logged out of Admin Dashboard.");
  };

  const playAlertSound = (type: "verified" | "incident") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "incident") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // Audio fallback handling
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    const [locRes, cpRes, feedRes] = await Promise.all([
      supabase.from("locations").select("*").order("created_at", { ascending: false }),
      supabase.from("checkpoints").select("*").order("created_at", { ascending: false }),
      supabase.from("patrol_feeds").select("*").order("created_at", { ascending: false }),
    ]);

    if (locRes.data) {
      setLocations(locRes.data);
      const initialExp: Record<string, boolean> = {};
      locRes.data.forEach((l) => (initialExp[l.id] = true));
      setExpandedLocations(initialExp);
      if (locRes.data.length > 0) {
        setSelectedReportLocation(locRes.data[0].name);
        setSelectedLocationId(locRes.data[0].id);
      }
    }
    if (cpRes.data) setCheckpoints(cpRes.data);
    if (feedRes.data) setPatrolFeeds(feedRes.data);

    // Clean Realtime Listener
    const channel = supabase
      .channel("realtime-patrol-feeds")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patrol_feeds" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPatrolFeeds((prev) => {
    if (prev.some((item) => item.id === payload.new.id)) return prev;
    return [payload.new as PatrolFeed, ...prev];
  });
          }
        }
      )
      .subscribe((status) => console.log("Realtime connection status:", status));
    setLoading(false);
  };

  const toggleLocationAccordion = (locId: string) => {
    setExpandedLocations((prev) => ({ ...prev, [locId]: !prev[locId] }));
  };

  const handleExportReport = (format: string) => {
    if (!selectedReportLocation) {
      return toast.error("Please select a location to download.");
    }

    const feedsToExport = patrolFeeds.filter(
      (f) =>
        f.location_name?.toLowerCase() === selectedReportLocation.toLowerCase() &&
        !f.is_archived
    );

    if (feedsToExport.length === 0) {
      return toast.error(`No new active logs found for "${selectedReportLocation}".`);
    }

    const locationSlug = selectedReportLocation.toLowerCase().replace(/\s+/g, "-");
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      const headers = "ID,Guard Name,Location,Checkpoint,Status,Date & Time,Notes\n";
      const rows = feedsToExport.map((f) =>
        [`"${f.id || ""}"`, `"${f.guard_name || ""}"`, `"${f.location_name || ""}"`, `"${f.checkpoint_name || ""}"`, `"${f.status || ""}"`, `"${(f.created_at || (f as any).timestamp || '') || ""}"`, `"${(f.notes || "").replace(/"/g, '""')}"`].join(",")
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `patrol-report-${locationSlug}-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const rowsHtml = feedsToExport.map(f => `
        <tr>
          <td>${(f.created_at || (f as any).timestamp || '') || "-"}</td>
          <td>${f.guard_name || "-"}</td>
          <td>${f.checkpoint_name || "-"}</td>
          <td>${f.status || "VERIFIED"}</td>
          <td>${(f as any).latitude && (f as any).longitude ? `${(f as any).latitude}, ${(f as any).longitude}` : ((f as any).lat && (f as any).lng ? `${(f as any).lat}, ${(f as any).lng}` : "N/A")}</td><td>${f.notes || "-"}</td>
        </tr>
      `).join("");

      const docStr = `<!DOCTYPE html><html><head><title>Patrol Report</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;}th{background-color:#f1f5f9;}</style></head><body><h1>Guard Patrol Report</h1><table><thead><tr><th>Date & Time</th><th>Guard</th><th>Checkpoint</th><th>Status</th><th>Coordinates</th><th>Notes</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;

      const blob = new Blob([docStr], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `patrol-report-${locationSlug}-${timestamp}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleUnarchiveFeed = async (id: string) => {
    const { error } = await supabase
      .from("patrol_feeds")
      .update({ is_archived: false })
      .eq("id", id);

    if (error) return toast.error("Failed to unarchive log: " + error.message);

    setPatrolFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_archived: false } : f))
    );
    toast.success("Log restored to active stream.");
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser.");
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
        toast.success("Live coordinates captured!");
      },
      (error) => {
        setIsLocating(false);
        toast.error(`Geolocation error: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName) return toast.error("Please enter a location name.");

    const { data, error } = await supabase
      .from("locations")
      .insert([{ name: newLocationName }])
      .select();

    if (error) return toast.error("Failed to add location: " + error.message);

    toast.success("Location added!");
    setNewLocationName("");
    setNewLocationAddress("");
    setIsAddLocationOpen(false);
    if (data) {
      setLocations((prev) => [data[0], ...prev]);
      setExpandedLocations((prev) => ({ ...prev, [data[0].id]: true }));
      if (!selectedReportLocation) setSelectedReportLocation(data[0].name);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId || !checkpointName) return toast.error("Location and Checkpoint Name are required.");

    const { data, error } = await supabase
      .from("checkpoints")
      .insert([
        {
          location_id: selectedLocationId,
          checkpoint_name: checkpointName,
          latitude: parseFloat(latitude) || 0,
          longitude: parseFloat(longitude) || 0,
          radius_meters: parseInt(radiusMeters) || 50,
        },
      ])
      .select();

    if (error) return toast.error("Failed to create checkpoint: " + error.message);

    toast.success("Checkpoint created successfully with Geofencing!");
    setCheckpointName("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters("50");
    setIsAddCheckpointOpen(false);
    if (data) setCheckpoints((prev) => [data[0], ...prev]);
  };

  const handleUpdateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCheckpoint) return;

    const { error } = await supabase
      .from("checkpoints")
      .update({
        checkpoint_name: checkpointName,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        radius_meters: parseInt(radiusMeters) || 50,
      })
      .eq("id", editingCheckpoint.id);

    if (error) return toast.error("Failed to update checkpoint: " + error.message);

    toast.success("Checkpoint updated!");
    setIsEditCheckpointOpen(false);
    setEditingCheckpoint(null);
    fetchInitialData();
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checkpoint?")) return;
    const { error } = await supabase.from("checkpoints").delete().eq("id", id);
    if (error) return toast.error("Failed to delete checkpoint: " + error.message);
    toast.success("Checkpoint deleted.");
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
  };

  const handleDownloadQr = async (format: "svg" | "jpg") => {
    if (!qrModalData) return;
    const size = "500x500";
    const fileName = `${qrModalData.name.toLowerCase().replace(/\s+/g, "-")}-qr.${format}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&format=${format}&data=${encodeURIComponent(
      qrModalData.hash
    )}`;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
    } catch {
      toast.error("Failed to download QR code.");
    }
  };

  const startQrCamera = async () => {
    setIsQrCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (qrVideoRef.current) {
        qrVideoRef.current.srcObject = stream;
        qrVideoRef.current.setAttribute("playsinline", "true");
        qrVideoRef.current.play();
        scanAnimationRef.current = requestAnimationFrame(tickQrScan);
      }
    } catch {
      toast.error("Camera access failed or unavailable.");
      setIsQrCameraActive(false);
    }
  };

  const tickQrScan = () => {
    if (qrVideoRef.current && qrVideoRef.current.readyState === qrVideoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement("canvas");
      canvas.width = qrVideoRef.current.videoWidth;
      canvas.height = qrVideoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(qrVideoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          const scannedData = code.data.trim();
          const matchedCp = checkpoints.find((cp) => cp.id === scannedData || cp.checkpoint_name.toLowerCase() === scannedData.toLowerCase());

          const targetCp = matchedCp || {
            id: scannedData,
            checkpoint_name: `Decoded Code: ${scannedData}`,
            location_id: locations[0]?.id || "default",
            latitude: 0,
            longitude: 0,
            radius_meters: 50,
          };

          setScannedCheckpoint(targetCp);
          setQrImagePreview(canvas.toDataURL("image/png"));
          stopQrCamera();
          toast.success(`Optical QR Match: ${targetCp.checkpoint_name}`);
          return;
        }
      }
    }
    scanAnimationRef.current = requestAnimationFrame(tickQrScan);
  };

  const stopQrCamera = () => {
    if (scanAnimationRef.current) cancelAnimationFrame(scanAnimationRef.current);
    if (qrVideoRef.current?.srcObject) {
      (qrVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    setIsQrCameraActive(false);
  };

  const simulateQuickScan = () => {
    const selectedCp = checkpoints.length > 0 ? checkpoints[Math.floor(Math.random() * checkpoints.length)] : null;
    setScannedCheckpoint(selectedCp);
    setQrImagePreview(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedCp?.id || "demo"}`);
    toast.success(`Detected Checkpoint: ${selectedCp?.checkpoint_name || "Perimeter Fence"}`);
  };

  const startIncidentCamera = async () => {
    setIsIncidentCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (incidentVideoRef.current) incidentVideoRef.current.srcObject = stream;
    } catch {
      toast.error("Incident Camera unavailable.");
      setIsIncidentCameraActive(false);
    }
  };

  const captureIncidentPhoto = () => {
    if (!incidentVideoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = incidentVideoRef.current.videoWidth || 320;
    canvas.height = incidentVideoRef.current.videoHeight || 240;
    canvas.getContext("2d")?.drawImage(incidentVideoRef.current, 0, 0);
    setIncidentPhoto(canvas.toDataURL("image/png"));
    stopIncidentCamera();
    toast.success("Incident photo captured.");
  };

  const stopIncidentCamera = () => {
    if (incidentVideoRef.current?.srcObject) {
      (incidentVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    setIsIncidentCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setIncidentPhoto(reader.result as string);
      toast.success("File attached successfully.");
    };
    reader.readAsDataURL(file);
  };

  const submitPatrolScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scannedCheckpoint) {
      return toast.error("Please scan or capture a valid checkpoint first!");
    }

    if (!navigator.geolocation) {
      return toast.error("Location services are required to verify scan proximity.");
    }

    toast.loading("Verifying location proximity...", { id: "geo-check" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const guardLat = position.coords.latitude;
        const guardLng = position.coords.longitude;

        if (scannedCheckpoint.latitude && scannedCheckpoint.longitude) {
          const distance = calculateDistanceMeters(
            guardLat,
            guardLng,
            scannedCheckpoint.latitude,
            scannedCheckpoint.longitude
          );

          const allowedRadius = scannedCheckpoint.radius_meters || 50;

          if (distance > allowedRadius) {
            toast.dismiss("geo-check");
            return toast.error("❌ Out of Range Scan Rejected!", {
              description: `You are ${Math.round(
                distance
              )}m away. You must be within ${allowedRadius}m of the checkpoint to scan.`,
              duration: 6000,
            });
          }
        }

        toast.dismiss("geo-check");

        const targetLoc =
          locations.find((l) => l.id === scannedCheckpoint.location_id) || locations[0];

        const newScanLog = {
          guard_name: guardNameInput || "On-Duty Guard",
          location_name: targetLoc?.name || "Main Site",
          checkpoint_name: scannedCheckpoint.checkpoint_name,
          status: patrolStatus,
          notes:
            scannerNotes ||
            (patrolStatus === "incident"
              ? "Incident flagged during patrol."
              : "Standard patrol scan completed."),
          incident_photo: incidentPhoto || null,
          incident_status: patrolStatus === "incident" ? "open" : null,
          is_archived: false,
        };

        const { error } = await supabase.from("patrol_feeds").insert([newScanLog]);
        if (error) return toast.error("Failed to submit patrol scan: " + error.message);

        stopQrCamera();
        stopIncidentCamera();
        setIsScannerOpen(false);
        setScannerNotes("");
        setIncidentPhoto(null);
        setQrImagePreview(null);
        setScannedCheckpoint(null);
        setPatrolStatus("verified");
        toast.success("Patrol log verified & submitted successfully.");
      },
      (err) => {
        toast.dismiss("geo-check");
        toast.error(`GPS Location required: ${err.message}. Please enable location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleUpdateIncidentStatus = async (status: "acknowledged" | "resolved") => {
    if (!selectedIncident) return;

    const { error } = await supabase
      .from("patrol_feeds")
      .update({
        incident_status: status,
        assigned_guard: assignedGuard || selectedIncident.assigned_guard,
        admin_notes: adminNoteInput || selectedIncident.admin_notes,
      })
      .eq("id", selectedIncident.id);

    if (error) return toast.error("Failed to update incident: " + error.message);

    toast.success(`Incident status changed to ${status}`);
  };

  // PASSWORD AUTHENTICATION SCREEN
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-[#0b1026] border border-slate-800 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            🔒
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Command Center</h1>
            <p className="text-xs text-slate-400 mt-1">Please enter password to access dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter admin password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 text-center tracking-widest"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
            >
              Authenticate Access
            </button>
          </form>
          <p className="text-[10px] text-slate-500">Default passcode: <code className="text-indigo-400 font-mono">admin123</code></p>
        </div>
      </main>
    );
  }

  const activeFeeds = patrolFeeds.filter((f) => !f.is_archived);
  const archivedFeeds = patrolFeeds.filter((f) => f.is_archived);

  const displayFeeds = (activeTab === "live" ? activeFeeds : archivedFeeds).filter(
    (f) => (feedFilter === "incident" ? f.status === "incident" : true)
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-8">
      {/* Header Controls */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Guard Patrol Command Dashboard</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                isLiveConnected
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : "bg-amber-950 text-amber-400 border-amber-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
              {isLiveConnected ? "WebSockets Active" : "Connecting..."}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Realtime database stream active {loading && "• Initializing payload..."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              soundEnabled
                ? "bg-slate-900/60 hover:bg-slate-800 border-slate-700/80 text-slate-300"
                : "bg-slate-950 border-slate-800 text-slate-600 line-through"
            }`}
          >
            🔊 Sound {soundEnabled ? "On" : "Muted"}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
              className="px-3 py-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              📊 Download Report ▾
            </button>

            {isDownloadDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0b1026] border border-slate-800 rounded-2xl p-4 shadow-2xl z-40 space-y-3">
                <p className="text-[11px] font-bold text-slate-300">Select Site Location</p>
                
                <select
                  value={selectedReportLocation}
                  onChange={(e) => setSelectedReportLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>

                <div className="pt-1 space-y-2">
                  <button
                    onClick={() => handleExportReport("excel")}
                    className="w-full py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    📥 Download Excel / CSV
                  </button>
                  <button
                    onClick={() => handleExportReport("pdf")}
                    className="w-full py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    📄 Download PDF
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 text-center">
                  * Exported records auto-move to Archive Tab to avoid duplicate downloads.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/50 transition flex items-center gap-2 active:scale-95"
          >
            🔍 Guard Patrol Scanner
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-400 text-xs font-semibold rounded-xl transition"
            title="Lock Dashboard"
          >
            🔒 Logout
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Locations Card */}
        <div className="lg:col-span-2 bg-[#0b1026] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white">Active Locations ({locations.length})</h2>
            <button
              onClick={() => setIsAddLocationOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
            >
            </button>
          </div>

          <div className="space-y-6">
            {locations.map((loc) => {
              const locCheckpoints = checkpoints.filter((cp) => cp.location_id === loc.id);
              const isExpanded = !!expandedLocations[loc.id];

              return (
                <div key={loc.id} className="border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden">
                  <div
                    onClick={() => toggleLocationAccordion(loc.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isExpanded ? "📂" : "📁"}</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">{loc.name}</h3>
                        {loc.address && <p className="text-[11px] text-slate-400">{loc.address}</p>}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-semibold px-3 py-1 rounded-full">
                      {locCheckpoints.length} Checkpoints
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-[#050814]/80 p-4 space-y-3">
                      {locCheckpoints.length === 0 ? (
                        <p className="text-xs text-slate-500 py-2">No checkpoints created for this location yet.</p>
                      ) : (
                        locCheckpoints.map((cp) => (
                          <div key={cp.id} className="py-2.5 flex items-center justify-between border-b border-slate-800/60 last:border-0">
                            <div>
                              <p className="text-xs font-bold text-slate-200">{cp.checkpoint_name}</p>
                              <p className="text-[10px] text-indigo-400 font-semibold">
                                Geofence Radius: {cp.radius_meters || 50}m
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setQrModalData({ name: cp.checkpoint_name, hash: cp.id })}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] rounded-lg transition font-semibold flex items-center gap-1.5"
                              >
                                <span>📱</span> View QR
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCheckpoint(cp);
                                  setCheckpointName(cp.checkpoint_name);
                                  setLatitude(cp.latitude.toString());
                                  setLongitude(cp.longitude.toString());
                                  setRadiusMeters((cp.radius_meters || 50).toString());
                                  setIsEditCheckpointOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5"
                              >
                                <span>✏️</span> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCheckpoint(cp.id)}
                                className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] rounded-lg font-semibold flex items-center gap-1.5"
                              >
                                <span>🗑️</span> Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setSelectedLocationId(loc.id);
                            setCheckpointName("");
                            setLatitude("");
                            setLongitude("");
                            setRadiusMeters("50");
                            setIsAddCheckpointOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/40 hover:bg-indigo-950/30 text-slate-300 hover:text-indigo-300 py-2.5 rounded-xl text-xs font-semibold transition"
                        >
                          + Add Checkpoint
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Patrol Activity Stream & Archive Tabs */}
        <div className="bg-[#0b1026] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("live")}
                className={`text-xs font-bold pb-1 border-b-2 transition ${
                  activeTab === "live"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Live Feed ({activeFeeds.length})
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`text-xs font-bold pb-1 border-b-2 transition ${
                  activeTab === "archive"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                📁 Archive ({archivedFeeds.length})
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setFeedFilter("all")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                  feedFilter === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFeedFilter("incident")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                  feedFilter === "incident"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Incidents
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {displayFeeds.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                {activeTab === "archive"
                  ? "No archived reports available."
                  : "No active patrol logs available."}
              </p>
            ) : (
              displayFeeds.map((feed) => (
                <div
                  key={feed.id}
                  onClick={() => {
                    if (feed.status === "incident") {
                      setSelectedIncident(feed);
                      setAssignedGuard(feed.assigned_guard || "");
                      setAdminNoteInput(feed.admin_notes || "");
                    }
                  }}
                  className={`p-3.5 border rounded-xl space-y-2 transition relative ${
                    feed.status === "incident"
                      ? "bg-rose-950/20 border-rose-900/60 hover:border-rose-700"
                      : "bg-slate-900/80 border-slate-800"
                  } ${feed.status === "incident" ? "cursor-pointer" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{feed.guard_name}</p>
                      <p className="text-[11px] text-indigo-400 font-semibold">{feed.location_name ? `${feed.location_name} - ${feed.checkpoint_name}` : feed.checkpoint_name}</p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        feed.status === "verified"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-300 border border-rose-800"
                      }`}
                    >
                      {feed.status}
                    </span>
                  </div>
                  {feed.notes && (
                    <p className="text-xs text-slate-300 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                      {feed.notes}
                    </p>
                  )}
                  {feed.incident_photo && (
                    <img
                      src={feed.incident_photo}
                      alt="Incident Evidence"
                      className="w-full h-32 object-cover rounded-lg border border-slate-700 mt-2"
                    />
                  )}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                    {feed.incident_status ? (
                      <span className="font-semibold uppercase text-amber-400">
                        Status: {feed.incident_status}
                      </span>
                    ) : (
                      <span>{new Date(feed.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    )}

                    {activeTab === "archive" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchiveFeed(feed.id);
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                      >
                        Restore to Live
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GUARD PATROL SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🔍 Guard Patrol Mobile Scanner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Scan Checkpoint QR Code & Log Status</p>
              </div>
              <button
                onClick={() => {
                  stopQrCamera();
                  stopIncidentCamera();
                  setIsScannerOpen(false);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitPatrolScan} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Guard Name</label>
                <input
                  type="text"
                  value={guardNameInput}
                  onChange={(e) => setGuardNameInput(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400 font-semibold">QR Code Scanner (Real-Time Optical Decoding)</label>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
                  {isQrCameraActive ? (
                    <div className="relative w-full h-44 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video ref={qrVideoRef} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-2 border-indigo-500/80 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                        <div className="w-32 h-32 border-2 border-emerald-400/60 rounded-lg animate-ping" />
                      </div>
                      <button
                        type="button"
                        onClick={stopQrCamera}
                        className="absolute bottom-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 font-semibold text-[10px] px-3 py-1.5 rounded-xl border border-slate-700"
                      >
                        Cancel Camera
                      </button>
                    </div>
                  ) : scannedCheckpoint ? (
                    <div className="space-y-2 w-full">
                      <img src={qrImagePreview!} alt="Scanned QR" className="h-28 object-contain mx-auto rounded-xl border border-emerald-500" />
                      <div className="bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-xl">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase">✓ Checkpoint Detected</p>
                        <p className="text-sm font-bold text-white">{scannedCheckpoint.checkpoint_name}</p>
                        <p className="text-[10px] font-mono text-slate-400 break-all">{scannedCheckpoint.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannedCheckpoint(null);
                          setQrImagePreview(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white underline"
                      >
                        Rescan Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">Point live device camera at checkpoint QR code</p>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={startQrCamera}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition"
                        >
                          📹 Open Camera Scanner
                        </button>
                        <button
                          type="button"
                          onClick={simulateQuickScan}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
                        >
                          ⚡ Quick Simulate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">Patrol Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPatrolStatus("verified")}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition ${
                      patrolStatus === "verified"
                        ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    ✓ Verified Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatrolStatus("incident")}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition ${
                      patrolStatus === "incident"
                        ? "bg-rose-950 border-rose-600 text-rose-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    ⚠️ Report Incident
                  </button>
                </div>
              </div>

              {patrolStatus === "incident" && (
                <div className="space-y-3 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-2xl">
                  <label className="block text-[11px] text-rose-300 font-semibold">Incident Evidence (Live Snap or Upload File)</label>

                  {isIncidentCameraActive ? (
                    <div className="relative w-full h-40 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video ref={incidentVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={captureIncidentPhoto}
                        className="absolute bottom-2 bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                      >
                        📸 Snap Photo
                      </button>
                    </div>
                  ) : incidentPhoto ? (
                    <div className="relative">
                      <img src={incidentPhoto} alt="Evidence" className="h-32 w-full object-cover rounded-xl border border-rose-800" />
                      <button
                        type="button"
                        onClick={() => setIncidentPhoto(null)}
                        className="absolute top-2 right-2 bg-rose-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={startIncidentCamera}
                        className="py-2.5 bg-rose-900/40 hover:bg-rose-900/80 border border-rose-700 text-rose-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        📷 Live Camera Snap
                      </button>

                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        📁 Attach File
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Log Notes</label>
                <textarea
                  value={scannerNotes}
                  onChange={(e) => setScannerNotes(e.target.value)}
                  placeholder="Enter patrol observations or incident details..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopQrCamera();
                    stopIncidentCamera();
                    setIsScannerOpen(false);
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-2xl border border-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg transition"
                >
                  Submit Patrol Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LOCATION MODAL */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add New Location</h3>
            <form onSubmit={handleCreateLocation} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Location Name</label>
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g. Headquarters Campus"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Address / Region</label>
                <input
                  type="text"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  placeholder="e.g. 100 Innovation Way"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLocationOpen(false)}
                  className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHECKPOINT MODAL (WITH GEOFENCING RADIUS CONTROL) */}
      {isAddCheckpointOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add New Checkpoint</h3>
            <form onSubmit={handleCreateCheckpoint} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Select Location</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Checkpoint Name</label>
                <input
                  type="text"
                  value={checkpointName}
                  onChange={(e) => setCheckpointName(e.target.value)}
                  placeholder="e.g. West Perimeter Gate"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Coordinates & Location Fetcher */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-slate-400 font-semibold">GPS Coordinates</label>
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={isLocating}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    📍 {isLocating ? "Getting Location..." : "Use Current Location"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="e.g. 6.5244"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="e.g. 3.3792"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Geofencing Verification Radius Field */}
              <div className="pt-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] text-indigo-300 font-semibold">
                    🛡️ Geofencing Allowed Radius (Meters)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{radiusMeters}m</span>
                </div>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="50"
                  className="w-full bg-indigo-950/40 border border-indigo-800/80 rounded-xl px-3 py-2 text-xs text-indigo-100 focus:outline-none focus:border-indigo-500"
                  required
                />
                <p className="text-[9px] text-slate-500 mt-1">
                  Scans beyond this distance will be automatically blocked by the system.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCheckpointOpen(false)}
                  className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Save Checkpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHECKPOINT MODAL */}
      {isEditCheckpointOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Edit Checkpoint</h3>
            <form onSubmit={handleUpdateCheckpoint} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Checkpoint Name</label>
                <input
                  type="text"
                  value={checkpointName}
                  onChange={(e) => setCheckpointName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] text-slate-400 font-semibold">GPS Coordinates</label>
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={isLocating}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    📍 {isLocating ? "Getting Location..." : "Use Current Location"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-indigo-300 font-semibold mb-1">
                  🛡️ Geofencing Allowed Radius (Meters)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  className="w-full bg-indigo-950/40 border border-indigo-800/80 rounded-xl px-3 py-2 text-xs text-indigo-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditCheckpointOpen(false)}
                  className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Update Checkpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INCIDENT DETAILS & MANAGEMENT MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                ⚠️ Incident Management
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p><strong>Guard:</strong> {selectedIncident.guard_name}</p>
              <p><strong>Location:</strong> {selectedIncident.location_name} - {selectedIncident.checkpoint_name}</p>
              <p><strong>Log Notes:</strong> {selectedIncident.notes || "None provided"}</p>
              {selectedIncident.incident_photo && (
                <img src={selectedIncident.incident_photo} alt="Incident Evidence" className="w-full h-40 object-cover rounded-xl border border-slate-700 mt-2" />
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Assign Guard/Responder</label>
                <input
                  type="text"
                  value={assignedGuard}
                  onChange={(e) => setAssignedGuard(e.target.value)}
                  placeholder="Guard Bravo"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Admin Response Notes</label>
                <textarea
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Add resolution details or dispatch notes..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleUpdateIncidentStatus("acknowledged")}
                className="flex-1 py-2.5 bg-amber-950 border border-amber-800 text-amber-300 font-semibold text-xs rounded-xl"
              >
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => handleUpdateIncidentStatus("resolved")}
                className="flex-1 py-2.5 bg-emerald-950 border border-emerald-800 text-emerald-300 font-semibold text-xs rounded-xl"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrModalData && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">{qrModalData.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Scan using Guard Patrol Mobile App</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto border-4 border-indigo-600/30">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  qrModalData.hash
                )}&color=0b1026`}
                alt={`QR Code for ${qrModalData.name}`}
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownloadQr("svg")}
                className="py-2.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-semibold text-xs rounded-xl transition"
              >
                📥 Download SVG
              </button>
              <button
                onClick={() => handleDownloadQr("jpg")}
                className="py-2.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-semibold text-xs rounded-xl transition"
              >
                📥 Download JPG
              </button>
            </div>

            <button
              onClick={() => setQrModalData(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
