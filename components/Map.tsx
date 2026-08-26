"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icon issue in Next.js
const customIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  logs: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    siteName: string;
    status: string;
  }>;
}

export default function Map({ logs }: MapProps) {
  // Default map center (Lagos: 6.5244, 3.3792 or first log position)
  const defaultCenter: [number, number] = logs.length > 0 && logs[0].lat && logs[0].lng
    ? [logs[0].lat, logs[0].lng]
    : [6.5244, 3.3792];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-80 rounded-xl overflow-hidden border border-slate-800 shadow-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {logs.map((log) =>
        log.lat && log.lng ? (
          <Marker key={log.id} position={[log.lat, log.lng]} icon={customIcon}>
            <Popup>
              <div className="text-slate-900 font-sans">
                <strong className="text-sm font-bold block">{log.title}</strong>
                <span className="text-xs text-slate-600 block mb-1">{log.siteName}</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.status === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
