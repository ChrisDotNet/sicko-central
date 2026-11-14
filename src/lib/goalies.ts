// Starting goalies for a Sens game, from NHL.com's game preview (the same NHL content feed
// the news uses). Each preview, posted the day of the game, has a projected lineup for both
// teams with the expected starter listed first among the goalies, and a "Status report"
// that says when a starter has been announced ("Ullmark will start"). The NHL itself only
// names starters at puck drop; after that the game feed has them.
// Never throws: no preview yet means no card.
import { cacheLife } from "next/cache";

export type GoalieStatus = "Confirmed" | "Likely" | "Projected";
export type GoalieCall = { name: string; status: GoalieStatus; backup: string | null };
export type StartingGoalies = {
  ott: GoalieCall | null;
  opp: GoalieCall | null;
  oppAbbrev: string;
  url: string; // the preview on NHL.com
  posted: string; // ISO
  headline: string; // the preview's headline ("Senators at Penguins projected lineups")
};

const STORIES = "https://forge-dapi.d3.nhle.com/v2/content/en-us/stories";
const UA = { "User-Agent": "SickoCentral/0.1 (hobby fan site)" };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Story = { slug?: string; title?: string; headline?: string; contentDate?: string; parts?: { content?: unknown }[] };

function storyText(s: Story): string {
  const html = (s.parts ?? []).map((p) => (typeof p.content === "string" ? p.content : "")).join("\n");
  return html
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[*_]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

// The goalies in one team's projected lineup: single names (skater lines use "--"),
// before the scratches and injuries.
function lineupGoalies(text: string, teamWord: string): string[] | null {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^${teamWord} projected lineup$`, "i").test(l));
  if (start < 0) return null;
  const goalies: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/projected lineup$|^status report$/i.test(l) || /^(scratched|injured|suspended)\b/i.test(l)) break;
    if (!l.includes("--") && /^[\p{L}.'’ -]{3,40}$/u.test(l)) goalies.push(l);
  }
  return goalies.length ? goalies : null;
}

function statusFor(name: string, report: string): GoalieStatus {
  const last = name.split(" ").slice(-1)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const near = (words: string) => new RegExp(`\\b${last}\\b[^.]{0,60}\\b(${words})\\b`, "i").test(report);
  if (near("will start|will be in goal|gets the start|will make (his|the) .{0,20}start")) return "Confirmed";
  if (near("is expected to start|expected to start|is likely to start|likely to start|should start|projected to start")) return "Likely";
  return "Projected";
}

function call(text: string, report: string, teamWord: string): GoalieCall | null {
  const g = lineupGoalies(text, teamWord);
  if (!g) return null;
  return { name: g[0], status: statusFor(g[0], report), backup: g[1] ?? null };
}

// Re-read every 10 minutes: previews are posted and updated through game day.
export async function getStartingGoalies(gameId: string, oppAbbrev: string): Promise<StartingGoalies | null> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 600, expire: 3600 });
  if (!/^\d{10}$/.test(gameId)) return null;
  const list = await getJson<{ items?: Story[] }>(`${STORIES}?tags.slug=gameid-${gameId}&limit=50`);
  const preview = (list?.items ?? [])
    .filter((s) => s.slug && /game preview/i.test(s.title ?? ""))
    .sort((a, b) => (b.contentDate ?? "").localeCompare(a.contentDate ?? ""))[0];
  if (!preview?.slug) return null;
  const story = await getJson<Story>(`${STORIES}/${encodeURIComponent(preview.slug)}`);
  if (!story) return null;
  const text = storyText(story);
  const lines = text.split("\n");
  const r = lines.findIndex((l) => /^status report$/i.test(l));
  const report = r >= 0 ? lines.slice(r + 1, r + 6).join(" ") : "";
  // The other lineup heading is the opponent's ("Penguins projected lineup").
  const oppWord = lines.map((l) => l.match(/^(.+) projected lineup$/i)?.[1]).find((w) => w && !/^senators$/i.test(w));
  const ott = call(text, report, "Senators");
  const opp = oppWord ? call(text, report, oppWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : null;
  if (!ott && !opp) return null;
  return {
    ott,
    opp,
    oppAbbrev,
    url: `https://www.nhl.com/news/${preview.slug}`,
    posted: preview.contentDate ?? story.contentDate ?? "",
    headline: (story.headline ?? preview.headline ?? story.title ?? preview.title ?? "Game preview").trim(),
  };
}
