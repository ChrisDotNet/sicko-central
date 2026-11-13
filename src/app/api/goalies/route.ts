import { getStartingGoalies } from "@/lib/goalies";

// Starting goalies for the Sens game on a date (YYYY-MM-DD), for the game page to refresh
// before puck drop.
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  const goalies = await getStartingGoalies(date);
  return Response.json(goalies, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
