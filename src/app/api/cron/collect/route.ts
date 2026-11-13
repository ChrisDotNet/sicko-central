import { connection } from "next/server";
import { collectGameMedia } from "@/lib/media";
import { getSchedule } from "@/lib/nhl";
import { collectSensNews } from "@/lib/sens-news";

// Daily job (vercel.json): save the all-Sens news list, and news, video and radio for recent
// and upcoming games, before TSN's and Sportsnet's feeds roll past them. Their feeds hold
// two to three days, so once
// a day is enough; page views save anything newer in between.
// Set CRON_SECRET in Vercel to keep anyone else from running it.
const PAST_MS = 4 * 86400_000;
const AHEAD_MS = 2 * 86400_000;

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schedule = await getSchedule();
  const now = Date.now();
  const games = (schedule?.games ?? []).filter((g) => {
    const start = Date.parse(g.startTimeUTC);
    return g.gameType >= 2 && start >= now - PAST_MS && start <= now + AHEAD_MS;
  });
  const results = [];
  for (const g of games) {
    const m = await collectGameMedia(String(g.id), g.startTimeUTC);
    results.push({
      game: g.id,
      news: m.news.length,
      video: m.video.recaps.length + m.video.condensed.length + m.video.highlights.length,
      radio: m.radio.length,
    });
  }
  const news = await collectSensNews();
  return Response.json({ collected: results, news: news.length }, { headers: { "Cache-Control": "no-store" } });
}
