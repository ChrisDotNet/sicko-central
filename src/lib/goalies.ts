// Starting goalies for a Sens game, from Daily Faceoff's starting-goalies page
// (https://www.dailyfaceoff.com/starting-goalies), which tracks morning-skate reports
// from beat reporters. We read only each team's goalie name, how firm the report is
// (Confirmed, Likely, or Daily Faceoff's own projection) and who reported it, and credit
// and link Daily Faceoff wherever it shows. Never throws: no data means no card.
// The NHL doesn't name starters until puck drop; after that the game feed has them.
import { cacheLife } from "next/cache";
import { OTT } from "./teams";

export type GoalieStatus = "Confirmed" | "Likely" | "Projected";
export type GoalieCall = { name: string; status: GoalieStatus; source: string | null; updated: string | null };
export type StartingGoalies = {
  ott: GoalieCall | null;
  opp: GoalieCall | null;
  oppAbbrev: string;
  url: string;
};

const PAGE = "https://www.dailyfaceoff.com/starting-goalies";

type DfoGame = Record<string, unknown> & { homeTeamAbbreviation?: string; awayTeamAbbreviation?: string };

function call(g: DfoGame, side: "home" | "away"): GoalieCall | null {
  const name = g[`${side}GoalieName`];
  if (typeof name !== "string" || !name.trim()) return null;
  const strength = g[`${side}NewsStrengthName`];
  const source = g[`${side}NewsSourceName`];
  const updated = g[`${side}NewsCreatedAt`];
  return {
    name: name.trim(),
    status: strength === "Confirmed" ? "Confirmed" : strength === "Likely" ? "Likely" : "Projected",
    // Reporter credit only with a real report behind it.
    source: strength && typeof source === "string" && source.trim() ? source.trim() : null,
    updated: strength && typeof updated === "string" && !Number.isNaN(Date.parse(updated)) ? updated : null,
  };
}

// gameDate: the game's local date (YYYY-MM-DD), as the NHL schedule gives it.
// Re-read every 10 minutes: reports land through the morning skate and warm-up.
export async function getStartingGoalies(gameDate: string): Promise<StartingGoalies | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 600, expire: 3600 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameDate)) return null;
  const url = `${PAGE}/${gameDate}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (!json) return null;
    const games = (JSON.parse(json)?.props?.pageProps?.data ?? []) as DfoGame[];
    const g = games.find((x) => x.homeTeamAbbreviation === OTT || x.awayTeamAbbreviation === OTT);
    if (!g) return null;
    const ottSide = g.homeTeamAbbreviation === OTT ? "home" : "away";
    const oppSide = ottSide === "home" ? "away" : "home";
    return {
      ott: call(g, ottSide),
      opp: call(g, oppSide),
      oppAbbrev: String(g[`${oppSide}TeamAbbreviation`] ?? ""),
      url,
    };
  } catch {
    return null;
  }
}
