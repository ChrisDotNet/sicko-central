import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StandingsTabs } from "@/components/StandingsTabs";
import { StatsPlayers } from "@/components/stats/StatsPlayers";
import { StatsTeam } from "@/components/stats/StatsTeam";
import { ErrorNote } from "@/components/ui";
import { getStandings, name } from "@/lib/nhl";
import { getRace, getSensForm, getStatsPage, getTeamLenses } from "@/lib/team-stats";
import { OTT } from "@/lib/teams";

export const metadata: Metadata = { title: "Standings" };

type SP = Promise<Record<string, string | string[] | undefined>>;

// Standings | Stats. Stats is the season through a Sens lens (Team and Players); the Game page
// keeps only the numbers about tonight.
function Switch({ stats }: { stats: boolean }) {
  const cls = (on: boolean) =>
    `flex min-h-10 flex-1 items-center justify-center rounded-[9px] text-sm font-bold ${on ? "bg-surface-2 text-ink" : "text-muted"}`;
  return (
    <nav aria-label="Standings or stats" className="flex gap-1 rounded-xl border border-line bg-surface p-1 md:max-w-sm">
      <Link href="/standings" className={cls(!stats)} aria-current={!stats ? "page" : undefined}>
        Standings
      </Link>
      <Link href="/standings?view=stats" className={cls(stats)} aria-current={stats ? "page" : undefined}>
        Stats
      </Link>
    </nav>
  );
}

function Pill({ href, on, children }: { href: string; on: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-9 items-center rounded-full border px-4 text-[13px] font-bold ${on ? "border-sens bg-[#2A0F14] text-ink" : "border-line-strong text-muted"}`}
    >
      {children}
    </Link>
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
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-wider">{stats ? "Stats" : "Standings"}</h1>
        <p className="mt-0.5 text-sm text-muted">{stats ? "The Sens this season, ranked against the league" : "NHL regular season"}</p>
        <div className="mt-3">
          <Switch stats={stats} />
        </div>
        {stats && (
          <div className="mt-2.5 flex gap-2">
            <Pill href="/standings?view=stats" on={!players}>
              Team
            </Pill>
            <Pill href="/standings?view=stats&part=players" on={players}>
              Players
            </Pill>
          </div>
        )}
      </div>
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
