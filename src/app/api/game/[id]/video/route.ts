import { getGameVideo } from "@/lib/video";

// Per-game video list for the live page's Video tab, polled while the tab is open.
export async function GET(_request: Request, ctx: RouteContext<"/api/game/[id]/video">) {
  const { id } = await ctx.params;
  if (!/^\d{10}$/.test(id)) {
    return Response.json({ error: "Invalid game id" }, { status: 400 });
  }
  const video = await getGameVideo(id);
  return Response.json(video, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
