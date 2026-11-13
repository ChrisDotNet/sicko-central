import { connection } from "next/server";
const URLS = [
  "https://www.rotowire.com/hockey/starting-goalies.php",
  "https://leftwinglock.com/starting-goalies/",
  "https://www.dailyfaceoff.com/starting-goalies/2026-11-14",
];
export async function GET() {
  await connection();
  const out = await Promise.all(
    URLS.map(async (u) => {
      try {
        const res = await fetch(u, { cache: "no-store", headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" }, signal: AbortSignal.timeout(10_000) });
        const t = await res.text();
        return { u, status: res.status, len: t.length, ott: (t.match(/Ullmark|Ottawa|OTT/g) ?? []).length };
      } catch (e) {
        return { u, error: String(e) };
      }
    }),
  );
  return Response.json(out);
}
