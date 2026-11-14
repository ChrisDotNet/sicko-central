import { cleanPrefs } from "@/lib/push-prefs";
import { pushEnabled, removeSubscription, saveSubscription, validSubscription } from "@/lib/push";

// Save this phone's subscription and choices (POST), or stop notifications (DELETE).
export async function POST(req: Request) {
  if (!pushEnabled) return Response.json({ ok: false, error: "Notifications aren't set up yet." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { subscription?: unknown; prefs?: unknown } | null;
  if (!body || !validSubscription(body.subscription)) return Response.json({ ok: false, error: "Bad subscription" }, { status: 400 });
  const ok = await saveSubscription(body.subscription, cleanPrefs(body.prefs));
  return Response.json({ ok }, { status: ok ? 200 : 500 });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint === "string") await removeSubscription(body.endpoint);
  return Response.json({ ok: true });
}
