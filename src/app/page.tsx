import Link from "next/link";
import { Card, Chevron, ErrorNote, Kicker, Page, ResultBadge, Section } from "@/components/ui";
import { StandingsTable } from "@/components/StandingsTable";
import { GameSummaryButton } from "@/components/GameSummaryButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { formatDay, formatTime, savePct } from "@/lib/format";
import { getClubStats, getSchedule, getScoresNow, getStandings, name } from "@/lib/nhl";
import { scoreLine, splitSchedule } from "@/lib/schedule";
import { OTT } from "@/lib/teams";
import { getStartingGoalies } from "@/lib/goalies";
import { getSensNews } from "@/lib/sens-news";
import { getGameFacts } from "@/lib/facts";
import { pickFacts } from "@/lib/facts-shared";
import { getGametimeEvents, ticketLinks } from "@/lib/tickets";
import { NextGameCard, seriesFor } from "@/components/NextGameCard";
import { SensNewsList } from "@/components/news/SensNewsList";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function HomePage() {
  const [schedule, standings, stats, scores] = await Promise.all([
    getSchedule().catch(() => null),
    getStandings().catch(() => []),
    getClubStats().catch(() => null),
    getScoresNow().catch(() => null),
  ]);
  const news = (await getSensNews().catch(() => [])).slice(0, 6);

  if (!schedule) return <ErrorNote>NHL data isn&apos;t available right now. Try again in a minute.</ErrorNote>;

  const { all, live, last, next } = splitSchedule(schedule.games);
  const comingUp = all.filter((g) => g.state === "upcoming" && g.id !== next?.id).slice(0, 4);
  const tonight = next != null && scores?.currentDate === next.gameDate;
  const [goalies, facts, gametime] = await Promise.all([
    tonight && next ? getStartingGoalies(String(next.id), next.opp) : null,
    next ? getGameFacts(next.gameDate, next.opp).catch(() => []) : [],
    next ? getGametimeEvents() : {},
  ]);
  const fact = pickFacts(facts, [], 1)[0]?.text ?? null;
  const oppRow = next ? (standings.find((r) => name(r.teamAbbrev) === next.opp) ?? null) : null;
  const rawNext = next ? schedule.games.find((g) => g.id === next.id) : undefined;
  const oppTeam = rawNext ? (rawNext.homeTeam.abbrev === OTT ? rawNext.awayTeam : rawNext.homeTeam) : undefined;
  const oppName = oppTeam?.commonName?.default ?? next?.opp ?? "";
  const ottRow = standings.find((r) => name(r.teamAbbrev) === OTT);
  const division = ottRow
    ? standings.filter((r) => r.divisionAbbrev === ottRow.divisionAbbrev).sort((a, b) => a.divisionSequence - b.divisionSequence)
    : [];

  const skaters = stats?.skaters ?? [];
  const top = (key: "points" | "goals" | "assists") => [...skaters].sort((a, b) => b[key] - a[key])[0];
  const goalie = [...(stats?.goalies ?? [])].filter((g) => g.gamesPlayed >= 3).sort((a, b) => b.savePercentage - a.savePercentage)[0];
  const leaders = [
    top("points") && { cat: "Points", val: String(top("points").points), who: top("points") },
    top("goals") && { cat: "Goals", val: String(top("goals").goals), who: top("goals") },
    top("assists") && { cat: "Assists", val: String(top("assists").assists), who: top("assists") },
    goalie && { cat: "Save %", val: savePct(goalie.savePercentage), who: goalie },
  ].filter(Boolean) as Array<{
    cat: string;
    val: string;
    who: { playerId: number; firstName: { default: string }; lastName: { default: string } };
  }>;

  // Phone: one column in source order. Tablet and desktop: two grids, the game cards on
  // the left and the record and last result on the right; then standings beside leaders.
  return (
    <Page width="wide">
      <InstallPrompt />
      {live && (
        <section className="px-4 pt-4">
          <Link href="/live" className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-sens px-4 py-3.5 text-white">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-widest">
                <span className="size-1.5 rounded-full bg-white" /> LIVE NOW
              </span>
              <span className="font-display text-2xl font-extrabold leading-none tracking-wide">
                OTT {live.ottScore ?? 0} – {live.oppScore ?? 0} {live.opp}
              </span>
            </div>
            <span className="flex items-center gap-1 text-sm font-bold">
              Follow <Chevron />
            </span>
          </Link>
        </section>
      )}

      <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {ottRow && (
          <section className="px-4 pt-4 md:col-start-2 md:row-start-1">
            <Card className="grid grid-cols-3">
              <div className="flex flex-col items-center gap-0.5 border-r border-line px-3 py-3.5">
                <span className="font-display text-3xl font-extrabold leading-none">
                  {ottRow.wins}-{ottRow.losses}-{ottRow.otLosses}
                </span>
                <span className="text-xs text-muted">Record</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 border-r border-line px-3 py-3.5">
                <span className="font-display text-3xl font-extrabold leading-none">{ottRow.points}</span>
                <span className="text-xs text-muted">Points</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-3 py-3.5">
                <span className="font-display text-3xl font-extrabold leading-none text-gold-text">{ordinal(ottRow.divisionSequence)}</span>
                <span className="text-xs text-muted">{ottRow.divisionName}</span>
              </div>
            </Card>
          </section>
        )}

        <section className="flex flex-col gap-2.5 px-4 pt-4 md:col-start-1 md:row-span-2 md:row-start-1 md:[&>*]:flex-1">
          {next && (
            <NextGameCard
              next={next}
              tonight={tonight}
              oppName={oppName}
              row={oppRow}
              series={seriesFor(next, all)}
              fact={fact}
              goalies={goalies}
              tickets={ticketLinks(next.startTimeUTC, next.ticketsLink, gametime)}
            />
          )}
        </section>
        {last && last.result && (
          <section className="px-4 pt-2.5 md:col-start-2 md:row-start-2 md:pt-4">
            <div className="flex h-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-col gap-1">
                <Kicker tone="muted">Last result</Kicker>
                <span className="mt-1 flex items-center gap-2">
                  <ResultBadge result={last.result} />
                  <span className="font-display text-2xl font-extrabold leading-none tracking-wide">
                    {scoreLine(last)} {last.home ? "vs" : "at"} {last.opp}
                  </span>
                </span>
                <span className="text-sm text-muted">{formatDay(last.startTimeUTC).long} · Final</span>
              </div>
              <GameSummaryButton href={`/game/${last.id}`} label={`Game summary, ${last.home ? "vs" : "at"} ${last.opp}`} />
            </div>
          </section>
        )}
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-start">
        {division.length > 0 && (
          <Section
            className="md:col-start-1"
            title={ottRow?.divisionName ?? "Division"}
            aside={
              <Link href="/standings" className="text-sm font-semibold text-ink">
                Full standings
              </Link>
            }
          >
            <StandingsTable rows={division} extraFrom="lg" />
          </Section>
        )}
        {news.length > 0 && (
          <Section
            className="md:col-start-1"
            title="Sens news"
            aside={
              <Link href="/news" className="text-sm font-semibold text-ink">
                All news
              </Link>
            }
          >
            <SensNewsList items={news} games={all} compact />
          </Section>
        )}
        <div className="md:col-start-2 md:row-span-2 md:row-start-1">
          {leaders.length > 0 && (
            <Section title="Team leaders">
              <div className="grid grid-cols-2 gap-2.5">
                {leaders.map((l) => (
                  <Link
                    key={l.cat}
                    href={`/player/${l.who.playerId}`}
                    className="flex min-h-11 flex-col gap-0.5 rounded-xl border border-line bg-surface px-3.5 py-3"
                  >
                    <span className="text-xs text-muted">{l.cat}</span>
                    <span className="font-display text-3xl font-extrabold leading-tight text-sens-text">{l.val}</span>
                    <span className="text-sm font-semibold">
                      {name(l.who.firstName)} {name(l.who.lastName)}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
          {comingUp.length > 0 && (
            <Section
              className="hidden md:block"
              title="Coming up"
              aside={
                <Link href="/schedule" className="text-sm font-semibold text-ink">
                  Schedule
                </Link>
              }
            >
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {comingUp.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 text-sm last:border-0">
                    <span className="w-24 text-muted">{formatDay(g.startTimeUTC).long}</span>
                    <span className="flex-1 font-bold">
                      {g.home ? "vs" : "at"} {g.opp}
                    </span>
                    <span className="text-ink-2">{formatTime(g.startTimeUTC)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </Page>
  );
}
