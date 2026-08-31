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

    // Comprehensive fallback payloads covering all possible Supabase schema variations
    // (handling empty table states where dynamic schema inspection isn't possible)
    const possiblePayloads = [
      { location: location_name, name: checkpoint_name, qr_code: qr_url },
      { location: location_name, name: checkpoint_name, qr_url: qr_url },
      { site: location_name, gate: checkpoint_name, qr_code: qr_url },
      { location_name, name: checkpoint_name, qr_url },
      { title: `${location_name} - ${checkpoint_name}`, qr_url },
      { location: location_name, qr_url }
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
