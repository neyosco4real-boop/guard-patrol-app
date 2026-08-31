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
    
    // Normalize data for admin view
    const formattedLogs = (data || []).map((log: any) => {
      let loc = log.location || '';
      let cp = log.checkpoint || '';
      if (loc.includes(' | ')) {
        const parts = loc.split(' | ');
        loc = parts[0];
        if (!cp) cp = parts[1];
      }
      return {
        ...log,
        location: loc,
        checkpoint: cp || 'General Scan'
      };
    });

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

    const combinedLocation = checkpoint ? `${location} | ${checkpoint}` : location;

    const insertPayload: any = {
      guard_name,
      location: combinedLocation,
      gps_coordinates: gps_coordinates || 'N/A',
      incident_report: incident_report || 'None',
      status: status || 'Completed',
      created_at: new Date().toISOString()
    };

    // Try inserting with checkpoint column if it exists, otherwise fallback to combined location
    let { data, error } = await supabase
      .from('patrol_logs')
      .insert([
        {
          ...insertPayload,
          checkpoint: checkpoint || ''
        }
      ])
      .select();

    if (error && error.message.includes('checkpoint')) {
      // Fallback if checkpoint column does not exist in Supabase table
      const retry = await supabase
        .from('patrol_logs')
        .insert([insertPayload])
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return NextResponse.json({ success: true, log: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
