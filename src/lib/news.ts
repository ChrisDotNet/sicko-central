// Game-specific news from three outlets:
// - NHL.com: stories tagged with the game id (preview, projected lineups, recap). These stay
//   available for good.
// - TSN: the public NHL RSS feed, about two days deep. Kept if it mentions the Sens.
// - Sportsnet: the public NHL RSS feed, about three days deep. Each item lists the teams
//   it covers, so we keep the ones tagged OTT.
// TSN and Sportsnet items are matched to a game by when they were published. Because their
// feeds roll over within days, src/lib/media.ts saves what we find so older games keep it.
//
// We only show the headline and the short summary the outlet puts in its feed, and link to
// the full article on the outlet's site. Never the article body.
import { cacheLife } from "next/cache";
import type { ScheduleGame } from "./nhl";
import { getSchedule } from "./nhl";
import type { TsnVideo as PartnerVideo } from "./tsn-video";

const STORIES = "https://forge-dapi.d3.nhle.com/v2/content/en-us/stories";
const TSN_FEED = "https://www.tsn.ca/arc/outboundfeeds/rss/category/nhl/?outputType=xml";
const SN_FEED = "https://www.sportsnet.ca/hockey/nhl/feed/";

// An outside story counts toward a game if published from 24 h before puck drop to 20 h after.
const BEFORE_MS = 24 * 3600_000;
const AFTER_MS = 20 * 3600_000;
const SUMMARY_MAX = 220;

export type Outlet = "NHL.com" | "TSN" | "Sportsnet";

export type NewsItem = {
  url: string;
  outlet: Outlet;
  kind: string; // "Preview", "Recap", "Story", "Analysis"…
  title: string;
  summary: string | null;
  published: string; // ISO
  // The outlet's own thumbnail from its feed, loaded straight from the outlet (never copied).
  // Absent on items saved before thumbnails were added.
  image?: string | null;
};

const UA = { "User-Agent": "SickoCentral/0.1 (hobby fan site)" };

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}\\s*>`, "i"));
  return m ? decode(m[1]) : null;
}

function shorten(s: string | null | undefined): string | null {
  if (!s) return null;
  const clean = s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length <= SUMMARY_MAX) return clean;
  const cut = clean.slice(0, SUMMARY_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}

function iso(date: string | null): string | null {
  const t = Date.parse(date ?? "");
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// ---- Thumbnails ----

// NHL images come as a template; this size is 16:9 at about 480 px wide.
export function nhlImage(t?: { templateUrl?: string } | null): string | null {
  return t?.templateUrl ? t.templateUrl.replace("{formatInstructions}", "t_ratio16_9-size30") : null;
}

// The first image in an RSS item (media:content, else an image enclosure).
function feedImage(block: string): string | null {
  const m =
    block.match(/<media:content[^>]*\burl="([^"]+)"[^>]*>/i) ??
    block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i);
  if (!m) return null;
  const url = decode(m[1]);
  return url.startsWith("https://") ? url : null;
}

// TSN's image server resizes on request; ask for a thumbnail instead of the 2,000 px original.
function tsnThumb(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/([?&])width=\d+/, "$1width=480").replace(/([?&])height=\d+/, "$1height=270");
}

// ---- NHL.com ----

type Story = {
  slug: string;
  headline?: string;
  title?: string;
  summary?: string;
  contentDate?: string;
  context?: { slug?: string };
  tags?: Array<{ slug: string }>;
  thumbnail?: { templateUrl?: string };
};

export async function getNhlStories(gameId: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife("frequent");
  const raw = await fetchText(`${STORIES}?tags.slug=gameid-${encodeURIComponent(gameId)}&limit=50`);
  if (!raw) return [];
  let items: Story[] = [];
  try {
    items = (JSON.parse(raw) as { items?: Story[] }).items ?? [];
  } catch {
    return [];
  }
  const out: NewsItem[] = [];
  const seen = new Set<string>();
  // League versions first, so when the Sens post the same recap we keep the league's link.
  const sorted = [...items].sort((a, b) => Number(a.context?.slug !== "nhl") - Number(b.context?.slug !== "nhl"));
  for (const s of sorted) {
    const title = decode(s.headline ?? s.title ?? "");
    const published = iso(s.contentDate ?? null);
    if (!title || !published || !s.slug) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = (s.tags ?? []).map((t) => t.slug);
    const url = s.context?.slug === "nhl" ? `https://www.nhl.com/news/${s.slug}` : `https://www.nhl.com/senators/news/${s.slug}`;
    const kind = tags.includes("game-recap") ? "Recap" : tags.includes("game-preview") ? "Preview" : "Story";
    out.push({ url, outlet: "NHL.com", kind, title, summary: shorten(s.summary), published, image: nhlImage(s.thumbnail) });
  }
  return out;
}

// ---- TSN and Sportsnet ----

const SENS = /\b(senators|sens|ottawa)\b/i;

function parseTsn(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const title = tag(block, "title");
    const url = tag(block, "link");
    const published = iso(tag(block, "pubDate"));
    const summary = tag(block, "description");
    if (!title || !url || !published) continue;
    if (!SENS.test(title) && !SENS.test(summary ?? "")) continue;
    out.push({ url, outlet: "TSN", kind: "Story", title, summary: shorten(summary), published, image: tsnThumb(feedImage(block)) });
  }
  return out;
}

function snKind(categories: string[]): string {
  const c = categories.join(" ").toLowerCase();
  if (c.includes("recap")) return "Recap";
  if (c.includes("analysis")) return "Analysis";
  return "Story";
}

function parseSportsnet(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    // Articles only: the feed also carries video items and page collections.
    if (tag(block, "post_type") !== "sn-article") continue;
    const teams = [...block.matchAll(/<team[^>]*>([^<]+)<\/team>/gi)].map((m) => m[1].trim());
    const title = tag(block, "title");
    if (!title) continue;
    // League-wide pieces (power rankings) tag every team, so the OTT tag only counts on
    // stories about one or two teams; otherwise the headline has to name the Sens.
    const aboutOtt = teams.includes("OTT") && teams.length <= 2;
    if (!aboutOtt && !SENS.test(title)) continue;
    const url = tag(block, "link");
    const published = iso(tag(block, "pubDate"));
    if (!url || !published) continue;
    const categories = [...block.matchAll(/<category>([\s\S]*?)<\/category>/gi)].map((m) => decode(m[1]));
    out.push({
      url,
      outlet: "Sportsnet",
      kind: snKind(categories),
      title,
      summary: shorten(tag(block, "description")),
      published,
      image: feedImage(block),
    });
  }
  return out;
}

export async function getOutletNews(): Promise<NewsItem[]> {
  "use cache";
  cacheLife("frequent");
  const [tsn, sn] = await Promise.all([fetchText(TSN_FEED), fetchText(SN_FEED)]);
  return [...(tsn ? parseTsn(tsn) : []), ...(sn ? parseSportsnet(sn) : [])];
}

// ---- Matching outside stories to games ----

function oppName(g: ScheduleGame): string | null {
  const opp = g.homeTeam.abbrev === "OTT" ? g.awayTeam : g.homeTeam;
  return opp.commonName?.default ?? null;
}

// Pick the game a story belongs to: games whose window covers its publish time; if two
// do (back-to-back nights), the one whose opponent it names, otherwise the closer one,
// leaning toward the game just played.
export function assignGame(item: NewsItem, games: ScheduleGame[]): number | null {
  const at = Date.parse(item.published);
  const candidates = games.filter((g) => {
    const start = Date.parse(g.startTimeUTC);
    return at >= start - BEFORE_MS && at <= start + AFTER_MS;
  });
  if (candidates.length <= 1) return candidates[0]?.id ?? null;
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const named = candidates.filter((g) => {
    const n = oppName(g);
    return n ? text.includes(n.toLowerCase()) : false;
  });
  if (named.length === 1) return named[0].id;
  const pool = named.length ? named : candidates;
  const score = (g: ScheduleGame) => {
    const d = at - Date.parse(g.startTimeUTC);
    return d >= 0 ? d / 2 : -d;
  };
  return pool.reduce((best, g) => (score(g) < score(best) ? g : best)).id;
}

// Everything we can find right now for one game, newest first.
export async function getNewsForGame(gameId: string): Promise<NewsItem[]> {
  const [nhl, outlets, schedule] = await Promise.all([getNhlStories(gameId), getOutletNews(), getSchedule()]);
  const games = (schedule?.games ?? []).filter((g) => g.gameType >= 2);
  const id = Number(gameId);
  const mine = outlets.filter((n) => assignGame(n, games) === id);
  return sortNews(mergeNews([...nhl, ...mine]));
}

export function mergeNews(items: NewsItem[]): NewsItem[] {
  const byUrl = new Map<string, NewsItem>();
  for (const n of items) if (!byUrl.has(n.url)) byUrl.set(n.url, n);
  return [...byUrl.values()];
}

export function sortNews(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.published.localeCompare(a.published));
}

// ---- Sportsnet video ----
// Sportsnet's feed lists its videos alongside stories (Brightcove clips, tagged by team).
// They play in Sportsnet's own Brightcove player, embedded; we never copy the video.
const SN_PLAYER = "https://players.brightcove.net/1704050871/JCdte3tMv_default/index.html";

function parseSportsnetVideos(xml: string): PartnerVideo[] {
  const out: PartnerVideo[] = [];
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    if (tag(block, "post_type") !== "bc-video") continue;
    const teams = [...block.matchAll(/<team[^>]*>([^<]+)<\/team>/gi)].map((m) => m[1].trim());
    const title = tag(block, "title");
    if (!title) continue;
    if (!(teams.includes("OTT") && teams.length <= 2) && !SENS.test(title)) continue;
    const id = block.match(/<brightcove id="(\d+)"/)?.[1];
    const url = tag(block, "link");
    const published = iso(tag(block, "pubDate"));
    if (!id || !url || !published) continue;
    const ms = Number(block.match(/<content duration="(\d+)"/)?.[1] ?? 0);
    out.push({
      id,
      title,
      summary: shorten(tag(block, "description")),
      seconds: ms ? Math.round(ms / 1000) : null,
      thumb: feedImage(block),
      url,
      embedUrl: `${SN_PLAYER}?videoId=${id}`,
      published,
      expires: null,
    });
  }
  return out;
}

async function getSportsnetVideos(): Promise<PartnerVideo[]> {
  "use cache";
  cacheLife("frequent");
  const xml = await fetchText(SN_FEED);
  return xml ? parseSportsnetVideos(xml) : [];
}

// Sportsnet videos for one game, matched by publish time like the stories, newest first.
export async function getSportsnetVideosForGame(gameId: string): Promise<PartnerVideo[]> {
  const [videos, schedule] = await Promise.all([getSportsnetVideos(), getSchedule()]);
  const games = (schedule?.games ?? []).filter((g) => g.gameType >= 2);
  const id = Number(gameId);
  return videos
    .filter((v) => assignGame({ url: v.url, outlet: "Sportsnet", kind: "Video", title: v.title, summary: v.summary, published: v.published }, games) === id)
    .sort((a, b) => b.published.localeCompare(a.published));
}
