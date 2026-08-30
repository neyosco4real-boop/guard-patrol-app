import { NextResponse } from 'next/server';

declare global {
  var __alertsStore: any[] | undefined;
}

if (!globalThis.__alertsStore) {
  globalThis.__alertsStore = [];
}

export async function GET() {
  return NextResponse.json(globalThis.__alertsStore || []);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newAlert = {
      id: Date.now().toString(),
      guardName: body.guardName || body.guard || 'Officer',
      checkpointName: body.checkpointName || body.location || 'Unknown Checkpoint',
      notes: body.notes || 'Normal Patrol Scan',
      isIncident: !!body.isIncident,
      mediaUrl: body.mediaUrl || '',
      lat: body.lat ?? body.latitude ?? 6.44508,
      lng: body.lng ?? body.longitude ?? 3.41434,
      createdAt: new Date().toISOString(),
    };

    if (!globalThis.__alertsStore) {
      globalThis.__alertsStore = [];
    }

    globalThis.__alertsStore.unshift(newAlert);

    return NextResponse.json({ success: true, alert: newAlert }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
  }
}

export async function DELETE() {
  globalThis.__alertsStore = [];
  return NextResponse.json({ success: true });
}
