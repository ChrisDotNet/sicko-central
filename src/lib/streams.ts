// Game-specific streaming pages, so a network chip opens the game itself rather than the
// service's front page:
// - TSN+ (TSN networks): TSN's "NHL - Live & upcoming" collection, the list its Live page
//   is built from (about the next two weeks). Event pages live at
//   tsn.ca/live/event/nhl-live-upcoming/<id>/.
// - Sportsnet+ (SN networks): Sportsnet+'s "Live & Upcoming" NHL list (about the next week),
//   the English broadcast for the game. Event pages live at watch.sportsnet.ca/event/<slug>.
// Both are the lists those sites' own pages read; neither is a published API, so anything
// missing or changed just leaves the service's general link in place.
// Games are matched by puck drop (within two hours) and an Ottawa title; there's only ever
// one Sens game at a time.
import { cacheLife } from "next/cache";

const TSN_LIST =
  "https://www.tsn.ca/pf/api/v3/content/fetch/papi-arcxp?query=" +
  encodeURIComponent(JSON.stringify({ brand: "tsn", endpoint: "collection", collection: "nhl-live-upcoming", papiLiveFeed: true })) +
  "&_website=tsn";
const SN_LIST = (page: number) => `https://production-cdn.d3-rgr-diva.com/api/lists/208238?page=${page}&page_size=24`;
const UA = { "User-Agent": "SickoCentral/0.1 (hobby fan site)" };
const WINDOW_MS = 2 * 3600_000;

export type StreamEvent = { start: string; href: string };
export type StreamEvents = { tsn: StreamEvent[]; sportsnet: StreamEvent[] };

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type TsnCollection = { content_elements?: Array<{ _id?: string; display_date?: string; headlines?: { basic?: string } }> };
type SnList = { items?: Array<{ path?: string; title?: string; eventStartDate?: string; type?: string }>; paging?: { next?: string } };

// Re-read every half hour: events are added as broadcasts are scheduled.
export async function getStreamEvents(): Promise<StreamEvents> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 1800, expire: 86400 });
  const [tsn, ...sn] = await Promise.all([getJson<TsnCollection>(TSN_LIST), ...[1, 2, 3].map((p) => getJson<SnList>(SN_LIST(p)))]);
  const tsnEvents: StreamEvent[] = (tsn?.content_elements ?? [])
    .filter((e) => e._id && /^GRNT[0-9a-f]+$/.test(e._id) && e.display_date && /Ottawa Senators/.test(e.headlines?.basic ?? ""))
    .map((e) => ({ start: e.display_date!, href: `https://www.tsn.ca/live/event/nhl-live-upcoming/${e._id}/` }));
  const snEvents: StreamEvent[] = sn
    .flatMap((l) => l?.items ?? [])
    .filter((i) => i.type === "event" && i.eventStartDate && i.path?.startsWith("/event/") && /Ottawa/.test(i.title ?? "") && !/French Language/i.test(i.title ?? ""))
    .map((i) => ({ start: i.eventStartDate!, href: `https://watch.sportsnet.ca${i.path}` }));
  return { tsn: tsnEvents, sportsnet: snEvents };
}

function near(events: StreamEvent[], startTimeUTC: string): string | undefined {
  const t = Date.parse(startTimeUTC);
  return events.find((e) => Math.abs(Date.parse(e.start) - t) <= WINDOW_MS)?.href;
}

// Network -> the game's own page, for the networks we can find one for.
export function streamLinks(startTimeUTC: string, networks: string[], events: StreamEvents): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of networks) {
    const href = /^TSN/i.test(n) ? near(events.tsn, startTimeUTC) : /^(SN|SPORTSNET)/i.test(n) ? near(events.sportsnet, startTimeUTC) : undefined;
    if (href) out[n] = href;
  }
  return out;
}

// Add each upcoming or live game's streaming pages to the schedule list.
export function withStreams<T extends { startTimeUTC: string; broadcasts: string[]; state: string }>(games: T[], events: StreamEvents): Array<T & { streams?: Record<string, string> }> {
  return games.map((g) => (g.state === "final" ? g : { ...g, streams: streamLinks(g.startTimeUTC, g.broadcasts, events) }));
}
