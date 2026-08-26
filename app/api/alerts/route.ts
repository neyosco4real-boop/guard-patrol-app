import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { checkpoint_name, guard_name, distance_variance, radius_meters, timestamp } = body;

    // Construct security alert payload
    const alertData = {
      event: "GEOFENCE_VIOLATION",
      severity: "HIGH",
      details: {
        checkpoint: checkpoint_name || "Unknown Checkpoint",
        guard: guard_name || "Unassigned Guard",
        variance: `${distance_variance}m (Limit: ${radius_meters}m)`,
        time: timestamp || new Date().toISOString(),
      },
    };

    console.log("🚨 [GEOFENCE ALERT TRIGGERED]:", JSON.stringify(alertData, null, 2));

    // Webhook Integration (e.g. Slack/Microsoft Teams/Discord)
    const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *SECURITY ALERT: Geofence Breach Detected*\n*Guard:* ${guard_name}\n*Checkpoint:* ${checkpoint_name}\n*Distance Variance:* ${distance_variance}m (Max allowed: ${radius_meters}m)`,
        }),
      });
    }

    return NextResponse.json({ success: true, alert: alertData }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
