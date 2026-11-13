"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDay, formatTime } from "@/lib/format";
import type { GameSummary } from "@/lib/schedule";
import { scoreLine } from "@/lib/schedule";
import { ResultBadge, TeamBar } from "./ui";
import { BroadcastLinks } from "./BroadcastLinks";

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
  const shown = games.filter(
    (g) =>
      formatDay(g.startTimeUTC).month === month &&
      (filter === "All" || (filter === "Home" ? g.home : !g.home)),
  );

  return (
    <>
      <div className="flex items-center justify-between px-2 pt-3.5">
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

      <div role="group" aria-label="Filter games" className="flex gap-1.5 px-4 pt-2 pb-3.5">
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

      <div className="flex flex-col gap-2 px-4">
        {shown.length === 0 && <p className="py-6 text-center text-sm text-muted">No games this month.</p>}
        {shown.map((g) => {
          const day = formatDay(g.startTimeUTC);
          const href = g.state === "live" ? "/live" : g.state === "final" ? `/game/${g.id}` : null;
          const sub =
            g.state === "live"
              ? "Live now · follow along"
              : g.state === "final"
                ? "Final · Recap"
                : g.home
                  ? g.venue
                  : "Away";
          const body = (
            <>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[11px] font-semibold text-muted">{day.dow}</span>
                <span className="font-display text-2xl font-extrabold">{day.day}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <TeamBar abbrev={g.opp} className="h-[18px] w-1" />
                  <span className="font-display text-xl font-bold tracking-wide">
                    {g.home ? "vs" : "at"} {g.opp}
                  </span>
                </span>
                <span className="truncate text-xs text-muted">{sub}</span>
                {g.state === "upcoming" && <BroadcastLinks networks={g.broadcasts} className="mt-1" />}
              </div>
              <div className="flex flex-col items-end gap-1">
                {g.state === "live" && <ResultBadge result="LIVE" />}
                {g.result && <ResultBadge result={g.result} />}
                <span className="text-sm font-bold tabular">
                  {g.state === "upcoming" ? formatTime(g.startTimeUTC) : scoreLine(g)}
                </span>
              </div>
            </>
          );
          const cls = `grid min-h-11 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-surface px-3.5 py-3 ${
            g.state === "live" ? "border-sens" : "border-line"
          }`;
          return href ? (
            <Link key={g.id} href={href} className={cls}>
              {body}
            </Link>
          ) : (
            <div key={g.id} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </>
  );
}
