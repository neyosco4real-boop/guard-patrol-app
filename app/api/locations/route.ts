import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { name, address } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Location name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('locations')
      .insert([{ name, address }])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, location: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ success: false, error: 'Location ID or name required' }, { status: 400 });
    }

    // Delete checkpoints belonging to this location first
    if (name) {
      await supabase.from('checkpoints').delete().eq('location', name);
      await supabase.from('locations').delete().eq('name', name);
    }

    if (id) {
      await supabase.from('locations').delete().eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
