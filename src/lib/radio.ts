// TSN 1200's public "Ottawa Senators Hockey" podcast feed. TSN posts the pre-game show,
// each period of the radio call, and the post-game show as separate episodes shortly after
// they air. Episodes play from TSN's own podcast host; we only read the feed.
import { cacheLife } from "next/cache";

const FEED =
  "https://www.omnycontent.com/d/playlist/4809bc8a-e41a-405c-93da-a8cf011df2f4/55f979d0-d756-40d5-a69c-b19d0168c78c/67719d98-a973-4f72-afe0-b19d0169028e/podcast.rss";

export type RadioKind = "pregame" | "period" | "postgame";

export type RadioEpisode = {
  id: string;
  title: string;
  label: string;
  kind: RadioKind;
  order: number;
  url: string;
  seconds: number | null;
};

type FeedItem = { title: string; url: string; seconds: number | null; guid: string };

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function duration(v: string | null): number | null {
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v);
  const parts = v.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((t, n) => t * 60 + n, 0);
}

async function getFeedItems(): Promise<FeedItem[]> {
  "use cache";
  cacheLife("frequent");
  const res = await fetch(FEED, { cache: "no-store", headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" } });
  if (!res.ok) throw new Error(`Radio feed ${res.status}`);
  const xml = await res.text();
  const items: FeedItem[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const title = tag(block, "title");
    const url = block.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1];
    if (!title || !url) continue;
    items.push({
      title: decode(title),
      url: decode(url),
      seconds: duration(tag(block, "itunes:duration")),
      guid: tag(block, "guid") ?? url,
    });
  }
  return items;
}

// Game dates are "YYYY-MM-DD"; episode titles carry "November 12, 2026".
function titleDate(gameDate: string): string {
  const [y, m, d] = gameDate.split("-").map(Number);
  const month = new Intl.DateTimeFormat("en-CA", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  return `${month} ${d}, ${y}`;
}

export async function getRadioForGame(gameDate: string): Promise<RadioEpisode[]> {
  let items: FeedItem[];
  try {
    items = await getFeedItems();
  } catch {
    return [];
  }
  const date = titleDate(gameDate);
  const out: RadioEpisode[] = [];
  for (const it of items) {
    if (!it.title.includes(date)) continue;
    const t = it.title.toLowerCase();
    let kind: RadioKind | null = null;
    let order = 0;
    let label = "";
    if (t.includes("pregame") || t.includes("pre-game")) {
      kind = "pregame";
      label = "Pre-game show";
    } else if (t.includes("postgame") || t.includes("post-game")) {
      kind = "postgame";
      order = 9;
      label = "Post-game show";
    } else {
      const p = t.match(/(1st|2nd|3rd) period/) ?? (t.includes("overtime") ? ["overtime", "OT"] : null);
      if (p) {
        kind = "period";
        order = p[1] === "1st" ? 1 : p[1] === "2nd" ? 2 : p[1] === "3rd" ? 3 : 4;
        label = order === 4 ? "Overtime" : `${p[1]} period`;
      }
    }
    if (!kind) continue;
    out.push({ id: it.guid, title: it.title, label, kind, order, url: it.url, seconds: it.seconds });
  }
  return out.sort((a, b) => a.order - b.order);
}
