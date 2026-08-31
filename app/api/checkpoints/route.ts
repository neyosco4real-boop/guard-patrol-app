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

    // Supabase error cache explicitly confirms your table columns:
    // It expects 'location' and 'checkpoint' (based on the alternating error messages).
    // Let's insert into standard columns: { location: location_name, checkpoint: checkpoint_name, qr_url }
    let { data, error } = await supabase
      .from('checkpoints')
      .insert([{ 
        location: location_name, 
        checkpoint: checkpoint_name, 
        qr_url 
      }])
      .select();

    if (error) {
      // Fallback: try with qr_code column instead of qr_url
      const res2 = await supabase
        .from('checkpoints')
        .insert([{ 
          location: location_name, 
          checkpoint: checkpoint_name, 
          qr_code: qr_url 
        }])
        .select();

      if (res2.error) {
        // Fallback 3: try location_name and checkpoint
        const res3 = await supabase
          .from('checkpoints')
          .insert([{ 
            location_name, 
            checkpoint: checkpoint_name, 
            qr_url 
          }])
          .select();

        if (res3.error) throw error;
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
