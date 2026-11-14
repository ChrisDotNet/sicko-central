import { runJob } from "@/lib/notify";
import type { Job } from "@/lib/notify";
import { verifySignature } from "@/lib/qstash";

// Called by QStash at booked times (see src/lib/notify.ts). Only signed calls are accepted.
export async function POST(req: Request) {
  const body = await req.text();
  // Messages are booked against SITE_URL; the other addresses of this site are accepted too,
  // so changing SITE_URL never strands messages already booked against the old one.
  const hosts = [process.env.SITE_URL, "https://sicko-central.vercel.app", "https://www.sickocentral.ca", "https://sickocentral.ca"];
  const urls = hosts.filter((h): h is string => !!h).map((h) => `${h.replace(/\/$/, "")}/api/notify/tick`);
  if (!verifySignature(req.headers.get("upstash-signature"), body, urls)) {
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
