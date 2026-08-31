import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET() {
  try {
    // Fetch locations and checkpoints independently
    const { data: locationsData, error: locError } = await supabase.from('locations').select('*').order('created_at', { ascending: false });
    const { data: checkpointsData, error: cpError } = await supabase.from('checkpoints').select('*').order('created_at', { ascending: false });

    // Build a map of locations
    const locationMap: { [key: string]: any } = {};

    // 1. Populate from locations table if available
    if (!locError && locationsData) {
      locationsData.forEach((loc) => {
        locationMap[loc.name] = {
          id: loc.id,
          name: loc.name,
          address: loc.address || '',
          checkpoints: []
        };
      });
    }

    // 2. Populate checkpoints and ensure their parent location exists in the map
    if (!cpError && checkpointsData) {
      checkpointsData.forEach((cp) => {
        const locName = cp.location || 'Tom Salem Head Office';
        if (!locationMap[locName]) {
          locationMap[locName] = {
            id: locName,
            name: locName,
            address: 'Active Location Site',
            checkpoints: []
          };
        }
        locationMap[locName].checkpoints.push(cp);
      });
    }

    return NextResponse.json({ success: true, locations: Object.values(locationMap) });
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

    const targetLocation = location || 'Tom Salem Head Office';

    // Ensure the location exists in the locations table as well
    await supabase.from('locations').upsert([{ name: targetLocation, address: 'Registered Site' }], { onConflict: 'name' });

    // Insert checkpoint
    const { data, error } = await supabase
      .from('checkpoints')
      .insert([
        {
          location: targetLocation,
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
