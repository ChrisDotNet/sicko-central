import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StandingsTabs } from "@/components/StandingsTabs";
import { StatsPlayers } from "@/components/stats/StatsPlayers";
import { StatsTeam } from "@/components/stats/StatsTeam";
import { ErrorNote } from "@/components/ui";
import { PageTitle } from "@/components/PageTitle";
import { getStandings, name } from "@/lib/nhl";
import { getRace, getSensForm, getStatsPage, getTeamLenses } from "@/lib/team-stats";
import { OTT } from "@/lib/teams";

export const metadata: Metadata = { title: "Stats" };

type SP = Promise<Record<string, string | string[] | undefined>>;

// The Stats tab: Standings, then the season through a Sens lens (Team, Players). The Game page
// keeps only the numbers about tonight.
const VIEWS = [
  { key: "standings", label: "Standings", href: "/standings" },
  { key: "team", label: "Sens team", href: "/standings?view=stats" },
  { key: "players", label: "Sens players", href: "/standings?view=stats&part=players" },
] as const;

function Switch({ view }: { view: (typeof VIEWS)[number]["key"] }) {
  return (
    <nav aria-label="Stats view" className="flex gap-1 rounded-xl border border-line bg-surface p-1 md:max-w-md">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={v.href}
          aria-current={view === v.key ? "page" : undefined}
          className={`flex min-h-10 flex-1 items-center justify-center rounded-[9px] text-sm font-bold ${view === v.key ? "bg-surface-2 text-ink" : "text-muted"}`}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

async function StandingsContent() {
  const rows = await getStandings().catch(() => []);
  if (rows.length === 0) return <ErrorNote>Standings aren&apos;t available right now. Try again in a minute.</ErrorNote>;
  const ott = rows.find((r) => name(r.teamAbbrev) === OTT);
  return <StandingsTabs rows={rows} ottConference={ott?.conferenceAbbrev ?? "E"} ottDivision={ott?.divisionName ?? ""} />;
}

async function StatsContent({ players }: { players: boolean }) {
  if (players) {
    const [page, form] = await Promise.all([getStatsPage(), getSensForm()]);
    if (!page) return <ErrorNote>Player stats aren&apos;t available right now. Try again in a minute.</ErrorNote>;
    return <StatsPlayers page={page} form={form} />;
  }
  const [lenses, form, race] = await Promise.all([getTeamLenses(), getSensForm(), getRace()]);
  const ott = lenses?.[OTT];
  if (!ott) return <ErrorNote>Team stats aren&apos;t available right now. Try again in a minute.</ErrorNote>;
  return <StatsTeam ott={ott} form={form} race={race} />;
}

async function Content({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const stats = sp.view === "stats";
  const players = stats && sp.part === "players";
  return (
    <>
      <div className="px-4 pt-5">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">Stats</h1>
        <p className="mt-0.5 text-sm text-muted">{stats ? "The Sens this season, ranked against the league" : "NHL regular season standings"}</p>
        <div className="mt-3">
          <Switch view={players ? "players" : stats ? "team" : "standings"} />
        </div>
      </div>
      {stats && <PageTitle title={`${players ? "Sens players" : "Sens team"} · Stats`} />}
      {stats ? <StatsContent players={players} /> : <StandingsContent />}
      {stats && <p className="px-4 pt-5 text-[11px] text-muted">From the NHL&apos;s stats and EDGE data. Updated through the day; ranks catch up a little after each final.</p>}
    </>
  );
}

export default function StandingsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
