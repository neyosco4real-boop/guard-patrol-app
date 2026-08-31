import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, checkpoints: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { location_name, checkpoint_name, qr_url } = body;

    // The database column 'name' is NOT NULL and is failing because previous payload mappings missed it.
    // Let's explicitly provide name, location, checkpoint, location_name, checkpoint_name, and qr codes to cover all bases.
    const payload = {
      name: checkpoint_name || location_name || 'Checkpoint',
      location: location_name,
      checkpoint: checkpoint_name,
      location_name,
      checkpoint_name,
      qr_url,
      qr_code: qr_url
    };

    let { data, error } = await supabase
      .from('checkpoints')
      .insert([payload])
      .select();

    if (error) {
      // If any extra unknown columns cause errors, try inserting with minimal required columns plus 'name'
      const minimalPayload = {
        name: checkpoint_name || 'Checkpoint',
        location: location_name,
        checkpoint: checkpoint_name
      };

      const res2 = await supabase
        .from('checkpoints')
        .insert([minimalPayload])
        .select();

      if (res2.error) throw res2.error;
      data = res2.data;
    }

    return NextResponse.json({ success: true, checkpoint: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let query = supabase.from('checkpoints').delete();
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.not('id', 'is', null);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
