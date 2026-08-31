import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    // Fetch locations and checkpoints
    const { data: locations, error: locError } = await supabase.from('locations').select('*').order('created_at', { ascending: false });
    const { data: checkpoints, error: cpError } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: false });

    if (locError && cpError) throw locError;

    // If locations table isn't created, structure everything from checkpoints table
    if (locError || !locations || locations.length === 0) {
      const groupedMap: { [key: string]: any } = {};
      (checkpoints || []).forEach((cp) => {
        const locName = cp.location || 'Tom Salem Head Office';
        if (!groupedMap[locName]) {
          groupedMap[locName] = { id: locName, name: locName, address: '', checkpoints: [] };
        }
        groupedMap[locName].checkpoints.push(cp);
      });
      return NextResponse.json({ success: true, locations: Object.values(groupedMap) });
    }

    // Attach checkpoints to their respective locations
    const formattedLocations = locations.map((loc) => {
      const locCheckpoints = (checkpoints || []).filter(
        (cp) => cp.location_id === loc.id || cp.location === loc.name
      );
      return { ...loc, checkpoints: locCheckpoints };
    });

    return NextResponse.json({ success: true, locations: formattedLocations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { locationId, location, name, qrPayload } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Checkpoint name is required' }, { status: 400 });
    }

    const payload = qrPayload || `Location:${location || 'Tom Salem Head Office'}|Checkpoint:${name}`;

    const { data, error } = await supabase
      .from('checkpoints')
      .insert([
        {
          location_id: locationId || null,
          location: location || 'Tom Salem Head Office',
          name: name,
          qr_payload: payload
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
