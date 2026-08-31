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
    
    const formattedLogs = (data || []).map((log: any) => ({
      ...log,
      checkpoint: 'General Scan',
      gps_coordinates: 'N/A',
      incident_report: log.location || 'None'
    }));

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guard_name, location, checkpoint, gps_coordinates, incident_report, status } = body;

    if (!guard_name || !location) {
      return NextResponse.json({ success: false, error: 'Missing required patrol fields' }, { status: 400 });
    }

    // Pack all details into the standard 'location' column to avoid missing-column errors in Supabase
    const packedLocation = `${location} | CP: ${checkpoint || 'N/A'} | Status: ${status || 'Completed'} | Notes: ${incident_report || 'None'}`;

    const minimalPayload = {
      guard_name,
      location: packedLocation,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('patrol_logs')
      .insert([minimalPayload])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, log: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
