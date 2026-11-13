// Ticket links for Sens games.
// - Ticketmaster: the NHL schedule carries each game's Ticketmaster event link (the official
//   seller for both teams), so there's nothing to look up.
// - Gametime (resale): Gametime's own event search, the one its app and site use, lists every
//   upcoming Sens game with its event page. Matched to our games by puck-drop time. It isn't a
//   published API, so if it changes we fall back to Gametime's Senators page.
// Plain links for now; Gametime affiliate links would need a paid Vercel plan (commercial use).
import { cacheLife } from "next/cache";

const GT_SEARCH = "https://mobile.gametime.co/v1/search?q=ottawa%20senators&per_page=60";
export const GAMETIME_SENS = "https://gametime.co/ottawa-senators-tickets/performers/nhlott";

type GtEvent = { event?: { id?: string; name?: string; datetime_utc?: string; seo_url?: string } };

// Puck drop (ISO, to the minute) -> Gametime event page. Re-read hourly.
export async function getGametimeEvents(): Promise<Record<string, string>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  try {
    const res = await fetch(GT_SEARCH, {
      cache: "no-store",
      headers: { "User-Agent": "SickoCentral/0.1 (hobby fan site)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { events?: GtEvent[] };
    const out: Record<string, string> = {};
    for (const { event: e } of data.events ?? []) {
      if (!e?.id || !e.datetime_utc || !/Ottawa Senators/.test(e.name ?? "")) continue;
      const url = e.seo_url?.startsWith("https://gametime.co/") ? e.seo_url : `https://gametime.co/events/${e.id}`;
      out[minuteKey(e.datetime_utc)] = url;
    }
    return out;
  } catch {
    return {};
  }
}

// "2026-11-20T00:00:00Z" and "2026-11-20T00:00:00" both -> "2026-11-20T00:00"
export function minuteKey(iso: string): string {
  return iso.slice(0, 16);
}

export type TicketLinks = { gametime: string; ticketmaster: string | null };

export function ticketLinks(startTimeUTC: string, ticketsLink: string | undefined, gametime: Record<string, string>): TicketLinks {
  return {
    gametime: gametime[minuteKey(startTimeUTC)] ?? GAMETIME_SENS,
    ticketmaster: ticketsLink?.startsWith("https://www.ticketmaster.") ? ticketsLink : null,
  };
}
