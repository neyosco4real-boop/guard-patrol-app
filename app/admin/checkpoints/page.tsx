'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CheckpointsAdminPage() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Checkpoint form state (Create)
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Checkpoint modal state
  const [editCpModal, setEditCpModal] = useState(false);
  const [editingCpId, setEditingCpId] = useState('');
  const [editCpName, setEditCpName] = useState('');
  const [editCpSiteId, setEditCpSiteId] = useState('');
  const [cpSubmitting, setCpSubmitting] = useState(false);

  // New Site modal / form state
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [siteSubmitting, setSiteSubmitting] = useState(false);

  // Report export filter state
  const [reportSiteId, setReportSiteId] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cpRes, siteRes] = await Promise.all([
      supabase.from('checkpoints').select('*, sites(id, name, address, latitude, longitude)').order('name', { ascending: true }),
      supabase.from('sites').select('*').order('name', { ascending: true })
    ]);

    if (cpRes.data) {
      const active = cpRes.data.filter((cp: any) => !cp.name.includes('[ARCHIVED]'));
      setCheckpoints(active);
    }
    if (siteRes.data) {
      setSites(siteRes.data);
      if (siteRes.data.length > 0 && !siteId) setSiteId(siteRes.data[0].id);
    }
    setLoading(false);
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (error) => {
        alert(`Unable to retrieve your location: ${error.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setSiteSubmitting(true);
    const payload: any = {
      name: newSiteName.trim(),
      address: newSiteAddress.trim() || null
    };
    if (latitude) payload.latitude = parseFloat(latitude);
    if (longitude) payload.longitude = parseFloat(longitude);

    let { data, error } = await supabase.from('sites').insert([payload]).select().single();

    if (error && error.message.includes('column')) {
      const basicRes = await supabase.from('sites').insert([{
        name: newSiteName.trim(),
        address: newSiteAddress.trim() || null
      }]).select().single();
      data = basicRes.data;
      error = basicRes.error;
    }

    if (!error && data) {
      setNewSiteName('');
      setNewSiteAddress('');
      setLatitude('');
      setLongitude('');
      setShowSiteModal(false);
      await fetchData();
      setSiteId(data.id);
    } else {
      alert(`Error creating location: ${error?.message}`);
    }
    setSiteSubmitting(false);
  };

  const handleDeleteSite = async (site: any) => {
    if (!confirm(`Are you sure you want to delete location "${site.name}"? This will delete all associated checkpoints and their QR codes.`)) {
      return;
    }

    // Find checkpoints belonging to this site
    const siteCps = checkpoints.filter(cp => cp.site_id === site.id || cp.sites?.id === site.id);
    const cpIds = siteCps.map(cp => cp.id);

    // Delete QR codes for these checkpoints if qr_codes table exists
    if (cpIds.length > 0) {
      await supabase.from('qr_codes').delete().in('checkpoint_id', cpIds);
      await supabase.from('checkpoints').delete().in('id', cpIds);
    }
    
    // Delete the site itself
    const { error } = await supabase.from('sites').delete().eq('id', site.id);
    if (!error) {
      fetchData();
    } else {
      alert(`Error deleting location: ${error.message}`);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('checkpoints').insert([{
      name: name.trim(),
      site_id: siteId || null,
    }]);

    if (!error) {
      setName('');
      fetchData();
    } else {
      alert(`Error: ${error.message}`);
    }
    setSubmitting(false);
  };

  const openEditCheckpoint = (cp: any) => {
    setEditingCpId(cp.id);
    setEditCpName(cp.name);
    setEditCpSiteId(cp.site_id || (cp.sites?.id ?? ''));
    setEditCpModal(true);
  };

  const handleUpdateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCpName.trim()) return;

    setCpSubmitting(true);
    const { error } = await supabase
      .from('checkpoints')
      .update({
        name: editCpName.trim(),
        site_id: editCpSiteId || null
      })
      .eq('id', editingCpId);

    if (!error) {
      setEditCpModal(false);
      fetchData();
    } else {
      alert(`Error updating checkpoint: ${error.message}`);
    }
    setCpSubmitting(false);
  };

  const handleRemoveCheckpoint = async (cp: any) => {
    if (!confirm(`Permanently delete checkpoint "${cp.name}" and its QR code?`)) return;

    // Delete associated QR codes if stored in qr_codes table
    await supabase.from('qr_codes').delete().eq('checkpoint_id', cp.id);

    // Delete checkpoint record
    const { error } = await supabase
      .from('checkpoints')
      .delete()
      .eq('id', cp.id);

    if (!error) {
      fetchData();
    } else {
      // Fallback to archive if delete restricted by foreign keys
      const { error: archiveErr } = await supabase
        .from('checkpoints')
        .update({ name: `[ARCHIVED] ${cp.name}` })
        .eq('id', cp.id);

      if (!archiveErr) {
        fetchData();
      } else {
        alert(`Error removing checkpoint: ${error.message}`);
      }
    }
  };

  const fetchFilteredLogs = async () => {
    let query = supabase.from('patrol_logs').select('*').order('scanned_at', { ascending: false });
    
    if (reportSiteId !== 'ALL') {
      const siteCheckpoints = checkpoints.filter(cp => cp.site_id === reportSiteId || cp.sites?.id === reportSiteId);
      const cpNames = siteCheckpoints.map(cp => cp.name);
      if (cpNames.length > 0) {
        query = query.in('checkpoint_name', cpNames);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  };

  const downloadExcelReport = async () => {
    const data = await fetchFilteredLogs();
    if (data.length === 0) {
      alert('No patrol logs available for the selected location.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Guard Name,Checkpoint Name,Location,Notes,Latitude,Longitude,Timestamp\n';
    data.forEach((row) => {
      const line = [
        `"${row.guard_name || ''}"`,
        `"${row.checkpoint_name || ''}"`,
        `"${row.location_name || ''}"`,
        `"${(row.notes || '').replace(/"/g, '""')}"`,
        row.latitude || '',
        row.longitude || '',
        `"${row.scanned_at}"`
      ].join(',');
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const siteSuffix = reportSiteId === 'ALL' ? 'All_Sites' : (sites.find(s => s.id === reportSiteId)?.name || 'Location').replace(/\s+/g, '_');
    link.setAttribute('download', `Tom_Salem_Patrol_Report_${siteSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDFReport = async () => {
    const data = await fetchFilteredLogs();
    if (data.length === 0) {
      alert('No patrol logs available for the selected location.');
      return;
    }

    const siteNameSelected = reportSiteId === 'ALL' ? 'All Locations (Head Office & Branches)' : (sites.find(s => s.id === reportSiteId)?.name || 'Selected Location');

    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.top = '0';
    printContainer.style.left = '0';
    printContainer.style.width = '100vw';
    printContainer.style.height = '100vh';
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.zIndex = '999999';
    printContainer.style.padding = '40px';
    printContainer.style.overflowY = 'auto';
    printContainer.style.color = '#111111';

    printContainer.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; font-family: sans-serif;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a;">Tom Salem Security Operations</h1>
            <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">Certified Security Patrol & Incident Audit Report</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div><b>Target Site:</b> ${siteNameSelected}</div>
            <div><b>Generated:</b> ${new Date().toLocaleString()}</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #334155;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Guard</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Checkpoint</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Notes / Incident</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(log => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; color: #0f172a;">${log.guard_name}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${log.checkpoint_name}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">${log.notes || 'Normal Patrol Scan'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; color: #475569;">${new Date(log.scanned_at).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Tom Salem Security Intelligence System — Confidential Security Audit Log
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);
    window.print();
    document.body.removeChild(printContainer);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-xl gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Checkpoint & Location Command
            </h1>
            <p className="text-xs text-slate-400 mt-1">Manage physical locations, site geofences, and patrol report exports.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowSiteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              + Create Location
            </button>
            <a href="/admin/qr-codes" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all">
              📷 QR Generator
            </a>
            <a href="/admin" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase border border-white/10 transition-all">
              Dashboard
            </a>
          </div>
        </div>

        {/* Location Management & Deletion Section */}
        <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-indigo-300">Registered Location Sites ({sites.length})</h2>
              <p className="text-[11px] text-slate-400">Manage or remove location sites and their associated checkpoints & QR codes.</p>
            </div>
            <button
              onClick={() => setShowSiteModal(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer"
            >
              + Add Location
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">No location sites registered.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sites.map((site) => (
                <div key={site.id} className="bg-slate-950 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1 truncate">
                    <h3 className="text-xs font-bold text-white">🏢 {site.name}</h3>
                    {site.address && <p className="text-[10px] text-slate-400 truncate">{site.address}</p>}
                    <div className="text-[9px] font-mono text-emerald-400">
                      {site.latitude && site.longitude ? `GPS: ${site.latitude}, ${site.longitude}` : 'No GPS coordinates'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSite(site)}
                    className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-all shrink-0"
                  >
                    🗑️ Delete Site
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Export Bar with Location Filter */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/20 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-indigo-300">Patrol Reports & Incident Exports</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Select a specific location site to filter and download certified reports.</p>
            </div>
            <div className="w-full md:w-72">
              <select
                value={reportSiteId}
                onChange={(e) => setReportSiteId(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-mono"
              >
                <option value="ALL">🌐 All Locations (Global Report)</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>🏢 {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
            <button
              onClick={downloadExcelReport}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              📊 Download Excel (CSV) for Selected Location
            </button>
            <button
              onClick={downloadPDFReport}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              📄 Print / Download PDF for Selected Location
            </button>
          </div>
        </div>

        {/* Creator Form */}
        <form onSubmit={handleCreateCheckpoint} className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400">Add New Checkpoint</h2>
            <span className="text-[10px] text-slate-400 font-mono">Links to selected location site</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400">Checkpoint Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Main Gate Perimeter"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-slate-400">Assigned Location (Site)</label>
                <button
                  type="button"
                  onClick={() => setShowSiteModal(true)}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                >
                  + New Location
                </button>
              </div>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.address ? `(${s.address})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating Checkpoint...' : '+ Save Checkpoint'}
            </button>
          </div>
        </form>

        {/* List */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-black uppercase text-slate-300 tracking-wider">Active Checkpoint Directory ({checkpoints.length})</h2>
          
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">Loading directory...</div>
          ) : checkpoints.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">No active checkpoints found.</div>
          ) : (
            <div className="space-y-3">
              {checkpoints.map((cp) => (
                <div key={cp.id} className="bg-slate-950 border border-white/10 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 truncate">
                    <h3 className="text-sm font-bold text-white">{cp.name}</h3>
                    <p className="text-[11px] text-cyan-400 font-mono">Site: {cp.sites?.name || 'Tom Salem Head Office'}</p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 font-mono">
                      <span>UUID: {cp.id}</span>
                      {cp.sites?.latitude && cp.sites?.longitude && (
                        <span className="text-emerald-400">Site GPS: {cp.sites.latitude}, {cp.sites.longitude}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => openEditCheckpoint(cp)}
                      className="bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 px-3 py-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-all"
                    >
                      ✏️ Edit
                    </button>
                    <a
                      href={`/admin/qr-codes`}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                      📷 QR Card
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveCheckpoint(cp)}
                      className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 px-3 py-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-all"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Checkpoint Modal */}
        {editCpModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black uppercase text-white tracking-wider">Edit Checkpoint</h3>
                <button
                  onClick={() => setEditCpModal(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateCheckpoint} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Checkpoint Name</label>
                  <input
                    type="text"
                    required
                    value={editCpName}
                    onChange={(e) => setEditCpName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Assigned Location (Site)</label>
                  <select
                    value={editCpSiteId}
                    onChange={(e) => setEditCpSiteId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">-- No Specific Site --</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.address ? `(${s.address})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditCpModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cpSubmitting}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {cpSubmitting ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Location Modal with GPS */}
        {showSiteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black uppercase text-white tracking-wider">Create New Location Site</h3>
                <button
                  onClick={() => setShowSiteModal(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSite} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Site / Location Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Victoria Island Branch"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Address / Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 14 Ahmadu Bello Way"
                    value={newSiteAddress}
                    onChange={(e) => setNewSiteAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-400"
                  />
                </div>

                {/* GPS Capture for Location Site */}
                <div className="bg-slate-950 border border-white/10 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-200">Location GPS Coordinates</span>
                      <p className="text-[10px] text-slate-400">Capture exact coordinates for site geofencing.</p>
                    </div>
                    <button
                      type="button"
                      onClick={captureGPS}
                      disabled={gpsLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {gpsLoading ? 'Acquiring GPS...' : '📍 Use My Current Location'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Latitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 6.445100"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-500">Longitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 3.414300"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSiteModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={siteSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {siteSubmitting ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
