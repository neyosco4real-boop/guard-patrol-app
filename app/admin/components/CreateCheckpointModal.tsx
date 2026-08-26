"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

interface LocationOption {
  id: string | number;
  name: string;
}

interface CreateCheckpointModalProps {
  isOpen: boolean;
  locations: LocationOption[];
  onClose: () => void;
  onSuccess?: (newCheckpoint: any) => void;
}

export default function CreateCheckpointModal({
  isOpen,
  locations,
  onClose,
  onSuccess,
}: CreateCheckpointModalProps) {
  const [locationId, setLocationId] = useState(
    locations.length > 0 ? String(locations[0].id) : ""
  );
  const [checkpointName, setCheckpointName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState("50");

  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createdCheckpoint, setCreatedCheckpoint] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your device browser.");
      return;
    }

    setIsGettingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsGettingGps(false);
      },
      (err) => {
        console.error("GPS Error:", err);
        setErrorMsg("Failed to obtain device coordinates.");
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeLocationId = locationId || (locations.length > 0 ? String(locations[0].id) : "");
    const nameTrimmed = checkpointName.trim();

    if (!activeLocationId || !nameTrimmed || latitude === "" || longitude === "") {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    const parsedLat = parseFloat(Number(latitude).toFixed(6));
    const parsedLng = parseFloat(Number(longitude).toFixed(6));

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setErrorMsg("Invalid coordinates format.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("checkpoints")
        .insert([
          {
            location_id: activeLocationId,
            checkpoint_name: nameTrimmed,
            latitude: parsedLat,
            longitude: parsedLng,
            radius_meters: parseInt(radiusMeters) || 50,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (onSuccess) onSuccess(data);
      setCreatedCheckpoint(data);
    } catch (err: any) {
      console.error("Checkpoint Insertion Error:", err);
      setErrorMsg(err.message || "An unexpected database error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAll = () => {
    setCreatedCheckpoint(null);
    setCheckpointName("");
    setLatitude("");
    setLongitude("");
    setRadiusMeters("50");
    onClose();
  };

  if (createdCheckpoint) {
    const scanHash =
      createdCheckpoint.id ||
      createdCheckpoint.qr_code ||
      createdCheckpoint.scan_id ||
      "a4ff1bdc-d65d-446a-9e9e-5c8857e5415a";
    const name = createdCheckpoint.checkpoint_name || checkpointName || "Checkpoint";

    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-[#0b1026] border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl">
          <div>
            <h3 className="text-lg font-bold text-white">Checkpoint QR Code Assigned</h3>
            <p className="text-sm font-semibold text-indigo-400 mt-1">{name}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl flex items-center justify-center shadow-inner mx-auto w-fit">
            {/* Standard decodable QR Code output using QRCodeSVG component */}
            <QRCodeSVG
              value={scanHash}
              size={180}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="H"
              includeMargin={false}
            />
          </div>

          <div>
            <p className="text-[11px] font-mono text-slate-400 break-all bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              Scan ID Hash: {scanHash}
            </p>
          </div>

          <button
            onClick={handleCloseAll}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition"
          >
            Close & Complete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b1026] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Create New Checkpoint</h3>
            <p className="text-xs text-slate-400 mt-0.5">Define geofenced zones for site patrols.</p>
          </div>
          <button
            onClick={handleCloseAll}
            className="text-slate-400 hover:text-white text-sm p-1 transition"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800/80 p-3 rounded-xl text-xs text-rose-300">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Assigned Site / Location <span className="text-rose-400">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full bg-[#050814] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Checkpoint Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Server Room Main Entry"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="w-full bg-[#050814] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-slate-300 text-xs font-semibold">
                Coordinates <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleFetchGps}
                disabled={isGettingGps}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/70 border border-indigo-800/80 px-2.5 py-1 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isGettingGps ? "Acquiring GPS..." : "📍 Auto-Detect GPS"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-500 text-[10px] mb-1 font-mono">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="6.5244"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-[#050814] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] mb-1 font-mono">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="3.3792"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-[#050814] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Geofence Radius (Meters)
            </label>
            <input
              type="number"
              min="5"
              max="500"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              className="w-full bg-[#050814] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleCloseAll}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Save Checkpoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
