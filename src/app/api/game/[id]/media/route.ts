import { getGameMedia, startTimeFor } from "@/lib/media";

// News, video and radio for one game; the live page polls this once a minute.
export async function GET(_request: Request, ctx: RouteContext<"/api/game/[id]/media">) {
  const { id } = await ctx.params;
  if (!/^\d{10}$/.test(id)) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }
  const start = await startTimeFor(id);
  if (!start) {
    return Response.json({ error: "Game not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } });
  }
  const media = await getGameMedia(id, start);
  return Response.json(media, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
