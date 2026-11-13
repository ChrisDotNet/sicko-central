import { connection } from "next/server";
export async function GET() {
  await connection();
  try {
    const res = await fetch("https://leftwinglock.com/starting-goalies/", { cache: "no-store", headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" }, signal: AbortSignal.timeout(10_000) });
    const t = await res.text();
    const i = t.search(/Shesterkin|Merilainen|Rangers/);
    return Response.json({ status: res.status, i, title: t.match(/<title>(.*?)<\/title>/)?.[1], around: i >= 0 ? t.slice(Math.max(0, i - 1500), i + 1500) : t.slice(0, 3000) });
  } catch (e) {
    return Response.json({ error: String(e) });
  }
}
