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

    // Based on schema cache errors, the actual columns in Supabase are 'location_name' and 'checkpoint_name' (or 'name')
    // Let's try inserting with exact known columns: location_name, checkpoint_name, qr_url
    let { data, error } = await supabase
      .from('checkpoints')
      .insert([{ location_name, checkpoint_name, qr_url }])
      .select();

    if (error) {
      // Fallback variations if needed
      let res2 = await supabase
        .from('checkpoints')
        .insert([{ location_name, name: checkpoint_name, qr_url }])
        .select();

      if (res2.error) {
        let res3 = await supabase
          .from('checkpoints')
          .insert([{ location: location_name, checkpoint_name, qr_code: qr_url }])
          .select();
        
        if (res3.error) {
          throw error; // throw original or final error
        }
        data = res3.data;
      } else {
        data = res2.data;
      }
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
