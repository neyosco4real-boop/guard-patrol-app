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

    // Dynamically inspect existing table columns from a sample row
    const { data: sampleRows } = await supabase
      .from('checkpoints')
      .select('*')
      .limit(1);

    let insertPayload: Record<string, any> = {};

    if (sampleRows && sampleRows.length > 0) {
      const existingKeys = Object.keys(sampleRows[0]);
      
      if (existingKeys.includes('location_name')) insertPayload['location_name'] = location_name;
      else if (existingKeys.includes('location')) insertPayload['location'] = location_name;
      else if (existingKeys.includes('site_name')) insertPayload['site_name'] = location_name;

      if (existingKeys.includes('checkpoint_name')) insertPayload['checkpoint_name'] = checkpoint_name;
      else if (existingKeys.includes('checkpoint')) insertPayload['checkpoint'] = checkpoint_name;
      else if (existingKeys.includes('name')) insertPayload['name'] = checkpoint_name;

      if (existingKeys.includes('qr_url')) insertPayload['qr_url'] = qr_url;
      else if (existingKeys.includes('qr_code')) insertPayload['qr_code'] = qr_url;
      else if (existingKeys.includes('url')) insertPayload['url'] = qr_url;
    }

    let data, error;

    if (Object.keys(insertPayload).length > 0) {
      const res = await supabase.from('checkpoints').insert([insertPayload]).select();
      data = res.data;
      error = res.error;
    }

    if (!data || error) {
      const attempts = [
        { location_name, checkpoint_name, qr_url },
        { location: location_name, checkpoint: checkpoint_name, qr_url },
        { location_name, name: checkpoint_name, qr_url },
        { location: location_name, checkpoint: checkpoint_name, qr_code: qr_url },
        { location: location_name, checkpoint: checkpoint_name, qr_code: qr_url }
      ];

      for (const attempt of attempts) {
        const res = await supabase.from('checkpoints').insert([attempt]).select();
        if (!res.error) {
          data = res.data;
          error = null;
          break;
        } else {
          error = res.error;
        }
      }
    }

    if (error) throw error;
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
