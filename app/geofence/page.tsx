"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

// Dynamically import map component to avoid SSR issues

const toast = { success: (msg: string) => alert(msg), error: (msg: string) => alert(msg) };
const PatrolMap = dynamic(() => import("@/components/PatrolMap"), { ssr: false });

interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}


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

export default function GeofenceConfigPage() {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("50");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCheckpoints = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("checkpoints").select("*");
    if (error) {
      console.error("Error fetching checkpoints:", error);
    } else {
      const formatted = (data || []).map((cp: any) => ({
        id: cp.id,
        name: cp.name || cp.title || cp.checkpoint_name || cp.label || `Checkpoint #${cp.id.slice(0, 5)}`,
        latitude: parseFloat(cp.latitude) || 6.44529,
        longitude: parseFloat(cp.longitude) || 3.41470,
        radius_meters: parseInt(cp.radius_meters || cp.radius) || 50,
      }));
      setCheckpoints(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !latitude || !longitude) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    const payload = {
      name,
      title: name,
      checkpoint_name: name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_meters: parseInt(radius) || 50,
    };

    if (editingId) {
      const { error } = await supabase
        .from("checkpoints")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("checkpoints").insert([payload]);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
    }

    setName("");
    setLatitude("");
    setLongitude("");
    setRadius("50");
    setEditingId(null);
    fetchCheckpoints();
  };

  const handleEdit = (cp: Checkpoint) => {
    setEditingId(cp.id);
    setName(cp.name);
    setLatitude(cp.latitude.toString());
    setLongitude(cp.longitude.toString());
    setRadius(cp.radius_meters.toString());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checkpoint?")) return;
    const { error } = await supabase.from("checkpoints").delete().eq("id", id);
    if (!error) fetchCheckpoints();
  };

  // Convert checkpoints to log format to show pins on map
  const mapLogs = checkpoints.map((cp) => ({
    id: cp.id,
    checkpoint_name: cp.name,
    latitude: cp.latitude,
    longitude: cp.longitude,
    is_valid: true,
    distance_variance: 0,
    guard_name: "GEOFENCE ZONE"
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geofence & Checkpoint Configuration</h1>
          <p className="text-xs text-slate-400">Manage operational checkpoint coordinates and allowed GPS radii</p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4 h-fit shadow-2xl">
          <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
            {editingId ? "✏️ Edit Checkpoint" : "➕ Add New Checkpoint"}
          </h2>

          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-semibold">Checkpoint Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Front Entrance Gate"
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 font-semibold">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="6.44529"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="3.41470"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold">Allowed Radius (Meters)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="50"
                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Scans beyond this threshold are automatically rejected.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                {editingId ? "Update Checkpoint" : "Save Checkpoint"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setName("");
                    setLatitude("");
                    setLongitude("");
                    setRadius("50");
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Directory & Visual Map */}
        <div className="lg:col-span-2 space-y-6">
          {checkpoints.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <PatrolMap logs={mapLogs as any} />
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white">Active Checkpoints Directory</h2>
              <span className="text-xs text-indigo-400 font-bold font-mono">{checkpoints.length} Zones Configured</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/30">
                    <th className="p-3">Checkpoint Name</th>
                    <th className="p-3">GPS Coordinates</th>
                    <th className="p-3">Allowed Radius</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        Loading checkpoints...
                      </td>
                    </tr>
                  ) : checkpoints.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">
                        No checkpoints configured yet. Add one using the form.
                      </td>
                    </tr>
                  ) : (
                    checkpoints.map((cp) => (
                      <tr key={cp.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-sans font-bold text-white">{cp.name}</td>
                        <td className="p-3 text-slate-300">
                          {cp.latitude?.toFixed(5)}, {cp.longitude?.toFixed(5)}
                        </td>
                        <td className="p-3 text-indigo-400 font-bold">{cp.radius_meters}m</td>
                        <td className="p-3 text-right space-x-2 font-sans">
                          <button
                            onClick={() => handleEdit(cp)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cp.id)}
                            className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg text-[11px] transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
