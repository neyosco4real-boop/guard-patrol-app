"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

interface Checkpoint {
  id: string;
  title: string;
  qr_hash: string;
}


  const handleDeleteLocation = async (locId: string, locName: string, e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${locName}" and all its checkpoints?`)) return;
    try {
      const { error } = await supabase.from('locations').delete().eq('id', locId);
      if (error) throw error;
      toast.success("Site deleted successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error("Failed to delete site: " + err.message);
    }
  };

export default function QRCodesPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  useEffect(() => {
    async function loadCheckpoints() {
      const { data } = await supabase.from("checkpoints").select("id, title, qr_hash");
      if (data) setCheckpoints(data);
    }
    loadCheckpoints();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Printable Patrol QR Codes</h1>
          <p className="text-xs text-slate-400">Print and place these codes at physical checkpoint locations</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs font-bold transition"
        >
          🖨️ Print Sheet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {checkpoints.map((cp) => (
          <div key={cp.id} className="bg-white text-slate-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
            <h2 className="font-bold text-sm tracking-wide">{cp.title}</h2>
            <div className="p-2 border-2 border-slate-900 rounded-xl">
              <QRCodeSVG value={cp.qr_hash || "SERVER-ROOM-002"} size={160} />
            </div>
            <p className="text-[10px] font-mono text-slate-500">{cp.qr_hash}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
