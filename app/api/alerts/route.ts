import { NextResponse } from 'next/server';

export async function GET() {
  if (!globalThis.__alertsStore) {
    globalThis.__alertsStore = [];
  }
  return NextResponse.json({ success: true, alerts: globalThis.__alertsStore });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!globalThis.__alertsStore) {
      globalThis.__alertsStore = [];
    }

    const newAlert = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36.substring(2, 7)),
      guardName: body.guardName || 'Officer',
      location: body.location || 'Tom Salem Head Office',
      checkpointName: body.checkpointName || 'Front Gate',
      notes: body.notes || 'Normal Patrol Scan',
      isIncident: !!body.isIncident,
      mediaUrl: body.mediaUrl || '',
      lat: body.lat ?? 6.44508,
      lng: body.lng ?? 3.41434,
      createdAt: new Date().toISOString(),
    };

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
