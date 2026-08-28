import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



export async function submitPatrolScan(data: {
  guardName: string;
  locationName: string;
  checkpointName: string;
  isIncident: boolean;
  notes?: string;
  mediaUrl?: string | null;
}) {
  const payload: Record<string, any> = {
    guard_name: data.guardName,
    location_name: data.locationName,
    checkpoint_name: data.checkpointName,
    status: data.isIncident ? 'INCIDENT' : 'VERIFIED',
    notes: data.notes || '',
    media_url: data.mediaUrl || null,
    scanned_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from('patrol_logs')
    .insert([payload])
    .select();

  if (error) {
    console.error("Primary insert failed, retrying minimal insert...", error);
    // Fallback if table requires non-strict payload
    const fallbackPayload = {
      notes: `${data.guardName} @ ${data.checkpointName} (${data.locationName}): ${data.notes || ''}`,
      scanned_at: new Date().toISOString()
    };
    const res = await supabase.from('patrol_logs').insert([fallbackPayload]).select();
    if (res.error) throw res.error;
    return res.data;
  }

  return result;
}
