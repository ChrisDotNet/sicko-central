import { getStartingGoalies } from "@/lib/goalies";

// Starting goalies for a Sens game (?game=<id>&opp=<abbrev>), for the game page to refresh
// before puck drop.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const opp = q.get("opp") ?? "";
  const goalies = /^[A-Z]{3}$/.test(opp) ? await getStartingGoalies(q.get("game") ?? "", opp) : null;
  return Response.json(goalies, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
