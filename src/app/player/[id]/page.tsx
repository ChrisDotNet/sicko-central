import Link from "next/link";
import { Suspense } from "react";
import { PlayerStats } from "@/components/PlayerStats";
import { StarButton } from "@/components/StarButton";
import { Card, ErrorNote, Section } from "@/components/ui";
import { formatGameDate, heightLabel, pct, savePct, seasonLabel } from "@/lib/format";
import type { SeasonLine } from "@/lib/nhl";
import { getPlayer, name } from "@/lib/nhl";

// By-season table: phones get the basics; wider screens add the rest.
const SKATER_SEASON_COLS = "grid-cols-[minmax(0,1fr)_40px_36px_36px_40px] md:grid-cols-[minmax(0,1fr)_repeat(4,48px)_repeat(6,56px)]";
const GOALIE_SEASON_COLS = "grid-cols-[minmax(0,1fr)_40px_36px_36px_52px] md:grid-cols-[minmax(0,1fr)_repeat(3,48px)_60px_repeat(4,56px)]";
const wide = "hidden text-right md:block";

const POSITIONS: Record<string, string> = { C: "Centre", L: "Left wing", R: "Right wing", D: "Defence", G: "Goalie" };

function birthLabel(date?: string) {
  if (!date) return "–";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

async function PlayerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{7}$/.test(id)) return <ErrorNote>That player couldn&apos;t be found.</ErrorNote>;
  const p = await getPlayer(id);
  if (!p) return <ErrorNote>That player couldn&apos;t be found, or NHL data isn&apos;t available right now.</ErrorNote>;

  const goalie = p.position === "G";
  const full = `${name(p.firstName)} ${name(p.lastName)}`;
  const nhlSeasons: SeasonLine[] = (p.seasonTotals ?? []).filter((s) => s.leagueAbbrev === "NHL" && s.gameTypeId === 2);
  const sensSeasons = nhlSeasons.filter((s) => s.teamCommonName?.default === "Senators");
  const sum = (rows: SeasonLine[], k: keyof SeasonLine) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0);

  const sub = p.featuredStats?.regularSeason?.subSeason ?? {};
  const career = (p.careerTotals?.regularSeason ?? {}) as Record<string, number | string>;
  const tile = (label: string, v: number | string | undefined, highlight = false) => ({ label, value: v == null ? "–" : String(v), highlight });
  const signed = (n?: number) => (n == null ? "–" : n > 0 ? `+${n}` : String(n));

  const ranges = goalie
    ? [
        {
          label: "This season",
          tiles: [
            tile("GP", sub.gamesPlayed),
            tile("Wins", sub.wins, true),
            tile("Losses", sub.losses),
            tile("SV%", savePct(sub.savePctg)),
            tile("GAA", sub.goalsAgainstAvg?.toFixed(2)),
            tile("Shutouts", sub.shutouts),
          ],
        },
        {
          label: "Career",
          tiles: [
            tile("GP", career.gamesPlayed),
            tile("Wins", career.wins, true),
            tile("Losses", career.losses),
            tile("SV%", savePct(Number(career.savePctg))),
            tile("GAA", Number(career.goalsAgainstAvg || 0).toFixed(2)),
            tile("Shutouts", career.shutouts),
          ],
        },
      ]
    : [
        {
          label: "This season",
          tiles: [
            tile("GP", sub.gamesPlayed),
            tile("Goals", sub.goals),
            tile("Assists", sub.assists),
            tile("Points", sub.points, true),
            tile("+/-", signed(sub.plusMinus)),
            tile("PP points", sub.powerPlayPoints),
          ],
        },
        {
          label: "Career",
          tiles: [
            tile("GP", career.gamesPlayed),
            tile("Goals", career.goals),
            tile("Assists", career.assists),
            tile("Points", career.points, true),
            tile("+/-", signed(Number(career.plusMinus))),
            tile("Avg TOI", career.avgToi),
          ],
        },
      ];
  const sensDiffers = sensSeasons.length > 0 && sensSeasons.length !== nhlSeasons.length;
  if (sensDiffers && !goalie) {
    ranges.push({
      label: "With Sens",
      tiles: [
        tile("GP", sum(sensSeasons, "gamesPlayed")),
        tile("Goals", sum(sensSeasons, "goals")),
        tile("Assists", sum(sensSeasons, "assists")),
        tile("Points", sum(sensSeasons, "points"), true),
        tile("+/-", signed(sum(sensSeasons, "plusMinus"))),
        tile("Seasons", sensSeasons.length),
      ],
    });
  }
  const notes = ranges.map((r) =>
    r.label === "This season"
      ? `${seasonLabel(p.featuredStats?.season ?? "")} regular season`
      : r.label === "Career"
        ? sensDiffers
          ? "All NHL teams, regular season"
          : "All NHL regular season games"
        : "Regular season games with Ottawa only",
  );

  const initials = `${name(p.firstName)[0] ?? ""}${name(p.lastName)[0] ?? ""}`;
  const born = [p.birthCity?.default, p.birthStateProvince?.default, p.birthCountry].filter(Boolean).join(", ");

  return (
    <>
      <div className="px-2 pt-1">
        <Link href="/roster" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-ink-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Roster
        </Link>
      </div>
      {/* Desktop: profile, season tiles and last five games on the left; every season on the right. */}
      <div className="lg:grid lg:grid-cols-[440px_minmax(0,1fr)] lg:items-start">
        <div>
          <section className="px-4 pt-1">
            <Card className="relative overflow-hidden px-4 py-5">
              {p.sweaterNumber != null && (
                <span aria-hidden="true" className="absolute -top-5 -right-1.5 font-display text-[150px] font-extrabold leading-none text-sens opacity-20">
                  {p.sweaterNumber}
                </span>
              )}
              <div className="relative flex items-center gap-3.5">
                <div className="flex size-[76px] shrink-0 items-center justify-center rounded-full border-2 border-sens bg-line font-display text-3xl font-extrabold text-ink-2">
                  {initials}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold tracking-wider text-gold-text uppercase">
                    {p.sweaterNumber != null ? `#${p.sweaterNumber} · ` : ""}
                    {POSITIONS[p.position] ?? p.position}
                    {p.currentTeamAbbrev && p.currentTeamAbbrev !== "OTT" ? ` · ${p.currentTeamAbbrev}` : ""}
                  </span>
                  <h1 className="font-display text-[34px] font-extrabold leading-none tracking-wide">{full}</h1>
                  <div className="mt-1">
                    <StarButton id={p.playerId} name={full} size="lg" />
                  </div>
                </div>
              </div>
              <dl className="relative mt-[18px] grid grid-cols-3 gap-x-2 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">Born</dt>
                  <dd className="text-sm font-semibold">{birthLabel(p.birthDate)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">Height / Weight</dt>
                  <dd className="text-sm font-semibold">
                    {p.heightInInches ? heightLabel(p.heightInInches) : "–"} · {p.weightInPounds ?? "–"} lb
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">{goalie ? "Catches" : "Shoots"}</dt>
                  <dd className="text-sm font-semibold">{p.shootsCatches === "L" ? "Left" : p.shootsCatches === "R" ? "Right" : "–"}</dd>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">Birthplace</dt>
                  <dd className="text-sm font-semibold">{born || "–"}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">Drafted</dt>
                  <dd className="text-sm font-semibold">{p.draftDetails ? `${p.draftDetails.year} · #${p.draftDetails.overallPick}` : "Undrafted"}</dd>
                </div>
              </dl>
            </Card>
          </section>

          <Section>
            <PlayerStats ranges={ranges} notes={notes} />
          </Section>

          {(p.last5Games?.length ?? 0) > 0 && (
            <Section title="Last 5 games">
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                {goalie ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_36px_44px_52px] border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted">
                      <span>Game</span>
                      <span className="text-right">Dec</span>
                      <span className="text-right">SA</span>
                      <span className="text-right">SV%</span>
                    </div>
                    {p.last5Games!.map((g) => (
                      <Link
                        key={g.gameId}
                        href={`/game/${g.gameId}`}
                        className="grid min-h-11 grid-cols-[minmax(0,1fr)_36px_44px_52px] items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0"
                      >
                        <span className="flex flex-col">
                          <span className="font-semibold">
                            {g.homeRoadFlag === "H" ? "vs" : "at"} {g.opponentAbbrev}
                          </span>
                          <span className="text-xs text-muted">{formatGameDate(g.gameDate)}</span>
                        </span>
                        <span className="text-right">{g.decision ?? "–"}</span>
                        <span className="text-right">{g.shotsAgainst ?? "–"}</span>
                        <span className="text-right font-bold">{savePct(g.savePctg)}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_28px_28px_28px_40px_52px] border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted">
                      <span>Game</span>
                      <span className="text-right">G</span>
                      <span className="text-right">A</span>
                      <span className="text-right">P</span>
                      <span className="text-right">SOG</span>
                      <span className="text-right">TOI</span>
                    </div>
                    {p.last5Games!.map((g) => (
                      <Link
                        key={g.gameId}
                        href={`/game/${g.gameId}`}
                        className="grid min-h-11 grid-cols-[minmax(0,1fr)_28px_28px_28px_40px_52px] items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0"
                      >
                        <span className="flex flex-col">
                          <span className="font-semibold">
                            {g.homeRoadFlag === "H" ? "vs" : "at"} {g.opponentAbbrev}
                          </span>
                          <span className="text-xs text-muted">{formatGameDate(g.gameDate)}</span>
                        </span>
                        <span className="text-right">{g.goals ?? 0}</span>
                        <span className="text-right">{g.assists ?? 0}</span>
                        <span className="text-right font-bold">{g.points ?? 0}</span>
                        <span className="text-right">{g.shots ?? 0}</span>
                        <span className="text-right">{g.toi ?? "–"}</span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </Section>
          )}
        </div>
        {nhlSeasons.length > 0 && (
          <Section title="By season" className="lg:pt-1">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div
                className={`grid ${goalie ? GOALIE_SEASON_COLS : SKATER_SEASON_COLS} border-b border-line px-3.5 py-2.5 text-[11px] font-semibold text-muted`}
              >
                <span>Season</span>
                <span className="text-right">GP</span>
                {goalie ? (
                  <>
                    <span className="text-right">W</span>
                    <span className="text-right">L</span>
                    <span className="text-right">SV%</span>
                    <span className={wide}>OTL</span>
                    <span className={wide}>GAA</span>
                    <span className={wide}>SO</span>
                    <span className={wide}>GS</span>
                  </>
                ) : (
                  <>
                    <span className="text-right">G</span>
                    <span className="text-right">A</span>
                    <span className="text-right">P</span>
                    <span className={wide}>+/-</span>
                    <span className={wide}>PIM</span>
                    <span className={wide}>PPG</span>
                    <span className={wide}>SOG</span>
                    <span className={wide}>S%</span>
                    <span className={wide}>TOI</span>
                  </>
                )}
              </div>
              {[...nhlSeasons].reverse().map((s) => (
                <div
                  key={`${s.season}-${s.sequence ?? 0}`}
                  className={`grid ${goalie ? GOALIE_SEASON_COLS : SKATER_SEASON_COLS} items-center border-b border-line px-3.5 py-2.5 text-sm tabular last:border-0`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{seasonLabel(s.season)}</span>
                    {s.teamCommonName?.default !== "Senators" && <span className="text-xs text-muted">{s.teamCommonName?.default}</span>}
                  </span>
                  <span className="text-right">{s.gamesPlayed ?? 0}</span>
                  {goalie ? (
                    <>
                      <span className="text-right">{s.wins ?? 0}</span>
                      <span className="text-right">{s.losses ?? 0}</span>
                      <span className="text-right font-bold">{savePct(s.savePctg)}</span>
                      <span className={wide}>{s.otLosses ?? "–"}</span>
                      <span className={wide}>{s.goalsAgainstAvg != null ? s.goalsAgainstAvg.toFixed(2) : "–"}</span>
                      <span className={wide}>{s.shutouts ?? "–"}</span>
                      <span className={wide}>{s.gamesStarted ?? "–"}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-right">{s.goals ?? 0}</span>
                      <span className="text-right">{s.assists ?? 0}</span>
                      <span className="text-right font-bold">{s.points ?? 0}</span>
                      <span className={wide}>{s.plusMinus == null ? "–" : s.plusMinus > 0 ? `+${s.plusMinus}` : s.plusMinus}</span>
                      <span className={wide}>{s.pim ?? "–"}</span>
                      <span className={wide}>{s.powerPlayGoals ?? "–"}</span>
                      <span className={wide}>{s.shots ?? "–"}</span>
                      <span className={wide}>{s.shots ? pct(s.shootingPctg) : "–"}</span>
                      <span className={wide}>{s.avgToi ?? "–"}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

export default function PlayerPage(props: PageProps<"/player/[id]">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading player…</div>}>
      <PlayerDetail params={props.params} />
    </Suspense>
  );
}
