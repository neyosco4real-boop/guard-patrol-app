import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ success: true, logs: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guard_name, location, checkpoint, gps_coordinates, incident_report, status } = body;

    if (!guard_name || !location || !checkpoint) {
      return NextResponse.json({ success: false, error: 'Missing required patrol fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('patrol_logs')
      .insert([
        {
          guard_name,
          location,
          checkpoint,
          gps_coordinates: gps_coordinates || 'N/A',
          incident_report: incident_report || 'None',
          status: status || 'Completed',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, log: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
