// TSN 1200's public "Ottawa Senators Hockey" podcast feed. TSN posts the pre-game show,
// each period of the radio call, and the post-game show as separate episodes shortly after
// they air. Episodes play from TSN's own podcast host; we only read the feed.
//
// Episodes are matched to a game by when they were published (within hours of puck drop),
// not by the date in the title: TSN's titles are inconsistent ("November 4th", a Nov 10
// game titled "November 11", "Period 3" vs "3rd Period", the odd typo).
import { cacheLife } from "next/cache";

const FEED =
  "https://www.omnycontent.com/d/playlist/4809bc8a-e41a-405c-93da-a8cf011df2f4/55f979d0-d756-40d5-a69c-b19d0168c78c/67719d98-a973-4f72-afe0-b19d0169028e/podcast.rss";
// The feed returns the newest 100 episodes (about two weeks) unless asked for more.
// 1000 reaches back about a year; it's a 2+ MB file, so it's only read for older games.
const ARCHIVE = `${FEED}?pageSize=1000`;

// Episodes count toward a game if published between 2 h before and 8 h after puck drop.
const WINDOW_BEFORE_MS = 2 * 3600_000;
const WINDOW_AFTER_MS = 8 * 3600_000;

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

type FeedEpisode = RadioEpisode & { published: number };

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

// Work out what an episode is from its title; null for anything that isn't part of a game
// broadcast (interview clips, segments).
function classify(title: string): Pick<RadioEpisode, "kind" | "order" | "label"> | null {
  const t = title.toLowerCase();
  if (/pre-?game/.test(t)) return { kind: "pregame", order: 0, label: "Pre-game show" };
  if (/post-?game/.test(t)) return { kind: "postgame", order: 9, label: "Post-game show" };
  if (/overtime|\bot\b/.test(t) && /per|overtime/.test(t)) return { kind: "period", order: 4, label: "Overtime" };
  const p = t.match(/\b([123])(?:st|nd|rd|th)?[a-z]?\s*per/) ?? t.match(/period\s*([123])\b/);
  if (p) {
    const n = Number(p[1]);
    return { kind: "period", order: n, label: `${["1st", "2nd", "3rd"][n - 1]} period` };
  }
  return null;
}

function parse(xml: string): FeedEpisode[] {
  const out: FeedEpisode[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const rawTitle = tag(block, "title");
    const url = block.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1];
    const published = Date.parse(tag(block, "pubDate") ?? "");
    if (!rawTitle || !url || Number.isNaN(published)) continue;
    const title = decode(rawTitle);
    const kind = classify(title);
    if (!kind) continue;
    out.push({
      id: tag(block, "guid") ?? url,
      title,
      url: decode(url),
      seconds: duration(tag(block, "itunes:duration")),
      published,
      ...kind,
    });
  }
  return out;
}

// Never throw from a cached function (it would fail the build); no feed means no episodes.
async function readFeed(url: string, timeoutMs: number): Promise<FeedEpisode[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return [];
    return parse(await res.text());
  } catch {
    return [];
  }
}

// Recent episodes: small and refreshed every minute, so tonight's periods show up quickly.
async function getRecentEpisodes(): Promise<FeedEpisode[]> {
  "use cache";
  cacheLife("frequent");
  return readFeed(FEED, 10_000);
}

// The full archive, trimmed to game episodes: refreshed hourly, used for older games.
async function getArchiveEpisodes(): Promise<FeedEpisode[]> {
  "use cache";
  cacheLife("daily");
  return readFeed(ARCHIVE, 30_000);
}

const PERIOD_LABELS = ["1st period", "2nd period", "3rd period", "Overtime"];

function forGame(episodes: FeedEpisode[], start: number): RadioEpisode[] {
  const inWindow = episodes.filter((e) => e.published >= start - WINDOW_BEFORE_MS && e.published <= start + WINDOW_AFTER_MS);

  // Pre-game and post-game: one each; keep the latest if TSN reposted one.
  const shows = new Map<RadioKind, FeedEpisode>();
  for (const e of inWindow) {
    if (e.kind === "period") continue;
    const prev = shows.get(e.kind);
    if (!prev || e.published > prev.published) shows.set(e.kind, e);
  }

  // Periods: trust the title's period number unless titles repeat (TSN once titled all three
  // periods "1st Period"); then label them in the order they were posted, which is game order.
  const periods = inWindow.filter((e) => e.kind === "period").sort((a, b) => a.published - b.published);
  const numbers = periods.map((e) => e.order);
  const repeated = new Set(numbers).size !== numbers.length;
  const labelled = periods.map((e, i) =>
    repeated ? { ...e, order: Math.min(i + 1, 4), label: PERIOD_LABELS[Math.min(i, 3)] } : e,
  );

  return [...shows.values(), ...labelled]
    .sort((a, b) => a.order - b.order)
    .map((e) => ({ id: e.id, title: e.title, label: e.label, kind: e.kind, order: e.order, url: e.url, seconds: e.seconds }));
}

export async function getRadioForGame(startTimeUTC: string): Promise<RadioEpisode[]> {
  const start = Date.parse(startTimeUTC);
  if (Number.isNaN(start)) return [];
  const recent = await getRecentEpisodes();
  // The recent feed only covers about two weeks. Use it when it reaches back past this
  // game's window (or the feed is the full story for a game happening now); otherwise
  // look the game up in the archive.
  const oldest = recent.length ? Math.min(...recent.map((e) => e.published)) : Infinity;
  if (oldest <= start - WINDOW_BEFORE_MS) return forGame(recent, start);
  return forGame(await getArchiveEpisodes(), start);
}
