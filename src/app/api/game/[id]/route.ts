import { buildGame } from "@/lib/game";
import { getBoxScore, getPlayByPlay, getScoresNowLive } from "@/lib/nhl";
import { atlanticGames } from "@/lib/rivals";
import { getRadioForGame } from "@/lib/radio";

// Live game data for the companion page. The browser polls this route; the NHL is
// never called from the browser. The CDN caches each response for about 10 s, so the
// NHL sees roughly one request per game every 10 s no matter how many fans are watching.
export async function GET(request: Request, ctx: RouteContext<"/api/game/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d{10}$/.test(id)) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }

  // ?t=<seconds> replays a finished game up to that point of game time (for testing).
  const t = new URL(request.url).searchParams.get("t");
  const untilElapsed = t != null && /^\d{1,5}$/.test(t) ? Number(t) : undefined;

  try {
    const [pbp, box, scores] = await Promise.all([
      getPlayByPlay(id),
      getBoxScore(id),
      getScoresNowLive().catch(() => null),
    ]);
    if (!pbp) {
      return Response.json({ error: "NHL data unavailable" }, { status: 502, headers: { "Cache-Control": "public, s-maxage=5" } });
    }
    const game = buildGame(pbp, box, { untilElapsed });
    const rivals = scores && untilElapsed == null ? atlanticGames(scores, game.id) : [];
    const radio = await getRadioForGame(game.gameDate);
    const maxAge = game.isFinal && untilElapsed == null ? 300 : 10;
    return Response.json(
      { game, rivals, radio },
      { headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` } },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "NHL data unavailable" },
      { status: 502, headers: { "Cache-Control": "public, s-maxage=5" } },
    );
  }
}
