import { pushEnabled, vapidPublicKey } from "@/lib/push";

// The public key phones subscribe with, and whether notifications are set up at all.
export function GET() {
  return Response.json({ enabled: pushEnabled, key: pushEnabled ? vapidPublicKey : null }, { headers: { "Cache-Control": "no-store" } });
}
