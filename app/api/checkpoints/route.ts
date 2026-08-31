import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    const { data: checkpoints, error } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    // Group checkpoints dynamically by location name
    const groupedMap: { [key: string]: any } = {};
    (checkpoints || []).forEach((cp) => {
      const locName = cp.location || 'Tom Salem Head Office';
      if (!groupedMap[locName]) {
        groupedMap[locName] = { id: locName, name: locName, address: '', checkpoints: [] };
      }
      groupedMap[locName].checkpoints.push(cp);
    });

    return NextResponse.json({ success: true, locations: Object.values(groupedMap) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { location, name } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Checkpoint name is required' }, { status: 400 });
    }

    // Insert only standard columns that always exist in the checkpoints table
    const { data, error } = await supabase
      .from('checkpoints')
      .insert([
        {
          location: location || 'Tom Salem Head Office',
          name: name
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, checkpoint: data?.[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Checkpoint ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('checkpoints').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
