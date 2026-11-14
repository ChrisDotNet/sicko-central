// All Sens news, not just game days: every Senators story on NHL.com (league and club),
// TSN's and Sportsnet's stories about the Sens, and the club's YouTube videos (Sens TV). Same rule as game news: headline, the
// outlet's short summary and its thumbnail, linking to the full article on its site.
// No paywalled outlets.
//
// The feeds only reach back a few days, so the list is saved (Neon, key "news:sens") and
// merged with what's live, keeping the newest 150 stories. Written only when something
// new turns up.
import { cacheLife } from "next/cache";
import { assignGame, getNhlTeamStories, getOutletNews, sortNews } from "./news";
import type { NewsItem } from "./news";
import { getSchedule } from "./nhl";
import { getJson, setJson } from "./store";
import { asNews, gameForVideo, getSensTv, isFrench } from "./sens-tv";

const KEY = "news:sens";
const KEEP = 150;

// Same headline from two places (the league's and the club's copy of a recap): keep one.
function dedupe(items: NewsItem[]): NewsItem[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: NewsItem[] = [];
  for (const n of items) {
    const t = `${n.outlet}:${n.title.toLowerCase()}`;
    if (seenUrl.has(n.url) || seenTitle.has(t)) continue;
    seenUrl.add(n.url);
    seenTitle.add(t);
    out.push(n);
  }
  return out;
}

// Read the sources, merge with what's saved, save if anything is new. Not cached: the
// daily collection job calls this directly.
export async function collectSensNews(): Promise<NewsItem[]> {
  const [nhl, outlets, schedule, saved, videos] = await Promise.all([
    getNhlTeamStories(),
    getOutletNews(),
    getSchedule(),
    getJson<NewsItem[]>(KEY),
    getSensTv(),
  ]);
  const games = (schedule?.games ?? []).filter((g) => g.gameType >= 2);
  const tagged = outlets.map((n) => {
    const id = assignGame(n, games);
    return id ? { ...n, gameId: id } : n;
  });
  // Live versions first, so a story's newest details win over the saved copy.
  const tv = videos.map((v) => {
    const id = gameForVideo(v, games);
    return id ? { ...asNews(v), gameId: id } : asNews(v);
  });
  // Saved copies of French Sens TV videos (from before they were left out) are dropped too.
  const kept = (saved ?? []).filter((n) => !(n.outlet === "Sens TV" && isFrench(n.title)));
  const merged = sortNews(dedupe([...nhl, ...tagged, ...tv, ...kept])).slice(0, KEEP);
  if (merged.length && JSON.stringify(merged) !== JSON.stringify(saved)) await setJson(KEY, merged);
  return merged;
}

// For pages: cached for a minute, so the store is read about once a minute however many
// people are looking.
export async function getSensNews(): Promise<NewsItem[]> {
  "use cache";
  cacheLife("frequent");
  return collectSensNews();
}
