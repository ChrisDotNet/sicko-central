import { sendTest } from "@/lib/push";

// Send a test notification to the phone asking (identified by its own subscription).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return Response.json({ result: "failed" }, { status: 400 });
  const result = await sendTest(body.endpoint);
  return Response.json({ result }, { status: result === "sent" ? 200 : result === "too-soon" ? 429 : 400 });
}
