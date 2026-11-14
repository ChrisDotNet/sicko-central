import { connection } from "next/server";
import { pushEnabled, subscriberCount } from "@/lib/push";
import { DAILY_BUDGET, qstashEnabled, usedToday } from "@/lib/qstash";

// How notifications are doing today: QStash messages used against our cap (the free plan
// allows 1,000 a day), and how many phones are signed up. No personal details.
export async function GET() {
  await connection();
  const [used, phones] = await Promise.all([usedToday(), subscriberCount()]);
  return Response.json(
    {
      push: pushEnabled,
      scheduling: qstashEnabled ? "on" : process.env.NOTIFY_PAUSED === "1" ? "paused" : "not set up",
      qstashToday: { used, cap: DAILY_BUDGET, planLimit: 1000 },
      phones,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
