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
        checkpoint: cp || log.checkpoint || 'General Scan',
        gps_coordinates: log.gps_coordinates || log.gps || 'N/A',
        incident_report: log.incident_report || log.notes || 'None'
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

    // 1. Try full schema payload first
    let payload: any = {
      guard_name,
      location: combinedLocation,
      checkpoint: checkpoint || '',
      gps_coordinates: gps_coordinates || 'N/A',
      incident_report: incident_report || 'None',
      status: status || 'Completed',
      created_at: new Date().toISOString()
    };

    let { data, error } = await supabase.from('patrol_logs').insert([payload]).select();

    // 2. If checkpoint column is missing, strip it
    if (error && error.message.includes('checkpoint')) {
      delete payload.checkpoint;
      const retry = await supabase.from('patrol_logs').insert([payload]).select();
      data = retry.data;
      error = retry.error;
    }

    // 3. If gps_coordinates column is missing, strip it or map to gps
    if (error && (error.message.includes('gps_coordinates') || error.message.includes('column'))) {
      delete payload.gps_coordinates;
      delete payload.incident_report;
      payload.notes = incident_report || 'None';
      payload.gps = gps_coordinates || 'N/A';
      
      const retryFinal = await supabase.from('patrol_logs').insert([payload]).select();
      data = retryFinal.data;
      error = retryFinal.error;
    }

    if (error) throw error;
    return NextResponse.json({ success: true, log: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
