"use client";

import { useEffect, useState } from "react";

interface MapProps {
  logs: Array<{
    id: string;
    checkpoint_name?: string;
    latitude: number;
    longitude: number;
    is_valid: boolean;
  }>;
}

export default function PatrolMap({ logs }: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import leaflet components strictly on client side
    Promise.all([
      import("react-leaflet"),
      import("leaflet")
    ]).then(([reactLeaflet, L]) => {
      // Fix leaflet icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
      });
    });
  }, []);

  if (!mounted || !MapComponents) {
    return (
      <div className="w-full bg-slate-900/80 border border-slate-800 p-4 rounded-2xl h-[320px] flex items-center justify-center text-slate-500 text-xs">
        Loading interactive map telemetry...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;
  const validLogs = logs.filter((l) => l.latitude && l.longitude);
  const center: [number, number] = validLogs.length > 0 
    ? [validLogs[0].latitude, validLogs[0].longitude] 
    : [6.44511, 3.41443];

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-2xl space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Checkpoint Patrol Map</p>
        <span className="text-[10px] text-slate-500">{validLogs.length} Active Pins</span>
      </div>
      <div className="h-[260px] w-full rounded-xl overflow-hidden border border-slate-800 relative z-0">
        <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {validLogs.map((log) => (
            <Marker key={log.id} position={[log.latitude, log.longitude]}>
              <Popup>
                <div className="text-xs font-sans text-slate-900">
                  <p className="font-bold">{log.checkpoint_name || "Checkpoint"}</p>
                  <p>Status: {log.is_valid ? "✅ Verified" : "❌ Rejected"}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
