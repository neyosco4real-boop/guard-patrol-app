import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('patrol_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, logs: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guard_name, location, checkpoint, gps_coordinates, incident_report, status } = body;

    const { data, error } = await supabase
      .from('patrol_logs')
      .insert([{ guard_name, location, checkpoint, gps_coordinates, incident_report, status }])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, log: data[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase
      .from('patrol_logs')
      .delete()
      .neq('id', 0); // Deletes all records in patrol_logs

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
