'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface Site {
  id: string;
  name: string;
  address?: string;
  created_at?: string;
}

interface Checkpoint {
  id: string;
  name: string;
  radius: string;
  site_id: string;
}

export default function LocationAndCheckpointsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Location Modal State
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [savingSite, setSavingSite] = useState(false);

  // Add Checkpoint Modal State
  const [isAddCpOpen, setIsAddCpOpen] = useState(false);
  const [selectedSiteForCp, setSelectedSiteForCp] = useState('');
  const [newCpName, setNewCpName] = useState('');
  const [newCpRadius, setNewCpRadius] = useState('50m');
  const [savingCp, setSavingCp] = useState(false);

  useEffect(() => {
    fetchLocationsAndCheckpoints();
  }, []);

  const fetchLocationsAndCheckpoints = async () => {
    setLoading(true);
    const { data: sitesData } = await supabase.from('sites').select('*').order('name');
    const { data: cpData } = await supabase.from('checkpoints').select('*').order('name');

    if (sitesData) setSites(sitesData);
    if (cpData) setCheckpoints(cpData);
    setLoading(false);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setSavingSite(true);
    const { data, error } = await supabase
      .from('sites')
      .insert([{ name: newSiteName.trim(), address: newSiteAddress.trim() }])
      .select();

    setSavingSite(false);

    if (error) {
      alert('Error creating location: ' + error.message);
    } else {
      setNewSiteName('');
      setNewSiteAddress('');
      setIsAddSiteOpen(false);
      if (data) setSites((prev) => [...prev, ...data]);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpName.trim() || !selectedSiteForCp) return;

    setSavingCp(true);
    const { data, error } = await supabase
      .from('checkpoints')
      .insert([{ name: newCpName.trim(), site_id: selectedSiteForCp, radius: newCpRadius }])
      .select();

    setSavingCp(false);

    if (error) {
      alert('Error creating checkpoint: ' + error.message);
    } else {
      setNewCpName('');
      setIsAddCpOpen(false);
      if (data) setCheckpoints((prev) => [...prev, ...data]);
    }
  };

  const downloadSVG = (cpName: string, elementId: string) => {
    const svgElement = document.getElementById(elementId) as unknown as SVGElement;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `QR_${cpName.replace(/\s+/g, '_')}.svg`;
    link.click();
  };

  const downloadPNG = (cpName: string, canvasId: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `QR_${cpName.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#070b18] text-slate-100 font-sans p-6 md:p-10 space-y-10">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1a233d] pb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Location & Checkpoint Deployment</h1>
          <p className="text-xs text-[#828cb0] mt-1">Manage parent security sites and print/export child checkpoint QR codes.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddSiteOpen(true)}
            className="bg-[#10b981] hover:bg-[#059669] text-black font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md"
          >
            🏢 Add New Location / Site
          </button>
          <button
            onClick={() => window.print()}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md"
          >
            🖨️ Print Batch Deployment Sheet
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#828cb0] text-sm font-bold print:hidden">Loading Security Locations...</div>
      ) : sites.length === 0 ? (
        <div className="text-center py-20 bg-[#0b1021] border border-[#1a233d] rounded-2xl text-[#828cb0] text-xs font-bold print:hidden">
          No locations found. Click "Add New Location / Site" to register a security zone.
        </div>
      ) : (
        /* Hierarchical Location (Parent) -> Checkpoints (Children) Section */
        <div className="space-y-10">
          {sites.map((site) => {
            const siteCheckpoints = checkpoints.filter((cp) => cp.site_id === site.id);

            return (
              <div key={site.id} className="bg-[#0b1021] border border-[#1a233d] rounded-2xl p-6 space-y-6 print:bg-white print:border-2 print:border-black print:text-black">
                
                {/* Location Parent Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1a233d] print:border-black pb-4 gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400 print:bg-slate-200 print:text-black px-3 py-1 rounded-full">
                      Parent Security Location
                    </span>
                    <h2 className="text-xl font-black text-white print:text-black mt-2">🏢 {site.name}</h2>
                    {site.address && <p className="text-xs text-[#828cb0] print:text-slate-700 mt-0.5">📍 {site.address}</p>}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSiteForCp(site.id);
                      setIsAddCpOpen(true);
                    }}
                    className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition-all print:hidden self-start sm:self-auto"
                  >
                    ➕ Add Checkpoint to {site.name}
                  </button>
                </div>

                {/* Child Checkpoints Side-by-Side Grid */}
                {siteCheckpoints.length === 0 ? (
                  <p className="text-xs text-[#828cb0] italic print:text-slate-600">No checkpoints created under this location yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                    {siteCheckpoints.map((cp) => {
                      const svgId = `qr-svg-${cp.id}`;
                      const canvasId = `qr-canvas-${cp.id}`;

                      return (
                        <div
                          key={cp.id}
                          className="bg-[#070b18] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between space-x-4 print:bg-slate-50 print:border-black"
                        >
                          {/* Left: Checkpoint Info & Actions */}
                          <div className="flex flex-col justify-between space-y-3 flex-1 min-w-0">
                            <div>
                              <h3 className="text-sm font-extrabold text-white print:text-black truncate">{cp.name}</h3>
                              <p className="text-[11px] text-[#828cb0] print:text-slate-700 mt-0.5">Geofence: {cp.radius || '50m'}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                              <button
                                onClick={() => downloadSVG(cp.name, svgId)}
                                className="bg-[#10b981]/15 hover:bg-[#10b981] border border-[#10b981]/40 text-[#10b981] hover:text-black font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all text-center"
                              >
                                📥 SVG
                              </button>
                              <button
                                onClick={() => downloadPNG(cp.name, canvasId)}
                                className="bg-[#3b82f6]/15 hover:bg-[#3b82f6] border border-[#3b82f6]/40 text-[#60a5fa] hover:text-white font-extrabold py-1.5 px-2.5 rounded-lg text-[10px] transition-all text-center"
                              >
                                🖼️ PNG
                              </button>
                            </div>
                          </div>

                          {/* Right: Side-by-Side QR Code */}
                          <div className="bg-white p-2.5 rounded-xl border border-slate-300 print:border-none shrink-0">
                            <div className="hidden">
                              <QRCodeCanvas id={canvasId} value={cp.name} size={500} level="H" includeMargin={true} />
                            </div>
                            <QRCodeSVG id={svgId} value={cp.name} size={110} level="H" includeMargin={false} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Location Modal */}
      {isAddSiteOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-[#10b981] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1a233d] pb-3">
              <h3 className="text-sm font-bold text-white uppercase">🏢 Register New Location (Site)</h3>
              <button onClick={() => setIsAddSiteOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#828cb0] uppercase block mb-1">Location / Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. West Campus Data Center"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#10b981]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#828cb0] uppercase block mb-1">Street Address / Facility Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Innovation Way, Building B"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a233d]">
                <button
                  type="button"
                  onClick={() => setIsAddSiteOpen(false)}
                  className="bg-[#1e293b] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSite}
                  className="bg-[#10b981] hover:bg-[#059669] text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  {savingSite ? 'Registering...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {isAddCpOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-[#2563eb] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1a233d] pb-3">
              <h3 className="text-sm font-bold text-white uppercase">📍 Add Checkpoint to Location</h3>
              <button onClick={() => setIsAddCpOpen(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCheckpoint} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#828cb0] uppercase block mb-1">Target Location</label>
                <select
                  value={selectedSiteForCp}
                  onChange={(e) => setSelectedSiteForCp(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#2563eb]"
                  required
                >
                  <option value="" disabled>Select Location...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#828cb0] uppercase block mb-1">Checkpoint Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main Gate West"
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#2563eb]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#828cb0] uppercase block mb-1">Geofence Radius</label>
                <input
                  type="text"
                  value={newCpRadius}
                  onChange={(e) => setNewCpRadius(e.target.value)}
                  className="w-full bg-[#070b18] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#2563eb]"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1a233d]">
                <button
                  type="button"
                  onClick={() => setIsAddCpOpen(false)}
                  className="bg-[#1e293b] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCp}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  {savingCp ? 'Saving...' : 'Add Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
