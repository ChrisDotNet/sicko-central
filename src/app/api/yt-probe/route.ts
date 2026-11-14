import { connection } from "next/server";
export async function GET() {
  await connection();
  const urls = ["https://www.youtube.com/feeds/videos.xml?channel_id=UCtgGJaIlIzYE2Ney_P2ps9w", "https://www.youtube.com/feeds/videos.xml?playlist_id=UUtgGJaIlIzYE2Ney_P2ps9w"];
  const out = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const t = await r.text();
      out.push({ u, status: r.status, entries: (t.match(/<entry>/g) ?? []).length, first: t.match(/<entry>[\s\S]*?<title>(.*?)<\/title>/)?.[1] });
    } catch (e) {
      out.push({ u, error: String(e) });
    }
  }
  return Response.json(out);
}
