import { runJob } from "@/lib/notify";
import type { Job } from "@/lib/notify";
import { verifySignature } from "@/lib/qstash";

// Called by QStash at booked times (see src/lib/notify.ts). Only signed calls are accepted.
export async function POST(req: Request) {
  const body = await req.text();
  const url = `${process.env.SITE_URL ?? "https://sicko-central.vercel.app"}/api/notify/tick`;
  if (!verifySignature(req.headers.get("upstash-signature"), body, url)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let job: Job;
  try {
    job = JSON.parse(body) as Job;
  } catch {
    return Response.json({ error: "Bad job" }, { status: 400 });
  }
  if (!job || typeof job.gameId !== "number" || !["remind", "goalie", "game", "leafs"].includes(job.kind)) {
    return Response.json({ error: "Bad job" }, { status: 400 });
  }
  const result = await runJob(job);
  return Response.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
}
