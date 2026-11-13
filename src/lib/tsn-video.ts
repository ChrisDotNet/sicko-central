// TSN video for a game: interviews, analysis and TSN's own highlights.
// TSN has no video feed, but the Sens stories we already collect (src/lib/news.ts) link to
// their videos, and each TSN video page publishes standard video details (schema.org
// VideoObject), including an official embed address for Bell Media's player. We read those
// details and play the video in TSN's own player, ads and all; we never copy the video.
// TSN videos expire (about a month after posting), so each one carries its end date.
import { cacheLife } from "next/cache";

export type TsnVideo = {
  id: string; // Bell Media content id
  title: string;
  summary: string | null;
  seconds: number | null;
  thumb: string | null;
  url: string; // the video's page on tsn.ca
  embedUrl: string;
  published: string; // ISO
  expires: string | null; // ISO
};

const UA = { "User-Agent": "SickoCentral/0.1 (hobby fan site)" };
const SENS = /\b(senators|sens|ottawa)\b/i;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

// "PT0H2M57S" -> 177
function isoSeconds(d?: string): number | null {
  const m = d?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const s = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return s || null;
}

// Links to TSN NHL video pages inside an article.
function videoLinks(html: string): string[] {
  const paths = new Set(html.match(/\/nhl\/video\/20\d\d\/\d\d\/\d\d\/[a-z0-9-]+\/?/g) ?? []);
  return [...paths].map((p) => `https://www.tsn.ca${p.endsWith("/") ? p : `${p}/`}`);
}

type VideoObject = {
  "@type"?: string;
  name?: string;
  description?: string;
  uploadDate?: string;
  duration?: string;
  embedUrl?: string;
  thumbnailUrl?: string | string[];
  contentUrl?: string;
};

// One video page's published details. Cached for a day: they don't change once posted.
async function getVideoPage(url: string): Promise<TsnVideo | null> {
  "use cache";
  cacheLife("daily");
  const html = await fetchText(url);
  if (!html) return null;
  let v: VideoObject | null = null;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]) as VideoObject;
      if (d["@type"] === "VideoObject" && d.embedUrl) {
        v = d;
        break;
      }
    } catch {
      /* not this one */
    }
  }
  if (!v?.embedUrl || !/^https:\/\/embed\.jasperplayer\.com\//.test(v.embedUrl)) return null;
  const id = new URL(v.embedUrl).searchParams.get("contentId");
  if (!id) return null;
  // The end date sits with the video's other properties in the page data.
  const at = html.indexOf(`"axisId":"${id}"`);
  const end = at >= 0 ? html.slice(at, at + 4000).match(/"publicationEndDate":"([^"]+)"/)?.[1] : undefined;
  const published = v.uploadDate && !Number.isNaN(Date.parse(v.uploadDate)) ? new Date(v.uploadDate).toISOString() : null;
  if (!published) return null;
  const thumb = Array.isArray(v.thumbnailUrl) ? v.thumbnailUrl[0] : v.thumbnailUrl;
  const summary = v.description?.replace(/\s+/g, " ").trim() || null;
  return {
    id,
    title: (v.name ?? "").replace(/\s+/g, " ").trim(),
    summary: summary && summary.length > 220 ? `${summary.slice(0, summary.lastIndexOf(" ", 220))}…` : summary,
    seconds: isoSeconds(v.duration),
    thumb: thumb?.startsWith("https://") ? thumb : null,
    url: v.contentUrl ?? url,
    embedUrl: v.embedUrl,
    published,
    expires: end && !Number.isNaN(Date.parse(end)) ? new Date(end).toISOString() : null,
  };
}

// The video pages an article links to. Re-read hourly: TSN often adds video to a story later.
async function getArticleVideoLinks(articleUrl: string): Promise<string[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  const html = await fetchText(articleUrl);
  return html ? videoLinks(html) : [];
}

// TSN videos about the Sens linked from these TSN stories, newest first.
export async function getTsnVideos(articleUrls: string[]): Promise<TsnVideo[]> {
  const tsn = articleUrls.filter((u) => u.startsWith("https://www.tsn.ca/"));
  const links = [...new Set((await Promise.all(tsn.map(getArticleVideoLinks))).flat())].slice(0, 12);
  const videos = (await Promise.all(links.map(getVideoPage))).filter((v): v is TsnVideo => v != null);
  const byId = new Map<string, TsnVideo>();
  for (const v of videos) {
    if (!byId.has(v.id) && SENS.test(`${v.title} ${v.summary ?? ""}`)) byId.set(v.id, v);
  }
  return [...byId.values()].sort((a, b) => b.published.localeCompare(a.published));
}
