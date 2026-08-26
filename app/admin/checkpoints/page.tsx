"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Checkpoint {
  id: string;
  title: string;
  qr_code_hash: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
}

export default function GeofenceConfigurator() {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCheckpoints = async () => {
    const { data } = await supabase
      .from("checkpoints")
      .select("id, title, qr_code_hash, latitude, longitude, allowed_radius_meters")
      .order("title", { ascending: true });

    if (data) setCheckpoints(data as Checkpoint[]);
    setLoading(false);
  };

  useEffect(() => {
    // Auth and Role check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        router.push("/");
        return;
      }

      fetchCheckpoints();
    });
  }, [router]);

  const updateRadius = async (id: string, newRadius: number) => {
    setSavingId(id);
    await supabase
      .from("checkpoints")
      .update({ allowed_radius_meters: newRadius })
      .eq("id", id);

    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, allowed_radius_meters: newRadius } : cp))
    );
    setSavingId(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Geofence Radius Configurator</h1>
            <p className="text-sm text-slate-400">
              Set maximum allowed GPS distance tolerance (meters) for each checkpoint scan
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 font-mono text-sm">Loading checkpoints...</p>
        ) : checkpoints.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 font-mono text-sm">
            No checkpoints configured yet in database.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wider">
                  <th className="p-4">Checkpoint Title</th>
                  <th className="p-4">QR Identifier</th>
                  <th className="p-4">GPS Coordinates</th>
                  <th className="p-4">Geofence Radius (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {checkpoints.map((cp) => (
                  <tr key={cp.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-indigo-300 font-sans text-sm">{cp.title}</td>
                    <td className="p-4 text-slate-400">{cp.qr_code_hash}</td>
                    <td className="p-4 text-slate-400">
                      {cp.latitude?.toFixed(5)}, {cp.longitude?.toFixed(5)}
                    </td>
                    <td className="p-4 font-sans">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          max="500"
                          value={cp.allowed_radius_meters || 50}
                          onChange={(e) => updateRadius(cp.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <span className="text-xs text-slate-400">meters</span>
                        {savingId === cp.id && (
                          <span className="text-[10px] text-amber-400 animate-pulse font-mono">Saving...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
