import { connection } from "next/server";
export async function GET() {
  await connection();
  try {
    const res = await fetch("https://www.dailyfaceoff.com/starting-goalies/2026-11-14", {
      cache: "no-store",
      headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
      signal: AbortSignal.timeout(10_000),
    });
    const t = await res.text();
    return Response.json({ status: res.status, len: t.length, head: t.slice(0, 300), server: res.headers.get("server") });
  } catch (e) {
    return Response.json({ error: String(e) });
  }
}
