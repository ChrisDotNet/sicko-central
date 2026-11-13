"use client";

import { useMemo, useState } from "react";
import { formatDay, formatTime } from "@/lib/format";
import type { GameSummary } from "@/lib/schedule";
import { scoreLine } from "@/lib/schedule";
import { ResultBadge, TeamBar } from "./ui";
import { BroadcastLinks } from "./BroadcastLinks";
import { GameSummaryButton } from "./GameSummaryButton";
import { ScheduleCalendar } from "./ScheduleCalendar";

const FILTERS = ["All", "Home", "Away"] as const;

export function ScheduleList({ games, focusDate }: { games: GameSummary[]; focusDate: string | null }) {
  const months = useMemo(() => {
    const out: string[] = [];
    for (const g of games) {
      const m = formatDay(g.startTimeUTC).month;
      if (!out.includes(m)) out.push(m);
    }
    return out;
  }, [games]);

  const initial = focusDate ? Math.max(0, months.indexOf(formatDay(focusDate).month)) : 0;
  const [monthIdx, setMonthIdx] = useState(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const month = months[monthIdx];
  const inMonth = games.filter((g) => formatDay(g.startTimeUTC).month === month);
  const visible = (g: GameSummary) => filter === "All" || (filter === "Home" ? g.home : !g.home);
  const shown = inMonth.filter(visible);

  return (
    <>
      <div className="flex items-center justify-between px-2 pt-3.5 md:max-w-sm md:px-2">
        <button
          type="button"
          aria-label="Previous month"
          disabled={monthIdx === 0}
          onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          className="flex size-11 items-center justify-center disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span className="text-base font-bold">{month}</span>
        <button
          type="button"
          aria-label="Next month"
          disabled={monthIdx >= months.length - 1}
          onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          className="flex size-11 items-center justify-center disabled:opacity-30"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      <div role="group" aria-label="Filter games" className="flex gap-1.5 px-4 pt-2 pb-3.5 md:max-w-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 flex-1 rounded-xl border text-sm font-semibold ${
              filter === f ? "border-ink bg-ink text-ground" : "border-line-strong text-ink-2"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ScheduleCalendar games={inMonth} visible={visible} />

      {/* Phones: the list. Tablet and desktop use the calendar above. */}
      <div className="flex flex-col gap-2 px-4 md:hidden">
        {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">No games this month.</p>}
        {shown.map((g) => {
          const day = formatDay(g.startTimeUTC);
          // Live and finished games get one button to the game; Video and Radio are tabs there.
          const href = g.state === "live" ? "/live" : g.state === "final" ? `/game/${g.id}` : null;
          const sub =
            g.state === "live"
              ? "Live now"
              : g.state === "final"
                ? "Final"
                : g.home
                  ? g.venue
                  : "Away";
          // One compact row per game: date | opponent + status (or networks) | score or time + button.
          return (
            <div
              key={g.id}
              className={`grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border bg-surface px-3 py-2 ${
                g.state === "live" ? "border-sens" : "border-line"
              }`}
            >
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-semibold text-muted">{day.dow}</span>
                <span className="mt-0.5 font-display text-xl font-extrabold">{day.day}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <TeamBar abbrev={g.opp} className="h-4 w-1" />
                  <span className="font-display text-lg font-bold leading-none tracking-wide">
                    {g.home ? "vs" : "at"} {g.opp}
                  </span>
                </span>
                {g.state === "upcoming" && g.broadcasts.length > 0 ? (
                  <BroadcastLinks networks={g.broadcasts} size="sm" />
                ) : (
                  <span className="truncate text-xs leading-none text-muted">{sub}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {g.state === "live" && <ResultBadge result="LIVE" />}
                {g.result && <ResultBadge result={g.result} />}
                <span className="text-sm font-bold tabular">
                  {g.state === "upcoming" ? formatTime(g.startTimeUTC) : scoreLine(g)}
                </span>
                {href && <GameSummaryButton href={href} label={`Game summary, ${g.home ? "vs" : "at"} ${g.opp}`} />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
