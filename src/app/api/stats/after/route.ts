import { connection } from "next/server";
import { getRace, getSensForm } from "@/lib/team-stats";

// After the final: the Sens record and streak (from the schedule) and the race (standings),
// for the Game page's "What tonight changed" card.
export async function GET() {
  await connection();
  const [form, race] = await Promise.all([getSensForm(), getRace()]);
  return Response.json({ form, race }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
