import Link from "next/link";
import { formatTime } from "@/lib/format";
import type { GameSummary } from "@/lib/schedule";
import { scoreLine } from "@/lib/schedule";
import { ResultBadge, TeamBar } from "./ui";
import { StreamingMenu, TicketsMenu } from "./GameLinks";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Tablet and desktop: the month as a calendar. `games` is the whole month; `visible`
// says which pass the Home/Away filter (the others are dimmed, not removed, so the
// month keeps its shape). Dates are the NHL's game dates (Eastern), not UTC.
export function ScheduleCalendar({ games, visible }: { games: GameSummary[]; visible: (g: GameSummary) => boolean }) {
  if (games.length === 0) return null;
  const [y, m] = games[0].gameDate.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const byDay = new Map(games.map((g) => [Number(g.gameDate.slice(8, 10)), g]));
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  // The month at a glance: record in finished games, home and away count.
  const done = games.filter((g) => g.result);
  const rec = (r: string) => done.filter((g) => g.result === r).length;
  const home = games.filter((g) => g.home).length;

  return (
    <div className="hidden px-4 md:block">
      <p className="pb-3 text-sm text-muted">
        {done.length > 0 && <span className="font-semibold text-ink">{`${rec("W")}-${rec("L")}-${rec("OTL")} this month · `}</span>}
        {games.length} games · {home} home, {games.length - home} away
      </p>
      <div role="grid" aria-label="Month calendar" className="overflow-hidden rounded-2xl border border-line">
        <div role="row" className="grid grid-cols-7 border-b border-line bg-surface">
          {DAYS.map((d) => (
            <span role="columnheader" key={d} className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {d}
            </span>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <div role="row" key={w} className="grid grid-cols-7 border-b border-line last:border-0">
            {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
              const g = day ? byDay.get(day) : undefined;
              const href = g?.state === "live" ? "/live" : g?.state === "final" ? `/game/${g.id}` : null;
              const dim = g && !visible(g);
              const body = g && (
                <>
                  <span className="flex items-center gap-1.5">
                    <TeamBar abbrev={g.opp} className="h-4 w-1" />
                    <span className="font-display text-lg font-bold leading-none tracking-wide">
                      {g.home ? "vs" : "at"} {g.opp}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {g.state === "live" && <ResultBadge result="LIVE" />}
                    {g.result && <ResultBadge result={g.result} />}
                    <span className="text-sm font-bold tabular">{g.state === "upcoming" ? formatTime(g.startTimeUTC) : scoreLine(g)}</span>
                  </span>
                  {g.state === "upcoming" && (
                    <span className="flex flex-col items-start gap-1">
                      {g.broadcasts.length > 0 && <StreamingMenu networks={g.broadcasts} streams={g.streams} size="sm" />}
                      {g.tickets && <TicketsMenu tickets={g.tickets} size="sm" align="left" />}
                    </span>
                  )}
                </>
              );
              const base = `flex min-h-[112px] flex-col gap-1.5 border-r border-line p-2.5 last:border-r-0 ${
                day ? (g ? (g.home ? "bg-[#1b1416]" : "bg-surface") : "bg-ground") : "bg-[#0a0a0b]"
              } ${g?.state === "live" ? "shadow-[inset_0_0_0_2px_#c52032]" : ""} ${dim ? "opacity-30" : ""}`;
              return (
                <div role="gridcell" key={i} className={base}>
                  {day && <span className={`text-xs font-semibold ${g ? "text-ink-2" : "text-muted"}`}>{day}</span>}
                  {g && href ? (
                    <Link href={href} aria-label={`Game summary, ${g.home ? "vs" : "at"} ${g.opp}`} className="-m-1 flex flex-col gap-1.5 rounded-lg p-1 hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="pt-2 text-xs text-muted">Home games are tinted red. Finished games open their Game Summary.</p>
    </div>
  );
}
