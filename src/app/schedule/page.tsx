import type { Metadata } from "next";
import { ScheduleList } from "@/components/ScheduleList";
import { ErrorNote } from "@/components/ui";
import { getSchedule, getStandings, name } from "@/lib/nhl";
import { seasonLabel } from "@/lib/format";
import { splitSchedule } from "@/lib/schedule";
import { OTT } from "@/lib/teams";
import { getStreamEvents, withStreams } from "@/lib/streams";
import { getGametimeEvents, ticketLinks } from "@/lib/tickets";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const [schedule, standings, streams, gametime] = await Promise.all([
    getSchedule().catch(() => null),
    getStandings().catch(() => []),
    getStreamEvents(),
    getGametimeEvents(),
  ]);
  if (!schedule) return <ErrorNote>The schedule isn&apos;t available right now. Try again in a minute.</ErrorNote>;

  const { all, live, next, last } = splitSchedule(schedule.games);
  const focus = live ?? next ?? last;
  const ott = standings.find((r) => name(r.teamAbbrev) === OTT);

  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Schedule</h1>
        <p className="mt-0.5 text-sm text-muted">
          {seasonLabel(schedule.currentSeason)} season
          {ott ? ` · ${ott.wins}-${ott.losses}-${ott.otLosses}` : ""}
        </p>
      </div>
      <ScheduleList
        games={withStreams(all, streams).map((g) => (g.state === "upcoming" ? { ...g, tickets: ticketLinks(g.startTimeUTC, g.ticketsLink, gametime) } : g))}
        focusDate={focus?.startTimeUTC ?? null} />
    </>
  );
}
