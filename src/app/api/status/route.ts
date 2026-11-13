import { getScoresNowLive } from "@/lib/nhl";
import { FINAL_STATES, LIVE_STATES } from "@/lib/nhl-shared";
import { OTT } from "@/lib/teams";
import type { GameStatus } from "@/lib/game-status";

// Is there a Sens game today, and is it on? The menu checks this to dress up the Game tab.
// One small answer for every visitor: the CDN serves it for 30 s.
export async function GET() {
  const scores = await getScoresNowLive();
  const g = scores?.games.find((x) => x.homeTeam.abbrev === OTT || x.awayTeam.abbrev === OTT);
  let status: GameStatus = { state: "none" };
  if (g) {
    const home = g.homeTeam.abbrev === OTT;
    const ott = home ? g.homeTeam : g.awayTeam;
    const opp = home ? g.awayTeam : g.homeTeam;
    status = {
      state: LIVE_STATES.includes(g.gameState) ? "live" : FINAL_STATES.includes(g.gameState) ? "final" : "pre",
      opp: opp.abbrev,
      home,
      ottScore: ott.score ?? 0,
      oppScore: opp.score ?? 0,
      startTimeUTC: g.startTimeUTC,
    };
  }
  return Response.json(status, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
