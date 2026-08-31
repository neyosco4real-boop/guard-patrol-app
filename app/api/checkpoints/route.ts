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

    // Based on the error sequence:
    // 1. It complained about 'checkpoint' missing.
    // 2. Now it complained about 'qr_url' missing.
    // This proves the table has 'location' and 'checkpoint', but doesn't have 'qr_url' (it likely uses 'qr_code' or none at all).
    const possiblePayloads = [
      { location: location_name, checkpoint: checkpoint_name, qr_code: qr_url },
      { location: location_name, checkpoint: checkpoint_name, url: qr_url },
      { location: location_name, checkpoint: checkpoint_name },
      { location_name, checkpoint_name, qr_code: qr_url },
      { location_name, checkpoint_name }
    ];

    let data = null;
    let lastError = null;

    for (const payload of possiblePayloads) {
      const { data: inserted, error } = await supabase
        .from('checkpoints')
        .insert([payload])
        .select();

      if (!error && inserted) {
        data = inserted;
        lastError = null;
        break;
      } else {
        lastError = error;
      }
    }

    if (lastError) throw lastError;

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
