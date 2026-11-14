// Sens TV: the club's own YouTube channel (youtube.com/@OttawaSenatorsNHL), through the
// YouTube Data API (free key in YOUTUBE_API_KEY; about 200 quota units a day of 10,000).
// YouTube's per-channel RSS feeds no longer answer requests from servers.
// - Videos about a game (press conferences, morning skate, pre- and post-game) go in that
//   game's Media > Video tab and play in the page (src/components/video/YouTubePlayer.tsx).
// - All of them go in Sens News, like articles, opening on YouTube.
// Long-form uploads only (YouTube's "UULF" list for the channel): no Shorts, no past live streams.
// Never throws: no key or no answer means no videos.
import { cacheLife } from "next/cache";
import { assignGame } from "./news";
import type { NewsItem } from "./news";
import type { ScheduleGame } from "./nhl";

const CHANNEL = "UCtgGJaIlIzYE2Ney_P2ps9w";
const LONG_FORM = `UULF${CHANNEL.slice(2)}`;
const API = "https://www.googleapis.com/youtube/v3";

export type SensTvVideo = {
  id: string; // YouTube video id
  title: string;
  summary: string | null;
  seconds: number | null;
  thumb: string | null;
  published: string; // ISO
  url: string;
  embeddable?: boolean; // false when the club doesn't allow playing it on other sites
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// "PT1M5S" -> 65
function isoSeconds(d?: string): number | null {
  const m = d?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) || null;
}

function shorten(s?: string): string | null {
  const clean = (s ?? "").split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 220 ? `${clean.slice(0, clean.lastIndexOf(" ", 220))}…` : clean;
}

type PlaylistItems = {
  items?: Array<{
    snippet?: { title?: string; description?: string; thumbnails?: Record<string, { url?: string }> };
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
  }>;
};
type Videos = { items?: Array<{ id?: string; contentDetails?: { duration?: string }; status?: { embeddable?: boolean } }> };

// The channel's 50 newest long-form videos, newest first. Re-read every 15 minutes.
export async function getSensTv(): Promise<SensTvVideo[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const list = await getJson<PlaylistItems>(`${API}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${LONG_FORM}&key=${key}`);
  const items = (list?.items ?? []).filter((i) => i.contentDetails?.videoId && i.contentDetails.videoPublishedAt && i.snippet?.title && i.snippet.title !== "Private video");
  if (!items.length) return [];
  const ids = items.map((i) => i.contentDetails!.videoId!).join(",");
  const details = await getJson<Videos>(`${API}/videos?part=contentDetails,status&id=${ids}&key=${key}`);
  const seconds = new Map((details?.items ?? []).map((v) => [v.id, isoSeconds(v.contentDetails?.duration)]));
  const embeddable = new Map((details?.items ?? []).map((v) => [v.id, v.status?.embeddable !== false]));
  return items
    .map((i) => {
      const id = i.contentDetails!.videoId!;
      const t = i.snippet?.thumbnails ?? {};
      return {
        id,
        title: i.snippet!.title!.trim(),
        summary: shorten(i.snippet?.description),
        seconds: seconds.get(id) ?? null,
        thumb: t.medium?.url ?? t.high?.url ?? t.default?.url ?? null,
        published: new Date(i.contentDetails!.videoPublishedAt!).toISOString(),
        url: `https://www.youtube.com/watch?v=${id}`,
        embeddable: embeddable.get(id) ?? true,
      };
    })
    .sort((a, b) => b.published.localeCompare(a.published));
}

// Titles that mark a video as being about a game.
const GAME_CUE = /\b(post-?game|pre-?game|morning skate|media availability|game ?day|press conference|warm-?ups?|highlights|reacts?|after the (win|loss))\b/i;

// The game a video is about: published in the game's window (as for news) and either
// worded like game coverage or naming the opponent. Otherwise null.
export function gameForVideo(v: SensTvVideo, games: ScheduleGame[]): number | null {
  const id = assignGame(asNews(v), games);
  if (!id) return null;
  const g = games.find((x) => x.id === id);
  const opp = g ? (g.homeTeam.abbrev === "OTT" ? g.awayTeam : g.homeTeam) : null;
  const names = [opp?.commonName?.default, opp?.placeName?.default].filter((n): n is string => !!n);
  const named = names.some((n) => v.title.toLowerCase().includes(n.toLowerCase()));
  return GAME_CUE.test(v.title) || named ? id : null;
}

function length(sec: number | null) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// A video as a news item (Sens News lists them like articles).
export function asNews(v: SensTvVideo): NewsItem {
  return {
    url: v.url,
    outlet: "Sens TV",
    kind: v.seconds ? `Video · ${length(v.seconds)}` : "Video",
    title: v.title,
    summary: v.summary,
    published: v.published,
    image: v.thumb,
  };
}
