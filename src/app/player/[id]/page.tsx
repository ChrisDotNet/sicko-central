import Link from "next/link";
import { Suspense } from "react";
import { PlayerStats } from "@/components/PlayerStats";
import { StarButton } from "@/components/StarButton";
import { PageTitle } from "@/components/PageTitle";
import { BirthdayBadge, PlayerBirthday } from "@/components/Birthdays";
import { Card, ErrorNote, Section } from "@/components/ui";
import { heightLabel, savePct, seasonLabel } from "@/lib/format";
import type { SeasonLine } from "@/lib/nhl";
import { getPlayer, name } from "@/lib/nhl";
import { getGoalieDetail, getSkaterDetail } from "@/lib/player-stats";
import { goalieRead, skaterRead } from "@/lib/player-read";
import { buildCareer } from "@/lib/career";
import { GaugeCard, ReadCard } from "@/components/player/Bits";
import { SkaterSeason } from "@/components/player/SkaterSeason";
import { GoalieSeason } from "@/components/player/GoalieSeason";
import { CareerTab } from "@/components/player/CareerTab";
import { ContractTab } from "@/components/player/ContractTab";


const POSITIONS: Record<string, string> = { C: "Centre", L: "Left wing", R: "Right wing", D: "Defence", G: "Goalie" };

function birthLabel(date?: string) {
  if (!date) return "–";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

const TABS = [
  { key: "season", label: "This season" },
  { key: "career", label: "Career" },
  { key: "contract", label: "Contract" },
] as const;

async function PlayerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: "season" | "career" | "contract" = sp.tab === "career" ? "career" : sp.tab === "contract" ? "contract" : "season";
  if (!/^\d{7}$/.test(id)) return <ErrorNote>That player couldn&apos;t be found.</ErrorNote>;
  const p = await getPlayer(id);
  if (!p) return <ErrorNote>That player couldn&apos;t be found, or NHL data isn&apos;t available right now.</ErrorNote>;

  const goalie = p.position === "G";
  const [skater, goalieD] = await Promise.all([goalie ? null : getSkaterDetail(p.playerId), goalie ? getGoalieDetail(p.playerId) : null]);
  const read = skater ? skaterRead(p, skater) : goalieD ? goalieRead(p, goalieD) : { lines: [], gauge: null };
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
      {/* Desktop: profile, tabs and the read on the left; the rest of the tab on the right. */}
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
                  <PageTitle title={`${full} · ${tab === "career" ? "Career" : tab === "contract" ? "Contract" : "This season"}`} />
                  <h1 className="font-display text-[34px] font-extrabold leading-none tracking-wide">{full}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StarButton id={p.playerId} name={full} size="lg" />
                    <BirthdayBadge birthDate={p.birthDate} />
                  </div>
                </div>
              </div>
              <dl className="relative mt-[18px] grid grid-cols-3 gap-x-2 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted">Born</dt>
                  <dd className="text-sm font-semibold">
                    <PlayerBirthday birthDate={p.birthDate} label={birthLabel(p.birthDate)} />
                  </dd>
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
          <nav aria-label="Player sections" className="flex border-b border-line px-4 pt-3">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "season" ? `/player/${id}` : `/player/${id}?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={`flex min-h-11 flex-1 items-center justify-center text-sm font-semibold ${tab === t.key ? "text-ink shadow-[inset_0_-2px_0_var(--sens-bright)]" : "text-muted hover:text-ink"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          {tab === "season" ? (
            <>
              <ReadCard lines={read.lines} aside="From the numbers, updated after each game" />
              {read.gauge && <GaugeCard g={read.gauge} />}
              <Section>
                <PlayerStats ranges={ranges.filter((r) => r.label === "This season")} notes={notes.filter((_, i) => ranges[i].label === "This season")} />
              </Section>
            </>
          ) : tab === "contract" ? null : (
            <Section>
              <PlayerStats ranges={ranges.filter((r) => r.label !== "This season")} notes={notes.filter((_, i) => ranges[i].label !== "This season")} />
            </Section>
          )}
        </div>
        <div className="lg:pt-1">
          {tab === "season" ? (
            skater ? (
              <SkaterSeason d={skater} centre={p.position === "C"} />
            ) : goalieD ? (
              <GoalieSeason d={goalieD} />
            ) : (
              <p className="px-4 pt-6 text-sm text-muted">No NHL games this season yet. See Career for his path so far.</p>
            )
          ) : tab === "career" ? (
            <CareerTab c={buildCareer(p)} />
          ) : (
            <ContractTab first={name(p.firstName)} last={name(p.lastName)} full={full} />
          )}
        </div>
      </div>
    </>
  );
}

export default function PlayerPage(props: PageProps<"/player/[id]">) {
  return (
    <Suspense fallback={<div className="px-4 pt-6 text-sm text-muted">Loading player…</div>}>
      <PlayerDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
