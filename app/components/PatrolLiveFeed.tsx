'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function PatrolLiveFeed() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('scanned_at', { ascending: false });

    if (!error && data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('admin_live_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrol_logs' }, fetchLogs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 my-4 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white">📡 Live Guard Patrol & Incident Feed</h2>
        <button onClick={fetchLogs} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400 text-xs text-center py-6">Loading feed...</div>
      ) : logs.length === 0 ? (
        <div className="text-slate-500 text-xs text-center py-6">No scan or incident logs recorded yet.</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {logs.map((log, i) => {
            const isIncident = log.status === 'incident' || log.status === 'INCIDENT' || log.notes;
            return (
              <div key={log.id || i} className={`p-3 rounded-lg border flex justify-between items-center text-xs ${isIncident ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-950 border-slate-800'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isIncident ? 'bg-red-600 text-white' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {log.status || (isIncident ? 'INCIDENT' : 'VERIFIED')}
                    </span>
                    <span className="font-mono text-slate-300">Checkpoint: {log.checkpoint_id || log.scanned_location || 'Main Gate'}</span>
                  </div>
                  {log.notes && <p className="text-slate-200 mt-1 font-sans">{log.notes}</p>}
                  {log.media_url && (
                    <a href={log.media_url} target="_blank" rel="noreferrer" className="inline-block text-cyan-400 underline mt-1">
                      🖼️ View Photo Evidence
                    </a>
                  )}
                </div>
                <div className="text-right text-slate-400">
                  <div>{log.scanned_at ? new Date(log.scanned_at).toLocaleTimeString() : 'Just now'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
