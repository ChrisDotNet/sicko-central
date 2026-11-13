"use client";

import { useEffect, useState } from "react";
import type { GoalieCall, GoalieStatus, StartingGoalies as Goalies } from "@/lib/goalies";
import { formatTime } from "@/lib/format";
import { OTT } from "@/lib/teams";
import { TeamBar } from "../ui";

const REFRESH_MS = 5 * 60_000;

const CHIP: Record<GoalieStatus, string> = {
  Confirmed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  Likely: "border-gold-line bg-gold-ground text-gold-text",
  Projected: "border-line-strong text-muted",
};

function Row({ abbrev, goalie }: { abbrev: string; goalie: GoalieCall | null }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <TeamBar abbrev={abbrev} className="h-8 w-2" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted">{abbrev}</div>
        <div className="truncate font-display text-lg font-bold leading-tight tracking-wide">{goalie?.name ?? "Not reported yet"}</div>
        {goalie?.source && (
          <div className="truncate text-xs text-muted">
            Per {goalie.source}
            {goalie.updated ? ` · ${formatTime(goalie.updated)}` : ""}
          </div>
        )}
      </div>
      {goalie && <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${CHIP[goalie.status]}`}>{goalie.status}</span>}
    </li>
  );
}

// Who starts in goal tonight: shown on game day until puck drop, refreshed every few minutes
// (reports come in through the morning skate and warm-up).
export function StartingGoalies({ initial, gameDate, oppAbbrev, className = "" }: { initial: Goalies | null; gameDate: string; oppAbbrev: string; className?: string }) {
  const [goalies, setGoalies] = useState(initial);
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/goalies?date=${gameDate}`);
        if (res.ok) {
          const next = (await res.json()) as Goalies | null;
          if (next) setGoalies(next);
        }
      } catch {
        /* keep what we have */
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [gameDate]);

  if (!goalies || (!goalies.ott && !goalies.opp)) return null;
  return (
    <section className={`px-4 pt-6 ${className}`}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wider">Starting goalies</h2>
        <a href={goalies.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
          Via Daily Faceoff
        </a>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-3">
        <Row abbrev={OTT} goalie={goalies.ott} />
        <Row abbrev={goalies.oppAbbrev || oppAbbrev} goalie={goalies.opp} />
      </ul>
      <p className="mt-1.5 text-xs text-muted">Projected means no report yet: Daily Faceoff&apos;s best guess. Official at puck drop.</p>
    </section>
  );
}
