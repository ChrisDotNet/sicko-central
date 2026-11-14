import Link from "next/link";
import type { StartingGoalies } from "@/lib/goalies";
import type { StandingRow } from "@/lib/nhl";
import type { GameSummary } from "@/lib/schedule";
import type { TicketLinks } from "@/lib/tickets";
import { formatDay, formatTime } from "@/lib/format";
import { OTT } from "@/lib/teams";
import { Countdown } from "./Countdown";
import { StreamingMenu, TicketsMenu } from "./GameLinks";
import { Chevron, Kicker, TeamBar } from "./ui";

// The home page's next-game card: what you need to know before the game.
// Days before: opponent snapshot, season series, one "Did you know", broadcasts, tickets.
// Game day: the gold "Tonight" card, adding a countdown and the starting goalies.

const SHORT_DIVISION: Record<string, string> = { Metropolitan: "Metro" };

export type Series = {
  wins: number; // Sens wins
  losses: number; // Sens losses, any kind
  game: number; // this game's number in the season series
  of: number;
  last: GameSummary | null;
};

// The regular-season series against this game's opponent, from the Sens' schedule.
export function seriesFor(next: GameSummary, all: GameSummary[]): Series {
  const meetings = all.filter((g) => g.opp === next.opp && g.gameType === 2);
  const played = meetings.filter((g) => g.state === "final");
  return {
    wins: played.filter((g) => g.result === "W").length,
    losses: played.filter((g) => g.result && g.result !== "W").length,
    game: meetings.findIndex((g) => g.id === next.id) + 1,
    of: meetings.length,
    last: played[played.length - 1] ?? null,
  };
}

function streak(r: StandingRow) {
  if (!r.streakCode || !r.streakCount) return null;
  const code = r.streakCode === "OT" ? "OTL" : r.streakCode;
  return `${code}${r.streakCount}`;
}

function Snapshot({ opp, oppName, row, series, tone }: { opp: string; oppName: string; row: StandingRow | null; series: Series; tone: "plain" | "gold" }) {
  const line = tone === "gold" ? "border-gold-line" : "border-line";
  const last = series.last;
  return (
    <div className={`grid grid-cols-2 border-t ${line}`}>
      <div className={`border-r px-3.5 py-2.5 md:px-5 ${line}`}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{oppName || opp}</div>
        {row ? (
          <>
            <div className="text-[15px] font-bold">
              {row.wins}-{row.losses}-{row.otLosses} · {ordinal(row.divisionSequence)} {SHORT_DIVISION[row.divisionName] ?? row.divisionName}
            </div>
            <div className="text-xs text-muted">
              {row.l10Wins != null ? `Last 10: ${row.l10Wins}-${row.l10Losses}-${row.l10OtLosses}` : ""}
              {streak(row) ? ` · ${streak(row)}` : ""}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted">Record not available</div>
        )}
      </div>
      <div className="px-3.5 py-2.5 md:px-5">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Season series</div>
        {last ? (
          <>
            <div className="text-[15px] font-bold">
              {series.wins}–{series.losses}
              {series.of > 0 && <span className="font-medium text-muted"> · game {series.game} of {series.of}</span>}
            </div>
            <div className="text-xs text-muted">
              Last: <span className={`font-bold ${last.result === "W" ? "text-emerald-400" : "text-sens-text"}`}>{last.result}</span>{" "}
              {last.ottScore}–{last.oppScore}
              {last.lastPeriodType && last.lastPeriodType !== "REG" ? ` ${last.lastPeriodType}` : ""} {last.home ? "vs" : "at"} {opp},{" "}
              {formatDay(last.startTimeUTC).long.replace(/^\w+, /, "")}
            </div>
          </>
        ) : (
          <>
            <div className="text-[15px] font-bold">First meeting</div>
            {series.of > 0 && <div className="text-xs text-muted">Game 1 of {series.of}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Fact({ text, tone }: { text: string; tone: "plain" | "gold" }) {
  return (
    <div className={`flex gap-2.5 border-t px-3.5 py-2.5 md:px-5 ${tone === "gold" ? "border-gold-line" : "border-line bg-ground/40"}`}>
      <span aria-hidden="true" className="text-sm font-extrabold text-gold-text">?</span>
      <span className="text-sm leading-snug text-ink-2">
        <span className="sr-only">Did you know: </span>
        {text}
      </span>
    </div>
  );
}

const CHIP: Record<string, string> = {
  Confirmed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  Likely: "border-gold-line bg-gold-ground text-gold-text",
  Projected: "border-line-strong text-muted",
};

function Goalies({ goalies, opp }: { goalies: StartingGoalies; opp: string }) {
  const rows = [
    { abbrev: OTT, g: goalies.ott },
    { abbrev: opp, g: goalies.opp },
  ].filter((r) => r.g);
  return (
    <div className="flex flex-col gap-1.5 border-t border-gold-line px-3.5 py-2.5 md:px-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Starting goalies</div>
      {rows.map(({ abbrev, g }) => (
        <div key={abbrev} className="flex items-center gap-2 text-sm">
          <TeamBar abbrev={abbrev} className="h-4 w-1.5" />
          <span className="flex-1 font-bold">{g!.name}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${CHIP[g!.status]}`}>{g!.status}</span>
        </div>
      ))}
    </div>
  );
}

export function NextGameCard({
  next,
  tonight,
  oppName,
  row,
  series,
  fact,
  goalies,
  tickets,
}: {
  next: GameSummary;
  tonight: boolean;
  oppName: string;
  row: StandingRow | null;
  series: Series;
  fact: string | null;
  goalies: StartingGoalies | null;
  tickets: TicketLinks;
}) {
  const tone = tonight ? "gold" : "plain";
  const footer = (
    <div className={`flex items-center justify-between gap-2 border-t px-3.5 py-2.5 md:px-5 ${tonight ? "border-gold-line" : "border-line"}`}>
      <StreamingMenu networks={next.broadcasts} streams={next.streams} />
      <TicketsMenu tickets={tickets} />
    </div>
  );

  if (tonight) {
    return (
      <div className="rounded-2xl border border-gold-line bg-gold-ground">
        <Link href="/live" className="flex min-h-11 items-start justify-between gap-3 px-4 pt-4 pb-3 md:px-5 md:pt-5">
          <div className="flex flex-col gap-1">
            <Kicker>Tonight</Kicker>
            <span className="font-display text-3xl font-extrabold leading-none tracking-wide md:text-5xl">
              {next.home ? "vs" : "at"} {next.opp} · {formatTime(next.startTimeUTC)}
            </span>
            <span className="text-sm text-muted">{next.venue}</span>
          </div>
          <span className="mt-1 flex shrink-0 items-center gap-1 text-sm font-semibold">
            Game centre <Chevron />
          </span>
        </Link>
        <Countdown startTimeUTC={next.startTimeUTC} />
        {goalies && (goalies.ott || goalies.opp) && <Goalies goalies={goalies} opp={next.opp} />}
        <Snapshot opp={next.opp} oppName={oppName} row={row} series={series} tone={tone} />
        {fact && <Fact text={fact} tone={tone} />}
        {footer}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 md:px-5 md:pt-5">
        <div className="flex flex-col gap-1">
          <Kicker>Next game</Kicker>
          <span className="font-display text-3xl font-extrabold leading-none tracking-wide md:text-5xl">
            {next.home ? "vs" : "at"} {next.opp}
          </span>
          <span className="text-sm text-ink-2">
            {formatDay(next.startTimeUTC).long} · {formatTime(next.startTimeUTC)}
          </span>
          <span className="text-sm text-muted">{next.venue}</span>
        </div>
        <TeamBar abbrev={next.opp} className="mt-5 h-11 w-2.5" />
      </div>
      <Snapshot opp={next.opp} oppName={oppName} row={row} series={series} tone={tone} />
      {fact && <Fact text={fact} tone={tone} />}
      {footer}
    </div>
  );
}
