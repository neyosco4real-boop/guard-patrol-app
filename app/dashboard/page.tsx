"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const PatrolMap = dynamic(() => import("@/components/PatrolMap"), { ssr: false });

interface ScanLog {
  id: string;
  created_at: string;
  qr_hash: string;
  checkpoint_name?: string;
  latitude: number;
  longitude: number;
  distance_variance: number;
  is_valid: boolean;
  incident_notes?: string;
  image_url?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ScanLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patrol_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("realtime-scan-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scan_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as ScanLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalScans = logs.length;
  const verifiedScans = logs.filter((l) => l.is_valid).length;
  const rejectedScans = logs.filter((l) => !l.is_valid).length;
  const verifiedRate = totalScans ? ((verifiedScans / totalScans) * 100).toFixed(1) : "0.0";
  const incidentsCount = logs.filter((l) => l.incident_notes || l.image_url).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Patrol Monitoring Dashboard</h1>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400">Live operational checkpoint tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/geofence")}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-indigo-100 rounded-xl transition flex items-center gap-2 border border-indigo-500/30"
          >
            ⚙️ Geofence Config
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-2 border border-slate-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Scans</p>
          <p className="text-2xl font-bold mt-1 text-white">{totalScans}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Verified Rate</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{verifiedRate}%</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Rejected Scans</p>
          <p className="text-2xl font-bold mt-1 text-rose-400">{rejectedScans}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Incidents Logged</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{incidentsCount}</p>
        </div>
      </div>

      <PatrolMap logs={logs} />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-4">Date / Time</th>
                <th className="p-4">Checkpoint</th>
                <th className="p-4">GPS Coordinates</th>
                <th className="p-4">Distance Variance</th>
                <th className="p-4">Incident</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading patrol telemetry...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No checkpoint scans recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => (log.incident_notes || log.image_url) && setSelectedIncident(log)}
                    className={`hover:bg-slate-800/40 transition ${
                      log.incident_notes || log.image_url ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="p-4 whitespace-nowrap text-slate-300">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 font-sans font-bold text-white">
                      {log.checkpoint_name || log.qr_hash}
                    </td>
                    <td className="p-4 text-slate-400">
                      {log.latitude?.toFixed(5)}, {log.longitude?.toFixed(5)}
                    </td>
                    <td className="p-4 text-slate-300">
                      {log.distance_variance !== undefined ? `${Math.round(log.distance_variance)}m` : "0m"}
                    </td>
                    <td className="p-4">
                      {log.incident_notes ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-sans font-medium truncate max-w-[150px] inline-block">
                          ⚠️ {log.incident_notes}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {log.is_valid ? (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-sans font-bold">
                          VERIFIED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md bg-rose-950/80 text-rose-400 border border-rose-800/80 text-[10px] font-sans font-bold">
                          REJECTED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIncident && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                ⚠️ Incident Note Details
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Checkpoint</p>
                <p className="font-bold text-white text-sm">{selectedIncident.checkpoint_name || selectedIncident.qr_hash}</p>
              </div>

              <div>
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Reported Note</p>
                <p className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-200 mt-1 leading-relaxed">
                  {selectedIncident.incident_notes || "No text note provided."}
                </p>
              </div>

              {selectedIncident.image_url && (
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-semibold mb-1">Attached Photo Evidence</p>
                  <img
                    src={selectedIncident.image_url}
                    alt="Incident Evidence"
                    className="w-full rounded-xl border border-slate-800 object-cover max-h-48"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
