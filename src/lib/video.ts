// Per-game video from NHL.com's content API (the one behind NHL.com's own video pages).
// Every video is tagged with its game id. Like the stats API it's public but undocumented,
// so failures come back as an empty list rather than an error.
import { cacheLife } from "next/cache";
import { nhlImage } from "./news";

const FORGE = "https://forge-dapi.d3.nhle.com/v2/content/en-us/videos";
const WEB = "https://api-web.nhle.com/v1";

export type VideoItem = { clipId: number; title: string; seconds: number | null; url?: string; thumb?: string | null };
// goalThumbs: a still for each goal clip (by clip id), since goals come from play-by-play.
export type GameVideo = { recaps: VideoItem[]; condensed: VideoItem[]; highlights: VideoItem[]; goalThumbs?: Record<string, string> };

type ForgeItem = {
  slug: string;
  title: string;
  contentDate?: string;
  fields?: { brightcoveId?: string; duration?: string; audioLanguage?: string };
  tags?: Array<{ slug: string }>;
  thumbnail?: { templateUrl?: string };
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function seconds(d?: string): number | null {
  if (!d) return null;
  const parts = d.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((t, n) => t * 60 + n, 0);
}

// "COL@OTT: Ullmark with a great save" -> "Ullmark with a great save"
function cleanTitle(t: string) {
  return t.replace(/^[A-Z]{2,3}@[A-Z]{2,3}:\s*/, "").replace(/\s+/g, " ").trim();
}

// Recaps come in versions: the Sens' own ("ott-created"), the league's (no "-created" tag),
// and sometimes the opponent's ("wsh-created", etc.).
function recapVersion(tags: string[]): { label: string; rank: number } {
  const created = tags.find((t) => /^[a-z]{3}-created$/.test(t));
  if (!created) return { label: "NHL version", rank: 1 };
  const team = created.slice(0, 3).toUpperCase();
  return team === "OTT" ? { label: "Sens version", rank: 0 } : { label: `${team} version`, rank: 2 };
}

export async function getGameVideo(gameId: string): Promise<GameVideo> {
  "use cache";
  cacheLife("frequent");

  const [forge, rail] = await Promise.all([
    fetchJson<{ items?: ForgeItem[] }>(`${FORGE}?tags.slug=gameid-${encodeURIComponent(gameId)}&limit=100`),
    fetchJson<{ gameVideo?: { threeMinRecap?: number; condensedGame?: number } }>(
      `${WEB}/gamecenter/${encodeURIComponent(gameId)}/right-rail`,
    ),
  ]);

  const recaps: Array<VideoItem & { label: string; rank: number }> = [];
  const condensed: VideoItem[] = [];
  const highlights: Array<VideoItem & { key: string; date: string }> = [];
  const seen = new Set<number>();
  const goalThumbs: Record<string, string> = {};

  for (const it of forge?.items ?? []) {
    const id = Number(it.fields?.brightcoveId);
    if (!id || seen.has(id)) continue;
    if (it.fields?.audioLanguage && it.fields.audioLanguage !== "en") continue;
    seen.add(id);
    const tags = (it.tags ?? []).map((t) => t.slug);
    const thumb = nhlImage(it.thumbnail);
    if (thumb && tags.includes("goal")) goalThumbs[String(id)] = thumb;
    const base = { clipId: id, seconds: seconds(it.fields?.duration), url: `https://www.nhl.com/video/${it.slug}`, thumb };

    if (tags.includes("condensed-game")) {
      condensed.push({ ...base, title: "Condensed game" });
    } else if (tags.includes("game-recap")) {
      recaps.push({ ...base, title: "Game recap", ...recapVersion(tags) });
    } else if (!tags.includes("goal")) {
      // Goals come from play-by-play (one clip per goal, in order); this keeps everything else.
      const title = cleanTitle(it.title);
      const key = title.toLowerCase();
      if (highlights.some((h) => h.key === key)) continue;
      highlights.push({ ...base, title, key, date: it.contentDate ?? "" });
    }
  }

  // Fall back to the ids the stats API lists if the content API had nothing.
  const gv = rail?.gameVideo;
  if (recaps.length === 0 && gv?.threeMinRecap) recaps.push({ clipId: gv.threeMinRecap, title: "Game recap", seconds: null, label: "", rank: 0 });
  if (condensed.length === 0 && gv?.condensedGame) condensed.push({ clipId: gv.condensedGame, title: "Condensed game", seconds: null });

  // Sens version first, then the league's, then the opponent's; only name versions when there's more than one.
  recaps.sort((a, b) => a.rank - b.rank);
  const named = recaps.map((r) => ({
    clipId: r.clipId,
    seconds: r.seconds,
    url: r.url,
    thumb: r.thumb,
    title: recaps.length > 1 && r.label ? `Game recap · ${r.label}` : r.title,
  }));

  return {
    recaps: named,
    condensed: condensed.slice(0, 1),
    highlights: highlights
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(({ clipId, title, seconds: s, url, thumb }) => ({ clipId, title, seconds: s, url, thumb })),
    goalThumbs,
  };
}
